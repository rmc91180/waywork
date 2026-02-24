import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartNoAxesCombined, CircleCheck, Clock3, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const activeCount = listings.filter((listing) => listing.status === "ACTIVE").length;
  const pendingCount = listings.filter((listing) => listing.status === "PENDING_REVIEW").length;
  const avgWorkScore =
    listings.length > 0
      ? Math.round(listings.reduce((sum, listing) => sum + listing.workScore, 0) / listings.length)
      : 0;

  return (
    <div className="waywork-shell py-8 md:py-10">
      <section className="waywork-section mb-6 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Host Workspace Console
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Listings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage visual quality, listing readiness, and daily booking performance.
            </p>
          </div>
          <Button className="bg-cyan-700 hover:bg-cyan-800" asChild>
            <Link href="/host/listings/new">
              <Plus className="size-4" />
              New Listing
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Active</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pending Review</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Avg Work Score</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{avgWorkScore}</p>
          </div>
        </div>
      </section>

      {listings.length === 0 ? (
        <Card className="waywork-section">
          <CardContent className="py-14 text-center">
            <h3 className="font-display text-xl font-semibold text-slate-900">No listings yet</h3>
            <p className="mt-2 text-slate-600">
              Publish your first workspace and start receiving team offsite requests.
            </p>
            <Button className="mt-4 bg-cyan-700 hover:bg-cyan-800" asChild>
              <Link href="/host/listings/new">Create Your First Listing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const status = STATUS_BADGES[listing.status] || STATUS_BADGES.DRAFT;
            const workspaceType = WORKSPACE_TYPES[listing.workspaceType as keyof typeof WORKSPACE_TYPES];
            const primaryImage = listing.images[0];

            return (
              <Card key={listing.id} className="border-slate-200/80 bg-white/95">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 md:w-44">
                      {primaryImage?.url?.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={primaryImage.url}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl">
                          {workspaceType?.icon || "🏢"}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/host/listings/${listing.id}`}
                            className="font-display line-clamp-1 text-lg font-semibold text-slate-900 hover:text-cyan-700"
                          >
                            {listing.title}
                          </Link>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <Badge variant="outline">{workspaceType?.label || listing.workspaceType}</Badge>
                            <Badge variant="outline">
                              {(listing.pricePerDay / 100).toFixed(0)} / day
                            </Badge>
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                          <p className={cn("text-2xl font-bold", getWorkScoreColor(listing.workScore))}>
                            {listing.workScore}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                            Work Score
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                        <span className="inline-flex items-center gap-1.5">
                          <CircleCheck className="size-3.5 text-emerald-600" />
                          {listing.city}, {listing.country}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <ChartNoAxesCombined className="size-3.5 text-cyan-600" />
                          {listing._count.bookings} bookings
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5 text-slate-500" />
                          {listing.maxGuests} guest{listing.maxGuests > 1 ? "s" : ""}
                        </span>
                        <span>{listing._count.reviews} review{listing._count.reviews !== 1 ? "s" : ""}</span>
                      </div>

                      <div className="mt-3">
                        <HostListingActions listingId={listing.id} status={listing.status} />
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
