"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
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
  const slides = useMemo(() => (images.length >= 3 ? images : fallbackImages), [images]);
  const [active, setActive] = useState(0);
  const [autoplay] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    trackEvent({
      event: "hero_viewed",
      properties: { slideCount: slides.length },
    });
  }, [slides.length]);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoplay, slides.length]);

  return (
    <section className="relative overflow-hidden pb-18 pt-10 md:pb-22 md:pt-14">
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div key={`${slide.url}-${index}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.url}
              alt={slide.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                index === active ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,63,99,0.78),rgba(3,63,99,0.52)_48%,rgba(40,102,110,0.3))]" />
      </div>

      <div className="waywork-shell relative z-10">
        <div className="max-w-3xl text-white">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/92">
            Residential Workspaces, Global Reach
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.02] md:text-5xl lg:text-6xl">
            Find work-ready homes for productive escapes.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/88 md:text-xl">
            Book clean, high-speed residential spaces for focused solo stays and small-team
            offsites without the clutter of a hotel-first experience.
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
            <Link
              href="#host-teaser"
              className="text-sm font-semibold text-white/88 underline decoration-white/30 underline-offset-4 transition hover:text-white"
              onClick={() =>
                trackEvent({ event: "hero_cta_clicked", properties: { cta: "host_teaser" } })
              }
            >
              Hosting with Way Work?
            </Link>
          </div>
        </div>

        {searchPanel ? <div className="mt-8 max-w-6xl">{searchPanel}</div> : null}
      </div>
    </section>
  );
}
