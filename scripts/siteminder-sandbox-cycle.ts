import "dotenv/config";
import { addDays, differenceInDays } from "date-fns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { calculatePricing } from "../src/lib/stripe";

function isDatabaseUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "P1001" || candidate.message?.includes("Can't reach database server");
}

function ensureDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  return url;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: ensureDatabaseUrl() });
  const prisma = new PrismaClient({ adapter });

  try {
    const runId = Date.now().toString();
    const hostEmail = `sandbox-host-${runId}@waywork.local`;
    const guestEmail = `sandbox-guest-${runId}@waywork.local`;

    const host = await prisma.user.create({
      data: {
        email: hostEmail,
        name: "Sandbox Host",
        role: "HOST",
      },
    });

    const guest = await prisma.user.create({
      data: {
        email: guestEmail,
        name: "Sandbox Guest",
        role: "GUEST",
      },
    });

    const connection = await prisma.pmsConnection.create({
      data: {
        userId: host.id,
        provider: "SITEMINDER",
        enabled: true,
        siteminderApiBaseUrl: process.env.SITEMINDER_API_BASE_URL || "https://api.siteminder.com",
        siteminderClientId: process.env.SITEMINDER_CLIENT_ID || "sandbox-client-id",
        siteminderClientSecret: process.env.SITEMINDER_CLIENT_SECRET || "sandbox-client-secret",
        siteminderPropertyId: process.env.SITEMINDER_PROPERTY_ID || `sandbox-property-${runId}`,
      },
    });

    const listing = await prisma.listing.create({
      data: {
        hostId: host.id,
        status: "ACTIVE",
        title: `Sandbox SiteMinder Listing ${runId}`,
        description: "Sandbox listing for SiteMinder booking cycle validation.",
        slug: `sandbox-siteminder-cycle-${runId}`,
        workspaceType: "PRIVATE_OFFICE",
        address: "1 Sandbox Lane",
        city: "Sandbox City",
        state: "SB",
        country: "US",
        postalCode: "00000",
        lat: 37.77,
        lng: -122.41,
        maxGuests: 4,
        bedroomCount: 1,
        bedSize: "QUEEN",
        propertySizeSqm: 55,
        pricePerDay: 12000,
        cleaningFee: 2500,
        currency: "USD",
        cancellationPolicy: "MODERATE",
        pmsConnectionId: connection.id,
        pmsExternalListingId: "SM-ROOM-001",
        pmsExternalRatePlanId: "SM-RATE-001",
      },
    });

    const checkIn = parseDate("2026-06-01");
    const checkOut = parseDate("2026-06-04");
    const numberOfDays = differenceInDays(checkOut, checkIn);
    const pricing = calculatePricing(listing.pricePerDay, numberOfDays, listing.cleaningFee);

    const booking = await prisma.booking.create({
      data: {
        guestId: guest.id,
        listingId: listing.id,
        status: "CONFIRMED",
        checkIn,
        checkOut,
        numberOfDays,
        numberOfGuests: 2,
        subtotal: pricing.subtotal,
        cleaningFee: pricing.cleaningFee,
        serviceFee: pricing.serviceFee,
        totalPrice: pricing.totalPrice,
        hostPayout: pricing.hostPayout,
      },
    });

    for (let offset = 0; offset < numberOfDays; offset += 1) {
      const date = addDays(checkIn, offset);
      await prisma.blockedDate.upsert({
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
        update: {
          source: "BOOKING",
        },
      });
    }

    await prisma.pmsSyncEvent.create({
      data: {
        connectionId: connection.id,
        listingId: listing.id,
        bookingId: booking.id,
        direction: "OUTBOUND",
        action: "SITEMINDER_SANDBOX_BOOKING_EXPORT",
        success: true,
        requestPayload: {
          bookingId: booking.id,
          listingExternalId: listing.pmsExternalListingId,
          ratePlanExternalId: listing.pmsExternalRatePlanId,
        },
      },
    });

    await prisma.pmsSyncEvent.create({
      data: {
        connectionId: connection.id,
        listingId: listing.id,
        bookingId: booking.id,
        direction: "INBOUND",
        action: "SITEMINDER_SANDBOX_BOOKING_CONFIRM",
        success: true,
        responsePayload: {
          bookingId: booking.id,
          status: "CONFIRMED",
        },
      },
    });

    console.log("\n=== SiteMinder Sandbox Summary ===");
    console.log(`Host ID: ${host.id}`);
    console.log(`Listing ID: ${listing.id}`);
    console.log(`Connection ID: ${connection.id}`);
    console.log(`Booking ID: ${booking.id}`);
    console.log(`Guest total charged: ${pricing.totalPrice} cents`);
    console.log(`Way Work commission (15%): ${pricing.serviceFee} cents`);
    console.log(`Host payout (net): ${pricing.hostPayout} cents`);
    console.log("\nCycle validation:");
    console.log("1. Host + SiteMinder connection created");
    console.log("2. Listing created and mapped with external IDs");
    console.log("3. Booking created and dates blocked");
    console.log("4. Outbound + inbound sync events logged");
    console.log("\nUse `npm run db:studio` to inspect Booking, BlockedDate, and PmsSyncEvent rows.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  if (isDatabaseUnavailable(error)) {
    console.error(
      "[siteminder-sandbox] database unavailable. Start a local DB first (example: `npm run db:bootstrap -- --skip-seed`) or set a reachable DATABASE_URL."
    );
  }
  console.error("[siteminder-sandbox] failed:", error);
  process.exit(1);
});
