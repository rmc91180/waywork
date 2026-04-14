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
    <div className="grid gap-2 rounded-[24px] border border-white/45 bg-white/92 p-2 shadow-xl shadow-slate-900/10 backdrop-blur md:grid-cols-[minmax(0,1.45fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_auto] md:items-stretch">
      <Popover open={whereOpen} onOpenChange={setWhereOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Where
              </span>
              <span
                className={cn(
                  "mt-1 block truncate text-sm",
                  location.trim() ? "text-slate-900" : "text-slate-400"
                )}
              >
                {locationLabel}
              </span>
            </span>
            <MapPin className="size-4 shrink-0 text-slate-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={12} className="w-[320px] border-slate-200 p-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Where
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                Pick a city or neighborhood
              </h3>
            </div>
            <Input
              autoFocus
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City, neighborhood, or property"
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocation("")}
                className="text-slate-500"
              >
                Clear
              </Button>
              <Button type="button" size="sm" onClick={() => setWhereOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={whenOpen} onOpenChange={setWhenOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                When
              </span>
              <span
                className={cn(
                  "mt-1 block truncate text-sm",
                  checkIn ? "text-slate-900" : "text-slate-400"
                )}
              >
                {whenLabel}
              </span>
            </span>
            <CalendarDays className="size-4 shrink-0 text-slate-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={12}
          className="w-auto border-slate-200 p-0 shadow-xl"
        >
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              When
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">
              Choose check-in and check-out dates
            </h3>
          </div>
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={selectedRange}
            onSelect={(range) => {
              setCheckIn(range?.from ? format(range.from, "yyyy-MM-dd") : "");
              setCheckOut(range?.to ? format(range.to, "yyyy-MM-dd") : "");

              if (range?.from && range?.to) {
                setWhenOpen(false);
              }
            }}
            disabled={{ before: today }}
          />
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCheckIn("");
                setCheckOut("");
              }}
              className="text-slate-500"
            >
              Clear
            </Button>
            <Button type="button" size="sm" onClick={() => setWhenOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={whoOpen} onOpenChange={setWhoOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Who
              </span>
              <span
                className={cn(
                  "mt-1 block truncate text-sm",
                  guests ? "text-slate-900" : "text-slate-400"
                )}
              >
                {whoLabel}
              </span>
            </span>
            <Users className="size-4 shrink-0 text-slate-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={12} className="w-[320px] border-slate-200 p-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Who
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                Choose the number of guests
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                <Button
                  key={count}
                  type="button"
                  variant={guests === String(count) ? "default" : "outline"}
                  size="sm"
                  className="h-10 rounded-xl px-0"
                  onClick={() => {
                    setGuests(String(count));
                    setWhoOpen(false);
                  }}
                >
                  {count}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGuests("")}
                className="text-slate-500"
              >
                Clear
              </Button>
              <Button type="button" size="sm" onClick={() => setWhoOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        size="lg"
        className="h-14 rounded-2xl bg-[var(--ww-primary-blue)] px-5 text-white hover:bg-[var(--ww-secondary-green)] md:min-w-28"
        onClick={submitSearch}
      >
        <Search className="size-4" />
        Search
      </Button>
    </div>
  );
}
