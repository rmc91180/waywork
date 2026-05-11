"use client";

import { type ReactNode, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Wifi, Star, Users } from "lucide-react";
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
    url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1800&q=80",
    alt: "Warm, light-filled home office workspace with natural views",
  },
  {
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80",
    alt: "Modern private workspace with clean desk setup",
  },
  {
    url: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1800&q=80",
    alt: "Bright hybrid space for work and leisure",
  },
];

const TRUST_STATS = [
  { icon: Wifi,  value: "Tested",  label: "Internet speed" },
  { icon: Star,  value: "Scored",  label: "Every listing"  },
  { icon: Users, value: "Teams",   label: "Welcome"        },
];

export function HomeHero({ images, searchPanel }: HomeHeroProps) {
  const slides = useMemo(() => (images.length > 0 ? images : fallbackImages), [images]);
  const leadImage = slides[0];

  return (
    <section className="relative overflow-hidden" style={{ minHeight: "88vh" }}>

      {/* Full-bleed image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={leadImage.url}
        alt={leadImage.alt}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Gradient — warm, dark at bottom for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "linear-gradient(to right, rgba(13,31,45,0.72) 0%, rgba(13,31,45,0.28) 60%, transparent 100%)",
            "linear-gradient(to top, rgba(13,31,45,0.65) 0%, rgba(13,31,45,0.1) 40%, transparent 70%)",
          ].join(", "),
        }}
      />

      {/* Warm gold tint at top-left — editorial signature */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 size-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="waywork-shell relative z-10 flex min-h-[88vh] flex-col justify-center pb-16 pt-16">
        <div className="max-w-2xl">

          {/* Eyebrow */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              background: "rgba(201,168,76,0.18)",
              border: "1px solid rgba(201,168,76,0.35)",
              color: "#f5e6c0",
              backdropFilter: "blur(12px)",
            }}
          >
            <span
              className="size-1.5 rounded-full animate-pulse"
              style={{ background: "var(--ww-gold)" }}
            />
            Work-ready homes worldwide
          </div>

          {/* Headline — Playfair Display, editorial weight */}
          <h1
            className="text-[2.75rem] font-bold leading-[1.06] tracking-tight text-white md:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Find beautiful spaces
            <br />
            <span
              className="relative inline-block"
              style={{ color: "#f5e6c0" }}
            >
              that work for work.
              <span
                className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, var(--ww-gold), transparent)",
                  opacity: 0.6,
                }}
              />
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
            Verified internet, real desk setups, and Work Scores on every listing.
            Solo workations, team offsites, and extended stays — in cities worth living in.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/search"
              onClick={() => trackEvent({ event: "hero_cta_clicked", properties: { cta: "search_spaces" } })}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--ww-terra)",
                color: "white",
                boxShadow: "0 2px 8px rgba(193,123,74,0.4), 0 8px 24px rgba(193,123,74,0.2)",
              }}
            >
              Find your space
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/for-teams"
              onClick={() => trackEvent({ event: "hero_cta_clicked", properties: { cta: "for_teams" } })}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "rgba(255,254,249,0.12)",
                color: "white",
                border: "1px solid rgba(255,254,249,0.25)",
                backdropFilter: "blur(12px)",
              }}
            >
              Planning a team offsite?
            </Link>
            <Link
              href="/become-a-host"
              onClick={() => trackEvent({ event: "hero_cta_clicked", properties: { cta: "become_a_host" } })}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: "rgba(201,168,76,0.15)",
                color: "#f5e6c0",
                border: "1px solid rgba(201,168,76,0.3)",
                backdropFilter: "blur(12px)",
              }}
            >
              Become a host
            </Link>
          </div>

          {/* Trust pills */}
          <div className="mt-8 flex flex-wrap gap-2.5">
            {TRUST_STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                style={{
                  background: "rgba(13,31,45,0.45)",
                  border: "1px solid rgba(255,254,249,0.15)",
                  color: "rgba(255,254,249,0.85)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Icon className="size-3.5" style={{ color: "var(--ww-gold)" }} />
                <span className="font-semibold" style={{ color: "#f5e6c0" }}>{value}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search panel */}
        {searchPanel && (
          <div className="mt-10 max-w-[820px]">{searchPanel}</div>
        )}
      </div>

      {/* Bottom fade to page background */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--ww-parchment), transparent)",
        }}
      />
    </section>
  );
}
