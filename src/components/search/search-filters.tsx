"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { WORKSPACE_TYPES } from "@/lib/constants";

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [guests, setGuests] = useState(searchParams.get("guests") || "");
  const [minWorkScore, setMinWorkScore] = useState(
    parseInt(searchParams.get("minWorkScore") || "0")
  );
  const [minSpeed, setMinSpeed] = useState(
    searchParams.get("minSpeed") || ""
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get("workspaceTypes")?.split(",").filter(Boolean) || []
  );
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") || "workScore"
  );

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (city) params.set("city", city);
    if (guests) params.set("guests", guests);
    if (minWorkScore > 0) params.set("minWorkScore", String(minWorkScore));
    if (minSpeed) params.set("minSpeed", minSpeed);
    if (selectedTypes.length > 0)
      params.set("workspaceTypes", selectedTypes.join(","));
    if (sortBy !== "workScore") params.set("sortBy", sortBy);

    router.push(`/search?${params.toString()}`);
  }, [router, query, city, guests, minWorkScore, minSpeed, selectedTypes, sortBy]);

  const clearFilters = () => {
    setQuery("");
    setCity("");
    setGuests("");
    setMinWorkScore(0);
    setMinSpeed("");
    setSelectedTypes([]);
    setSortBy("workScore");
    router.push("/search");
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="space-y-6 rounded-lg border bg-white p-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="query">Search</Label>
        <Input
          id="query"
          placeholder="Search spaces..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          placeholder="e.g., San Francisco"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>

      {/* Guests */}
      <div className="space-y-2">
        <Label htmlFor="guests">Minimum Capacity</Label>
        <Input
          id="guests"
          type="number"
          min={1}
          max={10}
          placeholder="Any"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />
      </div>

      {/* Work Score */}
      <div className="space-y-2">
        <Label>
          Minimum Work Score: {minWorkScore > 0 ? minWorkScore : "Any"}
        </Label>
        <Slider
          value={[minWorkScore]}
          onValueChange={([v]) => setMinWorkScore(v)}
          min={0}
          max={100}
          step={5}
        />
      </div>

      {/* Internet Speed */}
      <div className="space-y-2">
        <Label htmlFor="minSpeed">Min Download (Mbps)</Label>
        <Input
          id="minSpeed"
          type="number"
          placeholder="Any"
          value={minSpeed}
          onChange={(e) => setMinSpeed(e.target.value)}
        />
      </div>

      {/* Workspace Types */}
      <div className="space-y-2">
        <Label>Workspace Type</Label>
        <div className="space-y-1.5">
          {Object.entries(WORKSPACE_TYPES).map(([key, type]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                checked={selectedTypes.includes(key)}
                onCheckedChange={() => toggleType(key)}
                id={`type-${key}`}
              />
              <label
                htmlFor={`type-${key}`}
                className="text-sm cursor-pointer"
              >
                {type.icon} {type.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <Label>Sort By</Label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="workScore">Work Score (High to Low)</option>
          <option value="price_asc">Price (Low to High)</option>
          <option value="price_desc">Price (High to Low)</option>
          <option value="newest">Newest First</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={applyFilters} className="flex-1">
          Apply Filters
        </Button>
        <Button variant="outline" onClick={clearFilters}>
          Clear
        </Button>
      </div>
    </div>
  );
}
