"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFAULT_SEARCH_FILTERS, serializeSearchFilterParams } from "@/lib/search-filters";
import { cn } from "@/lib/utils";

function parseDate(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function formatDateRange(checkIn: string, checkOut: string) {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);

  if (start && end) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  }

  if (start) {
    return format(start, "MMM d");
  }

  return "Add dates";
}

export function HomeQuickSearchForm() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [whenOpen, setWhenOpen] = useState(false);
  const [whereOpen, setWhereOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedRange = useMemo<DateRange | undefined>(() => {
    const start = parseDate(checkIn);
    const end = parseDate(checkOut);

    if (!start && !end) return undefined;
    return { from: start, to: end };
  }, [checkIn, checkOut]);

  const locationLabel = location.trim() || "City or neighborhood";
  const whenLabel = formatDateRange(checkIn, checkOut);
  const whoLabel = guests ? `${guests} guest${guests === "1" ? "" : "s"}` : "Who";

  function submitSearch() {
    trackEvent({
      event: "homepage_quick_search_submitted",
      properties: { source: "homepage_quick_search_compact" },
    });

    const params = serializeSearchFilterParams({
      ...DEFAULT_SEARCH_FILTERS,
      nearQuery: location.trim(),
      checkIn,
      checkOut,
      guests,
      page: 1,
    });

    router.push(`/search?${params.toString()}`);
  }

  return (
    <div
      className="grid gap-1.5 rounded-2xl p-1.5 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_auto] md:items-stretch"
      style={{
        background: "rgba(250,248,244,0.94)",
        border: "1px solid rgba(201,168,76,0.25)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 4px 32px rgba(13,31,45,0.18), 0 1px 4px rgba(13,31,45,0.1)",
      }}
    >
      {/* Where */}
      <Popover open={whereOpen} onOpenChange={setWhereOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-14 items-center justify-between gap-3 rounded-xl px-4 text-left transition"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>
                Where
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium" style={{ color: location.trim() ? "var(--ww-ink)" : "#b8afa4" }}>
                {locationLabel}
              </span>
            </span>
            <MapPin className="size-4 shrink-0" style={{ color: "var(--ww-gold)" }} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={12} className="w-[320px] p-4" style={{ border: "1px solid var(--ww-mist)", background: "var(--ww-warm-white)", borderRadius: "1rem" }}>
          <div className="space-y-3">
            <p className="ww-eyebrow">Pick a city or neighbourhood</p>
            <Input
              autoFocus
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Madrid, Lisbon, Bangkok…"
              className="ww-input"
              style={{ fontFamily: "var(--font-inter), system-ui" }}
            />
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setLocation("")} className="text-xs" style={{ color: "#7a6e62" }}>Clear</button>
              <button type="button" onClick={() => setWhereOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--ww-ink)" }}>Done</button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Separator */}
      <div className="hidden w-px self-stretch my-2 md:block" style={{ background: "var(--ww-mist)" }} />

      {/* When */}
      <Popover open={whenOpen} onOpenChange={setWhenOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-14 items-center justify-between gap-3 rounded-xl px-4 text-left transition"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>
                When
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium" style={{ color: checkIn ? "var(--ww-ink)" : "#b8afa4" }}>
                {whenLabel}
              </span>
            </span>
            <CalendarDays className="size-4 shrink-0" style={{ color: "var(--ww-gold)" }} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={12} className="w-auto p-0 shadow-xl" style={{ border: "1px solid var(--ww-mist)", background: "var(--ww-warm-white)", borderRadius: "1rem" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--ww-mist)" }}>
            <p className="ww-eyebrow">Choose your dates</p>
          </div>
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={selectedRange}
            onSelect={(range) => {
              setCheckIn(range?.from ? format(range.from, "yyyy-MM-dd") : "");
              setCheckOut(range?.to ? format(range.to, "yyyy-MM-dd") : "");
              if (range?.from && range?.to) setWhenOpen(false);
            }}
            disabled={{ before: today }}
          />
          <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--ww-mist)" }}>
            <button type="button" onClick={() => { setCheckIn(""); setCheckOut(""); }} className="text-xs" style={{ color: "#7a6e62" }}>Clear</button>
            <button type="button" onClick={() => setWhenOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--ww-ink)" }}>Done</button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Separator */}
      <div className="hidden w-px self-stretch my-2 md:block" style={{ background: "var(--ww-mist)" }} />

      {/* Who */}
      <Popover open={whoOpen} onOpenChange={setWhoOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-14 items-center justify-between gap-3 rounded-xl px-4 text-left transition"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>
                Who
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium" style={{ color: guests ? "var(--ww-ink)" : "#b8afa4" }}>
                {whoLabel}
              </span>
            </span>
            <Users className="size-4 shrink-0" style={{ color: "var(--ww-gold)" }} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={12} className="w-[280px] p-4" style={{ border: "1px solid var(--ww-mist)", background: "var(--ww-warm-white)", borderRadius: "1rem" }}>
          <div className="space-y-3">
            <p className="ww-eyebrow">Number of guests</p>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => { setGuests(String(count)); setWhoOpen(false); }}
                  className="flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition"
                  style={{
                    background: guests === String(count) ? "var(--ww-ink)" : "var(--ww-parchment)",
                    color: guests === String(count) ? "white" : "var(--ww-ink)",
                    border: `1px solid ${guests === String(count) ? "var(--ww-ink)" : "var(--ww-mist)"}`,
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Search button */}
      <button
        type="button"
        onClick={submitSearch}
        className="flex h-14 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        style={{
          background: "var(--ww-terra)",
          boxShadow: "0 2px 8px rgba(193,123,74,0.35)",
          minWidth: "6rem",
        }}
      >
        <Search className="size-4" />
        Search
      </button>
    </div>
  );

}
