import fs from "node:fs";
import path from "node:path";
import type {
  AmenityCategory,
  ListingCurationStatus,
  ListingStatus,
  Prisma,
  WorkspaceType,
} from "@/generated/prisma";
import { computeWorkScore } from "@/lib/work-score";

interface EnrichmentImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

interface EnrichmentAmenity {
  category: string;
  name: string;
  quantity?: number;
}

interface MadridEnrichmentRecord {
  unitGroupId: string;
  description?: string;
  images?: EnrichmentImage[];
  amenities?: EnrichmentAmenity[];
}

interface CurationAssessmentInput {
  city: string;
  workspaceType: WorkspaceType;
  descriptionLength: number;
  imageCount: number;
  amenityCount: number;
  maxGuests: number;
  pricePerDay: number;
  hasKitchen: boolean;
  hasDesk: boolean;
  hasQuiet: boolean;
  hasPmsMapping: boolean;
  hasRatePlanMapping: boolean;
  downloadMbps: number;
  workScore: number;
}

export interface ApaleoCurationAssessment {
  curationStatus: ListingCurationStatus;
  targetStatus: ListingStatus;
  notes: string;
}

export interface CurateApaleoMadridListingsInput {
  hostEmail?: string;
  useFixtures?: boolean;
}

export interface CurateApaleoMadridListingsResult {
  curated: number;
  publishable: number;
  needsReview: number;
  rejected: number;
  listings: Array<{
    id: string;
    title: string;
    curationStatus: ListingCurationStatus;
    targetStatus: ListingStatus;
    notes: string;
  }>;
}

function normalizeAmenityCategory(value: string): AmenityCategory {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "DESK" ||
    normalized === "MONITOR" ||
    normalized === "MEETING" ||
    normalized === "CONNECTIVITY" ||
    normalized === "ERGONOMICS" ||
    normalized === "QUIET" ||
    normalized === "AV" ||
    normalized === "KITCHEN" ||
    normalized === "BATHROOM" ||
    normalized === "PARKING"
  ) {
    return normalized;
  }

  return "OTHER";
}

function getFixtureRecords() {
  const filePath = path.join(process.cwd(), "scripts", "fixtures", "apaleo", "madrid-enrichment.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as MadridEnrichmentRecord[];
}

export function assessApaleoMadridListing(input: CurationAssessmentInput): ApaleoCurationAssessment {
  const rejectionReasons: string[] = [];
  const reviewReasons: string[] = [];

  if (input.city.trim().toLowerCase() !== "madrid") {
    rejectionReasons.push("Listing is outside Madrid pilot scope.");
  }

  if (!["STUDIO", "HOME_OFFICE", "HYBRID_SPACE"].includes(input.workspaceType)) {
    rejectionReasons.push("Listing is not apartment/home-style enough for the Madrid pilot.");
  }

  if (!input.hasKitchen) {
    rejectionReasons.push("Listing does not have a kitchen or kitchenette amenity.");
  }

  if (input.pricePerDay <= 0) {
    rejectionReasons.push("Listing does not have a usable daily price.");
  }

  if (!input.hasPmsMapping || !input.hasRatePlanMapping) {
    rejectionReasons.push("Listing is missing required apaleo mapping.");
  }

  if (rejectionReasons.length > 0) {
    return {
      curationStatus: "REJECTED",
      targetStatus: "REJECTED",
      notes: rejectionReasons.join(" "),
    };
  }

  if (input.descriptionLength < 160) {
    reviewReasons.push("Expand the listing description for stronger merchandising.");
  }

  if (input.imageCount < 3) {
    reviewReasons.push("Add at least 3 listing photos.");
  }

  if (input.amenityCount < 5) {
    reviewReasons.push("Add more work-relevant amenities.");
  }

  if (!input.hasDesk) {
    reviewReasons.push("Confirm dedicated desk or work-surface setup.");
  }

  if (!input.hasQuiet) {
    reviewReasons.push("Confirm quiet or private work suitability.");
  }

  if (input.downloadMbps < 50) {
    reviewReasons.push("Confirm stronger download speed for work stays.");
  }

  if (input.workScore < 55) {
    reviewReasons.push("Raise work score before moderation handoff.");
  }

  if (reviewReasons.length > 0) {
    return {
      curationStatus: "NEEDS_REVIEW",
      targetStatus: "DRAFT",
      notes: reviewReasons.join(" "),
    };
  }

  return {
    curationStatus: "PUBLISHABLE",
    targetStatus: "PENDING_REVIEW",
    notes: "Ready for admin moderation review.",
  };
}

function buildImageRows(listingId: string, images: EnrichmentImage[]) {
  return images.map((image, index) => ({
    listingId,
    url: image.url,
    alt: image.alt || null,
    order: index,
    isPrimary: index === 0 ? true : Boolean(image.isPrimary),
  }));
}

type CuratedListingRecord = Prisma.ListingGetPayload<{
  include: {
    amenities: true;
    images: true;
    connectivityProfile: true;
    pmsConnection: true;
    host: { select: { email: true } };
  };
}>;

async function mergeEnrichment(
  prisma: typeof import("@/lib/db")["db"],
  listing: CuratedListingRecord,
  enrichment?: MadridEnrichmentRecord
) {
  if (!enrichment) return;

  if (
    enrichment.description &&
    (listing.description.includes("Imported apaleo inventory") || listing.description.trim().length < 160)
  ) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        description: enrichment.description,
      },
    });
    listing.description = enrichment.description;
  }

  if ((listing.images.length === 0 || listing.images.length < 3) && enrichment.images?.length) {
    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingImage.createMany({
      data: buildImageRows(listing.id, enrichment.images.slice(0, 6)),
    });
    listing.images = buildImageRows(listing.id, enrichment.images.slice(0, 6)).map((image) => ({
      id: `${listing.id}-${image.order}`,
      listingId: image.listingId,
      url: image.url,
      alt: image.alt,
      order: image.order,
      isPrimary: image.isPrimary,
    }));
  }

  if (enrichment.amenities?.length) {
    const existingKeys = new Set(
      listing.amenities.map((amenity) => `${amenity.category}:${amenity.name.toLowerCase()}`)
    );
    const toCreate = enrichment.amenities
      .map((amenity) => ({
        listingId: listing.id,
        category: normalizeAmenityCategory(amenity.category),
        name: amenity.name,
        quantity: Math.max(1, amenity.quantity || 1),
      }))
      .filter((amenity) => !existingKeys.has(`${amenity.category}:${amenity.name.toLowerCase()}`));

    if (toCreate.length > 0) {
      await prisma.listingAmenity.createMany({ data: toCreate });
      listing.amenities.push(
        ...toCreate.map((amenity, index) => ({
          id: `${listing.id}-amenity-${index}`,
          listingId: amenity.listingId,
          category: amenity.category,
          name: amenity.name,
          description: null,
          quantity: amenity.quantity,
        }))
      );
    }
  }
}

