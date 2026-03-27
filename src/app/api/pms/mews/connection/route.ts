import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  bookingCommissionBpsToPercent,
  bookingCommissionPercentToBps,
} from "@/lib/payout-config";
import { captureObservedError, createObservationContext, logObservation } from "@/lib/observability";
import { isMewsProviderActive } from "@/lib/pms/provider-mode";

const listingMappingSchema = z.object({
  listingId: z.string().min(1),
  pmsExternalListingId: z.string().optional(),
  pmsExternalRatePlanId: z.string().optional(),
});

const connectionRequestSchema = z.object({
  enabled: z.boolean().optional(),
  mewsApiBaseUrl: z.string().optional(),
  mewsClientToken: z.string().optional(),
  mewsConnectionToken: z.string().optional(),
  mewsAccessToken: z.string().optional(),
  mewsEnterpriseId: z.string().optional(),
  mewsClientName: z.string().optional(),
  bookingCommissionPercent: z.number().min(0).max(100).nullable().optional(),
  listingMappings: z.array(listingMappingSchema).max(500).optional(),
});

function normalizeApiBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function redact(value: string | null) {
  if (!value) return null;
  if (value.length <= 6) return "******";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

export async function GET() {
  if (!isMewsProviderActive()) {
    return NextResponse.json(
      { error: "Mews integration is disabled. Use SiteMinder endpoints." },
      { status: 410 }
    );
  }

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
      bookingCommissionPercent:
        connection.bookingCommissionBps === null
          ? null
          : bookingCommissionBpsToPercent(connection.bookingCommissionBps),
      updatedAt: connection.updatedAt,
    },
    listings: connection.listings,
  });
}

export async function POST(request: NextRequest) {
  if (!isMewsProviderActive()) {
    return NextResponse.json(
      { error: "Mews integration is disabled. Use SiteMinder endpoints." },
      { status: 410 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = createObservationContext("api.pms.mews.connection", {
    userId: session.user.id,
  });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = connectionRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid Mews connection payload.", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsedBody.data;

  const normalizedApiBaseUrl = normalizeApiBaseUrl(body.mewsApiBaseUrl);
  if (typeof body.mewsApiBaseUrl === "string" && !normalizedApiBaseUrl) {
    return NextResponse.json(
      { error: "Mews API Base URL must be a valid http/https URL." },
      { status: 400 }
    );
  }

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
      mewsApiBaseUrl: normalizedApiBaseUrl || "https://api.mews.com",
      mewsClientToken: body.mewsClientToken?.trim() || null,
      mewsConnectionToken: body.mewsConnectionToken?.trim() || null,
      mewsAccessToken: body.mewsAccessToken?.trim() || null,
      mewsEnterpriseId: body.mewsEnterpriseId?.trim() || null,
      mewsClientName: body.mewsClientName?.trim() || "WayWork PMS Sync/1.0",
      bookingCommissionBps: bookingCommissionPercentToBps(body.bookingCommissionPercent),
    },
    update: {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      mewsApiBaseUrl:
        typeof body.mewsApiBaseUrl === "string" ? normalizedApiBaseUrl || undefined : undefined,
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
      bookingCommissionBps:
        body.bookingCommissionPercent !== undefined
          ? bookingCommissionPercentToBps(body.bookingCommissionPercent)
          : undefined,
    },
  });

  const mappings = Array.isArray(body.listingMappings) ? body.listingMappings : [];
  try {
    if (mappings.length > 0) {
      await Promise.all(
        mappings.map(async (mapping) => {
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
        })
      );
    }
  } catch (error) {
    const eventId = captureObservedError({
      error,
      message: "Failed applying listing mappings for Mews connection",
      context: {
        ...context,
        connectionId: connection.id,
        mappingsCount: mappings.length,
      },
    });

    return NextResponse.json(
      { error: "Failed to apply listing mappings.", eventId },
      { status: 500 }
    );
  }

  logObservation("info", "Mews connection configuration saved", {
    ...context,
    connectionId: connection.id,
    mappingsApplied: mappings.length,
    enabled: connection.enabled,
  });

  return NextResponse.json({
    ok: true,
    eventId: context.eventId,
    connectionId: connection.id,
    mappingsApplied: mappings.length,
  });
}
