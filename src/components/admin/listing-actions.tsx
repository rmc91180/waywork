"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AdminListingActionsProps {
  listingId: string;
}

export function AdminListingActions({ listingId }: AdminListingActionsProps) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    setApproving(true);
    try {
      const { approveListing } = await import("@/actions/admin");
      await approveListing(listingId);
      toast.success("Listing approved!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve"
      );
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setRejecting(true);
    try {
      const { rejectListing } = await import("@/actions/admin");
      await rejectListing(listingId, reason.trim());
      toast.success("Listing rejected");
      setRejectOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reject"
      );
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        onClick={handleApprove}
        disabled={approving}
        className="bg-green-600 hover:bg-green-700"
      >
        {approving ? "..." : "Approve"}
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The host will see this message.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleReject}
            disabled={rejecting || !reason.trim()}
            variant="destructive"
          >
            {rejecting ? "Rejecting..." : "Reject Listing"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
