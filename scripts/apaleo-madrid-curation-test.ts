import { strict as assert } from "node:assert";
import { assessApaleoMadridListing } from "@/lib/pms/apaleo-curation";

async function run() {
  const publishable = assessApaleoMadridListing({
    city: "Madrid",
    workspaceType: "HOME_OFFICE",
    descriptionLength: 220,
    imageCount: 3,
    amenityCount: 6,
    maxGuests: 4,
    pricePerDay: 21900,
    hasKitchen: true,
    hasDesk: true,
    hasQuiet: true,
    hasPmsMapping: true,
    hasRatePlanMapping: true,
    downloadMbps: 180,
    workScore: 72,
  });

  const needsReview = assessApaleoMadridListing({
    city: "Madrid",
    workspaceType: "STUDIO",
    descriptionLength: 120,
    imageCount: 2,
    amenityCount: 4,
    maxGuests: 2,
    pricePerDay: 14900,
    hasKitchen: true,
    hasDesk: true,
    hasQuiet: false,
    hasPmsMapping: true,
    hasRatePlanMapping: true,
    downloadMbps: 35,
    workScore: 48,
  });

  const rejected = assessApaleoMadridListing({
    city: "Barcelona",
    workspaceType: "MEETING_ROOM",
    descriptionLength: 300,
    imageCount: 5,
    amenityCount: 8,
    maxGuests: 6,
    pricePerDay: 19900,
    hasKitchen: false,
    hasDesk: true,
    hasQuiet: true,
    hasPmsMapping: false,
    hasRatePlanMapping: false,
    downloadMbps: 200,
    workScore: 81,
  });

  assert.equal(publishable.curationStatus, "PUBLISHABLE");
  assert.equal(publishable.targetStatus, "PENDING_REVIEW");
  assert.equal(needsReview.curationStatus, "NEEDS_REVIEW");
  assert.ok(needsReview.notes.includes("Add at least 3 listing photos."));
  assert.equal(rejected.curationStatus, "REJECTED");
  assert.equal(rejected.targetStatus, "REJECTED");

  console.log("[apaleo-madrid-curation] PASS");
  console.log("[apaleo-madrid-curation] Verified publishable, needs-review, and rejected outcomes.");
}

run().catch((error) => {
  console.error("[apaleo-madrid-curation] FAIL", error);
  process.exit(1);
});
