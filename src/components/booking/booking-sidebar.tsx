"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/stripe";
import { differenceInDays, format, addDays } from "date-fns";

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

  // Default dates: tomorrow to day after
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
    const serviceFee = Math.round(subtotal * 0.12);
    const total = subtotal + cleaningFee + serviceFee;
    return { subtotal, cleaningFee, serviceFee, total };
  }, [numberOfDays, pricePerDay, cleaningFee]);

  async function handleBooking() {
    if (numberOfDays === 0) {
      toast.error("Please select valid dates");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings/checkout", {
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else if (data.bookingId) {
        // Demo mode — booking confirmed directly
        toast.success("Booking confirmed!");
        router.push(`/bookings/${data.bookingId}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create booking"
      );
    } finally {
      setLoading(false);
    }
  }

  const policyLabel =
    cancellationPolicy === "FLEXIBLE"
      ? "Free cancellation up to 24 hours before"
      : cancellationPolicy === "MODERATE"
        ? "Free cancellation up to 5 days before"
        : "50% refund up to 7 days before";

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {formatCurrency(pricePerDay)}
          </span>
          <span className="text-sm font-normal text-gray-500">/ day</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="checkIn" className="text-xs">
              CHECK-IN
            </Label>
            <Input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="checkOut" className="text-xs">
              CHECK-OUT
            </Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn}
            />
          </div>
        </div>

        {/* Guest Count */}
        <div className="space-y-1">
          <Label htmlFor="guests" className="text-xs">
            GUESTS
          </Label>
          <select
            id="guests"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} guest{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Special Requests */}
        <div className="space-y-1">
          <Label htmlFor="requests" className="text-xs">
            SPECIAL REQUESTS (OPTIONAL)
          </Label>
          <Textarea
            id="requests"
            placeholder="Any special needs or requests..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Book Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleBooking}
          disabled={loading || numberOfDays === 0}
        >
          {loading ? "Processing..." : "Book Now"}
        </Button>

        {/* Price Breakdown */}
        {pricing && (
          <div className="space-y-2 text-sm">
            <Separator />
            <div className="flex justify-between">
              <span className="text-gray-600">
                {formatCurrency(pricePerDay)} x {numberOfDays} day
                {numberOfDays > 1 ? "s" : ""}
              </span>
              <span>{formatCurrency(pricing.subtotal)}</span>
            </div>
            {pricing.cleaningFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cleaning fee</span>
                <span>{formatCurrency(pricing.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Service fee (12%)</span>
              <span>{formatCurrency(pricing.serviceFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(pricing.total)}</span>
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        <p className="text-xs text-gray-500 text-center">{policyLabel}</p>
      </CardContent>
    </Card>
  );
}
