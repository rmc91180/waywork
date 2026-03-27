import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
  Gauge,
  ShieldCheck,
  Sparkles,
  Users2,
  Wifi,
} from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/stripe";
import { HomeHero, type HeroImage } from "@/components/marketing/home-hero";
import { ReturningGuestBanner } from "@/components/marketing/returning-guest-banner";
import { HostTeaserToggle } from "@/components/marketing/host-teaser-toggle";
import { HomeQuickSearchForm } from "@/components/marketing/home-quick-search-form";

type FeaturedListing = {
  id: string;
  title: string;
  city: string;
  state: string | null;
  country: string;
  pricePerDay: number;
  maxGuests: number;
  workScore: number;
  images: Array<{ url: string; alt: string | null }>;
  connectivityProfile: {
    declaredDownloadMbps: number;
    verified: boolean;
  } | null;
};

type Testimonial = {
  id: string;
  comment: string;
  author: string;
  context: string;
};

const fallbackTestimonials: Testimonial[] = [
  {
    id: "fallback-1",
    comment: "Finally, a spot where my WiFi matches my wanderlust.",
    author: "Alex",
    context: "Digital Nomad",
  },
  {
    id: "fallback-2",
    comment: "Our leadership offsite felt productive and genuinely fun.",
    author: "Mina",
    context: "Chief of Staff",
  },
  {
    id: "fallback-3",
    comment: "The work score made picking a reliable setup fast and stress-free.",
    author: "Theo",
    context: "Product Lead",
  },
];

async function getHomepageData() {
  try {
    const [featuredListings, rawTestimonials, bookingCount, reviewStats, activeSpaceCount] =
      await Promise.all([
        db.listing.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ reviewCount: "desc" }, { workScore: "desc" }, { createdAt: "desc" }],
          take: 6,
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            country: true,
            pricePerDay: true,
            maxGuests: true,
            workScore: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true, alt: true },
            },
            connectivityProfile: {
              select: { declaredDownloadMbps: true, verified: true },
            },
          },
        }),
        db.review.findMany({
          where: {
            targetType: "LISTING",
            comment: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            comment: true,
            author: { select: { name: true } },
            listing: { select: { city: true, country: true } },
          },
        }),
        db.booking.count(),
        db.review.aggregate({ _avg: { overallRating: true } }),
        db.listing.count({ where: { status: "ACTIVE" } }),
      ]);

    const testimonials = rawTestimonials
      .filter((item) => item.comment && item.comment.trim().length > 30)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        comment: item.comment || "",
        author: item.author.name || "Way Work Guest",
        context: item.listing ? `${item.listing.city}, ${item.listing.country}` : "Way Work",
      }));

    return {
      featuredListings,
      testimonials: testimonials.length > 0 ? testimonials : fallbackTestimonials,
      bookingCount,
      averageRating: reviewStats._avg.overallRating ?? 4.8,
      activeSpaceCount,
    };
  } catch {
    return {
      featuredListings: [] as FeaturedListing[],
      testimonials: fallbackTestimonials,
      bookingCount: 500,
      averageRating: 4.8,
      activeSpaceCount: 100,
    };
  }
}

