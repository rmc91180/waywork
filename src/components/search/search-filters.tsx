"use client";

import { type ReactNode, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ChevronDown, Filter, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { interpretSmartSearchPrompt } from "@/lib/smart-search";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  filters: SearchFilterState;
  facets: SearchFacets;
  total: number;
  triggerLabel?: string;
  triggerClassName?: string;
}

const NETWORK_OPTIONS = [
  { value: "WIFI", label: "WiFi" },
  { value: "WIRED", label: "Wired Ethernet" },
  { value: "BOTH", label: "WiFi + Wired" },
] as const;

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

interface FilterCategoryProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

function FilterCategory({
  title,
  subtitle,
  defaultOpen = false,
  className,
  children,
}: FilterCategoryProps) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-3", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-slate-500 transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded ? (
        <div id={panelId} className="mt-3 space-y-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

interface SearchFiltersFormContentProps {
  draft: SearchFilterState;
  setDraft: React.Dispatch<React.SetStateAction<SearchFilterState>>;
  smartPrompt: string;
  setSmartPrompt: React.Dispatch<React.SetStateAction<string>>;
  smartHighlights: string[];
  setSmartHighlights: React.Dispatch<React.SetStateAction<string[]>>;
  facets: SearchFacets;
}

function SearchFiltersFormContent({
  draft,
  setDraft,
  smartPrompt,
  setSmartPrompt,
  smartHighlights,
  setSmartHighlights,
  facets,
}: SearchFiltersFormContentProps) {
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

  const applySmartPrompt = () => {
    const interpreted = interpretSmartSearchPrompt(smartPrompt);
    if (Object.keys(interpreted.updates).length === 0) return;

    trackEvent({
      event: "smart_search_interpreted",
      properties: {
        promptLength: smartPrompt.length,
        highlights: interpreted.highlights,
      },
    });

    setSmartHighlights(interpreted.highlights);
    setDraft((current) => ({
      ...current,
      query: smartPrompt,
      ...interpreted.updates,
    }));
  };

  return (
    <div className="space-y-5">
      <FilterCategory
        title="Smart Assistant"
        subtitle="Use natural language to auto-set filters."
        className="border-cyan-200 bg-cyan-50/70"
      >
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-cyan-800">
            Smart Assistant
          </Label>
          <Bot className="size-4 text-cyan-700" />
        </div>
        <Input
          placeholder='Try: "team offsite near Lisbon with pool under $220"'
          value={smartPrompt}
          onChange={(event) => setSmartPrompt(event.target.value)}
        />
        <div className="flex gap-2">
          <Button type="button" size="xs" onClick={applySmartPrompt}>
            Interpret Prompt
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setSmartPrompt("");
              setSmartHighlights([]);
            }}
          >
            Clear
          </Button>
        </div>
        {smartHighlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {smartHighlights.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-cyan-200 bg-white/80 text-cyan-700"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </FilterCategory>

      <FilterCategory
        title="Quick Presets"
        subtitle="One-click filter bundles for common intents."
      >
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
      </FilterCategory>

      <FilterCategory
        title="Location, Dates & Capacity"
        subtitle="Where, when, and team size."
        defaultOpen
      >
        <section className="space-y-3">
          <Label htmlFor="query-search-filters">Search</Label>
          <Input
            id="query-search-filters"
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
              list="near-options-search-filters"
              placeholder="Landmark, address, city, or lat,lng"
              value={draft.nearQuery}
              onChange={(event) =>
                setDraft((current) => ({ ...current, nearQuery: event.target.value }))
              }
            />
            <datalist id="near-options-search-filters">
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
              <Label htmlFor="radiusKm-search-filters">Radius (km)</Label>
              <select
                id="radiusKm-search-filters"
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
            <Label htmlFor="city-search-filters">City</Label>
            <Input
              id="city-search-filters"
              placeholder="Any city"
              value={draft.city}
              onChange={(event) =>
                setDraft((current) => ({ ...current, city: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guests-search-filters">Guests</Label>
            <Input
              id="guests-search-filters"
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
            <Label htmlFor="minBedrooms-search-filters">Min bedrooms</Label>
            <Input
              id="minBedrooms-search-filters"
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
            <Label htmlFor="minPropertySizeSqm-search-filters">Min size (sqm)</Label>
            <Input
              id="minPropertySizeSqm-search-filters"
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
            <Label htmlFor="checkIn-search-filters">Check in</Label>
            <Input
              id="checkIn-search-filters"
              type="date"
              value={draft.checkIn}
              onChange={(event) =>
                setDraft((current) => ({ ...current, checkIn: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkOut-search-filters">Check out</Label>
            <Input
              id="checkOut-search-filters"
              type="date"
              value={draft.checkOut}
              onChange={(event) =>
                setDraft((current) => ({ ...current, checkOut: event.target.value }))
              }
            />
          </div>
        </section>
      </FilterCategory>

      <FilterCategory
        title="Price, Score & Ranking"
        subtitle="Budget and quality thresholds."
      >
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
            <Label htmlFor="minSpeed-search-filters">Min internet (Mbps)</Label>
            <Input
              id="minSpeed-search-filters"
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
            <Label htmlFor="reviewMin-search-filters">Min rating</Label>
            <select
              id="reviewMin-search-filters"
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
          <Label htmlFor="sortBy-search-filters">Sort by</Label>
          <select
            id="sortBy-search-filters"
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
      </FilterCategory>

      <FilterCategory
        title="Workspace Setup"
        subtitle="Space type and sleeping setup."
      >
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
                <Badge variant="outline">{facets.workspaceTypes[key] || 0}</Badge>
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
      </FilterCategory>

      <FilterCategory
        title="Connectivity"
        subtitle="Network type and reliability."
      >
        <section className="space-y-3">
          <Label>Connectivity</Label>
          <div className="space-y-2">
            {NETWORK_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
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
      </FilterCategory>

      <FilterCategory
        title="Cancellation Policy"
        subtitle="Pick your flexibility level."
      >
        <section className="space-y-3">
          <Label>Cancellation policy</Label>
          <div className="space-y-2">
            {Object.entries(CANCELLATION_POLICIES).map(([key, policy]) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.cancellationPolicies.includes(key)}
                    onCheckedChange={() =>
                      setDraft((current) => ({
                        ...current,
                        cancellationPolicies: toggleArrayValue(
                          current.cancellationPolicies,
                          key
                        ),
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
      </FilterCategory>

      <FilterCategory
        title="Offsite Comfort"
        subtitle="Leisure features for stronger team downtime."
        className="border-rose-200 bg-rose-50/60"
      >
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
            <label
              key={field}
              className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm"
            >
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
      </FilterCategory>

      <FilterCategory
        title="Amenities & Fees"
        subtitle="Specific amenities and fee preferences."
      >
        <section className="space-y-3">
          <Label>Top amenities</Label>
          <div className="space-y-2">
            {facets.amenities.map((amenity) => (
              <label
                key={amenity.name}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
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
      </FilterCategory>
    </div>
  );
}

export function SearchFilters({
  filters,
  facets,
  total,
  triggerLabel = "Filters",
  triggerClassName,
}: SearchFiltersProps) {
  const router = useRouter();
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draft, setDraft] = useState<SearchFilterState>(filters);
  const [smartPrompt, setSmartPrompt] = useState(filters.query || "");
  const [smartHighlights, setSmartHighlights] = useState<string[]>([]);

  const activeCount = useMemo(() => activeFilterCount(draft), [draft]);

  const closeAll = () => {
    setDesktopOpen(false);
    setMobileOpen(false);
  };

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
    router.refresh();
    closeAll();
  };

  const clearFilters = () => {
    trackEvent({ event: "search_filters_cleared" });
    setDraft(DEFAULT_SEARCH_FILTERS);
    setSmartPrompt("");
    setSmartHighlights([]);
    router.push("/search");
    router.refresh();
    closeAll();
  };

  const renderTriggerButton = () => (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-2", triggerClassName)}
    >
      <Filter className="size-4" />
      {triggerLabel}
      <Badge variant="secondary" className="ml-1 bg-slate-100 text-slate-700">
        {activeCount}
      </Badge>
    </Button>
  );

  const form = (
    <SearchFiltersFormContent
      draft={draft}
      setDraft={setDraft}
      smartPrompt={smartPrompt}
      setSmartPrompt={setSmartPrompt}
      smartHighlights={smartHighlights}
      setSmartHighlights={setSmartHighlights}
      facets={facets}
    />
  );

  return (
    <>
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>{renderTriggerButton()}</SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Refine your search</SheetTitle>
              <SheetDescription>
                Tune pricing, internet quality, amenities, and workspace requirements.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{form}</div>
            <SheetFooter className="border-t bg-white/95">
              <div className="flex w-full flex-col gap-2">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear filters
                </Button>
                <Button onClick={applyFilters} className="w-full bg-cyan-700 hover:bg-cyan-800">
                  Show {total} workspace{total === 1 ? "" : "s"}
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden lg:block">
        <Dialog open={desktopOpen} onOpenChange={setDesktopOpen}>
          <DialogTrigger asChild>{renderTriggerButton()}</DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-5xl">
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle>Feature Filters</DialogTitle>
              <DialogDescription>
                Fine-tune dates, pricing, internet quality, amenities, and workspace needs.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[calc(88vh-152px)] overflow-y-auto px-6 py-5">{form}</div>
            <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
              <Button onClick={applyFilters} className="bg-cyan-700 hover:bg-cyan-800">
                Show {total} workspace{total === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
