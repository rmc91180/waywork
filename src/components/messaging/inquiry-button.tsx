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
import { createThread } from "@/actions/messaging";

interface InquiryButtonProps {
  listingId: string;
  hostName: string;
}

export function InquiryButton({ listingId, hostName }: InquiryButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const result = await createThread({ listingId, message: trimmed });
      toast.success("Message sent!");
      setOpen(false);
      setMessage("");
      router.push(`/messages/${result.threadId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Message {hostName || "Host"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a message to {hostName || "the host"}</DialogTitle>
          <DialogDescription>
            Ask about the space, availability, or anything else you'd like to
            know before booking.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Hi! I'm interested in your space..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="w-full"
        >
          {sending ? "Sending..." : "Send Message"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
