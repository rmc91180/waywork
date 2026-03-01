import { NextRequest, NextResponse } from "next/server";
import { addDays, differenceInDays } from "date-fns";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import {
  createInboundSyncEvent,
  dateRangeDays,
  extractMewsTokens,
  findMewsConnection,
  parseDateRange,
} from "@/lib/pms/mews-inbound";

interface ReservationMessage {
  externalReservationId: string;
  spaceTypeCode: string;
  startDate: string;
  endDate: string;
  state: string;
  guests: number;
  totalAmount: number;
  currencyCode: string;
  guestName: string;
  guestEmail: string;
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

function readNumber(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function normalizeReservations(payload: Record<string, unknown>): ReservationMessage[] {
  const directReservations = Array.isArray(payload.Reservations)
    ? payload.Reservations
    : Array.isArray(payload.reservations)
      ? payload.reservations
      : [];

  const group = asRecord(payload.Group) || asRecord(payload.group) || null;
  const groupedReservations = group
    ? Array.isArray(group.Reservations)
      ? group.Reservations
      : Array.isArray(group.reservations)
        ? group.reservations
        : []
    : [];

  const candidates = [...directReservations, ...groupedReservations];

  return candidates
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const guestRecord = asRecord(item.Guest) || asRecord(item.guest) || {};
      return {
        externalReservationId:
          readString(item, [
            "ExternalReservationId",
            "ReservationId",
            "Id",
            "id",
            "ChannelManagerBookingId",
          ]) || crypto.randomUUID(),
        spaceTypeCode: readString(item, ["SpaceTypeCode", "spaceTypeCode", "ResourceId"]),
        startDate: readString(item, ["StartDate", "startDate", "StartUtc"]),
        endDate: readString(item, ["EndDate", "endDate", "EndUtc"]),
        state: readString(item, ["State", "state", "ReservationState", "reservationState"]),
        guests: Math.max(
          1,
          Math.round(readNumber(item, ["NumberOfGuests", "numberOfGuests", "Adults"], 1))
        ),
        totalAmount: readNumber(item, ["TotalAmount", "totalAmount", "Amount"], 0),
        currencyCode: readString(item, ["CurrencyCode", "currencyCode"]) || "USD",
        guestName: readString(guestRecord, ["Name", "name"]) || "PMS Guest",
        guestEmail: readString(guestRecord, ["Email", "email"]),
      };
    })
    .filter((item) => item.spaceTypeCode && item.startDate && item.endDate);
}

async function findOrCreatePmsGuest(connectionId: string, reservation: ReservationMessage) {
  const fallbackEmail = `pms-${connectionId}-${reservation.externalReservationId}@waywork.local`;
  const email = reservation.guestEmail || fallbackEmail;

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

  const reservations = normalizeReservations(payload);
  if (reservations.length === 0) {
    await createInboundSyncEvent({
      connectionId: connection.id,
      action: "PROCESS_GROUP",
      success: true,
      messageId,
      requestPayload: payload,
      responsePayload: { processed: 0, skipped: 0 },
    });
    return NextResponse.json({ ok: true, processed: 0, skipped: 0 });
  }

  let processed = 0;
  let skipped = 0;

  for (const reservation of reservations) {
    const listing = await db.listing.findFirst({
      where: {
        pmsConnectionId: connection.id,
        pmsExternalListingId: reservation.spaceTypeCode,
      },
      select: {
        id: true,
        hostId: true,
      },
    });

    if (!listing) {
      skipped += 1;
      continue;
    }

    try {
      const parsed = parseDateRange(reservation.startDate, reservation.endDate);
      const effectiveEnd = parsed.end <= parsed.start ? addDays(parsed.start, 1) : parsed.end;
      const dates = dateRangeDays(parsed.start, effectiveEnd);
      const numberOfDays = Math.max(1, differenceInDays(effectiveEnd, parsed.start));
      const totalPrice = Math.max(0, Math.round(reservation.totalAmount * 100));
      const isCancelled = reservation.state.toLowerCase().includes("cancel");

      const existing = await db.booking.findFirst({
        where: {
          OR: [
            { pmsExternalReservationId: reservation.externalReservationId },
            {
              listingId: listing.id,
              pmsExternalReservationId: null,
              checkIn: parsed.start,
              checkOut: effectiveEnd,
              status: { in: ["PENDING", "CONFIRMED"] },
            },
          ],
        },
      });

      if (existing && isCancelled) {
        await db.$transaction([
          db.booking.update({
            where: { id: existing.id },
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
              date: {
                gte: existing.checkIn,
                lt: existing.checkOut,
              },
            },
          }),
        ]);
        processed += 1;
        continue;
      }

      if (isCancelled) {
        processed += 1;
        continue;
      }

      const guestId = await findOrCreatePmsGuest(connection.id, reservation);

      if (existing) {
        await db.$transaction(async (tx) => {
          await tx.blockedDate.deleteMany({
            where: {
              listingId: listing.id,
              source: "BOOKING",
              date: { gte: existing.checkIn, lt: existing.checkOut },
            },
          });

          await tx.booking.update({
            where: { id: existing.id },
            data: {
              guestId,
              checkIn: parsed.start,
              checkOut: effectiveEnd,
              numberOfDays,
              numberOfGuests: reservation.guests,
              subtotal: totalPrice,
              cleaningFee: 0,
              serviceFee: 0,
              totalPrice,
              hostPayout: totalPrice,
              status: "CONFIRMED",
              pmsExternalReservationId: reservation.externalReservationId,
              pmsSyncStatus: "SYNCED",
              pmsSyncError: null,
              pmsLastSyncedAt: new Date(),
            },
          });

          for (const date of dates) {
            await tx.blockedDate.upsert({
              where: {
                listingId_date: {
                  listingId: listing.id,
                  date,
                },
              },
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
            numberOfGuests: reservation.guests,
            subtotal: totalPrice,
            cleaningFee: 0,
            serviceFee: 0,
            totalPrice,
            hostPayout: totalPrice,
            pmsExternalReservationId: reservation.externalReservationId,
            pmsSyncStatus: "SYNCED",
            pmsSyncError: null,
            pmsLastSyncedAt: new Date(),
          },
        });

        for (const date of dates) {
          await db.blockedDate.upsert({
            where: {
              listingId_date: {
                listingId: listing.id,
                date,
              },
            },
            create: {
              listingId: listing.id,
              date,
              source: "BOOKING",
            },
            update: { source: "BOOKING" },
          });
        }

        await db.pmsSyncEvent.create({
          data: {
            connectionId: connection.id,
            listingId: listing.id,
            bookingId: created.id,
            direction: "INBOUND",
            action: "PROCESS_GROUP_IMPORTED_BOOKING",
            success: true,
            messageId: messageId || undefined,
            requestPayload: reservation as unknown as Prisma.InputJsonValue,
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
    } catch {
      skipped += 1;
    }
  }

  const responsePayload = { processed, skipped };
  await createInboundSyncEvent({
    connectionId: connection.id,
    action: "PROCESS_GROUP",
    success: true,
    messageId,
    requestPayload: payload,
    responsePayload,
  });

  return NextResponse.json({ ok: true, ...responsePayload });
}
