import { db } from "@/lib/db";

const TOKEN_EXPIRY_WINDOW_HOURS = 24;
const STALE_LISTING_SYNC_HOURS = 24;
const RECENT_EVENT_WINDOW_HOURS = 24;

export type ApaleoPilotReadinessState = "GREEN" | "YELLOW" | "RED";

export interface ApaleoPilotReadinessSummary {
  readiness: ApaleoPilotReadinessState;
  blockers: string[];
  warnings: string[];
  thresholds: {
    tokenExpiryHours: number;
    staleListingSyncHours: number;
    recentEventWindowHours: number;
  };
  connections: {
    configured: number;
    enabled: number;
    connected: number;
    missingOAuthCredentials: number;
    expiringAccessTokens: number;
    missingWebhookSecret: number;
    missingWebhookSubscription: number;
    missingAriSubscriptions: number;
  };
  listings: {
    importedMadrid: number;
    publishableMadrid: number;
    needsReviewMadrid: number;
    rejectedMadrid: number;
    pendingAdminReviewMadrid: number;
    activeMadrid: number;
    unmappedMadrid: number;
    listingsWithSyncErrors: number;
    staleActiveSync: number;
    activeMissingStripeConnect: number;
  };
  events: {
    inboundFailures24h: number;
    outboundFailures24h: number;
    lastInboundSuccessAt: string | null;
    lastOutboundSuccessAt: string | null;
  };
}

function toIsoString(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString();
}

