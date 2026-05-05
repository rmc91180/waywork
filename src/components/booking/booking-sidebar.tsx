"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays, format, addDays, isBefore, startOfDay, isAfter } from "date-fns";
import { ShieldCheck, Wifi, Clock3, CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/stripe";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface BookingSidebarProps {
  listingId: string;
  pricePerDay: number;
  cleaningFee: number;
  maxGuests: number;
  cancellationPolicy: string;
  currency?: string;
  /** ISO date strings (YYYY-MM-DD) that are already blocked */
  blockedDates?: string[];
}

export function BookingSidebar({
  listingId,
  pricePerDay,
  cleaningFee,
  maxGuests,
  cancellationPolicy,
  currency = "USD",
  blockedDates = [],
}: BookingSidebarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [guests, setGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const today = startOfDay(new Date());

  // Convert blocked date strings to Date objects for react-day-picker
  const disabledDays = useMemo(() => {
    const blocked = blockedDates.map((d) => {
      const [year, month, day] = d.split("-").map(Number);
      return new Date(year, month - 1, day);
    });
    return [
      { before: addDays(today, 1) },
      ...blocked,
    ];
  }, [blockedDates, today]);

  const checkIn = range?.from;
  const checkOut = range?.to;

  const numberOfDays = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const days = differenceInDays(checkOut, checkIn);
    return days > 0 ? days : 0;
  }, [checkIn, checkOut]);

  const pricing = useMemo(() => {
    if (numberOfDays === 0) return null;
    const subtotal = pricePerDay * numberOfDays;
    const total = subtotal + cleaningFee;
    return { subtotal, cleaningFee, total };
  }, [numberOfDays, pricePerDay, cleaningFee]);

  const policyLabel =
    cancellationPolicy === "FLEXIBLE"
      ? "Free cancellation up to 24 hours before check-in"
      : cancellationPolicy === "MODERATE"
        ? "Free cancellation up to 5 days before check-in"
        : "50% refund up to 7 days before check-in";

  const fmt = (amount: number) => formatCurrency(amount, currency);

  function formatDateRange() {
    if (!checkIn && !checkOut) return "Select dates";
    if (checkIn && !checkOut) return `${format(checkIn, "MMM d")} — pick checkout`;
    if (checkIn && checkOut)
      return `${format(checkIn, "MMM d")} – ${format(checkOut, "MMM d, yyyy")}`;
    return "Select dates";
  }

  function handleRangeSelect(newRange: DateRange | undefined) {
    if (!newRange?.from || !newRange?.to) {
      setRange(newRange);
      return;
    }
    const blockedInRange = blockedDates.some((d) => {
      const [year, month, day] = d.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return (
        (isAfter(date, newRange.from!) || date.getTime() === newRange.from!.getTime()) &&
        (isBefore(date, newRange.to!) || date.getTime() === newRange.to!.getTime())
      );
    });

    if (blockedInRange) {
      toast.error("Your selected range includes unavailable dates. Please choose different dates.");
      setRange({ from: newRange.from, to: undefined });
      return;
    }
    setRange(newRange);
    if (newRange.from && newRange.to) {
      setTimeout(() => setCalendarOpen(false), 300);
    }
  }

  async function handleBooking() {
    if (!checkIn || !checkOut || numberOfDays === 0) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    trackEvent({
      event: "checkout_started",
      properties: {
        listingId,
        checkIn: format(checkIn, "yyyy-MM-dd"),
        checkOut: format(checkOut, "yyyy-MM-dd"),
        guests,
        nights: numberOfDays,
      },
    });

    setLoading(true);
    try {
      const response = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          checkIn: format(checkIn, "yyyy-MM-dd"),
          checkOut: format(checkOut, "yyyy-MM-dd"),
          numberOfGuests: guests,
          specialRequests: specialRequests || undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        checkoutUrl?: string;
        bookingId?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      if (data.checkoutUrl) {
        trackEvent({ event: "checkout_redirected_to_stripe", properties: { listingId } });
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.bookingId) {
        trackEvent({
          event: "booking_confirmed_direct",
          properties: { listingId, bookingId: data.bookingId },
        });
        toast.success("Booking confirmed!");
        router.push(`/bookings/${data.bookingId}`);
      }
    } catch (error) {
      trackEvent({
        event: "checkout_failed",
        properties: {
          listingId,
          error: error instanceof Error ? error.message : "unknown",
        },
      });
      toast.error(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="sticky top-24 overflow-hidden border-slate-200 py-0 shadow-lg">
      <div className="bg-gradient-to-r from-[var(--ww-ink)] via-[#1a3a52] to-[var(--ww-ink)] px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Book this stay</p>
        <CardTitle className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{fmt(pricePerDay)}</span>
          <span className="text-sm font-normal text-slate-200">/ day</span>
        </CardTitle>
      </div>

      <CardContent className="space-y-4 p-5">

        {/* Date range picker */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-slate-500">Dates</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--ww-gold)]/25",
                  !checkIn && !checkOut ? "border-slate-200 text-slate-400" : "border-slate-300 text-slate-900"
                )}
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-slate-400 shrink-0" />
                  {formatDateRange()}
                </span>
                <ChevronDown
                  className={cn("size-4 text-slate-400 transition-transform", calendarOpen && "rotate-180")}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-xl" align="start" sideOffset={8}>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                  {!checkIn ? "Choose check-in date" : !checkOut ? "Choose check-out date" : "Your stay"}
                </p>
                {checkIn && checkOut && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {numberOfDays} night{numberOfDays !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
              <Calendar
                mode="range"
                selected={range}
                onSelect={handleRangeSelect}
                disabled={disabledDays}
                numberOfMonths={2}
                defaultMonth={addDays(today, 1)}
                className="p-3"
                classNames={{
                  disabled: "text-slate-300 line-through opacity-60 cursor-not-allowed",
                }}
              />
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  className="text-xs text-slate-500 underline hover:text-slate-700"
                  onClick={() => setRange(undefined)}
                >
                  Clear dates
                </button>
                <Button
                  size="sm"
                  disabled={!checkIn || !checkOut}
                  onClick={() => setCalendarOpen(false)}
                  className="bg-[var(--ww-ink)] text-white hover:bg-[#1a3a52]"
                >
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {checkIn && checkOut && (
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-0.5">In: {format(checkIn, "EEE, MMM d")}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5">Out: {format(checkOut, "EEE, MMM d")}</span>
            </div>
          )}
        </div>

        {/* Guests */}
        <div className="space-y-1.5">
          <Label htmlFor="guests" className="text-[11px] uppercase tracking-wide text-slate-500">Guests</Label>
          <select
            id="guests"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--ww-gold)]/25"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} guest{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Special requests */}
        <div className="space-y-1.5">
          <Label htmlFor="requests" className="text-[11px] uppercase tracking-wide text-slate-500">
            Special Requests <span className="font-normal normal-case text-slate-400">(optional)</span>
          </Label>
          <Textarea
            id="requests"
            placeholder="Quiet corner, early setup, accessibility needs..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        {/* CTA */}
        <Button
          className="w-full bg-[var(--ww-terra)] text-white font-semibold hover:brightness-95 disabled:opacity-60"
          size="lg"
          onClick={handleBooking}
          disabled={loading || numberOfDays === 0}
        >
          {loading
            ? "Processing..."
            : numberOfDays > 0
              ? `Reserve ${numberOfDays} night${numberOfDays !== 1 ? "s" : ""}`
              : "Select dates to reserve"}
        </Button>

        {/* Pricing breakdown */}
        {pricing && (
          <div className="space-y-2 text-sm">
            <Separator />
            <div className="flex justify-between">
              <span className="text-slate-600">
                {fmt(pricePerDay)} × {numberOfDays} night{numberOfDays > 1 ? "s" : ""}
              </span>
              <span className="font-medium">{fmt(pricing.subtotal)}</span>
            </div>
            {pricing.cleaningFee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Cleaning fee</span>
                <span className="font-medium">{fmt(pricing.cleaningFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total before taxes</span>
              <span>{fmt(pricing.total)}</span>
            </div>
          </div>
        )}

        {/* Trust signals */}
        <div className="space-y-1.5 rounded-xl p-3.5 text-xs" style={{ background: "var(--ww-celadon-light)", border: "1px solid rgba(45,106,79,0.2)", color: "var(--ww-celadon)" }}>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {policyLabel}
          </p>
          <p className="flex items-start gap-2">
            <Wifi className="mt-0.5 size-3.5 shrink-0" />
            Verified listings include tested internet and work amenities.
          </p>
          <p className="flex items-start gap-2">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" />
            Most hosts respond to booking questions within a few hours.
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            No extra guest booking fee added at checkout.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
