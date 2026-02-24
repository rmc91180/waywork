import { LANDMARK_OPTIONS } from "@/lib/landmark-options";

export interface ResolvedSearchLocation {
  query: string;
  label: string;
  lat: number;
  lng: number;
  source: "coordinates" | "landmark" | "geocoding" | "listing";
}

const resolveCache = new Map<string, ResolvedSearchLocation | null>();

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function parseCoordinates(query: string): { lat: number; lng: number } | null {
  const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function resolveFromLandmarks(query: string): ResolvedSearchLocation | null {
  const normalized = normalizeQuery(query);
  const hit = LANDMARK_OPTIONS.find((item) =>
    item.aliases.some((alias) => normalized.includes(alias))
  );

  if (!hit) return null;

  return {
    query,
    label: hit.label,
    lat: hit.lat,
    lng: hit.lng,
    source: "landmark",
  };
}

async function resolveWithMapbox(query: string): Promise<ResolvedSearchLocation | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || query.trim().length < 3) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json?limit=1&types=country,region,district,place,locality,neighborhood,address,poi&access_token=${token}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 6 },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      features?: Array<{
        place_name?: string;
        center?: [number, number];
      }>;
    };

    const feature = payload.features?.[0];
    if (!feature?.center || feature.center.length < 2) return null;

    return {
      query,
      label: feature.place_name || query,
      lat: feature.center[1],
      lng: feature.center[0],
      source: "geocoding",
    };
  } catch {
    return null;
  }
}

export async function resolveSearchLocation(query: string): Promise<ResolvedSearchLocation | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) return null;

  if (resolveCache.has(normalized)) {
    return resolveCache.get(normalized) || null;
  }

  const coordinates = parseCoordinates(query);
  if (coordinates) {
    const resolved = {
      query,
      label: `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
      lat: coordinates.lat,
      lng: coordinates.lng,
      source: "coordinates" as const,
    };
    resolveCache.set(normalized, resolved);
    return resolved;
  }

  const landmarkHit = resolveFromLandmarks(query);
  if (landmarkHit) {
    resolveCache.set(normalized, landmarkHit);
    return landmarkHit;
  }

  const mapboxHit = await resolveWithMapbox(query);
  resolveCache.set(normalized, mapboxHit);
  return mapboxHit;
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const latDelta = toRadians(bLat - aLat);
  const lngDelta = toRadians(bLng - aLng);

  const sinLat = Math.sin(latDelta / 2);
  const sinLng = Math.sin(lngDelta / 2);

  const a =
    sinLat * sinLat +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * sinLng * sinLng;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getBoundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
