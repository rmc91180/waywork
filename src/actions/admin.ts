"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluateListingProductionReadiness } from "@/lib/listing-readiness";

// ============================================================================
// HELPERS
// ============================================================================

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

// ============================================================================
// ADMIN STATS
// ============================================================================

export async function getAdminStats() {
  await requireAdmin();

  const [
    totalUsers,
    totalHosts,
    listingsByStatus,
    bookingsByStatus,
    revenue,
    totalReviews,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "HOST" } }),
    db.listing.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    db.booking.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    db.booking.aggregate({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      _sum: { totalPrice: true },
    }),
    db.review.count(),
  ]);

  const listings: Record<string, number> = {};
  for (const group of listingsByStatus) {
    listings[group.status] = group._count.id;
  }

  const bookings: Record<string, number> = {};
  for (const group of bookingsByStatus) {
    bookings[group.status] = group._count.id;
  }

  return {
    totalUsers,
    totalHosts,
    totalListings: listings,
    totalBookings: bookings,
    totalRevenue: revenue._sum.totalPrice ?? 0,
    totalReviews,
  };
}

// ============================================================================
// PENDING LISTINGS
// ============================================================================

export async function getPendingListings() {
  await requireAdmin();

  const listings = await db.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      host: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
      images: {
        orderBy: { order: "asc" },
      },
      connectivityProfile: true,
      _count: {
        select: { amenities: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return listings;
}

// ============================================================================
// APPROVE LISTING
// ============================================================================

export async function approveListing(listingId: string) {
  await requireAdmin();

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      images: true,
      amenities: true,
      availabilityRules: true,
      connectivityProfile: true,
      host: { select: { stripeConnectAccountId: true } },
      pmsConnection: {
        select: {
          enabled: true,
          mewsClientToken: true,
          mewsConnectionToken: true,
        },
      },
    },
  });

  if (!listing) {
    throw new Error("Listing not found");
  }

  if (listing.status !== "PENDING_REVIEW") {
    throw new Error("Listing is not pending review");
  }

  const readiness = evaluateListingProductionReadiness({
    imageCount: listing.images.length,
    amenityCount: listing.amenities.length,
    hasConnectivityProfile: Boolean(listing.connectivityProfile),
    availabilityRuleCount: listing.availabilityRules.length,
    descriptionLength: listing.description.trim().length,
    hasPayoutSetup: Boolean(listing.host.stripeConnectAccountId),
    mewsConnectionEnabled: Boolean(listing.pmsConnection?.enabled),
    mewsHasRequiredTokens:
      Boolean(listing.pmsConnection?.mewsClientToken) &&
      Boolean(listing.pmsConnection?.mewsConnectionToken),
    hasPmsListingMapping: Boolean(listing.pmsExternalListingId),
  });

  if (!readiness.ready) {
    throw new Error(`Listing is not production-ready: ${readiness.reasons.join(" ")}`);
  }

  await db.listing.update({
    where: { id: listingId },
    data: {
      status: "ACTIVE",
      rejectionReason: null,
    },
  });

  revalidatePath("/admin/listings");
  revalidatePath("/host/listings");
}

// ============================================================================
// REJECT LISTING
// ============================================================================

export async function rejectListing(listingId: string, reason: string) {
  await requireAdmin();

  if (!reason || reason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }

  const listing = await db.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error("Listing not found");
  }

  if (listing.status !== "PENDING_REVIEW") {
    throw new Error("Listing is not pending review");
  }

  await db.listing.update({
    where: { id: listingId },
    data: {
      status: "REJECTED",
      rejectionReason: reason.trim(),
    },
  });

  revalidatePath("/admin/listings");
  revalidatePath("/host/listings");
}

// ============================================================================
// GET ALL USERS (PAGINATED)
// ============================================================================

interface GetAllUsersOptions {
  search?: string;
  role?: string;
  page?: number;
}

export async function getAllUsers(options?: GetAllUsersOptions) {
  await requireAdmin();

  const page = options?.page ?? 1;
  const perPage = 20;
  const skip = (page - 1) * perPage;

  const where: {
    role?: "GUEST" | "HOST" | "ADMIN";
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }>;
  } = {};

  if (options?.role) {
    where.role = options.role as "GUEST" | "HOST" | "ADMIN";
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: "insensitive" } },
      { email: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            bookings: true,
            reviewsWritten: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    db.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  };
}

// ============================================================================
// UPDATE USER ROLE
// ============================================================================

export async function updateUserRole(
  userId: string,
  role: "GUEST" | "HOST" | "ADMIN"
) {
  const session = await requireAdmin();

  if (session.user.id === userId) {
    throw new Error("Cannot change your own role");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await db.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
}

// ============================================================================
// GET ALL BOOKINGS (ADMIN, PAGINATED)
// ============================================================================

interface GetAllBookingsAdminOptions {
  status?: string;
  search?: string;
  page?: number;
}

export async function getAllBookingsAdmin(options?: GetAllBookingsAdminOptions) {
  await requireAdmin();

  const page = options?.page ?? 1;
  const perPage = 20;
  const skip = (page - 1) * perPage;

  const where: {
    status?: "PENDING" | "CONFIRMED" | "CANCELLED_BY_GUEST" | "CANCELLED_BY_HOST" | "COMPLETED" | "REFUNDED";
    OR?: Array<{
      listing?: { title: { contains: string; mode: "insensitive" } };
      guest?: {
        OR: Array<{
          name?: { contains: string; mode: "insensitive" };
          email?: { contains: string; mode: "insensitive" };
        }>;
      };
    }>;
  } = {};

  if (options?.status) {
    where.status = options.status as typeof where.status;
  }

  if (options?.search) {
    where.OR = [
      {
        listing: { title: { contains: options.search, mode: "insensitive" } },
      },
      {
        guest: {
          OR: [
            { name: { contains: options.search, mode: "insensitive" } },
            { email: { contains: options.search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
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
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    db.booking.count({ where }),
  ]);

  return {
    bookings,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  };
}

// ============================================================================
// COMPLETE EXPIRED BOOKINGS
// ============================================================================

export async function completeExpiredBookings() {
  await requireAdmin();

  const now = new Date();

  const result = await db.booking.updateMany({
    where: {
      status: "CONFIRMED",
      checkOut: { lt: now },
    },
    data: {
      status: "COMPLETED",
    },
  });

  revalidatePath("/admin/bookings");

  return { updatedCount: result.count };
}
