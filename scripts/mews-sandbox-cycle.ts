import "dotenv/config";
import http from "node:http";
import { addDays, differenceInDays, startOfDay } from "date-fns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { SERVICE_FEE_PERCENTAGE } from "../src/lib/stripe";
import { syncBookingToMews } from "../src/lib/pms/mews-sync";

type ReceivedRequest = {
  method: string;
  url: string;
  body: Record<string, unknown>;
};

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

async function startMockMewsServer(port: number) {
  const requests: ReceivedRequest[] = [];

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let body: Record<string, unknown> = {};
      if (raw.trim().length > 0) {
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          body = { raw };
        }
      }

      requests.push({
        method: req.method || "POST",
        url: req.url || "",
        body,
      });

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          Ok: true,
          MessageId: body.MessageId ?? null,
          EchoEndpoint: req.url || "",
        })
      );
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: ensureDatabaseUrl() });
  const prisma = new PrismaClient({ adapter });

  const mewsPort = 4010;
  const mewsBaseUrl = `http://127.0.0.1:${mewsPort}`;
  const mockServer = await startMockMewsServer(mewsPort);
  console.log(`[sandbox] mock Mews server started at ${mewsBaseUrl}`);

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
        provider: "MEWS",
        enabled: true,
        mewsApiBaseUrl: mewsBaseUrl,
        mewsClientToken: "sandbox-client-token",
        mewsConnectionToken: "sandbox-connection-token",
        mewsClientName: "WayWork Sandbox",
      },
    });

    const listing = await prisma.listing.create({
      data: {
        hostId: host.id,
        status: "ACTIVE",
        title: `Sandbox Mews Listing ${runId}`,
        description: "Sandbox listing for Mews booking cycle validation.",
        slug: `sandbox-mews-cycle-${runId}`,
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
        pmsExternalListingId: "SBX-SPACE-001",
        pmsExternalRatePlanId: "SBX-RATE-001",
      },
    });

    const checkInStr = "2026-06-01";
    const checkOutStr = "2026-06-04";
    const checkIn = parseDate(checkInStr);
    const checkOut = parseDate(checkOutStr);
    const numberOfDays = differenceInDays(checkOut, checkIn);
    const subtotal = listing.pricePerDay * numberOfDays;
    const grossBookingAmount = subtotal + listing.cleaningFee;
    const serviceFee = Math.round(grossBookingAmount * SERVICE_FEE_PERCENTAGE);
    const totalPrice = grossBookingAmount;
    const hostPayout = Math.max(0, grossBookingAmount - serviceFee);

    const booking = await prisma.booking.create({
      data: {
        guestId: guest.id,
        listingId: listing.id,
        status: "CONFIRMED",
        checkIn,
        checkOut,
        numberOfDays,
        numberOfGuests: 2,
        subtotal,
        cleaningFee: listing.cleaningFee,
        serviceFee,
        totalPrice,
        hostPayout,
      },
    });

    const blockDates = [0, 1, 2].map((offset) => addDays(startOfDay(checkIn), offset));
    for (const date of blockDates) {
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
        update: { source: "BOOKING" },
      });
    }

    console.log(`[sandbox] booking created: ${booking.id} (${checkInStr} -> ${checkOutStr})`);
    console.log("[sandbox] step 1: syncing booking confirmation (UPSERT) to Mews...");
    await syncBookingToMews(booking.id, "UPSERT");

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED_BY_GUEST" },
    });
    await prisma.blockedDate.deleteMany({
      where: {
        listingId: listing.id,
        source: "BOOKING",
        date: {
          gte: checkIn,
          lt: checkOut,
        },
      },
    });

    console.log("[sandbox] step 2: syncing booking cancellation (CANCEL) to Mews...");
    await syncBookingToMews(booking.id, "CANCEL");

    const finalBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: {
        id: true,
        status: true,
        pmsExternalReservationId: true,
        pmsSyncStatus: true,
        pmsSyncError: true,
        pmsLastSyncedAt: true,
      },
    });

    const syncEvents = await prisma.pmsSyncEvent.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
      select: {
        action: true,
        direction: true,
        success: true,
        messageId: true,
        createdAt: true,
      },
    });

    console.log("\n=== Sandbox Summary ===");
    console.log(`Listing ID: ${listing.id}`);
    console.log(`Booking ID: ${booking.id}`);
    console.log(`Connection ID: ${connection.id}`);
    console.log(`Final booking status: ${finalBooking?.status}`);
    console.log(`PMS reservation id: ${finalBooking?.pmsExternalReservationId}`);
    console.log(`PMS sync status: ${finalBooking?.pmsSyncStatus}`);
    console.log(`PMS last synced at: ${finalBooking?.pmsLastSyncedAt?.toISOString() ?? "n/a"}`);
    if (finalBooking?.pmsSyncError) {
      console.log(`PMS sync error: ${finalBooking.pmsSyncError}`);
    }

    console.log("\n=== Outbound requests captured by mock Mews ===");
    mockServer.requests.forEach((requestItem, index) => {
      const messageId =
        typeof requestItem.body.MessageId === "string"
          ? requestItem.body.MessageId
          : "n/a";
      const reservationState = Array.isArray(requestItem.body.Reservations)
        ? (requestItem.body.Reservations[0] as Record<string, unknown>)?.State
        : "n/a";
      console.log(
        `${index + 1}. ${requestItem.method} ${requestItem.url} | MessageId=${messageId} | State=${String(
          reservationState
        )}`
      );
    });

    console.log("\n=== PMS Sync Events ===");
    syncEvents.forEach((event, index) => {
      console.log(
        `${index + 1}. ${event.direction} ${event.action} success=${event.success} messageId=${
          event.messageId || "n/a"
        } at ${event.createdAt.toISOString()}`
      );
    });

    console.log(
      "\n[sandbox] complete. Use `npm run db:studio` and inspect Booking + PmsSyncEvent rows for this booking id."
    );
  } finally {
    await mockServer.close();
    await prisma.$disconnect();
    console.log("[sandbox] mock Mews server stopped.");
  }
}

main().catch((error) => {
  if (isDatabaseUnavailable(error)) {
    console.error(
      "[sandbox] database unavailable. Start a local DB first (example: `npm run db:bootstrap -- --skip-seed`) or set a reachable DATABASE_URL."
    );
  }
  console.error("[sandbox] failed:", error);
  process.exit(1);
});
