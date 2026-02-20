import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WORKSPACE_TYPES } from "@/lib/constants";
import { getWorkScoreColor } from "@/lib/work-score";
import { cn } from "@/lib/utils";
import { HostListingActions } from "@/components/host/listing-actions";

export const metadata = {
  title: "My Listings",
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  PENDING_REVIEW: { label: "Pending Review", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  PAUSED: { label: "Paused", variant: "secondary" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default async function HostListingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const listings = await db.listing.findMany({
    where: { hostId: session.user.id },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      _count: { select: { bookings: true, reviews: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="mt-1 text-gray-600">
            Manage your workspaces on WayWork.
          </p>
        </div>
        <Button asChild>
          <Link href="/host/listings/new">+ New Listing</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold">No listings yet</h3>
            <p className="text-gray-500 mt-2">
              Create your first listing to start hosting on WayWork.
            </p>
            <Button asChild className="mt-4">
              <Link href="/host/listings/new">Create Your First Listing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const status = STATUS_BADGES[listing.status] || STATUS_BADGES.DRAFT;
            const wsType = WORKSPACE_TYPES[listing.workspaceType as keyof typeof WORKSPACE_TYPES];
            const primaryImage = listing.images[0];

            return (
              <Card key={listing.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="h-24 w-36 flex-shrink-0 rounded-md bg-gray-100 overflow-hidden">
                      {primaryImage?.url?.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={primaryImage.url}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-2xl">
                          {wsType?.icon || "🏢"}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/host/listings/${listing.id}`}
                            className="font-semibold hover:underline line-clamp-1"
                          >
                            {listing.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {wsType?.label || listing.workspaceType}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-lg font-bold", getWorkScoreColor(listing.workScore))}>
                            {listing.workScore}
                          </p>
                          <p className="text-xs text-gray-500">Work Score</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{listing.city}, {listing.country}</span>
                        <span>${(listing.pricePerDay / 100).toFixed(0)}/day</span>
                        <span>{listing.maxGuests} guest{listing.maxGuests > 1 ? "s" : ""}</span>
                        <span>{listing._count.bookings} booking{listing._count.bookings !== 1 ? "s" : ""}</span>
                      </div>

                      <div className="mt-2">
                        <HostListingActions
                          listingId={listing.id}
                          status={listing.status}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
