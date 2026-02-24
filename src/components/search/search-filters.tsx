"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  BED_SIZE_OPTIONS,
  CANCELLATION_POLICIES,
  LEISURE_FEATURE_LABELS,
  WORKSPACE_TYPES,
} from "@/lib/constants";
import { LANDMARK_SUGGESTIONS } from "@/lib/landmark-options";
import {
  DEFAULT_SEARCH_FILTERS,
  SEARCH_SORT_OPTIONS,
  activeFilterCount,
  serializeSearchFilterParams,
  type SearchFilterState,
} from "@/lib/search-filters";
import type { SearchFacets } from "@/lib/search-query";
import { trackEvent } from "@/lib/analytics";

interface SearchFiltersProps {
  mode: "desktop" | "mobile";
  filters: SearchFilterState;
  facets: SearchFacets;
  total: number;
}

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

const NETWORK_OPTIONS = [
  { value: "WIFI", label: "WiFi" },
  { value: "WIRED", label: "Wired Ethernet" },
  { value: "BOTH", label: "WiFi + Wired" },
] as const;

export function SearchFilters({ mode, filters, facets, total }: SearchFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SearchFilterState>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const activeCount = useMemo(() => activeFilterCount(draft), [draft]);

  const applyFilters = () => {
    trackEvent({
      event: "search_filters_applied",
      properties: {
        activeFilterCount: activeCount,
        hasQuery: Boolean(draft.query),
        workspaceTypes: draft.workspaceTypes.length,
        amenities: draft.amenities.length,
        networkTypes: draft.networkTypes.length,
        nearQuery: draft.nearQuery,
        radiusKm: draft.radiusKm,
        leisureFilters: [
          draft.hasJacuzzi,
          draft.hasSwimmingPool,
          draft.hasBackyard,
          draft.hasPingPongTable,
          draft.hasPoolTable,
        ].filter(Boolean).length,
        sortBy: draft.sortBy,
      },
    });

    const params = serializeSearchFilterParams({
      ...draft,
      page: 1,
    });
    router.push(`/search?${params.toString()}`);
    setOpen(false);
  };

  const clearFilters = () => {
    trackEvent({ event: "search_filters_cleared" });
    setDraft(DEFAULT_SEARCH_FILTERS);
    router.push("/search");
    setOpen(false);
  };

  const applyPreset = (preset: "focus" | "team" | "budget" | "offsite") => {
    trackEvent({
      event: "search_preset_selected",
      properties: { preset },
    });

    if (preset === "focus") {
      setDraft((current) => ({
        ...current,
        workspaceTypes: ["PRIVATE_OFFICE", "HOME_OFFICE", "STUDIO"],
        minWorkScore: 75,
        minSpeed: "200",
        verifiedInternet: true,
        backupInternet: false,
      }));
      return;
    }

    if (preset === "team") {
      setDraft((current) => ({
        ...current,
        workspaceTypes: ["MEETING_ROOM", "HYBRID_SPACE", "STUDIO"],
        guests: "4",
        minSpeed: "150",
        networkTypes: ["BOTH"],
      }));
      return;
    }

    if (preset === "offsite") {
      setDraft((current) => ({
        ...current,
        workspaceTypes: ["HYBRID_SPACE", "STUDIO", "MEETING_ROOM"],
        minBedrooms: "2",
        minPropertySizeSqm: "120",
        hasBackyard: true,
        hasSwimmingPool: true,
      }));
      return;
    }

    setDraft((current) => ({
      ...current,
      maxPrice: "100",
      noCleaningFee: true,
      sortBy: "price_asc",
    }));
  };

  const form = (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Smart Presets
          </Label>
          <Sparkles className="size-4 text-cyan-700" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="xs" variant="outline" onClick={() => applyPreset("focus")}>
            Deep Focus
          </Button>
          <Button size="xs" variant="outline" onClick={() => applyPreset("team")}>
            Team Day
          </Button>
          <Button size="xs" variant="outline" onClick={() => applyPreset("offsite")}>
            Offsite Escape
          </Button>
          <Button size="xs" variant="outline" onClick={() => applyPreset("budget")}>
            Budget Smart
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <Label htmlFor={`query-${mode}`}>Search</Label>
        <Input
          id={`query-${mode}`}
          placeholder="Title, city, neighborhood..."
          value={draft.query}
          onChange={(event) =>
            setDraft((current) => ({ ...current, query: event.target.value }))
          }
        />
      </section>

      <section className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-violet-700">
          Search by Distance
        </Label>
        <div className="space-y-2">
          <Input
            list={`near-options-${mode}`}
            placeholder="Landmark, address, city, or lat,lng"
            value={draft.nearQuery}
            onChange={(event) =>
              setDraft((current) => ({ ...current, nearQuery: event.target.value }))
            }
          />
          <datalist id={`near-options-${mode}`}>
            {LANDMARK_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1.5">
            {LANDMARK_SUGGESTIONS.slice(0, 6).map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                size="xs"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({ ...current, nearQuery: suggestion }))
                }
              >
                {suggestion.split(",")[0]}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`radiusKm-${mode}`}>Radius (km)</Label>
            <select
              id={`radiusKm-${mode}`}
              className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              value={draft.radiusKm}
              onChange={(event) =>
                setDraft((current) => ({ ...current, radiusKm: event.target.value }))
              }
            >
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`city-${mode}`}>City</Label>
          <Input
            id={`city-${mode}`}
            placeholder="Any city"
            value={draft.city}
            onChange={(event) =>
              setDraft((current) => ({ ...current, city: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`guests-${mode}`}>Guests</Label>
          <Input
            id={`guests-${mode}`}
            type="number"
            min={1}
            placeholder="Any"
            value={draft.guests}
            onChange={(event) =>
              setDraft((current) => ({ ...current, guests: event.target.value }))
            }
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`minBedrooms-${mode}`}>Min bedrooms</Label>
          <Input
            id={`minBedrooms-${mode}`}
            type="number"
            min={1}
            placeholder="Any"
            value={draft.minBedrooms}
            onChange={(event) =>
              setDraft((current) => ({ ...current, minBedrooms: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`minPropertySizeSqm-${mode}`}>Min size (sqm)</Label>
          <Input
            id={`minPropertySizeSqm-${mode}`}
            type="number"
            min={0}
            placeholder="Any"
            value={draft.minPropertySizeSqm}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                minPropertySizeSqm: event.target.value,
              }))
            }
          />
        </div>
        {facets.propertySize.max > 0 && (
          <p className="col-span-2 text-xs text-slate-500">
            Typical property size: {facets.propertySize.min} to {facets.propertySize.max} sqm
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`checkIn-${mode}`}>Check in</Label>
          <Input
            id={`checkIn-${mode}`}
            type="date"
            value={draft.checkIn}
            onChange={(event) =>
              setDraft((current) => ({ ...current, checkIn: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`checkOut-${mode}`}>Check out</Label>
          <Input
            id={`checkOut-${mode}`}
            type="date"
            value={draft.checkOut}
            onChange={(event) =>
              setDraft((current) => ({ ...current, checkOut: event.target.value }))
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <Label>Price per day (USD)</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Min"
            type="number"
            min={0}
            value={draft.minPrice}
            onChange={(event) =>
              setDraft((current) => ({ ...current, minPrice: event.target.value }))
            }
          />
          <Input
            placeholder="Max"
            type="number"
            min={0}
            value={draft.maxPrice}
            onChange={(event) =>
              setDraft((current) => ({ ...current, maxPrice: event.target.value }))
            }
          />
        </div>
        {facets.price.max > 0 && (
          <p className="text-xs text-slate-500">
            Typical range: ${Math.round(facets.price.min / 100)} to $
            {Math.round(facets.price.max / 100)}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <Label>Minimum work score: {draft.minWorkScore || "Any"}</Label>
        <Slider
          value={[draft.minWorkScore]}
          onValueChange={([value]) =>
            setDraft((current) => ({ ...current, minWorkScore: value }))
          }
          min={0}
          max={100}
          step={5}
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`minSpeed-${mode}`}>Min internet (Mbps)</Label>
          <Input
            id={`minSpeed-${mode}`}
            type="number"
            min={0}
            value={draft.minSpeed}
            onChange={(event) =>
              setDraft((current) => ({ ...current, minSpeed: event.target.value }))
            }
            placeholder="Any"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`reviewMin-${mode}`}>Min rating</Label>
          <select
            id={`reviewMin-${mode}`}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            value={draft.reviewMin}
            onChange={(event) =>
              setDraft((current) => ({ ...current, reviewMin: event.target.value }))
            }
          >
            <option value="">Any rating</option>
            <option value="3">3.0+</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </select>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor={`sortBy-${mode}`}>Sort by</Label>
        <select
          id={`sortBy-${mode}`}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          value={draft.sortBy}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              sortBy: event.target.value as SearchFilterState["sortBy"],
            }))
          }
        >
          {SEARCH_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-3">
        <Label>Workspace type</Label>
        <div className="space-y-2">
          {Object.entries(WORKSPACE_TYPES).map(([key, type]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.workspaceTypes.includes(key)}
                  onCheckedChange={() =>
                    setDraft((current) => ({
                      ...current,
                      workspaceTypes: toggleArrayValue(current.workspaceTypes, key),
                    }))
                  }
                />
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </span>
              <Badge variant="outline">
                {facets.workspaceTypes[key] || 0}
              </Badge>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Label>Preferred bed size</Label>
        <div className="space-y-2">
          {Object.entries(BED_SIZE_OPTIONS).map(([key, meta]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={draft.bedSizes.includes(key)}
                  onCheckedChange={() =>
                    setDraft((current) => ({
                      ...current,
                      bedSizes: toggleArrayValue(current.bedSizes, key),
                    }))
                  }
                />
                {meta.label}
              </span>
              <Badge variant="outline">{facets.bedSizes[key] || 0}</Badge>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Label>Connectivity</Label>
        <div className="space-y-2">
          {NETWORK_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.networkTypes.includes(option.value)}
                  onCheckedChange={() =>
                    setDraft((current) => ({
                      ...current,
                      networkTypes: toggleArrayValue(current.networkTypes, option.value),
                    }))
                  }
                />
                {option.label}
              </span>
              <Badge variant="outline">{facets.networkTypes[option.value] || 0}</Badge>
            </label>
          ))}

          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Checkbox
              checked={draft.verifiedInternet}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, verifiedInternet: Boolean(checked) }))
              }
            />
            Verified speed tests only
          </label>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Checkbox
              checked={draft.backupInternet}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, backupInternet: Boolean(checked) }))
              }
            />
            Backup internet available
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <Label>Cancellation policy</Label>
        <div className="space-y-2">
          {Object.entries(CANCELLATION_POLICIES).map(([key, policy]) => (
            <label key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.cancellationPolicies.includes(key)}
                  onCheckedChange={() =>
                    setDraft((current) => ({
                      ...current,
                      cancellationPolicies: toggleArrayValue(current.cancellationPolicies, key),
                    }))
                  }
                />
                {policy.label}
              </span>
              <Badge variant="outline">{facets.cancellationPolicies[key] || 0}</Badge>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-rose-700">
          Offsite Comfort
        </Label>
        <div className="space-y-2">
          {(
            [
              ["hasJacuzzi", facets.pleasure.jacuzzi],
              ["hasSwimmingPool", facets.pleasure.swimmingPool],
              ["hasBackyard", facets.pleasure.backyard],
              ["hasPingPongTable", facets.pleasure.pingPongTable],
              ["hasPoolTable", facets.pleasure.poolTable],
            ] as const
          ).map(([field, count]) => (
            <label key={field} className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={draft[field]}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({ ...current, [field]: Boolean(checked) }))
                  }
                />
                {LEISURE_FEATURE_LABELS[field]}
              </span>
              <Badge variant="outline">{count}</Badge>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Label>Top amenities</Label>
        <div className="space-y-2">
          {facets.amenities.map((amenity) => (
            <label key={amenity.name} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.amenities.includes(amenity.name)}
                  onCheckedChange={() =>
                    setDraft((current) => ({
                      ...current,
                      amenities: toggleArrayValue(current.amenities, amenity.name),
                    }))
                  }
                />
                {amenity.name}
              </span>
              <Badge variant="outline">{amenity.count}</Badge>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <Checkbox
            checked={draft.noCleaningFee}
            onCheckedChange={(checked) =>
              setDraft((current) => ({ ...current, noCleaningFee: Boolean(checked) }))
            }
          />
          No cleaning fee
        </label>
      </section>

      <div className="flex gap-2">
        <Button onClick={applyFilters} className="flex-1 bg-cyan-700 hover:bg-cyan-800">
          Apply filters
        </Button>
        <Button variant="outline" onClick={clearFilters}>
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );

  if (mode === "mobile") {
    return (
      <div className="space-y-3 rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            {total} result{total === 1 ? "" : "s"}
          </p>
          <Badge variant="outline">{activeCount} active</Badge>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="w-full justify-center gap-2 bg-slate-900 hover:bg-slate-800">
              <Filter className="size-4" />
              Filter & Sort
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Refine your search</SheetTitle>
              <SheetDescription>
                Tune pricing, internet quality, amenities, and workspace requirements.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{form}</div>
            <SheetFooter className="border-t bg-white/95">
              <Button onClick={applyFilters} className="w-full bg-cyan-700 hover:bg-cyan-800">
                Show {total} workspace{total === 1 ? "" : "s"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Filters</p>
          <p className="text-xs text-slate-500">{total} results</p>
        </div>
        <Badge variant="outline">{activeCount} active</Badge>
      </div>
      {form}
    </div>
  );
}
