"use client";

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
  return (
    <div className="space-y-6">
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
