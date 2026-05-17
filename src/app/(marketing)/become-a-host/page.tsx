import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Star, TrendingUp, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "List Your Property — Earn More with Work Travelers | Way Work",
  description:
    "Work travelers stay longer, pay more, and treat properties better. List your home on WayWork and earn more from shoulder seasons and extended stays.",
};

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Longer stays, more revenue",
    detail: "Work travelers book 5–14 night stays. That's 3–5× the revenue of a weekend booking with a fraction of the turnover cost.",
  },
  {
    icon: Star,
    title: "Guests who treat spaces well",
    detail: "Remote professionals and corporate teams treat your property like a home office — no parties, predictable schedules, and respectful use.",
  },
  {
    icon: Clock,
    title: "Shoulder season fill",
    detail: "Work trips happen year-round, especially Jan–March and Sep–Nov when leisure travel dips. Fill your calendar when others can't.",
  },
  {
    icon: Wifi,
    title: "Your Work Score = higher rates",
    detail: "Listings with a Work Score above 75 command 20–40% higher nightly rates. A standing desk and good WiFi pays for itself in a week.",
  },
  {
    icon: Zap,
    title: "Simple management",
    detail: "Set your availability, pricing, and house rules once. Manage bookings, messages, and payouts from one clean dashboard.",
  },
  {
    icon: CheckCircle2,
    title: "We verify, you earn",
    detail: "WayWork handles guest verification, payment processing, and connectivity testing. You focus on the hosting.",
  },
];

const WHAT_WE_LOOK_FOR = [
  "Dedicated desk or workspace area",
  "Reliable internet (ideally 100 Mbps+)",
  "Quiet environment suitable for calls",
  "Full or partial kitchen access",
  "Self check-in capability",
  "Available for stays of 3+ nights",
];

const STEPS = [
  { step: "01", title: "Create your listing", detail: "Walk through our 9-step wizard. Add photos, set your Work Score amenities, and set your price. Takes about 20 minutes." },
  { step: "02", title: "We review and verify", detail: "Our team reviews your listing and may request an internet speed test. Most listings go live within 48 hours." },
  { step: "03", title: "Guests book and pay", detail: "Guests pay securely via Stripe. You receive payouts 24 hours after each guest checks in." },
  { step: "04", title: "Manage with ease", detail: "Update availability, respond to messages, and track earnings from your host dashboard." },
];

