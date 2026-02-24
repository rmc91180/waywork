import Link from "next/link";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchLayout } from "@/components/search/search-layout";
import { ListingCard } from "@/components/listings/listing-card";
import { SearchExperimentTracker } from "@/components/search/search-experiment-tracker";
import {
  parseSearchFilterParams,
  serializeSearchFilterParams,
  withPage,
  type SearchFilterState,
} from "@/lib/search-filters";
import { searchListingsWithFacets } from "@/lib/search-query";
import { getSearchUiVariant } from "@/lib/experiments";

export const metadata = {
  title: "Find Spaces",
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const quickSearchLinks = [
  {
    label: "Deep Focus",
    href: "/search?workspaceTypes=PRIVATE_OFFICE,HOME_OFFICE&minWorkScore=75&verifiedInternet=true",
  },
  {
    label: "Team Sprint",
    href: "/search?workspaceTypes=MEETING_ROOM,HYBRID_SPACE&networkTypes=BOTH&guests=6",
  },
  {
    label: "Work + Pool",
    href: "/search?hasSwimmingPool=true&hasBackyard=true",
  },
  {
    label: "Under $150",
    href: "/search?maxPrice=150&sortBy=price_asc",
  },
];

function toMapListings(
  listings: Awaited<ReturnType<typeof searchListingsWithFacets>>["listings"]
) {
  return listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    lat: listing.lat,
    lng: listing.lng,
    pricePerDay: listing.pricePerDay,
    workScore: listing.workScore,
    slug: listing.slug,
    city: listing.city,
    workspaceType: listing.workspaceType,
    images: listing.images.map((img) => ({ url: img.url, alt: img.alt })),
  }));
}

function summaryTitle(filters: SearchFilterState, total: number) {
  if (filters.nearQuery) {
    return `${total} workspace${total === 1 ? "" : "s"} near ${filters.nearQuery}`;
  }
  if (filters.city) {
    return `${total} workspace${total === 1 ? "" : "s"} in ${filters.city}`;
  }
  if (filters.query) {
    return `${total} result${total === 1 ? "" : "s"} for "${filters.query}"`;
  }
  return `${total} work-ready spaces available`;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const searchVariant = getSearchUiVariant(cookieStore);
  const filters = parseSearchFilterParams(params);
  const { listings, total, facets, locationContext } = await searchListingsWithFacets(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const mapListings = toMapListings(listings);
  const filtersKey = serializeSearchFilterParams(filters).toString();

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-50" />

      <div className="relative mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-10">
        <section className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                Workspace Discovery
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                {searchVariant === "immersive"
                  ? "Explore workspaces built for deep work"
                  : "Find your best place to work"}
              </h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">
                {summaryTitle(filters, total)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickSearchLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
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
                  Leisure-ready
                </Badge>
              )}
            </div>
          </div>
        </section>

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
            <SearchLayout listings={mapListings} total={total} experimentVariant={searchVariant}>
              <SearchExperimentTracker variant={searchVariant} />
              {listings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">No spaces match these filters</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Try broadening your dates, budget, or workspace requirements.
                  </p>
                  <Link
                    href="/search"
                    className="mt-4 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    Clear all filters
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {listings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        variant={searchVariant}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const page = index + 1;
                        const href = `/search?${serializeSearchFilterParams(
                          withPage(filters, page)
                        ).toString()}`;
                        const active = filters.page === page;
                        return (
                          <Link
                            key={page}
                            href={href}
                            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm ${
                              active
                                ? "border-cyan-700 bg-cyan-700 text-white"
                                : "bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </SearchLayout>
          </div>
        </div>
      </div>
    </div>
  );
}
