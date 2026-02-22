"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sendMessage } from "@/actions/messaging";

interface MessageInputProps {
  threadId: string;
}

export function MessageInput({ threadId }: MessageInputProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      await sendMessage({ threadId, content: trimmed });
      setContent("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="sticky bottom-4 bg-white border rounded-xl p-3 shadow-lg">
      <div className="flex gap-2">
        <Textarea
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 p-2"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          size="sm"
          className="self-end shrink-0"
        >
          {sending ? "..." : "Send"}
        </Button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1 px-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
