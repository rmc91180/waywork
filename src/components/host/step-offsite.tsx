"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEISURE_FEATURE_LABELS } from "@/lib/constants";
import type { ListingFormData } from "@/hooks/use-listing-form";

interface StepOffsiteProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
}

const bedOptions: Array<{ value: ListingFormData["bedSize"]; label: string }> = [
  { value: "TWIN", label: "Twin" },
  { value: "DOUBLE", label: "Double" },
  { value: "QUEEN", label: "Queen" },
  { value: "KING", label: "King" },
];

export function StepOffsite({ data, onChange }: StepOffsiteProps) {
  const updateActivity = (
    index: number,
    patch: Partial<ListingFormData["activities"][number]>
  ) => {
    const next = data.activities.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    );
    onChange({ activities: next });
  };

  const addActivity = () => {
    onChange({
      activities: [
        ...data.activities,
        {
          title: "",
          category: "Experience",
          description: "",
          durationMinutes: 60,
          distanceKm: 2,
          indoor: false,
        },
      ],
    });
  };

  const removeActivity = (index: number) => {
    onChange({
      activities: data.activities.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Offsite Comfort and Activities</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add stay details and local experiences that make your listing stand out beyond work.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700">Stay Profile</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bedroomCount">Bedrooms</Label>
            <Input
              id="bedroomCount"
              type="number"
              min={1}
              max={12}
              value={data.bedroomCount}
              onChange={(event) =>
                onChange({ bedroomCount: Number.parseInt(event.target.value || "1", 10) || 1 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bedSize">Primary Bed Size</Label>
            <select
              id="bedSize"
              className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              value={data.bedSize}
              onChange={(event) =>
                onChange({ bedSize: event.target.value as ListingFormData["bedSize"] })
              }
            >
              {bedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertySizeSqm">Property Size (sqm)</Label>
            <Input
              id="propertySizeSqm"
              type="number"
              min={10}
              max={5000}
              value={data.propertySizeSqm}
              onChange={(event) =>
                onChange({
                  propertySizeSqm: Number.parseInt(event.target.value || "0", 10) || 0,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700">Leisure Features</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            Object.keys(LEISURE_FEATURE_LABELS) as Array<keyof typeof LEISURE_FEATURE_LABELS>
          ).map((field) => (
            <label
              key={field}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{LEISURE_FEATURE_LABELS[field]}</span>
              <Checkbox
                checked={data[field]}
                onCheckedChange={(checked) => onChange({ [field]: Boolean(checked) })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Suggested Activities</h3>
          <Button type="button" size="sm" variant="outline" onClick={addActivity}>
            <Plus className="mr-1.5 size-3.5" />
            Add Activity
          </Button>
        </div>

        {data.activities.length === 0 ? (
          <p className="text-sm text-gray-500">
            Add 2-4 local activities to help guests plan time off after work.
          </p>
        ) : (
          <div className="space-y-3">
            {data.activities.map((activity, index) => (
              <div key={`${activity.title}-${index}`} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Activity {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => removeActivity(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={activity.title}
                      onChange={(event) => updateActivity(index, { title: event.target.value })}
                      placeholder="Sunset rooftop dinner"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Input
                      value={activity.category}
                      onChange={(event) => updateActivity(index, { category: event.target.value })}
                      placeholder="Food"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Distance (km)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      value={activity.distanceKm ?? ""}
                      onChange={(event) =>
                        updateActivity(index, {
                          distanceKm: Number.parseFloat(event.target.value || "0") || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={600}
                      value={activity.durationMinutes ?? ""}
                      onChange={(event) =>
                        updateActivity(index, {
                          durationMinutes:
                            Number.parseInt(event.target.value || "0", 10) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={activity.description || ""}
                      onChange={(event) =>
                        updateActivity(index, { description: event.target.value })
                      }
                      placeholder="A great post-work experience nearby."
                    />
                  </div>
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={activity.indoor}
                    onCheckedChange={(checked) =>
                      updateActivity(index, { indoor: Boolean(checked) })
                    }
                  />
                  Indoor activity
                </label>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
