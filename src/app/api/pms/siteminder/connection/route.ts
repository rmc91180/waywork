import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  bookingCommissionBpsToPercent,
  bookingCommissionPercentToBps,
} from "@/lib/payout-config";
import { isSiteMinderProviderActive } from "@/lib/pms/provider-mode";

const listingMappingSchema = z.object({
  listingId: z.string().min(1),
  pmsExternalListingId: z.string().optional(),
  pmsExternalRatePlanId: z.string().optional(),
});

const connectionSchema = z.object({
  enabled: z.boolean().optional(),
  apiBaseUrl: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  propertyId: z.string().optional(),
  webhookSecret: z.string().optional(),
  bookingCommissionPercent: z.number().min(0).max(100).nullable().optional(),
  listingMappings: z.array(listingMappingSchema).max(500).optional(),
});

function normalizeApiBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.protocol.startsWith("http")) return null;
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
  if (!isSiteMinderProviderActive()) {
    return NextResponse.json(
      { error: "SiteMinder provider is not active in this environment." },
      { status: 409 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await db.pmsConnection.findFirst({
    where: {
      userId: session.user.id,
      provider: "SITEMINDER",
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
      apiBaseUrl: connection.siteminderApiBaseUrl,
      clientId: redact(connection.siteminderClientId),
      clientSecret: redact(connection.siteminderClientSecret),
      propertyId: connection.siteminderPropertyId,
      webhookSecret: redact(connection.siteminderWebhookSecret),
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
  if (!isSiteMinderProviderActive()) {
    return NextResponse.json(
      { error: "SiteMinder provider is not active in this environment." },
      { status: 409 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = connectionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid SiteMinder payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const normalizedApiBaseUrl = normalizeApiBaseUrl(body.apiBaseUrl);
  if (typeof body.apiBaseUrl === "string" && !normalizedApiBaseUrl) {
    return NextResponse.json(
      { error: "SiteMinder API Base URL must be a valid http/https URL." },
      { status: 400 }
    );
  }

  const connection = await db.pmsConnection.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: "SITEMINDER",
      },
    },
    create: {
      userId: session.user.id,
      provider: "SITEMINDER",
      enabled: Boolean(body.enabled),
      siteminderApiBaseUrl: normalizedApiBaseUrl || "https://api.siteminder.com",
      siteminderClientId: body.clientId?.trim() || null,
      siteminderClientSecret: body.clientSecret?.trim() || null,
      siteminderPropertyId: body.propertyId?.trim() || null,
      siteminderWebhookSecret: body.webhookSecret?.trim() || null,
      bookingCommissionBps: bookingCommissionPercentToBps(body.bookingCommissionPercent),
    },
    update: {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      siteminderApiBaseUrl:
        typeof body.apiBaseUrl === "string" ? normalizedApiBaseUrl || undefined : undefined,
      siteminderClientId:
        typeof body.clientId === "string" ? body.clientId.trim() || null : undefined,
      siteminderClientSecret:
        typeof body.clientSecret === "string" ? body.clientSecret.trim() || null : undefined,
      siteminderPropertyId:
        typeof body.propertyId === "string" ? body.propertyId.trim() || null : undefined,
      siteminderWebhookSecret:
        typeof body.webhookSecret === "string" ? body.webhookSecret.trim() || null : undefined,
      bookingCommissionBps:
        body.bookingCommissionPercent !== undefined
          ? bookingCommissionPercentToBps(body.bookingCommissionPercent)
          : undefined,
    },
  });

  const mappings = Array.isArray(body.listingMappings) ? body.listingMappings : [];
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

  return NextResponse.json({
    ok: true,
    connectionId: connection.id,
    mappingsApplied: mappings.length,
  });
}
