import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
              Workspaces that{" "}
              <span className="text-blue-600">actually work</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed">
              Find and book work-verified spaces with guaranteed connectivity,
              real desks, and everything you need for a productive offsite day or
              team gathering.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/search">Find a Space</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/host/listings/new">List Your Space</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            How WayWork Works
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Search by Work Needs",
                description:
                  "Filter by internet speed, desk setup, meeting space, and more. Every listing shows a Work Score so you know exactly what you're getting.",
              },
              {
                step: "2",
                title: "Book Instantly",
                description:
                  "Choose your dates, invite your team, and book in seconds. Calendar invites and itineraries are sent automatically.",
              },
              {
                step: "3",
                title: "Work With Confidence",
                description:
                  "Show up to a space that's verified for productivity. Reliable WiFi, proper desks, and everything you need to get work done.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Work Score",
                description:
                  "Every space rated 1-100 for productivity based on desk, connectivity, ergonomics, and more.",
              },
              {
                title: "Verified Connectivity",
                description:
                  "Speed test evidence required. Filter by minimum Mbps. No more WiFi guessing.",
              },
              {
                title: "Team Ready",
                description:
                  "Share itineraries, invite attendees, and coordinate with your team built-in.",
              },
              {
                title: "Instant Booking",
                description:
                  "Book and pay in seconds. Calendar invites sent automatically. Show up and work.",
              },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-lg border bg-white">
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Have a great workspace?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            List your space on WayWork and reach remote professionals looking
            for productive environments.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link href="/host/listings/new">Become a Host</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
