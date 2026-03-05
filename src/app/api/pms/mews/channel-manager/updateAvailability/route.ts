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

interface AvailabilityUpdate {
  spaceTypeCode: string;
  startDate: string;
  endDate: string;
  availability: number;
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
  return 0;
}

function normalizeAvailabilityUpdates(payload: Record<string, unknown>): AvailabilityUpdate[] {
  const containers = [
    payload.Availabilities,
    payload.availabilities,
    payload.Updates,
    payload.updates,
  ];

  for (const container of containers) {
    if (!Array.isArray(container)) continue;

    return container
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        spaceTypeCode: readString(item, [
          "SpaceTypeCode",
          "spaceTypeCode",
          "ResourceId",
          "resourceId",
        ]),
        startDate: readString(item, ["StartDate", "From", "from", "StartUtc", "startUtc"]),
        endDate: readString(item, ["EndDate", "To", "to", "EndUtc", "endUtc"]),
        availability: readNumber(item, ["Availability", "availability", "RoomsAvailable"]),
      }))
      .filter((item) => item.spaceTypeCode && item.startDate && item.endDate);
  }

  return [];
}

export async function POST(request: NextRequest) {
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
  const routeContext = createObservationContext("api.pms.mews.inbound.updateAvailability", {
    connectionId: connection.id,
    messageId,
  });

  const updates = normalizeAvailabilityUpdates(payload);
  if (updates.length === 0) {
    await createInboundSyncEvent({
      connectionId: connection.id,
      action: "UPDATE_AVAILABILITY",
      success: true,
      messageId,
      requestPayload: payload,
      responsePayload: { processed: 0, skipped: 0 },
    });
    logObservation("info", "Inbound availability update received with no updates", routeContext);
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

      if (update.availability <= 0) {
        for (const date of dates) {
          await db.blockedDate.upsert({
            where: {
              listingId_date: { listingId: listing.id, date },
            },
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

      await db.listing.update({
        where: { id: listing.id },
        data: {
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
          pmsSyncError: "Failed to apply inbound availability update.",
        },
      });
      captureObservedError({
        error,
        message: "Failed applying inbound availability update",
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
    action: "UPDATE_AVAILABILITY",
    success: true,
    messageId,
    requestPayload: payload,
    responsePayload,
  });
  logObservation("info", "Inbound availability updates processed", {
    ...routeContext,
    processed,
    skipped,
  });

  return NextResponse.json({ ok: true, ...responsePayload });
}
