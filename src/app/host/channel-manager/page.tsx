import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildHostListingScope } from "@/lib/host-access";
import { isSiteMinderProviderActive } from "@/lib/pms/provider-mode";
import { Badge } from "@/components/ui/badge";
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
      <section className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
          Host Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
          Channel Manager
        </h1>
        <p className="mt-2 text-sm text-[var(--ww-text-primary)] md:text-base">
          SiteMinder is the active PMS direction for OTA-grade listing, calendar, and booking synchronization.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={providerActive ? "default" : "secondary"}>
            {providerActive ? "SiteMinder Mode Active" : "SiteMinder Mode Disabled"}
          </Badge>
          <Badge variant="outline">
            {mappedListings}/{listings.length} listings mapped
          </Badge>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        SiteMinder sync adapters are staged for rollout. Credential management and mapping are live in this release.
      </section>

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
