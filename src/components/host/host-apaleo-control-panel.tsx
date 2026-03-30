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

interface HostApaleoListingMapping {
  id: string;
  title: string;
  status: string;
  pmsExternalPropertyId: string | null;
  pmsExternalUnitGroupId: string | null;
  pmsExternalRatePlanId: string | null;
  pmsSyncStatus: string;
  pmsSyncError: string | null;
  pmsLastSyncedAt: string | null;
}

interface HostApaleoConnectionState {
  id: string | null;
  enabled: boolean;
  apiBaseUrl: string;
  identityBaseUrl: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  accountCode: string | null;
  hasRefreshToken: boolean;
  hasWebhookSecret: boolean;
  webhookSubscriptionId: string | null;
  ariSubscriptionId: string | null;
  connectedAt: string | null;
  lastTokenRefreshAt: string | null;
  updatedAt: string | null;
}

interface HostApaleoControlPanelProps {
  connection: HostApaleoConnectionState;
  listings: HostApaleoListingMapping[];
}

type ToastState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function HostApaleoControlPanel({
  connection: initialConnection,
  listings: initialListings,
}: HostApaleoControlPanelProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialConnection.enabled);
  const [apiBaseUrl, setApiBaseUrl] = useState(initialConnection.apiBaseUrl);
  const [identityBaseUrl, setIdentityBaseUrl] = useState(initialConnection.identityBaseUrl);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accountCode, setAccountCode] = useState(initialConnection.accountCode || "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [listings, setListings] = useState(initialListings);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const mappedCount = useMemo(
    () =>
      listings.filter((listing) => (listing.pmsExternalUnitGroupId || "").trim().length > 0).length,
    [listings]
  );

  const updateListing = (
    listingId: string,
    field: "pmsExternalPropertyId" | "pmsExternalUnitGroupId" | "pmsExternalRatePlanId",
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
          ? {
              ...listing,
              pmsExternalPropertyId: null,
              pmsExternalUnitGroupId: null,
              pmsExternalRatePlanId: null,
            }
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
        identityBaseUrl: string;
        accountCode?: string;
        clientId?: string;
        clientSecret?: string;
        webhookSecret?: string;
        listingMappings: Array<{
          listingId: string;
          pmsExternalPropertyId?: string;
          pmsExternalUnitGroupId?: string;
          pmsExternalRatePlanId?: string;
        }>;
      } = {
        enabled,
        apiBaseUrl: apiBaseUrl.trim() || "https://api.apaleo.com",
        identityBaseUrl: identityBaseUrl.trim() || "https://identity.apaleo.com",
        accountCode: accountCode.trim() || undefined,
        listingMappings: listings.map((listing) => ({
          listingId: listing.id,
          pmsExternalPropertyId: (listing.pmsExternalPropertyId || "").trim() || undefined,
          pmsExternalUnitGroupId: (listing.pmsExternalUnitGroupId || "").trim() || undefined,
          pmsExternalRatePlanId: (listing.pmsExternalRatePlanId || "").trim() || undefined,
        })),
      };

      if (clientId.trim()) payload.clientId = clientId.trim();
      if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();
      if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();

      const response = await fetch("/api/pms/apaleo/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to save apaleo connection.");
      }

      setClientId("");
      setClientSecret("");
      setWebhookSecret("");
      setToast({ type: "success", message: "apaleo settings and listing mappings saved." });
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save apaleo settings.",
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
            apaleo Open APIs
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--ww-primary-blue)]">
            PMS Connection Control
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure apaleo credentials, map property and unit group IDs, and prepare direct booking
            sync for connected inventory.
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
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Refresh Token</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {initialConnection.hasRefreshToken ? "Connected" : "Missing"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Account Code</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {initialConnection.accountCode || "Missing"}
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
              Credentials only rotate when you enter new values.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            Enable Sync
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apaleo-api-url">apaleo API Base URL</Label>
            <Input
              id="apaleo-api-url"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="https://api.apaleo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apaleo-identity-url">Identity Base URL</Label>
            <Input
              id="apaleo-identity-url"
              value={identityBaseUrl}
              onChange={(event) => setIdentityBaseUrl(event.target.value)}
              placeholder="https://identity.apaleo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apaleo-account-code">Account Code</Label>
            <Input
              id="apaleo-account-code"
              value={accountCode}
              onChange={(event) => setAccountCode(event.target.value)}
              placeholder="LIMEHOME-MADRID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apaleo-webhook-secret">Webhook Secret (optional)</Label>
            <Input
              id="apaleo-webhook-secret"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={
                initialConnection.hasWebhookSecret ? "Stored (enter to rotate)" : "Paste webhook secret"
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apaleo-client-id">New Client ID (optional)</Label>
            <Input
              id="apaleo-client-id"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder={initialConnection.hasClientId ? "Stored (enter to rotate)" : "Paste client id"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apaleo-client-secret">New Client Secret (optional)</Label>
            <Input
              id="apaleo-client-secret"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder={
                initialConnection.hasClientSecret ? "Stored (enter to rotate)" : "Paste client secret"
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">OAuth</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {initialConnection.hasRefreshToken ? "Connected" : "Needs refresh token or OAuth"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Connected: {formatDateTime(initialConnection.connectedAt)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Webhook Subscription</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {initialConnection.webhookSubscriptionId || "Missing"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">ARI Subscription</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {initialConnection.ariSubscriptionId || "Missing"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Last token refresh: {formatDateTime(initialConnection.lastTokenRefreshAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Listing Mappings</p>
            <p className="text-xs text-slate-500">
              Map each Way Work listing to the apaleo property, unit group, and optional rate plan.
            </p>
          </div>
          <Badge variant={mappedCount > 0 ? "default" : "secondary"}>{mappedCount} mapped</Badge>
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
                className="grid gap-3 rounded-lg border border-slate-200 p-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto]"
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
                  <Label htmlFor={`apaleo-property-${listing.id}`}>Property ID</Label>
                  <Input
                    id={`apaleo-property-${listing.id}`}
                    value={listing.pmsExternalPropertyId || ""}
                    onChange={(event) =>
                      updateListing(listing.id, "pmsExternalPropertyId", event.target.value)
                    }
                    placeholder="Required"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`apaleo-unit-group-${listing.id}`}>Unit Group ID</Label>
                  <Input
                    id={`apaleo-unit-group-${listing.id}`}
                    value={listing.pmsExternalUnitGroupId || ""}
                    onChange={(event) =>
                      updateListing(listing.id, "pmsExternalUnitGroupId", event.target.value)
                    }
                    placeholder="Required"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`apaleo-rate-plan-${listing.id}`}>Rate Plan ID</Label>
                  <Input
                    id={`apaleo-rate-plan-${listing.id}`}
                    value={listing.pmsExternalRatePlanId || ""}
                    onChange={(event) =>
                      updateListing(listing.id, "pmsExternalRatePlanId", event.target.value)
                    }
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
          {saving ? "Saving..." : "Save apaleo Settings"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/host/listings">Manage Listings Directly</Link>
        </Button>
      </div>
    </section>
  );
}
