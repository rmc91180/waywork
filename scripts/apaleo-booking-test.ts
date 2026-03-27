import { strict as assert } from "node:assert";
import path from "node:path";
import { ApaleoClient } from "@/lib/pms/apaleo-client";
import { buildApaleoBookingPayload } from "@/lib/pms/apaleo-booking-payload";

async function run() {
  const payload = buildApaleoBookingPayload({
    bookingId: "booking-waywork-123",
    propertyId: "MADRID-CENTRO",
    ratePlanId: "RP-CENTRO-FLEX",
    checkIn: "2026-04-10",
    checkOut: "2026-04-12",
    numberOfGuests: 2,
    currency: "EUR",
    booker: {
      firstName: "Limehome",
      lastName: "Guest",
      email: "guest@example.com",
    },
    primaryGuest: {
      firstName: "Limehome",
      lastName: "Guest",
      email: "guest@example.com",
    },
    serviceFeeCents: 4800,
    totalPriceCents: 31800,
    specialRequests: "Quiet workspace if possible",
    nightlySlices: [
      { date: "2026-04-10", amountCents: 15900 },
      { date: "2026-04-11", amountCents: 15900 },
    ],
  });

  const client = new ApaleoClient({
    apiBaseUrl: "https://api.apaleo.com",
    identityBaseUrl: "https://identity.apaleo.com",
    clientId: "client-id-123",
    clientSecret: "client-secret-123",
    fixtureDir: path.join(process.cwd(), "scripts", "fixtures", "apaleo"),
  });

  const created = await client.createBooking(payload);
  const cancelled = await client.cancelReservation("reservation-123");

  const reservations = Array.isArray(payload.reservations)
    ? (payload.reservations as Array<Record<string, unknown>>)
    : [];
  const firstReservation = reservations[0] || {};
  const timeSlices = Array.isArray(firstReservation.timeSlices)
    ? (firstReservation.timeSlices as Array<Record<string, unknown>>)
    : [];

  assert.equal(payload.channelCode, "ChannelManager");
  assert.equal(payload.source, "Other");
  assert.equal(String(firstReservation.propertyId), "MADRID-CENTRO");
  assert.equal(String(firstReservation.externalId), "booking-waywork-123");
  assert.equal(timeSlices.length, 2);
  assert.equal(
    Number((timeSlices[0]?.totalAmount as { amount?: number }).amount || 0),
    159
  );
  assert.equal(
    Number(
      (
        (firstReservation.commission as {
          commissionAmount?: { amount?: number };
        })?.commissionAmount?.amount || 0
      )
    ),
    48
  );
  assert.equal(created.id, "booking-123");
  assert.equal(cancelled.status, "Canceled");

  console.log("[apaleo-booking] PASS");
  console.log("[apaleo-booking] Verified outbound booking payload build and cancellation fixture.");
}

run().catch((error) => {
  console.error("[apaleo-booking] FAIL", error);
  process.exit(1);
});