async function recomputeWorkScoreForListing(
  prisma: typeof import("@/lib/db")["db"],
  listingId: string
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { amenities: true, connectivityProfile: true },
  });

  if (!listing) return 0;

  const workScore = computeWorkScore({
    amenities: listing.amenities,
    connectivity: listing.connectivityProfile,
  }).total;

  await prisma.listing.update({
    where: { id: listingId },
    data: { workScore },
  });

  return workScore;
}

export async function curateApaleoMadridListings(
  input: CurateApaleoMadridListingsInput = {}
): Promise<CurateApaleoMadridListingsResult> {
  const { db } = await import("@/lib/db");
  const enrichmentRecords = input.useFixtures === false ? [] : getFixtureRecords();
  const enrichmentByUnitGroup = new Map(
    enrichmentRecords.map((record) => [record.unitGroupId, record])
  );

  const listings = await db.listing.findMany({
    where: {
      city: "Madrid",
      pmsConnection: { provider: "APALEO" },
      ...(input.hostEmail
        ? {
            host: {
              email: input.hostEmail,
            },
          }
        : {}),
    },
    include: {
      amenities: true,
      images: { orderBy: { order: "asc" } },
      connectivityProfile: true,
      pmsConnection: true,
      host: { select: { email: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  let publishable = 0;
  let needsReview = 0;
  let rejected = 0;
  const results: CurateApaleoMadridListingsResult["listings"] = [];

  for (const listing of listings) {
    await mergeEnrichment(db, listing, enrichmentByUnitGroup.get(listing.pmsExternalUnitGroupId || ""));
    const workScore = await recomputeWorkScoreForListing(db, listing.id);

    const refreshedListing = await db.listing.findUnique({
      where: { id: listing.id },
      include: {
        amenities: true,
        images: true,
        connectivityProfile: true,
      },
    });

    if (!refreshedListing) continue;

    const hasKitchen = refreshedListing.amenities.some((amenity) => amenity.category === "KITCHEN");
    const hasDesk = refreshedListing.amenities.some((amenity) => amenity.category === "DESK");
    const hasQuiet = refreshedListing.amenities.some((amenity) => amenity.category === "QUIET");
    const assessment = assessApaleoMadridListing({
      city: refreshedListing.city,
      workspaceType: refreshedListing.workspaceType,
      descriptionLength: refreshedListing.description.trim().length,
      imageCount: refreshedListing.images.length,
      amenityCount: refreshedListing.amenities.length,
      maxGuests: refreshedListing.maxGuests,
      pricePerDay: refreshedListing.pricePerDay,
      hasKitchen,
      hasDesk,
      hasQuiet,
      hasPmsMapping: Boolean(refreshedListing.pmsExternalListingId),
      hasRatePlanMapping: Boolean(refreshedListing.pmsExternalRatePlanId),
      downloadMbps: refreshedListing.connectivityProfile?.declaredDownloadMbps || 0,
      workScore,
    });

    await db.listing.update({
      where: { id: listing.id },
      data: {
        curationStatus: assessment.curationStatus,
        curationNotes: assessment.notes,
        status: assessment.targetStatus,
        rejectionReason: assessment.curationStatus === "REJECTED" ? assessment.notes : null,
      },
    });

    if (assessment.curationStatus === "PUBLISHABLE") publishable += 1;
    if (assessment.curationStatus === "NEEDS_REVIEW") needsReview += 1;
    if (assessment.curationStatus === "REJECTED") rejected += 1;

    results.push({
      id: listing.id,
      title: listing.title,
      curationStatus: assessment.curationStatus,
      targetStatus: assessment.targetStatus,
      notes: assessment.notes,
    });
  }

  return {
    curated: results.length,
    publishable,
    needsReview,
    rejected,
    listings: results,
  };
}
