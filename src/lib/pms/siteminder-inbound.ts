import { addDays, differenceInDays, isBefore, startOfDay } from "date-fns";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import {
  calculateBookingPricingFromGross,
  resolveBookingCommissionBps,
} from "@/lib/payout-config";
import {
  extractWsseCredentials,
  parseSoapEnvelope,
  readAttr,
  readText,
  toArray,
} from "@/lib/pms/siteminder-xml";

type JsonObject = Record<string, unknown>;

export interface VerifiedSiteMinderPayload {
  connection: {
    id: string;
    userId: string;
    enabled: boolean;
    siteminderPropertyId: string | null;
    siteminderClientId: string | null;
    siteminderClientSecret: string | null;
    siteminderWebhookSecret: string | null;
  };
  header: JsonObject;
  body: JsonObject;
  wsse: { username: string; password: string };
}

export interface SiteMinderReservationMessage {
  hotelCode: string;
  externalReservationId: string;
  roomTypeCode: string;
  ratePlanCode: string | null;
  startDate: string;
  endDate: string;
  status: string;
  guests: number;
  totalAmount: number;
  currencyCode: string;
  guestName: string;
  guestEmail: string;
}

export interface SiteMinderAvailabilityMessage {
  hotelCode: string;
  roomTypeCode: string;
  ratePlanCode: string | null;
  startDate: string;
  endDate: string;
  availability: number;
}

