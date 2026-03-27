import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

const listingMappingSchema = z.object({
  listingId: z.string().min(1),
  pmsExternalPropertyId: z.string().optional(),
  pmsExternalUnitGroupId: z.string().optional(),
  pmsExternalRatePlanId: z.string().optional(),
});

const connectionSchema = z.object({
  enabled: z.boolean().optional(),
  apiBaseUrl: z.string().optional(),
  identityBaseUrl: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  accountCode: z.string().optional(),
  webhookSecret: z.string().optional(),
  webhookSubscriptionId: z.string().optional(),
  ariSubscriptionId: z.string().optional(),
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
  if (!isApaleoProviderActive()) {
    return NextResponse.json(
      { error: "Apaleo provider is not active in this environment." },
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
      provider: "APALEO",
    },
    include: {
      listings: {
        select: {
          id: true,
          title: true,
          pmsExternalPropertyId: true,
          pmsExternalUnitGroupId: true,
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
      apiBaseUrl: connection.apaleoApiBaseUrl,
      identityBaseUrl: connection.apaleoIdentityBaseUrl,
      clientId: redact(connection.apaleoClientId),
      clientSecret: redact(connection.apaleoClientSecret),
      accountCode: connection.apaleoAccountCode,
      hasRefreshToken: Boolean(connection.apaleoRefreshToken),
      accessTokenExpiresAt: connection.apaleoAccessTokenExpiresAt,
      connectedAt: connection.apaleoConnectedAt,
      lastTokenRefreshAt: connection.apaleoLastTokenRefreshAt,
      webhookSecret: redact(connection.apaleoWebhookSecret),
      webhookSubscriptionId: connection.apaleoWebhookSubscriptionId,
      ariSubscriptionId: connection.apaleoAriSubscriptionId,
      ariSubscriptionState: connection.apaleoAriSubscriptionState,
      updatedAt: connection.updatedAt,
    },
    listings: connection.listings,
  });
}

export async function POST(request: NextRequest) {
  if (!isApaleoProviderActive()) {
    return NextResponse.json(
      { error: "Apaleo provider is not active in this environment." },
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
      { error: "Invalid apaleo payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const normalizedApiBaseUrl = normalizeApiBaseUrl(body.apiBaseUrl);
  if (typeof body.apiBaseUrl === "string" && !normalizedApiBaseUrl) {
    return NextResponse.json(
      { error: "apaleo API Base URL must be a valid http/https URL." },
      { status: 400 }
    );
  }

  const normalizedIdentityBaseUrl = normalizeApiBaseUrl(body.identityBaseUrl);
  if (typeof body.identityBaseUrl === "string" && !normalizedIdentityBaseUrl) {
    return NextResponse.json(
      { error: "apaleo Identity Base URL must be a valid http/https URL." },
      { status: 400 }
    );
  }

  const connection = await db.pmsConnection.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: "APALEO",
      },
    },
    create: {
      userId: session.user.id,
      provider: "APALEO",
      enabled: Boolean(body.enabled),
      apaleoApiBaseUrl: normalizedApiBaseUrl || "https://api.apaleo.com",
      apaleoIdentityBaseUrl: normalizedIdentityBaseUrl || "https://identity.apaleo.com",
      apaleoClientId: body.clientId?.trim() || null,
      apaleoClientSecret: body.clientSecret?.trim() || null,
      apaleoAccountCode: body.accountCode?.trim() || null,
      apaleoWebhookSecret: body.webhookSecret?.trim() || null,
      apaleoWebhookSubscriptionId: body.webhookSubscriptionId?.trim() || null,
      apaleoAriSubscriptionId: body.ariSubscriptionId?.trim() || null,
    },
    update: {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      apaleoApiBaseUrl:
        typeof body.apiBaseUrl === "string" ? normalizedApiBaseUrl || undefined : undefined,
      apaleoIdentityBaseUrl:
        typeof body.identityBaseUrl === "string"
          ? normalizedIdentityBaseUrl || undefined
          : undefined,
      apaleoClientId:
        typeof body.clientId === "string" ? body.clientId.trim() || null : undefined,
      apaleoClientSecret:
        typeof body.clientSecret === "string" ? body.clientSecret.trim() || null : undefined,
      apaleoAccountCode:
        typeof body.accountCode === "string" ? body.accountCode.trim() || null : undefined,
      apaleoWebhookSecret:
        typeof body.webhookSecret === "string" ? body.webhookSecret.trim() || null : undefined,
      apaleoWebhookSubscriptionId:
        typeof body.webhookSubscriptionId === "string"
          ? body.webhookSubscriptionId.trim() || null
          : undefined,
      apaleoAriSubscriptionId:
        typeof body.ariSubscriptionId === "string"
          ? body.ariSubscriptionId.trim() || null
          : undefined,
    },
  });

  const mappings = Array.isArray(body.listingMappings) ? body.listingMappings : [];
  if (mappings.length > 0) {
    await Promise.all(
      mappings.map(async (mapping) => {
        const externalPropertyId = mapping.pmsExternalPropertyId?.trim() || "";
        const externalUnitGroupId = mapping.pmsExternalUnitGroupId?.trim() || "";
        const externalRatePlanId = mapping.pmsExternalRatePlanId?.trim() || null;

        await db.listing.updateMany({
          where: {
            id: mapping.listingId,
            hostId: session.user.id,
          },
          data: {
            pmsConnectionId: externalUnitGroupId ? connection.id : null,
            pmsExternalPropertyId: externalUnitGroupId ? externalPropertyId || null : null,
            pmsExternalListingId: externalUnitGroupId || null,
            pmsExternalUnitGroupId: externalUnitGroupId || null,
            pmsExternalRatePlanId: externalUnitGroupId ? externalRatePlanId : null,
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
