import Link from "next/link";
import { Compass, Globe2, Network, Sparkles, UsersRound, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://waywork.com";

export const metadata: Metadata = {
  title: "About Way Work — Work-Ready Homes for Remote Workers & Teams",
  description:
    "Way Work is a marketplace for verified, work-ready residential apartments. Built for digital nomads, remote professionals, and teams who want productive stays with real local experiences.",
  alternates: { canonical: `${APP_URL}/about` },
  openGraph: {
    title: "About Way Work",
    description: "We built Way Work for remote workers and teams who want dependable productivity and real place-based experiences in one seamless stay.",
    url: `${APP_URL}/about`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Way Work",
  url: `${APP_URL}/about`,
  description: "Way Work is a marketplace for verified, work-ready residential apartments for digital nomads, remote professionals, and teams.",
  mainEntity: {
    "@type": "Organization",
    name: "Way Work",
    url: APP_URL,
    foundingDate: "2024",
    description: "Turning residential properties into productive, experiential workspaces for remote workers and teams worldwide.",
    areaServed: "Worldwide",
    serviceType: ["Workation Booking", "Team Offsite Coordination", "Remote Work Accommodation"],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pb-14">
      <section className="waywork-hero-gradient relative overflow-hidden py-14 md:py-18">
        <div className="waywork-grid-bg absolute inset-0 opacity-55" />
        <div className="waywork-shell relative">
          <Badge className="bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-primary-blue)]">
            About {BRAND.name}
          </Badge>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[var(--ww-primary-blue)] md:text-6xl">
            {BRAND.tagline}
          </h1>
          <p className="mt-4 max-w-3xl text-base text-[var(--ww-text-primary)] md:text-lg">
            {BRAND.descriptor} We built Way Work for people who want dependable productivity and
            real place-based experiences in one seamless stay.
          </p>
        </div>
      </section>

      <section className="waywork-shell mt-8 md:mt-10">
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border-slate-200/75 bg-white/95">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">What We Solve</h2>
              <p className="mt-3 text-[var(--ww-text-primary)]">
                Remote workers and teams often choose between a fun location and a reliable setup.
                Way Work removes that tradeoff with verified internet, practical workspace signals,
                and residential comfort.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--ww-text-primary)]">
                <li className="inline-flex items-start gap-2">
                  <Wifi className="mt-0.5 size-4 text-[var(--ww-secondary-green)]" />
                  Connectivity confidence before booking.
                </li>
                <li className="inline-flex items-start gap-2">
                  <UsersRound className="mt-0.5 size-4 text-[var(--ww-secondary-green)]" />
                  Team-ready layouts for offsites and strategy weeks.
                </li>
                <li className="inline-flex items-start gap-2">
                  <Compass className="mt-0.5 size-4 text-[var(--ww-secondary-green)]" />
                  Local experiences layered into every stay.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200/75 bg-white/95">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-[var(--ww-primary-blue)]">How It Works</h2>
              <p className="mt-3 text-[var(--ww-text-primary)]">
                Guests discover spaces with transparent work-readiness data. Hosts unlock demand by
                showcasing their space during lower occupancy periods.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--ww-text-primary)]">
                <li className="inline-flex items-start gap-2">
                  <Network className="mt-0.5 size-4 text-[var(--ww-secondary-green)]" />
                  Work Score and trust badges guide fast decisions.
                </li>
                <li className="inline-flex items-start gap-2">
                  <Globe2 className="mt-0.5 size-4 text-[var(--ww-secondary-green)]" />
                  Global locations across major remote-work hubs.
                </li>
                <li className="inline-flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 text-[var(--ww-secondary-green)]" />
                  Workation-friendly spaces with personality.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="waywork-shell mt-8 md:mt-10">
        <div className="rounded-3xl bg-[var(--ww-primary-blue)] px-6 py-10 text-center text-white md:px-12">
          <h2 className="text-3xl font-semibold md:text-4xl">
            Productive travel should feel effortless and inspiring.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-200">
            Browse guest-ready spaces or list your property to welcome the next wave of remote
            teams and digital nomads.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
              asChild
            >
              <Link href="/search">Browse Workspaces</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-400 bg-transparent text-white hover:bg-white/10"
              asChild
            >
              <Link href="/register?callbackUrl=%2Fhost">Start Hosting Free</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
