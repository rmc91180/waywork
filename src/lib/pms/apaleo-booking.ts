import { differenceInDays } from "date-fns";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { ApaleoClient } from "@/lib/pms/apaleo-client";
import {
  buildApaleoBookingPayload,
  type BookingRateSlice,
} from "@/lib/pms/apaleo-booking-payload";
import { decryptApaleoSecret, encryptApaleoSecret } from "@/lib/pms/apaleo-crypto";
import { isApaleoProviderActive } from "@/lib/pms/provider-mode";

type BookingSyncAction = "UPSERT" | "CANCEL";

export interface BookingSyncResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

function formatDate(value: Date) {
  return value.toISOString().split("T")[0];
}

function splitName(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return { firstName: "WayWork", lastName: "Guest" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Guest" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] || "Guest",
  };
}

function distributeExtraAcrossNights(totalCents: number, nightCount: number) {
  if (nightCount <= 0 || totalCents <= 0) {
    return Array.from({ length: Math.max(0, nightCount) }, () => 0);
  }

  const base = Math.floor(totalCents / nightCount);
  let remainder = totalCents % nightCount;

  return Array.from({ length: nightCount }, () => {
    const value = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return value;
  });
}

async function buildAuthorizedApaleoClient(connection: {
  id: string;
  apaleoApiBaseUrl: string;
  apaleoIdentityBaseUrl: string;
  apaleoClientId: string | null;
  apaleoClientSecret: string | null;
  apaleoRefreshToken: string | null;
}) {
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

async function getNightlyRateSlices(input: {
  listingId: string;
  checkIn: Date;
  checkOut: Date;
  basePricePerDay: number;
  cleaningFee: number;
}) {
  const nightCount = Math.max(1, differenceInDays(input.checkOut, input.checkIn));
  const nightlyDates = Array.from({ length: nightCount }, (_, index) => {
    const current = new Date(input.checkIn);
    current.setUTCDate(current.getUTCDate() + index);
    return current;
  });

  const dailyRates = await db.listingDailyRate.findMany({
    where: {
      listingId: input.listingId,
      date: { in: nightlyDates },
    },
    select: {
      date: true,
      pricePerDay: true,
    },
  });

  const rateMap = new Map(
    dailyRates.map((rate) => [rate.date.toISOString().split("T")[0], rate.pricePerDay])
  );
  const cleaningAllocations = distributeExtraAcrossNights(input.cleaningFee, nightCount);

  return nightlyDates.map((date, index) => {
    const key = date.toISOString().split("T")[0];
    const nightlyBase = rateMap.get(key) ?? input.basePricePerDay;
    return {
      date: key,
      amountCents: nightlyBase + (cleaningAllocations[index] || 0),
    } satisfies BookingRateSlice;
  });
}

async function getApaleoBookingContext(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      guest: {
        select: { name: true, email: true },
      },
      listing: {
        include: {
          pmsConnection: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const connection = booking.listing.pmsConnection;
  if (!connection || !connection.enabled || connection.provider !== "APALEO") {
    throw new Error("Listing is not connected to an active apaleo PMS connection.");
  }
  if (!booking.listing.pmsExternalPropertyId || !booking.listing.pmsExternalRatePlanId) {
    throw new Error("Listing is missing apaleo property or rate plan mapping.");
  }

  return { booking, connection };
}

function extractReservationId(response: Record<string, Prisma.JsonValue>, fallback: string) {
  const reservations = Array.isArray(response.reservations)
    ? (response.reservations as Prisma.JsonValue[])
    : [];
  const firstReservation = reservations[0];

  if (
    firstReservation &&
    typeof firstReservation === "object" &&
    !Array.isArray(firstReservation) &&
    typeof firstReservation.id === "string"
  ) {
    return firstReservation.id;
  }

  return fallback;
}

async function markApaleoSyncFailure(input: {
  bookingId: string;
  connectionId: string;
  listingId: string;
  action: string;
  errorMessage: string;
  requestPayload?: Prisma.InputJsonValue;
}) {
  await db.$transaction([
    db.booking.update({
      where: { id: input.bookingId },
      data: {
        pmsSyncStatus: "FAILED",
        pmsSyncError: input.errorMessage,
      },
    }),
    db.pmsSyncEvent.create({
      data: {
        connectionId: input.connectionId,
        listingId: input.listingId,
        bookingId: input.bookingId,
        direction: "OUTBOUND",
        action: input.action,
        success: false,
        requestPayload: input.requestPayload,
        error: input.errorMessage,
      },
    }),
  ]);
}

export async function syncBookingToApaleo(
  bookingId: string,
  action: BookingSyncAction
): Promise<BookingSyncResult> {
  if (!isApaleoProviderActive()) {
    return { ok: true, skipped: true };
  }

  try {
    const { booking, connection } = await getApaleoBookingContext(bookingId);
    const client = await buildAuthorizedApaleoClient(connection);

    if (action === "CANCEL") {
      if (!booking.pmsExternalReservationId) {
        return { ok: true, skipped: true };
      }

      await client.cancelReservation(booking.pmsExternalReservationId);

      await db.$transaction([
        db.booking.update({
          where: { id: booking.id },
          data: {
            pmsSyncStatus: "SYNCED",
            pmsSyncError: null,
            pmsLastSyncedAt: new Date(),
          },
        }),
        db.listing.update({
          where: { id: booking.listingId },
          data: {
            pmsSyncStatus: "SYNCED",
            pmsSyncError: null,
            pmsLastSyncedAt: new Date(),
          },
        }),
        db.pmsSyncEvent.create({
          data: {
            connectionId: connection.id,
            listingId: booking.listingId,
            bookingId: booking.id,
            direction: "OUTBOUND",
            action: "APALEO_BOOKING_CANCEL",
            success: true,
            requestPayload: {
              reservationId: booking.pmsExternalReservationId,
            },
          },
        }),
      ]);

      return { ok: true };
    }

    if (booking.pmsExternalReservationId) {
      return { ok: true, skipped: true };
    }

    const guestIdentity = splitName(booking.guest.name);
    const nightlySlices = await getNightlyRateSlices({
      listingId: booking.listingId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      basePricePerDay: booking.listing.pricePerDay,
      cleaningFee: booking.cleaningFee,
    });

    const payload = buildApaleoBookingPayload({
      bookingId: booking.id,
      propertyId: booking.listing.pmsExternalPropertyId || "",
      ratePlanId: booking.listing.pmsExternalRatePlanId || "",
      checkIn: formatDate(booking.checkIn),
      checkOut: formatDate(booking.checkOut),
      numberOfGuests: booking.numberOfGuests,
      currency: booking.listing.currency,
      booker: {
        ...guestIdentity,
        email: booking.guest.email,
      },
      primaryGuest: {
        ...guestIdentity,
        email: booking.guest.email,
      },
      serviceFeeCents: booking.serviceFee,
      totalPriceCents: booking.totalPrice,
      specialRequests: booking.specialRequests,
      nightlySlices,
    });

    const response = await client.createBooking(payload);
    const reservationId = extractReservationId(response, booking.id);

    await db.$transaction([
      db.booking.update({
        where: { id: booking.id },
        data: {
          pmsExternalReservationId: reservationId,
          pmsSyncStatus: "SYNCED",
          pmsSyncError: null,
          pmsLastSyncedAt: new Date(),
        },
      }),
      db.listing.update({
        where: { id: booking.listingId },
        data: {
          pmsSyncStatus: "SYNCED",
          pmsSyncError: null,
          pmsLastSyncedAt: new Date(),
        },
      }),
      db.pmsSyncEvent.create({
        data: {
          connectionId: connection.id,
          listingId: booking.listingId,
          bookingId: booking.id,
          direction: "OUTBOUND",
          action: "APALEO_BOOKING_UPSERT",
          success: true,
          requestPayload: payload,
          responsePayload: response as Prisma.InputJsonValue,
        },
      }),
    ]);

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown apaleo booking sync error";

    const fallback = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        listingId: true,
        listing: {
          select: {
            pmsConnectionId: true,
          },
        },
      },
    });

    if (fallback?.listing.pmsConnectionId) {
      await markApaleoSyncFailure({
        bookingId: fallback.id,
        connectionId: fallback.listing.pmsConnectionId,
        listingId: fallback.listingId,
        action: action === "CANCEL" ? "APALEO_BOOKING_CANCEL" : "APALEO_BOOKING_UPSERT",
        errorMessage,
      });
    }

    return { ok: false, error: errorMessage };
  }
}

export async function isApaleoManagedListing(listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      pmsConnection: {
        select: {
          provider: true,
          enabled: true,
        },
      },
    },
  });

  return Boolean(
    listing?.pmsConnection?.enabled && listing.pmsConnection.provider === "APALEO"
  );
}
