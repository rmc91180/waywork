"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BED_SIZE_OPTIONS, WORKSPACE_TYPES } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { getLimehomePilotMeta } from "@/lib/limehome-pilot";
import { getWorkScoreColor } from "@/lib/work-score";
import { cn } from "@/lib/utils";
import type { SearchUiVariant } from "@/lib/experiments";

export interface ListingCardData {
  id: string;
  title: string;
  slug: string;
  lat?: number;
  lng?: number;
  workspaceType: string;
  city: string;
  state: string | null;
  country: string;
  pricePerDay: number;
  cleaningFee: number;
  maxGuests: number;
  bedroomCount: number;
  bedSize: string;
  propertySizeSqm: number | null;
  workScore: number;
  hasJacuzzi: boolean;
  hasSwimmingPool: boolean;
  hasBackyard: boolean;
  hasPingPongTable: boolean;
  hasPoolTable: boolean;
  averageRating?: number | null;
  reviewCount?: number;
  images: { url: string; alt: string | null }[];
  connectivityProfile: {
    declaredDownloadMbps: number;
    networkType: string;
    verified: boolean;
    hasBackupConnection?: boolean;
  } | null;
  host: { name: string | null; image: string | null };
  _count: { reviews: number };
}

interface ListingCardProps {
  variant?: SearchUiVariant;
  listing: ListingCardData;
  matchReasons?: string[];
}

function networkLabel(type: string) {
  if (type === "BOTH") return "WiFi + Wired";
  if (type === "WIRED") return "Wired";
  return "WiFi";
}

export function ListingCard({
  listing,
  variant = "control",
  matchReasons = [],
}: ListingCardProps) {
  const wsType = WORKSPACE_TYPES[listing.workspaceType as keyof typeof WORKSPACE_TYPES];
  const bedSize = BED_SIZE_OPTIONS[listing.bedSize as keyof typeof BED_SIZE_OPTIONS];
  const primaryImage = listing.images[0];
  const rating = listing.averageRating || null;
  const reviewCount = listing.reviewCount || listing._count.reviews;
  const limehomePilotMeta = getLimehomePilotMeta({ slug: listing.slug });

  return (
    <Link
      href={`/spaces/${listing.slug}`}
      className="block"
      onClick={() =>
        trackEvent({
          event: "search_result_clicked",
          properties: {
            listingId: listing.id,
            title: listing.title,
            city: listing.city,
            workScore: listing.workScore,
          },
        })
      }
    >
      <Card
        className={cn(
          "group h-full overflow-hidden border-slate-200 py-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300",
          variant === "immersive" ? "hover:shadow-xl" : "hover:shadow-lg"
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {primaryImage?.url?.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage.url}
              alt={primaryImage.alt || listing.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">
              {wsType?.icon || "🏢"}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="bg-white/95 text-slate-800">{wsType?.label || listing.workspaceType}</Badge>
            {limehomePilotMeta && (
              <Badge className="bg-cyan-600 text-white">{limehomePilotMeta.badge}</Badge>
            )}
            {listing.connectivityProfile?.verified && (
              <Badge className="bg-[var(--ww-secondary-green)] text-white">Verified Internet</Badge>
            )}
          </div>

          <div
            className={cn(
              "absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-sm font-bold shadow-md",
              getWorkScoreColor(listing.workScore)
            )}
          >
            {listing.workScore}
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {listing.city}
                {listing.state ? `, ${listing.state}` : ""}
              </p>
              <p className="text-xs text-white/80">
                Up to {listing.maxGuests} guest{listing.maxGuests > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-white/80">
                {listing.bedroomCount} bed · {bedSize?.label || listing.bedSize}
              </p>
            </div>
            <div className="rounded-md bg-black/45 px-2 py-1 text-right backdrop-blur-sm">
              <p className="text-sm font-semibold">${(listing.pricePerDay / 100).toFixed(0)}/day</p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-2.5 p-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight text-slate-900">
            {listing.title}
          </h3>

          {limehomePilotMeta && (
            <p className="text-sm text-slate-600">
              {limehomePilotMeta.neighborhood} · {limehomePilotMeta.bestFor}
            </p>
          )}

          {matchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {matchReasons.slice(0, 3).map((reason) => (
                <Badge
                  key={reason}
                  variant="secondary"
                  className="bg-cyan-50 text-cyan-800"
                >
                  {reason}
                </Badge>
              ))}
            </div>
          )}

          {listing.connectivityProfile && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>{listing.connectivityProfile.declaredDownloadMbps} Mbps</span>
              <span>{networkLabel(listing.connectivityProfile.networkType)}</span>
              {listing.connectivityProfile.hasBackupConnection && <span>Backup internet</span>}
              {listing.propertySizeSqm ? <span>{listing.propertySizeSqm} sqm</span> : null}
            </div>
          )}

          {(listing.hasJacuzzi ||
            listing.hasSwimmingPool ||
            listing.hasBackyard ||
            listing.hasPingPongTable ||
            listing.hasPoolTable) && (
            <div className="flex flex-wrap gap-1.5">
              {listing.hasSwimmingPool && <Badge variant="secondary">Pool</Badge>}
              {listing.hasJacuzzi && <Badge variant="secondary">Jacuzzi</Badge>}
              {listing.hasBackyard && <Badge variant="secondary">Backyard</Badge>}
              {listing.hasPingPongTable && <Badge variant="secondary">Ping Pong</Badge>}
              {listing.hasPoolTable && <Badge variant="secondary">Pool Table</Badge>}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <div className="text-xs text-slate-500">
              {rating ? `${rating.toFixed(1)} avg rating` : "New listing"}
              {reviewCount > 0 ? ` · ${reviewCount} review${reviewCount > 1 ? "s" : ""}` : ""}
            </div>
            <span className="text-xs font-medium text-[var(--ww-primary-blue)] transition-colors group-hover:text-[var(--ww-secondary-green)]">
              View details
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