export interface SiteMinderRateMessage {
  hotelCode: string;
  roomTypeCode: string;
  ratePlanCode: string | null;
  startDate: string;
  endDate: string;
  amount: number;
  currencyCode: string;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
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

function readNumber(value: unknown, fallback = Number.NaN) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeHotelCode(candidate: unknown) {
  const value = typeof candidate === "string" ? candidate.trim() : "";
  return value;
}

export function parseInboundSoap(rawXml: string) {
  const parsed = parseSoapEnvelope(rawXml);
  return {
    header: parsed.header,
    body: parsed.body,
  };
}

function extractHotelCodeFromReservationPayload(payload: JsonObject) {
  const hotelReservations = asObject(payload.HotelReservations);
  const reservation = asObject(toArray(hotelReservations.HotelReservation)[0]);
  const roomStay = asObject(toArray(asObject(reservation.RoomStays).RoomStay)[0]);
  const basicPropertyInfo = asObject(roomStay.BasicPropertyInfo);

  return (
    normalizeHotelCode(readAttr(hotelReservations, "HotelCode")) ||
    normalizeHotelCode(readAttr(payload, "HotelCode")) ||
    normalizeHotelCode(readAttr(basicPropertyInfo, "HotelCode"))
  );
}

function extractHotelCodeFromAvailabilityPayload(payload: JsonObject) {
  const messages = asObject(payload.AvailStatusMessages);
  return normalizeHotelCode(readAttr(messages, "HotelCode")) || normalizeHotelCode(readAttr(payload, "HotelCode"));
}

function extractHotelCodeFromRatePayload(payload: JsonObject) {
  const messages = asObject(payload.RateAmountMessages);
  return normalizeHotelCode(readAttr(messages, "HotelCode")) || normalizeHotelCode(readAttr(payload, "HotelCode"));
}

async function resolveConnection(input: {
  hotelCode: string;
  wsseUsername: string;
  wssePassword: string;
  webhookSecretHeader: string | null;
}) {
  let connection = null as null | {
    id: string;
    userId: string;
    enabled: boolean;
    siteminderPropertyId: string | null;
    siteminderClientId: string | null;
    siteminderClientSecret: string | null;
    siteminderWebhookSecret: string | null;
  };

  if (input.hotelCode) {
    connection = await db.pmsConnection.findFirst({
      where: {
        provider: "SITEMINDER",
        enabled: true,
        siteminderPropertyId: input.hotelCode,
      },
      select: {
        id: true,
        userId: true,
        enabled: true,
        siteminderPropertyId: true,
        siteminderClientId: true,
        siteminderClientSecret: true,
        siteminderWebhookSecret: true,
      },
    });
  }

  if (!connection && input.wsseUsername) {
    connection = await db.pmsConnection.findFirst({
      where: {
        provider: "SITEMINDER",
        enabled: true,
        siteminderClientId: input.wsseUsername,
      },
      select: {
        id: true,
        userId: true,
        enabled: true,
        siteminderPropertyId: true,
        siteminderClientId: true,
        siteminderClientSecret: true,
        siteminderWebhookSecret: true,
      },
    });
  }

  if (!connection) return null;

  const wsseVerified =
    Boolean(input.wsseUsername) &&
    Boolean(input.wssePassword) &&
    connection.siteminderClientId === input.wsseUsername &&
    connection.siteminderClientSecret === input.wssePassword;

  const secretVerified =
    Boolean(connection.siteminderWebhookSecret) &&
    Boolean(input.webhookSecretHeader) &&
    connection.siteminderWebhookSecret === input.webhookSecretHeader;

  if (!wsseVerified && !secretVerified) {
    return null;
  }

  return connection;
}

export async function verifySiteMinderInboundPayload(input: {
  header: JsonObject;
  body: JsonObject;
  webhookSecretHeader: string | null;
}) {
  const wsse = extractWsseCredentials(input.header);

  const reservationPayload = asObject(input.body.OTA_HotelResNotifRQ);
  const availabilityPayload = asObject(input.body.OTA_HotelAvailNotifRQ);
  const ratePayload = asObject(input.body.OTA_HotelRateAmountNotifRQ);

  const hotelCode =
    extractHotelCodeFromReservationPayload(reservationPayload) ||
    extractHotelCodeFromAvailabilityPayload(availabilityPayload) ||
    extractHotelCodeFromRatePayload(ratePayload);

  const connection = await resolveConnection({
    hotelCode,
    wsseUsername: wsse.username,
    wssePassword: wsse.password,
    webhookSecretHeader: input.webhookSecretHeader,
  });

  if (!connection) return null;

  return {
    connection,
    header: input.header,
    body: input.body,
    wsse,
  } satisfies VerifiedSiteMinderPayload;
}

export function normalizeSiteMinderReservations(body: JsonObject): SiteMinderReservationMessage[] {
  const payload = asObject(body.OTA_HotelResNotifRQ);
  const hotelReservations = asObject(payload.HotelReservations);
  const hotelCode =
    normalizeHotelCode(readAttr(hotelReservations, "HotelCode")) ||
    normalizeHotelCode(readAttr(payload, "HotelCode"));

  return toArray(hotelReservations.HotelReservation)
    .map((item) => asObject(item))
    .map((reservation) => {
      const roomStay = asObject(toArray(asObject(asObject(reservation.RoomStays).RoomStay))[0]);
      const roomType = asObject(toArray(asObject(roomStay.RoomTypes).RoomType)[0]);
      const roomRate = asObject(toArray(asObject(roomStay.RoomRates).RoomRate)[0]);
      const timeSpan = asObject(roomStay.TimeSpan);
      const uniqueIds = toArray(reservation.UniqueID).map((entry) => asObject(entry));
      const uniqueId =
        uniqueIds.find((entry) => readAttr(entry, "Type") === "14") || uniqueIds[0] || {};

      const guestCountEntries = toArray(asObject(roomStay.GuestCounts).GuestCount).map((entry) =>
        asObject(entry)
      );
      const guests = Math.max(
        1,
        guestCountEntries.reduce((sum, entry) => {
          const count = readNumber(readAttr(entry, "Count"), 0);
          return sum + (Number.isFinite(count) ? count : 0);
        }, 0)
      );

      const firstResGuest = asObject(toArray(asObject(reservation.ResGuests).ResGuest)[0]);
      const firstProfileInfo = asObject(toArray(asObject(firstResGuest.Profiles).ProfileInfo)[0]);
      const profile = asObject(firstProfileInfo.Profile);
      const customer = asObject(profile.Customer);
      const personName = asObject(customer.PersonName);

      const totalNode = asObject(roomStay.Total);
      const totalAmount = readNumber(readAttr(totalNode, "AmountAfterTax"), 0);

      return {
        hotelCode,
        externalReservationId: readAttr(uniqueId, "ID") || crypto.randomUUID(),
        roomTypeCode:
          readAttr(roomType, "RoomTypeCode") || readAttr(roomRate, "RoomTypeCode"),
        ratePlanCode: readAttr(roomRate, "RatePlanCode") || null,
        startDate: readAttr(timeSpan, "Start"),
        endDate: readAttr(timeSpan, "End"),
        status: readAttr(reservation, "ResStatus") || "Book",
        guests,
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
        currencyCode: readAttr(totalNode, "CurrencyCode") || "USD",
        guestName: [readText(personName, "GivenName"), readText(personName, "Surname")]
          .filter(Boolean)
          .join(" ") || "PMS Guest",
        guestEmail: readText(customer, "Email"),
      } satisfies SiteMinderReservationMessage;
    })
    .filter((item) => item.roomTypeCode && item.startDate && item.endDate);
}

export function normalizeSiteMinderAvailability(body: JsonObject): SiteMinderAvailabilityMessage[] {
  const payload = asObject(body.OTA_HotelAvailNotifRQ);
  const messagesNode = asObject(payload.AvailStatusMessages);
  const hotelCode =
    normalizeHotelCode(readAttr(messagesNode, "HotelCode")) ||
    normalizeHotelCode(readAttr(payload, "HotelCode"));

  return toArray(messagesNode.AvailStatusMessage)
    .map((entry) => asObject(entry))
    .map((message) => {
      const control = asObject(message.StatusApplicationControl);
      const restriction = asObject(message.RestrictionStatus);
      const bookingLimit = readNumber(readAttr(message, "BookingLimit"), Number.NaN);
      const restrictionStatus = readAttr(restriction, "Status").toLowerCase();

      let availability = 1;
      if (restrictionStatus === "close") {
        availability = 0;
      } else if (Number.isFinite(bookingLimit)) {
        availability = bookingLimit <= 0 ? 0 : Math.round(bookingLimit);
      }

      return {
        hotelCode,
        roomTypeCode: readAttr(control, "InvTypeCode") || readAttr(control, "RoomTypeCode"),
        ratePlanCode: readAttr(control, "RatePlanCode") || null,
        startDate: readAttr(control, "Start"),
        endDate: readAttr(control, "End"),
        availability,
      } satisfies SiteMinderAvailabilityMessage;
    })
    .filter((item) => item.roomTypeCode && item.startDate && item.endDate);
}

export function normalizeSiteMinderRates(body: JsonObject): SiteMinderRateMessage[] {
  const payload = asObject(body.OTA_HotelRateAmountNotifRQ);
  const messagesNode = asObject(payload.RateAmountMessages);
  const hotelCode =
    normalizeHotelCode(readAttr(messagesNode, "HotelCode")) ||
    normalizeHotelCode(readAttr(payload, "HotelCode"));

  return toArray(messagesNode.RateAmountMessage)
    .map((entry) => asObject(entry))
    .flatMap((message) => {
      const control = asObject(message.StatusApplicationControl);
      const roomTypeCode = readAttr(control, "InvTypeCode") || readAttr(control, "RoomTypeCode");
      const ratePlanCode = readAttr(control, "RatePlanCode") || null;
      const startDate = readAttr(control, "Start");
      const endDate = readAttr(control, "End");

      const rates = toArray(asObject(message.Rates).Rate);
      if (rates.length === 0) {
        return [];
      }

      return rates
        .map((rateEntry) => asObject(rateEntry))
        .map((rateEntry) => {
          const baseNode = asObject(
            toArray(asObject(asObject(rateEntry.BaseByGuestAmts).BaseByGuestAmt))[0]
          );
          const amount =
            readNumber(readAttr(baseNode, "AmountAfterTax"), Number.NaN) ||
            readNumber(readAttr(baseNode, "AmountBeforeTax"), Number.NaN);

          return {
            hotelCode,
            roomTypeCode,
            ratePlanCode,
            startDate,
            endDate,
            amount,
            currencyCode: readAttr(baseNode, "CurrencyCode") || "USD",
          } satisfies SiteMinderRateMessage;
        })
        .filter((item) => Number.isFinite(item.amount));
    })
    .filter((item) => item.roomTypeCode && item.startDate && item.endDate);
}

async function findOrCreateGuest(connectionId: string, reservation: SiteMinderReservationMessage) {
  const email = reservation.guestEmail || `siteminder-${connectionId}-${reservation.externalReservationId}@waywork.local`;

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

export async function applyInboundSiteMinderReservation(
  connectionId: string,
  reservation: SiteMinderReservationMessage,
  rawPayload: JsonObject
) {
  const listing = await db.listing.findFirst({
    where: {
      pmsConnectionId: connectionId,
      pmsExternalListingId: reservation.roomTypeCode,
    },
    select: {
      id: true,
      pricePerDay: true,
      cleaningFee: true,
      currency: true,
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

  const parsed = parseDateRange(reservation.startDate, reservation.endDate);
  const effectiveEnd = parsed.end <= parsed.start ? addDays(parsed.start, 1) : parsed.end;
  const dates = dateRangeDays(parsed.start, effectiveEnd);
  const numberOfDays = Math.max(1, differenceInDays(effectiveEnd, parsed.start));

  const totalPrice = Math.max(
    0,
    Math.round((Number.isFinite(reservation.totalAmount) ? reservation.totalAmount : 0) * 100)
  );
  const isCancelled = reservation.status.toLowerCase().includes("cancel");

  const existingBooking = await db.booking.findFirst({
    where: {
      OR: [
        { pmsExternalReservationId: reservation.externalReservationId },
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
      subtotal: true,
      cleaningFee: true,
      serviceFee: true,
      totalPrice: true,
      hostPayout: true,
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
          action: "SITEMINDER_RESERVATION_CANCEL",
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

  const guestId = await findOrCreateGuest(connectionId, reservation);
  const fallbackSubtotal = listing.pricePerDay * numberOfDays;
  const subtotal = totalPrice > 0 ? Math.max(0, totalPrice - listing.cleaningFee) : fallbackSubtotal;
  const grossAmount = totalPrice > 0 ? totalPrice : subtotal + listing.cleaningFee;
  const commissionBps = resolveBookingCommissionBps({
    hostDefaultBookingCommissionBps: listing.host.defaultBookingCommissionBps,
    connectionBookingCommissionBps: listing.pmsConnection?.bookingCommissionBps,
  });
  const { serviceFee, hostPayout } = calculateBookingPricingFromGross(grossAmount, commissionBps);

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
          numberOfGuests: reservation.guests,
          subtotal,
          cleaningFee: listing.cleaningFee,
          serviceFee,
          totalPrice: grossAmount,
          hostPayout,
          pmsExternalReservationId: reservation.externalReservationId,
          pmsSyncStatus: "SYNCED",
          pmsSyncError: null,
          pmsLastSyncedAt: new Date(),
        },
      });

      for (const date of dates) {
        await tx.blockedDate.upsert({
          where: {
            listingId_date: { listingId: listing.id, date },
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
        subtotal,
        cleaningFee: listing.cleaningFee,
        serviceFee,
        totalPrice: grossAmount,
        hostPayout,
        pmsExternalReservationId: reservation.externalReservationId,
        pmsSyncStatus: "SYNCED",
        pmsSyncError: null,
        pmsLastSyncedAt: new Date(),
      },
      select: { id: true },
    });

    bookingId = created.id;

    for (const date of dates) {
      await db.blockedDate.upsert({
        where: {
          listingId_date: { listingId: listing.id, date },
        },
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
        action: "SITEMINDER_RESERVATION_UPSERT",
        success: true,
        requestPayload: rawPayload as Prisma.InputJsonValue,
      },
    }),
  ]);

  return { processed: true, bookingId };
}

export async function applyInboundSiteMinderAvailability(
  connectionId: string,
  update: SiteMinderAvailabilityMessage,
  rawPayload: JsonObject
) {
  const listing = await db.listing.findFirst({
    where: {
      pmsConnectionId: connectionId,
      pmsExternalListingId: update.roomTypeCode,
    },
    select: { id: true },
  });

  if (!listing) {
    return { processed: false, reason: "LISTING_NOT_MAPPED" };
  }

  const parsed = parseDateRange(update.startDate, update.endDate);
  const effectiveEnd = addDays(parsed.end, 1);
  const dates = dateRangeDays(parsed.start, effectiveEnd);

  if (update.availability <= 0) {
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
        direction: "INBOUND",
        action: "SITEMINDER_AVAILABILITY_UPDATE",
        success: true,
        requestPayload: rawPayload as Prisma.InputJsonValue,
      },
    }),
  ]);

  return { processed: true, listingId: listing.id };
}

export async function applyInboundSiteMinderRate(
  connectionId: string,
  rate: SiteMinderRateMessage,
  rawPayload: JsonObject
) {
  const listing = await db.listing.findFirst({
    where: {
      pmsConnectionId: connectionId,
      pmsExternalListingId: rate.roomTypeCode,
    },
    select: { id: true },
  });

  if (!listing) {
    return { processed: false, reason: "LISTING_NOT_MAPPED" };
  }

  const parsed = parseDateRange(rate.startDate, rate.endDate);
  const effectiveEnd = addDays(parsed.end, 1);
  const dates = dateRangeDays(parsed.start, effectiveEnd);
  const amountCents = Math.max(0, Math.round(rate.amount * 100));

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
        currency: rate.currencyCode,
        source: "PMS",
      },
      update: {
        pricePerDay: amountCents,
        currency: rate.currencyCode,
        source: "PMS",
      },
    });
  }

  await db.$transaction([
    db.listing.update({
      where: { id: listing.id },
      data: {
        pricePerDay: amountCents,
        currency: rate.currencyCode,
        pmsSyncStatus: "SYNCED",
        pmsSyncError: null,
        pmsLastSyncedAt: new Date(),
      },
    }),
    db.pmsSyncEvent.create({
      data: {
        connectionId,
        listingId: listing.id,
        direction: "INBOUND",
        action: "SITEMINDER_RATE_UPDATE",
        success: true,
        requestPayload: rawPayload as Prisma.InputJsonValue,
      },
    }),
  ]);

  return { processed: true, listingId: listing.id };
}
