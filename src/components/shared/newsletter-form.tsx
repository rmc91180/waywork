"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading" || status === "done") return;
    setStatus("loading");
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
        <span>You&apos;re in — we&apos;ll send deals your way.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="workation-email" className="sr-only">
        Email address
      </label>
      <div className="flex items-center gap-2">
        <input
          id="workation-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--ww-celadon)] focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ww-terra)] text-[var(--ww-ink)] transition hover:brightness-95 disabled:opacity-60"
          aria-label="Subscribe"
        >
          <Send className="size-4" />
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-500">Something went wrong — please try again.</p>
      )}
    </form>
  );
}
