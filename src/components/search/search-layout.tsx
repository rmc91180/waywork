"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MapListing } from "./search-map";
import { trackEvent } from "@/lib/analytics";
import type { SearchUiVariant } from "@/lib/experiments";

const SearchMap = dynamic(() => import("./search-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[460px] items-center justify-center rounded-2xl bg-slate-100">
      <p className="text-sm text-slate-500">Loading map...</p>
    </div>
  ),
});

interface SearchLayoutProps {
  listings: MapListing[];
  children: React.ReactNode;
  total: number;
  experimentVariant?: SearchUiVariant;
}

export function SearchLayout({
  listings,
  children,
  total,
  experimentVariant = "control",
}: SearchLayoutProps) {
  const [view, setView] = useState<"grid" | "map">(
    experimentVariant === "immersive" ? "map" : "grid"
  );

  useEffect(() => {
    trackEvent({
      event: "search_view_toggled",
      properties: {
        view,
        listingCount: listings.length,
      },
    });
  }, [view, listings.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <p className="pl-2 text-sm text-[var(--ww-text-primary)]">
          {total} result{total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center rounded-lg border bg-slate-50 p-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-3 text-xs",
              view === "grid" && "bg-white font-semibold text-slate-900 shadow-sm"
            )}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="mr-1.5 size-3.5" />
            Grid
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-3 text-xs",
              view === "map" && "bg-white font-semibold text-slate-900 shadow-sm"
            )}
            onClick={() => setView("map")}
          >
            <Map className="mr-1.5 size-3.5" />
            Map View
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        children
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_500px]">
          <div className="max-h-[72vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {children}
          </div>
          <div className="min-h-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SearchMap listings={listings} />
          </div>
        </div>
      )}
    </div>
  );
}
