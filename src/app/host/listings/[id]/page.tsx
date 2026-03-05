import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getListingAccessRole } from "@/lib/host-access";
import { ListingWizard } from "@/components/host/listing-wizard";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Edit Listing",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fhost");

  const { id } = await params;

  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      amenities: true,
      activities: { orderBy: [{ distanceKm: "asc" }, { title: "asc" }] },
      connectivityProfile: true,
      images: { orderBy: { order: "asc" } },
      availabilityRules: true,
      blockedDates: { where: { source: "MANUAL" } },
    },
  });

  const accessRole = listing ? await getListingAccessRole(session.user.id, listing.id) : null;
  if (!listing || !accessRole) {
    notFound();
  }

  // Transform listing data into wizard form shape
  const initialData = {
    title: listing.title,
    description: listing.description,
    workspaceType: listing.workspaceType,
    address: listing.address,
    city: listing.city,
    state: listing.state || "",
    country: listing.country,
    postalCode: listing.postalCode || "",
    lat: listing.lat,
    lng: listing.lng,
    maxGuests: listing.maxGuests,
    bedroomCount: listing.bedroomCount,
    bedSize: listing.bedSize,
    propertySizeSqm: listing.propertySizeSqm || 0,
    pricePerDay: listing.pricePerDay,
    cleaningFee: listing.cleaningFee,
    cancellationPolicy: listing.cancellationPolicy,
    hasJacuzzi: listing.hasJacuzzi,
    hasSwimmingPool: listing.hasSwimmingPool,
    hasBackyard: listing.hasBackyard,
    hasPingPongTable: listing.hasPingPongTable,
    hasPoolTable: listing.hasPoolTable,
    activities: listing.activities.map((activity) => ({
      title: activity.title,
      category: activity.category,
      description: activity.description || undefined,
      durationMinutes: activity.durationMinutes || undefined,
      distanceKm: activity.distanceKm || undefined,
      indoor: activity.indoor,
    })),
    amenities: listing.amenities.map((a) => ({
      category: a.category,
      name: a.name,
      description: a.description || undefined,
      quantity: a.quantity,
    })),
    connectivity: listing.connectivityProfile
      ? {
          declaredDownloadMbps:
            listing.connectivityProfile.declaredDownloadMbps,
          declaredUploadMbps: listing.connectivityProfile.declaredUploadMbps,
          networkType: listing.connectivityProfile.networkType,
          speedTestScreenshotUrl:
            listing.connectivityProfile.speedTestScreenshotUrl || undefined,
          speedTestDate: listing.connectivityProfile.speedTestDate?.toISOString() || undefined,
          hasBackupConnection:
            listing.connectivityProfile.hasBackupConnection,
          backupType: listing.connectivityProfile.backupType || undefined,
        }
      : {
          declaredDownloadMbps: 100,
          declaredUploadMbps: 50,
          networkType: "WIFI" as const,
          hasBackupConnection: false,
        },
    images: listing.images.map((img) => ({
      url: img.url,
      alt: img.alt || undefined,
      order: img.order,
      isPrimary: img.isPrimary,
    })),
    availability: listing.availabilityRules.map((r) => ({
      dayOfWeek: r.dayOfWeek ?? undefined,
      startDate: r.startDate?.toISOString() || undefined,
      endDate: r.endDate?.toISOString() || undefined,
      available: r.available,
    })),
    blockedDates: listing.blockedDates.map((d) => ({
      date: d.date.toISOString().split("T")[0],
      source: d.source as "MANUAL" | "ICAL" | "BOOKING" | "PMS",
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Listing</h1>
          <p className="mt-1 text-gray-600">{listing.title}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/host/listings">Back to Listings</Link>
        </Button>
      </div>
      <ListingWizard
        mode="edit"
        listingId={listing.id}
        initialData={initialData}
      />
    </div>
  );
}
