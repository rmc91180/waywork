export const SEARCH_SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "work_score", label: "Work Score (High to Low)" },
  { value: "price_asc", label: "Price (Low to High)" },
  { value: "price_desc", label: "Price (High to Low)" },
  { value: "rating_desc", label: "Rating (High to Low)" },
  { value: "most_reviewed", label: "Most Reviewed" },
  { value: "newest", label: "Newest" },
  { value: "fastest_internet", label: "Fastest Internet" },
] as const;

export type SearchSortBy = (typeof SEARCH_SORT_OPTIONS)[number]["value"];

export const DEFAULT_SEARCH_FILTERS = {
  query: "",
  city: "",
  nearQuery: "",
  radiusKm: "25",
  checkIn: "",
  checkOut: "",
  guests: "",
  minBedrooms: "",
  minPropertySizeSqm: "",
  bedSizes: [] as string[],
  minWorkScore: 0,
  minSpeed: "",
  minPrice: "",
  maxPrice: "",
  reviewMin: "",
  workspaceTypes: [] as string[],
  networkTypes: [] as string[],
  cancellationPolicies: [] as string[],
  amenities: [] as string[],
  verifiedInternet: false,
  backupInternet: false,
  noCleaningFee: false,
  hasJacuzzi: false,
  hasSwimmingPool: false,
  hasBackyard: false,
  hasPingPongTable: false,
  hasPoolTable: false,
  sortBy: "recommended" as SearchSortBy,
  page: 1,
  limit: 18,
};

export type SearchFilterState = typeof DEFAULT_SEARCH_FILTERS;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value?: string | string[]) {
  if (!value) return "";
  return Array.isArray(value) ? value[0] || "" : value;
}

