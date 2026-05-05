import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowRight, Gauge, Wifi } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLimehomePilotMeta } from "@/lib/limehome-pilot";
import { formatCurrency } from "@/lib/stripe";
import { HomeHero, type HeroImage } from "@/components/marketing/home-hero";
import { HomeQuickSearchForm } from "@/components/marketing/home-quick-search-form";

type FeaturedListing = {
  id: string;
  title: string;
  slug: string;
  city: string;
  state: string | null;
  country: string;
  pricePerDay: number;
  workScore: number;
  images: Array<{ url: string; alt: string | null }>;
  connectivityProfile: {
    declaredDownloadMbps: number;
    verified: boolean;
  } | null;
};

const getHomepageData = unstable_cache(
  async () => {
    try {
      const pilotListings = await db.listing.findMany({
      where: {
        status: "ACTIVE",
        city: "Madrid",
        slug: { startsWith: "limehome-madrid-" },
      },
      orderBy: [{ workScore: "desc" }, { pricePerDay: "asc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        slug: true,
        city: true,
        state: true,
        country: true,
        pricePerDay: true,
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
    });

    const featuredListings = await db.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ reviewCount: "desc" }, { workScore: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        slug: true,
        city: true,
        state: true,
        country: true,
        pricePerDay: true,
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
    });

    return {
      featuredListings: pilotListings.length > 0 ? pilotListings : featuredListings,
      hasPilotLaunchCollection: pilotListings.length > 0,
    };
  } catch {
    return {
      featuredListings: [] as FeaturedListing[],
      hasPilotLaunchCollection: false,
    };
  }
},
  ["homepage-data"],
  { revalidate: 300 }
);

const browseLinks = [
  {
    label: "Deep focus",
    description: "Quiet homes with strong internet",
    href: "/search?workspaceTypes=PRIVATE_OFFICE,HOME_OFFICE&minWorkScore=75&verifiedInternet=true",
  },
  {
    label: "Team stays",
    description: "Small-group homes with space to work together",
    href: "/search?workspaceTypes=HYBRID_SPACE,MEETING_ROOM&guests=4",
  },
  {
    label: "City escapes",
    description: "Well-located stays for work and downtime",
    href: "/search?sortBy=recommended",
  },
];

