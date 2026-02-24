"use client";

import { Badge } from "@/components/ui/badge";
import {
  BED_SIZE_OPTIONS,
  CANCELLATION_POLICIES,
  LEISURE_FEATURE_LABELS,
  WORKSPACE_TYPES,
} from "@/lib/constants";
import { computeWorkScore, getWorkScoreColor } from "@/lib/work-score";
import { cn } from "@/lib/utils";
import type { ListingFormData } from "@/hooks/use-listing-form";

interface StepReviewProps {
  data: ListingFormData;
}

export function StepReview({ data }: StepReviewProps) {
  const wsType =
    WORKSPACE_TYPES[data.workspaceType as keyof typeof WORKSPACE_TYPES];
  const cancelPolicy =
    CANCELLATION_POLICIES[
      data.cancellationPolicy as keyof typeof CANCELLATION_POLICIES
    ];
  const bedSize = BED_SIZE_OPTIONS[data.bedSize as keyof typeof BED_SIZE_OPTIONS];

  const workScore = computeWorkScore({
    amenities: data.amenities,
    connectivity: data.connectivity,
  });

  const issues: string[] = [];
  if (!data.title || data.title.length < 5) issues.push("Title is too short");
  if (!data.description || data.description.length < 20)
    issues.push("Description is too short");
  if (!data.address) issues.push("Address is missing");
  if (!data.city) issues.push("City is missing");
  if (!data.country) issues.push("Country is missing");
  if (data.lat === 0 && data.lng === 0)
    issues.push("Location coordinates are missing");
  if (data.pricePerDay < 100) issues.push("Price must be at least $1.00");
  if (data.amenities.length === 0) issues.push("No amenities selected");
  if (data.images.length === 0) issues.push("No photos uploaded");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review Your Listing</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review all details before publishing. You can go back to any step to
          make changes.
        </p>
      </div>

      {issues.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-800">
            Please fix the following before publishing:
          </p>
          <ul className="mt-2 space-y-1">
            {issues.map((issue) => (
              <li key={issue} className="text-sm text-red-600">
                - {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Work Score */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Work Score</p>
            <p
              className={cn(
                "text-3xl font-bold",
                getWorkScoreColor(workScore.total)
              )}
            >
              {workScore.total}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <div>Connectivity: {workScore.connectivity}/30</div>
            <div>Desk Setup: {workScore.deskSetup}/20</div>
            <div>Meeting: {workScore.meetingSpace}/15</div>
            <div>Quiet: {workScore.quietEnvironment}/15</div>
            <div>Ergonomics: {workScore.ergonomics}/10</div>
            <div>AV: {workScore.avReadiness}/10</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Basics */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500">Basics</h3>
          <p className="font-medium">{data.title || "Untitled"}</p>
          <Badge variant="outline">{wsType?.label || data.workspaceType}</Badge>
          <p className="text-xs text-gray-500 line-clamp-3">
            {data.description || "No description"}
          </p>
        </div>

        {/* Location */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500">Location</h3>
          <p className="text-sm">{data.address || "No address"}</p>
          <p className="text-sm text-gray-600">
            {[data.city, data.state, data.country]
              .filter(Boolean)
              .join(", ") || "No location"}
          </p>
        </div>

        {/* Pricing */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500">Pricing</h3>
          <p className="text-lg font-bold">
            ${(data.pricePerDay / 100).toFixed(2)}/day
          </p>
          {data.cleaningFee > 0 && (
            <p className="text-xs text-gray-500">
              + ${(data.cleaningFee / 100).toFixed(2)} cleaning fee
            </p>
          )}
          <p className="text-xs text-gray-500">
            Up to {data.maxGuests} guest{data.maxGuests > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-500">
            {data.bedroomCount} bedroom{data.bedroomCount > 1 ? "s" : ""} ·{" "}
            {bedSize?.label || data.bedSize} · {data.propertySizeSqm || "N/A"} sqm
          </p>
          <Badge variant="outline">
            {cancelPolicy?.label || data.cancellationPolicy}
          </Badge>
        </div>

        {/* Connectivity */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500">Connectivity</h3>
          <p className="text-sm">
            {data.connectivity.declaredDownloadMbps} Mbps down /{" "}
            {data.connectivity.declaredUploadMbps} Mbps up
          </p>
          <Badge variant="outline">
            {data.connectivity.networkType === "BOTH"
              ? "WiFi + Wired"
              : data.connectivity.networkType}
          </Badge>
          {data.connectivity.hasBackupConnection && (
            <p className="text-xs text-green-600">Has backup connection</p>
          )}
        </div>
      </div>

      {/* Offsite features */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Offsite Comfort</h3>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LEISURE_FEATURE_LABELS) as Array<keyof typeof LEISURE_FEATURE_LABELS>).map((field) => (
            <Badge
              key={field}
              variant={data[field] ? "default" : "outline"}
              className={data[field] ? "bg-rose-600 text-white" : ""}
            >
              {LEISURE_FEATURE_LABELS[field]}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {data.activities.length} suggested activity
          {data.activities.length !== 1 ? "ies" : "y"} added
        </p>
      </div>

      {/* Amenities */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">
          Amenities ({data.amenities.length})
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {data.amenities.map((a, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {a.name}
              {a.quantity > 1 && ` (x${a.quantity})`}
            </Badge>
          ))}
          {data.amenities.length === 0 && (
            <p className="text-xs text-gray-400">No amenities selected</p>
          )}
        </div>
      </div>

      {/* Photos */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">
          Photos ({data.images.length})
        </h3>
        {data.images.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto">
            {data.images.map((img, i) => (
              <div
                key={i}
                className="h-20 w-28 flex-shrink-0 rounded-md bg-gray-100 border overflow-hidden"
              >
                {img.url.startsWith("http") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.alt || `Photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                    Photo {i + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No photos uploaded</p>
        )}
      </div>

      {/* Availability */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">
          Availability
        </h3>
        <div className="flex gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day, index) => {
              const rule = data.availability.find(
                (r) => r.dayOfWeek === index
              );
              const available = rule?.available ?? false;
              return (
                <div
                  key={day}
                  className={cn(
                    "flex-1 text-center py-1.5 rounded text-xs font-medium",
                    available
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {day}
                </div>
              );
            }
          )}
        </div>
        {data.blockedDates.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {data.blockedDates.length} blocked date
            {data.blockedDates.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {issues.length === 0 && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-800">
            Your listing is ready to submit for review!
          </p>
          <p className="text-xs text-green-600 mt-1">
            You can save as a draft to continue editing later, or submit for
            review to go live.
          </p>
        </div>
      )}
    </div>
  );
}
