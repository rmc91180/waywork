import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
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

async function getHomepageData() {
  try {
    const pilotListings = await db.listing.findMany({
      where: {
        status: "ACTIVE",
        city: "Madrid",
        slug: { startsWith: "limehome-madrid-" },
      },
      orderBy: [{ workScore: "desc" }, { pricePerDay: "asc" }],
      take: 3,
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
      take: 3,
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
}

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
  noStore();
  const data = await getHomepageData();

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

      <section className="waywork-shell mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
              {data.hasPilotLaunchCollection ? "Madrid pilot collection" : "Featured homes"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
              {data.hasPilotLaunchCollection
                ? "Launching with Limehome in Madrid"
                : "Search first. Decide fast."}
            </h2>
            <p className="mt-2 text-sm text-[var(--ww-text-primary)] md:text-base">
              {data.hasPilotLaunchCollection
                ? "A tighter first collection of Madrid homes for solo work trips, project pairs, and compact offsites."
                : "Every property is presented around the details that matter most for work: internet, layout, guest fit, and price."}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={data.hasPilotLaunchCollection ? "/search?query=madrid" : "/search"}>
              {data.hasPilotLaunchCollection ? "Browse Madrid launch homes" : "Browse all spaces"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {data.featuredListings.length > 0 ? (
            data.featuredListings.map((listing) => {
              const pilotMeta = getLimehomePilotMeta({ slug: listing.slug });

              return (
                <article
                  key={listing.id}
                  className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
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

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {pilotMeta ? (
                          <Badge variant="secondary" className="mb-2 bg-cyan-50 text-cyan-800">
                            {pilotMeta.badge}
                          </Badge>
                        ) : null}
                        <p className="text-sm text-slate-500">
                          {listing.city}
                          {listing.state ? `, ${listing.state}` : ""}, {listing.country}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-xl font-semibold text-[var(--ww-primary-blue)]">
                          {listing.title}
                        </h3>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[var(--ww-primary-blue)]">
                        {formatCurrency(listing.pricePerDay)}/day
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                      <span className="ww-trust-pill inline-flex items-center gap-1.5">
                        <Wifi className="size-3.5" />
                        {listing.connectivityProfile?.declaredDownloadMbps ?? 0} Mbps
                      </span>
                      <span className="ww-trust-pill inline-flex items-center gap-1.5">
                        <Gauge className="size-3.5" />
                        Work Score {listing.workScore}
                      </span>
                      {pilotMeta ? (
                        <span className="ww-trust-pill inline-flex items-center gap-1.5">
                          {pilotMeta.bestFor}
                        </span>
                      ) : null}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-[var(--ww-secondary-green)]/25 text-[var(--ww-primary-blue)] hover:bg-emerald-50"
                      asChild
                    >
                      <Link href={`/spaces/${listing.id}`}>View property</Link>
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            Array.from({ length: 3 }).map((_, index) => (
              <article
                key={`placeholder-${index}`}
                className="rounded-[30px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500"
              >
                Featured property coming soon.
              </article>
            ))
          )}
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="grid gap-4 rounded-[32px] border border-slate-200 bg-white p-5 md:grid-cols-3 md:p-6">
          {browseLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[var(--ww-secondary-green)]/35 hover:bg-white"
            >
              <p className="text-lg font-semibold text-[var(--ww-primary-blue)]">{link.label}</p>
              <p className="mt-1 text-sm text-[var(--ww-text-primary)]">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="waywork-shell mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-slate-200 bg-[#f7f8fa] px-6 py-6 md:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--ww-secondary-green)]">
              For hosts
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ww-primary-blue)] md:text-3xl">
              Want to list a work-ready home?
            </h2>
            <p className="mt-2 text-sm text-[var(--ww-text-primary)] md:text-base">
              We&apos;ll refine the host experience next. For now, guests stay front and center and
              hosts still have a clear route in.
            </p>
          </div>
          <Button asChild className="bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]">
            <Link href="/register?callbackUrl=%2Fhost">Become a Host</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
