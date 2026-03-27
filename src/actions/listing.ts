"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createListingSchema,
  updateListingSchema,
  connectivityProfileSchema,
  listingAmenitySchema,
  listingActivitySchema,
  listingImageSchema,
  availabilityRuleSchema,
  blockedDateSchema,
} from "@/lib/validators";
import { computeWorkScore } from "@/lib/work-score";
import { assertListingAccess } from "@/lib/host-access";
import { evaluateListingProductionReadiness, getListingPmsReadiness } from "@/lib/listing-readiness";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { z } from "zod";

// ============================================================================
// CREATE LISTING
// ============================================================================

export async function createListing(data: z.infer<typeof createListingSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createListingSchema.parse(data);

  // Generate unique slug
  const baseSlug = slugify(parsed.title, { lower: true, strict: true });
  const slug = `${baseSlug}-${nanoid(6)}`;

  // Upgrade user role to HOST if they're a GUEST
  await db.user.update({
    where: { id: session.user.id },
    data: { role: "HOST" },
  });

  const listing = await db.listing.create({
    data: {
      ...parsed,
      slug,
      hostId: session.user.id,
      status: "DRAFT",
    },
  });

  return listing;
}

// ============================================================================
// UPDATE LISTING
// ============================================================================

export async function updateListing(
  listingId: string,
  data: z.infer<typeof updateListingSchema>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const parsed = updateListingSchema.parse(data);

  const updated = await db.listing.update({
    where: { id: listingId },
    data: parsed,
  });

  revalidatePath(`/host/listings/${listingId}`);
  return updated;
}

// ============================================================================
// CONNECTIVITY PROFILE
// ============================================================================

export async function upsertConnectivityProfile(
  listingId: string,
  data: z.infer<typeof connectivityProfileSchema>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const parsed = connectivityProfileSchema.parse(data);

  const profile = await db.connectivityProfile.upsert({
    where: { listingId },
    create: {
      listingId,
      ...parsed,
      speedTestDate: parsed.speedTestDate
        ? new Date(parsed.speedTestDate)
        : undefined,
    },
    update: {
      ...parsed,
      speedTestDate: parsed.speedTestDate
        ? new Date(parsed.speedTestDate)
        : undefined,
    },
  });

  // Recompute work score
  await recomputeWorkScore(listingId);

  return profile;
}

// ============================================================================
// AMENITIES
// ============================================================================

export async function setListingAmenities(
  listingId: string,
  amenities: z.infer<typeof listingAmenitySchema>[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const parsed = amenities.map((a) => listingAmenitySchema.parse(a));

  // Replace all amenities
  await db.listingAmenity.deleteMany({ where: { listingId } });
  await db.listingAmenity.createMany({
    data: parsed.map((a) => ({ ...a, listingId })),
  });

  // Recompute work score
  await recomputeWorkScore(listingId);

  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/spaces/${listingId}`);
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function setListingActivities(
  listingId: string,
  activities: z.infer<typeof listingActivitySchema>[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const parsed = activities
    .map((activity) => listingActivitySchema.parse(activity))
    .filter((activity) => activity.title.trim().length > 0);

  await db.listingActivity.deleteMany({ where: { listingId } });

  if (parsed.length > 0) {
    await db.listingActivity.createMany({
      data: parsed.map((activity) => ({
        listingId,
        title: activity.title.trim(),
        category: activity.category.trim(),
        description: activity.description?.trim() || undefined,
        durationMinutes: activity.durationMinutes,
        distanceKm: activity.distanceKm,
        indoor: activity.indoor,
      })),
    });
  }

  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/spaces/${listingId}`);
}

// ============================================================================
// IMAGES
// ============================================================================

