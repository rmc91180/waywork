import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Globe2,
  MessageSquare,
  Receipt,
  Shield,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ForTeamsIntakeForm } from "@/components/marketing/for-teams-intake-form";

export const metadata: Metadata = {
  title: "For Teams — Company Offsites & Group Stays | Way Work",
  description:
    "Book verified, work-ready homes for your next company offsite. Private spaces, tested internet, team setups — concierge-assisted booking for groups of 3 to 30.",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Way Work — Team Offsite Booking",
  description: "Concierge-assisted booking of work-ready residential homes for company offsites and team stays. Groups of 3 to 30, with verified internet and desk setups.",
  provider: {
    "@type": "Organization",
    name: "Way Work",
    url: APP_URL,
  },
  serviceType: "Corporate Accommodation Booking",
  areaServed: "Worldwide",
  url: `${APP_URL}/for-teams`,
};

const TRUST_STATS = [
  { value: "5–30", label: "People per offsite" },
  { value: "5–14", label: "Typical nights" },
  { value: "€5K–€30K", label: "Average booking value" },
  { value: "48h", label: "Concierge response time" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tell us about your offsite",
    detail:
      "Team size, target city, rough dates, and what you need — brainstorm space, quiet focus rooms, or both. Takes 2 minutes.",
    icon: MessageSquare,
  },
  {
    step: "02",
    title: "We shortlist for you",
    detail:
      "Within 48 hours we send you 3–5 curated options with Work Scores, floor plans, and a per-person nightly rate. No browsing required.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Book with one click",
    detail:
      "Pay by card or invoice. One booking, one confirmation, one check-in instruction set — even if your team spans multiple units.",
    icon: CalendarDays,
  },
  {
    step: "04",
    title: "Arrive ready to work",
    detail:
      "Verified internet, desk setups, and a host on call. We follow up after checkout to make sure everything went smoothly.",
    icon: CheckCircle2,
  },
];

const WHY_WAYWORK = [
  {
    icon: Wifi,
    title: "Actually tested internet",
    detail:
      "Every listing we recommend has a verified Work Score — speed-tested, not self-declared. You won't arrive to find shared hotel WiFi.",
  },
  {
    icon: Users,
    title: "Multi-unit group coordination",
    detail:
      "If your team needs 3 apartments in the same building, we coordinate them as one booking. One check-in time, one host, one invoice.",
  },
  {
    icon: Receipt,
    title: "Invoice & expense friendly",
    detail:
      "Get a proper VAT invoice for your whole stay. We work with finance teams and can accommodate PO numbers and company billing addresses.",
  },
  {
    icon: Shield,
    title: "Flexible cancellation",
    detail:
      "Plans change. All team bookings include a free cancellation window and a dedicated contact if you need to move dates.",
  },
  {
    icon: Globe2,
    title: "Growing city coverage",
    detail:
      "Madrid, Lisbon, Bangkok, Bali, Mexico City, and more. If your offsite city isn't listed, tell us — we'll source options within a week.",
  },
  {
    icon: Building2,
    title: "Not a hotel. Not a conference centre.",
    detail:
      "A private home your team actually inhabits — with a kitchen, a lounge, and a work setup. Teams work harder and connect more deeply in residential spaces.",
  },
];

const VS_HOTEL = [
  { feature: "Private space for the whole team", waywork: true, hotel: false },
  { feature: "Tested broadband (not shared WiFi)", waywork: true, hotel: false },
  { feature: "Full kitchen for team meals", waywork: true, hotel: false },
  { feature: "One invoice for the group", waywork: true, hotel: true },
  { feature: "Flexible check-in/check-out", waywork: true, hotel: false },
  { feature: "Work Score guarantee", waywork: true, hotel: false },
  { feature: "Concierge assistance", waywork: true, hotel: true },
  { feature: "Residential neighbourhood feel", waywork: true, hotel: false },
];

const TESTIMONIALS = [
  {
    quote:
      "We've done offsites in hotels and coworking spaces. Nothing beats a well-chosen home — the team actually switches off in the evenings and comes back sharper the next morning.",
    author: "Engineering Lead",
    company: "Series B SaaS, Berlin",
    size: "Team of 8",
  },
  {
    quote:
      "The concierge service saved us 4 hours of browsing. We described what we needed and got three solid options the next morning. Booked within the hour.",
    author: "Operations Manager",
    company: "Remote-first startup, Tel Aviv",
    size: "Team of 12",
  },
];

