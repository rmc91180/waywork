"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CANCELLATION_POLICIES } from "@/lib/constants";
import { calculateBookingPricingFromGross } from "@/lib/payout-config";
import { cn } from "@/lib/utils";
import type { ListingFormData } from "@/hooks/use-listing-form";

interface StepPricingProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
  bookingCommissionBps: number;
}

export function StepPricing({ data, onChange, bookingCommissionBps }: StepPricingProps) {
  const pricing = calculateBookingPricingFromGross(
    data.pricePerDay + data.cleaningFee,
    bookingCommissionBps
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Capacity and Pricing</h2>
        <p className="text-sm text-gray-500 mt-1">
          Set how many guests can work in your space and your daily rate.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="maxGuests">Maximum Guests</Label>
          <Input
            id="maxGuests"
            type="number"
            min={1}
            max={10}
            value={data.maxGuests}
            onChange={(e) =>
              onChange({ maxGuests: parseInt(e.target.value) || 1 })
            }
          />
          <p className="text-xs text-gray-500">
            How many people can comfortably work at the same time (1-10)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pricePerDay">Price per Day ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="pricePerDay"
                type="number"
                min={1}
                step={1}
                className="pl-7"
                value={data.pricePerDay / 100}
                onChange={(e) =>
                  onChange({
                    pricePerDay: Math.round(
                      (parseFloat(e.target.value) || 0) * 100
                    ),
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cleaningFee">Cleaning Fee ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="cleaningFee"
                type="number"
                min={0}
                step={1}
                className="pl-7"
                value={data.cleaningFee / 100}
                onChange={(e) =>
                  onChange({
                    cleaningFee: Math.round(
                      (parseFloat(e.target.value) || 0) * 100
                    ),
                  })
                }
              />
            </div>
            <p className="text-xs text-gray-500">Optional one-time fee</p>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium">Pricing Summary</p>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Daily rate</span>
              <span>${(data.pricePerDay / 100).toFixed(2)}</span>
            </div>
            {data.cleaningFee > 0 && (
              <div className="flex justify-between">
                <span>Cleaning fee</span>
                <span>${(data.cleaningFee / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-400">
              <span>Way Work commission ({pricing.commissionPercent.toFixed(2)}%)</span>
              <span>
                ${(pricing.serviceFee / 100).toFixed(2)} / 1-day booking
              </span>
            </div>
            <div className="border-t pt-1 flex justify-between font-medium text-gray-900">
              <span>Guest total (1 day)</span>
              <span>
                $
                {(
                  (data.pricePerDay +
                    data.cleaningFee) /
                  100
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Estimated host payout</span>
              <span>
                ${(pricing.hostPayout / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Cancellation Policy</h3>
        <div className="space-y-2">
          {Object.entries(CANCELLATION_POLICIES).map(([key, policy]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ cancellationPolicy: key })}
              className={cn(
                "w-full flex items-start p-3 rounded-lg border-2 text-left transition-colors",
                data.cancellationPolicy === key
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div>
                <span className="font-medium text-sm">{policy.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {policy.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