export async function addListingImages(
  listingId: string,
  images: z.infer<typeof listingImageSchema>[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const parsed = images.map((img) => listingImageSchema.parse(img));

  await db.listingImage.createMany({
    data: parsed.map((img) => ({ ...img, listingId })),
  });

  revalidatePath(`/host/listings/${listingId}`);
}

export async function deleteListingImage(listingId: string, imageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  await db.listingImage.delete({
    where: { id: imageId, listingId },
  });

  revalidatePath(`/host/listings/${listingId}`);
}

export async function reorderListingImages(
  listingId: string,
  imageIds: string[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  // Update order for each image
  await Promise.all(
    imageIds.map((id, index) =>
      db.listingImage.update({
        where: { id, listingId },
        data: { order: index, isPrimary: index === 0 },
      })
    )
  );

  revalidatePath(`/host/listings/${listingId}`);
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export async function setAvailabilityRules(
  listingId: string,
  rules: z.infer<typeof availabilityRuleSchema>[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const parsed = rules.map((r) => availabilityRuleSchema.parse(r));

  // Replace all rules
  await db.availabilityRule.deleteMany({ where: { listingId } });
  await db.availabilityRule.createMany({
    data: parsed.map((r) => ({
      listingId,
      dayOfWeek: r.dayOfWeek,
      startDate: r.startDate ? new Date(r.startDate) : undefined,
      endDate: r.endDate ? new Date(r.endDate) : undefined,
      available: r.available,
    })),
  });

  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/calendar`);
}

export async function addBlockedDates(
  listingId: string,
  dates: z.infer<typeof blockedDateSchema>[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const parsed = dates.map((d) => blockedDateSchema.parse(d));

  // Use upsert to avoid duplicates
  for (const d of parsed) {
    await db.blockedDate.upsert({
      where: {
        listingId_date: { listingId, date: new Date(d.date) },
      },
      create: {
        listingId,
        date: new Date(d.date),
        source: d.source as "MANUAL" | "ICAL" | "BOOKING" | "PMS",
      },
      update: {},
    });
  }

  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/calendar`);
}

export async function removeBlockedDate(listingId: string, dateStr: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  await db.blockedDate.delete({
    where: {
      listingId_date: { listingId, date: new Date(dateStr) },
    },
  });

  revalidatePath(`/host/listings/${listingId}`);
  revalidatePath(`/host/calendar`);
}

// ============================================================================
// STATUS MANAGEMENT
// ============================================================================

export async function submitListingForReview(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertListingAccess(session.user.id, listingId, ["OWNER"]);

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      images: true,
      amenities: true,
      connectivityProfile: true,
      availabilityRules: true,
      host: { select: { stripeConnectAccountId: true } },
      pmsConnection: {
        select: {
          provider: true,
          enabled: true,
          mewsClientToken: true,
          mewsConnectionToken: true,
          siteminderClientId: true,
          siteminderClientSecret: true,
          apaleoClientId: true,
          apaleoClientSecret: true,
          apaleoRefreshToken: true,
        },
      },
    },
  });

  if (!listing) {
    throw new Error("Unauthorized");
  }

  // Validation: must have at least 1 image, connectivity profile, and amenities
  if (listing.images.length === 0) {
    throw new Error("At least one photo is required");
  }
  if (!listing.connectivityProfile) {
    throw new Error("Connectivity profile is required");
  }
  if (listing.amenities.length === 0) {
    throw new Error("At least one amenity is required");
  }

  const pmsReadiness = getListingPmsReadiness(listing.pmsConnection || {});
  const readiness = evaluateListingProductionReadiness({
    imageCount: listing.images.length,
    amenityCount: listing.amenities.length,
    hasConnectivityProfile: Boolean(listing.connectivityProfile),
    availabilityRuleCount: listing.availabilityRules.length,
    descriptionLength: listing.description.trim().length,
    hasPayoutSetup: Boolean(listing.host.stripeConnectAccountId),
    ...pmsReadiness,
    hasPmsListingMapping: Boolean(listing.pmsExternalListingId),
  });

  if (!readiness.ready) {
    throw new Error(`Listing is not production-ready: ${readiness.reasons.join(" ")}`);
  }

  await db.listing.update({
    where: { id: listingId },
    data: { status: "PENDING_REVIEW" },
  });

  revalidatePath("/host/listings");
}

export async function pauseListing(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertListingAccess(session.user.id, listingId, ["OWNER"]);

  const listing = await db.listing.findUnique({
    where: { id: listingId },
  });
  if (!listing) {
    throw new Error("Unauthorized");
  }

  await db.listing.update({
    where: { id: listingId },
    data: { status: "PAUSED" },
  });

  revalidatePath("/host/listings");
}

