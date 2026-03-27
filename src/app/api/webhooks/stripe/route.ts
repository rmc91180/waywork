import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { syncBookingToApaleo } from "@/lib/pms/apaleo-booking";
import { enqueueBookingSyncJob, processPendingMewsSyncJobs } from "@/lib/pms/mews-sync-queue";
import type Stripe from "stripe";

async function releaseBookingInventory(
  bookingId: string,
  status: "CANCELLED_BY_GUEST" | "CANCELLED_BY_HOST" = "CANCELLED_BY_GUEST"
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      listingId: true,
      checkIn: true,
      checkOut: true,
      status: true,
    },
  });

  if (!booking || booking.status !== "PENDING") return;

  await db.$transaction([
    db.blockedDate.deleteMany({
      where: {
        listingId: booking.listingId,
        source: "BOOKING",
        date: {
          gte: booking.checkIn,
          lt: booking.checkOut,
        },
      },
    }),
    db.booking.update({
      where: { id: booking.id },
      data: { status },
    }),
  ]);
}

async function rollbackApaleoPaymentHold(
  stripe: ReturnType<typeof getStripe>,
  paymentIntentId: string
) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === "requires_capture") {
    await stripe.paymentIntents.cancel(paymentIntentId);
    return;
  }

  if (paymentIntent.status === "succeeded") {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
  }
}

function extractTransferIdFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent | Stripe.Response<Stripe.PaymentIntent>
) {
  const latestCharge = paymentIntent.latest_charge;
  if (!latestCharge || typeof latestCharge === "string") {
    return null;
  }

  const transfer = latestCharge.transfer;
  if (!transfer) {
    return null;
  }

  return typeof transfer === "string" ? transfer : transfer.id;
}

async function syncStripeSettlementMetadata(
  stripe: ReturnType<typeof getStripe>,
  bookingId: string,
  paymentIntentId: string
) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge.transfer"],
  });

  const transferId = extractTransferIdFromPaymentIntent(paymentIntent);

  await db.booking.update({
    where: { id: bookingId },
    data: {
      stripePaymentIntentId: paymentIntentId,
      stripeTransferId: transferId,
    },
  });

  return transferId;
}

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
          console.error("Booking not found:", bookingId);
          break;
        }

        if (booking.status !== "PENDING") {
          break;
        }

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null;
        const stripe = getStripe();
        const isApaleoBooking = Boolean(
          booking.listing.pmsConnection?.enabled &&
            booking.listing.pmsConnection.provider === "APALEO"
        );

        if (isApaleoBooking) {
          if (!paymentIntentId) {
            console.error("Apaleo booking is missing payment intent:", bookingId);
            await releaseBookingInventory(bookingId, "CANCELLED_BY_HOST");
            break;
          }

          const syncResult = await syncBookingToApaleo(bookingId, "UPSERT");
          if (!syncResult.ok) {
            await rollbackApaleoPaymentHold(stripe, paymentIntentId);
            await releaseBookingInventory(bookingId, "CANCELLED_BY_HOST");
            console.error(`Apaleo sync failed for booking ${bookingId}: ${syncResult.error}`);
            break;
          }

          try {
            await stripe.paymentIntents.capture(paymentIntentId);
            await db.booking.update({
              where: { id: bookingId },
              data: {
                status: "CONFIRMED",
                stripePaymentIntentId: paymentIntentId,
              },
            });
            await syncStripeSettlementMetadata(stripe, bookingId, paymentIntentId);
            console.log(`Booking ${bookingId} confirmed and captured after apaleo sync`);
          } catch (captureError) {
            console.error("Stripe capture failed after apaleo sync:", captureError);
            await syncBookingToApaleo(bookingId, "CANCEL");
            await rollbackApaleoPaymentHold(stripe, paymentIntentId);
            await releaseBookingInventory(bookingId, "CANCELLED_BY_HOST");
            break;
          }

          break;
        }

        await db.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            stripePaymentIntentId: paymentIntentId,
          },
        });
        if (paymentIntentId) {
          await syncStripeSettlementMetadata(stripe, bookingId, paymentIntentId);
        }

        await enqueueBookingSyncJob(bookingId, "UPSERT");
        void processPendingMewsSyncJobs(5);
        console.log(`Booking ${bookingId} confirmed via Stripe`);
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          await releaseBookingInventory(bookingId);
        }
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
            await enqueueBookingSyncJob(booking.id, "CANCEL");
            void processPendingMewsSyncJobs(5);
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
