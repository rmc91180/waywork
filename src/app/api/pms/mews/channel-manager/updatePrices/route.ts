import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import {
  createInboundSyncEvent,
  dateRangeDays,
  extractMewsTokens,
  findMewsConnection,
  parseDateRange,
} from "@/lib/pms/mews-inbound";
import { captureObservedError, createObservationContext, logObservation } from "@/lib/observability";
import { isMewsProviderActive } from "@/lib/pms/provider-mode";

interface PriceUpdate {
  spaceTypeCode: string;
  startDate: string;
  endDate: string;
  amount: number;
  currencyCode: string;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return Number.NaN;
}

function normalizePriceUpdates(payload: Record<string, unknown>): PriceUpdate[] {
  const containers = [payload.Prices, payload.prices, payload.Updates, payload.updates];
  for (const container of containers) {
    if (!Array.isArray(container)) continue;

    return container
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        spaceTypeCode: readString(item, ["SpaceTypeCode", "spaceTypeCode", "ResourceId"]),
        startDate: readString(item, ["StartDate", "From", "from", "StartUtc"]),
        endDate: readString(item, ["EndDate", "To", "to", "EndUtc"]),
        amount: readNumber(item, ["Amount", "amount", "Price", "price", "GrossAmount"]),
        currencyCode: readString(item, ["CurrencyCode", "currencyCode"]) || "USD",
      }))
      .filter(
        (item) =>
          item.spaceTypeCode &&
          item.startDate &&
          item.endDate &&
          Number.isFinite(item.amount) &&
          item.amount >= 0
      );
  }

  return [];
}

export async function POST(request: NextRequest) {
  if (!isMewsProviderActive()) {
    return NextResponse.json(
      { error: "Mews integration is disabled. SiteMinder inbound endpoints should be used." },
      { status: 410 }
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    const json = (await request.json()) as unknown;
    payload = asRecord(json) || {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const connection = await findMewsConnection(payload);
  const { messageId } = extractMewsTokens(payload);
  if (!connection) {
    return NextResponse.json({ error: "Unauthorized Mews connection" }, { status: 401 });
  }
  const routeContext = createObservationContext("api.pms.mews.inbound.updatePrices", {
    connectionId: connection.id,
    messageId,
  });

  const updates = normalizePriceUpdates(payload);
  if (updates.length === 0) {
    await createInboundSyncEvent({
      connectionId: connection.id,
      action: "UPDATE_PRICES",
      success: true,
      messageId,
      requestPayload: payload,
      responsePayload: { processed: 0, skipped: 0 },
    });
    logObservation("info", "Inbound price update received with no updates", routeContext);
    return NextResponse.json({ ok: true, processed: 0, skipped: 0 });
  }

  let processed = 0;
  let skipped = 0;

  for (const update of updates) {
    const listing = await db.listing.findFirst({
      where: {
        pmsConnectionId: connection.id,
        pmsExternalListingId: update.spaceTypeCode,
      },
      select: { id: true },
    });

    if (!listing) {
      skipped += 1;
      continue;
    }

    try {
      const parsed = parseDateRange(update.startDate, update.endDate);
      const effectiveEnd =
        parsed.end <= parsed.start ? addDays(parsed.start, 1) : parsed.end;
      const dates = dateRangeDays(parsed.start, effectiveEnd);

      if (dates.length === 0) {
        skipped += 1;
        continue;
      }

      const amountCents = Math.round(update.amount * 100);
      for (const date of dates) {
        await db.listingDailyRate.upsert({
          where: {
            listingId_date: {
              listingId: listing.id,
              date,
            },
          },
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

      processed += 1;
    } catch (error) {
      await db.listing.update({
        where: { id: listing.id },
        data: {
          pmsSyncStatus: "FAILED",
          pmsSyncError: "Failed to apply inbound price update.",
        },
      });
      captureObservedError({
        error,
        message: "Failed applying inbound price update",
        context: {
          ...routeContext,
          listingId: listing.id,
          spaceTypeCode: update.spaceTypeCode,
        },
      });
      skipped += 1;
    }
  }

  const responsePayload = { processed, skipped };
  await createInboundSyncEvent({
    connectionId: connection.id,
    action: "UPDATE_PRICES",
    success: true,
    messageId,
    requestPayload: payload,
    responsePayload,
  });
  logObservation("info", "Inbound price updates processed", {
    ...routeContext,
    processed,
    skipped,
  });

  return NextResponse.json({ ok: true, ...responsePayload });
}