export async function getApaleoPilotReadinessSummary(): Promise<ApaleoPilotReadinessSummary> {
  const now = Date.now();
  const tokenExpiryCutoff = new Date(now + TOKEN_EXPIRY_WINDOW_HOURS * 60 * 60_000);
  const staleSyncCutoff = new Date(now - STALE_LISTING_SYNC_HOURS * 60 * 60_000);
  const recentEventCutoff = new Date(now - RECENT_EVENT_WINDOW_HOURS * 60 * 60_000);

  const madridListingWhere = {
    pmsConnection: { provider: "APALEO" as const },
    city: { equals: "Madrid", mode: "insensitive" as const },
  };

  const configuredConnections = await db.pmsConnection.count({
    where: { provider: "APALEO" },
  });
  const enabledConnections = await db.pmsConnection.count({
    where: { provider: "APALEO", enabled: true },
  });
  const connectedConnections = await db.pmsConnection.count({
    where: {
      provider: "APALEO",
      enabled: true,
      apaleoConnectedAt: { not: null },
    },
  });
  const missingOAuthCredentials = await db.pmsConnection.count({
    where: {
      provider: "APALEO",
      enabled: true,
      OR: [{ apaleoClientId: null }, { apaleoClientSecret: null }, { apaleoRefreshToken: null }],
    },
  });
  const expiringAccessTokens = await db.pmsConnection.count({
    where: {
      provider: "APALEO",
      enabled: true,
      apaleoAccessTokenExpiresAt: {
        lte: tokenExpiryCutoff,
      },
    },
  });
  const missingWebhookSecret = await db.pmsConnection.count({
    where: {
      provider: "APALEO",
      enabled: true,
      OR: [{ apaleoWebhookSecret: null }, { apaleoWebhookSecret: "" }],
    },
  });
  const missingWebhookSubscription = await db.pmsConnection.count({
    where: {
      provider: "APALEO",
      enabled: true,
      OR: [{ apaleoWebhookSubscriptionId: null }, { apaleoWebhookSubscriptionId: "" }],
    },
  });
  const missingAriSubscriptions = await db.pmsConnection.count({
    where: {
      provider: "APALEO",
      enabled: true,
      OR: [{ apaleoAriSubscriptionId: null }, { apaleoAriSubscriptionId: "" }],
    },
  });
  const importedMadrid = await db.listing.count({
    where: madridListingWhere,
  });
  const publishableMadrid = await db.listing.count({
    where: {
      ...madridListingWhere,
      curationStatus: "PUBLISHABLE",
    },
  });
  const needsReviewMadrid = await db.listing.count({
    where: {
      ...madridListingWhere,
      curationStatus: "NEEDS_REVIEW",
    },
  });
  const rejectedMadrid = await db.listing.count({
    where: {
      ...madridListingWhere,
      curationStatus: "REJECTED",
    },
  });
  const pendingAdminReviewMadrid = await db.listing.count({
    where: {
      ...madridListingWhere,
      status: "PENDING_REVIEW",
    },
  });
  const activeMadrid = await db.listing.count({
    where: {
      ...madridListingWhere,
      status: "ACTIVE",
    },
  });
  const unmappedMadrid = await db.listing.count({
    where: {
      ...madridListingWhere,
      OR: [
        { pmsConnectionId: null },
        { pmsExternalPropertyId: null },
        { pmsExternalUnitGroupId: null },
        { pmsExternalRatePlanId: null },
      ],
    },
  });
  const listingsWithSyncErrors = await db.listing.count({
    where: {
      ...madridListingWhere,
      OR: [{ pmsSyncStatus: "FAILED" }, { pmsSyncError: { not: null } }],
    },
  });
  const staleActiveSync = await db.listing.count({
    where: {
      ...madridListingWhere,
      status: "ACTIVE",
      OR: [{ pmsLastSyncedAt: null }, { pmsLastSyncedAt: { lt: staleSyncCutoff } }],
    },
  });
  const activeMissingStripeConnect = await db.listing.count({
    where: {
      ...madridListingWhere,
      status: "ACTIVE",
      host: {
        stripeConnectAccountId: null,
      },
    },
  });
  const inboundFailures24h = await db.pmsSyncEvent.count({
    where: {
      connection: { provider: "APALEO" },
      direction: "INBOUND",
      success: false,
      createdAt: { gte: recentEventCutoff },
    },
  });
  const outboundFailures24h = await db.pmsSyncEvent.count({
    where: {
      connection: { provider: "APALEO" },
      direction: "OUTBOUND",
      success: false,
      createdAt: { gte: recentEventCutoff },
    },
  });
  const lastInboundSuccess = await db.pmsSyncEvent.findFirst({
    where: {
      connection: { provider: "APALEO" },
      direction: "INBOUND",
      success: true,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const lastOutboundSuccess = await db.pmsSyncEvent.findFirst({
    where: {
      connection: { provider: "APALEO" },
      direction: "OUTBOUND",
      success: true,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (enabledConnections > 0 && missingOAuthCredentials > 0) {
    blockers.push(
      `${missingOAuthCredentials} enabled apaleo connection${missingOAuthCredentials === 1 ? "" : "s"} ${missingOAuthCredentials === 1 ? "is" : "are"} missing OAuth credentials or refresh state.`
    );
  }

  if (enabledConnections > 0 && missingWebhookSecret > 0) {
    blockers.push(
      `${missingWebhookSecret} enabled apaleo connection${missingWebhookSecret === 1 ? "" : "s"} ${missingWebhookSecret === 1 ? "is" : "are"} missing a webhook secret.`
    );
  }

  if (enabledConnections > 0 && missingWebhookSubscription > 0) {
    blockers.push(
      `${missingWebhookSubscription} enabled apaleo connection${missingWebhookSubscription === 1 ? "" : "s"} ${missingWebhookSubscription === 1 ? "is" : "are"} missing reservation webhook subscriptions.`
    );
  }

  if (enabledConnections > 0 && missingAriSubscriptions > 0) {
    blockers.push(
      `${missingAriSubscriptions} enabled apaleo connection${missingAriSubscriptions === 1 ? "" : "s"} ${missingAriSubscriptions === 1 ? "is" : "are"} missing ARI subscription state.`
    );
  }

  if (activeMadrid > 0 && unmappedMadrid > 0) {
    blockers.push(
      `${unmappedMadrid} Madrid listing${unmappedMadrid === 1 ? "" : "s"} ${unmappedMadrid === 1 ? "is" : "are"} missing required apaleo mapping.`
    );
  }

  if (activeMadrid > 0 && listingsWithSyncErrors > 0) {
    blockers.push(
      `${listingsWithSyncErrors} active or imported Madrid listing${listingsWithSyncErrors === 1 ? "" : "s"} currently ${listingsWithSyncErrors === 1 ? "has" : "have"} PMS sync errors.`
    );
  }

  if (activeMadrid > 0 && staleActiveSync > 0) {
    blockers.push(
      `${staleActiveSync} active Madrid listing${staleActiveSync === 1 ? "" : "s"} ${staleActiveSync === 1 ? "has" : "have"} stale PMS sync timestamps.`
    );
  }

  if (activeMadrid > 0 && activeMissingStripeConnect > 0) {
    blockers.push(
      `${activeMissingStripeConnect} active Madrid listing${activeMissingStripeConnect === 1 ? "" : "s"} ${activeMissingStripeConnect === 1 ? "is" : "are"} missing a host Stripe Connect account.`
    );
  }

  if (configuredConnections > 0 && enabledConnections === 0) {
    warnings.push("Apaleo is configured in the database, but no apaleo connections are enabled yet.");
  }

  if (enabledConnections > 0 && expiringAccessTokens > 0) {
    warnings.push(
      `${expiringAccessTokens} enabled apaleo connection${expiringAccessTokens === 1 ? "" : "s"} ${expiringAccessTokens === 1 ? "has" : "have"} access tokens expiring within 24 hours.`
    );
  }

  if (importedMadrid === 0 && enabledConnections > 0) {
    warnings.push("No Madrid inventory has been imported yet.");
  }

  if (needsReviewMadrid > 0) {
    warnings.push(
      `${needsReviewMadrid} Madrid listing${needsReviewMadrid === 1 ? "" : "s"} still ${needsReviewMadrid === 1 ? "needs" : "need"} manual curation review before launch.`
    );
  }

  if (pendingAdminReviewMadrid > 0) {
    warnings.push(
      `${pendingAdminReviewMadrid} Madrid listing${pendingAdminReviewMadrid === 1 ? "" : "s"} ${pendingAdminReviewMadrid === 1 ? "is" : "are"} still waiting for admin approval.`
    );
  }

  if (inboundFailures24h > 0) {
    warnings.push(
      `${inboundFailures24h} inbound apaleo sync failure${inboundFailures24h === 1 ? "" : "s"} occurred in the last 24 hours.`
    );
  }

  if (outboundFailures24h > 0) {
    warnings.push(
      `${outboundFailures24h} outbound apaleo booking/sync failure${outboundFailures24h === 1 ? "" : "s"} occurred in the last 24 hours.`
    );
  }

  return {
    readiness: blockers.length > 0 ? "RED" : warnings.length > 0 ? "YELLOW" : "GREEN",
    blockers,
    warnings,
    thresholds: {
      tokenExpiryHours: TOKEN_EXPIRY_WINDOW_HOURS,
      staleListingSyncHours: STALE_LISTING_SYNC_HOURS,
      recentEventWindowHours: RECENT_EVENT_WINDOW_HOURS,
    },
    connections: {
      configured: configuredConnections,
      enabled: enabledConnections,
      connected: connectedConnections,
      missingOAuthCredentials,
      expiringAccessTokens,
      missingWebhookSecret,
      missingWebhookSubscription,
      missingAriSubscriptions,
    },
    listings: {
      importedMadrid,
      publishableMadrid,
      needsReviewMadrid,
      rejectedMadrid,
      pendingAdminReviewMadrid,
      activeMadrid,
      unmappedMadrid,
      listingsWithSyncErrors,
      staleActiveSync,
      activeMissingStripeConnect,
    },
    events: {
      inboundFailures24h,
      outboundFailures24h,
      lastInboundSuccessAt: toIsoString(lastInboundSuccess?.createdAt),
      lastOutboundSuccessAt: toIsoString(lastOutboundSuccess?.createdAt),
    },
  };
}
