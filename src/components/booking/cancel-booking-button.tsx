"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

interface CancelBookingButtonProps {
  bookingId: string;
  cancellationPolicy: string;
  checkIn: string;
}

export function CancelBookingButton({
  bookingId,
  cancellationPolicy,
  checkIn,
}: CancelBookingButtonProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const daysUntilCheckIn = differenceInDays(
    new Date(checkIn),
    new Date()
  );

  let refundMessage = "";
  if (cancellationPolicy === "FLEXIBLE") {
    refundMessage =
      daysUntilCheckIn >= 1
        ? "You will receive a full refund."
        : "No refund — less than 24 hours before check-in.";
  } else if (cancellationPolicy === "MODERATE") {
    refundMessage =
      daysUntilCheckIn >= 5
        ? "You will receive a full refund."
        : daysUntilCheckIn >= 1
          ? "You will receive a 50% refund."
          : "No refund — less than 24 hours before check-in.";
  } else {
    refundMessage =
      daysUntilCheckIn >= 7
        ? "You will receive a 50% refund."
        : "No refund — less than 7 days before check-in.";
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }

      toast.success("Booking cancelled");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel booking"
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Cancel Booking
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This booking has a <strong>{cancellationPolicy.toLowerCase()}</strong>{" "}
              cancellation policy.
            </p>
            <p className="font-medium">{refundMessage}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={cancelling}
            className="bg-red-600 hover:bg-red-700"
          >
            {cancelling ? "Cancelling..." : "Yes, Cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
