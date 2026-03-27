import { addDays, differenceInDays, isBefore, startOfDay } from "date-fns";
import type { Prisma } from "@/generated/prisma";
import {
  ApaleoClient,
  type ApaleoAriPayload,
  type ApaleoReservation,
  type ApaleoReservationWebhook,
} from "@/lib/pms/apaleo-client";
import { decryptApaleoSecret, encryptApaleoSecret } from "@/lib/pms/apaleo-crypto";
import {
  calculateBookingPricingFromGross,
  resolveBookingCommissionBps,
} from "@/lib/payout-config";

type JsonObject = Record<string, unknown>;

interface DbModule {
  db: typeof import("@/lib/db")["db"];
}

interface ApaleoSyncConnection {
  id: string;
  userId: string;
  enabled: boolean;
  apaleoApiBaseUrl: string;
  apaleoIdentityBaseUrl: string;
  apaleoClientId: string | null;
  apaleoClientSecret: string | null;
  apaleoAccountCode: string | null;
  apaleoRefreshToken: string | null;
  apaleoAccessTokenExpiresAt: Date | null;
  apaleoWebhookSecret: string | null;
  apaleoWebhookSubscriptionId: string | null;
  apaleoAriSubscriptionId: string | null;
  apaleoAriSubscriptionState: Prisma.JsonValue | null;
}

export interface NormalizedApaleoReservation {
  externalReservationId: string;
  unitGroupId: string;
  ratePlanId: string | null;
  startDate: string;
  endDate: string;
  status: string;
  guests: number;
  totalAmount: number;
  currencyCode: string;
  guestName: string;
  guestEmail: string;
}

export interface ExpandedApaleoAriUpdate {
  propertyId: string;
  unitGroupId: string;
  ratePlanId: string;
  startDate: string;
  endDate: string;
  availability: number;
  amount: number | null;
  currencyCode: string | null;
}

function parseDateRange(startRaw: string, endRaw: string) {
  const start = startOfDay(new Date(startRaw));
  const end = startOfDay(new Date(endRaw));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error("Invalid date range.");
  }
  return { start, end };
}

function dateRangeDays(start: Date, endExclusive: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(start);
  while (isBefore(current, endExclusive)) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

function getFixtureDir(useFixtures: boolean) {
  return useFixtures ? `${process.cwd()}\\scripts\\fixtures\\apaleo` : null;
}

async function getDb() {
  return (await import("@/lib/db")) as DbModule;
}

async function resolveApaleoConnection(input: {
  accountCode?: string | null;
  propertyId?: string | null;
  providedSecret: string | null;
}) {
  const { db } = await getDb();
  const providedSecret = input.providedSecret?.trim() || null;

  if (!providedSecret) {
    return null;
  }

  const scopedWhere: Prisma.PmsConnectionWhereInput[] = [];
  if (input.accountCode) {
    scopedWhere.push({ apaleoAccountCode: input.accountCode });
  }
  if (input.propertyId) {
    scopedWhere.push({
      listings: {
        some: {
          pmsExternalPropertyId: input.propertyId,
        },
      },
    });
  }

  const candidate = await db.pmsConnection.findFirst({
    where: {
      provider: "APALEO",
      enabled: true,
      apaleoWebhookSecret: providedSecret,
      ...(scopedWhere.length > 0 ? { OR: scopedWhere } : {}),
    },
    select: {
      id: true,
      userId: true,
      enabled: true,
      apaleoApiBaseUrl: true,
      apaleoIdentityBaseUrl: true,
      apaleoClientId: true,
      apaleoClientSecret: true,
      apaleoAccountCode: true,
      apaleoRefreshToken: true,
      apaleoAccessTokenExpiresAt: true,
      apaleoWebhookSecret: true,
      apaleoWebhookSubscriptionId: true,
      apaleoAriSubscriptionId: true,
      apaleoAriSubscriptionState: true,
    },
  });

  if (!candidate) return null;

  return candidate satisfies ApaleoSyncConnection;
}

async function getConnectionById(connectionId: string) {
  const { db } = await getDb();

  return db.pmsConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      userId: true,
      enabled: true,
      apaleoApiBaseUrl: true,
      apaleoIdentityBaseUrl: true,
      apaleoClientId: true,
      apaleoClientSecret: true,
      apaleoAccountCode: true,
      apaleoRefreshToken: true,
      apaleoAccessTokenExpiresAt: true,
      apaleoWebhookSecret: true,
      apaleoWebhookSubscriptionId: true,
      apaleoAriSubscriptionId: true,
      apaleoAriSubscriptionState: true,
    },
  }) as Promise<ApaleoSyncConnection | null>;
}

