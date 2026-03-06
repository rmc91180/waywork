"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays, format, addDays } from "date-fns";
import { ShieldCheck, Wifi, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/stripe";
import { trackEvent } from "@/lib/analytics";

interface BookingSidebarProps {
  listingId: string;
  pricePerDay: number;
  cleaningFee: number;
  maxGuests: number;
  cancellationPolicy: string;
}

export function BookingSidebar({
  listingId,
  pricePerDay,
  cleaningFee,
  maxGuests,
  cancellationPolicy,
}: BookingSidebarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const tomorrow = addDays(new Date(), 1);
  const dayAfter = addDays(new Date(), 2);

  const [checkIn, setCheckIn] = useState(format(tomorrow, "yyyy-MM-dd"));
  const [checkOut, setCheckOut] = useState(format(dayAfter, "yyyy-MM-dd"));
  const [guests, setGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");

  const numberOfDays = useMemo(() => {
    const days = differenceInDays(new Date(checkOut), new Date(checkIn));
    return days > 0 ? days : 0;
  }, [checkIn, checkOut]);

  const pricing = useMemo(() => {
    if (numberOfDays === 0) return null;
    const subtotal = pricePerDay * numberOfDays;
    const grossBookingAmount = subtotal + cleaningFee;
    const serviceFee = Math.round(grossBookingAmount * 0.15);
    const total = grossBookingAmount;
    return { subtotal, cleaningFee, serviceFee, total };
  }, [numberOfDays, pricePerDay, cleaningFee]);

  const policyLabel =
    cancellationPolicy === "FLEXIBLE"
      ? "Free cancellation up to 24 hours before check-in"
      : cancellationPolicy === "MODERATE"
        ? "Free cancellation up to 5 days before check-in"
        : "50% refund up to 7 days before check-in";

  async function handleBooking() {
    if (numberOfDays === 0) {
      toast.error("Please select valid dates");
      return;
    }

    trackEvent({
      event: "checkout_started",
      properties: {
        listingId,
        checkIn,
        checkOut,
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
          checkIn,
          checkOut,
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
        trackEvent({
          event: "checkout_redirected_to_stripe",
          properties: { listingId },
        });
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
      <div className="bg-gradient-to-r from-[var(--ww-primary-blue)] via-[var(--ww-secondary-green)] to-[var(--ww-text-primary)] px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Reserve this workspace</p>
        <CardTitle className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{formatCurrency(pricePerDay)}</span>
          <span className="text-sm font-normal text-slate-200">/ day</span>
        </CardTitle>
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="space-y-1">
            <Label htmlFor="checkIn" className="text-[11px] uppercase text-slate-500">
              Check-in
            </Label>
            <Input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
              className="bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="checkOut" className="text-[11px] uppercase text-slate-500">
              Check-out
            </Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              min={checkIn}
              className="bg-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="guests" className="text-[11px] uppercase text-slate-500">
            Guests
          </Label>
          <select
            id="guests"
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-xs"
          >
            {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} guest{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="requests" className="text-[11px] uppercase text-slate-500">
            Special Requests
          </Label>
          <Textarea
            id="requests"
            placeholder="Quiet corner, early setup, accessibility needs..."
            value={specialRequests}
            onChange={(event) => setSpecialRequests(event.target.value)}
            rows={2}
          />
        </div>

        <Button
          className="w-full bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] hover:brightness-95"
          size="lg"
          onClick={handleBooking}
          disabled={loading || numberOfDays === 0}
        >
          {loading ? "Processing..." : "Reserve Workspace"}
        </Button>

        {pricing && (
          <div className="space-y-2 text-sm">
            <Separator />
            <div className="flex justify-between">
              <span className="text-slate-600">
                {formatCurrency(pricePerDay)} x {numberOfDays} day{numberOfDays > 1 ? "s" : ""}
              </span>
              <span>{formatCurrency(pricing.subtotal)}</span>
            </div>
            {pricing.cleaningFee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Cleaning fee</span>
                <span>{formatCurrency(pricing.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Way Work commission (15%)</span>
              <span>{formatCurrency(pricing.serviceFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(pricing.total)}</span>
            </div>
          </div>
        )}

        <div className="space-y-1 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900">
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
        </div>
      </CardContent>
    </Card>
  );
}
