import type { Metadata } from "next";
import Link from "next/link";
import { Globe2, Wifi, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CITIES } from "@/lib/cities";

export const metadata: Metadata = {
  title: "Workation Destinations — Work-Ready Cities Worldwide | Way Work",
  description:
    "Discover the best cities for remote work and team offsites. Verified internet, curated apartments, and local guides for Madrid, Lisbon, Bangkok, Bali, Mexico City and more.",
};

const REGION_ORDER = ["Europe", "Asia", "Americas"];

function internetBadgeColor(tier: string) {
  if (tier === "Excellent") return "bg-emerald-100 text-emerald-800";
  if (tier === "Good") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function CitiesPage() {
  const byRegion = REGION_ORDER.map((region) => ({
    region,
    cities: CITIES.filter((c) => c.region === region),
  })).filter((r) => r.cities.length > 0);

  return (
    <div className="pb-20">

      {/* Hero */}
      <section className="waywork-hero-gradient relative overflow-hidden pb-14 pt-14 md:pb-18 md:pt-20">
        <div className="waywork-grid-bg absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-40 -top-40 size-[500px] rounded-full bg-[var(--ww-celadon)]/10 blur-3xl" />

        <div className="waywork-shell relative text-center">
          <div className="flex justify-center">
            <Badge className="bg-[var(--ww-ink)] text-white hover:bg-[var(--ww-ink)]">
              <Globe2 className="mr-1.5 size-3.5" />
              {CITIES.length} cities worldwide
            </Badge>
          </div>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[var(--ww-ink)] md:text-5xl">
            The world&apos;s best cities for remote work
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--ww-celadon)] md:text-lg">
            Every city below has been editorially reviewed for internet infrastructure,
            cost-of-living value, and workation lifestyle. Curated apartments with verified
            Work Scores available in each market.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="bg-[var(--ww-terra)] text-[var(--ww-ink)] hover:brightness-95" asChild>
              <Link href="/search">Browse all spaces</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/80" asChild>
              <Link href="/for-teams">Plan a team offsite</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Cities by region */}
      <div className="waywork-shell mt-14 space-y-14">
        {byRegion.map(({ region, cities }) => (
          <div key={region}>
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-xl font-semibold text-[var(--ww-ink)]">{region}</h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/cities/${city.slug}`}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={city.heroImage}
                      alt={`${city.name} workation`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <p className="text-lg font-bold text-white">{city.name}</p>
                      <p className="text-xs text-white/80">{city.country}</p>
                    </div>
                    <div className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${internetBadgeColor(city.internetTier)}`}>
                      <Wifi className="mr-1 inline size-3" />
                      {city.internetTier}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <p className="text-sm font-medium italic text-slate-500">&ldquo;{city.heroTagline}&rdquo;</p>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <p className="text-base font-bold text-[var(--ww-ink)]">{city.avgWorkScore}</p>
                        <p className="text-[10px] text-slate-500">Avg score</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <p className="text-base font-bold text-[var(--ww-ink)]">{city.listingCount}</p>
                        <p className="text-[10px] text-slate-500">Spaces</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2 py-2">
                        <p className="text-base font-bold text-[var(--ww-ink)]">€{city.avgPricePerNight}</p>
                        <p className="text-[10px] text-slate-500">Avg/night</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {city.bestMonths.slice(0, 3).map((m) => (
                          <span key={m} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            {m}
                          </span>
                        ))}
                        {city.bestMonths.length > 3 && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            +{city.bestMonths.length - 3}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="size-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[var(--ww-ink)]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Host CTA */}
      <div className="waywork-shell mt-14">
        <div className="rounded-3xl bg-[var(--ww-ink)] px-8 py-10 text-center text-white">
          <Star className="mx-auto mb-3 size-8 text-[var(--ww-terra)]" />
          <h3 className="text-2xl font-semibold">List your property in one of these cities</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-blue-100/70">
            Work travelers stay longer, treat properties better, and book shoulder seasons.
            Add your space and start earning with WayWork.
          </p>
          <Button className="mt-6 bg-[var(--ww-terra)] text-[var(--ww-ink)] hover:brightness-95" asChild>
            <Link href="/host/listings/new">List your property</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
