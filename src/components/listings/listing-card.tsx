import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WORKSPACE_TYPES } from "@/lib/constants";
import { getWorkScoreColor } from "@/lib/work-score";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    slug: string;
    workspaceType: string;
    city: string;
    state: string | null;
    country: string;
    pricePerDay: number;
    cleaningFee: number;
    maxGuests: number;
    workScore: number;
    images: { url: string; alt: string | null }[];
    connectivityProfile: {
      declaredDownloadMbps: number;
      networkType: string;
      verified: boolean;
    } | null;
    host: { name: string | null; image: string | null };
    _count: { reviews: number };
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  const wsType =
    WORKSPACE_TYPES[listing.workspaceType as keyof typeof WORKSPACE_TYPES];
  const primaryImage = listing.images[0];

  return (
    <Link href={`/spaces/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        {/* Image */}
        <div className="aspect-[4/3] bg-gray-100 relative">
          {primaryImage?.url?.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage.url}
              alt={primaryImage.alt || listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">
              {wsType?.icon || "🏢"}
            </div>
          )}

          {/* Work Score badge */}
          <div
            className={cn(
              "absolute top-2 right-2 bg-white rounded-full px-2.5 py-1 text-sm font-bold shadow",
              getWorkScoreColor(listing.workScore)
            )}
          >
            {listing.workScore}
          </div>

          {/* Verified connectivity badge */}
          {listing.connectivityProfile?.verified && (
            <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs font-medium shadow">
              Verified
            </div>
          )}
        </div>

        <CardContent className="p-3">
          {/* Type and location */}
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-xs py-0">
              {wsType?.label || listing.workspaceType}
            </Badge>
            <span className="text-xs text-gray-500">
              {listing.city}
              {listing.state ? `, ${listing.state}` : ""}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
            {listing.title}
          </h3>

          {/* Connectivity */}
          {listing.connectivityProfile && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
              <span>
                {listing.connectivityProfile.declaredDownloadMbps} Mbps
              </span>
              <span>-</span>
              <span>
                {listing.connectivityProfile.networkType === "BOTH"
                  ? "WiFi + Wired"
                  : listing.connectivityProfile.networkType}
              </span>
            </div>
          )}

          {/* Price and guests */}
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold">
                ${(listing.pricePerDay / 100).toFixed(0)}
              </span>
              <span className="text-sm text-gray-500"> /day</span>
            </div>
            <span className="text-xs text-gray-500">
              Up to {listing.maxGuests} guest
              {listing.maxGuests > 1 ? "s" : ""}
            </span>
          </div>

          {/* Reviews */}
          {listing._count.reviews > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {listing._count.reviews} review
              {listing._count.reviews !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
