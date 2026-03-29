import type { Prisma } from "@/generated/prisma";
import { db, withDbRetry } from "@/lib/db";
import type { SearchFilterState, SearchSortBy } from "@/lib/search-filters";
import {
  getBoundingBox,
  haversineKm,
  resolveSearchLocation,
  type ResolvedSearchLocation,
} from "@/lib/location-search";

export type SearchListing = Prisma.ListingGetPayload<{
  include: {
    images: { where: { isPrimary: true }; take: 1 };
    connectivityProfile: {
      select: {
        declaredDownloadMbps: true;
        networkType: true;
        verified: true;
        hasBackupConnection: true;
      };
    };
    host: { select: { name: true; image: true } };
    _count: { select: { reviews: true } };
  };
}>;

export interface SearchFacets {
  workspaceTypes: Record<string, number>;
  cancellationPolicies: Record<string, number>;
  networkTypes: Record<string, number>;
  bedSizes: Record<string, number>;
  amenities: Array<{ name: string; count: number }>;
  price: { min: number; max: number };
  propertySize: { min: number; max: number };
  bedrooms: { min: number; max: number };
  pleasure: {
    jacuzzi: number;
    swimmingPool: number;
    backyard: number;
    pingPongTable: number;
    poolTable: number;
  };
}

export interface SearchLocationContext {
  query: string;
  resolvedLabel: string;
  source: ResolvedSearchLocation["source"];
  radiusKm: number;
}

export interface SearchQueryResult {
  listings: SearchListing[];
  total: number;
  facets: SearchFacets;
  locationContext: SearchLocationContext | null;
}

const listingInclude = {
  images: { where: { isPrimary: true }, take: 1 },
  connectivityProfile: {
    select: {
      declaredDownloadMbps: true,
      networkType: true,
      verified: true,
      hasBackupConnection: true,
    },
  },
  host: { select: { name: true, image: true } },
  _count: { select: { reviews: true } },
} satisfies Prisma.ListingInclude;

function emptyFacets(): SearchFacets {
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

function toNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toUtcDate(value: string) {
  if (!value) return undefined;
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isDate) return undefined;
  return new Date(`${value}T00:00:00.000Z`);
}

function clampRadius(value?: number) {
  if (!value || value <= 0) return 25;
  return Math.min(500, Math.max(1, Math.round(value)));
}

function reviewVolume(listing: {
  reviewCount: number;
  _count: { reviews: number };
}) {
  return Math.max(listing.reviewCount || 0, listing._count.reviews || 0);
}

function resolveLocationFromListing(query: string, client = db) {
  return client.listing.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { address: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: [{ reviewCount: "desc" }, { workScore: "desc" }],
    select: { title: true, city: true, lat: true, lng: true },
  });
}

function getRecommendedScore(
  listing: SearchListing,
  filters: SearchFilterState,
  priceMin: number,
  priceMax: number,
  location: ResolvedSearchLocation | null
) {
  let score = 0;

  score += listing.workScore * 0.65;
  score += (listing.averageRating ?? 4.2) * 10;
  score += Math.log1p(reviewVolume(listing)) * 5.5;

  const speed = listing.connectivityProfile?.declaredDownloadMbps || 0;
  score += Math.min(speed, 1000) / 32;

  if (listing.connectivityProfile?.verified) score += 4.5;
  if (listing.connectivityProfile?.hasBackupConnection) score += 2.5;

  if (listing.hasJacuzzi) score += 1;
  if (listing.hasSwimmingPool) score += 1.4;
  if (listing.hasBackyard) score += 1;
  if (listing.hasPingPongTable) score += 0.9;
  if (listing.hasPoolTable) score += 0.9;

  if (filters.hasJacuzzi && listing.hasJacuzzi) score += 9;
  if (filters.hasSwimmingPool && listing.hasSwimmingPool) score += 10;
  if (filters.hasBackyard && listing.hasBackyard) score += 6;
  if (filters.hasPingPongTable && listing.hasPingPongTable) score += 5;
  if (filters.hasPoolTable && listing.hasPoolTable) score += 5;

  if (filters.verifiedInternet && listing.connectivityProfile?.verified) score += 8;
  if (filters.backupInternet && listing.connectivityProfile?.hasBackupConnection) score += 6;

  const minBedrooms = toInt(filters.minBedrooms);
  if (minBedrooms && listing.bedroomCount >= minBedrooms) score += 4;

  const minPropertySizeSqm = toInt(filters.minPropertySizeSqm);
  if (
    minPropertySizeSqm &&
    listing.propertySizeSqm &&
    listing.propertySizeSqm >= minPropertySizeSqm
  ) {
    score += 4;
  }

  if (priceMax > priceMin) {
    const normalizedPrice =
      (priceMax - listing.pricePerDay) / Math.max(1, priceMax - priceMin);
    score += normalizedPrice * 8;
  }

  if (location) {
    const distance = haversineKm(location.lat, location.lng, listing.lat, listing.lng);
    score += Math.max(-16, 18 - distance * 0.9);
  }

  return score;
}

