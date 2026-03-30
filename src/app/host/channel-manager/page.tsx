import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildHostListingScope } from "@/lib/host-access";
import { getActivePmsProviderMode } from "@/lib/pms/provider-mode";
import { Badge } from "@/components/ui/badge";
import { HostApaleoControlPanel } from "@/components/host/host-apaleo-control-panel";
import { HostPageHeader } from "@/components/host/host-page-header";
import { HostChannelManagerControlPanel } from "@/components/host/host-channel-manager-control-panel";
import { HostPmsProviderTabs } from "@/components/host/host-pms-provider-tabs";

export const metadata = {
  title: "PMS Setup",
};

export default async function HostChannelManagerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fhost%2Fchannel-manager");

  const hostId = session.user.id;

  const [listings, siteMinderConnection, apaleoConnection] = await Promise.all([
    db.listing.findMany({
      where: buildHostListingScope(hostId),
      select: {
        id: true,
        title: true,
        status: true,
        pmsExternalPropertyId: true,
        pmsExternalListingId: true,
        pmsExternalUnitGroupId: true,
        pmsExternalRatePlanId: true,
        pmsSyncStatus: true,
        pmsSyncError: true,
        pmsLastSyncedAt: true,
        pmsConnection: {
          select: {
            provider: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    db.pmsConnection.findFirst({
      where: {
        userId: hostId,
        provider: "SITEMINDER",
      },
      select: {
        id: true,
        enabled: true,
        siteminderApiBaseUrl: true,
        siteminderClientId: true,
        siteminderClientSecret: true,
        siteminderPropertyId: true,
        siteminderWebhookSecret: true,
        updatedAt: true,
      },
    }),
    db.pmsConnection.findFirst({
      where: {
        userId: hostId,
        provider: "APALEO",
      },
      select: {
        id: true,
        enabled: true,
        apaleoApiBaseUrl: true,
        apaleoIdentityBaseUrl: true,
        apaleoClientId: true,
        apaleoClientSecret: true,
        apaleoAccountCode: true,
        apaleoRefreshToken: true,
        apaleoConnectedAt: true,
        apaleoLastTokenRefreshAt: true,
        apaleoWebhookSecret: true,
        apaleoWebhookSubscriptionId: true,
        apaleoAriSubscriptionId: true,
        updatedAt: true,
      },
    }),
  ]);

  const activeProviderMode = getActivePmsProviderMode();
  const providerActive = activeProviderMode !== "NONE";
  const mappedListings = listings.filter((listing) => Boolean(listing.pmsExternalListingId)).length;
  const siteMinderListings = listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    status: listing.status,
    pmsExternalListingId:
      listing.pmsConnection?.provider === "SITEMINDER" ? listing.pmsExternalListingId : null,
    pmsExternalRatePlanId:
      listing.pmsConnection?.provider === "SITEMINDER" ? listing.pmsExternalRatePlanId : null,
    pmsSyncStatus: listing.pmsSyncStatus,
    pmsSyncError: listing.pmsSyncError,
    pmsLastSyncedAt: listing.pmsLastSyncedAt?.toISOString() ?? null,
  }));
  const apaleoListings = listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    status: listing.status,
    pmsExternalPropertyId:
      listing.pmsConnection?.provider === "APALEO" ? listing.pmsExternalPropertyId : null,
    pmsExternalUnitGroupId:
      listing.pmsConnection?.provider === "APALEO" ? listing.pmsExternalUnitGroupId : null,
    pmsExternalRatePlanId:
      listing.pmsConnection?.provider === "APALEO" ? listing.pmsExternalRatePlanId : null,
    pmsSyncStatus: listing.pmsSyncStatus,
    pmsSyncError: listing.pmsSyncError,
    pmsLastSyncedAt: listing.pmsLastSyncedAt?.toISOString() ?? null,
  }));
  const defaultProvider =
    apaleoConnection?.enabled || apaleoConnection?.id
      ? "APALEO"
      : siteMinderConnection?.enabled || siteMinderConnection?.id
        ? "SITEMINDER"
        : activeProviderMode === "APALEO"
          ? "APALEO"
          : "SITEMINDER";

  return (
    <div className="waywork-shell py-8 md:py-10">
      <HostPageHeader
        eyebrow="Host workspace"
        title="PMS Setup"
        description="Choose your PMS, connect credentials, map listings, and manage live sync in one place."
        aside={
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant={providerActive ? "default" : "secondary"}>
              {providerActive ? `Live mode: ${activeProviderMode}` : "PMS inactive"}
            </Badge>
            <Badge variant="outline">
              {mappedListings}/{listings.length} mapped
            </Badge>
          </div>
        }
      />

      <section className="mt-6">
        <HostPmsProviderTabs defaultProvider={defaultProvider} activeProviderMode={activeProviderMode}>
          {{
            siteminder: (
              <HostChannelManagerControlPanel
                connection={{
                  id: siteMinderConnection?.id ?? null,
                  enabled: siteMinderConnection?.enabled ?? false,
                  apiBaseUrl:
                    siteMinderConnection?.siteminderApiBaseUrl ?? "https://api.siteminder.com",
                  hasClientId: Boolean(siteMinderConnection?.siteminderClientId),
                  hasClientSecret: Boolean(siteMinderConnection?.siteminderClientSecret),
                  propertyId: siteMinderConnection?.siteminderPropertyId ?? null,
                  hasWebhookSecret: Boolean(siteMinderConnection?.siteminderWebhookSecret),
                  updatedAt: siteMinderConnection?.updatedAt?.toISOString() ?? null,
                }}
                listings={siteMinderListings}
              />
            ),
            apaleo: (
              <HostApaleoControlPanel
                connection={{
                  id: apaleoConnection?.id ?? null,
                  enabled: apaleoConnection?.enabled ?? false,
                  apiBaseUrl: apaleoConnection?.apaleoApiBaseUrl ?? "https://api.apaleo.com",
                  identityBaseUrl:
                    apaleoConnection?.apaleoIdentityBaseUrl ?? "https://identity.apaleo.com",
                  hasClientId: Boolean(apaleoConnection?.apaleoClientId),
                  hasClientSecret: Boolean(apaleoConnection?.apaleoClientSecret),
                  accountCode: apaleoConnection?.apaleoAccountCode ?? null,
                  hasRefreshToken: Boolean(apaleoConnection?.apaleoRefreshToken),
                  hasWebhookSecret: Boolean(apaleoConnection?.apaleoWebhookSecret),
                  webhookSubscriptionId: apaleoConnection?.apaleoWebhookSubscriptionId ?? null,
                  ariSubscriptionId: apaleoConnection?.apaleoAriSubscriptionId ?? null,
                  connectedAt: apaleoConnection?.apaleoConnectedAt?.toISOString() ?? null,
                  lastTokenRefreshAt:
                    apaleoConnection?.apaleoLastTokenRefreshAt?.toISOString() ?? null,
                  updatedAt: apaleoConnection?.updatedAt?.toISOString() ?? null,
                }}
                listings={apaleoListings}
              />
            ),
          }}
        </HostPmsProviderTabs>
      </section>
    </div>
  );
}
