import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, MapPinned, ShieldCheck, Sparkles, Users, Wifi } from "lucide-react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const intentChips = [
  { label: "Deep Work", href: "/search?workspaceTypes=PRIVATE_OFFICE,HOME_OFFICE&minWorkScore=75&verifiedInternet=true" },
  { label: "Team Offsite", href: "/search?workspaceTypes=MEETING_ROOM,HYBRID_SPACE&guests=6" },
  { label: "Work + Leisure", href: "/search?hasSwimmingPool=true&hasBackyard=true" },
  { label: "Budget Smart", href: "/search?maxPrice=120&noCleaningFee=true&sortBy=price_asc" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-14">
        <section className="waywork-hero-gradient relative overflow-hidden pb-12 pt-10 md:pb-16 md:pt-14">
          <div className="waywork-grid-bg absolute inset-0 opacity-55" />
          <div className="waywork-shell relative">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
              <div className="space-y-5">
                <Badge className="bg-slate-900 text-white hover:bg-slate-800">
                  Workspace Discovery Platform
                </Badge>
                <h1 className="font-display max-w-3xl text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
                  Work trips that feel productive by day and memorable after hours.
                </h1>
                <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                  Discover global, work-ready spaces with verified internet, practical setups, and curated local activities for your team&apos;s downtime.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {intentChips.map((chip) => (
                    <Link
                      key={chip.label}
                      href={chip.href}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </div>

              <Card className="waywork-elevated overflow-hidden border-slate-200/80 bg-white/95 py-0">
                <CardHeader className="space-y-1 bg-slate-900/95 pb-4 pt-5 text-white">
                  <CardTitle className="font-display text-xl">Start Your Search</CardTitle>
                  <p className="text-sm text-slate-200">
                    Find spaces by destination, landmark, or team needs.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  <form action="/search" className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Destination or Landmark
                      </label>
                      <input
                        name="nearQuery"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        placeholder="Paris, Eiffel Tower, Austin..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Radius</label>
                        <select
                          name="radiusKm"
                          defaultValue="25"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        >
                          <option value="10">10 km</option>
                          <option value="25">25 km</option>
                          <option value="50">50 km</option>
                          <option value="100">100 km</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Guests</label>
                        <input
                          name="guests"
                          type="number"
                          min={1}
                          defaultValue={2}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Check-in</label>
                        <input
                          name="checkIn"
                          type="date"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Check-out</label>
                        <input
                          name="checkOut"
                          type="date"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                        />
                      </div>
                    </div>
                    <Button type="submit" size="lg" className="w-full bg-cyan-700 hover:bg-cyan-800">
                      Explore Workspaces
                      <ArrowRight className="size-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="waywork-shell mt-8 md:mt-12">
          <div className="waywork-section p-5 md:p-7">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { icon: Wifi, title: "Verified Connectivity", body: "Speed validation and backup-network visibility." },
                { icon: BriefcaseBusiness, title: "Work Score", body: "Clear quality signal based on productivity factors." },
                { icon: Users, title: "Team-Friendly Layouts", body: "Find spaces built for strategy days and offsites." },
                { icon: Sparkles, title: "Leisure Layer", body: "After-hours amenities and local activity ideas." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <item.icon className="size-5 text-cyan-700" />
                  <p className="mt-3 font-display text-base font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="waywork-shell mt-8 md:mt-10">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: MapPinned,
                title: "Search with Location Confidence",
                body: "Find listings within a radius of a city, address, or landmark - then switch instantly between map and list.",
              },
              {
                icon: ShieldCheck,
                title: "Trust Signals Up Front",
                body: "Review score, internet verification, cancellation policies, and host details are surfaced before booking.",
              },
              {
                icon: Building2,
                title: "Built for Guests and Hosts",
                body: "Guests get faster decision tools; hosts get structured listing workflows and clear performance views.",
              },
            ].map((item) => (
              <Card key={item.title} className="border-slate-200/75 bg-white/95">
                <CardContent className="p-5">
                  <item.icon className="size-5 text-cyan-700" />
                  <h3 className="font-display mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="waywork-shell mt-8 md:mt-10">
          <div className="rounded-3xl bg-slate-900 px-6 py-10 text-center text-white md:px-12">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">
              Host spaces where great work actually happens.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">
              Publish a listing, showcase work + leisure amenities, and attract distributed teams planning meaningful offsites.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="bg-cyan-600 hover:bg-cyan-500" asChild>
                <Link href="/host/listings/new">Become a Host</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700" asChild>
                <Link href="/search">Browse All Spaces</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
