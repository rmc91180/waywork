import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface ListingMappingInput {
  listingId: string;
  pmsExternalListingId?: string;
  pmsExternalRatePlanId?: string;
}

function redact(value: string | null) {
  if (!value) return null;
  if (value.length <= 6) return "******";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await db.pmsConnection.findFirst({
    where: {
      userId: session.user.id,
      provider: "MEWS",
    },
    include: {
      listings: {
        select: {
          id: true,
          title: true,
          pmsExternalListingId: true,
          pmsExternalRatePlanId: true,
          pmsSyncStatus: true,
          pmsSyncError: true,
          pmsLastSyncedAt: true,
        },
      },
    },
  });

  if (!connection) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    connection: {
      id: connection.id,
      enabled: connection.enabled,
      provider: connection.provider,
      mewsApiBaseUrl: connection.mewsApiBaseUrl,
      mewsClientToken: redact(connection.mewsClientToken),
      mewsConnectionToken: redact(connection.mewsConnectionToken),
      mewsAccessToken: redact(connection.mewsAccessToken),
      mewsEnterpriseId: redact(connection.mewsEnterpriseId),
      mewsClientName: connection.mewsClientName,
      updatedAt: connection.updatedAt,
    },
    listings: connection.listings,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    enabled?: boolean;
    mewsApiBaseUrl?: string;
    mewsClientToken?: string;
    mewsConnectionToken?: string;
    mewsAccessToken?: string;
    mewsEnterpriseId?: string;
    mewsClientName?: string;
    listingMappings?: ListingMappingInput[];
  };

  const connection = await db.pmsConnection.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: "MEWS",
      },
    },
    create: {
      userId: session.user.id,
      provider: "MEWS",
      enabled: Boolean(body.enabled),
      mewsApiBaseUrl: body.mewsApiBaseUrl?.trim() || "https://api.mews.com",
      mewsClientToken: body.mewsClientToken?.trim() || null,
      mewsConnectionToken: body.mewsConnectionToken?.trim() || null,
      mewsAccessToken: body.mewsAccessToken?.trim() || null,
      mewsEnterpriseId: body.mewsEnterpriseId?.trim() || null,
      mewsClientName: body.mewsClientName?.trim() || "WayWork PMS Sync/1.0",
    },
    update: {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      mewsApiBaseUrl: body.mewsApiBaseUrl?.trim() || undefined,
      mewsClientToken:
        typeof body.mewsClientToken === "string" ? body.mewsClientToken.trim() || null : undefined,
      mewsConnectionToken:
        typeof body.mewsConnectionToken === "string"
          ? body.mewsConnectionToken.trim() || null
          : undefined,
      mewsAccessToken:
        typeof body.mewsAccessToken === "string" ? body.mewsAccessToken.trim() || null : undefined,
      mewsEnterpriseId:
        typeof body.mewsEnterpriseId === "string"
          ? body.mewsEnterpriseId.trim() || null
          : undefined,
      mewsClientName: body.mewsClientName?.trim() || undefined,
    },
  });

  const mappings = Array.isArray(body.listingMappings) ? body.listingMappings : [];
  if (mappings.length > 0) {
    for (const mapping of mappings) {
      if (!mapping.listingId) continue;
      const externalListingId = mapping.pmsExternalListingId?.trim() || "";
      const externalRatePlanId = mapping.pmsExternalRatePlanId?.trim() || null;

      await db.listing.updateMany({
        where: {
          id: mapping.listingId,
          hostId: session.user.id,
        },
        data: {
          pmsConnectionId: externalListingId ? connection.id : null,
          pmsExternalListingId: externalListingId || null,
          pmsExternalRatePlanId: externalListingId ? externalRatePlanId : null,
          pmsSyncStatus: "PENDING",
          pmsSyncError: null,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    connectionId: connection.id,
    mappingsApplied: mappings.length,
  });
}
