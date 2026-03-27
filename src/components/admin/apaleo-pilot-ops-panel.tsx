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
}

export function ApaleoPilotOpsPanel({ defaultHostEmail }: ApaleoPilotOpsPanelProps) {
  const router = useRouter();
  const [hostEmail, setHostEmail] = useState(defaultHostEmail || "");
  const [hostName, setHostName] = useState("Limehome");
  const [accountCode, setAccountCode] = useState("LIMEHOME-MADRID");
  const [useFixtures, setUseFixtures] = useState(true);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [pendingOperation, setPendingOperation] = useState<OperationKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const actionsDisabled = useMemo(() => !hostEmail.trim() || isPending, [hostEmail, isPending]);

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

        {lastResult && (
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
            {lastResult}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
