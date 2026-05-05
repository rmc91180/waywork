import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AMENITY_CATEGORIES,
  CANCELLATION_POLICIES,
  LEISURE_FEATURE_LABELS,
  WORKSPACE_TYPES,
} from "@/lib/constants";
import { computeWorkScore, getWorkScoreColor } from "@/lib/work-score";
import { cn } from "@/lib/utils";
import { BookingSidebar } from "@/components/booking/booking-sidebar";
import { InquiryButton } from "@/components/messaging/inquiry-button";
import { PropertyAnalyticsTracker } from "@/components/listings/property-analytics-tracker";
import { TeamStayPlanner } from "@/components/listings/team-stay-planner";
import { getLimehomePilotMeta } from "@/lib/limehome-pilot";
import { getDemoSpaceFallbackData } from "@/lib/demo-fallback";
import { withDbRetry } from "@/lib/db";
import type { PrismaClient } from "@/generated/prisma";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

async function loadSpaceMetadataFromDb(client: PrismaClient, id: string) {
  return client.listing.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ id }, { slug: id }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      city: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } },
    },
  });
}

async function loadSpacePageDataFromDb(client: PrismaClient, id: string) {
  const listing = await client.listing.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ id }, { slug: id }],
    },
    include: {
      images: { orderBy: { order: "asc" } },
      amenities: { orderBy: { category: "asc" } },
      connectivityProfile: true,
      activities: { orderBy: [{ distanceKm: "asc" }, { title: "asc" }] },
      host: {
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          createdAt: true,
        },
      },
      reviews: {
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { reviews: true, bookings: true } },
    },
  });

  if (!listing) {
    return null;
  }

  const relatedListings = await client.listing.findMany({
    where: {
      status: "ACTIVE",
      id: { not: listing.id },
      OR: [{ city: listing.city }, { country: listing.country }],
    },
    orderBy: [{ reviewCount: "desc" }, { workScore: "desc" }],
    take: 4,
    select: {
      id: true,
      title: true,
      city: true,
      state: true,
      pricePerDay: true,
      workScore: true,
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, alt: true },
      },
    },
  });

  const sameBuildingListings = listing.pmsExternalPropertyId
    ? await client.listing.findMany({
        where: {
          status: "ACTIVE",
          id: { not: listing.id },
          pmsExternalPropertyId: listing.pmsExternalPropertyId,
        },
        orderBy: [{ workScore: "desc" }, { pricePerDay: "asc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          maxGuests: true,
          pricePerDay: true,
          workspaceType: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      })
    : [];

  const portfolioTeamStayListings =
    sameBuildingListings.length === 0
      ? await client.listing.findMany({
          where: {
            status: "ACTIVE",
            id: { not: listing.id },
            city: listing.city,
            hostId: listing.hostId,
            ...(listing.pmsConnectionId ? { pmsConnectionId: listing.pmsConnectionId } : {}),
          },
          orderBy: [{ workScore: "desc" }, { pricePerDay: "asc" }],
          take: 3,
          select: {
            id: true,
            title: true,
            maxGuests: true,
            pricePerDay: true,
            workspaceType: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true, alt: true },
            },
          },
        })
      : [];

  return {
    listing,
    relatedListings,
    sameBuildingListings,
    portfolioTeamStayListings,
  };
}

