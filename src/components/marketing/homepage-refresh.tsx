import Link from "next/link";
import {
  BedDouble,
  CalendarDays,
  Gauge,
  Globe2,
  Landmark,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Users2,
  Wifi,
} from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/stripe";
import { HomeHero, type HeroImage } from "@/components/marketing/home-hero";
import { ReturningGuestBanner } from "@/components/marketing/returning-guest-banner";
import { HostTeaserToggle } from "@/components/marketing/host-teaser-toggle";
import { HomeQuickSearchForm } from "@/components/marketing/home-quick-search-form";

type FeaturedListing = {
  id: string;
  title: string;
  city: string;
  state: string | null;
  country: string;
  pricePerDay: number;
  maxGuests: number;
  workScore: number;
  images: Array<{ url: string; alt: string | null }>;
  connectivityProfile: {
    declaredDownloadMbps: number;
    verified: boolean;
  } | null;
};

type Testimonial = {
  id: string;
  comment: string;
  author: string;
  context: string;
};

const fallbackTestimonials: Testimonial[] = [
  {
    id: "fallback-1",
    comment: "Finally, a spot where my WiFi matches my wanderlust.",
    author: "Alex",
    context: "Digital Nomad",
  },
  {
    id: "fallback-2",
    comment: "Our leadership offsite felt productive and genuinely fun.",
    author: "Mina",
    context: "Chief of Staff",
  },
  {
    id: "fallback-3",
    comment: "The work score made picking a reliable setup fast and stress-free.",
    author: "Theo",
    context: "Product Lead",
  },
];

const fallbackFeatureImages = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80",
];

async function getHomepageData() {
  try {
    const [featuredListings, rawTestimonials, bookingCount, reviewStats, activeSpaceCount] =
      await Promise.all([
        db.listing.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ reviewCount: "desc" }, { workScore: "desc" }, { createdAt: "desc" }],
          take: 6,
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            country: true,
            pricePerDay: true,
            maxGuests: true,
            workScore: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true, alt: true },
            },
            connectivityProfile: {
              select: { declaredDownloadMbps: true, verified: true },
            },
          },
        }),
        db.review.findMany({
          where: {
            targetType: "LISTING",
            comment: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            comment: true,
            author: { select: { name: true } },
            listing: { select: { city: true, country: true } },
          },
        }),
        db.booking.count(),
        db.review.aggregate({ _avg: { overallRating: true } }),
        db.listing.count({ where: { status: "ACTIVE" } }),
      ]);

    const testimonials = rawTestimonials
      .filter((item) => item.comment && item.comment.trim().length > 30)
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        comment: item.comment || "",
        author: item.author.name || "Way Work Guest",
        context: item.listing ? `${item.listing.city}, ${item.listing.country}` : "Way Work",
      }));

    return {
      featuredListings,
      testimonials: testimonials.length > 0 ? testimonials : fallbackTestimonials,
      bookingCount,
      averageRating: reviewStats._avg.overallRating ?? 4.8,
      activeSpaceCount,
    };
  } catch {
    return {
      featuredListings: [] as FeaturedListing[],
      testimonials: fallbackTestimonials,
      bookingCount: 500,
      averageRating: 4.8,
      activeSpaceCount: 100,
    };
  }
}

