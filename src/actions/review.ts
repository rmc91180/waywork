"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createReviewSchema, hostResponseSchema } from "@/lib/validators";
import { z } from "zod";

// ============================================================================
// CREATE REVIEW
// ============================================================================

export async function createReview(
  data: z.infer<typeof createReviewSchema>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createReviewSchema.parse(data);

  // Fetch the booking with listing details
  const booking = await db.booking.findUnique({
    where: { id: parsed.bookingId },
    include: {
      listing: true,
      review: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Booking must be completed
  if (booking.status !== "COMPLETED") {
    throw new Error("Can only review completed bookings");
  }

  // Check duplicate: no existing review for this booking + targetType
  if (booking.review && booking.review.targetType === parsed.targetType) {
    throw new Error("A review for this booking and target type already exists");
  }

  // Authorization based on target type
  if (parsed.targetType === "LISTING") {
    // Only the guest can leave a LISTING review
    if (booking.guestId !== session.user.id) {
      throw new Error("Only the guest can review a listing");
    }
  } else if (parsed.targetType === "GUEST") {
    // Only the host can leave a GUEST review
    if (booking.listing.hostId !== session.user.id) {
      throw new Error("Only the host can review a guest");
    }
  }

  // Create the review
  const review = await db.review.create({
    data: {
      bookingId: parsed.bookingId,
      authorId: session.user.id,
      listingId: booking.listingId,
      targetType: parsed.targetType,
      overallRating: parsed.overallRating,
      wifiAccuracy: parsed.wifiAccuracy,
      quietness: parsed.quietness,
      deskSetup: parsed.deskSetup,
      cleanliness: parsed.cleanliness,
      comment: parsed.comment,
    },
  });

  // Update listing's cached averageRating and reviewCount for LISTING reviews
  if (parsed.targetType === "LISTING") {
    await updateListingReviewStats(booking.listingId);
  }

  revalidatePath(`/listings/${booking.listing.slug}`);
  revalidatePath(`/bookings/${booking.id}`);

  return review;
}

// ============================================================================
// ADD HOST RESPONSE
// ============================================================================

export async function addHostResponse(
  data: z.infer<typeof hostResponseSchema>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = hostResponseSchema.parse(data);

  // Fetch the review with booking and listing info
  const review = await db.review.findUnique({
    where: { id: parsed.reviewId },
    include: {
      booking: {
        include: {
          listing: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  // Must target LISTING (hosts respond to listing reviews only)
  if (review.targetType !== "LISTING") {
    throw new Error("Host can only respond to listing reviews");
  }

  // User must be the listing's host
  if (review.booking.listing.hostId !== session.user.id) {
    throw new Error("Only the listing host can respond to this review");
  }

  // No existing response
  if (review.hostResponse) {
    throw new Error("A host response already exists for this review");
  }

  const updated = await db.review.update({
    where: { id: parsed.reviewId },
    data: { hostResponse: parsed.hostResponse },
  });

  revalidatePath(`/listings/${review.booking.listing.slug}`);

  return updated;
}

// ============================================================================
// GET LISTING REVIEWS
// ============================================================================

export async function getListingReviews(listingId: string) {
  const reviews = await db.review.findMany({
    where: {
      listingId,
      targetType: "LISTING",
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return reviews;
}

// ============================================================================
// GET GUEST REVIEWS
// ============================================================================

export async function getGuestReviews(userId: string) {
  const reviews = await db.review.findMany({
    where: {
      targetType: "GUEST",
      booking: {
        guestId: userId,
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return reviews;
}

// ============================================================================
// GET REVIEWABLE BOOKINGS
// ============================================================================

export async function getReviewableBookings() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bookings = await db.booking.findMany({
    where: {
      guestId: session.user.id,
      status: "COMPLETED",
      review: null,
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: {
              url: true,
              alt: true,
            },
          },
        },
      },
    },
    orderBy: { checkOut: "desc" },
  });

  return bookings;
}

// ============================================================================
// INTERNAL: UPDATE LISTING REVIEW STATS
// ============================================================================

async function updateListingReviewStats(listingId: string) {
  const stats = await db.review.aggregate({
    where: {
      listingId,
      targetType: "LISTING",
    },
    _avg: {
      overallRating: true,
    },
    _count: {
      id: true,
    },
  });

  await db.listing.update({
    where: { id: listingId },
    data: {
      averageRating: stats._avg.overallRating,
      reviewCount: stats._count.id,
    },
  });
}
