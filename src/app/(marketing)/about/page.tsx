import Link from "next/link";
import { CalendarRange, Coins, House, UsersRound, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "About Us",
  description:
    "Learn how Way Work helps property owners fill non-holiday demand gaps by renting residential properties to offsite workers and teams.",
};

export default function AboutPage() {
  return (
    <div className="pb-14">
      <section className="waywork-hero-gradient relative overflow-hidden py-12 md:py-16">
        <div className="waywork-grid-bg absolute inset-0 opacity-55" />
        <div className="waywork-shell relative">
          <Badge className="bg-slate-900 text-white hover:bg-slate-800">About {BRAND.name}</Badge>
          <h1 className="font-display mt-4 max-w-4xl text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
            Turning residential property into a usable workspace market.
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
            Property owners often face painful occupancy drops during non-holiday periods. {BRAND.name} helps hosts fill those gaps with a new demand source: offsite workers and distributed teams.
          </p>
        </div>
      </section>

      <section className="waywork-shell mt-8 md:mt-10">
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border-slate-200/75 bg-white/95">
            <CardContent className="p-6">
              <h2 className="font-display text-2xl font-semibold text-slate-900">The Problem We Solve</h2>
              <p className="mt-3 text-slate-600">
                Traditional short-term rental demand is heavily seasonal. Outside peak holiday windows, many residential properties sit underutilized, reducing host income and increasing cash-flow pressure.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="inline-flex items-start gap-2">
                  <CalendarRange className="mt-0.5 size-4 text-cyan-700" />
                  Non-holiday season occupancy drops.
                </li>
                <li className="inline-flex items-start gap-2">
                  <Coins className="mt-0.5 size-4 text-cyan-700" />
                  Revenue volatility for hosts.
                </li>
                <li className="inline-flex items-start gap-2">
                  <House className="mt-0.5 size-4 text-cyan-700" />
                  High-quality spaces sitting idle.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200/75 bg-white/95">
            <CardContent className="p-6">
              <h2 className="font-display text-2xl font-semibold text-slate-900">Our Value Add</h2>
              <p className="mt-3 text-slate-600">
                We position residential properties as work-ready offsite destinations. Hosts earn from working guests and teams that need high-functioning environments beyond home and office.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="inline-flex items-start gap-2">
                  <UsersRound className="mt-0.5 size-4 text-cyan-700" />
                  Access to a growing offsite worker segment.
                </li>
                <li className="inline-flex items-start gap-2">
                  <Wifi className="mt-0.5 size-4 text-cyan-700" />
                  Work-readiness positioning (internet, desk, quiet, team setup).
                </li>
                <li className="inline-flex items-start gap-2">
                  <Coins className="mt-0.5 size-4 text-cyan-700" />
                  Better year-round revenue continuity.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="waywork-shell mt-8 md:mt-10">
        <div className="waywork-section p-6 md:p-8">
          <h2 className="font-display text-3xl font-semibold text-slate-900">How {BRAND.name} Works</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Hosts Activate Work-Ready Listings",
                body: "Property owners list residential spaces and define workspace features, capacity, and leisure amenities.",
              },
              {
                step: "2",
                title: "Teams Discover and Book Offsite Stays",
                body: "Guests filter for productivity needs and select spaces that support both focused work and downtime.",
              },
              {
                step: "3",
                title: "Hosts Fill Dead Season Gaps",
                body: "Offsite demand helps convert low-occupancy periods into meaningful recurring revenue.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Step {item.step}</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="waywork-shell mt-8 md:mt-10">
        <div className="rounded-3xl bg-slate-900 px-6 py-10 text-center text-white md:px-12">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Build new revenue from the offsite worker economy.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            If your residential property is underused outside holidays, {BRAND.name} helps you fill the gaps with high-intent working guests and teams.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500" asChild>
              <Link href="/host/listings/new">List Your Property</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700"
              asChild
            >
              <Link href="/search">View Workspaces</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

