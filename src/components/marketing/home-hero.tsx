"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ChevronLeft, ChevronRight, MapPinned, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export interface HeroImage {
  url: string;
  alt: string;
}

interface HomeHeroProps {
  images: HeroImage[];
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

export function HomeHero({ images }: HomeHeroProps) {
  const slides = useMemo(() => (images.length >= 3 ? images : fallbackImages), [images]);
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(() => {
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

  const previousSlide = () => {
    setActive((current) => (current - 1 + slides.length) % slides.length);
    trackEvent({ event: "hero_slide_navigated", properties: { direction: "previous" } });
  };

  const nextSlide = () => {
    setActive((current) => (current + 1) % slides.length);
    trackEvent({ event: "hero_slide_navigated", properties: { direction: "next" } });
  };

  return (
    <section
      className="relative h-[clamp(540px,78svh,760px)] overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured workspace destinations"
    >
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
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(3,63,99,0.72)] via-[rgba(3,63,99,0.55)] to-[rgba(40,102,110,0.48)]" />
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-1 rounded-full border border-white/40 bg-black/25 p-1 backdrop-blur-md">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={previousSlide}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label={autoplay ? "Pause slide rotation" : "Resume slide rotation"}
          onClick={() => {
            setAutoplay((current) => !current);
            trackEvent({
              event: "hero_autoplay_toggled",
              properties: { autoplayEnabled: !autoplay },
            });
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15"
        >
          {autoplay ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={nextSlide}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        Slide {active + 1} of {slides.length}
      </p>

      <div className="waywork-shell relative flex h-full items-start py-12 md:py-16">
        <div className="max-w-3xl text-white">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
            Residential Workspaces, Global Reach
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.06] md:text-5xl lg:text-6xl">
            Work Wonders Worldwide
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90 md:text-xl">
            Escape the office, embrace the adventure. Book fun, high-speed workspaces in
            residential gems for your next workation or team offsite.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
              asChild
            >
              <Link
                href="#quick-search"
                onClick={() =>
                  trackEvent({ event: "hero_cta_clicked", properties: { cta: "search_spaces" } })
                }
              >
                Search Spaces
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/60 bg-white/5 text-white hover:bg-white/15"
              asChild
            >
              <Link
                href="#host-teaser"
                onClick={() =>
                  trackEvent({ event: "hero_cta_clicked", properties: { cta: "see_host_perks" } })
                }
              >
                See Host Perks
                <Building2 className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/45 bg-white/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
              Hosting on Way Work?
            </p>
            <Button
              size="sm"
              className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
              asChild
            >
              <Link
                href="/register?callbackUrl=%2Fhost"
                onClick={() =>
                  trackEvent({ event: "hero_host_cta_clicked", properties: { cta: "host_signup" } })
                }
              >
                Host Sign Up
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/60 bg-white/5 text-white hover:bg-white/15" asChild>
              <Link
                href="/login?callbackUrl=%2Fhost"
                onClick={() =>
                  trackEvent({ event: "hero_host_cta_clicked", properties: { cta: "host_login" } })
                }
              >
                Host Login
              </Link>
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <p className="ww-trust-pill border-white/50 bg-white/15 text-white">Verified Internet</p>
            <p className="ww-trust-pill border-white/50 bg-white/15 text-white">Secure Booking</p>
            <p className="ww-trust-pill border-white/50 bg-white/15 text-white">No Hidden Fees</p>
            <p className="ww-trust-pill border-white/50 bg-white/15 text-white inline-flex items-center gap-1.5">
              <MapPinned className="size-3.5" />
              Global Locations
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
