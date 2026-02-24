"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebVitalsReporter } from "@/components/shared/web-vitals-reporter";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <WebVitalsReporter />
        {children}
        <Toaster />
      </TooltipProvider>
    </SessionProvider>
  );
}