export async function HomepageRefresh() {
  noStore();
  const data = await getHomepageData();

  const heroImages: HeroImage[] = data.featuredListings
    .map((listing) => listing.images[0])
    .filter(Boolean)
    .map((image, index) => ({
      url: image.url,
      alt: image.alt || `Remote workspace destination ${index + 1}`,
    }))
    .slice(0, 5);

  return (
    <div className="pb-16">
      <HomeHero
        images={heroImages}
        searchPanel={
          <div className="space-y-4">
            <HomeQuickSearchForm />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-wrap gap-2">
                <span className="ww-trust-pill border-white/45 bg-white/14 text-white">
                  Verified Internet
                </span>
                <span className="ww-trust-pill border-white/45 bg-white/14 text-white">
                  Secure Booking
                </span>
                <span className="ww-trust-pill border-white/45 bg-white/14 text-white">
                  Flexible Stays
                </span>
                <span className="ww-trust-pill border-white/45 bg-white/14 text-white">
                  Team-Friendly Homes
                </span>
              </div>
              <ReturningGuestBanner />
            </div>
          </div>
        }
      />

      <section className="waywork-shell -mt-8 relative z-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Wifi,
              title: "Verified Internet",
              body: "Search homes with tested connectivity and stronger work setups.",
            },
            {
              icon: Gauge,
              title: "Work Score",
              body: "Understand productivity fit at a glance before you book.",
            },
            {
              icon: Users2,
              title: "Small-Team Ready",
              body: "Find residential layouts that work for solo trips and team escapes.",
            },
            {
              icon: ShieldCheck,
              title: "Clear Booking Flow",
              body: "Transparent pricing, direct booking, and cleaner trust signals.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <item.icon className="size-5 text-[var(--ww-secondary-green)]" />
              <h2 className="mt-3 text-lg font-semibold text-[var(--ww-primary-blue)]">
                {item.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--ww-text-primary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
              Featured Stays
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
              Spaces that work as hard as you do.
            </h2>
            <p className="mt-1 text-sm text-[var(--ww-text-primary)]">
              Browse residential spaces curated for reliable workdays and better downtime.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/search">Browse all spaces</Link>
          </Button>
        </div>

        <div className="grid auto-cols-[84%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-[48%] lg:auto-cols-[32%]">
          {data.featuredListings.length > 0 ? (
            data.featuredListings.map((listing) => (
              <article
                key={listing.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] bg-slate-100">
                  {listing.images[0]?.url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={listing.images[0].url}
                        alt={listing.images[0].alt || listing.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Workspace Preview
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-lg font-semibold text-[var(--ww-primary-blue)]">
                      {listing.title}
                    </h3>
                    <p className="text-sm font-semibold text-[var(--ww-primary-blue)]">
                      {formatCurrency(listing.pricePerDay)}/day
                    </p>
                  </div>
                  <p className="text-sm text-[var(--ww-text-primary)]">
                    {listing.city}
                    {listing.state ? `, ${listing.state}` : ""}, {listing.country}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--ww-secondary-green)]">
                    <span className="ww-trust-pill inline-flex items-center gap-1.5">
                      <Wifi className="size-3.5" />
                      {listing.connectivityProfile?.declaredDownloadMbps ?? 0} Mbps
                    </span>
                    <span className="ww-trust-pill inline-flex items-center gap-1.5">
                      <Users2 className="size-3.5" />
                      Up to {listing.maxGuests}
                    </span>
                    <span className="ww-trust-pill inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5" />
                      Work Score {listing.workScore}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-[var(--ww-secondary-green)]/30 text-[var(--ww-primary-blue)] hover:bg-emerald-50"
                    asChild
                  >
                    <Link href={`/spaces/${listing.id}`}>View Details</Link>
                  </Button>
                </div>
              </article>
            ))
          ) : (
            Array.from({ length: 3 }).map((_, index) => (
              <article
                key={`placeholder-${index}`}
                className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500"
              >
                Featured listing coming soon.
              </article>
            ))
          )}
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
              Guest Feedback
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
              Guests keep coming back for a reason.
            </h2>
            <p className="mt-1 text-sm text-[var(--ww-text-primary)]">
              Better search clarity, stronger work signals, and homes that feel easier to trust.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="ww-trust-pill inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              {data.bookingCount}+ bookings
            </span>
            <span className="ww-trust-pill">{data.averageRating.toFixed(1)}/5 average rating</span>
            <span className="ww-trust-pill">{data.activeSpaceCount}+ active spaces</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.testimonials.map((testimonial) => (
            <article key={testimonial.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm italic text-[var(--ww-text-primary)]">
                &quot;{testimonial.comment}&quot;
              </p>
              <p className="mt-4 text-sm font-semibold text-[var(--ww-primary-blue)]">
                {testimonial.author}
              </p>
              <p className="text-xs text-slate-500">{testimonial.context}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <HostTeaserToggle />
      </section>
    </div>
  );
}
