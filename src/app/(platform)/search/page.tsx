import Link from "next/link";
import { cookies } from "next/headers";
import { SearchTopBar } from "@/components/search/search-top-bar";
import { SearchResultsClient } from "@/components/search/search-results-client";
import type { ListingCardData } from "@/components/listings/listing-card";
import {
  DEFAULT_SEARCH_FILTERS,
  parseSearchFilterParams,
  serializeSearchFilterParams,
  type SearchFilterState,
} from "@/lib/search-filters";
import { searchListingsWithFacets, type SearchFacets } from "@/lib/search-query";
import { getSearchUiVariant } from "@/lib/experiments";
import { WORKSPACE_TYPES } from "@/lib/constants";

export const metadata = {
  title: "Search Workspaces",
  description: "Discover fun, high-speed residential workspaces for workations and team offsites.",
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function createEmptyFacets(): SearchFacets {
  return {
    workspaceTypes: {},
    cancellationPolicies: {},
    networkTypes: {},
    bedSizes: {},
    amenities: [],
    price: { min: 0, max: 0 },
    propertySize: { min: 0, max: 0 },
    bedrooms: { min: 0, max: 0 },
    pleasure: {
      jacuzzi: 0,
      swimmingPool: 0,
      backyard: 0,
      pingPongTable: 0,
      poolTable: 0,
    },
  };
}

function toListingCardData(
  listings: Awaited<ReturnType<typeof searchListingsWithFacets>>["listings"]
) : ListingCardData[] {
  return listings.map((listing): ListingCardData => ({
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    lat: listing.lat,
    lng: listing.lng,
    workspaceType: listing.workspaceType,
    city: listing.city,
    state: listing.state,
    country: listing.country,
    pricePerDay: listing.pricePerDay,
    cleaningFee: listing.cleaningFee,
    maxGuests: listing.maxGuests,
    bedroomCount: listing.bedroomCount,
    bedSize: listing.bedSize,
    propertySizeSqm: listing.propertySizeSqm,
    workScore: listing.workScore,
    hasJacuzzi: listing.hasJacuzzi,
    hasSwimmingPool: listing.hasSwimmingPool,
    hasBackyard: listing.hasBackyard,
    hasPingPongTable: listing.hasPingPongTable,
    hasPoolTable: listing.hasPoolTable,
    averageRating: listing.averageRating,
    reviewCount: listing.reviewCount,
    images: listing.images.map((img) => ({ url: img.url, alt: img.alt })),
    connectivityProfile: listing.connectivityProfile
      ? {
          declaredDownloadMbps: listing.connectivityProfile.declaredDownloadMbps,
          networkType: listing.connectivityProfile.networkType,
          verified: listing.connectivityProfile.verified,
          hasBackupConnection: listing.connectivityProfile.hasBackupConnection,
        }
      : null,
    host: listing.host,
    _count: listing._count,
  }));
}

function summaryTitle(filters: SearchFilterState, total: number) {
  if (filters.nearQuery) {
    return `${total} space${total === 1 ? "" : "s"} near ${filters.nearQuery}`;
  }
  if (filters.city) {
    return `${total} space${total === 1 ? "" : "s"} in ${filters.city}`;
  }
  if (filters.query) {
    return `${total} result${total === 1 ? "" : "s"} for "${filters.query}"`;
  }
  return `${total} work-ready spaces available worldwide`;
}

function nearbySuggestionHref(filters: SearchFilterState) {
  if (filters.nearQuery) {
    const currentRadius = Number.parseInt(filters.radiusKm, 10);
    const radiusKm = Number.isFinite(currentRadius) ? Math.min(currentRadius * 2, 100) : 50;
    const params = serializeSearchFilterParams({
      ...filters,
      radiusKm: String(radiusKm),
      page: 1,
    });
    return `/search?${params.toString()}`;
  }

  const params = serializeSearchFilterParams({
    ...DEFAULT_SEARCH_FILTERS,
    query: filters.query || filters.city,
  });
  return `/search?${params.toString()}`;
}

function buildQuickRefinementLinks(filters: SearchFilterState, facets: SearchFacets) {
  const links: Array<{ label: string; href: string }> = [];
  const seen = new Set<string>();

  const pushLink = (label: string, nextFilters: SearchFilterState) => {
    if (seen.has(label)) return;
    seen.add(label);
    links.push({
      label,
      href: `/search?${serializeSearchFilterParams({ ...nextFilters, page: 1 }).toString()}`,
    });
  };

  if (!filters.verifiedInternet) {
    pushLink("Verified internet", {
      ...filters,
      verifiedInternet: true,
    });
  }

  if (!filters.minWorkScore || filters.minWorkScore < 75) {
    pushLink("Top work score", {
      ...filters,
      minWorkScore: 75,
    });
  }

  if (!filters.maxPrice && facets.price.max >= 15_000) {
    pushLink("Under $150", {
      ...filters,
      maxPrice: "150",
      sortBy: "price_asc",
    });
  }

  if (!filters.guests || Number(filters.guests) < 4) {
    pushLink("Team stays", {
      ...filters,
      guests: "4",
      workspaceTypes:
        facets.workspaceTypes.HYBRID_SPACE || facets.workspaceTypes.MEETING_ROOM
          ? ["HYBRID_SPACE", "MEETING_ROOM"]
          : filters.workspaceTypes,
    });
  }

  if (filters.workspaceTypes.length === 0) {
    Object.entries(facets.workspaceTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .forEach(([workspaceType]) => {
        const label = WORKSPACE_TYPES[workspaceType as keyof typeof WORKSPACE_TYPES]?.label;
        if (!label) return;
        pushLink(label, {
          ...filters,
          workspaceTypes: [workspaceType],
        });
      });
  }

  return links.slice(0, 4);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const searchVariant = getSearchUiVariant(cookieStore);
  const filters = parseSearchFilterParams(params);
  let listings = [] as Awaited<ReturnType<typeof searchListingsWithFacets>>["listings"];
  let total = 0;
  let facets = createEmptyFacets();
  let locationContext: Awaited<
    ReturnType<typeof searchListingsWithFacets>
  >["locationContext"] = null;
  let searchLoadFailed = false;

  try {
    const result = await searchListingsWithFacets(filters);
    listings = result.listings;
    total = result.total;
    facets = result.facets;
    locationContext = result.locationContext;
  } catch (error) {
    searchLoadFailed = true;
    console.error("[search/page] failed to load search listings", error);
  }

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const initialListings = toListingCardData(listings);
  const filtersKey = serializeSearchFilterParams(filters).toString();
  const nearbyHref = nearbySuggestionHref(filters);
  const summary = summaryTitle(filters, total);
  const locationBadgeLabel = locationContext
    ? `Near ${locationContext.resolvedLabel} (${locationContext.radiusKm} km)`
    : null;
  const quickRefinementLinks = buildQuickRefinementLinks(filters, facets);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-br from-[#f9d779]/35 via-[#ffffff] to-[#fca47c]/28" />

      <div className="relative mx-auto max-w-[1320px] px-4 py-6 md:px-6 md:py-8">
        <SearchTopBar
          filters={filters}
          facets={facets}
          total={total}
          summary={summary}
          locationBadgeLabel={locationBadgeLabel}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {quickRefinementLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[var(--ww-secondary-green)]/40 hover:text-[var(--ww-primary-blue)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {searchLoadFailed ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Search is temporarily unavailable. You can still browse pages, and we&apos;re retrying
            listing data in the background.
          </div>
        ) : null}

        <div className="mt-6 min-w-0">
          <SearchResultsClient
            key={`results-${filtersKey}`}
            initialListings={initialListings}
            totalPages={totalPages}
            initialPage={filters.page}
            filters={filters}
            nearbyHref={nearbyHref}
            searchVariant={searchVariant}
          />
        </div>
      </div>
    </div>
  );
}
