"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ListingFormData } from "@/hooks/use-listing-form";

interface StepConnectivityProps {
  data: ListingFormData;
  onChange: (updates: Partial<ListingFormData>) => void;
}

export function StepConnectivity({ data, onChange }: StepConnectivityProps) {
  const updateConnectivity = (
    updates: Partial<ListingFormData["connectivity"]>
  ) => {
    onChange({
      connectivity: { ...data.connectivity, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Internet & Connectivity</h2>
        <p className="text-sm text-gray-500 mt-1">
          This is critical for WayWork. Accurate speed information builds trust
          with guests and directly affects your Work Score.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="download">Download Speed (Mbps)</Label>
            <Input
              id="download"
              type="number"
              min={1}
              value={data.connectivity.declaredDownloadMbps}
              onChange={(e) =>
                updateConnectivity({
                  declaredDownloadMbps: parseFloat(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload">Upload Speed (Mbps)</Label>
            <Input
              id="upload"
              type="number"
              min={1}
              value={data.connectivity.declaredUploadMbps}
              onChange={(e) =>
                updateConnectivity({
                  declaredUploadMbps: parseFloat(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Run a speed test at{" "}
          <a
            href="https://speedtest.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            speedtest.net
          </a>{" "}
          and enter your results. You can also upload a screenshot for verification.
        </p>

        <div>
          <Label className="mb-2 block">Network Type</Label>
          <div className="flex gap-2">
            {(["WIFI", "WIRED", "BOTH"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateConnectivity({ networkType: type })}
                className={cn(
                  "px-4 py-2 rounded-md border text-sm font-medium transition-colors",
                  data.connectivity.networkType === type
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {type === "WIFI" ? "WiFi" : type === "WIRED" ? "Wired" : "Both"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Backup Connection</Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Do you have a secondary internet connection?
            </p>
          </div>
          <Switch
            checked={data.connectivity.hasBackupConnection}
            onCheckedChange={(checked) =>
              updateConnectivity({ hasBackupConnection: checked })
            }
          />
        </div>

        {data.connectivity.hasBackupConnection && (
          <div className="space-y-2">
            <Label htmlFor="backupType">Backup Type</Label>
            <Input
              id="backupType"
              placeholder="e.g., Mobile hotspot, Secondary ISP"
              value={data.connectivity.backupType || ""}
              onChange={(e) =>
                updateConnectivity({ backupType: e.target.value })
              }
            />
          </div>
        )}
      </div>

      {/* Speed score preview */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium">Connectivity Score Preview</p>
        <div className="mt-2 flex items-center gap-3">
          <div
            className={cn(
              "text-2xl font-bold",
              data.connectivity.declaredDownloadMbps >= 100
                ? "text-green-600"
                : data.connectivity.declaredDownloadMbps >= 50
                  ? "text-yellow-600"
                  : "text-orange-600"
            )}
          >
            {data.connectivity.declaredDownloadMbps >= 100
              ? "30"
              : data.connectivity.declaredDownloadMbps >= 50
                ? "22"
                : data.connectivity.declaredDownloadMbps >= 25
                  ? "15"
                  : data.connectivity.declaredDownloadMbps >= 10
                    ? "8"
                    : "3"}
            /40
          </div>
          <p className="text-xs text-gray-500">
            {data.connectivity.declaredDownloadMbps >= 100
              ? "Excellent - supports multiple video calls"
              : data.connectivity.declaredDownloadMbps >= 50
                ? "Good - supports video calls and screen sharing"
                : data.connectivity.declaredDownloadMbps >= 25
                  ? "Adequate - supports basic video calls"
                  : "Consider upgrading for better guest experience"}
          </p>
        </div>
      </div>
    </div>
  );
}