function parseIntSafe(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(
  value: string | string[] | undefined,
  allowed?: ReadonlySet<string>
) {
  if (!value) return [] as string[];
  const source = Array.isArray(value) ? value : value.split(",");
  const normalized = source
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
  const deduped = Array.from(new Set(normalized));
  if (!allowed) return deduped;
  return deduped.filter((item) => allowed.has(item));
}

function parseBool(value: string | string[] | undefined) {
  const current = firstValue(value).toLowerCase();
  return current === "true" || current === "1" || current === "yes";
}

const SORT_OPTIONS = new Set<SearchSortBy>(
  SEARCH_SORT_OPTIONS.map((option) => option.value)
);

export function parseSearchFilterParams(
  params: RawSearchParams
): SearchFilterState {
  const parsedSort = firstValue(params.sortBy) as SearchSortBy;

  return {
    query: firstValue(params.query),
    city: firstValue(params.city),
    nearQuery: firstValue(params.nearQuery),
    radiusKm: firstValue(params.radiusKm) || "25",
    checkIn: firstValue(params.checkIn),
    checkOut: firstValue(params.checkOut),
    guests: firstValue(params.guests),
    minBedrooms: firstValue(params.minBedrooms),
    minPropertySizeSqm: firstValue(params.minPropertySizeSqm),
    bedSizes: parseList(params.bedSizes, new Set(["TWIN", "DOUBLE", "QUEEN", "KING"])),
    minWorkScore: Math.max(0, Math.min(100, parseIntSafe(firstValue(params.minWorkScore), 0))),
    minSpeed: firstValue(params.minSpeed),
    minPrice: firstValue(params.minPrice),
    maxPrice: firstValue(params.maxPrice),
    reviewMin: firstValue(params.reviewMin),
    workspaceTypes: parseList(params.workspaceTypes),
    networkTypes: parseList(params.networkTypes, new Set(["WIFI", "WIRED", "BOTH"])),
    cancellationPolicies: parseList(
      params.cancellationPolicies,
      new Set(["FLEXIBLE", "MODERATE", "STRICT"])
    ),
    amenities: parseList(params.amenities),
    verifiedInternet: parseBool(params.verifiedInternet),
    backupInternet: parseBool(params.backupInternet),
    noCleaningFee: parseBool(params.noCleaningFee),
    hasJacuzzi: parseBool(params.hasJacuzzi),
    hasSwimmingPool: parseBool(params.hasSwimmingPool),
    hasBackyard: parseBool(params.hasBackyard),
    hasPingPongTable: parseBool(params.hasPingPongTable),
    hasPoolTable: parseBool(params.hasPoolTable),
    sortBy: SORT_OPTIONS.has(parsedSort) ? parsedSort : "recommended",
    page: Math.max(1, parseIntSafe(firstValue(params.page), 1)),
    limit: Math.min(50, Math.max(1, parseIntSafe(firstValue(params.limit), 18))),
  };
}

function setIfPresent(params: URLSearchParams, key: string, value: string) {
  if (value.trim().length > 0) {
    params.set(key, value.trim());
  }
}

export function serializeSearchFilterParams(filters: SearchFilterState) {
  const params = new URLSearchParams();

  setIfPresent(params, "query", filters.query);
  setIfPresent(params, "city", filters.city);
  setIfPresent(params, "nearQuery", filters.nearQuery);
  if (filters.nearQuery.trim().length > 0) {
    setIfPresent(params, "radiusKm", filters.radiusKm);
  }
  setIfPresent(params, "checkIn", filters.checkIn);
  setIfPresent(params, "checkOut", filters.checkOut);
  setIfPresent(params, "guests", filters.guests);
  setIfPresent(params, "minBedrooms", filters.minBedrooms);
  setIfPresent(params, "minPropertySizeSqm", filters.minPropertySizeSqm);
  setIfPresent(params, "minSpeed", filters.minSpeed);
  setIfPresent(params, "minPrice", filters.minPrice);
  setIfPresent(params, "maxPrice", filters.maxPrice);
  setIfPresent(params, "reviewMin", filters.reviewMin);

  if (filters.bedSizes.length > 0) {
    params.set("bedSizes", filters.bedSizes.join(","));
  }

  if (filters.minWorkScore > 0) {
    params.set("minWorkScore", String(filters.minWorkScore));
  }

  if (filters.workspaceTypes.length > 0) {
    params.set("workspaceTypes", filters.workspaceTypes.join(","));
  }

  if (filters.networkTypes.length > 0) {
    params.set("networkTypes", filters.networkTypes.join(","));
  }

  if (filters.cancellationPolicies.length > 0) {
    params.set("cancellationPolicies", filters.cancellationPolicies.join(","));
  }

  if (filters.amenities.length > 0) {
    params.set("amenities", filters.amenities.join(","));
  }

  if (filters.verifiedInternet) {
    params.set("verifiedInternet", "true");
  }

  if (filters.backupInternet) {
    params.set("backupInternet", "true");
  }

  if (filters.noCleaningFee) {
    params.set("noCleaningFee", "true");
  }

  if (filters.hasJacuzzi) {
    params.set("hasJacuzzi", "true");
  }

  if (filters.hasSwimmingPool) {
    params.set("hasSwimmingPool", "true");
  }

  if (filters.hasBackyard) {
    params.set("hasBackyard", "true");
  }

  if (filters.hasPingPongTable) {
    params.set("hasPingPongTable", "true");
  }

  if (filters.hasPoolTable) {
    params.set("hasPoolTable", "true");
  }

  if (filters.sortBy !== DEFAULT_SEARCH_FILTERS.sortBy) {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }

  if (filters.limit !== DEFAULT_SEARCH_FILTERS.limit) {
    params.set("limit", String(filters.limit));
  }

  return params;
}

export function withPage(filters: SearchFilterState, page: number) {
  return {
    ...filters,
    page: Math.max(1, page),
  };
}

export function activeFilterCount(filters: SearchFilterState) {
  const toggles = [
    filters.query.trim().length > 0,
    filters.city.trim().length > 0,
    filters.nearQuery.trim().length > 0,
    filters.nearQuery.trim().length > 0 &&
      filters.radiusKm.trim().length > 0 &&
      filters.radiusKm.trim() !== DEFAULT_SEARCH_FILTERS.radiusKm,
    filters.checkIn.trim().length > 0,
    filters.checkOut.trim().length > 0,
    filters.guests.trim().length > 0,
    filters.minBedrooms.trim().length > 0,
    filters.minPropertySizeSqm.trim().length > 0,
    filters.bedSizes.length > 0,
    filters.minWorkScore > 0,
    filters.minSpeed.trim().length > 0,
    filters.minPrice.trim().length > 0,
    filters.maxPrice.trim().length > 0,
    filters.reviewMin.trim().length > 0,
    filters.workspaceTypes.length > 0,
    filters.networkTypes.length > 0,
    filters.cancellationPolicies.length > 0,
    filters.amenities.length > 0,
    filters.verifiedInternet,
    filters.backupInternet,
    filters.noCleaningFee,
    filters.hasJacuzzi,
    filters.hasSwimmingPool,
    filters.hasBackyard,
    filters.hasPingPongTable,
    filters.hasPoolTable,
    filters.sortBy !== DEFAULT_SEARCH_FILTERS.sortBy,
  ];

  return toggles.filter(Boolean).length;
}
