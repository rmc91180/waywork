import { NextRequest, NextResponse } from "next/server";

interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

async function geocodeWithMapbox(query: string): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", token);

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    features?: Array<{ place_name?: string; center?: [number, number] }>;
  };
  const feature = payload.features?.[0];
  if (!feature?.center || feature.center.length < 2) return null;

  return {
    lat: feature.center[1],
    lng: feature.center[0],
    label: feature.place_name || query,
  };
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "WayWork/1.0 (support@waywork.com)",
      Accept: "application/json",
    },
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;
  const first = payload[0];
  if (!first?.lat || !first?.lon) return null;

  const lat = Number.parseFloat(first.lat);
  const lng = Number.parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    label: first.display_name || query,
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters." },
      { status: 400 }
    );
  }

  try {
    const mapboxResult = await geocodeWithMapbox(query);
    const result = mapboxResult || (await geocodeWithNominatim(query));

    if (!result) {
      return NextResponse.json(
        { error: "Could not geocode this address." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[geocode] failed", error);
    return NextResponse.json(
      { error: "Unable to geocode this address right now." },
      { status: 500 }
    );
  }
}