function buildWhere(
  filters: SearchFilterState,
  proximityBounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }
): Prisma.ListingWhereInput {
  const andConditions: Prisma.ListingWhereInput[] = [{ status: "ACTIVE" }];

  if (filters.query) {
    andConditions.push({
      OR: [
        { title: { contains: filters.query, mode: "insensitive" } },
        { description: { contains: filters.query, mode: "insensitive" } },
        { city: { contains: filters.query, mode: "insensitive" } },
        { state: { contains: filters.query, mode: "insensitive" } },
        { country: { contains: filters.query, mode: "insensitive" } },
        { address: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  if (filters.city) {
    andConditions.push({
      city: { contains: filters.city, mode: "insensitive" },
    });
  }

  if (proximityBounds) {
    andConditions.push({
      lat: { gte: proximityBounds.minLat, lte: proximityBounds.maxLat },
    });
    andConditions.push({
      lng: { gte: proximityBounds.minLng, lte: proximityBounds.maxLng },
    });
  }

  const guests = toInt(filters.guests);
  if (guests && guests > 0) {
    andConditions.push({ maxGuests: { gte: guests } });
  }

  const minBedrooms = toInt(filters.minBedrooms);
  if (minBedrooms && minBedrooms > 0) {
    andConditions.push({ bedroomCount: { gte: minBedrooms } });
  }

  const minPropertySizeSqm = toInt(filters.minPropertySizeSqm);
  if (minPropertySizeSqm && minPropertySizeSqm > 0) {
    andConditions.push({ propertySizeSqm: { gte: minPropertySizeSqm } });
  }

  if (filters.bedSizes.length > 0) {
    andConditions.push({
      bedSize: {
        in: filters.bedSizes as Prisma.EnumBedSizeFilter["in"],
      },
    });
  }

  if (filters.minWorkScore > 0) {
    andConditions.push({ workScore: { gte: filters.minWorkScore } });
  }

  const minSpeed = toNumber(filters.minSpeed);
  if (minSpeed && minSpeed > 0) {
    andConditions.push({
      connectivityProfile: {
        is: {
          declaredDownloadMbps: { gte: minSpeed },
        },
      },
    });
  }

  const minPrice = toInt(filters.minPrice);
  const maxPrice = toInt(filters.maxPrice);
  if (minPrice || maxPrice) {
    andConditions.push({
      pricePerDay: {
        ...(minPrice ? { gte: minPrice * 100 } : {}),
        ...(maxPrice ? { lte: maxPrice * 100 } : {}),
      },
    });
  }

  const reviewMin = toNumber(filters.reviewMin);
  if (reviewMin && reviewMin > 0) {
    andConditions.push({ averageRating: { gte: reviewMin } });
  }

  if (filters.noCleaningFee) {
    andConditions.push({ cleaningFee: 0 });
  }

  if (filters.workspaceTypes.length > 0) {
    andConditions.push({
      workspaceType: {
        in: filters.workspaceTypes as Prisma.EnumWorkspaceTypeFilter["in"],
      },
    });
  }

  if (filters.cancellationPolicies.length > 0) {
    andConditions.push({
      cancellationPolicy: {
        in: filters.cancellationPolicies as Prisma.EnumCancellationPolicyFilter["in"],
      },
    });
  }

  if (filters.hasJacuzzi) andConditions.push({ hasJacuzzi: true });
  if (filters.hasSwimmingPool) andConditions.push({ hasSwimmingPool: true });
  if (filters.hasBackyard) andConditions.push({ hasBackyard: true });
  if (filters.hasPingPongTable) andConditions.push({ hasPingPongTable: true });
  if (filters.hasPoolTable) andConditions.push({ hasPoolTable: true });

  if (filters.networkTypes.length > 0 || filters.verifiedInternet || filters.backupInternet) {
    andConditions.push({
      connectivityProfile: {
        is: {
          ...(filters.networkTypes.length > 0
            ? {
                networkType: {
                  in: filters.networkTypes as Prisma.EnumNetworkTypeFilter["in"],
                },
              }
            : {}),
          ...(filters.verifiedInternet ? { verified: true } : {}),
          ...(filters.backupInternet ? { hasBackupConnection: true } : {}),
        },
      },
    });
  }

  if (filters.amenities.length > 0) {
    andConditions.push(
      ...filters.amenities.map((amenity) => ({
        amenities: {
          some: {
            name: amenity,
          },
        },
      }))
    );
  }

  const checkIn = toUtcDate(filters.checkIn);
  const checkOut = toUtcDate(filters.checkOut);
  if (checkIn && checkOut && checkOut > checkIn) {
    andConditions.push({
      blockedDates: {
        none: {
          date: {
            gte: checkIn,
            lt: checkOut,
          },
        },
      },
    });
  }

  return { AND: andConditions };
}

function buildOrderBy(sortBy: SearchSortBy): Prisma.ListingOrderByWithRelationInput[] {
  switch (sortBy) {
    case "work_score":
      return [{ workScore: "desc" }, { averageRating: "desc" }, { createdAt: "desc" }];
    case "price_asc":
      return [{ pricePerDay: "asc" }, { workScore: "desc" }];
    case "price_desc":
      return [{ pricePerDay: "desc" }, { workScore: "desc" }];
    case "rating_desc":
      return [{ averageRating: "desc" }, { reviewCount: "desc" }, { workScore: "desc" }];
    case "most_reviewed":
      return [{ reviewCount: "desc" }, { averageRating: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "fastest_internet":
      return [{ connectivityProfile: { declaredDownloadMbps: "desc" } }, { workScore: "desc" }];
    case "recommended":
    default:
      return [{ workScore: "desc" }, { averageRating: "desc" }, { reviewCount: "desc" }];
  }
}

function buildFacets(
  listings: Array<{
    workspaceType: string;
    cancellationPolicy: string;
    bedSize: string;
    bedroomCount: number;
    propertySizeSqm: number | null;
    hasJacuzzi: boolean;
    hasSwimmingPool: boolean;
    hasBackyard: boolean;
    hasPingPongTable: boolean;
    hasPoolTable: boolean;
    pricePerDay: number;
    amenities: Array<{ name: string }>;
    connectivityProfile: { networkType: string } | null;
  }>
): SearchFacets {
  const workspaceTypes: Record<string, number> = {};
  const cancellationPolicies: Record<string, number> = {};
  const networkTypes: Record<string, number> = {};
  const bedSizes: Record<string, number> = {};
  const amenityMap = new Map<string, number>();

  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;

  let minPropertySize = Number.POSITIVE_INFINITY;
  let maxPropertySize = 0;

  let minBedrooms = Number.POSITIVE_INFINITY;
  let maxBedrooms = 0;

  const pleasure = {
    jacuzzi: 0,
    swimmingPool: 0,
    backyard: 0,
    pingPongTable: 0,
    poolTable: 0,
  };

  for (const listing of listings) {
    workspaceTypes[listing.workspaceType] = (workspaceTypes[listing.workspaceType] || 0) + 1;
    cancellationPolicies[listing.cancellationPolicy] =
      (cancellationPolicies[listing.cancellationPolicy] || 0) + 1;
    bedSizes[listing.bedSize] = (bedSizes[listing.bedSize] || 0) + 1;

    minPrice = Math.min(minPrice, listing.pricePerDay);
    maxPrice = Math.max(maxPrice, listing.pricePerDay);

    minBedrooms = Math.min(minBedrooms, listing.bedroomCount);
    maxBedrooms = Math.max(maxBedrooms, listing.bedroomCount);

    if (listing.propertySizeSqm && listing.propertySizeSqm > 0) {
      minPropertySize = Math.min(minPropertySize, listing.propertySizeSqm);
      maxPropertySize = Math.max(maxPropertySize, listing.propertySizeSqm);
    }

    if (listing.hasJacuzzi) pleasure.jacuzzi += 1;
    if (listing.hasSwimmingPool) pleasure.swimmingPool += 1;
    if (listing.hasBackyard) pleasure.backyard += 1;
    if (listing.hasPingPongTable) pleasure.pingPongTable += 1;
    if (listing.hasPoolTable) pleasure.poolTable += 1;

    if (listing.connectivityProfile?.networkType) {
      networkTypes[listing.connectivityProfile.networkType] =
        (networkTypes[listing.connectivityProfile.networkType] || 0) + 1;
    }

    for (const amenity of listing.amenities) {
      amenityMap.set(amenity.name, (amenityMap.get(amenity.name) || 0) + 1);
    }
  }

  const amenities = Array.from(amenityMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));

  return {
    workspaceTypes,
    cancellationPolicies,
    networkTypes,
    bedSizes,
    amenities,
    price: {
      min: Number.isFinite(minPrice) ? minPrice : 0,
      max: maxPrice,
    },
    propertySize: {
      min: Number.isFinite(minPropertySize) ? minPropertySize : 0,
      max: maxPropertySize,
    },
    bedrooms: {
      min: Number.isFinite(minBedrooms) ? minBedrooms : 0,
      max: maxBedrooms,
    },
    pleasure,
  };
}

export async function searchListingsWithFacets(
  filters: SearchFilterState
): Promise<SearchQueryResult> {
  return withDbRetry(async (client) => {
    const radiusValue = toInt(filters.radiusKm);
    const radiusKm = clampRadius(radiusValue);

    const resolvedLocation = filters.nearQuery.trim()
      ? (await (async () => {
          const fromListing = await resolveLocationFromListing(filters.nearQuery, client);
          if (fromListing) {
            return {
              query: filters.nearQuery,
              label: `${fromListing.title}, ${fromListing.city}`,
              lat: fromListing.lat,
              lng: fromListing.lng,
              source: "listing" as const,
            };
          }
          return resolveSearchLocation(filters.nearQuery);
        })())
      : null;

    const bounds = resolvedLocation
      ? getBoundingBox(resolvedLocation.lat, resolvedLocation.lng, radiusKm)
      : undefined;

    const baseWhere = buildWhere(filters, bounds);
    let where = baseWhere;

    if (resolvedLocation) {
      const radiusCandidates = await client.listing.findMany({
        where: baseWhere,
        select: {
          id: true,
          lat: true,
          lng: true,
        },
      });

      const nearbyIds = radiusCandidates
        .filter(
          (item) =>
            haversineKm(resolvedLocation.lat, resolvedLocation.lng, item.lat, item.lng) <= radiusKm
        )
        .map((item) => item.id);

      if (nearbyIds.length === 0) {
        return {
          listings: [],
          total: 0,
          facets: emptyFacets(),
          locationContext: {
            query: filters.nearQuery,
            resolvedLabel: resolvedLocation.label,
            source: resolvedLocation.source,
            radiusKm,
          },
        };
      }

      where = {
        AND: [baseWhere, { id: { in: nearbyIds } }],
      };
    }

    const skip = (filters.page - 1) * filters.limit;
    const take = filters.limit;

    // Keep search reads sequential. This is slightly slower than Promise.all on a full
    // Postgres instance, but it is materially more reliable for local single-connection
    // development runtimes and prevents intermittent "server closed the connection" errors.
    const total = await client.listing.count({ where });
    const facetListings = await client.listing.findMany({
      where,
      select: {
        workspaceType: true,
        cancellationPolicy: true,
        bedSize: true,
        bedroomCount: true,
        propertySizeSqm: true,
        hasJacuzzi: true,
        hasSwimmingPool: true,
        hasBackyard: true,
        hasPingPongTable: true,
        hasPoolTable: true,
        pricePerDay: true,
        amenities: { select: { name: true } },
        connectivityProfile: { select: { networkType: true } },
      },
    });
    const recommendedCandidates =
      filters.sortBy === "recommended"
        ? await client.listing.findMany({
            where,
            include: listingInclude,
          })
        : ([] as SearchListing[]);
    const orderedListings =
      filters.sortBy === "recommended"
        ? ([] as SearchListing[])
        : await client.listing.findMany({
            where,
            include: listingInclude,
            orderBy: buildOrderBy(filters.sortBy),
            skip,
            take,
          });

    const listings =
      filters.sortBy === "recommended"
        ? recommendedCandidates
            .map((listing) => ({
              listing,
              score: getRecommendedScore(
                listing,
                filters,
                facetListings.length > 0
                  ? Math.min(...facetListings.map((item) => item.pricePerDay))
                  : 0,
                facetListings.length > 0
                  ? Math.max(...facetListings.map((item) => item.pricePerDay))
                  : 0,
                resolvedLocation
              ),
            }))
            .sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              if ((b.listing.averageRating || 0) !== (a.listing.averageRating || 0)) {
                return (b.listing.averageRating || 0) - (a.listing.averageRating || 0);
              }
              return reviewVolume(b.listing) - reviewVolume(a.listing);
            })
            .slice(skip, skip + take)
            .map((item) => item.listing)
        : orderedListings;

    return {
      listings,
      total,
      facets: buildFacets(facetListings),
      locationContext: resolvedLocation
        ? {
            query: filters.nearQuery,
            resolvedLabel: resolvedLocation.label,
            source: resolvedLocation.source,
            radiusKm,
          }
        : null,
    };
  });
}
