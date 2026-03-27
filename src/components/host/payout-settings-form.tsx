"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateDefaultBookingCommissionPercent } from "@/actions/stripe-connect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PayoutSettingsFormProps {
  defaultBookingCommissionPercent: number;
}

export function PayoutSettingsForm({
  defaultBookingCommissionPercent,
}: PayoutSettingsFormProps) {
  const [value, setValue] = useState(defaultBookingCommissionPercent.toFixed(2));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Enter a commission percentage between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const result = await updateDefaultBookingCommissionPercent(parsed);
      setValue(result.defaultBookingCommissionPercent.toFixed(2));
      toast.success("Default payout split updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update payout split."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="commissionPercent">Way Work Commission (%)</Label>
        <Input
          id="commissionPercent"
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="text-xs text-slate-500">
          This is your default split for new bookings. Partner/PMS connections can override it.
        </p>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Default Split"}
      </Button>
    </div>
  );
}