export async function unpauseListing(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertListingAccess(session.user.id, listingId, ["OWNER"]);

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      images: true,
      amenities: true,
      connectivityProfile: true,
      availabilityRules: true,
      host: { select: { stripeConnectAccountId: true } },
      pmsConnection: {
        select: {
          provider: true,
          enabled: true,
          mewsClientToken: true,
          mewsConnectionToken: true,
          siteminderClientId: true,
          siteminderClientSecret: true,
          apaleoClientId: true,
          apaleoClientSecret: true,
          apaleoRefreshToken: true,
        },
      },
    },
  });
  if (!listing) {
    throw new Error("Unauthorized");
  }

  if (listing.status !== "PAUSED") {
    throw new Error("Listing is not paused");
  }

  const pmsReadiness = getListingPmsReadiness(listing.pmsConnection || {});
  const readiness = evaluateListingProductionReadiness({
    imageCount: listing.images.length,
    amenityCount: listing.amenities.length,
    hasConnectivityProfile: Boolean(listing.connectivityProfile),
    availabilityRuleCount: listing.availabilityRules.length,
    descriptionLength: listing.description.trim().length,
    hasPayoutSetup: Boolean(listing.host.stripeConnectAccountId),
    ...pmsReadiness,
    hasPmsListingMapping: Boolean(listing.pmsExternalListingId),
  });

  if (!readiness.ready) {
    throw new Error(`Listing is not production-ready: ${readiness.reasons.join(" ")}`);
  }

  await db.listing.update({
    where: { id: listingId },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/host/listings");
}

// ============================================================================
// WORK SCORE RECOMPUTATION
// ============================================================================

async function recomputeWorkScore(listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { amenities: true, connectivityProfile: true },
  });

  if (!listing) return;

  const score = computeWorkScore({
    amenities: listing.amenities,
    connectivity: listing.connectivityProfile,
  });

  await db.listing.update({
    where: { id: listingId },
    data: { workScore: score.total },
  });
}

// ============================================================================
// FULL LISTING SAVE (wizard completion)
// ============================================================================

export async function saveCompleteListing(formData: {
  listing: z.infer<typeof createListingSchema>;
  connectivity: z.infer<typeof connectivityProfileSchema>;
  amenities: z.infer<typeof listingAmenitySchema>[];
  activities: z.infer<typeof listingActivitySchema>[];
  images: z.infer<typeof listingImageSchema>[];
  availability: z.infer<typeof availabilityRuleSchema>[];
  blockedDates: z.infer<typeof blockedDateSchema>[];
  submitForReview: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const {
    listing: listingData,
    connectivity,
    amenities,
    activities,
    images,
    availability,
    blockedDates,
    submitForReview,
  } = formData;

  // Create listing
  const listing = await createListing(listingData);

  // Add connectivity
  await upsertConnectivityProfile(listing.id, connectivity);

  // Add amenities
  if (amenities.length > 0) {
    await setListingAmenities(listing.id, amenities);
  }

  // Add activities
  if (activities.length > 0) {
    await setListingActivities(listing.id, activities);
  }

  // Add images
  if (images.length > 0) {
    await addListingImages(listing.id, images);
  }

  // Set availability
  if (availability.length > 0) {
    await setAvailabilityRules(listing.id, availability);
  }

  // Block dates
  if (blockedDates.length > 0) {
    await addBlockedDates(listing.id, blockedDates);
  }

  // Submit for review if requested
  if (submitForReview) {
    await submitListingForReview(listing.id);
  }

  revalidatePath("/host/listings");
  redirect(`/host/listings/${listing.id}`);
}

export async function updateCompleteListing(
  listingId: string,
  formData: {
    listing: z.infer<typeof updateListingSchema>;
    connectivity: z.infer<typeof connectivityProfileSchema>;
    amenities: z.infer<typeof listingAmenitySchema>[];
    activities: z.infer<typeof listingActivitySchema>[];
    images: z.infer<typeof listingImageSchema>[];
    availability: z.infer<typeof availabilityRuleSchema>[];
    blockedDates: z.infer<typeof blockedDateSchema>[];
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await assertListingAccess(session.user.id, listingId, ["OWNER", "MANAGER"]);

  const {
    listing: listingData,
    connectivity,
    amenities,
    activities,
    images,
    availability,
    blockedDates,
  } = formData;

  // Update listing core fields
  await updateListing(listingId, listingData);

  // Update connectivity
  await upsertConnectivityProfile(listingId, connectivity);

  // Replace amenities
  await setListingAmenities(listingId, amenities);

  // Replace activities
  await setListingActivities(listingId, activities);

  // Replace images
  await db.listingImage.deleteMany({ where: { listingId } });
  if (images.length > 0) {
    await addListingImages(listingId, images);
  }

  // Replace availability
  if (availability.length > 0) {
    await setAvailabilityRules(listingId, availability);
  }

  // Replace blocked dates (manual only)
  await db.blockedDate.deleteMany({
    where: { listingId, source: "MANUAL" },
  });
  if (blockedDates.length > 0) {
    await addBlockedDates(listingId, blockedDates);
  }

  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}`);
  redirect(`/host/listings/${listingId}`);
}
