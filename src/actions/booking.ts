"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe, calculatePricing } from "@/lib/stripe";
import { createBookingSchema } from "@/lib/validators";
import { differenceInDays, addDays, startOfDay, isBefore } from "date-fns";
import { z } from "zod";

// ============================================================================
// HELPERS
// ============================================================================

function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Generate an array of Date objects for every day in [checkIn, checkOut). */
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

// ============================================================================
// 1. CREATE BOOKING & CHECKOUT
// ============================================================================

export async function createBookingAndCheckout(
  data: z.infer<typeof createBookingSchema>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createBookingSchema.parse(data);

  // Fetch listing
  const listing = await db.listing.findUnique({
    where: { id: parsed.listingId },
    include: { host: true, images: { where: { isPrimary: true }, take: 1 } },
  });

  if (!listing) throw new Error("Listing not found");
  if (listing.status !== "ACTIVE") throw new Error("Listing is not available");
  if (listing.hostId === session.user.id) {
    throw new Error("You cannot book your own listing");
  }

  const checkIn = new Date(parsed.checkIn);
  const checkOut = new Date(parsed.checkOut);
  const today = startOfDay(new Date());

  if (isBefore(checkIn, today)) {
    throw new Error("Check-in date cannot be in the past");
  }

  if (parsed.numberOfGuests > listing.maxGuests) {
    throw new Error(`Maximum ${listing.maxGuests} guests allowed`);
  }

  const numberOfDays = differenceInDays(checkOut, checkIn);
  if (numberOfDays < 1) throw new Error("Minimum booking is 1 day");

  // Check availability: no blocked dates in range
  const datesToBook = getDateRange(checkIn, checkOut);
  const blockedDates = await db.blockedDate.findMany({
    where: {
      listingId: listing.id,
      date: { in: datesToBook },
    },
  });

  if (blockedDates.length > 0) {
    throw new Error("Some of the selected dates are unavailable");
  }

  // Compute pricing
  const pricing = calculatePricing(
    listing.pricePerDay,
    numberOfDays,
    listing.cleaningFee
  );

  // --- DEMO MODE: no Stripe configured ---
  if (!isStripeConfigured()) {
    const booking = await db.booking.create({
      data: {
        guestId: session.user.id,
        listingId: listing.id,
        status: "CONFIRMED",
        checkIn,
        checkOut,
        numberOfDays,
        numberOfGuests: parsed.numberOfGuests,
        subtotal: pricing.subtotal,
        cleaningFee: pricing.cleaningFee,
        serviceFee: pricing.serviceFee,
        totalPrice: pricing.totalPrice,
        hostPayout: pricing.hostPayout,
        specialRequests: parsed.specialRequests,
      },
    });

    // Block dates immediately in demo mode
    await blockDatesForBooking(listing.id, datesToBook);

    // Create attendees if provided
    if (parsed.attendeeEmails && parsed.attendeeEmails.length > 0) {
      await db.bookingAttendee.createMany({
        data: parsed.attendeeEmails.map((email) => ({
          bookingId: booking.id,
          email,
        })),
      });
    }

    revalidatePath("/bookings");
    revalidatePath(`/listings/${listing.slug}`);

    return { url: `/bookings/${booking.id}/confirmation` };
  }

  // --- STRIPE MODE ---
  const booking = await db.booking.create({
    data: {
      guestId: session.user.id,
      listingId: listing.id,
      status: "PENDING",
      checkIn,
      checkOut,
      numberOfDays,
      numberOfGuests: parsed.numberOfGuests,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      serviceFee: pricing.serviceFee,
      totalPrice: pricing.totalPrice,
      hostPayout: pricing.hostPayout,
      specialRequests: parsed.specialRequests,
    },
  });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const lineItems = [
    {
      price_data: {
        currency: listing.currency.toLowerCase(),
        product_data: {
          name: listing.title,
          description: `${numberOfDays} day${numberOfDays > 1 ? "s" : ""} - ${parsed.checkIn} to ${parsed.checkOut}`,
          images: listing.images[0]?.url ? [listing.images[0].url] : undefined,
        },
        unit_amount: pricing.subtotal,
      },
      quantity: 1,
    },
    ...(pricing.cleaningFee > 0
      ? [
          {
            price_data: {
              currency: listing.currency.toLowerCase(),
              product_data: { name: "Cleaning fee" },
              unit_amount: pricing.cleaningFee,
            },
            quantity: 1,
          },
        ]
      : []),
    {
      price_data: {
        currency: listing.currency.toLowerCase(),
        product_data: { name: "Service fee" },
        unit_amount: pricing.serviceFee,
      },
      quantity: 1,
    },
  ];

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    metadata: {
      bookingId: booking.id,
      listingId: listing.id,
      guestId: session.user.id,
      hostId: listing.hostId,
      attendeeEmails: parsed.attendeeEmails?.join(",") || "",
    },
    success_url: `${appUrl}/bookings/${booking.id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/listings/${listing.slug}?booking_cancelled=true`,
    ...(listing.host.stripeConnectAccountId
      ? {
          payment_intent_data: {
            transfer_data: {
              destination: listing.host.stripeConnectAccountId,
              amount: pricing.hostPayout,
            },
          },
        }
      : {}),
  });

  // Store payment intent ID on the booking
  if (checkoutSession.payment_intent) {
    await db.booking.update({
      where: { id: booking.id },
      data: {
        stripePaymentIntentId: checkoutSession.payment_intent as string,
      },
    });
  }

  return { url: checkoutSession.url };
}

