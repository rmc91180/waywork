"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarIcon, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchFilters } from "@/components/search/search-filters";
import {
  SEARCH_SORT_OPTIONS,
  activeFilterCount,
  serializeSearchFilterParams,
  type SearchFilterState,
} from "@/lib/search-filters";
import type { SearchFacets } from "@/lib/search-query";
import { trackEvent } from "@/lib/analytics";

type LocationMode = "nearQuery" | "city" | "query";

interface SearchTopBarProps {
  filters: SearchFilterState;
  facets: SearchFacets;
  total: number;
  summary: string;
  locationBadgeLabel?: string | null;
}

function resolveLocationMode(filters: SearchFilterState): LocationMode {
  if (filters.nearQuery.trim().length > 0) return "nearQuery";
  if (filters.city.trim().length > 0) return "city";
  return "query";
}

function resolveLocationValue(filters: SearchFilterState) {
  return filters.nearQuery || filters.city || filters.query;
}

function parseDateValue(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function formatDateValue(value: string, placeholder: string) {
  const parsed = parseDateValue(value);
  return parsed ? format(parsed, "MMM d, yyyy") : placeholder;
}

function buildLocationPayload(
  filters: SearchFilterState,
  locationValue: string,
  locationMode: LocationMode
) {
  const trimmed = locationValue.trim();
  const next = {
    ...filters,
    page: 1,
  };

  if (!trimmed) {
    next.query = "";
    next.city = "";
    next.nearQuery = "";
    return next;
  }

  if (locationMode === "nearQuery") {
    next.nearQuery = trimmed;
    next.city = "";
    next.query = "";
    return next;
  }

  if (locationMode === "city") {
    next.city = trimmed;
    next.nearQuery = "";
    next.query = "";
    return next;
  }

  next.query = trimmed;
  next.city = "";
  next.nearQuery = "";
  return next;
}

interface SearchDateFieldProps {
  label: string;
  value: string;
  placeholder: string;
  minDate?: Date;
  onChange: (nextValue: string) => void;
}

function SearchDateField({
  label,
  value,
  placeholder,
  minDate,
  onChange,
}: SearchDateFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-sm text-slate-800">
              {formatDateValue(value, placeholder)}
            </span>
            <CalendarIcon className="size-4 text-slate-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
            disabled={minDate ? { before: minDate } : undefined}
          />
          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
            <button
              type="button"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
              onClick={() => onChange("")}
            >
              Clear
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[var(--ww-ink)] transition hover:text-[var(--ww-celadon)]"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function SearchTopBar({
  filters,
  facets,
  total,
  summary,
  locationBadgeLabel,
}: SearchTopBarProps) {
  const router = useRouter();
  const [locationValue, setLocationValue] = useState(resolveLocationValue(filters));
  const [locationMode, setLocationMode] = useState<LocationMode>(resolveLocationMode(filters));
  const [checkIn, setCheckIn] = useState(filters.checkIn);
  const [checkOut, setCheckOut] = useState(filters.checkOut);
  const [guests, setGuests] = useState(filters.guests);

  useEffect(() => {
    setLocationValue(resolveLocationValue(filters));
    setLocationMode(resolveLocationMode(filters));
    setCheckIn(filters.checkIn);
    setCheckOut(filters.checkOut);
    setGuests(filters.guests);
  }, [filters]);

  const activeCount = useMemo(() => activeFilterCount(filters), [filters]);
  const filtersKey = useMemo(
    () => serializeSearchFilterParams(filters).toString(),
    [filters]
  );
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const checkInDate = parseDateValue(checkIn);

  const submitSearch = () => {
    const next = buildLocationPayload(filters, locationValue, locationMode);
    next.checkIn = checkIn;
    next.checkOut =
      checkIn &&
      checkOut &&
      parseDateValue(checkOut) &&
      checkInDate &&
      parseDateValue(checkOut)! <= checkInDate
        ? ""
        : checkOut;
    next.guests = guests;

    trackEvent({
      event: "search_top_bar_submitted",
      properties: {
        locationMode,
        hasLocation: Boolean(locationValue.trim()),
        hasCheckIn: Boolean(checkIn),
        hasCheckOut: Boolean(checkOut),
        guests: guests || null,
      },
    });

    const params = serializeSearchFilterParams(next);
    router.push(`/search?${params.toString()}`);
    router.refresh();
  };

  const onSortChange = (sortBy: SearchFilterState["sortBy"]) => {
    trackEvent({
      event: "search_sort_changed",
      properties: { sortBy },
    });

    const params = serializeSearchFilterParams({
      ...filters,
      sortBy,
      page: 1,
    });
    router.push(`/search?${params.toString()}`);
    router.refresh();
  };

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-sm backdrop-blur md:p-5">
      <form
        className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_180px_180px_140px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Where
          </p>
          <Input
            value={locationValue}
            onChange={(event) => setLocationValue(event.target.value)}
            placeholder="City, neighborhood, or property"
            className="mt-2 h-auto border-0 px-0 py-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        <SearchDateField
          label="Check In"
          value={checkIn}
          placeholder="Add dates"
          minDate={today}
          onChange={(nextValue) => {
            setCheckIn(nextValue);
            if (
              checkOut &&
              parseDateValue(checkOut) &&
              nextValue &&
              parseDateValue(checkOut)! <= parseDateValue(nextValue)!
            ) {
              setCheckOut("");
            }
          }}
        />

        <SearchDateField
          label="Check Out"
          value={checkOut}
          placeholder="Add dates"
          minDate={checkInDate || today}
          onChange={setCheckOut}
        />

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Guests
          </p>
          <Input
            type="number"
            min={1}
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            placeholder="Any"
            className="mt-2 h-auto border-0 px-0 py-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        <Button
          type="submit"
          className="h-full min-h-14 rounded-2xl bg-[var(--ww-ink)] px-5 text-white hover:bg-[var(--ww-celadon)]"
        >
          <Search className="size-4" />
          Search
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">{summary}</p>
          <div className="flex flex-wrap gap-2">
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {activeCount} active filter{activeCount === 1 ? "" : "s"}
              </Badge>
            )}
            {filters.verifiedInternet && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                Verified internet only
              </Badge>
            )}
            {filters.guests && (
              <Badge variant="secondary" className="bg-sky-50 text-sky-700">
                {filters.guests} guest{filters.guests === "1" ? "" : "s"}
              </Badge>
            )}
            {locationBadgeLabel && (
              <Badge variant="secondary" className="bg-violet-50 text-violet-700">
                {locationBadgeLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchFilters
            key={filtersKey}
            filters={filters}
            facets={facets}
            total={total}
            triggerClassName="w-full sm:w-auto"
          />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Sort
            </span>
            <select
              value={filters.sortBy}
              onChange={(event) =>
                onSortChange(event.target.value as SearchFilterState["sortBy"])
              }
              className="min-w-[170px] bg-transparent text-sm outline-none"
            >
              {SEARCH_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
