"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type OperationKey = "import" | "curate" | "subscriptions" | "resync";

const operationLabels: Record<OperationKey, string> = {
  import: "Import Madrid",
  curate: "Curate Madrid",
  subscriptions: "Setup Subscriptions",
  resync: "Full Resync",
};

interface ApaleoPilotOpsPanelProps {
  defaultHostEmail?: string | null;
  defaultHostName?: string | null;
  defaultAccountCode?: string | null;
  defaultStripeConnectAccountId?: string | null;
  defaultBookingCommissionPercent?: number | null;
}

export function ApaleoPilotOpsPanel({
  defaultHostEmail,
  defaultHostName,
  defaultAccountCode,
  defaultStripeConnectAccountId,
  defaultBookingCommissionPercent,
}: ApaleoPilotOpsPanelProps) {
  const router = useRouter();
  const [hostEmail, setHostEmail] = useState(defaultHostEmail || "");
  const [hostName, setHostName] = useState(defaultHostName || "Limehome");
  const [accountCode, setAccountCode] = useState(defaultAccountCode || "LIMEHOME-MADRID");
  const [useFixtures, setUseFixtures] = useState(true);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [pendingOperation, setPendingOperation] = useState<OperationKey | null>(null);
  const [cutoverPending, setCutoverPending] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [stripeConnectAccountId, setStripeConnectAccountId] = useState(
    defaultStripeConnectAccountId || ""
  );
  const [bookingCommissionPercent, setBookingCommissionPercent] = useState(
    defaultBookingCommissionPercent?.toString() || "15"
  );
  const [runLaunchSequence, setRunLaunchSequence] = useState(false);
  const [isPending, startTransition] = useTransition();

  const actionsDisabled = useMemo(() => !hostEmail.trim() || isPending, [hostEmail, isPending]);
  const cutoverDisabled = useMemo(
    () => !hostEmail.trim() || cutoverPending || isPending,
    [cutoverPending, hostEmail, isPending]
  );

  function runOperation(operation: OperationKey) {
    if (!hostEmail.trim()) {
      toast.error("Host email is required for apaleo pilot operations.");
      return;
    }

    startTransition(async () => {
      setPendingOperation(operation);

      const route =
        operation === "import"
          ? "/api/admin/pms/apaleo/import-madrid"
          : operation === "curate"
            ? "/api/admin/pms/apaleo/curate-madrid"
            : operation === "subscriptions"
              ? "/api/admin/pms/apaleo/setup-subscriptions"
              : "/api/admin/pms/apaleo/full-resync";

      const body =
        operation === "import"
          ? {
              hostEmail: hostEmail.trim(),
              hostName: hostName.trim() || undefined,
              accountCode: accountCode.trim() || undefined,
              useFixtures,
            }
          : {
              hostEmail: hostEmail.trim(),
              useFixtures,
            };

      try {
        const response = await fetch(route, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Operation failed.");
        }

        setLastResult(JSON.stringify(json, null, 2));
        toast.success(`${operationLabels[operation]} completed.`);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Operation failed.";
        setLastResult(message);
        toast.error(message);
      } finally {
        setPendingOperation(null);
      }
    });
  }

  function runCutoverPreparation() {
    if (!hostEmail.trim()) {
      toast.error("Host email is required for apaleo pilot cutover.");
      return;
    }

    startTransition(async () => {
      setCutoverPending(true);

      const commissionPercent = bookingCommissionPercent.trim()
        ? Number.parseFloat(bookingCommissionPercent)
        : null;
      if (
        commissionPercent !== null &&
        (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100)
      ) {
        setCutoverPending(false);
        toast.error("Booking commission must be a valid percentage between 0 and 100.");
        return;
      }

      const body = {
        hostEmail: hostEmail.trim(),
        hostName: hostName.trim() || undefined,
        accountCode: accountCode.trim() || undefined,
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
        refreshToken: refreshToken.trim() || undefined,
        webhookSecret: webhookSecret.trim() || undefined,
        stripeConnectAccountId: stripeConnectAccountId.trim() || undefined,
        bookingCommissionPercent: commissionPercent,
        baseUrl:
          typeof window !== "undefined" ? `${window.location.origin}` : undefined,
        runLaunchSequence,
      };

      try {
        const response = await fetch("/api/admin/pms/apaleo/cutover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Cutover preparation failed.");
        }

        setLastResult(JSON.stringify(json, null, 2));
        toast.success(
          runLaunchSequence
            ? "Live cutover sequence completed."
            : "Cutover credentials saved."
        );
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Cutover preparation failed.";
        setLastResult(message);
        toast.error(message);
      } finally {
        setCutoverPending(false);
      }
    });
  }

  return (
    <Card className="border-slate-200 bg-white/95">
      <CardHeader>
        <CardTitle className="text-lg">Pilot Ops</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apaleo-host-email">Host email</Label>
            <Input
              id="apaleo-host-email"
              type="email"
              value={hostEmail}
              onChange={(event) => setHostEmail(event.target.value)}
              placeholder="partner@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apaleo-host-name">Host name</Label>
            <Input
              id="apaleo-host-name"
              value={hostName}
              onChange={(event) => setHostName(event.target.value)}
              placeholder="Limehome"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="apaleo-account-code">Account code</Label>
            <Input
              id="apaleo-account-code"
              value={accountCode}
              onChange={(event) => setAccountCode(event.target.value)}
              placeholder="LIMEHOME-MADRID"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <Checkbox
              checked={useFixtures}
              onCheckedChange={(checked) => setUseFixtures(Boolean(checked))}
            />
            Use fixture payloads
          </label>
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Button
            variant="outline"
            disabled={actionsDisabled}
            onClick={() => runOperation("import")}
          >
            {pendingOperation === "import" ? "Running..." : "Import Madrid"}
          </Button>
          <Button
            variant="outline"
            disabled={actionsDisabled}
            onClick={() => runOperation("curate")}
          >
            {pendingOperation === "curate" ? "Running..." : "Curate Madrid"}
          </Button>
          <Button
            variant="outline"
            disabled={actionsDisabled}
            onClick={() => runOperation("subscriptions")}
          >
            {pendingOperation === "subscriptions" ? "Running..." : "Setup Subscriptions"}
          </Button>
          <Button disabled={actionsDisabled} onClick={() => runOperation("resync")}>
            {pendingOperation === "resync" ? "Running..." : "Full Resync"}
          </Button>
        </div>

        <p className="text-xs text-slate-500">
          Recommended order: import inventory, curate listings, register subscriptions, then run
          a full resync before approving Madrid listings for launch.
        </p>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Credential Cutover</h3>
            <p className="mt-1 text-xs text-slate-500">
              Save the real Limehome apaleo and Stripe values here. If you also provide a live
              refresh token, Way Work can run the launch sequence automatically.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="apaleo-client-id">apaleo client ID</Label>
              <Input
                id="apaleo-client-id"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder="live-client-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apaleo-client-secret">apaleo client secret</Label>
              <Input
                id="apaleo-client-secret"
                type="password"
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                placeholder="live-client-secret"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="apaleo-refresh-token">apaleo refresh token</Label>
              <Input
                id="apaleo-refresh-token"
                type="password"
                value={refreshToken}
                onChange={(event) => setRefreshToken(event.target.value)}
                placeholder="Optional if OAuth will be completed later"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apaleo-webhook-secret">apaleo webhook secret</Label>
              <Input
                id="apaleo-webhook-secret"
                type="password"
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
                placeholder="live-webhook-secret"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stripe-connect-account-id">Host Stripe Connect account ID</Label>
              <Input
                id="stripe-connect-account-id"
                value={stripeConnectAccountId}
                onChange={(event) => setStripeConnectAccountId(event.target.value)}
                placeholder="acct_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-commission-percent">Booking commission %</Label>
              <Input
                id="booking-commission-percent"
                inputMode="decimal"
                value={bookingCommissionPercent}
                onChange={(event) => setBookingCommissionPercent(event.target.value)}
                placeholder="15"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <Checkbox
              checked={runLaunchSequence}
              onCheckedChange={(checked) => setRunLaunchSequence(Boolean(checked))}
            />
            Run live import, curation, subscription setup, and resync after saving credentials
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={cutoverDisabled} onClick={runCutoverPreparation}>
              {cutoverPending
                ? "Running..."
                : runLaunchSequence
                  ? "Save Credentials + Run Live Cutover"
                  : "Save Live Credential Setup"}
            </Button>
            <p className="text-xs text-slate-500">
              Without a refresh token, this step will prepare the connection but still require the
              host to complete apaleo OAuth before live sync can run.
            </p>
          </div>
        </div>

        {lastResult && (
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
            {lastResult}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
