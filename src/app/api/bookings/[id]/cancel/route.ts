import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { differenceInDays } from "date-fns";

export async function POST(
  request: NextRequest,
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
      include: { listing: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const isGuest = booking.guestId === session.user.id;
    const isHost = booking.listing.hostId === session.user.id;

    if (!isGuest && !isHost) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (
      booking.status !== "CONFIRMED" &&
      booking.status !== "PENDING"
    ) {
      return NextResponse.json(
        { error: "Booking cannot be cancelled in its current state" },
        { status: 400 }
      );
    }

    let refundPercentage = 0;
    const daysUntilCheckIn = differenceInDays(
      new Date(booking.checkIn),
      new Date()
    );

    if (isHost) {
      // Host cancellations always get full refund for guest
      refundPercentage = 100;
    } else {
      // Guest cancellation - depends on policy
      const policy = booking.listing.cancellationPolicy;
      if (policy === "FLEXIBLE") {
        refundPercentage = daysUntilCheckIn >= 1 ? 100 : 0;
      } else if (policy === "MODERATE") {
        if (daysUntilCheckIn >= 5) refundPercentage = 100;
        else if (daysUntilCheckIn >= 1) refundPercentage = 50;
        else refundPercentage = 0;
      } else {
        // STRICT
        refundPercentage = daysUntilCheckIn >= 7 ? 50 : 0;
      }
    }

    // Process Stripe refund if applicable
    if (
      refundPercentage > 0 &&
      booking.stripePaymentIntentId &&
      process.env.STRIPE_SECRET_KEY
    ) {
      try {
        const stripe = getStripe();
        const refundAmount = Math.round(
          (booking.totalPrice * refundPercentage) / 100
        );
        await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: refundAmount,
        });
      } catch (stripeError) {
        console.error("Stripe refund error:", stripeError);
        // Continue with cancellation even if refund fails
      }
    }

    // Update booking status
    await db.booking.update({
      where: { id },
      data: {
        status: isHost ? "CANCELLED_BY_HOST" : "CANCELLED_BY_GUEST",
      },
    });

    // Remove booking blocked dates
    await db.blockedDate.deleteMany({
      where: {
        listingId: booking.listingId,
        source: "BOOKING",
        date: {
          gte: new Date(booking.checkIn),
          lt: new Date(booking.checkOut),
        },
      },
    });

    return NextResponse.json({ success: true, refundPercentage });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
