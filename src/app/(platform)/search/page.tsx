import Link from "next/link";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { SearchFilters } from "@/components/search/search-filters";
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
import { BRAND } from "@/lib/brand";

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

const quickSearchLinks = [
  {
    label: "Deep Focus Mode",
    href: "/search?workspaceTypes=PRIVATE_OFFICE,HOME_OFFICE&minWorkScore=75&verifiedInternet=true",
  },
  {
    label: "Team Offsite",
    href: "/search?workspaceTypes=MEETING_ROOM,HYBRID_SPACE&networkTypes=BOTH&guests=6",
  },
  {
    label: "Work + Play",
    href: "/search?hasSwimmingPool=true&hasBackyard=true",
  },
  {
    label: "Under $150",
    href: "/search?maxPrice=150&sortBy=price_asc",
  },
];

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

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-[#f9d779]/35 via-[#ffffff] to-[#fca47c]/28" />

      <div className="relative mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-10">
        <section className="rounded-2xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ww-secondary-green)]">
                {BRAND.tagline}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ww-primary-blue)] md:text-4xl">
                {searchVariant === "immersive"
                  ? "Explore fun, high-speed workspaces worldwide"
                  : "Find your next workation or team hub"}
              </h1>
              <p className="mt-2 text-sm text-[var(--ww-text-primary)] md:text-base">
                {summaryTitle(filters, total)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickSearchLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[var(--ww-secondary-green)]/40 hover:text-[var(--ww-primary-blue)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.verifiedInternet && (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                  Verified Internet
                </Badge>
              )}
              {filters.workspaceTypes.length > 0 && (
                <Badge variant="secondary" className="bg-sky-50 text-sky-700">
                  {filters.workspaceTypes.length} workspace type
                  {filters.workspaceTypes.length > 1 ? "s" : ""}
                </Badge>
              )}
              {filters.amenities.length > 0 && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                  {filters.amenities.length} amenities
                </Badge>
              )}
              {locationContext && (
                <Badge variant="secondary" className="bg-violet-50 text-violet-700">
                  Near {locationContext.resolvedLabel} ({locationContext.radiusKm} km)
                </Badge>
              )}
              {(filters.hasJacuzzi || filters.hasSwimmingPool || filters.hasBackyard) && (
                <Badge variant="secondary" className="bg-rose-50 text-rose-700">
                  Work + Play Ready
                </Badge>
              )}
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                Secure Booking
              </Badge>
            </div>
          </div>
        </section>

        {searchLoadFailed ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Search is temporarily unavailable. You can still browse pages, and we&apos;re retrying
            listing data in the background.
          </div>
        ) : null}

        <div className="mt-6 lg:hidden">
          <SearchFilters key={`mobile-${filtersKey}`} mode="mobile" filters={filters} facets={facets} total={total} />
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-full max-w-sm shrink-0 lg:block">
            <div className="sticky top-24">
              <SearchFilters key={`desktop-${filtersKey}`} mode="desktop" filters={filters} facets={facets} total={total} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <SearchResultsClient
              key={`results-${filtersKey}`}
              initialListings={initialListings}
              total={total}
              totalPages={totalPages}
              initialPage={filters.page}
              filters={filters}
              nearbyHref={nearbyHref}
              searchVariant={searchVariant}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
