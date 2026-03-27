"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export function HostTeaserToggle() {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.hash === "#host-teaser";
  });

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === "#host-teaser") {
        setExpanded(true);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <section
      id="host-teaser"
      className="rounded-3xl border border-emerald-800/20 bg-[var(--ww-secondary-green)] px-6 py-6 text-white md:px-10 md:py-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold md:text-3xl">Hosts: Turn Downtime into Dollars</h2>
        <Button
          variant="outline"
          className="border-white/50 bg-transparent text-white hover:bg-white/10"
          onClick={() => {
            const nextExpanded = !expanded;
            setExpanded(nextExpanded);
            trackEvent({
              event: "host_teaser_toggled",
              properties: { expanded: nextExpanded },
            });
          }}
          aria-expanded={expanded}
          aria-controls="host-teaser-content"
        >
          {expanded ? "Hide Host Perks" : "View Host Perks"}
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {expanded ? (
        <div id="host-teaser-content" className="mt-4 max-w-3xl">
          <p className="text-white/90">
            Fill quiet weeks with remote teams seeking your space. Easy listings, flexible commission,
            and built-in tools to spotlight your WiFi reliability and work-ready amenities.
          </p>
          <Button
            size="lg"
            className="mt-5 bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
            asChild
          >
            <Link
              href="/register?callbackUrl=%2Fhost"
              onClick={() =>
                trackEvent({
                  event: "host_teaser_cta_clicked",
                  properties: { cta: "start_hosting_free" },
                })
              }
            >
              Start Hosting Free
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