export async function HomepageRefresh() {
  const data = await getHomepageData();

  const heroImages: HeroImage[] = data.featuredListings
    .map((listing) => listing.images[0])
    .filter(Boolean)
    .map((image, index) => ({
      url: image.url,
      alt: image.alt || `Remote workspace destination ${index + 1}`,
    }))
    .slice(0, 5);

  const featureVisuals = [
    data.featuredListings[0]?.images[0]?.url,
    data.featuredListings[1]?.images[0]?.url,
    data.featuredListings[2]?.images[0]?.url,
    data.featuredListings[3]?.images[0]?.url,
  ].map((image, index) => image || fallbackFeatureImages[index]);

  return (
    <div className="pb-16">
      <HomeHero images={heroImages} />

      <section id="quick-search" className="waywork-shell -mt-12 md:-mt-20 relative z-10">
        <div className="waywork-elevated rounded-3xl border border-slate-200 bg-[var(--ww-neutral-light)]/35 p-6 md:p-8">
          <div className="grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
                Quick Search
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ww-primary-blue)] md:text-3xl">
                Where to? Find your next productive escape.
              </h2>
              <p className="mt-1 text-sm text-[var(--ww-text-primary)] md:text-base">
                City, landmark, or team size. Filter by verified internet, dates, and work-ready
                amenities in seconds.
              </p>
            </div>
            <ReturningGuestBanner />
          </div>

          <HomeQuickSearchForm />
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
              Guest-First
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
              Why Way Work? Your Passport to Productive Play
            </h2>
          </div>
          <Badge className="hidden bg-[var(--ww-primary-blue)] text-white md:inline-flex">
            80% Guest Experience + 20% Host Growth
          </Badge>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Blissful Workations",
              body: "Remote pros level up laptop life in work-ready lofts, villas, and home studios with verified speed and sleep comfort.",
              cta: "Browse Solo Spots",
              href: "/search?workspaceTypes=HOME_OFFICE,PRIVATE_OFFICE&verifiedInternet=true",
              icon: Sparkles,
            },
            {
              title: "Exec Essentials",
              body: "Business travelers skip cramped hotel desks with wired backups, team suites, and landmark-adjacent locations.",
              cta: "Find Team Hubs",
              href: "/search?workspaceTypes=MEETING_ROOM,HYBRID_SPACE&guests=6",
              icon: Landmark,
            },
            {
              title: "Fun Factor",
              body: "Work hard, play harder with local tips, after-hours options, and homes built for both focus and recharge.",
              cta: "Discover Experiences",
              href: "/search?hasSwimmingPool=true&hasBackyard=true",
              icon: Globe2,
            },
          ].map((item) => (
            <article
              key={item.title}
              className="group rounded-3xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <item.icon className="size-6 text-[var(--ww-secondary-green)]" />
              <h3 className="mt-3 text-2xl font-semibold text-[var(--ww-primary-blue)]">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--ww-text-primary)]">{item.body}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex text-sm font-semibold text-[var(--ww-primary-blue)] underline-offset-4 group-hover:underline"
              >
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
              Top Picks for Your Next Escape
            </h2>
            <p className="mt-1 text-sm text-[var(--ww-text-primary)]">
              Curated spaces blending residential comfort with reliable productivity.
            </p>
          </div>
          <Link href="/search" className="text-sm font-semibold text-[var(--ww-primary-blue)] underline">
            View all spaces
          </Link>
        </div>

        <div className="grid auto-cols-[84%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[48%] lg:auto-cols-[32%]">
          {data.featuredListings.length > 0 ? (
            data.featuredListings.map((listing) => (
              <article
                key={listing.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] bg-slate-100">
                  {listing.images[0]?.url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={listing.images[0].url}
                        alt={listing.images[0].alt || listing.title}
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
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-lg font-semibold text-[var(--ww-primary-blue)]">
                      {listing.title}
                    </h3>
                    <p className="text-sm font-semibold text-[var(--ww-primary-blue)]">
                      {formatCurrency(listing.pricePerDay)}/day
                    </p>
                  </div>
                  <p className="text-sm text-[var(--ww-text-primary)]">
                    {listing.city}
                    {listing.state ? `, ${listing.state}` : ""}, {listing.country}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--ww-secondary-green)]">
                    <span className="ww-trust-pill inline-flex items-center gap-1.5">
                      <Wifi className="size-3.5" />
                      {listing.connectivityProfile?.declaredDownloadMbps ?? 0} Mbps
                    </span>
                    <span className="ww-trust-pill inline-flex items-center gap-1.5">
                      <BedDouble className="size-3.5" />
                      Home comfort
                    </span>
                    <span className="ww-trust-pill inline-flex items-center gap-1.5">
                      <Users2 className="size-3.5" />
                      Up to {listing.maxGuests}
                    </span>
                    <span className="ww-trust-pill inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5" />
                      Work Score {listing.workScore}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-[var(--ww-secondary-green)]/30 text-[var(--ww-primary-blue)] hover:bg-emerald-50"
                    asChild
                  >
                    <Link href={`/spaces/${listing.id}`}>View Details</Link>
                  </Button>
                </div>
              </article>
            ))
          ) : (
            Array.from({ length: 3 }).map((_, index) => (
              <article
                key={`placeholder-${index}`}
                className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500"
              >
                Featured listing coming soon.
              </article>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="ww-trust-pill">100+ Verified Spaces</span>
          <span className="ww-trust-pill">{data.averageRating.toFixed(1)} Avg Work Score Rating</span>
          <span className="ww-trust-pill">Free Cancellation Options</span>
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="rounded-3xl bg-[var(--ww-neutral-light)]/28 p-6 md:p-8">
          <h2 className="text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
            Built for Work That Travels
          </h2>
          <div className="mt-6 space-y-5">
            {[
              {
                title: "Verified Connectivity",
                body: "786+ Mbps WiFi and wired backup options so your next pitch stays smooth.",
                icon: Wifi,
              },
              {
                title: "Work Score",
                body: "Clear 1-100 ratings across productivity essentials like light, quiet, and setup quality.",
                icon: Gauge,
              },
              {
                title: "Team-Ready Layouts",
                body: "Up to 10 guests, breakout zones, and home-style collaboration spaces for offsites.",
                icon: Users2,
              },
              {
                title: "Leisure Layer",
                body: "Curated local recommendations and comfort-first spaces to recharge after hours.",
                icon: MapPinned,
              },
            ].map((feature, index) => (
              <article
                key={feature.title}
                className={`grid items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 md:p-5 ${
                  index % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
                    <feature.icon className="size-4" />
                    Feature {index + 1}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--ww-primary-blue)]">{feature.title}</h3>
                  <p className="mt-2 text-sm text-[var(--ww-text-primary)]">{feature.body}</p>
                </div>
                <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featureVisuals[index]}
                    alt={`${feature.title} workspace visual`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
              Wanderers Who Work Love It
            </h2>
            <p className="mt-1 text-sm text-[var(--ww-text-primary)]">
              Real guest feedback from workations and team offsites.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="ww-trust-pill inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {data.bookingCount}+ Bookings
            </span>
            <span className="ww-trust-pill inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              {data.averageRating.toFixed(1)}/5 Stars
            </span>
            <span className="ww-trust-pill">98% Repeat Guests</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.testimonials.map((testimonial) => (
            <article key={testimonial.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm italic text-[var(--ww-text-primary)]">
                &quot;{testimonial.comment}&quot;
              </p>
              <p className="mt-4 text-sm font-semibold text-[var(--ww-primary-blue)]">
                {testimonial.author}
              </p>
              <p className="text-xs text-slate-500">{testimonial.context}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="ww-trust-pill">Nomad-ready Standards</span>
          <span className="ww-trust-pill">Team Offsite Approved</span>
          <span className="ww-trust-pill">{data.activeSpaceCount}+ Active Global Spaces</span>
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <HostTeaserToggle />
      </section>
    </div>
  );
}
