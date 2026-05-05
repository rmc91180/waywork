"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchLayout } from "@/components/search/search-layout";
import { ListingCard, type ListingCardData } from "@/components/listings/listing-card";
import { SearchExperimentTracker } from "@/components/search/search-experiment-tracker";
import {
  serializeSearchFilterParams,
  withPage,
  type SearchFilterState,
} from "@/lib/search-filters";
import { trackEvent } from "@/lib/analytics";
import type { SearchUiVariant } from "@/lib/experiments";
import { WORKSPACE_TYPES } from "@/lib/constants";

interface SearchResultsClientProps {
  initialListings: ListingCardData[];
  totalPages: number;
  initialPage: number;
  filters: SearchFilterState;
  nearbyHref: string;
  searchVariant: SearchUiVariant;
}

interface SearchApiResponse {
  listings: ListingCardData[];
  total: number;
  totalPages: number;
  page: number;
}

function toMapListings(listings: ListingCardData[]) {
  return listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    lat: listing.lat ?? 0,
    lng: listing.lng ?? 0,
    pricePerDay: listing.pricePerDay,
    currency: listing.currency ?? "USD",
    workScore: listing.workScore,
    slug: listing.slug,
    city: listing.city,
    workspaceType: listing.workspaceType,
    images: listing.images.map((img) => ({ url: img.url, alt: img.alt })),
  }));
}

function getMatchReasons(listing: ListingCardData, filters: SearchFilterState) {
  const reasons: string[] = [];
  const pushReason = (reason: string) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };

  if (filters.workspaceTypes.includes(listing.workspaceType)) {
    pushReason(
      WORKSPACE_TYPES[listing.workspaceType as keyof typeof WORKSPACE_TYPES]?.label ||
        "Matching layout"
    );
  }

  if (filters.verifiedInternet && listing.connectivityProfile?.verified) {
    pushReason("Verified internet");
  }

  if (filters.guests) {
    const requestedGuests = Number(filters.guests);
    if (Number.isFinite(requestedGuests) && listing.maxGuests >= requestedGuests) {
      pushReason(`Fits ${requestedGuests}+ guests`);
    }
  }

  if (listing.connectivityProfile?.declaredDownloadMbps) {
    const speed = listing.connectivityProfile.declaredDownloadMbps;
    if (speed >= 300) {
      pushReason(`${speed} Mbps`);
    }
  }

  if (listing.workScore >= 90) {
    pushReason(`Work Score ${listing.workScore}`);
  }

  if (filters.hasSwimmingPool && listing.hasSwimmingPool) pushReason("Pool");
  if (filters.hasBackyard && listing.hasBackyard) pushReason("Backyard");
  if (filters.hasJacuzzi && listing.hasJacuzzi) pushReason("Jacuzzi");

  if (reasons.length === 0) {
    if (listing.connectivityProfile?.verified) pushReason("Verified internet");
    if (listing.workScore >= 85) pushReason(`Work Score ${listing.workScore}`);
    pushReason(`Up to ${listing.maxGuests} guests`);
  }

  return reasons.slice(0, 3);
}

export function SearchResultsClient({
  initialListings,
  totalPages,
  initialPage,
  filters,
  nearbyHref,
  searchVariant,
}: SearchResultsClientProps) {
  const [listings, setListings] = useState(initialListings);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [resolvedTotalPages, setResolvedTotalPages] = useState(totalPages);
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = currentPage < resolvedTotalPages;

  useEffect(() => {
    setListings(initialListings);
    setCurrentPage(initialPage);
    setResolvedTotalPages(totalPages);
    setLoadError(null);
  }, [initialListings, initialPage, totalPages]);

  useEffect(() => {
    trackEvent({
      event: "search_results_viewed",
      properties: {
        query: filters.query || null,
        city: filters.city || null,
        nearQuery: filters.nearQuery || null,
        totalVisibleListings: listings.length,
        currentPage,
        totalPages: resolvedTotalPages,
      },
    });
  }, [
    currentPage,
    filters.city,
    filters.nearQuery,
    filters.query,
    listings.length,
    resolvedTotalPages,
  ]);

  const loadNextPage = useCallback(async () => {
    if (!hasMore || loadingNextPage) return;

    setLoadingNextPage(true);
    setLoadError(null);
    const nextPage = currentPage + 1;

    try {
      const params = serializeSearchFilterParams(withPage(filters, nextPage));
      const response = await fetch(`/api/search?${params.toString()}`, {
        method: "GET",
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to load page ${nextPage}`);
      }

      const payload = (await response.json()) as SearchApiResponse;
      setListings((prev) => {
        const deduped = new Map(prev.map((item) => [item.id, item]));
        for (const listing of payload.listings) {
          deduped.set(listing.id, listing);
        }
        return Array.from(deduped.values());
      });

      setCurrentPage(payload.page);
      setResolvedTotalPages(payload.totalPages);
      window.history.replaceState(
        window.history.state,
        "",
        `/search?${params.toString()}`
      );

      trackEvent({
        event: "search_infinite_page_loaded",
        properties: {
          page: payload.page,
          totalPages: payload.totalPages,
          totalVisibleListings: payload.page * filters.limit,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load more spaces right now.";
      setLoadError(message);
      trackEvent({
        event: "search_infinite_page_failed",
        properties: {
          page: nextPage,
          error: message,
        },
      });
    } finally {
      setLoadingNextPage(false);
    }
  }, [currentPage, filters, hasMore, loadingNextPage]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadNextPage();
        }
      },
      { rootMargin: "360px 0px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadNextPage]);

  const mapListings = useMemo(() => toMapListings(listings), [listings]);

  return (
    <SearchLayout listings={mapListings} experimentVariant={searchVariant}>
      <SearchExperimentTracker variant={searchVariant} />
      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">No spaces match these filters</h3>
          <p className="mt-2 text-sm text-slate-600">
            Try broadening your dates, budget, or workspace requirements.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" asChild>
              <Link
                href="/search"
                onClick={() =>
                  trackEvent({
                    event: "search_no_results_cta_clicked",
                    properties: { cta: "clear_filters" },
                  })
                }
              >
                Clear all filters
              </Link>
            </Button>
            <Button className="bg-[var(--ww-terra)] text-[var(--ww-ink)] hover:brightness-95" asChild>
              <Link
                href={nearbyHref}
                onClick={() =>
                  trackEvent({
                    event: "search_no_results_cta_clicked",
                    properties: { cta: "try_nearby" },
                  })
                }
              >
                No Matches? Try Nearby
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                matchReasons={getMatchReasons(listing, filters)}
                variant={searchVariant}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-2">
            <p aria-live="polite" className="text-xs text-slate-500">
              Page {currentPage} of {resolvedTotalPages}
            </p>
            {hasMore ? (
              <Button
                className="bg-[var(--ww-ink)] text-white hover:bg-[var(--ww-celadon)]"
                onClick={() => void loadNextPage()}
                disabled={loadingNextPage}
              >
                {loadingNextPage ? "Loading more spaces..." : "Load more spaces"}
              </Button>
            ) : (
              <p className="text-sm text-slate-500">You&apos;ve reached the end of these results.</p>
            )}
            {loadError ? (
              <p role="alert" className="text-sm text-red-600">
                {loadError}
              </p>
            ) : null}
          </div>

          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
        </>
      )}
    </SearchLayout>
  );
}
