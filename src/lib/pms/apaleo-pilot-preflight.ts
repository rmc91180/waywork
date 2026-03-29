import type { ApaleoPilotReadinessSummary } from "@/lib/pms/apaleo-pilot-readiness";
import { getApaleoPilotReadinessSummary } from "@/lib/pms/apaleo-pilot-readiness";

type PreflightState = "ACTION_REQUIRED" | "READY_FOR_CREDENTIAL_INPUT" | "READY_FOR_LIVE_CUTOVER";
type PreflightItemStatus = "READY" | "MISSING";

export interface ApaleoPilotPreflightItem {
  key: string;
  label: string;
  status: PreflightItemStatus;
  detail: string;
}

export interface ApaleoPilotPreflightSummary {
  state: PreflightState;
  onlyCredentialsRemain: boolean;
  liveCutoverReady: boolean;
  completed: string[];
  nonCredentialTasks: string[];
  credentialTasks: string[];
  credentialChecks: {
    environment: ApaleoPilotPreflightItem[];
    apaleoConnection: ApaleoPilotPreflightItem[];
    hostPayout: ApaleoPilotPreflightItem[];
  };
  recommendedNextStep: string;
}

interface PreflightContext {
  readiness: ApaleoPilotReadinessSummary;
  env: {
    apaleoRedirectUri: boolean;
    stripeSecretKey: boolean;
    stripePublishableKey: boolean;
    stripeWebhookSecret: boolean;
    stripeConnectWebhookSecret: boolean;
    pmsSyncCronSecret: boolean;
  };
  connection: {
    configured: boolean;
    clientId: boolean;
    clientSecret: boolean;
    accountCode: boolean;
    webhookSecret: boolean;
    refreshToken: boolean;
  };
  host: {
    stripeConnectAccountId: boolean;
    defaultCommissionConfigured: boolean;
  };
}

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function buildPreflightItem(
  key: string,
  label: string,
  ready: boolean,
  detail: string
): ApaleoPilotPreflightItem {
  return {
    key,
    label,
    status: ready ? "READY" : "MISSING",
    detail,
  };
}

