import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;

        if (!bookingId) {
          console.error("No bookingId in session metadata");
          break;
        }

        const booking = await db.booking.findUnique({
          where: { id: bookingId },
          include: { listing: true },
        });

        if (!booking) {
          console.error("Booking not found:", bookingId);
          break;
        }

        // Update booking status
        await db.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || null,
          },
        });

        // Block dates for this booking
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const current = new Date(checkIn);

        while (current < checkOut) {
          await db.blockedDate.upsert({
            where: {
              listingId_date: {
                listingId: booking.listingId,
                date: new Date(current),
              },
            },
            create: {
              listingId: booking.listingId,
              date: new Date(current),
              source: "BOOKING",
            },
            update: {},
          });
          current.setDate(current.getDate() + 1);
        }

        console.log(`Booking ${bookingId} confirmed via Stripe`);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (paymentIntentId) {
          const booking = await db.booking.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
          });

          if (booking) {
            await db.booking.update({
              where: { id: booking.id },
              data: { status: "REFUNDED" },
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

            console.log(`Booking ${booking.id} refunded`);
          }
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
