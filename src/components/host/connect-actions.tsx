"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  startConnectOnboarding,
  getStripeDashboardLink,
} from "@/actions/stripe-connect";

interface ConnectActionsProps {
  hasAccount: boolean;
  isOnboarded: boolean;
}

export function ConnectActions({ hasAccount, isOnboarded }: ConnectActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      await startConnectOnboarding();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start onboarding"
      );
      setLoading(false);
    }
  };

  const handleDashboard = async () => {
    setLoading(true);
    try {
      await getStripeDashboardLink();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to open dashboard"
      );
      setLoading(false);
    }
  };

  if (isOnboarded) {
    return (
      <div className="flex gap-2">
        <Button onClick={handleDashboard} disabled={loading}>
          {loading ? "Opening..." : "Open Stripe Dashboard"}
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSetup} disabled={loading}>
      {loading
        ? "Redirecting to Stripe..."
        : hasAccount
          ? "Continue Stripe Setup"
          : "Connect Stripe Account"}
    </Button>
  );
}
