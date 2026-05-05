"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

interface BookingPaymentButtonProps {
  bookingId: string;
  listingId: string;
}

export function BookingPaymentButton({ bookingId, listingId }: BookingPaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    setLoading(true);
    trackEvent({
      event: "checkout_started",
      properties: {
        bookingId,
        listingId,
        source: "booking_payment_page",
      },
    });

    try {
      const response = await fetch(`/api/bookings/${bookingId}/checkout`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        error?: string;
        checkoutUrl?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to start payment");
      }

      if (data.checkoutUrl) {
        trackEvent({
          event: "checkout_redirected_to_stripe",
          properties: {
            bookingId,
            listingId,
            source: "booking_payment_page",
          },
        });
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        return;
      }

      throw new Error("Payment session did not return a redirect");
    } catch (error) {
      trackEvent({
        event: "checkout_failed",
        properties: {
          bookingId,
          listingId,
          source: "booking_payment_page",
          error: error instanceof Error ? error.message : "unknown",
        },
      });
      toast.error(error instanceof Error ? error.message : "Failed to start payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      className="w-full bg-[var(--ww-terra)] text-[var(--ww-ink)] hover:brightness-95"
      onClick={handlePayment}
      disabled={loading}
    >
      {loading ? "Starting secure checkout..." : "Pay with Stripe"}
    </Button>
  );
}
