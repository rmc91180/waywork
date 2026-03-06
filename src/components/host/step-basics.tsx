"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WORKSPACE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ListingFormData } from "@/hooks/use-listing-form";

interface StepBasicsProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
}

export function StepBasics({ data, onChange }: StepBasicsProps) {
  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function importFromAirbnb(urlValue: string) {
    if (!urlValue.trim()) {
      setImportMessage({ tone: "error", text: "Paste a valid Airbnb listing URL first." });
      return;
    }

    setIsImporting(true);
    setImportMessage(null);
    try {
      const response = await fetch("/api/host/listings/import-airbnb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlValue.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        listing?: {
          title?: string;
          description?: string;
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postalCode?: string;
          lat?: number | null;
          lng?: number | null;
          maxGuests?: number;
          images?: string[];
        };
      };

      if (!response.ok || !payload.listing) {
        throw new Error(payload.error || "Unable to import this Airbnb listing.");
      }

      const listing = payload.listing;
      onChange({
        workspaceType: data.workspaceType || "HOME_OFFICE",
        title: listing.title || data.title,
        description: listing.description || data.description,
        address: listing.address || data.address,
        city: listing.city || data.city,
        state: listing.state || data.state,
        country: listing.country || data.country,
        postalCode: listing.postalCode || data.postalCode,
        lat:
          typeof listing.lat === "number" && Number.isFinite(listing.lat)
            ? listing.lat
            : data.lat,
        lng:
          typeof listing.lng === "number" && Number.isFinite(listing.lng)
            ? listing.lng
            : data.lng,
        maxGuests:
          typeof listing.maxGuests === "number" && listing.maxGuests > 0
            ? Math.min(10, Math.round(listing.maxGuests))
            : data.maxGuests,
        images:
          Array.isArray(listing.images) && listing.images.length > 0
            ? listing.images.slice(0, 8).map((url, index) => ({
                url,
                alt: listing.title ? `${listing.title} photo ${index + 1}` : `Listing photo ${index + 1}`,
                order: index,
                isPrimary: index === 0,
              }))
            : data.images,
      });

      setImportMessage({
        tone: "success",
        text: "Airbnb listing metadata imported. Review every field before continuing.",
      });
    } catch (error) {
      setImportMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Airbnb import failed.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  useEffect(() => {
    const queryUrl = new URLSearchParams(window.location.search).get("airbnbUrl");
    if (!queryUrl) return;

    setAirbnbUrl(queryUrl);
    void importFromAirbnb(queryUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Airbnb Import Assistant</p>
        <p className="mt-1 text-xs text-slate-600">
          Paste an Airbnb listing URL to prefill title, description, location, and photos.
          Imported data is best-effort and should be verified.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="https://www.airbnb.com/rooms/..."
            value={airbnbUrl}
            onChange={(event) => setAirbnbUrl(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            onClick={() => void importFromAirbnb(airbnbUrl)}
          >
            {isImporting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Airbnb Data"
            )}
          </Button>
        </div>
        {importMessage ? (
          <p
            className={`mt-2 text-xs ${
              importMessage.tone === "success" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {importMessage.text}
          </p>
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold">What type of workspace is this?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose the type that best describes your space.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(WORKSPACE_TYPES).map(([key, type]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ workspaceType: key })}
            className={cn(
              "flex flex-col items-start p-4 rounded-lg border-2 text-left transition-colors",
              data.workspaceType === key
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <span className="text-2xl mb-2">{type.icon}</span>
            <span className="font-medium text-sm">{type.label}</span>
            <span className="text-xs text-gray-500 mt-1">
              {type.description}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g., Bright Creative Studio with Dual Monitors"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={100}
        />
        <p className="text-xs text-gray-500">{data.title.length}/100 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your workspace, what makes it great for getting work done, the neighborhood, and any special features..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={6}
          maxLength={5000}
        />
        <p className="text-xs text-gray-500">
          {data.description.length}/5000 characters (minimum 20)
        </p>
      </div>
    </div>
  );
}
