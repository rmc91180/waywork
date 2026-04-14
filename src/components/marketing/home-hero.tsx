"use client";

import { type ReactNode, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export interface HeroImage {
  url: string;
  alt: string;
}

interface HomeHeroProps {
  images: HeroImage[];
  searchPanel?: ReactNode;
}

const fallbackImages: HeroImage[] = [
  {
    url: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1800&q=80",
    alt: "Remote workspace overlooking a city canal with laptop-ready seating",
  },
  {
    url: "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1800&q=80",
    alt: "Team offsite session in a bright residential loft with whiteboard",
  },
  {
    url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=80",
    alt: "Digital nomad setup on a balcony workspace with high-speed internet",
  },
];

export function HomeHero({ images, searchPanel }: HomeHeroProps) {
  const slides = useMemo(() => (images.length > 0 ? images : fallbackImages), [images]);
  const leadImage = slides[0];

  return (
    <section className="relative overflow-hidden pb-10 pt-6 md:pb-12 md:pt-8">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={leadImage.url}
          alt={leadImage.alt}
          className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,32,52,0.28),rgba(6,32,52,0.6)_60%,rgba(6,32,52,0.78))]" />
      </div>

      <div className="waywork-shell relative z-10">
        <div className="max-w-3xl text-white">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/92">
            Work-ready homes
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.02] md:text-5xl lg:text-6xl">
            Find beautiful homes that actually work for work.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/88 md:text-lg">
            Search clean, high-speed stays built for focus, comfort, and small team trips.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
              asChild
            >
              <Link
                href="/search"
                onClick={() =>
                  trackEvent({ event: "hero_cta_clicked", properties: { cta: "search_spaces" } })
                }
              >
                Explore spaces
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-sm text-white/78">Verified internet. Straightforward booking. No clutter.</p>
          </div>
        </div>

        {searchPanel ? <div className="mt-6 max-w-5xl">{searchPanel}</div> : null}
      </div>
    </section>
  );
}
