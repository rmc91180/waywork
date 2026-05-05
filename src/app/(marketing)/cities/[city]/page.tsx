import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Globe2,
  MapPin,
  Star,
  Wifi,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CITIES, CITY_SLUGS, getCityBySlug } from "@/lib/cities";

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return CITY_SLUGS.map((city) => ({ city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};
  return {
    title: `Work from ${city.name} — Verified Workation Apartments | Way Work`,
    description: `${city.heroDescription} Browse ${city.listingCount} work-ready apartments in ${city.name} with verified internet and Work Scores from ${city.avgWorkScore}/100.`,
    openGraph: {
      title: `Work from ${city.name} | Way Work`,
      description: city.heroDescription,
      images: [{ url: city.heroImage, width: 1600, height: 900, alt: `${city.name} workation` }],
    },
  };
}

function InternetBadge({ tier }: { tier: string }) {
  const cls =
    tier === "Excellent"
      ? "bg-emerald-100 text-emerald-800"
      : tier === "Good"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Wifi className="size-3" />
      {tier} internet
    </span>
  );
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com";
  const otherCities = CITIES.filter((c) => c.slug !== slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: `Work from ${city.name}`,
    description: city.heroDescription,
    url: `${APP_URL}/cities/${city.slug}`,
    image: city.heroImage,
    touristType: ["Digital Nomad", "Remote Worker", "Business Traveler"],
    geo: {
      "@type": "GeoCoordinates",
      latitude: city.mapLat,
      longitude: city.mapLng,
    },
    containedInPlace: {
      "@type": "Country",
      name: city.country,
    },
    includesAttraction: city.nearbyActivities.map((a) => ({
      "@type": "TouristAttraction",
      name: a,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pb-20">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative h-[420px] overflow-hidden md:h-[500px]">
        <img
          src={city.heroImage}
          alt={`${city.name}, ${city.country}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />

        <div className="waywork-shell relative flex h-full flex-col justify-end pb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-white/20 text-white backdrop-blur hover:bg-white/20">
              <Globe2 className="mr-1 size-3" />
              {city.region}
            </Badge>
            <InternetBadge tier={city.internetTier} />
          </div>
          <h1 className="text-4xl font-bold text-white md:text-6xl">
            Work from {city.name}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/85 md:text-lg">
            {city.heroTagline}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] font-semibold hover:brightness-95"
              asChild
            >
              <Link href={`/search?city=${encodeURIComponent(city.name)}`}>
                Browse {city.listingCount} spaces in {city.name}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20" asChild>
              <Link href="/for-teams">Plan a team offsite</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="waywork-shell">
          <div className="grid grid-cols-2 divide-x divide-slate-100 md:grid-cols-4">
            {[
              { label: "Avg Work Score", value: `${city.avgWorkScore}/100`, icon: Star },
              { label: "Curated spaces", value: city.listingCount.toString(), icon: MapPin },
              { label: "Avg per night", value: `€${city.avgPricePerNight}`, icon: Zap },
              { label: "Time zone", value: city.timezone, icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="px-6 py-5 text-center">
                <Icon className="mx-auto mb-1.5 size-4 text-[var(--ww-secondary-green)]" />
                <p className="text-xl font-bold text-[var(--ww-primary-blue)]">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why work from here ───────────────────────────────────── */}
      <section className="waywork-shell mt-12 md:mt-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ww-secondary-green)]">
              Why {city.name}?
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">
              Why remote workers choose {city.name}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{city.whyWork}</p>

            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              <Calendar className="mb-1 size-4" />
              <strong>Best months to visit:</strong>{" "}
              {city.bestMonths.join(", ")} · {city.climate}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {city.highlights.map((h) => (
              <div
                key={h.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="text-2xl">{h.icon}</span>
                <h3 className="mt-2 text-sm font-semibold text-[var(--ww-primary-blue)]">{h.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{h.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Neighbourhoods ───────────────────────────────────────── */}
      <section className="waywork-shell mt-12 md:mt-16">
        <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">
          Neighbourhoods in {city.name}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Different areas suit different working styles. Here&apos;s how they compare.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {city.neighborhoods.map((n) => (
            <div
              key={n.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-[var(--ww-primary-blue)]">{n.name}</h3>
              <p className="mt-1 text-xs text-slate-500 italic">{n.vibe}</p>
              <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-700">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                <span>{n.bestFor}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Practical info ───────────────────────────────────────── */}
      <section className="waywork-shell mt-12 md:mt-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">
              Practical information
            </h2>
            <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {city.practicalInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4 px-5 py-3.5 text-sm">
                  <span className="w-32 shrink-0 font-medium text-slate-500">{item.label}</span>
                  <span className="text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">
              Things to do after work
            </h2>
            <div className="mt-4 grid gap-2">
              {city.nearbyActivities.map((a) => (
                <div
                  key={a}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-[var(--ww-secondary-green)]" />
                  {a}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Browse CTA ───────────────────────────────────────────── */}
      <section className="waywork-shell mt-12 md:mt-16">
        <div className="rounded-3xl bg-[var(--ww-primary-blue)] px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready to book a space in {city.name}?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-blue-200">
            {city.listingCount} verified, work-ready apartments — each with a tested Work Score and real internet speeds.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] font-semibold hover:brightness-95"
              asChild
            >
              <Link href={`/search?city=${encodeURIComponent(city.name)}`}>
                Browse {city.name} spaces
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link href="/for-teams">Need help booking for a team?</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Other cities ─────────────────────────────────────────── */}
      <section className="waywork-shell mt-12 md:mt-16">
        <h2 className="text-xl font-semibold text-[var(--ww-primary-blue)]">
          Other workation destinations
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {otherCities.map((c) => (
            <Link
              key={c.slug}
              href={`/cities/${c.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[var(--ww-secondary-green)]/40 hover:shadow-sm"
            >
              <img
                src={c.heroImage}
                alt={c.name}
                className="size-14 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold text-[var(--ww-primary-blue)]">{c.name}</p>
                <p className="text-xs text-slate-500">{c.country} · {c.listingCount} spaces</p>
              </div>
              <ChevronRight className="ml-auto size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
        <div className="mt-5 text-center">
          <Link href="/cities" className="text-sm font-medium text-[var(--ww-secondary-green)] hover:underline">
            View all destinations →
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}

// Fix missing import
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