export function summarizeApaleoPilotPreflight(
  context: PreflightContext
): ApaleoPilotPreflightSummary {
  const { readiness } = context;

  const environmentChecks = [
    buildPreflightItem(
      "apaleo_redirect_uri",
      "apaleo redirect URI",
      context.env.apaleoRedirectUri,
      "Required for live OAuth callback flow when a refresh token is not pasted directly."
    ),
    buildPreflightItem(
      "stripe_secret_key",
      "Stripe secret key",
      context.env.stripeSecretKey,
      "Required for live checkout and payment capture."
    ),
    buildPreflightItem(
      "stripe_publishable_key",
      "Stripe publishable key",
      context.env.stripePublishableKey,
      "Required for guest checkout on the live site."
    ),
    buildPreflightItem(
      "stripe_webhook_secret",
      "Stripe webhook secret",
      context.env.stripeWebhookSecret,
      "Required to confirm and finalize live payment events."
    ),
    buildPreflightItem(
      "stripe_connect_webhook_secret",
      "Stripe Connect webhook secret",
      context.env.stripeConnectWebhookSecret,
      "Required to keep host payout onboarding state in sync."
    ),
    buildPreflightItem(
      "pms_sync_cron_secret",
      "PMS sync cron secret",
      context.env.pmsSyncCronSecret,
      "Required for secure background PMS job processing in production."
    ),
  ];

  const connectionChecks = [
    buildPreflightItem(
      "apaleo_client_id",
      "apaleo client ID",
      context.connection.clientId,
      "Store the real client ID on the Limehome apaleo connection."
    ),
    buildPreflightItem(
      "apaleo_client_secret",
      "apaleo client secret",
      context.connection.clientSecret,
      "Store the real client secret on the Limehome apaleo connection."
    ),
    buildPreflightItem(
      "apaleo_account_code",
      "apaleo account code",
      context.connection.accountCode,
      "Required to scope Limehome Madrid inventory and webhook verification."
    ),
    buildPreflightItem(
      "apaleo_webhook_secret",
      "apaleo webhook secret",
      context.connection.webhookSecret,
      "Required for secure inbound reservation and ARI processing."
    ),
    buildPreflightItem(
      "apaleo_refresh_token",
      "apaleo refresh token or completed OAuth",
      context.connection.refreshToken,
      "Needed before live import, subscription setup, resync, and direct booking can run."
    ),
  ];

  const hostChecks = [
    buildPreflightItem(
      "stripe_connect_account_id",
      "Host Stripe Connect account",
      context.host.stripeConnectAccountId,
      "Required so Way Work can route host payout automatically."
    ),
    buildPreflightItem(
      "booking_commission",
      "Booking commission configuration",
      context.host.defaultCommissionConfigured,
      "A per-host or per-connection split is optional but recommended before cutover."
    ),
  ];

  const credentialTasks = [...environmentChecks, ...connectionChecks, ...hostChecks]
    .filter((item) => item.status === "MISSING")
    .map((item) => `${item.label}: ${item.detail}`);

  const completed: string[] = [];
  const nonCredentialTasks: string[] = [];

  if (readiness.listings.importedMadrid > 0) {
    completed.push(`Madrid inventory imported (${readiness.listings.importedMadrid} listing${readiness.listings.importedMadrid === 1 ? "" : "s"}).`);
  } else {
    nonCredentialTasks.push("Import Madrid inventory into the live apaleo host connection.");
  }

  if (readiness.listings.needsReviewMadrid === 0) {
    completed.push("Madrid curation review queue is clear.");
  } else {
    nonCredentialTasks.push(
      `Finish curation review for ${readiness.listings.needsReviewMadrid} Madrid listing${readiness.listings.needsReviewMadrid === 1 ? "" : "s"}.`
    );
  }

  if (readiness.listings.pendingAdminReviewMadrid === 0) {
    completed.push("Admin approval queue is clear.");
  } else {
    nonCredentialTasks.push(
      `Approve ${readiness.listings.pendingAdminReviewMadrid} curated Madrid listing${readiness.listings.pendingAdminReviewMadrid === 1 ? "" : "s"} for launch.`
    );
  }

  if (readiness.listings.unmappedMadrid === 0) {
    completed.push("Madrid listing mappings are complete.");
  } else {
    nonCredentialTasks.push(
      `Repair apaleo mapping for ${readiness.listings.unmappedMadrid} Madrid listing${readiness.listings.unmappedMadrid === 1 ? "" : "s"}.`
    );
  }

  if (readiness.connections.missingWebhookSubscription === 0) {
    completed.push("Reservation webhook subscription state is present.");
  } else if (context.connection.refreshToken) {
    nonCredentialTasks.push("Register live reservation webhook subscriptions for the enabled apaleo connection.");
  }

  if (readiness.connections.missingAriSubscriptions === 0) {
    completed.push("ARI subscription state is present.");
  } else if (context.connection.refreshToken) {
    nonCredentialTasks.push("Register live ARI subscriptions for Madrid properties.");
  }

  if (readiness.listings.listingsWithSyncErrors === 0) {
    completed.push("No Madrid listings are currently flagged with PMS sync errors.");
  } else {
    nonCredentialTasks.push(
      `Resolve PMS sync errors on ${readiness.listings.listingsWithSyncErrors} Madrid listing${readiness.listings.listingsWithSyncErrors === 1 ? "" : "s"}.`
    );
  }

  if (readiness.listings.staleActiveSync === 0) {
    completed.push("Active Madrid listings are not stale.");
  } else if (context.connection.refreshToken) {
    nonCredentialTasks.push(
      `Run a full resync for ${readiness.listings.staleActiveSync} stale active Madrid listing${readiness.listings.staleActiveSync === 1 ? "" : "s"}.`
    );
  }

  if (readiness.events.inboundFailures24h === 0 && readiness.events.outboundFailures24h === 0) {
    completed.push("No recent apaleo sync failures were detected.");
  } else {
    nonCredentialTasks.push("Clear recent apaleo inbound/outbound failures before launch.");
  }

  const dedupedCompleted = Array.from(new Set(completed));
  const dedupedNonCredentialTasks = Array.from(new Set(nonCredentialTasks));
  const onlyCredentialsRemain =
    dedupedNonCredentialTasks.length === 0 && credentialTasks.length > 0;
  const liveCutoverReady =
    dedupedNonCredentialTasks.length === 0 && credentialTasks.length === 0;

  const state: PreflightState =
    dedupedNonCredentialTasks.length > 0
      ? "ACTION_REQUIRED"
      : credentialTasks.length > 0
        ? "READY_FOR_CREDENTIAL_INPUT"
        : "READY_FOR_LIVE_CUTOVER";

  const recommendedNextStep =
    state === "ACTION_REQUIRED"
      ? dedupedNonCredentialTasks[0] || "Finish the remaining operational launch tasks."
      : state === "READY_FOR_CREDENTIAL_INPUT"
        ? "Enter the live apaleo and Stripe credentials, then run the live cutover sequence."
        : "Run the live credential cutover sequence and complete final acceptance on the deployed app.";

  return {
    state,
    onlyCredentialsRemain,
    liveCutoverReady,
    completed: dedupedCompleted,
    nonCredentialTasks: dedupedNonCredentialTasks,
    credentialTasks,
    credentialChecks: {
      environment: environmentChecks,
      apaleoConnection: connectionChecks,
      hostPayout: hostChecks,
    },
    recommendedNextStep,
  };
}

