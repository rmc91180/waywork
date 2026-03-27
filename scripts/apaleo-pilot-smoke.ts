import fs from "node:fs";
import path from "node:path";
import { ApaleoClient, type ApaleoAriPayload, type ApaleoReservation } from "@/lib/pms/apaleo-client";
import { assessApaleoMadridListing } from "@/lib/pms/apaleo-curation";
import { buildApaleoMadridImportCandidates } from "@/lib/pms/apaleo-import";
import { buildApaleoBookingPayload } from "@/lib/pms/apaleo-booking-payload";
import { expandApaleoAriUpdates, normalizeApaleoReservationDetail } from "@/lib/pms/apaleo-sync";
import {
  calculateBookingPricingFromGross,
  resolveBookingCommissionBps,
} from "@/lib/payout-config";

function readFixture<T>(name: string) {
  const fixturePath = path.join(process.cwd(), "scripts", "fixtures", "apaleo", name);
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const fixtureDir = path.join(process.cwd(), "scripts", "fixtures", "apaleo");
  const client = new ApaleoClient({
    apiBaseUrl: "https://api.apaleo.com",
    identityBaseUrl: "https://identity.apaleo.com",
    clientId: "fixture-client",
    clientSecret: "fixture-secret",
    fixtureDir,
  });

  const [properties, unitGroups, ratePlans] = await Promise.all([
    client.listProperties(),
    client.listUnitGroups(),
    client.listRatePlans(),
  ]);

  const candidates = buildApaleoMadridImportCandidates({
    properties,
    unitGroups,
    ratePlans,
  });
  assert(candidates.length > 0, "Expected Madrid import candidates.");

  const representativeCandidate = candidates[0];
  const assessment = assessApaleoMadridListing({
    city: representativeCandidate.city,
    workspaceType: representativeCandidate.workspaceType,
    descriptionLength: 220,
    imageCount: 4,
    amenityCount: Math.max(5, representativeCandidate.amenities.length),
    maxGuests: representativeCandidate.maxGuests,
    pricePerDay: representativeCandidate.pricePerDay,
    hasKitchen: representativeCandidate.amenities.some((amenity) => amenity.category === "KITCHEN"),
    hasDesk: true,
    hasQuiet: true,
    hasPmsMapping: true,
    hasRatePlanMapping: true,
    downloadMbps: representativeCandidate.connectivity?.declaredDownloadMbps || 100,
    workScore: 84,
  });
  assert(assessment.curationStatus === "PUBLISHABLE", "Expected publishable curation assessment.");

  const ariUpdates = expandApaleoAriUpdates(readFixture<ApaleoAriPayload>("ari-update.json"));
  assert(ariUpdates.length === 2, "Expected ARI fixture to expand into two nightly updates.");

  const reservation = normalizeApaleoReservationDetail(
    readFixture<ApaleoReservation>("reservation-detail.json")
  );
  assert(reservation.externalReservationId === "reservation-123", "Unexpected reservation fixture.");

  const commissionBps = resolveBookingCommissionBps({
    hostDefaultBookingCommissionBps: 1500,
    connectionBookingCommissionBps: 1800,
  });
  const pricing = calculateBookingPricingFromGross(31_800, commissionBps);
  const payload = buildApaleoBookingPayload({
    bookingId: "booking-smoke-1",
    propertyId: "MADRID-CENTRO",
    ratePlanId: reservation.ratePlanId || "RP-CENTRO-FLEX",
    checkIn: reservation.startDate,
    checkOut: reservation.endDate,
    numberOfGuests: reservation.guests,
    currency: reservation.currencyCode,
    booker: {
      firstName: "Smoke",
      lastName: "Tester",
      email: "smoke@example.com",
    },
    primaryGuest: {
      firstName: "Smoke",
      lastName: "Tester",
      email: "smoke@example.com",
    },
    serviceFeeCents: pricing.serviceFee,
    totalPriceCents: pricing.totalPrice,
    nightlySlices: [
      { date: ariUpdates[0].startDate, amountCents: 15_900 },
      { date: ariUpdates[1].startDate, amountCents: 15_900 },
    ],
  });

  const reservations = Array.isArray((payload as { reservations?: unknown[] }).reservations)
    ? (payload as { reservations: unknown[] }).reservations
    : [];
  assert(reservations.length === 1, "Expected a single apaleo reservation payload.");

  console.log("[apaleo-pilot] PASS");
  console.log(
    `[apaleo-pilot] Verified ${candidates.length} Madrid candidates, ${ariUpdates.length} ARI updates, and booking payload commission at ${pricing.commissionPercent.toFixed(2)}%.`
  );
}

main().catch((error) => {
  console.error("[apaleo-pilot] FAIL", error);
  process.exit(1);
});
