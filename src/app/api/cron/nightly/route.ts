import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReviewPrompt } from "@/lib/email";

/**
 * GET /api/cron/nightly
 *
 * Runs once per day. Two jobs:
 *  1. Mark CONFIRMED bookings as COMPLETED once checkOut date has passed.
 *  2. Send a review prompt email to the guest for each newly-completed booking.
 *
 * Railway cron setup:
 *  Schedule: 0 3 * * *   (3 AM daily — after midnight in most EU/US timezones)
 *  Command:
 *    curl -sf -o /dev/null \
 *      -H "Authorization: Bearer $CRON_SECRET" \
 *      https://waywork-production.up.railway.app/api/cron/nightly
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!cronSecret || !token || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results = { completed: 0, reviewEmailsSent: 0, errors: 0 };

  try {
    // Find CONFIRMED bookings whose checkOut date is in the past
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const overdueBookings = await db.booking.findMany({
      where: {
        status: "CONFIRMED",
        checkOut: { lte: yesterday },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        review: { select: { id: true } },
      },
    });

    for (const booking of overdueBookings) {
      try {
        // Mark completed
        await db.booking.update({
          where: { id: booking.id },
          data: { status: "COMPLETED" },
        });
        results.completed++;

        // Send review prompt if guest has email and hasn't reviewed yet
        if (booking.guest?.email && !booking.review) {
          await sendReviewPrompt({
            guestName: booking.guest.name ?? "Guest",
            guestEmail: booking.guest.email,
            listingTitle: booking.listing.title,
            listingCity: booking.listing.city,
            bookingId: booking.id,
            listingId: booking.listing.id,
          });
          results.reviewEmailsSent++;
        }
      } catch (err) {
        console.error(`[cron/nightly] Failed to complete booking ${booking.id}:`, err);
        results.errors++;
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`[cron/nightly] Done in ${durationMs}ms:`, results);
    return NextResponse.json({ ok: true, durationMs, ...results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/nightly] Fatal:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
