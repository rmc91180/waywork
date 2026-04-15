import type { ListingCardData } from "@/components/listings/listing-card";
import { LIMEHOME_MADRID_SAMPLES } from "@/lib/demo-seed";
import { computeWorkScore } from "@/lib/work-score";
import type { SearchFilterState } from "@/lib/search-filters";
import type { SearchFacets, SearchLocationContext } from "@/lib/search-query";

const DEMO_HOST = {
  name: "Limehome Madrid Samples",
  image: null,
};

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

function buildCard(sample: (typeof LIMEHOME_MADRID_SAMPLES)[number]): ListingCardData {
  const workScore = computeWorkScore({
    amenities: sample.amenities,
    connectivity: sample.connectivity,
  }).total;

  return {
    id: sample.slug,
    title: sample.title,
    slug: sample.slug,
    lat: sample.lat,
    lng: sample.lng,
    workspaceType: sample.workspaceType,
    city: sample.city,
    state: sample.state,
    country: sample.country,
    pricePerDay: sample.pricePerDay,
    cleaningFee: sample.cleaningFee,
    maxGuests: sample.maxGuests,
    bedroomCount: sample.bedroomCount,
    bedSize: sample.bedSize,
    propertySizeSqm: sample.propertySizeSqm,
    workScore,
    hasJacuzzi: false,
    hasSwimmingPool: false,
    hasBackyard: false,
    hasPingPongTable: false,
    hasPoolTable: false,
    averageRating: 4.8,
    reviewCount: 24,
    images: sample.images.map((image) => ({ url: image.url, alt: image.alt })),
    connectivityProfile: {
      declaredDownloadMbps: sample.connectivity.declaredDownloadMbps,
      networkType: sample.connectivity.networkType,
      verified: sample.connectivity.verified,
      hasBackupConnection: sample.connectivity.hasBackupConnection,
    },
    host: DEMO_HOST,
    _count: { reviews: 24 },
  };
}

function buildFacets(listings: ListingCardData[]): SearchFacets {
  const facets = createEmptyFacets();

  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;
  let minPropertySize = Number.POSITIVE_INFINITY;
  let maxPropertySize = 0;
  let minBedrooms = Number.POSITIVE_INFINITY;
  let maxBedrooms = 0;

  for (const listing of listings) {
    facets.workspaceTypes[listing.workspaceType] =
      (facets.workspaceTypes[listing.workspaceType] || 0) + 1;
    facets.networkTypes[listing.connectivityProfile?.networkType || "WIFI"] =
      (facets.networkTypes[listing.connectivityProfile?.networkType || "WIFI"] || 0) + 1;
    facets.bedSizes[listing.bedSize] = (facets.bedSizes[listing.bedSize] || 0) + 1;
    facets.cancellationPolicies.MODERATE =
      (facets.cancellationPolicies.MODERATE || 0) + 1;

    minPrice = Math.min(minPrice, listing.pricePerDay);
    maxPrice = Math.max(maxPrice, listing.pricePerDay);
    minPropertySize = Math.min(minPropertySize, listing.propertySizeSqm || Number.POSITIVE_INFINITY);
    maxPropertySize = Math.max(maxPropertySize, listing.propertySizeSqm || 0);
    minBedrooms = Math.min(minBedrooms, listing.bedroomCount);
    maxBedrooms = Math.max(maxBedrooms, listing.bedroomCount);

    if (listing.hasJacuzzi) facets.pleasure.jacuzzi += 1;
    if (listing.hasSwimmingPool) facets.pleasure.swimmingPool += 1;
    if (listing.hasBackyard) facets.pleasure.backyard += 1;
    if (listing.hasPingPongTable) facets.pleasure.pingPongTable += 1;
    if (listing.hasPoolTable) facets.pleasure.poolTable += 1;
  }

  facets.price = {
    min: Number.isFinite(minPrice) ? minPrice : 0,
    max: maxPrice,
  };
  facets.propertySize = {
    min: Number.isFinite(minPropertySize) ? minPropertySize : 0,
    max: maxPropertySize,
  };
  facets.bedrooms = {
    min: Number.isFinite(minBedrooms) ? minBedrooms : 0,
    max: maxBedrooms,
  };

  return facets;
}

function sortDemoListings(listings: ListingCardData[], sortBy: SearchFilterState["sortBy"]) {
  const sorted = [...listings];

  switch (sortBy) {
    case "price_asc":
      sorted.sort((a, b) => a.pricePerDay - b.pricePerDay);
      break;
    case "price_desc":
      sorted.sort((a, b) => b.pricePerDay - a.pricePerDay);
      break;
    case "work_score":
      sorted.sort((a, b) => b.workScore - a.workScore);
      break;
    case "rating_desc":
      sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      break;
    case "most_reviewed":
      sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;
    case "newest":
    case "fastest_internet":
    case "recommended":
    default:
      sorted.sort((a, b) => b.workScore - a.workScore || a.pricePerDay - b.pricePerDay);
      break;
  }

  return sorted;
}

