"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { MapListing } from "./search-map";

const SearchMap = dynamic(() => import("./search-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading map...</p>
    </div>
  ),
});

interface SearchLayoutProps {
  listings: MapListing[];
  children: React.ReactNode;
  total: number;
}

export function SearchLayout({ listings, children, total }: SearchLayoutProps) {
  const [view, setView] = useState<"grid" | "map">("grid");

  return (
    <div className="flex-1">
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {total} result{total !== 1 ? "s" : ""}
        </p>
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-none px-4 text-xs",
              view === "grid" && "bg-gray-100 font-semibold"
            )}
            onClick={() => setView("grid")}
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            Grid
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-none px-4 text-xs",
              view === "map" && "bg-gray-100 font-semibold"
            )}
            onClick={() => setView("map")}
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            Map
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && children}

      {/* Map View - split layout */}
      {view === "map" && (
        <div className="flex flex-col lg:flex-row gap-4" style={{ height: "calc(100vh - 220px)" }}>
          {/* Scrollable cards */}
          <div className="w-full lg:w-2/5 overflow-y-auto pr-2 hidden lg:block">
            {children}
          </div>
          {/* Map */}
          <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden border">
            <SearchMap listings={listings} />
          </div>
        </div>
      )}
    </div>
  );
}
