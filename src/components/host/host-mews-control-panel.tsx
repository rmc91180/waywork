"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Link2, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface HostListingMapping {
  id: string;
  title: string;
  status: string;
  pmsExternalListingId: string | null;
  pmsExternalRatePlanId: string | null;
  pmsSyncStatus: string;
  pmsSyncError: string | null;
  pmsLastSyncedAt: string | null;
}

interface HostMewsConnectionState {
  id: string | null;
  enabled: boolean;
  mewsApiBaseUrl: string;
  mewsClientName: string;
  hasClientToken: boolean;
  hasConnectionToken: boolean;
  hasAccessToken: boolean;
  hasEnterpriseId: boolean;
  updatedAt: string | null;
}

interface HostMewsControlPanelProps {
  connection: HostMewsConnectionState;
  listings: HostListingMapping[];
}

type ToastState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function HostMewsControlPanel({
  connection: initialConnection,
  listings: initialListings,
}: HostMewsControlPanelProps) {
  const router = useRouter();

  const [enabled, setEnabled] = useState(initialConnection.enabled);
  const [apiBaseUrl, setApiBaseUrl] = useState(initialConnection.mewsApiBaseUrl);
  const [clientName, setClientName] = useState(initialConnection.mewsClientName);
  const [newClientToken, setNewClientToken] = useState("");
  const [newConnectionToken, setNewConnectionToken] = useState("");
  const [newAccessToken, setNewAccessToken] = useState("");
  const [newEnterpriseId, setNewEnterpriseId] = useState("");
  const [listings, setListings] = useState(initialListings);
  const [saving, setSaving] = useState(false);
  const [requestingAri, setRequestingAri] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const mappedCount = useMemo(
    () => listings.filter((listing) => (listing.pmsExternalListingId || "").trim().length > 0).length,
    [listings]
  );
  const syncReady = useMemo(() => {
    return (
      Boolean(initialConnection.id) &&
      initialConnection.hasClientToken &&
      initialConnection.hasConnectionToken &&
      mappedCount > 0 &&
      enabled
    );
  }, [enabled, initialConnection.hasClientToken, initialConnection.hasConnectionToken, initialConnection.id, mappedCount]);

  const updateListing = (
    listingId: string,
    field: "pmsExternalListingId" | "pmsExternalRatePlanId",
    value: string
  ) => {
    setListings((current) =>
      current.map((listing) =>
        listing.id === listingId ? { ...listing, [field]: value || null } : listing
      )
    );
  };

  const clearListingMapping = (listingId: string) => {
    setListings((current) =>
      current.map((listing) =>
        listing.id === listingId
          ? { ...listing, pmsExternalListingId: null, pmsExternalRatePlanId: null }
          : listing
      )
    );
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setToast(null);
    try {
      const payload: {
        enabled: boolean;
        mewsApiBaseUrl: string;
        mewsClientName: string;
        mewsClientToken?: string;
        mewsConnectionToken?: string;
        mewsAccessToken?: string;
        mewsEnterpriseId?: string;
        listingMappings: Array<{
          listingId: string;
          pmsExternalListingId?: string;
          pmsExternalRatePlanId?: string;
        }>;
      } = {
        enabled,
        mewsApiBaseUrl: apiBaseUrl.trim() || "https://api.mews.com",
        mewsClientName: clientName.trim() || "WayWork PMS Sync/1.0",
        listingMappings: listings.map((listing) => ({
          listingId: listing.id,
          pmsExternalListingId: (listing.pmsExternalListingId || "").trim() || undefined,
          pmsExternalRatePlanId: (listing.pmsExternalRatePlanId || "").trim() || undefined,
        })),
      };

      if (newClientToken.trim()) payload.mewsClientToken = newClientToken.trim();
      if (newConnectionToken.trim()) payload.mewsConnectionToken = newConnectionToken.trim();
      if (newAccessToken.trim()) payload.mewsAccessToken = newAccessToken.trim();
      if (newEnterpriseId.trim()) payload.mewsEnterpriseId = newEnterpriseId.trim();

      const response = await fetch("/api/pms/mews/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to save Mews connection.");
      }

      setNewClientToken("");
      setNewConnectionToken("");
      setNewAccessToken("");
      setNewEnterpriseId("");
      setToast({ type: "success", message: "Mews settings and listing mappings saved." });
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save Mews settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const requestAriUpdate = async () => {
    setRequestingAri(true);
    setToast(null);
    try {
      const response = await fetch("/api/pms/mews/requestAriUpdate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          initialConnection.id ? { connectionId: initialConnection.id } : {}
        ),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to request ARI update.");
      }

      setToast({ type: "success", message: "ARI update request submitted to Mews." });
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to request ARI update.",
      });
    } finally {
      setRequestingAri(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
            Mews Channel Manager
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--ww-primary-blue)]">
            PMS Sync Control Center
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure two-way sync, map listing IDs, request ARI updates, and keep direct control
            over listing operations from Way Work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? "Sync Enabled" : "Sync Disabled"}
          </Badge>
          <Badge variant={mappedCount > 0 ? "outline" : "secondary"}>
            {mappedCount}/{listings.length} mapped
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Client Token</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {initialConnection.hasClientToken ? "Stored" : "Missing"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Connection Token</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {initialConnection.hasConnectionToken ? "Stored" : "Missing"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Last Updated</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatDateTime(initialConnection.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Connection Settings</p>
            <p className="text-xs text-slate-500">Credentials are only updated when you enter new values.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            Enable Sync
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mews-api-url">Mews API Base URL</Label>
            <Input
              id="mews-api-url"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="https://api.mews.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mews-client-name">Client Name</Label>
            <Input
              id="mews-client-name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="WayWork PMS Sync/1.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mews-client-token">New Client Token (optional)</Label>
            <Input
              id="mews-client-token"
              value={newClientToken}
              onChange={(event) => setNewClientToken(event.target.value)}
              placeholder={initialConnection.hasClientToken ? "Stored (enter to rotate)" : "Paste token"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mews-connection-token">New Connection Token (optional)</Label>
            <Input
              id="mews-connection-token"
              value={newConnectionToken}
              onChange={(event) => setNewConnectionToken(event.target.value)}
              placeholder={initialConnection.hasConnectionToken ? "Stored (enter to rotate)" : "Paste token"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mews-access-token">New Access Token (optional)</Label>
            <Input
              id="mews-access-token"
              value={newAccessToken}
              onChange={(event) => setNewAccessToken(event.target.value)}
              placeholder={initialConnection.hasAccessToken ? "Stored (enter to rotate)" : "Optional"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mews-enterprise-id">New Enterprise ID (optional)</Label>
            <Input
              id="mews-enterprise-id"
              value={newEnterpriseId}
              onChange={(event) => setNewEnterpriseId(event.target.value)}
              placeholder={initialConnection.hasEnterpriseId ? "Stored (enter to rotate)" : "Optional"}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Listing Mappings</p>
            <p className="text-xs text-slate-500">
              Map each Way Work listing to its Mews `SpaceTypeCode` and optional `RatePlanCode`.
            </p>
          </div>
          <Badge variant={mappedCount > 0 ? "default" : "secondary"}>
            {mappedCount} mapped
          </Badge>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">
            No listings yet.{" "}
            <Link href="/host/listings/new" className="font-semibold text-[var(--ww-primary-blue)] underline">
              Create a listing
            </Link>{" "}
            to start PMS mapping.
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{listing.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline">{listing.status}</Badge>
                    <Badge variant="outline">{listing.pmsSyncStatus}</Badge>
                    {listing.pmsSyncError ? (
                      <Badge variant="destructive" className="max-w-full truncate">
                        Sync error
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Last synced: {formatDateTime(listing.pmsLastSyncedAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`space-code-${listing.id}`}>Mews SpaceTypeCode</Label>
                  <Input
                    id={`space-code-${listing.id}`}
                    value={listing.pmsExternalListingId || ""}
                    onChange={(event) =>
                      updateListing(listing.id, "pmsExternalListingId", event.target.value)
                    }
                    placeholder="Required for sync"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`rate-plan-${listing.id}`}>Mews RatePlanCode</Label>
                  <Input
                    id={`rate-plan-${listing.id}`}
                    value={listing.pmsExternalRatePlanId || ""}
                    onChange={(event) =>
                      updateListing(listing.id, "pmsExternalRatePlanId", event.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full lg:w-auto"
                    onClick={() => clearListingMapping(listing.id)}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast ? (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{toast.message}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void saveConfiguration()}
          disabled={saving}
          className="bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]"
        >
          <Save className="size-4" />
          {saving ? "Saving..." : "Save Mews Settings"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void requestAriUpdate()}
          disabled={!syncReady || requestingAri}
        >
          <RefreshCw className={`size-4 ${requestingAri ? "animate-spin" : ""}`} />
          {requestingAri ? "Requesting ARI..." : "Request ARI Update"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/host/listings">
            <Link2 className="size-4" />
            Manage Listings Directly
          </Link>
        </Button>
      </div>
    </section>
  );
}
