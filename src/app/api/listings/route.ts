import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const query = searchParams.get("query") || undefined;
  const city = searchParams.get("city") || undefined;
  const country = searchParams.get("country") || undefined;
  const guests = searchParams.get("guests")
    ? parseInt(searchParams.get("guests")!)
    : undefined;
  const minWorkScore = searchParams.get("minWorkScore")
    ? parseInt(searchParams.get("minWorkScore")!)
    : undefined;
  const minSpeed = searchParams.get("minSpeed")
    ? parseFloat(searchParams.get("minSpeed")!)
    : undefined;
  const minPrice = searchParams.get("minPrice")
    ? parseInt(searchParams.get("minPrice")!)
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? parseInt(searchParams.get("maxPrice")!)
    : undefined;
  const workspaceTypes = searchParams.get("workspaceTypes")
    ? searchParams.get("workspaceTypes")!.split(",")
    : undefined;
  const sortBy = searchParams.get("sortBy") || "workScore";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  // Build where clause
  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
  };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { city: { contains: query, mode: "insensitive" } },
    ];
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (country) {
    where.country = { equals: country, mode: "insensitive" };
  }

  if (guests) {
    where.maxGuests = { gte: guests };
  }

  if (minWorkScore) {
    where.workScore = { gte: minWorkScore };
  }

  if (minPrice || maxPrice) {
    where.pricePerDay = {};
    if (minPrice) where.pricePerDay.gte = minPrice;
    if (maxPrice) where.pricePerDay.lte = maxPrice;
  }

  if (workspaceTypes && workspaceTypes.length > 0) {
    where.workspaceType = {
      in: workspaceTypes as Prisma.EnumWorkspaceTypeFilter["in"],
    };
  }

  if (minSpeed) {
    where.connectivityProfile = {
      declaredDownloadMbps: { gte: minSpeed },
    };
  }

  // Build orderBy
  const orderByMap: Record<string, Prisma.ListingOrderByWithRelationInput> = {
    workScore: { workScore: sortOrder as Prisma.SortOrder },
    price: { pricePerDay: sortOrder as Prisma.SortOrder },
    createdAt: { createdAt: sortOrder as Prisma.SortOrder },
  };

  const orderBy = orderByMap[sortBy] || orderByMap.workScore;

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        connectivityProfile: {
          select: {
            declaredDownloadMbps: true,
            declaredUploadMbps: true,
            networkType: true,
            verified: true,
          },
        },
        host: { select: { name: true, image: true } },
        _count: { select: { reviews: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.listing.count({ where }),
  ]);

  return NextResponse.json({
    listings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
