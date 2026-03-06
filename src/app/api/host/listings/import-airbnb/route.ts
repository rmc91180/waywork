import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const inputSchema = z.object({
  url: z.string().url(),
});

function isAllowedAirbnbHostname(hostname: string) {
  const value = hostname.toLowerCase();
  return value === "airbnb.com" || value.endsWith(".airbnb.com") || value.includes("airbnb.");
}

function extractJsonLdBlocks(html: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = (match[1] || "").trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && typeof item === "object") {
            results.push(item as Record<string, unknown>);
          }
        });
      } else if (parsed && typeof parsed === "object") {
        results.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return results;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeListingFromJsonLd(blocks: Array<Record<string, unknown>>) {
  const lodgingBlock =
    blocks.find((item) => {
      const type = item["@type"];
      if (Array.isArray(type)) {
        return type.some((entry) => ["LodgingBusiness", "Apartment", "House", "Accommodation"].includes(readString(entry)));
      }
      const normalizedType = readString(type);
      return ["LodgingBusiness", "Apartment", "House", "Accommodation"].includes(normalizedType);
    }) || blocks[0] || null;

  if (!lodgingBlock) {
    return null;
  }

  const address =
    lodgingBlock.address && typeof lodgingBlock.address === "object"
      ? (lodgingBlock.address as Record<string, unknown>)
      : null;

  const imageValue = lodgingBlock.image;
  const images = Array.isArray(imageValue)
    ? imageValue.map(readString).filter(Boolean)
    : readString(imageValue)
      ? [readString(imageValue)]
      : [];

  return {
    title: readString(lodgingBlock.name),
    description: readString(lodgingBlock.description),
    address: address ? readString(address.streetAddress) : "",
    city: address ? readString(address.addressLocality) : "",
    state: address ? readString(address.addressRegion) : "",
    country: address ? readString(address.addressCountry) : "",
    postalCode: address ? readString(address.postalCode) : "",
    lat:
      lodgingBlock.geo && typeof lodgingBlock.geo === "object"
        ? readNumber((lodgingBlock.geo as Record<string, unknown>).latitude)
        : null,
    lng:
      lodgingBlock.geo && typeof lodgingBlock.geo === "object"
        ? readNumber((lodgingBlock.geo as Record<string, unknown>).longitude)
        : null,
    maxGuests: Math.max(1, Math.round(readNumber((lodgingBlock as Record<string, unknown>).occupancy) || 1)),
    images,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Airbnb import payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const sourceUrl = new URL(parsed.data.url);
  if (!isAllowedAirbnbHostname(sourceUrl.hostname)) {
    return NextResponse.json(
      { error: "Only Airbnb listing URLs are allowed for import." },
      { status: 400 }
    );
  }

  let html = "";
  try {
    const response = await fetch(sourceUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "WayWork Airbnb Import/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Airbnb page returned HTTP ${response.status}.` },
        { status: 502 }
      );
    }

    html = await response.text();
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch Airbnb page for import." },
      { status: 502 }
    );
  }

  const jsonLd = extractJsonLdBlocks(html);
  const listing = normalizeListingFromJsonLd(jsonLd);

  if (!listing || (!listing.title && !listing.description)) {
    return NextResponse.json(
      {
        error:
          "No importable listing metadata found. Airbnb may block automated extraction for this page.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ok: true,
    sourceUrl: sourceUrl.toString(),
    listing,
    note:
      "Imported data is best-effort from public structured metadata. Please verify every field before publishing.",
  });
}