export default function ForTeamsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pb-20">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="waywork-hero-gradient relative overflow-hidden pb-16 pt-14 md:pb-20 md:pt-20">
        <div className="waywork-grid-bg absolute inset-0 opacity-40" />

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-32 -top-32 size-[500px] rounded-full bg-[var(--ww-terra)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-[400px] rounded-full bg-[var(--ww-celadon)]/10 blur-3xl" />

        <div className="waywork-shell relative">
          <Badge className="bg-[var(--ww-ink)] text-white hover:bg-[var(--ww-ink)]">
            For Teams
          </Badge>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.12] tracking-tight text-[var(--ww-ink)] md:text-6xl">
            Your next company offsite,{" "}
            <span className="relative inline-block">
              <span className="relative z-10">in a home that works.</span>
              <span
                className="absolute bottom-1 left-0 -z-0 h-3 w-full rounded-sm bg-[var(--ww-terra)]/30"
                aria-hidden
              />
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--ww-celadon)] md:text-lg">
            Private work-ready homes for teams of 3 to 30. Verified internet, desk setups, and
            a concierge who handles all the coordination — so you arrive focused, not frazzled.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-[var(--ww-terra)] text-[var(--ww-ink)] shadow-md shadow-orange-300/40 hover:brightness-95"
              asChild
            >
              <a href="#intake">Plan your offsite →</a>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/80" asChild>
              <Link href="/search?minGuests=4">Browse team spaces</Link>
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TRUST_STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-200/80 bg-white/70 px-5 py-4 backdrop-blur"
              >
                <p className="text-2xl font-bold text-[var(--ww-ink)]">{s.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="waywork-shell mt-16 md:mt-20">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ww-celadon)]">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--ww-ink)] md:text-4xl">
            From idea to offsite in 48 hours
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 border-t border-dashed border-slate-300 lg:block" />
                )}
                <div className="waywork-section relative z-10 h-full p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="font-mono text-xs font-bold tracking-widest text-[var(--ww-terra)]">
                      {step.step}
                    </span>
                    <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--ww-ink)]/8">
                      <Icon className="size-4 text-[var(--ww-ink)]" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--ww-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Why WayWork vs hotel ─────────────────────────────────── */}
      <section className="waywork-shell mt-16 md:mt-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ww-celadon)]">
              Why not just book a hotel?
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[var(--ww-ink)] md:text-4xl">
              Hotels are built for sleep. <br />
              We're built for work.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              A hotel gives you a room and a shared meeting room that costs extra. WayWork gives
              your team a private home — with a kitchen to cook together, desks for everyone,
              and internet that actually holds up under load.
            </p>

            <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="grid grid-cols-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span className="col-span-1">Feature</span>
                <span className="text-center text-[var(--ww-celadon)]">WayWork</span>
                <span className="text-center">Hotel</span>
              </div>
              {VS_HOTEL.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-3 items-center px-4 py-3 text-sm"
                >
                  <span className="col-span-1 text-slate-700">{row.feature}</span>
                  <span className="text-center">
                    {row.waywork ? (
                      <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </span>
                  <span className="text-center">
                    {row.hotel ? (
                      <CheckCircle2 className="mx-auto size-4 text-slate-400" />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {WHY_WAYWORK.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:border-[var(--ww-celadon)]/40 hover:shadow-sm"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ww-ink)]/8">
                    <Icon className="size-5 text-[var(--ww-ink)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--ww-ink)]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="mt-16 bg-[var(--ww-ink)] py-14 md:mt-20 md:py-18">
        <div className="waywork-shell">
          <div className="grid gap-6 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="rounded-2xl border border-white/10 bg-white/8 p-7 backdrop-blur"
              >
                <p className="text-lg leading-relaxed text-white/90 md:text-xl">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 border-t border-white/15 pt-4">
                  <p className="text-sm font-semibold text-white">{t.author}</p>
                  <p className="mt-0.5 text-xs text-blue-100/70">
                    {t.company} · {t.size}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intake form ──────────────────────────────────────────── */}
      <section id="intake" className="waywork-shell mt-16 md:mt-20 scroll-mt-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <Badge className="bg-[var(--ww-terra)]/15 text-[var(--ww-ink)]">
              Plan your offsite
            </Badge>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--ww-ink)] md:text-4xl">
              Tell us what you need
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Fill in the form below and our team will send you 3–5 curated options within
              48 hours. No commitment, no pushy follow-ups.
            </p>
          </div>

          <ForTeamsIntakeForm />
        </div>
      </section>

      {/* ── Browse CTA ───────────────────────────────────────────── */}
      <section className="waywork-shell mt-14">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-8 py-10 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-[var(--ww-ink)]">
              Rather browse first?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Filter by city, team size, and Work Score to shortlist spaces yourself.
              You can always contact us once you have a shortlist.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 border-[var(--ww-ink)]/40 text-[var(--ww-ink)]"
            asChild
          >
            <Link href="/search?minGuests=4">
              Browse team spaces <ChevronRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
    </>
  );
}