async function buildAuthorizedApaleoClient(
  connection: ApaleoSyncConnection,
  useFixtures = false
) {
  const { db } = await getDb();

  if (useFixtures) {
    return new ApaleoClient({
      apiBaseUrl: connection.apaleoApiBaseUrl,
      identityBaseUrl: connection.apaleoIdentityBaseUrl,
      clientId: connection.apaleoClientId,
      clientSecret: connection.apaleoClientSecret,
      fixtureDir: getFixtureDir(true),
    });
  }

  if (!connection.apaleoClientId || !connection.apaleoClientSecret || !connection.apaleoRefreshToken) {
    throw new Error("Apaleo connection is missing OAuth credentials.");
  }

  const refreshToken = decryptApaleoSecret(connection.apaleoRefreshToken);
  const tokenClient = new ApaleoClient({
    apiBaseUrl: connection.apaleoApiBaseUrl,
    identityBaseUrl: connection.apaleoIdentityBaseUrl,
    clientId: connection.apaleoClientId,
    clientSecret: connection.apaleoClientSecret,
  });

  const tokenResponse = await tokenClient.refreshAccessToken(refreshToken);
  await db.pmsConnection.update({
    where: { id: connection.id },
    data: {
      apaleoRefreshToken: tokenResponse.refresh_token
        ? encryptApaleoSecret(tokenResponse.refresh_token)
        : connection.apaleoRefreshToken,
      apaleoAccessTokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      apaleoLastTokenRefreshAt: new Date(),
    },
  });

  return new ApaleoClient({
    apiBaseUrl: connection.apaleoApiBaseUrl,
    identityBaseUrl: connection.apaleoIdentityBaseUrl,
    clientId: connection.apaleoClientId,
    clientSecret: connection.apaleoClientSecret,
    accessToken: tokenResponse.access_token,
  });
}

function findProvidedSecret(input: {
  headerSecret?: string | null;
  querySecret?: string | null;
}) {
  return input.headerSecret || input.querySecret || null;
}

export async function verifyApaleoInboundRequest(input: {
  accountCode?: string | null;
  propertyId?: string | null;
  headerSecret?: string | null;
  querySecret?: string | null;
}) {
  return resolveApaleoConnection({
    accountCode: input.accountCode,
    propertyId: input.propertyId,
    providedSecret: findProvidedSecret(input),
  });
}

export function normalizeApaleoReservationDetail(
  reservation: ApaleoReservation
): NormalizedApaleoReservation {
  const guestName = [
    reservation.booker?.firstName || "",
    reservation.booker?.lastName || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    externalReservationId: reservation.id,
    unitGroupId: reservation.unitGroupId || "",
    ratePlanId: reservation.ratePlanId || null,
    startDate: reservation.arrival || "",
    endDate: reservation.departure || "",
    status: reservation.status || "Confirmed",
    guests: Math.max(1, reservation.adults || 1),
    totalAmount: reservation.totalGrossAmount?.amount || 0,
    currencyCode: reservation.totalGrossAmount?.currency || "EUR",
    guestName: guestName || "Apaleo Guest",
    guestEmail: reservation.booker?.email || `apaleo-${reservation.id}@waywork.local`,
  };
}

