import { db } from "@/lib/db";
import { SearchFilters } from "@/components/search/search-filters";
import { ListingCard } from "@/components/listings/listing-card";
import type { Prisma } from "@/generated/prisma";

export const metadata = {
  title: "Find Spaces",
};

interface SearchPageProps {
  searchParams: Promise<{
    query?: string;
    city?: string;
    guests?: string;
    minWorkScore?: string;
    minSpeed?: string;
    minPrice?: string;
    maxPrice?: string;
    workspaceTypes?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  // Build where clause
  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
  };

  if (params.query) {
    where.OR = [
      { title: { contains: params.query, mode: "insensitive" } },
      { description: { contains: params.query, mode: "insensitive" } },
      { city: { contains: params.query, mode: "insensitive" } },
    ];
  }

  if (params.city) {
    where.city = { contains: params.city, mode: "insensitive" };
  }

  if (params.guests) {
    where.maxGuests = { gte: parseInt(params.guests) };
  }

  if (params.minWorkScore) {
    where.workScore = { gte: parseInt(params.minWorkScore) };
  }

  if (params.minSpeed) {
    where.connectivityProfile = {
      declaredDownloadMbps: { gte: parseFloat(params.minSpeed) },
    };
  }

  if (params.minPrice || params.maxPrice) {
    where.pricePerDay = {};
    if (params.minPrice) where.pricePerDay.gte = parseInt(params.minPrice);
    if (params.maxPrice) where.pricePerDay.lte = parseInt(params.maxPrice);
  }

  if (params.workspaceTypes) {
    where.workspaceType = {
      in: params.workspaceTypes.split(",") as Prisma.EnumWorkspaceTypeFilter["in"],
    };
  }

  const sortBy = params.sortBy || "workScore";
  const orderByMap: Record<string, Prisma.ListingOrderByWithRelationInput> = {
    workScore: { workScore: "desc" },
    price_asc: { pricePerDay: "asc" },
    price_desc: { pricePerDay: "desc" },
    newest: { createdAt: "desc" },
  };

  const page = parseInt(params.page || "1");
  const limit = 20;

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        connectivityProfile: {
          select: {
            declaredDownloadMbps: true,
            networkType: true,
            verified: true,
          },
        },
        host: { select: { name: true, image: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: orderByMap[sortBy] || orderByMap.workScore,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.listing.count({ where }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Find Work-Ready Spaces</h1>
        <p className="text-gray-600 mt-1">
          {total} space{total !== 1 ? "s" : ""} available
          {params.city ? ` in ${params.city}` : ""}
          {params.query ? ` matching "${params.query}"` : ""}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <SearchFilters />
        </div>

        {/* Results */}
        <div className="flex-1">
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">No spaces found</h3>
              <p className="text-gray-500 mt-2">
                Try adjusting your filters or search in a different area.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: Math.ceil(total / limit) }, (_, i) => (
                <a
                  key={i}
                  href={`?${new URLSearchParams({
                    ...params,
                    page: String(i + 1),
                  }).toString()}`}
                  className={`px-3 py-1 rounded text-sm ${
                    page === i + 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
