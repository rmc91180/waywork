import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe, calculatePricing, formatCurrency } from "@/lib/stripe";
import { createBookingSchema } from "@/lib/validators";
import { differenceInDays } from "date-fns";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBookingSchema.parse(body);

    // Fetch listing
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

    // Can't book own listing
    if (listing.hostId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot book your own listing" },
        { status: 400 }
      );
    }

    // Validate dates
    const checkIn = new Date(parsed.checkIn);
    const checkOut = new Date(parsed.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
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

    // Check guest count
    if (parsed.numberOfGuests > listing.maxGuests) {
      return NextResponse.json(
        { error: `Maximum ${listing.maxGuests} guests allowed` },
        { status: 400 }
      );
    }

    // Check for blocked dates
    const blockedDates = await db.blockedDate.findMany({
      where: {
        listingId: listing.id,
        date: { gte: checkIn, lt: checkOut },
      },
    });

    if (blockedDates.length > 0) {
      return NextResponse.json(
        { error: "Some of your selected dates are unavailable" },
        { status: 400 }
      );
    }

    // Calculate pricing
    const pricing = calculatePricing(
      listing.pricePerDay,
      numberOfDays,
      listing.cleaningFee
    );

    // Create booking
    const booking = await db.booking.create({
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

    // Create attendees if provided
    if (parsed.attendeeEmails && parsed.attendeeEmails.length > 0) {
      await db.bookingAttendee.createMany({
        data: parsed.attendeeEmails.map((email) => ({
          bookingId: booking.id,
          email,
          status: "INVITED" as const,
        })),
      });
    }

    // Check if Stripe is configured
    const hasStripe = !!process.env.STRIPE_SECRET_KEY;

    if (hasStripe) {
      // Create Stripe Checkout Session
      const stripe = getStripe();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: session.user.email || undefined,
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
          bookingId: booking.id,
          listingId: listing.id,
          guestId: session.user.id,
        },
        success_url: `${appUrl}/bookings/${booking.id}?success=true`,
        cancel_url: `${appUrl}/spaces/${listing.id}?cancelled=true`,
      });

      // Store payment intent reference
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
    } else {
      // Demo mode: confirm booking directly
      await db.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });

      // Block dates
      const dates: Date[] = [];
      const current = new Date(checkIn);
      while (current < checkOut) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      for (const date of dates) {
        await db.blockedDate.upsert({
          where: {
            listingId_date: { listingId: listing.id, date },
          },
          create: { listingId: listing.id, date, source: "BOOKING" },
          update: {},
        });
      }

      return NextResponse.json({ bookingId: booking.id });
    }
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid booking data" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