// ============================================================================
// 2. CONFIRM BOOKING (called from Stripe webhook)
// ============================================================================

export async function confirmBooking(
  bookingId: string,
  options?: { attendeeEmails?: string[] }
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "PENDING") {
    throw new Error("Booking is not in PENDING status");
  }

  // Update status to CONFIRMED
  await db.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
  });

  // Block the dates
  const datesToBlock = getDateRange(booking.checkIn, booking.checkOut);
  await blockDatesForBooking(booking.listingId, datesToBlock);

  // Create attendees if provided
  if (options?.attendeeEmails && options.attendeeEmails.length > 0) {
    await db.bookingAttendee.createMany({
      data: options.attendeeEmails.map((email) => ({
        bookingId: booking.id,
        email,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/bookings");
  revalidatePath(`/host/bookings`);
}

// ============================================================================
// 3. CANCEL BOOKING (guest cancellation)
// ============================================================================

export async function cancelBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.guestId !== session.user.id) throw new Error("Unauthorized");
  if (
    booking.status !== "CONFIRMED" &&
    booking.status !== "PENDING"
  ) {
    throw new Error("Booking cannot be cancelled");
  }

  // Calculate refund based on cancellation policy
  const now = new Date();
  const hoursUntilCheckIn =
    (booking.checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysUntilCheckIn = hoursUntilCheckIn / 24;

  let refundPercentage = 0;

  switch (booking.listing.cancellationPolicy) {
    case "FLEXIBLE":
      // Full refund if more than 24 hours before check-in
      refundPercentage = hoursUntilCheckIn > 24 ? 100 : 0;
      break;
    case "MODERATE":
      // Full refund if more than 5 days, 50% if more than 24 hours
      if (daysUntilCheckIn > 5) {
        refundPercentage = 100;
      } else if (hoursUntilCheckIn > 24) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }
      break;
    case "STRICT":
      // 50% refund if more than 7 days, else 0
      refundPercentage = daysUntilCheckIn > 7 ? 50 : 0;
      break;
  }

  const refundAmount = Math.round(
    (booking.totalPrice * refundPercentage) / 100
  );

  // Process Stripe refund if applicable
  if (
    isStripeConfigured() &&
    booking.stripePaymentIntentId &&
    refundAmount > 0
  ) {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      amount: refundAmount,
    });
  }

  // Update booking status
  await db.booking.update({
    where: { id: bookingId },
    data: {
      status:
        refundPercentage === 100
          ? "REFUNDED"
          : "CANCELLED_BY_GUEST",
    },
  });

  // Remove blocked dates
  await removeBlockedDatesForBooking(booking.listingId, booking.checkIn, booking.checkOut);

  revalidatePath("/bookings");
  revalidatePath("/host/bookings");
}

// ============================================================================
// 4. HOST CANCEL BOOKING
// ============================================================================

export async function hostCancelBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.listing.hostId !== session.user.id) {
    throw new Error("Unauthorized");
  }
  if (
    booking.status !== "CONFIRMED" &&
    booking.status !== "PENDING"
  ) {
    throw new Error("Booking cannot be cancelled");
  }

  // Host cancellation always gives full refund
  if (
    isStripeConfigured() &&
    booking.stripePaymentIntentId &&
    booking.totalPrice > 0
  ) {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
    });
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED_BY_HOST" },
  });

  // Remove blocked dates
  await removeBlockedDatesForBooking(booking.listingId, booking.checkIn, booking.checkOut);

  revalidatePath("/bookings");
  revalidatePath("/host/bookings");
}

