"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  submitListingForReview,
  pauseListing,
  unpauseListing,
} from "@/actions/listing";
import { toast } from "sonner";

interface HostListingActionsProps {
  listingId: string;
  status: string;
}

export function HostListingActions({
  listingId,
  status,
}: HostListingActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAction = (action: () => Promise<void>, successMsg: string) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMsg);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Action failed"
        );
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/host/listings/${listingId}`}>Edit</Link>
      </Button>

      {status === "DRAFT" && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            handleAction(
              () => submitListingForReview(listingId),
              "Submitted for review!"
            )
          }
        >
          {isPending ? "Submitting..." : "Submit for Review"}
        </Button>
      )}

      {status === "ACTIVE" && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            handleAction(
              () => pauseListing(listingId),
              "Listing paused"
            )
          }
        >
          {isPending ? "Pausing..." : "Pause"}
        </Button>
      )}

      {status === "PAUSED" && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            handleAction(
              () => unpauseListing(listingId),
              "Listing reactivated!"
            )
          }
        >
          {isPending ? "Activating..." : "Reactivate"}
        </Button>
      )}

      {status === "REJECTED" && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/host/listings/${listingId}`}>
            Edit & Resubmit
          </Link>
        </Button>
      )}
    </div>
  );
}