export async function getApaleoPilotPreflightSummary() {
  const { db } = await import("@/lib/db");
  const [readiness, connection] = await Promise.all([
    getApaleoPilotReadinessSummary(),
    db.pmsConnection.findFirst({
      where: { provider: "APALEO" },
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      select: {
        apaleoClientId: true,
        apaleoClientSecret: true,
        apaleoAccountCode: true,
        apaleoWebhookSecret: true,
        apaleoRefreshToken: true,
        bookingCommissionBps: true,
        user: {
          select: {
            stripeConnectAccountId: true,
            defaultBookingCommissionBps: true,
          },
        },
      },
    }),
  ]);

  return summarizeApaleoPilotPreflight({
    readiness,
    env: {
      apaleoRedirectUri: hasValue(process.env.APALEO_REDIRECT_URI),
      stripeSecretKey: hasValue(process.env.STRIPE_SECRET_KEY),
      stripePublishableKey: hasValue(process.env.STRIPE_PUBLISHABLE_KEY),
      stripeWebhookSecret: hasValue(process.env.STRIPE_WEBHOOK_SECRET),
      stripeConnectWebhookSecret: hasValue(process.env.STRIPE_CONNECT_WEBHOOK_SECRET),
      pmsSyncCronSecret: hasValue(process.env.PMS_SYNC_CRON_SECRET),
    },
    connection: {
      configured: Boolean(connection),
      clientId: hasValue(connection?.apaleoClientId),
      clientSecret: hasValue(connection?.apaleoClientSecret),
      accountCode: hasValue(connection?.apaleoAccountCode),
      webhookSecret: hasValue(connection?.apaleoWebhookSecret),
      refreshToken: hasValue(connection?.apaleoRefreshToken),
    },
    host: {
      stripeConnectAccountId: hasValue(connection?.user?.stripeConnectAccountId),
      defaultCommissionConfigured:
        connection?.bookingCommissionBps !== null ||
        connection?.user?.defaultBookingCommissionBps !== null,
    },
  });
}
