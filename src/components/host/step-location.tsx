"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ListingFormData } from "@/hooks/use-listing-form";

interface StepLocationProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
}

export function StepLocation({ data, onChange }: StepLocationProps) {
  const [geocoding, setGeocoding] = useState(false);

  const autofillCoordinates = async () => {
    const query = [data.address, data.city, data.state, data.country]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");

    if (!query) {
      toast.error("Enter at least an address, city, and country first.");
      return;
    }

    setGeocoding(true);
    try {
      const response = await fetch(`/api/location/geocode?query=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as {
        lat?: number;
        lng?: number;
        error?: string;
      };

      if (!response.ok || !Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
        throw new Error(payload.error || "Unable to geocode this address.");
      }

      onChange({ lat: payload.lat, lng: payload.lng });
      toast.success("Coordinates autofilled from address.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to geocode address.");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Where is your workspace?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter the address of your workspace. This will be shown on the map.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            placeholder="123 Main Street"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="San Francisco"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State / Province</Label>
            <Input
              id="state"
              placeholder="CA"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="US"
              value={data.country}
              onChange={(e) => onChange({ country: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="94107"
              value={data.postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="0.0001"
              placeholder="37.7749"
              value={data.lat || ""}
              onChange={(e) =>
                onChange({ lat: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="0.0001"
              placeholder="-122.4194"
              value={data.lng || ""}
              onChange={(e) =>
                onChange({ lng: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Tip: You can find coordinates by searching your address on Google Maps
          and right-clicking the pin.
        </p>

        <Button type="button" variant="outline" onClick={autofillCoordinates} disabled={geocoding}>
          {geocoding ? "Autofilling..." : "Autofill Coordinates"}
        </Button>
      </div>
    </div>
  );
}
