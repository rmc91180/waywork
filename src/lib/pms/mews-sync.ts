import { addDays, formatISO } from "date-fns";
import { db } from "@/lib/db";
import { MewsClient } from "@/lib/pms/mews-client";

type BookingSyncAction = "UPSERT" | "CANCEL";

export interface BookingSyncResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

function formatDate(value: Date) {
  return value.toISOString().split("T")[0];
}

function buildBookingProcessGroupPayload(
  booking: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    numberOfGuests: number;
    totalPrice: number;
    status: string;
    guest: { name: string | null; email: string };
    listing: {
      id: string;
      title: string;
      currency: string;
      pmsExternalListingId: string | null;
      pmsExternalRatePlanId: string | null;
    };
  },
  action: BookingSyncAction
) {
  return {
    MessageId: crypto.randomUUID(),
    TimestampUtc: formatISO(new Date()),
    Reservations: [
      {
        ChannelManagerBookingId: booking.id,
        State: action === "CANCEL" ? "Canceled" : "Confirmed",
        StartDate: formatDate(booking.checkIn),
        EndDate: formatDate(booking.checkOut),
        SpaceTypeCode: booking.listing.pmsExternalListingId || booking.listing.id,
        RatePlanCode:
          booking.listing.pmsExternalRatePlanId || booking.listing.pmsExternalListingId || booking.listing.id,
        CurrencyCode: booking.listing.currency,
        TotalAmount: Number((booking.totalPrice / 100).toFixed(2)),
        NumberOfGuests: booking.numberOfGuests,
        Guest: {
          Name: booking.guest.name || "WayWork Guest",
          Email: booking.guest.email,
        },
        Notes: booking.listing.title,
      },
    ],
  };
}

export async function syncBookingToMews(
  bookingId: string,
  action: BookingSyncAction
): Promise<BookingSyncResult> {
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

  if (!booking) return { ok: false, error: "Booking not found." };

  const connection = booking.listing.pmsConnection;
  if (!connection || !connection.enabled || connection.provider !== "MEWS") {
    return { ok: true, skipped: true };
  }

  if (!connection.mewsClientToken || !connection.mewsConnectionToken) {
    const message = "Mews client/connection token is missing.";
    await db.booking.update({
      where: { id: booking.id },
      data: {
        pmsSyncStatus: "FAILED",
        pmsSyncError: message,
        },
      });
    return { ok: false, error: message };
  }

  const client = new MewsClient({
    apiBaseUrl: connection.mewsApiBaseUrl,
    clientToken: connection.mewsClientToken,
    connectionToken: connection.mewsConnectionToken,
    accessToken: connection.mewsAccessToken,
    enterpriseId: connection.mewsEnterpriseId,
    clientName: connection.mewsClientName,
  });

  const requestPayload = buildBookingProcessGroupPayload(booking, action);

  try {
    const response = await client.processGroup(requestPayload);

    await db.$transaction([
      db.booking.update({
        where: { id: booking.id },
        data: {
          pmsExternalReservationId: booking.pmsExternalReservationId || booking.id,
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
          action: action === "CANCEL" ? "PROCESS_GROUP_CANCEL" : "PROCESS_GROUP_UPSERT",
          success: true,
          messageId: requestPayload.MessageId,
          requestPayload: requestPayload,
          responsePayload: response as object,
        },
      }),
    ]);
    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Mews sync error";
    await db.$transaction([
      db.booking.update({
        where: { id: booking.id },
        data: {
          pmsSyncStatus: "FAILED",
          pmsSyncError: errorMessage,
        },
      }),
      db.pmsSyncEvent.create({
        data: {
          connectionId: connection.id,
          listingId: booking.listingId,
          bookingId: booking.id,
          direction: "OUTBOUND",
          action: action === "CANCEL" ? "PROCESS_GROUP_CANCEL" : "PROCESS_GROUP_UPSERT",
          success: false,
          messageId: requestPayload.MessageId,
          requestPayload: requestPayload,
          error: errorMessage,
        },
      }),
    ]);
    return { ok: false, error: errorMessage };
  }
}

export async function requestAriSyncForConnection(connectionId: string) {
  const connection = await db.pmsConnection.findUnique({
    where: { id: connectionId },
    include: {
      listings: {
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
        select: { pmsExternalListingId: true },
      },
    },
  });

  if (!connection || !connection.enabled || connection.provider !== "MEWS") {
    throw new Error("Mews connection not found or disabled.");
  }
  if (!connection.mewsClientToken || !connection.mewsConnectionToken) {
    throw new Error("Mews client and connection token are required.");
  }

  const client = new MewsClient({
    apiBaseUrl: connection.mewsApiBaseUrl,
    clientToken: connection.mewsClientToken,
    connectionToken: connection.mewsConnectionToken,
    accessToken: connection.mewsAccessToken,
    enterpriseId: connection.mewsEnterpriseId,
    clientName: connection.mewsClientName,
  });

  const requestPayload = {
    MessageId: crypto.randomUUID(),
    Extent: {
      StartDate: formatDate(new Date()),
      EndDate: formatDate(addDays(new Date(), 365)),
    },
    SpaceTypeCodes: connection.listings
      .map((listing) => listing.pmsExternalListingId)
      .filter((value): value is string => Boolean(value)),
  };
  if (requestPayload.SpaceTypeCodes.length === 0) {
    throw new Error("Map at least one active listing to a Mews SpaceTypeCode before requesting ARI.");
  }

  try {
    const response = await client.requestAriUpdate(requestPayload);
    await db.pmsSyncEvent.create({
      data: {
        connectionId: connection.id,
        direction: "OUTBOUND",
        action: "REQUEST_ARI_UPDATE",
        success: true,
        messageId: requestPayload.MessageId,
        requestPayload,
        responsePayload: response as object,
      },
    });
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Mews ARI request error";
    await db.pmsSyncEvent.create({
      data: {
        connectionId: connection.id,
        direction: "OUTBOUND",
        action: "REQUEST_ARI_UPDATE",
        success: false,
        messageId: requestPayload.MessageId,
        requestPayload,
        error: errorMessage,
      },
    });
    throw error;
  }
}