type SpacePageData = NonNullable<Awaited<ReturnType<typeof loadSpacePageDataFromDb>>>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com";

  const listing =
    (await withDbRetry((client) => loadSpaceMetadataFromDb(client, id)).catch((error) => {
      console.error("[spaces/[id]] failed to load metadata listing", error);
      return null;
    })) ?? getDemoSpaceFallbackData(id)?.listing;

  if (!listing) return { title: "Space Not Found" };

  const primaryImage = listing.images[0];
  const url = `${APP_URL}/spaces/${id}`;
  const title = `${listing.title} — ${listing.city} | Way Work`;
  const description = `Work-ready ${listing.workspaceType.toLowerCase().replace(/_/g, " ")} in ${listing.city}. ${listing.description.slice(0, 130)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      ...(primaryImage?.url
        ? { images: [{ url: primaryImage.url, alt: primaryImage.alt || listing.title, width: 1200, height: 800 }] }
        : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SpaceDetailPage({ params }: Props) {
  const { id } = await params;

  const pageData =
    (await withDbRetry((client) => loadSpacePageDataFromDb(client, id)).catch((error) => {
      console.error("[spaces/[id]] failed to load listing page", error);
      return null;
    })) ?? (getDemoSpaceFallbackData(id) as SpacePageData | null);

  if (!pageData) {
    notFound();
  }

  const { listing, relatedListings, sameBuildingListings, portfolioTeamStayListings } = pageData;

  // Fetch blocked dates for this listing (next 12 months) to show in the booking calendar
  const blockedDates: string[] = await (async () => {
    try {
      const { db } = await import("@/lib/db");
      const today = new Date();
      const oneYearOut = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      const rows = await db.blockedDate.findMany({
        where: {
          listingId: listing.id,
          date: { gte: today, lte: oneYearOut },
        },
        select: { date: true },
        orderBy: { date: "asc" },
      });
      return rows.map((r: { date: Date }) => r.date.toISOString().split("T")[0]);
    } catch {
      return [];
    }
  })();

  const teamStayListings =
    sameBuildingListings.length > 0 ? sameBuildingListings : portfolioTeamStayListings;
  const teamStayMode =
    sameBuildingListings.length > 0
      ? "same-building"
      : portfolioTeamStayListings.length > 0
        ? "city-portfolio"
        : null;

  const wsType = WORKSPACE_TYPES[listing.workspaceType as keyof typeof WORKSPACE_TYPES];
  const cancelPolicy = CANCELLATION_POLICIES[listing.cancellationPolicy as keyof typeof CANCELLATION_POLICIES];
  const workScore = computeWorkScore({
    amenities: listing.amenities,
    connectivity: listing.connectivityProfile,
  });
  const limehomePilotMeta = getLimehomePilotMeta({ slug: listing.slug });

  // Group amenities by category
  const amenityGroups = listing.amenities.reduce(
    (acc, a) => {
      if (!acc[a.category]) acc[a.category] = [];
      acc[a.category].push(a);
      return acc;
    },
    {} as Record<string, typeof listing.amenities>
  );

  // Compute average ratings
  const listingReviews = listing.reviews.filter((r) => r.targetType === "LISTING");
  const avgRating =
    listingReviews.length > 0
      ? (
          listingReviews.reduce((sum, r) => sum + r.overallRating, 0) /
          listingReviews.length
        ).toFixed(1)
      : null;
  const reviewHighlights = listingReviews
    .filter((review) => review.comment && review.comment.trim().length > 24)
    .sort((a, b) => b.overallRating - a.overallRating)
    .slice(0, 3);
  const fitSummary =
    listing.maxGuests >= 5 && (listing.propertySizeSqm ?? 0) >= 80
      ? "A strong fit for small-team offsites that still need proper accommodation."
      : listing.maxGuests >= 3
        ? "Best for focused pair stays or small-group work trips."
        : "Best for solo work trips or a quiet stay for two.";
  const descriptionTeaser =
    listing.description.length > 220
      ? `${listing.description.slice(0, 217).trimEnd()}...`
      : listing.description;
  const highlightedAmenities = listing.amenities.slice(0, 6);
  const quickFacts = [
    {
      label: "Work score",
      value: `${workScore.total}/100`,
      detail: wsType?.label || listing.workspaceType,
    },
    {
      label: "Internet",
      value: listing.connectivityProfile
        ? `${listing.connectivityProfile.declaredDownloadMbps} Mbps`
        : "Available",
      detail: listing.connectivityProfile?.verified
        ? listing.connectivityProfile.hasBackupConnection
          ? "Verified + backup"
          : "Verified"
        : "Reported by host",
    },
    {
      label: "Guest fit",
      value: `Up to ${listing.maxGuests} guests`,
      detail: `${listing.bedroomCount} bedroom${listing.bedroomCount === 1 ? "" : "s"}${listing.propertySizeSqm ? ` · ${listing.propertySizeSqm} sqm` : ""}`,
    },
    {
      label: "Cancellation",
      value: cancelPolicy?.label || listing.cancellationPolicy,
      detail: cancelPolicy?.description || "Flexible booking terms vary by property.",
    },
  ];

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: listing.title,
    description: listing.description,
    url: `${APP_URL}/spaces/${listing.id}`,
    image: listing.images.map((img) => img.url),
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: listing.state,
      postalCode: listing.postalCode,
      addressCountry: listing.country,
    },
    geo: listing.lat && listing.lng
      ? { "@type": "GeoCoordinates", latitude: listing.lat, longitude: listing.lng }
      : undefined,
    priceRange: `€${Math.round(listing.pricePerDay / 100)}/night`,
    numberOfRooms: listing.bedroomCount,
    amenityFeature: listing.amenities?.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a.name,
      value: true,
    })),
    aggregateRating: listing.reviewCount > 0
      ? { "@type": "AggregateRating", ratingValue: listing.averageRating, reviewCount: listing.reviewCount }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="waywork-shell py-8 md:py-10">
      <PropertyAnalyticsTracker
        listingId={listing.id}
        title={listing.title}
        city={listing.city}
        maxGuests={listing.maxGuests}
        hasTeamStayOption={Boolean(teamStayMode)}
      />
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-slate-500">
        <Link href="/search" className="transition-colors hover:text-slate-700 hover:underline">
          Find Spaces
        </Link>
        <span className="mx-2">/</span>
        <span>{listing.city}</span>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{listing.title}</span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main content */}
        <div className="flex-1">
          {/* Title section */}
          <div className="waywork-section mb-6 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-celadon)]">
              {listing.city}
              {listing.state ? `, ${listing.state}` : ""} · {listing.country}
            </p>
            <div className="mb-2 mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{wsType?.label}</Badge>
              {listing.connectivityProfile?.verified && (
                <Badge className="bg-[var(--ww-celadon)]">Verified Internet</Badge>
              )}
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {cancelPolicy?.label || listing.cancellationPolicy}
              </Badge>
              {listing.amenities.some((amenity) => /self check-in/i.test(amenity.name)) && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  Self check-in
                </Badge>
              )}
              {avgRating && (
                <span className="text-sm text-slate-600">
                  {"★".repeat(Math.round(parseFloat(avgRating)))} {avgRating} (
                  {listing._count.reviews})
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{listing.title}</h1>
            <p className="mt-1 text-slate-600">
              {listing.address}, {listing.city}
              {listing.state ? `, ${listing.state}` : ""}, {listing.country}
            </p>
            {limehomePilotMeta ? (
              <p className="mt-3 text-sm font-medium text-[var(--ww-celadon)]">
                {limehomePilotMeta.neighborhood} · {limehomePilotMeta.bestFor}
              </p>
            ) : null}
            <p className="mt-4 max-w-3xl text-base text-slate-700">{fitSummary}</p>
          </div>

          {/* Image gallery — Airbnb-style split hero */}
          <div className="mb-8">
            {listing.images.length > 0 ? (
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ height: "460px", display: "grid", gap: "4px", gridTemplateColumns: "1.6fr 1fr", gridTemplateRows: "1fr 1fr" }}
              >
                {/* Primary — large left */}
                <div
                  className="relative overflow-hidden"
                  style={{ gridRow: "1 / -1", background: "var(--ww-mist)" }}
                >
                  {listing.images[0]?.url.startsWith("http") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.images[0].url}
                      alt={listing.images[0].alt || listing.title}
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-6xl">{wsType?.icon || "🏢"}</div>
                  )}
                </div>

                {/* Secondary top-right */}
                {listing.images[1] && (
                  <div className="relative overflow-hidden" style={{ background: "var(--ww-mist)" }}>
                    {listing.images[1].url.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.images[1].url}
                        alt={listing.images[1].alt || listing.title}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                      />
                    ) : <div className="flex h-full items-center justify-center" style={{ color: "#b8afa4" }}>·</div>}
                  </div>
                )}

                {/* Tertiary bottom-right */}
                {listing.images[2] ? (
                  <div className="relative overflow-hidden" style={{ background: "var(--ww-mist)" }}>
                    {listing.images[2].url.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.images[2].url}
                        alt={listing.images[2].alt || listing.title}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                      />
                    ) : <div className="flex h-full items-center justify-center" style={{ color: "#b8afa4" }}>·</div>}

                    {/* Show all photos button */}
                    {listing.images.length > 3 && (
                      <div className="absolute bottom-3 right-3">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
                          style={{
                            background: "rgba(250,248,244,0.92)",
                            borderColor: "var(--ww-mist)",
                            color: "var(--ww-ink)",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 2px 8px rgba(13,31,45,0.12)",
                          }}
                        >
                          ⊞ All {listing.images.length} photos
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: "var(--ww-parchment)" }} />
                )}
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-2xl text-6xl"
                style={{ height: "280px", background: "var(--ww-gold-light)" }}
              >
                {wsType?.icon || "🏢"}
              </div>
            )}
          </div>

          {/* Quick read */}
          <div className="mb-8 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="waywork-section p-6">
              <p className="ww-eyebrow mb-2">Why this place works</p>
              <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--ww-ink)" }}>
                Fast read before you book
              </h2>
              {limehomePilotMeta ? (
                <p className="mt-3 text-sm font-semibold" style={{ color: "var(--ww-ink)" }}>
                  {limehomePilotMeta.summary}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#4a4540" }}>{descriptionTeaser}</p>
              {highlightedAmenities.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {highlightedAmenities.map((amenity) => (
                    <span
                      key={amenity.id}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{ background: "var(--ww-gold-light)", color: "var(--ww-ink)" }}
                    >
                      {amenity.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-2xl p-4 transition hover:shadow-sm"
                  style={{ background: "var(--ww-warm-white)", border: "1px solid var(--ww-mist)" }}
                >
                  <p className="ww-eyebrow">{fact.label}</p>
                  <p
                    className="mt-2 text-lg font-bold"
                    style={{ color: "var(--ww-ink)", fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {fact.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "#7a6e62" }}>{fact.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {teamStayMode ? (
          <TeamStayPlanner
            listingId={listing.id}
            listingTitle={listing.title}
            hostName={listing.host.name || "Host"}
            city={listing.city}
            currency={listing.currency}
            baseMaxGuests={listing.maxGuests}
            basePricePerDay={listing.pricePerDay}
            mode={teamStayMode}
            candidates={teamStayListings}
          />
          ) : null}

          {/* Work Score */}
          <div className="waywork-section mb-8 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="ww-eyebrow mb-1">Work Readiness</p>
                <h2 className="font-display text-xl font-semibold" style={{ color: "var(--ww-ink)" }}>
                  Work Score breakdown
                </h2>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl shadow-sm"
                    style={{
                      background: "var(--ww-ink)",
                      color: workScore.total >= 80 ? "#c9a84c" : workScore.total >= 65 ? "#7ecba1" : "#b8afa4",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    <span className="text-2xl font-bold leading-none">{workScore.total}</span>
                    <span className="text-[10px] font-medium opacity-60 mt-0.5">/100</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Composite score based on workspace productivity features</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Connectivity", score: workScore.connectivity, max: 30, tip: "Internet speed, network type, and backup connection" },
                { label: "Desk Setup", score: workScore.deskSetup, max: 20, tip: "Dedicated desk, monitor, and standing desk availability" },
                { label: "Meeting Space", score: workScore.meetingSpace, max: 15, tip: "Conference table, whiteboard, and collaboration area" },
                { label: "Quiet", score: workScore.quietEnvironment, max: 15, tip: "Private rooms and low-noise environment for focus work" },
                { label: "Ergonomics", score: workScore.ergonomics, max: 10, tip: "Ergonomic chair, adjustable desk, and proper lighting" },
                { label: "AV Ready", score: workScore.avReadiness, max: 10, tip: "Webcam, speaker, external monitor, and presentation screen" },
              ].map((item) => (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <div
                      className="cursor-help rounded-xl p-3 transition hover:shadow-sm"
                      style={{ background: "var(--ww-parchment)", border: "1px solid var(--ww-mist)" }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#7a6e62" }}>
                        {item.label}
                      </div>
                      {item.score === 0 ? (
                        <>
                          <div className="h-1.5 w-full rounded-full" style={{ background: "var(--ww-mist)" }} />
                          <div className="text-xs mt-1.5 italic" style={{ color: "#b8afa4" }}>Not assessed</div>
                        </>
                      ) : (
                        <>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--ww-mist)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${(item.score / item.max) * 100}%`,
                                background: item.score / item.max >= 0.7
                                  ? "var(--ww-celadon)"
                                  : item.score / item.max >= 0.4
                                    ? "var(--ww-gold)"
                                    : "var(--ww-terra)",
                              }}
                            />
                          </div>
                          <div
                            className="text-xs font-bold mt-1.5"
                            style={{ color: "var(--ww-ink)", fontFamily: "var(--font-mono, monospace)" }}
                          >
                            {item.score}<span className="font-normal opacity-50">/{item.max}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[180px] text-center text-xs">
                    <p className="font-semibold mb-0.5">{item.label} (/{item.max} pts)</p>
                    <p>{item.tip}</p>
                    {item.score === 0 && <p className="mt-1 opacity-60 italic">Host hasn&apos;t specified these amenities yet.</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Leisure features */}
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Offsite Comfort Features</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LEISURE_FEATURE_LABELS) as Array<keyof typeof LEISURE_FEATURE_LABELS>).map((key) => (
                <Badge
                  key={key}
                  variant={listing[key] ? "default" : "outline"}
                  className={listing[key] ? "bg-rose-600 text-white" : ""}
                >
                  {LEISURE_FEATURE_LABELS[key]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">About This Space</h2>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {listing.description}
            </p>
          </div>

          <Separator className="my-8" />

          {/* Activities */}
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Suggested Activities After Work</h2>
            {listing.activities.length === 0 ? (
              <p className="text-sm text-gray-500">
                Hosts can add nearby activity recommendations for this workspace.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {listing.activities.map((activity) => (
                  <div key={activity.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{activity.category}</p>
                        <p className="font-medium text-slate-900">{activity.title}</p>
                      </div>
                      {activity.indoor ? (
                        <Badge variant="secondary">Indoor</Badge>
                      ) : (
                        <Badge variant="outline">Outdoor</Badge>
                      )}
                    </div>
                    {activity.description && (
                      <p className="mt-2 text-sm text-slate-600">{activity.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      {activity.distanceKm ? <span>{activity.distanceKm.toFixed(1)} km away</span> : null}
                      {activity.durationMinutes ? <span>{activity.durationMinutes} min</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-8" />

          {/* Connectivity */}
          {listing.connectivityProfile && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Connectivity</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {listing.connectivityProfile.declaredDownloadMbps}
                  </div>
                  <div className="text-xs text-gray-500">Mbps Download</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {listing.connectivityProfile.declaredUploadMbps}
                  </div>
                  <div className="text-xs text-gray-500">Mbps Upload</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-sm font-semibold">
                    {listing.connectivityProfile.networkType === "BOTH"
                      ? "WiFi + Wired"
                      : listing.connectivityProfile.networkType}
                  </div>
                  <div className="text-xs text-gray-500">Network Type</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-sm font-semibold">
                    {listing.connectivityProfile.hasBackupConnection
                      ? "Yes"
                      : "No"}
                  </div>
                  <div className="text-xs text-gray-500">Backup Connection</div>
                </div>
              </div>
              {listing.connectivityProfile.verified && (
                <p className="text-xs text-[var(--ww-celadon)] mt-2">
                  Speed verified by WayWork
                </p>
              )}
            </div>
          )}

          <Separator className="my-8" />

          {/* Amenities */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">
              Amenities ({listing.amenities.length})
            </h2>
            <div className="space-y-4">
              {Object.entries(amenityGroups).map(([category, amenities]) => {
                const catMeta =
                  AMENITY_CATEGORIES[
                    category as keyof typeof AMENITY_CATEGORIES
                  ];
                return (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-500 mb-1.5">
                      {catMeta?.label || category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((a) => (
                        <Badge key={a.id} variant="secondary">
                          {a.name}
                          {a.quantity > 1 && ` (x${a.quantity})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="my-8" />

          {/* Reviews */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">
              Reviews ({listing._count.reviews})
            </h2>
            {listingReviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviewHighlights.length > 0 && (
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                      Guest Highlights
                    </p>
                    <div className="mt-2 space-y-2">
                      {reviewHighlights.map((review) => (
                        <p key={`${review.id}-highlight`} className="text-sm text-cyan-900">
                          &quot;{review.comment}&quot;
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {listingReviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={review.author.image || undefined} />
                        <AvatarFallback>
                          {review.author.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {review.author.name || "Anonymous"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {"*".repeat(review.overallRating)}
                          {"*".repeat(0)}{" "}
                          {review.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {review.wifiAccuracy && (
                        <span>WiFi: {review.wifiAccuracy}/5</span>
                      )}
                      {review.quietness && (
                        <span>Quiet: {review.quietness}/5</span>
                      )}
                      {review.deskSetup && (
                        <span>Desk: {review.deskSetup}/5</span>
                      )}
                      {review.cleanliness && (
                        <span>Clean: {review.cleanliness}/5</span>
                      )}
                    </div>
                    {review.hostResponse && (
                      <div className="mt-3 ml-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs font-medium text-gray-500">
                          Host Response
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          {review.hostResponse}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Host */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Your Host</h2>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={listing.host.image || undefined} />
                <AvatarFallback className="text-lg">
                  {listing.host.name?.[0] || "H"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{listing.host.name}</p>
                <p className="text-sm text-gray-500">
                  Member since{" "}
                  {listing.host.createdAt.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {listing.host.bio && (
                  <p className="text-sm text-gray-600 mt-1">
                    {listing.host.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Cancellation Policy</h2>
            <p className="text-sm font-medium">{cancelPolicy?.label}</p>
            <p className="text-sm text-gray-600">{cancelPolicy?.description}</p>
          </div>

          {relatedListings.length > 0 ? (
            <div className="mt-10">
              <h2 className="text-2xl font-semibold text-[var(--ww-ink)]">Similar Spots You May Love</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {relatedListings.map((related) => (
                  <Link
                    key={related.id}
                    href={`/spaces/${related.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="aspect-[16/9] bg-slate-100">
                      {related.images[0]?.url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={related.images[0].url}
                            alt={related.images[0].alt || related.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                          Workspace Preview
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-4">
                      <p className="line-clamp-1 font-semibold text-slate-900">{related.title}</p>
                      <p className="text-sm text-slate-600">
                        {related.city}
                        {related.state ? `, ${related.state}` : ""}
                      </p>
                      <p className="text-sm font-semibold text-[var(--ww-ink)]">
                        ${(related.pricePerDay / 100).toFixed(0)}/day · Work Score {related.workScore}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Booking sidebar */}
        <div className="w-full lg:w-96 flex-shrink-0 space-y-4">
          <BookingSidebar
            listingId={listing.id}
            pricePerDay={listing.pricePerDay}
            cleaningFee={listing.cleaningFee}
            maxGuests={listing.maxGuests}
            cancellationPolicy={listing.cancellationPolicy}
            currency={listing.currency}
            blockedDates={blockedDates}
          />
          <InquiryButton
            listingId={listing.id}
            hostName={listing.host.name || "Host"}
          />
        </div>
      </div>
    </div>
    </>
  );
}
