import path from "node:path";
import slugify from "slugify";
import type { AmenityCategory, CancellationPolicy, NetworkType, WorkspaceType } from "@/generated/prisma";
import { ApaleoClient, type ApaleoProperty, type ApaleoRatePlan, type ApaleoUnitGroup } from "@/lib/pms/apaleo-client";
import { computeWorkScore } from "@/lib/work-score";

const DEFAULT_MADRID_LAT = 40.4168;
const DEFAULT_MADRID_LNG = -3.7038;

export interface ApaleoMadridImportCandidate {
  externalPropertyId: string;
  externalUnitGroupId: string;
  externalRatePlanId: string;
  title: string;
  slug: string;
  description: string;
  workspaceType: WorkspaceType;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
  lat: number;
  lng: number;
  maxGuests: number;
  bedroomCount: number;
  propertySizeSqm: number | null;
  pricePerDay: number;
  currency: string;
  cancellationPolicy: CancellationPolicy;
  connectivity: {
    declaredDownloadMbps: number;
    declaredUploadMbps: number;
    networkType: NetworkType;
  } | null;
  amenities: Array<{
    category: AmenityCategory;
    name: string;
    quantity: number;
  }>;
}

export interface ImportApaleoMadridListingsInput {
  hostEmail: string;
  hostName?: string;
  accountCode?: string;
  useFixtures?: boolean;
}

export interface ImportApaleoMadridListingsResult {
  hostId: string;
  connectionId: string;
  created: number;
  updated: number;
  candidates: number;
  listings: Array<{
    id: string;
    title: string;
    slug: string;
    externalPropertyId: string;
    externalUnitGroupId: string;
    externalRatePlanId: string;
  }>;
}

function normalizeCountry(countryCode: string | undefined) {
  if ((countryCode || "").toUpperCase() === "ES") return "Spain";
  return countryCode || "Spain";
}

