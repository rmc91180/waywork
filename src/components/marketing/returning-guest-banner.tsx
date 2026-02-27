"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function ReturningGuestBanner() {
  const [isReturning] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("ww-returning-guest"));
  });

  useEffect(() => {
    window.localStorage.setItem("ww-returning-guest", "true");
  }, []);

  if (!isReturning) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
        <Sparkles className="size-4" />
        Welcome back. Ready for another work wonder?
      </p>
      <p className="mt-1 text-sm text-emerald-800">
        Personalized picks are waiting. Explore trending hubs in Bangkok, Lisbon, and Amsterdam.
      </p>
      <Link
        href="/search?sortBy=recommended&verifiedInternet=true"
        className="mt-2 inline-flex text-sm font-semibold text-emerald-900 underline decoration-emerald-400 underline-offset-4"
      >
        Show my recommended spaces
      </Link>
    </div>
  );
}
