import { NextRequest, NextResponse } from "next/server";
import { addDays, differenceInDays, isBefore, startOfDay } from "date-fns";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueBookingSyncJob, processPendingMewsSyncJobs } from "@/lib/pms/mews-sync-queue";
import { getStripe, SERVICE_FEE_PERCENTAGE } from "@/lib/stripe";
import { createBookingSchema } from "@/lib/validators";

function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function getDateRange(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(checkIn);
  const end = startOfDay(checkOut);

  while (isBefore(current, end)) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

async function releasePendingInventory(bookingId: string) {
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
    db.booking.delete({ where: { id: booking.id } }),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBookingSchema.parse(body);

    const listing = await db.listing.findUnique({
      where: { id: parsed.listingId, status: "ACTIVE" },
      include: { host: true },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found or not available" },
        { status: 404 }
      );
    }

    if (listing.hostId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot book your own listing" },
        { status: 400 }
      );
    }

    const checkIn = parseDateInput(parsed.checkIn);
    const checkOut = parseDateInput(parsed.checkOut);
    const today = startOfDay(new Date());

    if (isBefore(checkIn, today)) {
      return NextResponse.json(
        { error: "Check-in date must be in the future" },
        { status: 400 }
      );
    }

    const numberOfDays = differenceInDays(checkOut, checkIn);
    if (numberOfDays < 1) {
      return NextResponse.json(
        { error: "Must book at least 1 day" },
        { status: 400 }
      );
    }

    if (parsed.numberOfGuests > listing.maxGuests) {
      return NextResponse.json(
        { error: `Maximum ${listing.maxGuests} guests allowed` },
        { status: 400 }
      );
    }

    const datesToBlock = getDateRange(checkIn, checkOut);
    const dateKeys = datesToBlock.map((date) => date.toISOString().split("T")[0]);
    const overrideRates = await db.listingDailyRate.findMany({
      where: {
        listingId: listing.id,
        date: { in: datesToBlock },
      },
      select: {
        date: true,
        pricePerDay: true,
      },
    });
    const overrideMap = new Map(
      overrideRates.map((rate) => [rate.date.toISOString().split("T")[0], rate.pricePerDay])
    );

    const subtotal = dateKeys.reduce((sum, key) => {
      const rate = overrideMap.get(key) ?? listing.pricePerDay;
      return sum + rate;
    }, 0);
    const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENTAGE);
    const totalPrice = subtotal + listing.cleaningFee + serviceFee;
    const hostPayout = subtotal + listing.cleaningFee;
    const pricing = {
      subtotal,
      cleaningFee: listing.cleaningFee,
      serviceFee,
      totalPrice,
      hostPayout,
    };

    let bookingId = "";

    try {
      const booking = await db.$transaction(
        async (tx) => {
          const unavailableDate = await tx.blockedDate.findFirst({
            where: {
              listingId: listing.id,
              date: { in: datesToBlock },
            },
            select: { id: true },
          });

          if (unavailableDate) {
            throw new Error("Some of your selected dates are unavailable");
          }

          const created = await tx.booking.create({
            data: {
              guestId: session.user.id,
              listingId: listing.id,
              checkIn,
              checkOut,
              numberOfDays,
              numberOfGuests: parsed.numberOfGuests,
              subtotal: pricing.subtotal,
              cleaningFee: pricing.cleaningFee,
              totalPrice: pricing.totalPrice,
              serviceFee: pricing.serviceFee,
              hostPayout: pricing.hostPayout,
              specialRequests: parsed.specialRequests,
              status: "PENDING",
            },
          });

          await tx.blockedDate.createMany({
            data: datesToBlock.map((date) => ({
              listingId: listing.id,
              date,
              source: "BOOKING",
            })),
          });

          if (parsed.attendeeEmails && parsed.attendeeEmails.length > 0) {
            await tx.bookingAttendee.createMany({
              data: parsed.attendeeEmails.map((email) => ({
                bookingId: created.id,
                email,
                status: "INVITED",
              })),
            });
          }

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      bookingId = booking.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Some of your selected dates are unavailable" },
          { status: 409 }
        );
      }
      if (error instanceof Error) {
        if (error.message.includes("unavailable")) {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
      }
      throw error;
    }

    const hasStripe = !!process.env.STRIPE_SECRET_KEY;

    if (!hasStripe) {
      await db.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });
      await enqueueBookingSyncJob(bookingId, "UPSERT");
      void processPendingMewsSyncJobs(5);
      return NextResponse.json({ bookingId });
    }

    try {
      const stripe = getStripe();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const expiresAt = Math.floor((Date.now() + 1000 * 60 * 30) / 1000);

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: session.user.email || undefined,
        expires_at: expiresAt,
        line_items: [
          {
            price_data: {
              currency: listing.currency.toLowerCase(),
              product_data: {
                name: listing.title,
                description: `${numberOfDays} day${numberOfDays > 1 ? "s" : ""} · ${parsed.checkIn} to ${parsed.checkOut}`,
              },
              unit_amount: pricing.totalPrice,
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId,
          listingId: listing.id,
          guestId: session.user.id,
          checkIn: parsed.checkIn,
          checkOut: parsed.checkOut,
        },
        success_url: `${appUrl}/bookings/${bookingId}?success=true`,
        cancel_url: `${appUrl}/spaces/${listing.id}?cancelled=true&bookingId=${bookingId}`,
      });

      if (checkoutSession.payment_intent) {
        await db.booking.update({
          where: { id: bookingId },
          data: {
            stripePaymentIntentId:
              typeof checkoutSession.payment_intent === "string"
                ? checkoutSession.payment_intent
                : checkoutSession.payment_intent.id,
          },
        });
      }

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    } catch (stripeError) {
      console.error("Stripe checkout session error:", stripeError);
      await releasePendingInventory(bookingId);
      return NextResponse.json(
        { error: "Failed to initialize payment session" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid booking data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
