"use client";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export function HomeQuickSearchForm() {
  return (
    <form
      action="/search"
      className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
      onSubmit={() =>
        trackEvent({
          event: "homepage_quick_search_submitted",
          properties: { source: "homepage_quick_search" },
        })
      }
    >
      <label className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ww-secondary-green)]">
          Where to
        </span>
        <input
          name="nearQuery"
          placeholder="City, Landmark, or Team Hub"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--ww-secondary-green)] focus:ring-2 focus:ring-emerald-100"
          aria-label="Destination, landmark, or team hub"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ww-secondary-green)]">
          Dates
        </span>
        <input
          type="date"
          name="checkIn"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--ww-secondary-green)] focus:ring-2 focus:ring-emerald-100"
          aria-label="Check-in date"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ww-secondary-green)]">
          Guests
        </span>
        <select
          name="guests"
          defaultValue="2"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--ww-secondary-green)] focus:ring-2 focus:ring-emerald-100"
          aria-label="Number of guests"
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>
              {count} guest{count > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ww-secondary-green)]">
          Amenities
        </span>
        <select
          name="minSpeed"
          defaultValue="500"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--ww-secondary-green)] focus:ring-2 focus:ring-emerald-100"
          aria-label="Minimum internet speed"
        >
          <option value="500">WiFi 500+ Mbps</option>
          <option value="250">WiFi 250+ Mbps</option>
          <option value="100">WiFi 100+ Mbps</option>
        </select>
      </label>
      <Button
        type="submit"
        size="lg"
        className="h-11 self-end bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
      >
        Explore Now
      </Button>
    </form>
  );
}

