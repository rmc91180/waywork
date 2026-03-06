import { formatISO } from "date-fns";
import { db } from "@/lib/db";
import { SiteMinderClient } from "@/lib/pms/siteminder-client";
import { escapeXml } from "@/lib/pms/siteminder-xml";
import { isSiteMinderProviderActive } from "@/lib/pms/provider-mode";

type BookingSyncAction = "UPSERT" | "CANCEL";

export interface BookingSyncResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

function formatDate(value: Date) {
  return value.toISOString().split("T")[0];
}

function buildReservationUploadXml(input: {
  booking: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    numberOfGuests: number;
    totalPrice: number;
    guest: { name: string | null; email: string };
    listing: {
      pmsExternalListingId: string | null;
      pmsExternalRatePlanId: string | null;
      title: string;
      currency: string;
    };
  };
  action: BookingSyncAction;
  hotelCode: string;
}) {
  const { booking, action, hotelCode } = input;
  const roomTypeCode = booking.listing.pmsExternalListingId || "";
  const ratePlanCode = booking.listing.pmsExternalRatePlanId || roomTypeCode || "STANDARD";
  const resStatus = action === "CANCEL" ? "Cancel" : "Book";

  const guestName = escapeXml(booking.guest.name || "WayWork Guest");
  const guestEmail = escapeXml(booking.guest.email);
  const listingTitle = escapeXml(booking.listing.title);
  const bookingId = escapeXml(booking.id);

  const totalAmount = Number((booking.totalPrice / 100).toFixed(2));
  const totalAmountText = totalAmount.toFixed(2);

  return `<OTA_HotelResNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="${formatISO(
    new Date()
  )}" Version="1.0">
  <HotelReservations HotelCode="${escapeXml(hotelCode)}">
    <HotelReservation ResStatus="${resStatus}">
      <UniqueID Type="14" ID="${bookingId}" />
      <RoomStays>
        <RoomStay>
          <RoomTypes>
            <RoomType RoomTypeCode="${escapeXml(roomTypeCode)}" />
          </RoomTypes>
          <RatePlans>
            <RatePlan RatePlanCode="${escapeXml(ratePlanCode)}" />
          </RatePlans>
          <RoomRates>
            <RoomRate RoomTypeCode="${escapeXml(roomTypeCode)}" RatePlanCode="${escapeXml(
    ratePlanCode
  )}">
              <Rates>
                <Rate EffectiveDate="${formatDate(booking.checkIn)}" ExpireDate="${formatDate(
    booking.checkOut
  )}">
                  <Base AmountAfterTax="${totalAmountText}" CurrencyCode="${escapeXml(
    booking.listing.currency
  )}" />
                </Rate>
              </Rates>
            </RoomRate>
          </RoomRates>
          <GuestCounts>
            <GuestCount Count="${booking.numberOfGuests}" />
          </GuestCounts>
          <TimeSpan Start="${formatDate(booking.checkIn)}" End="${formatDate(booking.checkOut)}" />
          <Total AmountAfterTax="${totalAmountText}" CurrencyCode="${escapeXml(
    booking.listing.currency
  )}" />
          <BasicPropertyInfo HotelCode="${escapeXml(hotelCode)}" />
        </RoomStay>
      </RoomStays>
      <ResGuests>
        <ResGuest>
          <Profiles>
            <ProfileInfo>
              <Profile ProfileType="1">
                <Customer>
                  <PersonName>
                    <GivenName>${guestName}</GivenName>
                  </PersonName>
                  <Email>${guestEmail}</Email>
                </Customer>
              </Profile>
            </ProfileInfo>
          </Profiles>
        </ResGuest>
      </ResGuests>
      <ResGlobalInfo>
        <Comments>
          <Comment>
            <Text>${listingTitle}</Text>
          </Comment>
        </Comments>
      </ResGlobalInfo>
    </HotelReservation>
  </HotelReservations>
</OTA_HotelResNotifRQ>`;
}

export async function syncBookingToSiteMinder(
  bookingId: string,
  action: BookingSyncAction
): Promise<BookingSyncResult> {
  if (!isSiteMinderProviderActive()) {
    return { ok: true, skipped: true };
  }

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
  if (!connection || !connection.enabled || connection.provider !== "SITEMINDER") {
    return { ok: true, skipped: true };
  }

  if (!booking.listing.pmsExternalListingId) {
    return { ok: false, error: "Listing is missing SiteMinder room mapping." };
  }

  if (!connection.siteminderClientId || !connection.siteminderClientSecret) {
    const message = "SiteMinder client credentials are missing.";
    await db.booking.update({
      where: { id: booking.id },
      data: {
        pmsSyncStatus: "FAILED",
        pmsSyncError: message,
      },
    });
    return { ok: false, error: message };
  }

  const hotelCode = connection.siteminderPropertyId || "WAYWORK";
  const bodyXml = buildReservationUploadXml({
    booking: {
      id: booking.id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      numberOfGuests: booking.numberOfGuests,
      totalPrice: booking.totalPrice,
      guest: {
        name: booking.guest.name,
        email: booking.guest.email,
      },
      listing: {
        pmsExternalListingId: booking.listing.pmsExternalListingId,
        pmsExternalRatePlanId: booking.listing.pmsExternalRatePlanId,
        title: booking.listing.title,
        currency: booking.listing.currency,
      },
    },
    action,
    hotelCode,
  });

  const client = new SiteMinderClient({
    endpointUrl: connection.siteminderApiBaseUrl,
    username: connection.siteminderClientId,
    password: connection.siteminderClientSecret,
  });

  try {
    const response = await client.uploadReservation(bodyXml);

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
          action: action === "CANCEL" ? "SITEMINDER_RES_UPLOAD_CANCEL" : "SITEMINDER_RES_UPLOAD_UPSERT",
          success: true,
          requestPayload: {
            hotelCode,
            bookingId: booking.id,
            roomTypeCode: booking.listing.pmsExternalListingId,
            ratePlanCode: booking.listing.pmsExternalRatePlanId,
            action,
          },
          responsePayload: {
            status: response.status,
            action: response.action,
            body: response.body.slice(0, 2000),
          },
        },
      }),
    ]);

    return { ok: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown SiteMinder reservation sync error";

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
          action: action === "CANCEL" ? "SITEMINDER_RES_UPLOAD_CANCEL" : "SITEMINDER_RES_UPLOAD_UPSERT",
          success: false,
          requestPayload: {
            hotelCode,
            bookingId: booking.id,
            action,
          },
          error: errorMessage,
        },
      }),
    ]);

    return { ok: false, error: errorMessage };
  }
}
