"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReturningGuestBannerProps {
  className?: string;
}

export function ReturningGuestBanner({ className }: ReturningGuestBannerProps) {
  const [isReturning] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("ww-returning-guest"));
  });

  useEffect(() => {
    window.localStorage.setItem("ww-returning-guest", "true");
  }, []);

  if (!isReturning) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/35 bg-white/16 p-4 text-white backdrop-blur-sm",
        className
      )}
    >
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
        <Sparkles className="size-4" />
        Welcome back. Ready for another productive escape?
      </p>
      <p className="mt-1 text-sm text-white/82">
        Your recommended spaces are ready whenever you are.
      </p>
      <Link
        href="/search?sortBy=recommended&verifiedInternet=true"
        className="mt-2 inline-flex text-sm font-semibold text-white underline decoration-white/35 underline-offset-4"
      >
        Show recommended spaces
      </Link>
    </div>
  );
}