function inferWorkspaceType(unitGroup: ApaleoUnitGroup): WorkspaceType {
  if (unitGroup.workspaceType) return unitGroup.workspaceType;

  const value = `${unitGroup.name} ${unitGroup.description || ""}`.toLowerCase();
  if (value.includes("studio")) return "STUDIO";
  return "HOME_OFFICE";
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

function buildDeterministicSlug(input: {
  propertyName: string;
  unitGroupName: string;
  ratePlanCode?: string;
  externalUnitGroupId: string;
}) {
  const base = slugify(
    `${input.propertyName}-${input.unitGroupName}-${input.ratePlanCode || input.externalUnitGroupId}`,
    {
      lower: true,
      strict: true,
    }
  );

  return base.slice(0, 90);
}

export function buildApaleoMadridImportCandidates(input: {
  properties: ApaleoProperty[];
  unitGroups: ApaleoUnitGroup[];
  ratePlans: ApaleoRatePlan[];
}) {
  const madridProperties = input.properties.filter(
    (property) => (property.city || "").trim().toLowerCase() === "madrid"
  );
  const madridPropertyIds = new Set(madridProperties.map((property) => property.id));
  const propertiesById = new Map(madridProperties.map((property) => [property.id, property]));

  const candidates: ApaleoMadridImportCandidate[] = [];

  for (const unitGroup of input.unitGroups) {
    if (!madridPropertyIds.has(unitGroup.propertyId)) continue;

    const property = propertiesById.get(unitGroup.propertyId);
    if (!property) continue;

    const ratePlans = input.ratePlans.filter(
      (ratePlan) =>
        ratePlan.unitGroupId === unitGroup.id &&
        (!ratePlan.propertyId || ratePlan.propertyId === property.id)
    );

    for (const ratePlan of ratePlans) {
      const workspaceType = inferWorkspaceType(unitGroup);
      const title = `${property.name} · ${unitGroup.name}`;
      const slug = buildDeterministicSlug({
        propertyName: property.name,
        unitGroupName: unitGroup.name,
        ratePlanCode: ratePlan.code,
        externalUnitGroupId: unitGroup.id,
      });
      const amenities =
        unitGroup.amenities?.map((amenity) => ({
          category: normalizeAmenityCategory(amenity.category),
          name: amenity.name,
          quantity: Math.max(1, amenity.quantity || 1),
        })) || [];

      candidates.push({
        externalPropertyId: property.id,
        externalUnitGroupId: unitGroup.id,
        externalRatePlanId: ratePlan.id,
        title,
        slug,
        description:
          unitGroup.description ||
          `Imported apaleo inventory for ${title}. This draft listing still needs Limehome enrichment before publishing.`,
        workspaceType,
        address: property.addressLine1 || property.name,
        city: property.city || "Madrid",
        state: "Madrid",
        country: normalizeCountry(property.countryCode),
        postalCode: property.postalCode || null,
        lat: property.lat || DEFAULT_MADRID_LAT,
        lng: property.lng || DEFAULT_MADRID_LNG,
        maxGuests: Math.max(1, unitGroup.maxPersons || 1),
        bedroomCount: Math.max(1, unitGroup.bedroomCount || 1),
        propertySizeSqm: unitGroup.propertySizeSqm || null,
        pricePerDay: ratePlan.pricePerDayCents || 0,
        currency: ratePlan.currency || "EUR",
        cancellationPolicy: ratePlan.cancellationPolicy || "FLEXIBLE",
        connectivity: unitGroup.connectivity
          ? {
              declaredDownloadMbps: unitGroup.connectivity.declaredDownloadMbps,
              declaredUploadMbps: unitGroup.connectivity.declaredUploadMbps,
              networkType: unitGroup.connectivity.networkType || "WIFI",
            }
          : null,
        amenities,
      });
    }
  }

  return candidates;
}

function getFixtureDir() {
  return path.join(process.cwd(), "scripts", "fixtures", "apaleo");
}

function buildApaleoClient(useFixtures = true) {
  return new ApaleoClient({
    apiBaseUrl: process.env.APALEO_API_BASE_URL || "https://api.apaleo.com",
    identityBaseUrl: process.env.APALEO_IDENTITY_BASE_URL || "https://identity.apaleo.com",
    fixtureDir: useFixtures ? getFixtureDir() : null,
  });
}

async function recomputeImportedListingWorkScore(
  prisma: typeof import("@/lib/db")["db"],
  listingId: string
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { amenities: true, connectivityProfile: true },
  });

  if (!listing) return;

  const score = computeWorkScore({
    amenities: listing.amenities,
    connectivity: listing.connectivityProfile,
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: { workScore: score.total },
  });
}

