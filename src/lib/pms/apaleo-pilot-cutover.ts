import { db } from "@/lib/db";
import { encryptApaleoSecret } from "@/lib/pms/apaleo-crypto";
import { curateApaleoMadridListings } from "@/lib/pms/apaleo-curation";
import {
  importApaleoMadridListings,
  type ImportApaleoMadridListingsResult,
} from "@/lib/pms/apaleo-import";
import {
  fullResyncApaleoConnection,
  setupApaleoSubscriptions,
} from "@/lib/pms/apaleo-sync";
import {
  DEFAULT_BOOKING_COMMISSION_BPS,
  bookingCommissionPercentToBps,
} from "@/lib/payout-config";

export interface PrepareApaleoPilotCutoverInput {
  hostEmail: string;
  hostName?: string;
  accountCode?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  webhookSecret?: string;
  stripeConnectAccountId?: string;
  bookingCommissionPercent?: number | null;
  baseUrl?: string;
  runLaunchSequence?: boolean;
}

export interface PrepareApaleoPilotCutoverResult {
  hostId: string;
  connectionId: string;
  connectionPrepared: boolean;
  launchSequenceRan: boolean;
  oauthStillRequired: boolean;
  importResult?: ImportApaleoMadridListingsResult;
  curationResult?: Awaited<ReturnType<typeof curateApaleoMadridListings>>;
  subscriptionResult?: Awaited<ReturnType<typeof setupApaleoSubscriptions>>;
  resyncResult?: Awaited<ReturnType<typeof fullResyncApaleoConnection>>;
}

function cleanValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveDefaultHostCommissionBps(value: number | null | undefined) {
  return bookingCommissionPercentToBps(value) ?? DEFAULT_BOOKING_COMMISSION_BPS;
}

export async function prepareApaleoPilotCutover(
  input: PrepareApaleoPilotCutoverInput
): Promise<PrepareApaleoPilotCutoverResult> {
  const host = await db.user.upsert({
    where: { email: input.hostEmail },
    update: {
      name: input.hostName?.trim() || undefined,
      role: "HOST",
      stripeConnectAccountId:
        input.stripeConnectAccountId !== undefined
          ? cleanValue(input.stripeConnectAccountId)
          : undefined,
      defaultBookingCommissionBps:
        input.bookingCommissionPercent !== undefined
          ? resolveDefaultHostCommissionBps(input.bookingCommissionPercent)
          : undefined,
    },
    create: {
      email: input.hostEmail,
      name: input.hostName?.trim() || "Limehome",
      role: "HOST",
      stripeConnectAccountId: cleanValue(input.stripeConnectAccountId),
      defaultBookingCommissionBps: resolveDefaultHostCommissionBps(
        input.bookingCommissionPercent
      ),
    },
  });

  const refreshToken = cleanValue(input.refreshToken);

  const connection = await db.pmsConnection.upsert({
    where: {
      userId_provider: {
        userId: host.id,
        provider: "APALEO",
      },
    },
    update: {
      enabled: refreshToken ? true : undefined,
      apaleoApiBaseUrl: "https://api.apaleo.com",
      apaleoIdentityBaseUrl: "https://identity.apaleo.com",
      apaleoClientId:
        input.clientId !== undefined ? cleanValue(input.clientId) : undefined,
      apaleoClientSecret:
        input.clientSecret !== undefined ? cleanValue(input.clientSecret) : undefined,
      apaleoAccountCode:
        input.accountCode !== undefined ? cleanValue(input.accountCode) : undefined,
      apaleoWebhookSecret:
        input.webhookSecret !== undefined ? cleanValue(input.webhookSecret) : undefined,
      apaleoRefreshToken:
        refreshToken !== null ? encryptApaleoSecret(refreshToken) : undefined,
      apaleoConnectedAt: refreshToken ? new Date() : undefined,
      bookingCommissionBps:
        input.bookingCommissionPercent !== undefined
          ? bookingCommissionPercentToBps(input.bookingCommissionPercent)
          : undefined,
    },
    create: {
      userId: host.id,
      provider: "APALEO",
      enabled: Boolean(refreshToken),
      apaleoApiBaseUrl: "https://api.apaleo.com",
      apaleoIdentityBaseUrl: "https://identity.apaleo.com",
      apaleoClientId: cleanValue(input.clientId),
      apaleoClientSecret: cleanValue(input.clientSecret),
      apaleoAccountCode: cleanValue(input.accountCode) || "LIMEHOME-MADRID",
      apaleoWebhookSecret: cleanValue(input.webhookSecret),
      apaleoRefreshToken: refreshToken ? encryptApaleoSecret(refreshToken) : null,
      apaleoConnectedAt: refreshToken ? new Date() : null,
      bookingCommissionBps: bookingCommissionPercentToBps(input.bookingCommissionPercent),
    },
    select: {
      id: true,
      apaleoRefreshToken: true,
    },
  });

  let importResult: ImportApaleoMadridListingsResult | undefined;
  let curationResult: Awaited<ReturnType<typeof curateApaleoMadridListings>> | undefined;
  let subscriptionResult: Awaited<ReturnType<typeof setupApaleoSubscriptions>> | undefined;
  let resyncResult: Awaited<ReturnType<typeof fullResyncApaleoConnection>> | undefined;

  const hasRefreshToken = Boolean(connection.apaleoRefreshToken);
  const shouldRunLaunchSequence = Boolean(input.runLaunchSequence);

  if (shouldRunLaunchSequence) {
    if (!hasRefreshToken) {
      throw new Error(
        "Live cutover requires an apaleo refresh token or completed OAuth before the launch sequence can run."
      );
    }

    importResult = await importApaleoMadridListings({
      hostEmail: input.hostEmail,
      hostName: input.hostName,
      accountCode: input.accountCode,
      useFixtures: false,
    });
    curationResult = await curateApaleoMadridListings({
      hostEmail: input.hostEmail,
      useFixtures: false,
    });
    subscriptionResult = await setupApaleoSubscriptions(connection.id, {
      baseUrl: input.baseUrl,
      useFixtures: false,
    });
    resyncResult = await fullResyncApaleoConnection(connection.id, {
      useFixtures: false,
    });
  }

  return {
    hostId: host.id,
    connectionId: connection.id,
    connectionPrepared: true,
    launchSequenceRan: shouldRunLaunchSequence,
    oauthStillRequired: !hasRefreshToken,
    importResult,
    curationResult,
    subscriptionResult,
    resyncResult,
  };
}