export function expandApaleoAriUpdates(payload: ApaleoAriPayload) {
  return (payload.updates || []).map((update) => ({
    propertyId: payload.propertyId || "",
    unitGroupId: payload.unitGroupId || "",
    ratePlanId: payload.ratePlanId || "",
    startDate: update.from,
    endDate: update.to,
    availability: typeof update.availability === "number" ? update.availability : 0,
    amount: typeof update.price?.amount === "number" ? update.price.amount : null,
    currencyCode: update.price?.currency || null,
  })) satisfies ExpandedApaleoAriUpdate[];
}

async function findOrCreateGuest(connectionId: string, reservation: NormalizedApaleoReservation) {
  const { db } = await getDb();
  const email =
    reservation.guestEmail ||
    `apaleo-${connectionId}-${reservation.externalReservationId}@waywork.local`;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.user.create({
    data: {
      email,
      name: reservation.guestName,
      role: "GUEST",
    },
    select: { id: true },
  });

  return created.id;
}

export async function applyInboundApaleoAri(
  connectionId: string,
  payload: ApaleoAriPayload,
  rawPayload: JsonObject
) {
  const { db } = await getDb();
  const updates = expandApaleoAriUpdates(payload);
  let processed = 0;
  let skipped = 0;

  for (const update of updates) {
    const listing = await db.listing.findFirst({
      where: {
        pmsConnectionId: connectionId,
        pmsExternalPropertyId: update.propertyId,
        pmsExternalUnitGroupId: update.unitGroupId,
        pmsExternalRatePlanId: update.ratePlanId,
      },
      select: { id: true },
    });

    if (!listing) {
      skipped += 1;
      continue;
    }

    const parsed = parseDateRange(update.startDate, update.endDate);
    const effectiveEnd = parsed.end <= parsed.start ? addDays(parsed.start, 1) : parsed.end;
    const dates = dateRangeDays(parsed.start, effectiveEnd);

    if (update.availability <= 0) {
      for (const date of dates) {
        await db.blockedDate.upsert({
          where: { listingId_date: { listingId: listing.id, date } },
          create: {
            listingId: listing.id,
            date,
            source: "PMS",
          },
          update: { source: "PMS" },
        });
      }
    } else {
      await db.blockedDate.deleteMany({
        where: {
          listingId: listing.id,
          source: "PMS",
          date: { in: dates },
        },
      });
    }

    if (typeof update.amount === "number" && update.currencyCode) {
      const amountCents = Math.max(0, Math.round(update.amount * 100));
      for (const date of dates) {
        await db.listingDailyRate.upsert({
          where: { listingId_date: { listingId: listing.id, date } },
          create: {
            listingId: listing.id,
            date,
            pricePerDay: amountCents,
            currency: update.currencyCode,
            source: "PMS",
          },
          update: {
            pricePerDay: amountCents,
            currency: update.currencyCode,
            source: "PMS",
          },
        });
      }

      await db.listing.update({
        where: { id: listing.id },
        data: {
          pricePerDay: amountCents,
          currency: update.currencyCode,
          pmsSyncStatus: "SYNCED",
          pmsSyncError: null,
          pmsLastSyncedAt: new Date(),
        },
      });
    } else {
      await db.listing.update({
        where: { id: listing.id },
        data: {
          pmsSyncStatus: "SYNCED",
          pmsSyncError: null,
          pmsLastSyncedAt: new Date(),
        },
      });
    }

    await db.pmsSyncEvent.create({
      data: {
        connectionId,
        listingId: listing.id,
        direction: "INBOUND",
        action: "APALEO_ARI_UPDATE",
        success: true,
        requestPayload: rawPayload as Prisma.InputJsonValue,
      },
    });

    processed += 1;
  }

  return { processed, skipped };
}