export default function BecomeAHostPage() {
  return (
    <div className="pb-20">

      {/* Hero */}
      <section className="waywork-hero-gradient relative overflow-hidden pb-16 pt-14 md:pb-20 md:pt-20">
        <div className="waywork-grid-bg absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-32 -top-32 size-[500px] rounded-full opacity-10 blur-3xl" style={{ background: "var(--ww-gold)" }} />

        <div className="waywork-shell relative">
          <Badge className="mb-5" style={{ background: "var(--ww-ink)", color: "var(--ww-gold)" }}>
            For property owners
          </Badge>

          <h1
            className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--ww-ink)" }}
          >
            Your property earns more{" "}
            <span className="ww-gold-underline" style={{ color: "var(--ww-terra)" }}>
              with work travelers.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: "#4a4540" }}>
            Remote professionals and teams stay longer, pay on time, and treat your home like
            a workplace — because it is one. List on WayWork and fill your calendar year-round.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="shadow-md"
              style={{
                background: "var(--ww-terra)",
                color: "white",
                boxShadow: "0 2px 8px rgba(193,123,74,0.4)",
              }}
              asChild
            >
              <Link href="/host/listings/new">
                List your property free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-white/80" asChild>
              <Link href="/host">Host dashboard →</Link>
            </Button>
          </div>

          {/* Social proof stats */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "5–14", label: "Avg nights per booking" },
              { value: "15%",  label: "WayWork commission" },
              { value: "48h",  label: "Payout after check-in" },
              { value: "Free", label: "To list your property" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border px-5 py-4"
                style={{ background: "rgba(255,254,249,0.8)", borderColor: "var(--ww-mist)", backdropFilter: "blur(8px)" }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--ww-ink)", fontFamily: "var(--font-mono, monospace)" }}
                >
                  {s.value}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#7a6e62" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why list */}
      <section className="waywork-shell mt-16 md:mt-20">
        <div className="mb-10 text-center">
          <p className="ww-eyebrow mb-2">Why WayWork</p>
          <h2
            className="text-3xl font-semibold md:text-4xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--ww-ink)" }}
          >
            Built for hosts who want quality, not volume
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="rounded-2xl p-6 transition hover:shadow-md"
                style={{ background: "var(--ww-warm-white)", border: "1px solid var(--ww-mist)" }}
              >
                <div
                  className="mb-4 flex size-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--ww-gold-light)" }}
                >
                  <Icon className="size-5" style={{ color: "var(--ww-ink)" }} />
                </div>
                <h3 className="font-semibold" style={{ color: "var(--ww-ink)" }}>{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7a6e62" }}>{b.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16 md:mt-20" style={{ background: "var(--ww-ink)" }}>
        <div className="waywork-shell py-14">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--ww-gold)" }}>How it works</p>
            <h2 className="mt-2 text-3xl font-semibold text-white md:text-4xl"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
              From listing to earning in 48 hours
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="font-mono text-xs font-bold" style={{ color: "var(--ww-gold)" }}>{s.step}</p>
                <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we look for */}
      <section className="waywork-shell mt-16 md:mt-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <p className="ww-eyebrow mb-2">What makes a great WayWork listing</p>
            <h2
              className="text-3xl font-semibold md:text-4xl"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--ww-ink)" }}
            >
              You don&apos;t need to be a hotel. Just work-ready.
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "#7a6e62" }}>
              Our guests are professionals, not tourists. They care about internet speed and
              a proper desk more than a pool or concierge. Here&apos;s what we look for:
            </p>
            <ul className="mt-6 space-y-3">
              {WHAT_WE_LOOK_FOR.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: "#4a4540" }}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: "var(--ww-celadon)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Commission card */}
          <div
            className="rounded-3xl p-8"
            style={{ background: "var(--ww-gold-light)", border: "1px solid rgba(201,168,76,0.3)" }}
          >
            <p className="ww-eyebrow mb-2" style={{ color: "var(--ww-celadon)" }}>Simple pricing</p>
            <h3
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "var(--ww-ink)" }}
            >
              15% commission. Nothing else.
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#5a5047" }}>
              No subscription fees. No listing fees. No surprise charges. WayWork takes
              WayWork takes 15% of each booking — you keep the rest. Payouts land 24 hours after check-in.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { label: "Guest pays", value: "€1,000" },
                { label: "WayWork commission (15%)", value: "−€150" },
                { label: "You receive", value: "€850", highlight: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: row.highlight ? "var(--ww-ink)" : "rgba(255,255,255,0.6)",
                    color: row.highlight ? "var(--ww-gold)" : "var(--ww-ink)",
                  }}
                >
                  <span className="text-sm font-medium">{row.label}</span>
                  <span className="font-mono font-bold">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs" style={{ color: "#8a7060" }}>
              Example based on a 5-night stay at €200/night.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="waywork-shell mt-16 md:mt-20">
        <div
          className="rounded-3xl px-8 py-12 text-center"
          style={{ background: "var(--ww-ink)" }}
        >
          <h2
            className="text-2xl font-bold text-white md:text-3xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Ready to earn more from your property?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Create your listing in 20 minutes. Go live in 48 hours. No commitment required.
          </p>
          <Button
            size="lg"
            className="mt-8 shadow-lg"
            style={{
              background: "var(--ww-terra)",
              color: "white",
              boxShadow: "0 4px 16px rgba(193,123,74,0.35)",
            }}
            asChild
          >
            <Link href="/host/listings/new">
              Create your listing — it&apos;s free
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
