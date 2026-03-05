"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HostSyncDiagnosticsProps {
  connectionId: string | null;
  connectionEnabled: boolean;
  hasClientToken: boolean;
  hasConnectionToken: boolean;
  hasAccessToken: boolean;
  hasEnterpriseId: boolean;
  healthScore: number;
  mappedManagedListings: number;
  managedListings: number;
  outboundSuccessCount: number;
  outboundFailureCount: number;
  inboundSuccessCount: number;
  inboundFailureCount: number;
  pendingJobs: number;
  failedJobs: number;
  deadLetterJobs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function HostSyncDiagnostics(props: HostSyncDiagnosticsProps) {
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const healthTone =
    props.healthScore >= 85 ? "default" : props.healthScore >= 70 ? "secondary" : "destructive";

  const retryFailed = async () => {
    if (!props.connectionId) return;

    setRetrying(true);
    setMessage(null);

    try {
      const response = await fetch("/api/pms/mews/retryFailed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json().catch(() => ({}))) as {
        retriedCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to retry sync jobs.");
      }

      setMessage({
        type: "success",
        text: `Retry triggered for ${data.retriedCount || 0} failed/dead-letter jobs. Refreshing...`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to retry sync jobs.",
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
            Sync Diagnostics
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--ww-primary-blue)]">
            Mews Health & Queue
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Monitor connection health, queue pressure, and sync error recovery in real time.
          </p>
        </div>
        <Badge variant={healthTone}>Health Score {props.healthScore}/100</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Credentials</p>
          <p className="mt-1 text-sm text-slate-700">
            Client {props.hasClientToken ? "stored" : "missing"} - Connection{" "}
            {props.hasConnectionToken ? "stored" : "missing"}
          </p>
          <p className="text-xs text-slate-500">
            Access {props.hasAccessToken ? "stored" : "missing"} - Enterprise{" "}
            {props.hasEnterpriseId ? "stored" : "missing"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Mapping Coverage</p>
          <p className="mt-1 text-sm text-slate-900">
            {props.mappedManagedListings}/{props.managedListings} managed listings mapped
          </p>
          <p className="text-xs text-slate-500">
            Sync {props.connectionEnabled ? "enabled" : "disabled"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Recent Events (30d)</p>
          <p className="mt-1 text-sm text-slate-900">
            Outbound {props.outboundSuccessCount} ok / {props.outboundFailureCount} failed
          </p>
          <p className="text-xs text-slate-500">
            Inbound {props.inboundSuccessCount} ok / {props.inboundFailureCount} failed
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Queue</p>
          <p className="mt-1 text-sm text-slate-900">
            Pending {props.pendingJobs} - Failed {props.failedJobs}
          </p>
          <p className="text-xs text-slate-500">Dead Letter {props.deadLetterJobs}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
        <p>Last success: {formatDateTime(props.lastSuccessAt)}</p>
        <p>Last failure: {formatDateTime(props.lastFailureAt)}</p>
      </div>

      {message ? (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{message.text}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!props.connectionId || retrying}
          onClick={() => void retryFailed()}
        >
          <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Retrying..." : "Retry Failed Sync Jobs"}
        </Button>
      </div>
    </section>
  );
}