export async function importApaleoMadridListings(
  input: ImportApaleoMadridListingsInput
): Promise<ImportApaleoMadridListingsResult> {
  const { db } = await import("@/lib/db");
  const client = buildApaleoClient(input.useFixtures ?? true);
  const [properties, unitGroups, ratePlans] = await Promise.all([
    client.listProperties(),
    client.listUnitGroups(),
    client.listRatePlans(),
  ]);

  const candidates = buildApaleoMadridImportCandidates({
    properties,
    unitGroups,
    ratePlans,
  });

  const host = await db.user.upsert({
    where: { email: input.hostEmail },
    update: {
      name: input.hostName || undefined,
      role: "HOST",
    },
    create: {
      email: input.hostEmail,
      name: input.hostName || "Limehome",
      role: "HOST",
    },
  });

  const connection = await db.pmsConnection.upsert({
    where: {
      userId_provider: {
        userId: host.id,
        provider: "APALEO",
      },
    },
    update: {
      apaleoAccountCode: input.accountCode || "LIMEHOME-MADRID",
    },
    create: {
      userId: host.id,
      provider: "APALEO",
      enabled: false,
      apaleoAccountCode: input.accountCode || "LIMEHOME-MADRID",
    },
  });

  let created = 0;
  let updated = 0;
  const listings: ImportApaleoMadridListingsResult["listings"] = [];

  for (const candidate of candidates) {
    const existing = await db.listing.findFirst({
      where: {
        hostId: host.id,
        pmsConnectionId: connection.id,
        pmsExternalPropertyId: candidate.externalPropertyId,
        pmsExternalUnitGroupId: candidate.externalUnitGroupId,
        pmsExternalRatePlanId: candidate.externalRatePlanId,
      },
      select: {
        id: true,
        description: true,
        slug: true,
        status: true,
        connectivityProfile: { select: { verified: true } },
        amenities: { select: { id: true } },
      },
    });

    const listing = existing
      ? await db.listing.update({
          where: { id: existing.id },
          data: {
            title: candidate.title,
            slug: existing.slug || candidate.slug,
            description:
              existing.description.trim().length > 0 &&
              !existing.description.includes("Imported apaleo inventory")
                ? existing.description
                : candidate.description,
            workspaceType: candidate.workspaceType,
            address: candidate.address,
            city: candidate.city,
            state: candidate.state,
            country: candidate.country,
            postalCode: candidate.postalCode,
            lat: candidate.lat,
            lng: candidate.lng,
            maxGuests: candidate.maxGuests,
            bedroomCount: candidate.bedroomCount,
            propertySizeSqm: candidate.propertySizeSqm,
            pricePerDay: candidate.pricePerDay,
            currency: candidate.currency,
            cancellationPolicy: candidate.cancellationPolicy,
            pmsConnectionId: connection.id,
            pmsExternalPropertyId: candidate.externalPropertyId,
            pmsExternalListingId: candidate.externalUnitGroupId,
            pmsExternalUnitGroupId: candidate.externalUnitGroupId,
            pmsExternalRatePlanId: candidate.externalRatePlanId,
            pmsSyncStatus: "PENDING",
            pmsSyncError: null,
          },
        })
      : await db.listing.create({
          data: {
            hostId: host.id,
            status: "DRAFT",
            title: candidate.title,
            description: candidate.description,
            slug: candidate.slug,
            workspaceType: candidate.workspaceType,
            address: candidate.address,
            city: candidate.city,
            state: candidate.state,
            country: candidate.country,
            postalCode: candidate.postalCode,
            lat: candidate.lat,
            lng: candidate.lng,
            maxGuests: candidate.maxGuests,
            bedroomCount: candidate.bedroomCount,
            bedSize: "QUEEN",
            propertySizeSqm: candidate.propertySizeSqm,
            pricePerDay: candidate.pricePerDay,
            cleaningFee: 0,
            currency: candidate.currency,
            cancellationPolicy: candidate.cancellationPolicy,
            pmsConnectionId: connection.id,
            pmsExternalPropertyId: candidate.externalPropertyId,
            pmsExternalListingId: candidate.externalUnitGroupId,
            pmsExternalUnitGroupId: candidate.externalUnitGroupId,
            pmsExternalRatePlanId: candidate.externalRatePlanId,
            pmsSyncStatus: "PENDING",
          },
        });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }

    if (candidate.connectivity && !existing?.connectivityProfile?.verified) {
      await db.connectivityProfile.upsert({
        where: { listingId: listing.id },
        create: {
          listingId: listing.id,
          ...candidate.connectivity,
          verified: false,
        },
        update: {
          ...candidate.connectivity,
        },
      });
    }

    if (!existing || existing.amenities.length === 0) {
      await db.listingAmenity.deleteMany({ where: { listingId: listing.id } });
      if (candidate.amenities.length > 0) {
        await db.listingAmenity.createMany({
          data: candidate.amenities.map((amenity) => ({
            listingId: listing.id,
            ...amenity,
          })),
        });
      }
    }

    await recomputeImportedListingWorkScore(db, listing.id);

    listings.push({
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      externalPropertyId: candidate.externalPropertyId,
      externalUnitGroupId: candidate.externalUnitGroupId,
      externalRatePlanId: candidate.externalRatePlanId,
    });
  }

  return {
    hostId: host.id,
    connectionId: connection.id,
    created,
    updated,
    candidates: candidates.length,
    listings,
  };
}
