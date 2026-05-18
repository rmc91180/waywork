import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, Eye, Pencil, BarChart2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { buildHostListingScope } from "@/lib/host-access";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: "Active",       color: "#2d6a4f", bg: "#d8f3dc" },
  PAUSED:    { label: "Paused",       color: "#805000", bg: "#fff0cc" },
  PENDING:   { label: "In review",    color: "#4a7fa5", bg: "#e0eef8" },
  DRAFT:     { label: "Draft",        color: "#6b5e52", bg: "#f0ebe2" },
  ARCHIVED:  { label: "Archived",     color: "#9a9087", bg: "#f0ebe2" },
};

export default async function HostListingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scope = buildHostListingScope(session.user.id);
  const listings = await db.listing.findMany({
    where: scope,
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ background: "var(--ww-parchment)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "var(--ww-ink)", paddingBottom: "64px" }}>
        <div className="waywork-shell pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="ww-eyebrow mb-1" style={{ color: "var(--ww-gold)" }}>Host dashboard</p>
              <h1 className="text-3xl font-bold text-white"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
                Your listings
              </h1>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                {listings.length} propert{listings.length === 1 ? "y" : "ies"}
              </p>
            </div>
            <Button
              className="shrink-0 shadow-md"
              style={{ background: "var(--ww-terra)", color: "white" }}
              asChild
            >
              <Link href="/host/listings/new">
                <PlusCircle className="mr-2 size-4" />
                Add listing
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="waywork-shell -mt-10 pb-16">
        {listings.length === 0 ? (
          /* Empty state */
          <div
            className="flex flex-col items-center rounded-3xl py-16 text-center"
            style={{ background: "var(--ww-warm-white)", border: "1px solid var(--ww-mist)" }}
          >
            <div className="mb-4 text-5xl">🏠</div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--ww-ink)" }}>
              No listings yet
            </h2>
            <p className="mt-2 max-w-sm text-sm" style={{ color: "#7a6e62" }}>
              Create your first listing and start earning from work travelers. Takes about 20 minutes.
            </p>
            <Button
              className="mt-6"
              style={{ background: "var(--ww-terra)", color: "white" }}
              asChild
            >
              <Link href="/host/listings/new">
                <PlusCircle className="mr-2 size-4" /> Create your first listing
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const img = listing.images[0]?.url;
              const st  = STATUS_STYLE[listing.status] ?? STATUS_STYLE.DRAFT;
              const currency = listing.currency ?? "USD";

              return (
                <div
                  key={listing.id}
                  className="overflow-hidden rounded-2xl transition hover:shadow-md"
                  style={{ background: "var(--ww-warm-white)", border: "1px solid var(--ww-mist)" }}
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="relative h-32 w-44 shrink-0 overflow-hidden sm:h-36 sm:w-52">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={listing.title}
                          className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl"
                          style={{ background: "var(--ww-gold-light)" }}>🏠</div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-4 pr-4">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-semibold"
                            style={{ color: "var(--ww-ink)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                            {listing.title}
                          </h3>
                          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </div>

                        <p className="mt-1 text-sm" style={{ color: "#7a6e62" }}>
                          {listing.city}{listing.country ? `, ${listing.country}` : ""}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-4 text-xs" style={{ color: "#7a6e62" }}>
                          <span>
                            <span className="font-mono font-bold" style={{ color: "var(--ww-ink)" }}>
                              {formatCurrency(listing.pricePerDay, currency)}
                            </span>{" "}/ night
                          </span>
                          <span>
                            Work Score{" "}
                            <span className="font-mono font-bold" style={{ color: "var(--ww-ink)" }}>
                              {listing.workScore ?? "—"}
                            </span>
                          </span>
                          <span>
                            <span className="font-mono font-bold" style={{ color: "var(--ww-celadon)" }}>
                              {listing._count.bookings}
                            </span>{" "}active booking{listing._count.bookings !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline"
                          style={{ borderColor: "var(--ww-mist)", fontSize: "12px" }}
                          asChild
                        >
                          <Link href={`/host/listings/${listing.id}`}>
                            <Pencil className="mr-1.5 size-3" /> Edit
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline"
                          style={{ borderColor: "var(--ww-mist)", fontSize: "12px" }}
                          asChild
                        >
                          <Link href={`/spaces/${listing.slug ?? listing.id}`} target="_blank">
                            <Eye className="mr-1.5 size-3" /> Preview
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline"
                          style={{ borderColor: "var(--ww-mist)", fontSize: "12px" }}
                          asChild
                        >
                          <Link href={`/host/bookings?listing=${listing.id}`}>
                            <BarChart2 className="mr-1.5 size-3" /> Bookings
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
