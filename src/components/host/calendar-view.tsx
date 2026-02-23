"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  getDay,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { addBlockedDates, removeBlockedDate } from "@/actions/listing";

interface CalendarViewProps {
  listings: {
    id: string;
    title: string;
    slug: string;
    status: string;
  }[];
  blockedDates: {
    id: string;
    listingId: string;
    date: string;
    source: string;
  }[];
  bookings: {
    id: string;
    listingId: string;
    checkIn: string;
    checkOut: string;
    status: string;
    numberOfGuests: number;
    guest: { name: string | null; email: string };
  }[];
}

export function CalendarView({
  listings,
  blockedDates,
  bookings,
}: CalendarViewProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState(listings[0]?.id || "");
  const [toggling, setToggling] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with weekday grid
  const startPadding = getDay(monthStart);

  // Filter data for selected listing
  const listingBlocked = useMemo(
    () =>
      blockedDates
        .filter((bd) => bd.listingId === selectedListing)
        .map((bd) => ({ ...bd, dateObj: parseISO(bd.date) })),
    [blockedDates, selectedListing]
  );

  const listingBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.listingId === selectedListing)
        .map((b) => ({
          ...b,
          checkInDate: parseISO(b.checkIn),
          checkOutDate: parseISO(b.checkOut),
        })),
    [bookings, selectedListing]
  );

  function getDayStatus(day: Date) {
    // Check bookings first
    for (const booking of listingBookings) {
      if (
        isWithinInterval(day, {
          start: booking.checkInDate,
          end: booking.checkOutDate,
        }) &&
        !isSameDay(day, booking.checkOutDate)
      ) {
        return {
          type: booking.status === "PENDING" ? "pending" : "booked",
          booking,
        };
      }
    }

    // Check blocked dates
    const blocked = listingBlocked.find((bd) => isSameDay(bd.dateObj, day));
    if (blocked) {
      return { type: "blocked" as const, source: blocked.source, id: blocked.id };
    }

    return { type: "available" as const };
  }

  async function toggleBlockDate(day: Date) {
    if (!selectedListing) return;
    setToggling(true);

    const dateStr = format(day, "yyyy-MM-dd");
    const status = getDayStatus(day);

    try {
      if (status.type === "blocked" && "source" in status && status.source === "MANUAL") {
        await removeBlockedDate(selectedListing, dateStr);
        toast.success(`Unblocked ${format(day, "MMM d")}`);
      } else if (status.type === "available") {
        await addBlockedDates(selectedListing, [
          { date: dateStr, source: "MANUAL" },
        ]);
        toast.success(`Blocked ${format(day, "MMM d")}`);
      } else {
        toast.error("Cannot modify booked or iCal-synced dates");
        setToggling(false);
        return;
      }
      router.refresh();
    } catch (error) {
      toast.error("Failed to update date");
    } finally {
      setToggling(false);
    }
  }

  const selectedListingInfo = listings.find((l) => l.id === selectedListing);

  // Upcoming bookings for sidebar
  const upcomingBookings = listingBookings
    .filter((b) => b.checkInDate >= new Date())
    .sort((a, b) => a.checkInDate.getTime() - b.checkInDate.getTime())
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              {/* Listing selector */}
              <select
                value={selectedListing}
                onChange={(e) => setSelectedListing(e.target.value)}
                className="text-sm border rounded-md px-3 py-1.5 bg-white"
              >
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>

              {/* Month navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  ←
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-gray-500 py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding for start of month */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

              {days.map((day) => {
                const status = getDayStatus(day);
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date() && !isToday;

                let bgColor = "bg-white hover:bg-gray-50";
                let textColor = "text-gray-900";
                let cursor = "cursor-pointer";

                if (status.type === "booked") {
                  bgColor = "bg-blue-100 hover:bg-blue-200";
                  textColor = "text-blue-800";
                  cursor = "cursor-default";
                } else if (status.type === "pending") {
                  bgColor = "bg-yellow-100 hover:bg-yellow-200";
                  textColor = "text-yellow-800";
                  cursor = "cursor-default";
                } else if (status.type === "blocked") {
                  bgColor = "bg-red-100 hover:bg-red-200";
                  textColor = "text-red-700";
                }

                if (isPast) {
                  textColor = "text-gray-400";
                  bgColor = status.type === "available" ? "bg-gray-50" : bgColor;
                  cursor = "cursor-default";
                }

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !isPast && toggleBlockDate(day)}
                    disabled={toggling || isPast}
                    className={`aspect-square rounded-lg border text-sm font-medium flex flex-col items-center justify-center transition-colors ${bgColor} ${textColor} ${cursor} ${
                      isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""
                    }`}
                    title={
                      status.type === "booked" && "booking" in status
                        ? `Booked: ${status.booking.guest.name || status.booking.guest.email}`
                        : status.type === "blocked"
                          ? `Blocked (${status.source || "manual"})`
                          : status.type === "pending" && "booking" in status
                            ? `Pending: ${status.booking.guest.name || status.booking.guest.email}`
                            : "Click to block/unblock"
                    }
                  >
                    {format(day, "d")}
                    {status.type === "booked" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5" />
                    )}
                    {status.type === "pending" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-0.5" />
                    )}
                    {status.type === "blocked" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Click on an available date to block it. Click a manually blocked
              date to unblock it.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Upcoming Bookings */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Upcoming Bookings
              {selectedListingInfo && (
                <span className="text-sm font-normal text-gray-500 block mt-1">
                  {selectedListingInfo.title}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No upcoming bookings
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 border rounded-lg text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {booking.guest.name || booking.guest.email}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          booking.status === "CONFIRMED"
                            ? "text-green-700 border-green-300"
                            : "text-yellow-700 border-yellow-300"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                    <p className="text-gray-500">
                      {format(booking.checkInDate, "MMM d")} —{" "}
                      {format(booking.checkOutDate, "MMM d, yyyy")}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {booking.numberOfGuests} guest
                      {booking.numberOfGuests > 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Booked dates</span>
              <span className="font-medium">
                {listingBlocked.filter((bd) => bd.source === "BOOKING").length +
                  listingBookings.reduce((sum, b) => {
                    const days = Math.max(
                      1,
                      Math.ceil(
                        (b.checkOutDate.getTime() - b.checkInDate.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    );
                    return sum + days;
                  }, 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Manually blocked</span>
              <span className="font-medium">
                {listingBlocked.filter((bd) => bd.source === "MANUAL").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">iCal blocked</span>
              <span className="font-medium">
                {listingBlocked.filter((bd) => bd.source === "ICAL").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
