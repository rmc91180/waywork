import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { syncBookingToApaleo } from "@/lib/pms/apaleo-booking";
import { enqueueBookingSyncJob, processPendingMewsSyncJobs } from "@/lib/pms/mews-sync-queue";
import { resolveBookingCommissionBps } from "@/lib/payout-config";

async function confirmBookingWithoutStripe(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: {
        include: {
          pmsConnection: {
            select: {
              provider: true,
              enabled: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const requiresApaleoManualCapture = Boolean(
    booking.listing.pmsConnection?.enabled && booking.listing.pmsConnection.provider === "APALEO"
  );

  if (requiresApaleoManualCapture) {
    const syncResult = await syncBookingToApaleo(booking.id, "UPSERT");
    if (!syncResult.ok) {
      return NextResponse.json(
        { error: syncResult.error || "Failed to confirm booking in apaleo" },
        { status: 502 }
      );
    }
  } else {
    await enqueueBookingSyncJob(booking.id, "UPSERT");
    void processPendingMewsSyncJobs(5);
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED" },
  });

  return NextResponse.json({
    bookingId: booking.id,
    redirectUrl: `/bookings/${booking.id}?success=true`,
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        guest: {
          select: {
            id: true,
            email: true,
          },
        },
        listing: {
          include: {
            host: {
              select: {
                stripeConnectAccountId: true,
                defaultBookingCommissionBps: true,
              },
            },
            pmsConnection: {
              select: {
                provider: true,
                enabled: true,
                bookingCommissionBps: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.guestId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: "Booking is already confirmed" },
        { status: 409 }
      );
    }

    const requiresApaleoManualCapture = Boolean(
      booking.listing.pmsConnection?.enabled && booking.listing.pmsConnection.provider === "APALEO"
    );
    const destinationAccountId = booking.listing.host.stripeConnectAccountId;
    const bookingCommissionBps = resolveBookingCommissionBps({
      hostDefaultBookingCommissionBps: booking.listing.host.defaultBookingCommissionBps,
      connectionBookingCommissionBps: booking.listing.pmsConnection?.bookingCommissionBps,
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      return confirmBookingWithoutStripe(booking.id);
    }

    if (!destinationAccountId) {
      return NextResponse.json(
        { error: "Host payouts are not configured for this listing yet." },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const expiresAt = Math.floor((Date.now() + 1000 * 60 * 30) / 1000);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email || undefined,
      expires_at: expiresAt,
      line_items: [
        {
          price_data: {
            currency: booking.listing.currency.toLowerCase(),
            product_data: {
              name: booking.listing.title,
              description: `${booking.numberOfDays} day${booking.numberOfDays > 1 ? "s" : ""} · ${format(
                booking.checkIn,
                "yyyy-MM-dd"
              )} to ${format(booking.checkOut, "yyyy-MM-dd")}`,
            },
            unit_amount: booking.totalPrice,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking.id,
        listingId: booking.listingId,
        guestId: booking.guestId,
        checkIn: format(booking.checkIn, "yyyy-MM-dd"),
        checkOut: format(booking.checkOut, "yyyy-MM-dd"),
        pmsProvider: booking.listing.pmsConnection?.provider || "NONE",
        destinationAccountId,
        bookingCommissionBps: String(bookingCommissionBps),
      },
      payment_intent_data: {
        ...(requiresApaleoManualCapture
          ? {
              capture_method: "manual" as const,
            }
          : {}),
        application_fee_amount: booking.serviceFee,
        transfer_data: {
          destination: destinationAccountId,
        },
      },
      success_url: `${appUrl}/bookings/${booking.id}?success=true`,
      cancel_url: `${appUrl}/bookings/${booking.id}/payment?cancelled=true`,
    });

    if (checkoutSession.payment_intent) {
      await db.booking.update({
        where: { id: booking.id },
        data: {
          stripePaymentIntentId:
            typeof checkoutSession.payment_intent === "string"
              ? checkoutSession.payment_intent
              : checkoutSession.payment_intent.id,
        },
      });
    }

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error("Booking checkout error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment session" },
      { status: 500 }
    );
  }
}
