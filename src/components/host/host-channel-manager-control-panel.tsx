"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";
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

interface HostSiteMinderConnectionState {
  id: string | null;
  enabled: boolean;
  apiBaseUrl: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  propertyId: string | null;
  hasWebhookSecret: boolean;
  updatedAt: string | null;
}

interface HostChannelManagerControlPanelProps {
  connection: HostSiteMinderConnectionState;
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

export function HostChannelManagerControlPanel({
  connection: initialConnection,
  listings: initialListings,
}: HostChannelManagerControlPanelProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialConnection.enabled);
  const [apiBaseUrl, setApiBaseUrl] = useState(initialConnection.apiBaseUrl);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [propertyId, setPropertyId] = useState(initialConnection.propertyId || "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [listings, setListings] = useState(initialListings);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const mappedCount = useMemo(
    () => listings.filter((listing) => (listing.pmsExternalListingId || "").trim().length > 0).length,
    [listings]
  );

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
        apiBaseUrl: string;
        clientId?: string;
        clientSecret?: string;
        propertyId?: string;
        webhookSecret?: string;
        listingMappings: Array<{
          listingId: string;
          pmsExternalListingId?: string;
          pmsExternalRatePlanId?: string;
        }>;
      } = {
        enabled,
        apiBaseUrl: apiBaseUrl.trim() || "https://api.siteminder.com",
        propertyId: propertyId.trim() || undefined,
        listingMappings: listings.map((listing) => ({
          listingId: listing.id,
          pmsExternalListingId: (listing.pmsExternalListingId || "").trim() || undefined,
          pmsExternalRatePlanId: (listing.pmsExternalRatePlanId || "").trim() || undefined,
        })),
      };

      if (clientId.trim()) payload.clientId = clientId.trim();
      if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();
      if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();

      const response = await fetch("/api/pms/siteminder/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to save SiteMinder connection.");
      }

      setClientId("");
      setClientSecret("");
      setWebhookSecret("");
      setToast({ type: "success", message: "SiteMinder settings and listing mappings saved." });
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to save SiteMinder settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
            SiteMinder Channel Manager
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--ww-primary-blue)]">
            PMS Connection Control
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure SiteMinder credentials, map listing IDs, and keep direct host controls active.
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

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Client ID</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {initialConnection.hasClientId ? "Stored" : "Missing"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Client Secret</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {initialConnection.hasClientSecret ? "Stored" : "Missing"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Property ID</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {initialConnection.propertyId || "Missing"}
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
            <p className="text-xs text-slate-500">
              Credentials are updated only when you enter new values.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            Enable Sync
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="siteminder-api-url">SiteMinder API Base URL</Label>
            <Input
              id="siteminder-api-url"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="https://api.siteminder.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteminder-property-id">Property ID</Label>
            <Input
              id="siteminder-property-id"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              placeholder="Property identifier"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteminder-client-id">New Client ID (optional)</Label>
            <Input
              id="siteminder-client-id"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder={initialConnection.hasClientId ? "Stored (enter to rotate)" : "Paste client id"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteminder-client-secret">New Client Secret (optional)</Label>
            <Input
              id="siteminder-client-secret"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder={initialConnection.hasClientSecret ? "Stored (enter to rotate)" : "Paste secret"}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="siteminder-webhook-secret">Webhook Secret (optional)</Label>
            <Input
              id="siteminder-webhook-secret"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={initialConnection.hasWebhookSecret ? "Stored (enter to rotate)" : "Paste webhook secret"}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Listing Mappings</p>
            <p className="text-xs text-slate-500">
              Map each Way Work listing to SiteMinder room and optional rate plan identifiers.
            </p>
          </div>
          <Badge variant={mappedCount > 0 ? "default" : "secondary"}>{mappedCount} mapped</Badge>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">
            No listings yet. <Link href="/host/listings/new" className="font-semibold text-[var(--ww-primary-blue)] underline">Create a listing</Link> to start mapping.
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
                    {listing.pmsSyncError ? <Badge variant="destructive">Sync error</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Last synced: {formatDateTime(listing.pmsLastSyncedAt)}</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`room-code-${listing.id}`}>SiteMinder Room ID</Label>
                  <Input
                    id={`room-code-${listing.id}`}
                    value={listing.pmsExternalListingId || ""}
                    onChange={(event) => updateListing(listing.id, "pmsExternalListingId", event.target.value)}
                    placeholder="Required"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`rate-plan-${listing.id}`}>Rate Plan ID</Label>
                  <Input
                    id={`rate-plan-${listing.id}`}
                    value={listing.pmsExternalRatePlanId || ""}
                    onChange={(event) => updateListing(listing.id, "pmsExternalRatePlanId", event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={() => clearListingMapping(listing.id)}>
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
          {saving ? "Saving..." : "Save SiteMinder Settings"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/host/listings">Manage Listings Directly</Link>
        </Button>
      </div>
    </section>
  );
}
