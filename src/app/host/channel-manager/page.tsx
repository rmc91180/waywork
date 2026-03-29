import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildHostListingScope } from "@/lib/host-access";
import { isSiteMinderProviderActive } from "@/lib/pms/provider-mode";
import { Badge } from "@/components/ui/badge";
import { HostPageHeader } from "@/components/host/host-page-header";
import { HostChannelManagerControlPanel } from "@/components/host/host-channel-manager-control-panel";

export const metadata = {
  title: "Channel Manager",
};

export default async function HostChannelManagerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fhost%2Fchannel-manager");

  const hostId = session.user.id;

  const [listings, connection] = await Promise.all([
    db.listing.findMany({
      where: buildHostListingScope(hostId),
      select: {
        id: true,
        title: true,
        status: true,
        pmsExternalListingId: true,
        pmsExternalRatePlanId: true,
        pmsSyncStatus: true,
        pmsSyncError: true,
        pmsLastSyncedAt: true,
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
  ]);

  const mappedListings = listings.filter((listing) => Boolean(listing.pmsExternalListingId)).length;
  const providerActive = isSiteMinderProviderActive();

  return (
    <div className="waywork-shell py-8 md:py-10">
      <HostPageHeader
        eyebrow="Host workspace"
        title="PMS"
        description="Connect SiteMinder, map listings, and keep sync settings in one place."
        aside={
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant={providerActive ? "default" : "secondary"}>
              {providerActive ? "SiteMinder active" : "SiteMinder inactive"}
            </Badge>
            <Badge variant="outline">
              {mappedListings}/{listings.length} mapped
            </Badge>
          </div>
        }
      />

      <section className="mt-6">
        <HostChannelManagerControlPanel
          connection={{
            id: connection?.id ?? null,
            enabled: connection?.enabled ?? false,
            apiBaseUrl: connection?.siteminderApiBaseUrl ?? "https://api.siteminder.com",
            hasClientId: Boolean(connection?.siteminderClientId),
            hasClientSecret: Boolean(connection?.siteminderClientSecret),
            propertyId: connection?.siteminderPropertyId ?? null,
            hasWebhookSecret: Boolean(connection?.siteminderWebhookSecret),
            updatedAt: connection?.updatedAt?.toISOString() ?? null,
          }}
          listings={listings.map((listing) => ({
            id: listing.id,
            title: listing.title,
            status: listing.status,
            pmsExternalListingId: listing.pmsExternalListingId,
            pmsExternalRatePlanId: listing.pmsExternalRatePlanId,
            pmsSyncStatus: listing.pmsSyncStatus,
            pmsSyncError: listing.pmsSyncError,
            pmsLastSyncedAt: listing.pmsLastSyncedAt?.toISOString() ?? null,
          }))}
        />
      </section>
    </div>
  );
}
