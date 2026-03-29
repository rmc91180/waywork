export {};

process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:password@127.0.0.1:5432/waywork?schema=public";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const { summarizeApaleoPilotPreflight } = await import(
    "../src/lib/pms/apaleo-pilot-preflight"
  );

  const baseReadiness = {
    readiness: "GREEN" as const,
    blockers: [],
    warnings: [],
    thresholds: {
      tokenExpiryHours: 24,
      staleListingSyncHours: 24,
      recentEventWindowHours: 24,
    },
    connections: {
      configured: 1,
      enabled: 1,
      connected: 1,
      missingOAuthCredentials: 0,
      expiringAccessTokens: 0,
      missingWebhookSecret: 0,
      missingWebhookSubscription: 0,
      missingAriSubscriptions: 0,
    },
    listings: {
      importedMadrid: 5,
      publishableMadrid: 5,
      needsReviewMadrid: 0,
      rejectedMadrid: 0,
      pendingAdminReviewMadrid: 0,
      activeMadrid: 5,
      unmappedMadrid: 0,
      listingsWithSyncErrors: 0,
      staleActiveSync: 0,
      activeMissingStripeConnect: 0,
    },
    events: {
      inboundFailures24h: 0,
      outboundFailures24h: 0,
      lastInboundSuccessAt: "2026-03-29T12:00:00.000Z",
      lastOutboundSuccessAt: "2026-03-29T12:00:00.000Z",
    },
  };

  const credentialOnly = summarizeApaleoPilotPreflight({
    readiness: baseReadiness,
    env: {
      apaleoRedirectUri: false,
      stripeSecretKey: false,
      stripePublishableKey: false,
      stripeWebhookSecret: false,
      stripeConnectWebhookSecret: false,
      pmsSyncCronSecret: false,
    },
    connection: {
      configured: true,
      clientId: false,
      clientSecret: false,
      accountCode: true,
      webhookSecret: false,
      refreshToken: false,
    },
    host: {
      stripeConnectAccountId: false,
      defaultCommissionConfigured: true,
    },
  });

  assert(
    credentialOnly.state === "READY_FOR_CREDENTIAL_INPUT",
    "expected credential-only state"
  );
  assert(credentialOnly.onlyCredentialsRemain, "expected only-credentials flag");
  assert(
    credentialOnly.nonCredentialTasks.length === 0,
    "expected no non-credential tasks when everything else is ready"
  );

  const blocked = summarizeApaleoPilotPreflight({
    readiness: {
      ...baseReadiness,
      listings: {
        ...baseReadiness.listings,
        needsReviewMadrid: 2,
      },
    },
    env: {
      apaleoRedirectUri: true,
      stripeSecretKey: true,
      stripePublishableKey: true,
      stripeWebhookSecret: true,
      stripeConnectWebhookSecret: true,
      pmsSyncCronSecret: true,
    },
    connection: {
      configured: true,
      clientId: true,
      clientSecret: true,
      accountCode: true,
      webhookSecret: true,
      refreshToken: true,
    },
    host: {
      stripeConnectAccountId: true,
      defaultCommissionConfigured: true,
    },
  });

  assert(blocked.state === "ACTION_REQUIRED", "expected non-credential task state");
  assert(
    blocked.nonCredentialTasks.some((item) => item.includes("curation review")),
    "expected curation review task"
  );

  const ready = summarizeApaleoPilotPreflight({
    readiness: baseReadiness,
    env: {
      apaleoRedirectUri: true,
      stripeSecretKey: true,
      stripePublishableKey: true,
      stripeWebhookSecret: true,
      stripeConnectWebhookSecret: true,
      pmsSyncCronSecret: true,
    },
    connection: {
      configured: true,
      clientId: true,
      clientSecret: true,
      accountCode: true,
      webhookSecret: true,
      refreshToken: true,
    },
    host: {
      stripeConnectAccountId: true,
      defaultCommissionConfigured: true,
    },
  });

  assert(ready.state === "READY_FOR_LIVE_CUTOVER", "expected live cutover state");
  assert(ready.liveCutoverReady, "expected live cutover readiness");

  console.log("apaleo-preflight-test: ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
