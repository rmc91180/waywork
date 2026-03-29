"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export function HomeQuickSearchForm() {
  return (
    <form
      action="/search"
      className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/8 md:grid-cols-[minmax(0,2fr)_170px_170px_140px_auto] md:items-stretch md:p-4"
      onSubmit={() =>
        trackEvent({
          event: "homepage_quick_search_submitted",
          properties: { source: "homepage_quick_search" },
        })
      }
      >
      <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Where
        </span>
        <input
          name="nearQuery"
          placeholder="City or neighborhood"
          className="mt-2 h-auto w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          aria-label="Destination, landmark, or team hub"
        />
      </label>

      <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Check In
        </span>
        <input
          type="date"
          name="checkIn"
          className="mt-2 h-auto w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
          aria-label="Check-in date"
        />
      </label>

      <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Check Out
        </span>
        <input
          type="date"
          name="checkOut"
          className="mt-2 h-auto w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
          aria-label="Check-out date"
        />
      </label>

      <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Guests
        </span>
        <select
          name="guests"
          defaultValue="2"
          className="mt-2 h-auto w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
          aria-label="Number of guests"
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>
              {count} guest{count > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="submit"
        size="lg"
        className="h-full min-h-14 rounded-2xl bg-[var(--ww-primary-blue)] px-6 text-white hover:bg-[var(--ww-secondary-green)]"
      >
        <Search className="size-4" />
        Search
      </Button>
    </form>
  );
}
