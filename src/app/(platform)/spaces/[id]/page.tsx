import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WORKSPACE_TYPES, CANCELLATION_POLICIES, AMENITY_CATEGORIES } from "@/lib/constants";
import { computeWorkScore, getWorkScoreColor } from "@/lib/work-score";
import { formatCurrency } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { BookingSidebar } from "@/components/booking/booking-sidebar";
import { InquiryButton } from "@/components/messaging/inquiry-button";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id, status: "ACTIVE" },
    select: { title: true, description: true, city: true },
  });

  if (!listing) return { title: "Space Not Found" };

  return {
    title: `${listing.title} - ${listing.city}`,
    description: listing.description.slice(0, 160),
  };
}

export default async function SpaceDetailPage({ params }: Props) {
  const { id } = await params;

  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      amenities: { orderBy: { category: "asc" } },
      connectivityProfile: true,
      host: { select: { id: true, name: true, image: true, bio: true, createdAt: true } },
      reviews: {
        include: { author: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { reviews: true, bookings: true } },
    },
  });

  if (!listing || listing.status !== "ACTIVE") {
    notFound();
  }

  const wsType = WORKSPACE_TYPES[listing.workspaceType as keyof typeof WORKSPACE_TYPES];
  const cancelPolicy = CANCELLATION_POLICIES[listing.cancellationPolicy as keyof typeof CANCELLATION_POLICIES];
  const workScore = computeWorkScore({
    amenities: listing.amenities,
    connectivity: listing.connectivityProfile,
  });

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/search" className="hover:underline">
          Find Spaces
        </Link>
        <span className="mx-2">/</span>
        <span>{listing.city}</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{listing.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1">
          {/* Title section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{wsType?.label}</Badge>
              {listing.connectivityProfile?.verified && (
                <Badge className="bg-green-500">Verified</Badge>
              )}
              {avgRating && (
                <span className="text-sm text-gray-600">
                  {"*".repeat(Math.round(parseFloat(avgRating)))} {avgRating} (
                  {listing._count.reviews})
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{listing.title}</h1>
            <p className="text-gray-600 mt-1">
              {listing.address}, {listing.city}
              {listing.state ? `, ${listing.state}` : ""}, {listing.country}
            </p>
          </div>

          {/* Image gallery */}
          <div className="mb-8">
            {listing.images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg overflow-hidden">
                {listing.images.slice(0, 4).map((img, i) => (
                  <div
                    key={img.id}
                    className={cn(
                      "bg-gray-100",
                      i === 0 ? "md:row-span-2 aspect-square md:aspect-auto" : "aspect-video"
                    )}
                  >
                    {img.url.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt={img.alt || listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-4xl">
                        {wsType?.icon || "🏢"}
                      </div>
                    )}
                  </div>
                ))}
                {listing.images.length === 0 && (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-6xl col-span-2">
                    {wsType?.icon || "🏢"}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-6xl">
                {wsType?.icon || "🏢"}
              </div>
            )}
          </div>

          {/* Work Score */}
          <div className="mb-8 rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Work Score</h2>
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className={cn(
                      "text-3xl font-bold",
                      getWorkScoreColor(workScore.total)
                    )}
                  >
                    {workScore.total}/100
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Composite score based on workspace productivity features</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Connectivity", score: workScore.connectivity, max: 30 },
                { label: "Desk Setup", score: workScore.deskSetup, max: 20 },
                { label: "Meeting Space", score: workScore.meetingSpace, max: 15 },
                { label: "Quiet", score: workScore.quietEnvironment, max: 15 },
                { label: "Ergonomics", score: workScore.ergonomics, max: 10 },
                { label: "AV Ready", score: workScore.avReadiness, max: 10 },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className="mt-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          item.score / item.max >= 0.7
                            ? "bg-green-500"
                            : item.score / item.max >= 0.4
                              ? "bg-yellow-500"
                              : "bg-orange-500"
                        )}
                        style={{
                          width: `${(item.score / item.max) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs font-medium mt-0.5">
                      {item.score}/{item.max}
                    </div>
                  </div>
                </div>
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
                <p className="text-xs text-green-600 mt-2">
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
        </div>

        {/* Booking sidebar */}
        <div className="w-full lg:w-96 flex-shrink-0 space-y-4">
          <BookingSidebar
            listingId={listing.id}
            pricePerDay={listing.pricePerDay}
            cleaningFee={listing.cleaningFee}
            maxGuests={listing.maxGuests}
            cancellationPolicy={listing.cancellationPolicy}
          />
          <InquiryButton
            listingId={listing.id}
            hostName={listing.host.name || "Host"}
          />
        </div>
      </div>
    </div>
  );
}
