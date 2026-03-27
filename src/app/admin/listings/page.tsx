import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { AdminListingActions } from "@/components/admin/listing-actions";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-orange-100 text-orange-800",
  REJECTED: "bg-red-100 text-red-800",
};

const curationColors: Record<string, string> = {
  NEEDS_REVIEW: "bg-slate-100 text-slate-800",
  PUBLISHABLE: "bg-blue-100 text-blue-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

export default async function AdminListingsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const listings = await db.listing.findMany({
    include: {
      host: { select: { id: true, name: true, email: true, image: true } },
      images: { where: { isPrimary: true }, take: 1 },
      _count: { select: { amenities: true, bookings: true, reviews: true } },
      connectivityProfile: { select: { declaredDownloadMbps: true, verified: true } },
    },
    orderBy: [
      { status: "asc" }, // PENDING_REVIEW sorts first
      { createdAt: "desc" },
    ],
  });

  const pending = listings.filter((l) => l.status === "PENDING_REVIEW");
  const active = listings.filter((l) => l.status === "ACTIVE");
  const other = listings.filter(
    (l) => l.status !== "PENDING_REVIEW" && l.status !== "ACTIVE"
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Listing Moderation</h1>
        <Link href="/admin/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
      </div>

      <Tabs defaultValue={pending.length > 0 ? "pending" : "active"}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active {active.length > 0 && `(${active.length})`}
          </TabsTrigger>
          <TabsTrigger value="other">
            Other {other.length > 0 && `(${other.length})`}
          </TabsTrigger>
        </TabsList>

        {[
          { key: "pending", items: pending },
          { key: "active", items: active },
          { key: "other", items: other },
        ].map(({ key, items }) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-4">
            {items.length === 0 ? (
              <p className="text-center py-12 text-gray-500">
                No listings in this category
              </p>
            ) : (
              items.map((listing) => (
                <Card key={listing.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-32 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {listing.images[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.images[0].url}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            🏢
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/spaces/${listing.id}`}
                              className="font-semibold hover:underline"
                            >
                              {listing.title}
                            </Link>
                            <p className="text-sm text-gray-600">
                              {listing.city}, {listing.state || listing.country}
                            </p>
                          </div>
                          <Badge className={statusColors[listing.status] || ""}>
                            {listing.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatCurrency(listing.pricePerDay)}/day</span>
                          <span>Score: {listing.workScore}/100</span>
                          <span>{listing._count.amenities} amenities</span>
                          <span>{listing._count.bookings} bookings</span>
                          {listing.connectivityProfile && (
                            <span>
                              {listing.connectivityProfile.declaredDownloadMbps} Mbps
                              {listing.connectivityProfile.verified && " ✓"}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={curationColors[listing.curationStatus] || ""}
                          >
                            {listing.curationStatus.replace(/_/g, " ")}
                          </Badge>
                          {listing.pmsConnectionId && (
                            <Badge variant="outline">PMS Imported</Badge>
                          )}
                        </div>

                        {/* Host info */}
                        <div className="flex items-center gap-2 mt-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={listing.host.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {listing.host.name?.[0] || "H"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-600">
                            {listing.host.name} ({listing.host.email})
                          </span>
                          <span className="text-xs text-gray-400">
                            · Submitted {format(listing.createdAt, "MMM d, yyyy")}
                          </span>
                        </div>

                        {listing.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                            Rejection reason: {listing.rejectionReason}
                          </div>
                        )}

                        {listing.curationNotes && (
                          <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-700">
                            Curation notes: {listing.curationNotes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {listing.status === "PENDING_REVIEW" && (
                        <div className="shrink-0">
                          <AdminListingActions listingId={listing.id} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
