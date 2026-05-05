"use client";

import Link from "next/link";
import { WORKSPACE_TYPES } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { getLimehomePilotMeta } from "@/lib/limehome-pilot";
import { formatCurrency } from "@/lib/stripe";
import { cn } from "@/lib/utils";

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
  currency?: string;
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
  variant?: string;
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
  const primaryImage = listing.images[0];
  const rating = listing.averageRating || null;
  const reviewCount = listing.reviewCount || listing._count.reviews;
  const limehomePilotMeta = getLimehomePilotMeta({ slug: listing.slug });
  const score = listing.workScore;
  const scoreColor = score >= 80 ? "#2d6a4f" : score >= 65 ? "#c9a84c" : "#7a6e62";

  return (
    <Link
      href={`/spaces/${listing.slug}`}
      className="block ww-listing-card ww-hover-lift"
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
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--ww-mist)]">
        {primaryImage?.url?.startsWith("http") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage.url}
            alt={primaryImage.alt || listing.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl bg-[var(--ww-gold-light)]">
            {wsType?.icon || "🏢"}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="ww-card-img-overlay absolute inset-0" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-[var(--ww-warm-white)]/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ww-ink)] backdrop-blur-sm">
            {wsType?.label || listing.workspaceType}
          </span>
          {limehomePilotMeta && (
            <span className="rounded-md bg-[var(--ww-celadon)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {limehomePilotMeta.badge}
            </span>
          )}
          {listing.connectivityProfile?.verified && (
            <span className="rounded-md bg-[var(--ww-celadon-light)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ww-celadon)]">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Work Score — top right */}
        <div
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm shadow-lg"
          style={{ background: "var(--ww-ink)", color: scoreColor, fontFamily: "var(--font-mono, monospace)" }}
        >
          {score}
        </div>

        {/* Bottom — city + price */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white drop-shadow-sm">
              {listing.city}
            </p>
            <p className="text-xs text-white/75">
              Up to {listing.maxGuests} guest{listing.maxGuests > 1 ? "s" : ""}
            </p>
          </div>
          <div className="shrink-0">
            <p
              className="text-base font-bold text-white drop-shadow-sm"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {formatCurrency(listing.pricePerDay, listing.currency ?? "USD")}
            </p>
            <p className="text-right text-[10px] text-white/70">per night</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-[var(--ww-ink)]">
          {listing.title}
        </h3>

        {limehomePilotMeta && (
          <p className="mt-0.5 text-xs text-[#7a6e62]">
            {limehomePilotMeta.neighborhood} · {limehomePilotMeta.bestFor}
          </p>
        )}

        {/* Connectivity quick stat */}
        {listing.connectivityProfile && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#7a6e62]">
            <span
              className="rounded-md bg-[var(--ww-celadon-light)] px-1.5 py-0.5 font-semibold text-[var(--ww-celadon)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {listing.connectivityProfile.declaredDownloadMbps} Mbps
            </span>
            <span>{networkLabel(listing.connectivityProfile.networkType)}</span>
            {listing.connectivityProfile.hasBackupConnection && (
              <span className="text-[var(--ww-celadon)]">· Backup</span>
            )}
          </div>
        )}

        {matchReasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {matchReasons.slice(0, 2).map((reason) => (
              <span
                key={reason}
                className="rounded-md bg-[var(--ww-gold-light)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ww-ink)]"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--ww-mist)] pt-2.5">
          <span className="text-[11px] text-[#b8afa4]">
            {rating
              ? `★ ${rating.toFixed(1)} · ${reviewCount} review${reviewCount !== 1 ? "s" : ""}`
              : "New listing"}
          </span>
          <span className="text-[11px] font-medium text-[var(--ww-terra)] transition-colors group-hover:text-[var(--ww-terra-deep)]">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

