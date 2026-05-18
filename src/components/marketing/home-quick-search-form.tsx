"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { trackEvent } from "@/lib/analytics";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFAULT_SEARCH_FILTERS, serializeSearchFilterParams } from "@/lib/search-filters";

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
  const [minWorkScore, setMinWorkScore] = useState(0);
  const [scoreOpen, setScoreOpen] = useState(false);

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
      minWorkScore,
      page: 1,
    });

    router.push(`/search?${params.toString()}`);
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(250,248,244,0.96)",
        border: "1px solid rgba(201,168,76,0.25)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 4px 32px rgba(13,31,45,0.18), 0 1px 4px rgba(13,31,45,0.1)",
      }}
    >
      {/* ── Desktop — single aligned row ── */}
      <div className="hidden md:flex md:items-stretch">

        {/* Where */}
        <Popover open={whereOpen} onOpenChange={setWhereOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center justify-between gap-3 px-5 py-4 text-left transition"
              style={{ background: "transparent", borderRight: "1px solid var(--ww-mist)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>Where</span>
                <span className="mt-0.5 block truncate text-sm font-medium" style={{ color: location.trim() ? "var(--ww-ink)" : "#b8afa4" }}>{locationLabel}</span>
              </span>
              <MapPin className="size-4 shrink-0" style={{ color: "var(--ww-gold)" }} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={8} className="w-[300px] p-4" style={{ border: "1px solid var(--ww-mist)", background: "var(--ww-warm-white)", borderRadius: "1rem" }}>
            <p className="ww-eyebrow mb-3">City or neighbourhood</p>
            <Input autoFocus value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Madrid, Lisbon, Bangkok…" />
            <div className="mt-3 flex justify-between">
              <button type="button" onClick={() => setLocation("")} className="text-xs" style={{ color: "#7a6e62" }}>Clear</button>
              <button type="button" onClick={() => setWhereOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--ww-ink)" }}>Done</button>
            </div>
          </PopoverContent>
        </Popover>

        {/* When */}
        <Popover open={whenOpen} onOpenChange={setWhenOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center justify-between gap-3 px-5 py-4 text-left transition"
              style={{ background: "transparent", borderRight: "1px solid var(--ww-mist)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>When</span>
                <span className="mt-0.5 block truncate text-sm font-medium" style={{ color: checkIn ? "var(--ww-ink)" : "#b8afa4" }}>{whenLabel}</span>
              </span>
              <CalendarDays className="size-4 shrink-0" style={{ color: "var(--ww-gold)" }} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={8} className="w-auto p-0 shadow-xl" style={{ border: "1px solid var(--ww-mist)", background: "var(--ww-warm-white)", borderRadius: "1rem" }}>
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
            <div className="flex justify-between border-t px-4 py-3" style={{ borderColor: "var(--ww-mist)" }}>
              <button type="button" onClick={() => { setCheckIn(""); setCheckOut(""); }} className="text-xs" style={{ color: "#7a6e62" }}>Clear</button>
              <button type="button" onClick={() => setWhenOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "var(--ww-ink)" }}>Done</button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Who */}
        <Popover open={whoOpen} onOpenChange={setWhoOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between gap-3 px-5 py-4 text-left transition"
              style={{ background: "transparent", borderRight: "1px solid var(--ww-mist)", minWidth: "148px" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>Who</span>
                <span className="mt-0.5 block text-sm font-medium" style={{ color: guests ? "var(--ww-ink)" : "#b8afa4" }}>{whoLabel}</span>
              </span>
              <Users className="size-4 shrink-0" style={{ color: "var(--ww-gold)" }} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={8} className="w-[260px] p-4" style={{ border: "1px solid var(--ww-mist)", background: "var(--ww-warm-white)", borderRadius: "1rem" }}>
            <p className="ww-eyebrow mb-3">Number of guests</p>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => { setGuests(String(count)); setWhoOpen(false); }}
                  className="flex h-10 items-center justify-center rounded-lg text-sm font-semibold"
                  style={{
                    background: guests === String(count) ? "var(--ww-ink)" : "var(--ww-parchment)",
                    color: guests === String(count) ? "white" : "var(--ww-ink)",
                    border: `1px solid ${guests === String(count) ? "var(--ww-ink)" : "var(--ww-mist)"}`,
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >{count}</button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Work Score */}
        <Popover open={scoreOpen} onOpenChange={setScoreOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between gap-3 px-5 py-4 text-left transition"
              style={{ background: "transparent", borderRight: "1px solid var(--ww-mist)", minWidth: "138px" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>Work Score</span>
                <span className="mt-0.5 block text-sm font-medium" style={{ color: minWorkScore > 0 ? "var(--ww-ink)" : "#b8afa4", fontFamily: "var(--font-mono, monospace)" }}>
                  {minWorkScore > 0 ? `${minWorkScore}+` : "Any"}
                </span>
              </span>
              <span className="text-base shrink-0" style={{ color: "var(--ww-gold)" }}>⚡</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={8} className="w-[240px] p-4" style={{ border: "1px solid var(--ww-mist)", background: "var(--ww-warm-white)", borderRadius: "1rem" }}>
            <p className="ww-eyebrow mb-3">Minimum Work Score</p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 50, 65, 75, 85, 90].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setMinWorkScore(val); setScoreOpen(false); }}
                  className="flex h-10 items-center justify-center rounded-lg text-sm font-semibold"
                  style={{
                    background: minWorkScore === val ? "var(--ww-ink)" : "var(--ww-parchment)",
                    color: minWorkScore === val ? "var(--ww-gold)" : "var(--ww-ink)",
                    border: `1px solid ${minWorkScore === val ? "var(--ww-ink)" : "var(--ww-mist)"}`,
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {val === 0 ? "Any" : `${val}+`}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed" style={{ color: "#b8afa4" }}>
              80+ means verified internet, proper desk, and quiet environment.
            </p>
          </PopoverContent>
        </Popover>


        {/* Search */}
        <div className="flex items-center p-2">
          <button
            type="button"
            onClick={submitSearch}
            className="flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            style={{ background: "var(--ww-terra)", boxShadow: "0 2px 8px rgba(193,123,74,0.35)", whiteSpace: "nowrap" }}
          >
            <Search className="size-4" />
            Search
          </button>
        </div>
      </div>

      {/* ── Mobile — stacked ── */}
      <div className="flex flex-col md:hidden">
        <button type="button" onClick={() => setWhereOpen(true)} className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--ww-mist)" }}>
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>Where</span>
            <span className="mt-0.5 block text-sm font-medium" style={{ color: location.trim() ? "var(--ww-ink)" : "#b8afa4" }}>{locationLabel}</span>
          </span>
          <MapPin className="size-4" style={{ color: "var(--ww-gold)" }} />
        </button>
        <button type="button" onClick={() => setWhenOpen(true)} className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--ww-mist)" }}>
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>When</span>
            <span className="mt-0.5 block text-sm font-medium" style={{ color: checkIn ? "var(--ww-ink)" : "#b8afa4" }}>{whenLabel}</span>
          </span>
          <CalendarDays className="size-4" style={{ color: "var(--ww-gold)" }} />
        </button>
        <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--ww-mist)" }}>
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--ww-celadon)" }}>Who</span>
            <span className="mt-0.5 block text-sm font-medium" style={{ color: "var(--ww-ink)" }}>{whoLabel}</span>
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setGuests(g => String(Math.max(1, Number(g) - 1)))} className="flex size-8 items-center justify-center rounded-full font-bold" style={{ background: "var(--ww-parchment)", border: "1px solid var(--ww-mist)", color: "var(--ww-ink)", fontSize: "18px" }}>−</button>
            <span className="w-5 text-center text-sm font-mono font-semibold" style={{ color: "var(--ww-ink)" }}>{guests}</span>
            <button type="button" onClick={() => setGuests(g => String(Math.min(20, Number(g) + 1)))} className="flex size-8 items-center justify-center rounded-full font-bold" style={{ background: "var(--ww-parchment)", border: "1px solid var(--ww-mist)", color: "var(--ww-ink)", fontSize: "18px" }}>+</button>
          </div>
        </div>
        <div className="p-3">
          <button type="button" onClick={submitSearch} className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white" style={{ background: "var(--ww-terra)", boxShadow: "0 2px 8px rgba(193,123,74,0.3)" }}>
            <Search className="size-4" />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