export async function HomepageRefresh() {
  const data = await getHomepageData();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Way Work",
        url: APP_URL,
        description: "Book work-ready residential apartments for solo workations and team offsites. Verified internet, desk setups, and Work Scores for every listing.",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/search?query={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "Way Work",
        url: APP_URL,
        logo: `${APP_URL}/images/logo.png`,
        sameAs: [],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "support@waywork.com",
          availableLanguage: ["English", "Hebrew"],
        },
      },
    ],
  };

  const heroImages: HeroImage[] = [
    {
      url: "/images/homepage-hero.png",
      alt: "Person working on a laptop beside a pool in a lush garden setting",
    },
    ...data.featuredListings.flatMap((listing, index) => {
      const image = listing.images[0];
      if (!image) return [];

      return [
        {
          url: image.url,
          alt: image.alt || `Work-ready stay ${index + 1}`,
        },
      ];
    }),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pb-18">
      <HomeHero
        images={heroImages}
        searchPanel={
          <div className="space-y-4">
            <HomeQuickSearchForm />
            <div className="flex flex-wrap gap-2 text-xs text-white/86">
              <span className="ww-trust-pill border-white/35 bg-white/10 text-white">
                Verified internet
              </span>
              <span className="ww-trust-pill border-white/35 bg-white/10 text-white">
                Work score on every stay
              </span>
              <span className="ww-trust-pill border-white/35 bg-white/10 text-white">
                Homes for solo trips and small teams
              </span>
            </div>
          </div>
        }
      />

      {/* ── Featured listings ──────────────────────────────────── */}
      <section className="waywork-shell mt-16 md:mt-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="ww-eyebrow">
              {data.hasPilotLaunchCollection ? "Madrid pilot collection" : "Featured homes"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl" style={{ color: "var(--ww-ink)" }}>
              {data.hasPilotLaunchCollection
                ? "Launching with Limehome in Madrid"
                : "Work-ready. From day one."}
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7a6e62" }}>
              {data.hasPilotLaunchCollection
                ? "A curated first collection of Madrid homes for solo trips, project pairs, and compact offsites."
                : "Every property is presented around what matters for work: internet, layout, guest fit, and price."}
            </p>
          </div>
          <Link
            href={data.hasPilotLaunchCollection ? "/search?query=madrid" : "/search"}
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5"
            style={{
              borderColor: "var(--ww-mist)",
              color: "var(--ww-ink)",
              background: "var(--ww-warm-white)",
            }}
          >
            {data.hasPilotLaunchCollection ? "Browse Madrid homes" : "Browse all spaces"}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {data.featuredListings.length > 0 ? (
            data.featuredListings.map((listing) => {
              const pilotMeta = getLimehomePilotMeta({ slug: listing.slug });
              const score = listing.workScore;
              const scoreColor = score >= 80 ? "var(--ww-celadon)" : score >= 65 ? "var(--ww-gold)" : "#7a6e62";

              return (
                <Link
                  key={listing.id}
                  href={`/spaces/${listing.id}`}
                  className="ww-listing-card ww-hover-lift group block"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "var(--ww-mist)" }}>
                    {listing.images[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.images[0].url}
                        alt={listing.images[0].alt || listing.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm" style={{ color: "#b8afa4" }}>
                        Preview coming soon
                      </div>
                    )}
                    <div className="ww-card-img-overlay absolute inset-0" />

                    {/* Score badge */}
                    <div
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold shadow-lg"
                      style={{ background: "var(--ww-ink)", color: scoreColor, fontFamily: "var(--font-mono, monospace)" }}
                    >
                      {score}
                    </div>

                    {/* Pilot badge */}
                    {pilotMeta && (
                      <div className="absolute left-3 top-3">
                        <span className="rounded-md bg-[var(--ww-celadon)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {pilotMeta.badge}
                        </span>
                      </div>
                    )}

                    {/* Price overlay */}
                    <div className="absolute bottom-3 right-3">
                      <span
                        className="rounded-lg px-2.5 py-1 text-sm font-bold text-white"
                        style={{ background: "rgba(13,31,45,0.55)", backdropFilter: "blur(8px)", fontFamily: "var(--font-mono, monospace)" }}
                      >
                        {formatCurrency(listing.pricePerDay)}/day
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <p className="text-xs" style={{ color: "#b8afa4" }}>
                      {listing.city}{listing.state ? `, ${listing.state}` : ""} · {listing.country}
                    </p>
                    <h3 className="mt-1 line-clamp-1 text-sm font-semibold" style={{ color: "var(--ww-ink)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                      {listing.title}
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="ww-trust-pill">
                        <Wifi className="size-3" />
                        {listing.connectivityProfile?.declaredDownloadMbps ?? 0} Mbps
                      </span>
                      {pilotMeta && (
                        <span className="ww-trust-pill">{pilotMeta.bestFor}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="aspect-[4/3] rounded-2xl ww-shimmer"
              />
            ))
          )}
        </div>
      </section>

      {/* ── Browse categories ──────────────────────────────────── */}
      <section className="waywork-shell mt-14 md:mt-18">
        <div className="grid gap-4 md:grid-cols-3">
          {browseLinks.map((link, i) => (
            <Link
              key={link.label}
              href={link.href}
              className="group relative overflow-hidden rounded-2xl p-6 transition ww-hover-lift"
              style={{
                background: i === 0 ? "var(--ww-ink)" : i === 1 ? "var(--ww-celadon)" : "var(--ww-terra)",
                color: "white",
              }}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="pointer-events-none absolute -bottom-4 -left-4 size-28 rounded-full"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
              <p className="relative text-lg font-semibold" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
                {link.label}
              </p>
              <p className="relative mt-1 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                {link.description}
              </p>
              <ArrowRight className="relative mt-4 size-4 transition-transform group-hover:translate-x-1" style={{ color: "rgba(255,255,255,0.6)" }} />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Host CTA ───────────────────────────────────────────── */}
      <section className="waywork-shell mt-14 md:mt-18">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-10 md:px-12 md:py-12"
          style={{ background: "var(--ww-gold-light)", border: "1px solid rgba(201,168,76,0.3)" }}
        >
          {/* Decorative background text */}
          <span
            className="pointer-events-none absolute -right-4 -top-4 select-none text-[120px] font-bold leading-none"
            style={{ color: "rgba(201,168,76,0.12)", fontFamily: "var(--font-playfair), Georgia, serif" }}
            aria-hidden
          >
            Host
          </span>

          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="ww-eyebrow" style={{ color: "var(--ww-celadon)" }}>For hosts</p>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl" style={{ color: "var(--ww-ink)" }}>
                Your property earns more with work travelers.
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5a5047" }}>
                Remote workers stay longer, treat spaces better, and book shoulder seasons.
                Add your home to WayWork and we'll handle the rest.
              </p>
            </div>
            <Link
              href="/register?callbackUrl=%2Fhost"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{
                background: "var(--ww-ink)",
                color: "var(--ww-gold-light)",
                boxShadow: "0 2px 8px rgba(13,31,45,0.2)",
              }}
            >
              Become a host
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
    </>
  );
}
