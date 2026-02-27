import { NextRequest, NextResponse } from "next/server";
import { parseSearchFilterParams } from "@/lib/search-filters";
import { searchListingsWithFacets } from "@/lib/search-query";

function toRawParams(searchParams: URLSearchParams): Record<string, string | string[] | undefined> {
  const record: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = record[key];
    if (existing === undefined) {
      record[key] = value;
      continue;
    }
    if (Array.isArray(existing)) {
      record[key] = [...existing, value];
      continue;
    }
    record[key] = [existing, value];
  }

  return record;
}

export async function GET(request: NextRequest) {
  try {
    const rawParams = toRawParams(request.nextUrl.searchParams);
    const filters = parseSearchFilterParams(rawParams);
    const { listings, total } = await searchListingsWithFacets(filters);
    const totalPages = Math.max(1, Math.ceil(total / filters.limit));

    return NextResponse.json({
      listings,
      total,
      totalPages,
      page: filters.page,
    });
  } catch (error) {
    console.error("[api/search] failed to fetch search listings", error);
    return NextResponse.json(
      { error: "Unable to load search results right now." },
      { status: 500 }
    );
  }
}

