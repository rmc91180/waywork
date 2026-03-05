import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BookOpenCheck,
  CalendarCheck2,
  CircleDollarSign,
  LayoutDashboard,
  PlusCircle,
  Wallet,
  Wrench,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { buildHostListingScope } from "@/lib/host-access";
import { computeMewsConnectionHealth, type MewsHealthSnapshot } from "@/lib/pms/mews-health";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HostMewsControlPanel } from "@/components/host/host-mews-control-panel";
import { HostSyncDiagnostics } from "@/components/host/host-sync-diagnostics";
import { HostTeamAccessPanel } from "@/components/host/host-team-access-panel";
import {
  HostOnboardingChecklist,
  type HostOnboardingStep,
} from "@/components/host/host-onboarding-checklist";

const LISTING_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  ACTIVE: "Active",
  PAUSED: "Paused",
  REJECTED: "Rejected",
};

function formatDateTime(value: Date | null) {
  if (!value) return "Never";
  return value.toLocaleString();
}

export default async function HostDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fhost");
  }

  const hostId = session.user.id;
  let listings: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: Date;
    pmsExternalListingId: string | null;
    pmsExternalRatePlanId: string | null;
    pmsSyncStatus: string;
    pmsSyncError: string | null;
    pmsLastSyncedAt: Date | null;
    _count: { bookings: number };
  }> = [];
  let mewsConnection: {
    id: string;
    enabled: boolean;
    mewsApiBaseUrl: string;
    mewsClientName: string;
    mewsClientToken: string | null;
    mewsConnectionToken: string | null;
    mewsAccessToken: string | null;
    mewsEnterpriseId: string | null;
    updatedAt: Date;
  } | null = null;
  let hostPayoutProfile: {
    stripeConnectAccountId: string | null;
  } | null = null;
  let mewsHealth: MewsHealthSnapshot | null = null;
  let ownerListingsForTeamAccess: Array<{
    id: string;
    title: string;
    host: { name: string | null };
    teamMembers: Array<{
      role: "OWNER" | "MANAGER";
      user: { id: string; name: string | null; email: string };
    }>;
  }> = [];
  let recentSyncEvents: Array<{
    id: string;
    direction: string;
    action: string;
    success: boolean;
    error: string | null;
    messageId: string | null;
    createdAt: Date;
    listing: { title: string } | null;
    bookingId: string | null;
  }> = [];

  let upcomingBookings = 0;
  let pendingBookings = 0;
  let totalBookings = 0;
  let grossRevenue = 0;

  try {
    const [
      hostListings,
      connection,
      upcoming,
      payoutProfile,
      pending,
      allBookings,
      payouts,
      syncEvents,
      ownerListings,
    ] = await Promise.all([
      db.listing.findMany({
        where: buildHostListingScope(hostId),
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          pmsExternalListingId: true,
          pmsExternalRatePlanId: true,
          pmsSyncStatus: true,
          pmsSyncError: true,
          pmsLastSyncedAt: true,
          _count: { select: { bookings: true } },
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      db.pmsConnection.findFirst({
        where: {
          userId: hostId,
          provider: "MEWS",
        },
        select: {
          id: true,
          enabled: true,
          mewsApiBaseUrl: true,
          mewsClientName: true,
          mewsClientToken: true,
          mewsConnectionToken: true,
          mewsAccessToken: true,
          mewsEnterpriseId: true,
          updatedAt: true,
        },
      }),
      db.booking.count({
        where: {
          listing: { hostId },
          status: "CONFIRMED",
          checkIn: { gte: new Date() },
        },
      }),
      db.user.findUnique({
        where: { id: hostId },
        select: { stripeConnectAccountId: true },
      }),
      db.booking.count({
        where: {
          listing: { hostId },
          status: "PENDING",
        },
      }),
      db.booking.count({
        where: { listing: { hostId } },
      }),
      db.booking.aggregate({
        _sum: { hostPayout: true },
        where: {
          listing: { hostId },
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
      }),
      db.pmsSyncEvent.findMany({
        where: {
          connection: {
            userId: hostId,
            provider: "MEWS",
          },
        },
        select: {
          id: true,
          direction: true,
          action: true,
          success: true,
          error: true,
          messageId: true,
          createdAt: true,
          listing: { select: { title: true } },
          bookingId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.listing.findMany({
        where: { hostId },
        select: {
          id: true,
          title: true,
          host: { select: { name: true } },
          teamMembers: {
            where: { role: "MANAGER" },
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    listings = hostListings;
    mewsConnection = connection;
    hostPayoutProfile = payoutProfile;
    ownerListingsForTeamAccess = ownerListings;
    upcomingBookings = upcoming;
    pendingBookings = pending;
    totalBookings = allBookings;
    grossRevenue = payouts._sum.hostPayout ?? 0;
    recentSyncEvents = syncEvents;
    if (connection) {
      mewsHealth = await computeMewsConnectionHealth(connection.id);
    }
  } catch (error) {
    console.error("[host/dashboard] failed to load host metrics", error);
  }

  const totalListings = listings.length;
  const activeListings = listings.filter((listing) => listing.status === "ACTIVE").length;
  const syncManagedListings = listings.filter((listing) =>
    ["ACTIVE", "PAUSED"].includes(listing.status)
  );
  const mappedListings = listings.filter((listing) => Boolean(listing.pmsExternalListingId)).length;
  const mappedSyncManagedListings = syncManagedListings.filter((listing) =>
    Boolean(listing.pmsExternalListingId)
  ).length;
  const syncedListings = listings.filter((listing) => listing.pmsSyncStatus === "SYNCED").length;
  const failedSyncListings = listings.filter((listing) => listing.pmsSyncStatus === "FAILED").length;
  const mewsConnected =
    Boolean(mewsConnection?.mewsClientToken) && Boolean(mewsConnection?.mewsConnectionToken);
  const hasSuccessfulAriRequest = recentSyncEvents.some(
    (event) => event.action === "REQUEST_ARI_UPDATE" && event.success
  );
  const payoutsReady = Boolean(hostPayoutProfile?.stripeConnectAccountId);

  const onboardingSteps: HostOnboardingStep[] = [
    {
      id: "create-listing",
      title: "Create your first listing",
      description: "Add at least one listing so guests can discover your space.",
      complete: totalListings > 0,
      href: "/host/listings/new",
      ctaLabel: "Create Listing",
    },
    {
      id: "activate-listing",
      title: "Publish an active listing",
      description: "Keep at least one listing active to accept bookings.",
      complete: activeListings > 0,
      href: "/host/listings",
      ctaLabel: "Manage Status",
    },
    {
      id: "connect-mews",
      title: "Connect Mews credentials",
      description: "Enable channel manager credentials for two-way PMS sync.",
      complete: mewsConnected && Boolean(mewsConnection?.enabled),
      href: "/host#pms-sync-control",
      ctaLabel: "Connect Mews",
    },
    {
      id: "map-listings",
      title: "Map listings to Mews IDs",
      description: "Map each listing to Mews SpaceTypeCode and optional RatePlanCode.",
      complete:
        syncManagedListings.length > 0 &&
        mappedSyncManagedListings === syncManagedListings.length,
      href: "/host#pms-sync-control",
      ctaLabel: "Map Listings",
    },
    {
      id: "request-ari",
      title: "Request initial ARI sync",
      description: "Send an ARI update request to align rates and availability.",
      complete: hasSuccessfulAriRequest,
      href: "/host#pms-sync-control",
      ctaLabel: "Request ARI",
    },
    {
      id: "payouts",
      title: "Prepare payout profile",
      description: "Connect payouts so host revenue can flow to your account.",
      complete: payoutsReady,
      href: "/host/payouts",
      ctaLabel: "Set Up Payouts",
    },
  ];

  return (
    <div className="waywork-shell py-8 md:py-10">
      <section className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
          Host Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)] md:text-4xl">
          Welcome back, {session.user.name || "Host"}
        </h1>
        <p className="mt-2 text-sm text-[var(--ww-text-primary)] md:text-base">
          Create, monitor, and optimize listings from one control center. Mews channel manager sync
          runs two-way, while direct host controls remain available for every listing.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]">
            <Link href="/host/listings/new">
              <PlusCircle className="size-4" />
              Add New Listing
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/host/listings">
              <LayoutDashboard className="size-4" />
              Manage Listings
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/host/calendar">
              <CalendarCheck2 className="size-4" />
              Calendar
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/host/earnings">
              <Wallet className="size-4" />
              Earnings
            </Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={mewsConnected && mewsConnection?.enabled ? "default" : "secondary"}>
            {mewsConnected && mewsConnection?.enabled
              ? "Mews Two-Way Sync Active"
              : "Mews Setup Required"}
          </Badge>
          <Badge variant="outline">
            {mappedListings}/{totalListings} listings mapped
          </Badge>
          <Badge variant="outline">{syncedListings} listings synced</Badge>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Listings</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{totalListings}</p>
          <p className="mt-1 text-sm text-slate-600">{activeListings} active</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Upcoming Confirmed</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{upcomingBookings}</p>
          <p className="mt-1 text-sm text-slate-600">confirmed bookings</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{pendingBookings}</p>
          <p className="mt-1 text-sm text-slate-600">
            {totalBookings} total booking{totalBookings === 1 ? "" : "s"}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gross Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{formatCurrency(grossRevenue)}</p>
          <p className="mt-1 text-sm text-slate-600">confirmed + completed payouts</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Mews Sync Failures</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{failedSyncListings}</p>
          <p className="mt-1 text-sm text-slate-600">listings requiring attention</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Link
          href="/host/bookings"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <BookOpenCheck className="size-5 text-[var(--ww-secondary-green)]" />
          <h2 className="mt-3 text-lg font-semibold text-[var(--ww-primary-blue)]">Host Bookings</h2>
          <p className="mt-1 text-sm text-slate-600">Confirm, review, and manage guest reservations.</p>
        </Link>
        <Link
          href="/host/calendar"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <CalendarCheck2 className="size-5 text-[var(--ww-secondary-green)]" />
          <h2 className="mt-3 text-lg font-semibold text-[var(--ww-primary-blue)]">Availability Calendar</h2>
          <p className="mt-1 text-sm text-slate-600">Block dates and keep availability accurate.</p>
        </Link>
        <Link
          href="/host/earnings"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <CircleDollarSign className="size-5 text-[var(--ww-secondary-green)]" />
          <h2 className="mt-3 text-lg font-semibold text-[var(--ww-primary-blue)]">Revenue & Payouts</h2>
          <p className="mt-1 text-sm text-slate-600">Track performance and prep your payout setup.</p>
        </Link>
      </section>

      <section className="mt-6">
        <HostOnboardingChecklist steps={onboardingSteps} />
      </section>

      <section className="mt-6">
        <HostSyncDiagnostics
          connectionId={mewsConnection?.id ?? null}
          connectionEnabled={Boolean(mewsConnection?.enabled)}
          hasClientToken={Boolean(mewsConnection?.mewsClientToken)}
          hasConnectionToken={Boolean(mewsConnection?.mewsConnectionToken)}
          hasAccessToken={Boolean(mewsConnection?.mewsAccessToken)}
          hasEnterpriseId={Boolean(mewsConnection?.mewsEnterpriseId)}
          healthScore={mewsHealth?.score ?? 0}
          mappedManagedListings={mewsHealth?.mappedManagedListings ?? 0}
          managedListings={mewsHealth?.managedListings ?? 0}
          outboundSuccessCount={mewsHealth?.outboundSuccessCount ?? 0}
          outboundFailureCount={mewsHealth?.outboundFailureCount ?? 0}
          inboundSuccessCount={mewsHealth?.inboundSuccessCount ?? 0}
          inboundFailureCount={mewsHealth?.inboundFailureCount ?? 0}
          pendingJobs={mewsHealth?.pendingJobCount ?? 0}
          failedJobs={mewsHealth?.failedJobCount ?? 0}
          deadLetterJobs={mewsHealth?.deadLetterJobCount ?? 0}
          lastSuccessAt={mewsHealth?.lastSuccessAt?.toISOString() ?? null}
          lastFailureAt={mewsHealth?.lastFailureAt?.toISOString() ?? null}
        />
      </section>

      <section className="mt-6">
        <HostMewsControlPanel
          connection={{
            id: mewsConnection?.id ?? null,
            enabled: mewsConnection?.enabled ?? false,
            mewsApiBaseUrl: mewsConnection?.mewsApiBaseUrl ?? "https://api.mews.com",
            mewsClientName: mewsConnection?.mewsClientName ?? "WayWork PMS Sync/1.0",
            hasClientToken: Boolean(mewsConnection?.mewsClientToken),
            hasConnectionToken: Boolean(mewsConnection?.mewsConnectionToken),
            hasAccessToken: Boolean(mewsConnection?.mewsAccessToken),
            hasEnterpriseId: Boolean(mewsConnection?.mewsEnterpriseId),
            updatedAt: mewsConnection?.updatedAt?.toISOString() ?? null,
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

      <section className="mt-6">
        <HostTeamAccessPanel
          listings={ownerListingsForTeamAccess.map((listing) => ({
            listingId: listing.id,
            title: listing.title,
            ownerName: listing.host.name,
            managers: listing.teamMembers.map((teamMember) => ({
              userId: teamMember.user.id,
              name: teamMember.user.name,
              email: teamMember.user.email,
              role: teamMember.role,
            })),
          }))}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--ww-primary-blue)]">
              Listing Monitor
            </h2>
            <Badge variant="outline">{totalListings} listings</Badge>
          </div>
          {listings.length === 0 ? (
            <p className="text-sm text-slate-600">
              No listings yet. Create one to start host operations and PMS mapping.
            </p>
          ) : (
            <div className="space-y-3">
              {listings.slice(0, 8).map((listing) => (
                <div key={listing.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{listing.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="outline">
                          {LISTING_STATUS_LABEL[listing.status] || listing.status}
                        </Badge>
                        <Badge
                          variant={listing.pmsSyncStatus === "FAILED" ? "destructive" : "outline"}
                        >
                          {listing.pmsSyncStatus}
                        </Badge>
                        <Badge variant="outline">{listing._count.bookings} bookings</Badge>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Updated {formatDateTime(listing.updatedAt)}</p>
                      <p>Last sync {formatDateTime(listing.pmsLastSyncedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/host/listings/${listing.id}`}>Edit Listing</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/host/calendar">Open Calendar</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--ww-primary-blue)]">
              <Activity className="size-4" />
              Recent PMS Sync Events
            </h2>
            <Badge variant="outline">{recentSyncEvents.length}</Badge>
          </div>
          {recentSyncEvents.length === 0 ? (
            <p className="text-sm text-slate-600">
              No PMS sync events yet. Save Mews settings and request ARI updates to begin two-way
              synchronization.
            </p>
          ) : (
            <div className="space-y-3">
              {recentSyncEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{event.action}</p>
                      <p className="text-xs text-slate-500">
                        {event.direction} • {event.listing?.title || "Unassigned listing"}
                      </p>
                    </div>
                    <Badge variant={event.success ? "default" : "destructive"}>
                      {event.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(event.createdAt)}
                    {event.messageId ? ` • Message ${event.messageId}` : ""}
                    {event.bookingId ? ` • Booking ${event.bookingId}` : ""}
                  </p>
                  {event.error ? (
                    <div className="mt-2 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                      {event.error}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/host/bookings">
                <BookOpenCheck className="size-4" />
                Check Booking Queue
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/host/listings">
                <Wrench className="size-4" />
                Direct Listing Controls
              </Link>
            </Button>
          </div>
        </article>
      </section>
    </div>
  );
}
