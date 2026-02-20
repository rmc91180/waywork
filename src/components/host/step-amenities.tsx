"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AMENITY_CATEGORIES, SUGGESTED_AMENITIES } from "@/lib/constants";
import type { ListingFormData } from "@/hooks/use-listing-form";
import type { z } from "zod";
import type { listingAmenitySchema } from "@/lib/validators";

type Amenity = z.infer<typeof listingAmenitySchema>;

interface StepAmenitiesProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
}

export function StepAmenities({ data, onChange }: StepAmenitiesProps) {
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("OTHER");

  const toggleAmenity = (category: string, name: string) => {
    const exists = data.amenities.some(
      (a) => a.category === category && a.name === name
    );

    if (exists) {
      onChange({
        amenities: data.amenities.filter(
          (a) => !(a.category === category && a.name === name)
        ),
      });
    } else {
      onChange({
        amenities: [
          ...data.amenities,
          { category: category as Amenity["category"], name, quantity: 1 },
        ],
      });
    }
  };

  const updateQuantity = (category: string, name: string, quantity: number) => {
    onChange({
      amenities: data.amenities.map((a) =>
        a.category === category && a.name === name
          ? { ...a, quantity: Math.max(1, quantity) }
          : a
      ),
    });
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    onChange({
      amenities: [
        ...data.amenities,
        {
          category: customCategory as Amenity["category"],
          name: customName.trim(),
          quantity: 1,
        },
      ],
    });
    setCustomName("");
  };

  const isChecked = (category: string, name: string) =>
    data.amenities.some((a) => a.category === category && a.name === name);

  // Group suggested amenities by category
  const grouped = Object.entries(AMENITY_CATEGORIES).map(([catKey, catMeta]) => ({
    key: catKey,
    ...catMeta,
    amenities: SUGGESTED_AMENITIES.filter((a) => a.category === catKey),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">What amenities do you offer?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select the work amenities available in your space. These directly
          affect your Work Score.
        </p>
      </div>

      <div className="space-y-6">
        {grouped
          .filter((g) => g.amenities.length > 0)
          .map((group) => (
            <div key={group.key}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.amenities.map((amenity) => {
                  const checked = isChecked(amenity.category, amenity.name);
                  return (
                    <div
                      key={`${amenity.category}-${amenity.name}`}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            toggleAmenity(amenity.category, amenity.name)
                          }
                        />
                        <span className="text-sm">{amenity.name}</span>
                      </div>
                      {checked && (
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          className="w-16 h-7 text-sm"
                          value={
                            data.amenities.find(
                              (a) =>
                                a.category === amenity.category &&
                                a.name === amenity.name
                            )?.quantity || 1
                          }
                          onChange={(e) =>
                            updateQuantity(
                              amenity.category,
                              amenity.name,
                              parseInt(e.target.value) || 1
                            )
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* Custom amenity */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Add Custom Amenity
        </h3>
        <div className="flex gap-2">
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          >
            {Object.entries(AMENITY_CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>
                {cat.label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Amenity name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustom}>
            Add
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium">
          {data.amenities.length} amenities selected
        </p>
      </div>
    </div>
  );
}
