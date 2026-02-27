"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ListingFormData } from "@/hooks/use-listing-form";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface StepAvailabilityProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
}

export function StepAvailability({ data, onChange }: StepAvailabilityProps) {
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [icalUrl, setIcalUrl] = useState("");

  const toggleDay = (dayOfWeek: number) => {
    const existing = data.availability.find((r) => r.dayOfWeek === dayOfWeek);
    if (existing) {
      onChange({
        availability: data.availability.map((r) =>
          r.dayOfWeek === dayOfWeek ? { ...r, available: !r.available } : r
        ),
      });
    } else {
      onChange({
        availability: [
          ...data.availability,
          { dayOfWeek, available: true },
        ],
      });
    }
  };

  const isDayAvailable = (dayOfWeek: number) => {
    const rule = data.availability.find((r) => r.dayOfWeek === dayOfWeek);
    return rule?.available ?? false;
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    const exists = data.blockedDates.some((d) => d.date === newBlockedDate);
    if (exists) return;

    onChange({
      blockedDates: [
        ...data.blockedDates,
        { date: newBlockedDate, source: "MANUAL" },
      ],
    });
    setNewBlockedDate("");
  };

  const removeBlockedDate = (date: string) => {
    onChange({
      blockedDates: data.blockedDates.filter((d) => d.date !== date),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Availability</h2>
        <p className="text-sm text-gray-500 mt-1">
          Set which days your space is available and block specific dates.
        </p>
      </div>

      {/* Weekly schedule */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Weekly Schedule
        </h3>
        <div className="space-y-2">
          {DAYS.map((day, index) => (
            <div
              key={day}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="text-sm font-medium">{day}</span>
              <Switch
                checked={isDayAvailable(index)}
                onCheckedChange={() => toggleDay(index)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Blocked dates */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Blocked Dates
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Block specific dates when your space is not available.
        </p>
        <div className="flex gap-2">
          <Input
            type="date"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addBlockedDate}>
            Block Date
          </Button>
        </div>

        {data.blockedDates.length > 0 && (
          <div className="mt-3 space-y-1">
            {data.blockedDates
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((bd) => (
                <div
                  key={bd.date}
                  className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm"
                >
                  <span className="text-red-700">
                    {new Date(bd.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBlockedDate(bd.date)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* iCal sync */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Calendar Sync (Optional)
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Import an iCal URL to automatically block dates from another calendar
          (e.g., Airbnb, Google Calendar).
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://calendar.google.com/calendar/ical/..."
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="outline" disabled>
            Sync
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          iCal sync will be available after creating your listing.
        </p>
      </div>
    </div>
  );
}