// ============================================================================
// 5. GET BOOKING DETAILS
// ============================================================================

export async function getBookingDetails(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: {
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      guest: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      attendees: true,
    },
  });

  if (!booking) throw new Error("Booking not found");

  // Auth check: only guest, host, or admin can view
  const isGuest = booking.guestId === session.user.id;
  const isHost = booking.listing.hostId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isGuest && !isHost && !isAdmin) {
    throw new Error("Unauthorized");
  }

  return booking;
}

// ============================================================================
// 6. GET GUEST BOOKINGS
// ============================================================================

export async function getGuestBookings() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = new Date();

  const bookings = await db.booking.findMany({
    where: { guestId: session.user.id },
    include: {
      listing: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          host: {
            select: { id: true, name: true, image: true },
          },
        },
      },
      attendees: true,
    },
    orderBy: { checkIn: "asc" },
  });

  const cancelledStatuses: string[] = [
    "CANCELLED_BY_GUEST",
    "CANCELLED_BY_HOST",
    "REFUNDED",
  ];

  const upcoming = bookings.filter(
    (b) =>
      !cancelledStatuses.includes(b.status) &&
      (b.checkIn >= now || (b.checkIn <= now && b.checkOut >= now))
  );

  const past = bookings.filter(
    (b) =>
      !cancelledStatuses.includes(b.status) &&
      b.checkOut < now
  );

  const cancelled = bookings.filter((b) =>
    cancelledStatuses.includes(b.status)
  );

  return { upcoming, past, cancelled };
}

// ============================================================================
// 7. GET HOST BOOKINGS
// ============================================================================

export async function getHostBookings() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = new Date();

  const bookings = await db.booking.findMany({
    where: {
      listing: { hostId: session.user.id },
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      guest: {
        select: { id: true, name: true, email: true, image: true },
      },
      attendees: true,
    },
    orderBy: { checkIn: "asc" },
  });

  const cancelledStatuses: string[] = [
    "CANCELLED_BY_GUEST",
    "CANCELLED_BY_HOST",
    "REFUNDED",
  ];

  const pending = bookings.filter((b) => b.status === "PENDING");

  const confirmed = bookings.filter(
    (b) =>
      b.status === "CONFIRMED" &&
      (b.checkIn >= now || (b.checkIn <= now && b.checkOut >= now))
  );

  const past = bookings.filter(
    (b) =>
      (b.status === "CONFIRMED" || b.status === "COMPLETED") &&
      b.checkOut < now
  );

  const cancelled = bookings.filter((b) =>
    cancelledStatuses.includes(b.status)
  );

  return { pending, confirmed, past, cancelled };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function blockDatesForBooking(listingId: string, dates: Date[]) {
  for (const date of dates) {
    await db.blockedDate.upsert({
      where: {
        listingId_date: { listingId, date },
      },
      create: {
        listingId,
        date,
        source: "BOOKING",
      },
      update: {},
    });
  }
}

async function removeBlockedDatesForBooking(
  listingId: string,
  checkIn: Date,
  checkOut: Date
) {
  const dates = getDateRange(checkIn, checkOut);
  await db.blockedDate.deleteMany({
    where: {
      listingId,
      date: { in: dates },
      source: "BOOKING",
    },
  });
}