export interface DemoSearchFallbackResult {
  listings: ListingCardData[];
  total: number;
  facets: SearchFacets;
  locationContext: SearchLocationContext | null;
}

export function getDemoSearchFallbackResult(
  filters: SearchFilterState
): DemoSearchFallbackResult {
  const cards = sortDemoListings(
    LIMEHOME_MADRID_SAMPLES.map(buildCard),
    filters.sortBy
  );
  const total = cards.length;
  const limit = Math.max(1, filters.limit || 18);
  const page = Math.max(1, filters.page || 1);
  const start = (page - 1) * limit;

  return {
    listings: cards.slice(start, start + limit),
    total,
    facets: buildFacets(cards),
    locationContext: null,
  };
}

function buildDetailListing(sample: (typeof LIMEHOME_MADRID_SAMPLES)[number]) {
  const workScore = computeWorkScore({
    amenities: sample.amenities,
    connectivity: sample.connectivity,
  }).total;

  return {
    id: sample.slug,
    slug: sample.slug,
    title: sample.title,
    description: sample.description,
    workspaceType: sample.workspaceType,
    address: sample.address,
    city: sample.city,
    state: sample.state,
    country: sample.country,
    postalCode: sample.postalCode,
    lat: sample.lat,
    lng: sample.lng,
    maxGuests: sample.maxGuests,
    bedroomCount: sample.bedroomCount,
    bedSize: sample.bedSize,
    propertySizeSqm: sample.propertySizeSqm,
    pricePerDay: sample.pricePerDay,
    cleaningFee: sample.cleaningFee,
    currency: sample.currency,
    cancellationPolicy: sample.cancellationPolicy,
    workScore,
    hasJacuzzi: false,
    hasSwimmingPool: false,
    hasBackyard: false,
    hasPingPongTable: false,
    hasPoolTable: false,
    pmsExternalPropertyId: sample.pmsExternalPropertyId,
    pmsExternalListingId: sample.pmsExternalListingId,
    pmsExternalUnitGroupId: sample.pmsExternalUnitGroupId,
    pmsExternalRatePlanId: sample.pmsExternalRatePlanId,
    pmsConnectionId: "demo-apaleo-connection",
    status: "ACTIVE",
    host: {
      id: "limehome-madrid-samples",
      name: DEMO_HOST.name,
      image: null,
      bio: "Pilot sample host profile for Limehome Madrid inventory.",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    images: sample.images.map((image, index) => ({
      id: `${sample.slug}-image-${index}`,
      url: image.url,
      alt: image.alt,
      order: index,
      isPrimary: index === 0,
    })),
    amenities: sample.amenities.map((amenity, index) => ({
      id: `${sample.slug}-amenity-${index}`,
      category: amenity.category,
      name: amenity.name,
      quantity: amenity.quantity,
    })),
    connectivityProfile: {
      listingId: sample.slug,
      declaredDownloadMbps: sample.connectivity.declaredDownloadMbps,
      declaredUploadMbps: sample.connectivity.declaredUploadMbps,
      networkType: sample.connectivity.networkType,
      hasBackupConnection: sample.connectivity.hasBackupConnection,
      backupType: sample.connectivity.backupType ?? null,
      verified: sample.connectivity.verified,
    },
    activities: sample.activities.map((activity, index) => ({
      id: `${sample.slug}-activity-${index}`,
      title: activity.title,
      category: activity.category,
      description: activity.description,
      durationMinutes: activity.durationMinutes,
      distanceKm: activity.distanceKm,
      indoor: activity.indoor,
    })),
    reviews: [],
    _count: { reviews: 0, bookings: 0 },
  };
}

function buildRelatedCard(sample: (typeof LIMEHOME_MADRID_SAMPLES)[number]) {
  const card = buildCard(sample);
  return {
    id: card.id,
    title: card.title,
    city: card.city,
    state: card.state,
    maxGuests: card.maxGuests,
    pricePerDay: card.pricePerDay,
    workScore: card.workScore,
    workspaceType: card.workspaceType,
    images: card.images,
  };
}

export function getDemoSpaceFallbackData(id: string) {
  const sample = LIMEHOME_MADRID_SAMPLES.find((entry) => entry.slug === id);
  if (!sample) return null;

  const listing = buildDetailListing(sample);
  const relatedListings = LIMEHOME_MADRID_SAMPLES.filter((entry) => entry.slug !== sample.slug)
    .slice(0, 4)
    .map(buildRelatedCard);

  return {
    listing,
    relatedListings,
    sameBuildingListings: [] as ReturnType<typeof buildRelatedCard>[],
    portfolioTeamStayListings: relatedListings.slice(0, 3),
  };
}