export async function applyInboundApaleoReservationDetail(
  connectionId: string,
  reservation: ApaleoReservation,
  rawPayload: JsonObject
) {
  const { db } = await getDb();
  const normalized = normalizeApaleoReservationDetail(reservation);

  const listing = await db.listing.findFirst({
    where: {
      pmsConnectionId: connectionId,
      pmsExternalUnitGroupId: normalized.unitGroupId,
      ...(normalized.ratePlanId ? { pmsExternalRatePlanId: normalized.ratePlanId } : {}),
    },
    select: {
      id: true,
      pricePerDay: true,
      cleaningFee: true,
      host: {
        select: {
          defaultBookingCommissionBps: true,
        },
      },
      pmsConnection: {
        select: {
          bookingCommissionBps: true,
        },
      },
    },
  });

  if (!listing) {
    return { processed: false, reason: "LISTING_NOT_MAPPED" };
  }

  const parsed = parseDateRange(normalized.startDate, normalized.endDate);
  const effectiveEnd = parsed.end <= parsed.start ? addDays(parsed.start, 1) : parsed.end;
  const dates = dateRangeDays(parsed.start, effectiveEnd);
  const numberOfDays = Math.max(1, differenceInDays(effectiveEnd, parsed.start));
  const totalPrice = Math.max(0, Math.round(normalized.totalAmount * 100));
  const isCancelled = normalized.status.toLowerCase().includes("cancel");

  const existingBooking = await db.booking.findFirst({
    where: {
      OR: [
        { pmsExternalReservationId: normalized.externalReservationId },
        {
          listingId: listing.id,
          checkIn: parsed.start,
          checkOut: effectiveEnd,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      ],
    },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
    },
  });

  if (existingBooking && isCancelled) {
    await db.$transaction([
      db.booking.update({
        where: { id: existingBooking.id },
        data: {
          status: "CANCELLED_BY_HOST",
          pmsSyncStatus: "SYNCED",
          pmsSyncError: null,
          pmsLastSyncedAt: new Date(),
        },
      }),
      db.blockedDate.deleteMany({
        where: {
          listingId: listing.id,
          source: "BOOKING",
          date: { gte: existingBooking.checkIn, lt: existingBooking.checkOut },
        },
      }),
      db.pmsSyncEvent.create({
        data: {
          connectionId,
          listingId: listing.id,
          bookingId: existingBooking.id,
          direction: "INBOUND",
          action: "APALEO_RESERVATION_CANCEL",
          success: true,
          requestPayload: rawPayload as Prisma.InputJsonValue,
        },
      }),
    ]);

    return { processed: true, bookingId: existingBooking.id };
  }

  if (isCancelled) {
    return { processed: true, bookingId: null };
  }

  const guestId = await findOrCreateGuest(connectionId, normalized);
  const fallbackSubtotal = listing.pricePerDay * numberOfDays;
  const subtotal = totalPrice > 0 ? Math.max(0, totalPrice - listing.cleaningFee) : fallbackSubtotal;
  const grossAmount = totalPrice > 0 ? totalPrice : subtotal + listing.cleaningFee;
  const commissionBps = resolveBookingCommissionBps({
    hostDefaultBookingCommissionBps: listing.host.defaultBookingCommissionBps,
    connectionBookingCommissionBps: listing.pmsConnection?.bookingCommissionBps,
  });
  const { serviceFee, hostPayout } = calculateBookingPricingFromGross(
    grossAmount,
    commissionBps
  );

  let bookingId = existingBooking?.id || null;

  if (existingBooking) {
    await db.$transaction(async (tx) => {
      await tx.blockedDate.deleteMany({
        where: {
          listingId: listing.id,
          source: "BOOKING",
          date: { gte: existingBooking.checkIn, lt: existingBooking.checkOut },
        },
      });

      await tx.booking.update({
        where: { id: existingBooking.id },
        data: {
          guestId,
          status: "CONFIRMED",
          checkIn: parsed.start,
          checkOut: effectiveEnd,
          numberOfDays,
          numberOfGuests: normalized.guests,
          subtotal,
          cleaningFee: listing.cleaningFee,
          serviceFee,
          totalPrice: grossAmount,
          hostPayout,
          pmsExternalReservationId: normalized.externalReservationId,
          pmsSyncStatus: "SYNCED",
          pmsSyncError: null,
          pmsLastSyncedAt: new Date(),
        },
      });

      for (const date of dates) {
        await tx.blockedDate.upsert({
          where: { listingId_date: { listingId: listing.id, date } },
          create: {
            listingId: listing.id,
            date,
            source: "BOOKING",
          },
          update: { source: "BOOKING" },
        });
      }
    });
  } else {
    const created = await db.booking.create({
      data: {
        guestId,
        listingId: listing.id,
        status: "CONFIRMED",
        checkIn: parsed.start,
        checkOut: effectiveEnd,
        numberOfDays,
        numberOfGuests: normalized.guests,
        subtotal,
        cleaningFee: listing.cleaningFee,
        serviceFee,
        totalPrice: grossAmount,
        hostPayout,
        pmsExternalReservationId: normalized.externalReservationId,
        pmsSyncStatus: "SYNCED",
        pmsSyncError: null,
        pmsLastSyncedAt: new Date(),
      },
      select: { id: true },
    });
    bookingId = created.id;

    for (const date of dates) {
      await db.blockedDate.upsert({
        where: { listingId_date: { listingId: listing.id, date } },
        create: {
          listingId: listing.id,
          date,
          source: "BOOKING",
        },
        update: { source: "BOOKING" },
      });
    }
  }

  await db.$transaction([
    db.listing.update({
      where: { id: listing.id },
      data: {
        pmsSyncStatus: "SYNCED",
        pmsSyncError: null,
        pmsLastSyncedAt: new Date(),
      },
    }),
    db.pmsSyncEvent.create({
      data: {
        connectionId,
        listingId: listing.id,
        bookingId: bookingId || undefined,
        direction: "INBOUND",
        action: "APALEO_RESERVATION_UPSERT",
        success: true,
        requestPayload: rawPayload as Prisma.InputJsonValue,
      },
    }),
  ]);

  return { processed: true, bookingId };
}

export async function applyInboundApaleoWebhook(
  connectionId: string,
  webhook: ApaleoReservationWebhook,
  rawPayload: JsonObject,
  useFixtures = false
) {
  const { db } = await getDb();

  if ((webhook.topic || "").toLowerCase() === "healthcheck") {
    await db.pmsSyncEvent.create({
      data: {
        connectionId,
        direction: "INBOUND",
        action: "APALEO_WEBHOOK_HEALTHCHECK",
        success: true,
        requestPayload: rawPayload as Prisma.InputJsonValue,
      },
    });
    return { processed: true, bookingId: null };
  }

  const connection = await getConnectionById(connectionId);
  if (!connection) {
    return { processed: false, reason: "CONNECTION_NOT_FOUND" };
  }

  const reservationId = webhook.data?.entityId;
  if (!reservationId) {
    return { processed: false, reason: "MISSING_RESERVATION_ID" };
  }

  const client = await buildAuthorizedApaleoClient(connection, useFixtures);
  const reservation = await client.getReservation(reservationId);

  return applyInboundApaleoReservationDetail(connectionId, reservation, rawPayload);
}

export async function setupApaleoSubscriptions(
  connectionId: string,
  input: { baseUrl?: string; useFixtures?: boolean } = {}
) {
  const { db } = await getDb();
  const connection = await getConnectionById(connectionId);
  if (!connection) throw new Error("Apaleo connection not found.");

  const listings = await db.listing.findMany({
    where: {
      pmsConnectionId: connectionId,
      pmsExternalPropertyId: { not: null },
      pmsExternalRatePlanId: { not: null },
    },
    select: {
      pmsExternalPropertyId: true,
      pmsExternalRatePlanId: true,
    },
  });

  const propertyToRatePlans = new Map<string, Set<string>>();
  for (const listing of listings) {
    const propertyId = listing.pmsExternalPropertyId || "";
    const ratePlanId = listing.pmsExternalRatePlanId || "";
    if (!propertyId || !ratePlanId) continue;
    if (!propertyToRatePlans.has(propertyId)) {
      propertyToRatePlans.set(propertyId, new Set());
    }
    propertyToRatePlans.get(propertyId)?.add(ratePlanId);
  }

  const webhookSecret = connection.apaleoWebhookSecret || crypto.randomUUID();
  const baseUrl = (input.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("Base URL is required to register apaleo subscriptions.");
  }

  const client = await buildAuthorizedApaleoClient(connection, Boolean(input.useFixtures));
  const webhookPayload = {
    endpointUrl: `${baseUrl}/api/pms/apaleo/webhooks?token=${encodeURIComponent(webhookSecret)}`,
    events: ["reservation.confirmed", "reservation.modified", "reservation.cancelled", "healthcheck"],
  };
  const webhookResponse = await client.createWebhookSubscription(webhookPayload);

  const ariState: Array<{ propertyId: string; subscriptionId: string; ratePlanIds: string[] }> = [];
  for (const [propertyId, ratePlanIds] of propertyToRatePlans.entries()) {
    const ariPayload = {
      propertyId,
      endpointUrl: `${baseUrl}/api/pms/apaleo/ari?token=${encodeURIComponent(webhookSecret)}`,
      ratePlanIds: Array.from(ratePlanIds),
    };
    const ariResponse = await client.createAriSubscription(ariPayload);
    const subscriptionId = String(ariResponse.id || `${propertyId}-subscription`);
    ariState.push({
      propertyId,
      subscriptionId,
      ratePlanIds: Array.from(ratePlanIds),
    });
  }

  await db.pmsConnection.update({
    where: { id: connectionId },
    data: {
      apaleoWebhookSecret: webhookSecret,
      apaleoWebhookSubscriptionId: String(webhookResponse.id || connection.apaleoWebhookSubscriptionId || ""),
      apaleoAriSubscriptionId: ariState[0]?.subscriptionId || connection.apaleoAriSubscriptionId,
      apaleoAriSubscriptionState: ariState as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    webhookSubscriptionId: String(webhookResponse.id || ""),
    ariSubscriptions: ariState,
  };
}

export async function fullResyncApaleoConnection(
  connectionId: string,
  input: { useFixtures?: boolean } = {}
) {
  const { db } = await getDb();
  const connection = await getConnectionById(connectionId);
  if (!connection) throw new Error("Apaleo connection not found.");

  const client = await buildAuthorizedApaleoClient(connection, Boolean(input.useFixtures));
  const [ariPayloads, reservations] = await Promise.all([
    client.getAriSnapshot(),
    client.listReservations(),
  ]);

  let ariProcessed = 0;
  let ariSkipped = 0;
  for (const payload of ariPayloads) {
    const result = await applyInboundApaleoAri(connectionId, payload, payload as unknown as JsonObject);
    ariProcessed += result.processed;
    ariSkipped += result.skipped;
  }

  let reservationsProcessed = 0;
  let reservationsSkipped = 0;
  for (const reservation of reservations) {
    const result = await applyInboundApaleoReservationDetail(
      connectionId,
      reservation,
      reservation as unknown as JsonObject
    );
    if (result.processed) reservationsProcessed += 1;
    else reservationsSkipped += 1;
  }

  await db.pmsSyncEvent.create({
    data: {
      connectionId,
      direction: "INBOUND",
      action: "APALEO_FULL_RESYNC",
      success: true,
      requestPayload: {
        ariPayloadCount: ariPayloads.length,
        reservationCount: reservations.length,
      },
      responsePayload: {
        ariProcessed,
        ariSkipped,
        reservationsProcessed,
        reservationsSkipped,
      },
    },
  });

  return {
    ariProcessed,
    ariSkipped,
    reservationsProcessed,
    reservationsSkipped,
  };
}
