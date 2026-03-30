import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BookOpenCheck,
  CalendarCheck2,
  CircleDollarSign,
  Network,
  PlusCircle,
  Wallet,
  Wrench,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { buildHostListingScope } from "@/lib/host-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HostPageHeader } from "@/components/host/host-page-header";
import { HostTeamAccessPanel } from "@/components/host/host-team-access-panel";
import {
  HostOnboardingChecklist,
  type HostOnboardingStep,
} from "@/components/host/host-onboarding-checklist";
import { HostAirbnbImportCard } from "@/components/host/host-airbnb-import-card";
import { getActivePmsProviderMode } from "@/lib/pms/provider-mode";

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
  let siteMinderConnection: {
    id: string;
    enabled: boolean;
    siteminderClientId: string | null;
    siteminderClientSecret: string | null;
    siteminderWebhookSecret: string | null;
  } | null = null;
  let apaleoConnection: {
    id: string;
    enabled: boolean;
    apaleoClientId: string | null;
    apaleoClientSecret: string | null;
    apaleoRefreshToken: string | null;
    apaleoWebhookSecret: string | null;
  } | null = null;
  let hostPayoutProfile: {
    stripeConnectAccountId: string | null;
  } | null = null;
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
      apaleo,
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
          provider: "SITEMINDER",
        },
        select: {
          id: true,
          enabled: true,
          siteminderClientId: true,
          siteminderClientSecret: true,
          siteminderWebhookSecret: true,
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
          apaleoClientId: true,
          apaleoClientSecret: true,
          apaleoRefreshToken: true,
          apaleoWebhookSecret: true,
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
    siteMinderConnection = connection;
    apaleoConnection = apaleo;
    hostPayoutProfile = payoutProfile;
    ownerListingsForTeamAccess = ownerListings;
    upcomingBookings = upcoming;
    pendingBookings = pending;
    totalBookings = allBookings;
    grossRevenue = payouts._sum.hostPayout ?? 0;
    recentSyncEvents = syncEvents;
  } catch (error) {
    console.error("[host/dashboard] failed to load host metrics", error);
  }

  const totalListings = listings.length;
  const activeListings = listings.filter((listing) => listing.status === "ACTIVE").length;
  const syncManagedListings = listings.filter((listing) => ["ACTIVE", "PAUSED"].includes(listing.status));
  const mappedListings = listings.filter((listing) => Boolean(listing.pmsExternalListingId)).length;
  const mappedSyncManagedListings = syncManagedListings.filter((listing) => Boolean(listing.pmsExternalListingId)).length;
  const syncedListings = listings.filter((listing) => listing.pmsSyncStatus === "SYNCED").length;
  const failedSyncListings = listings.filter((listing) => listing.pmsSyncStatus === "FAILED").length;
  const siteMinderConfigured =
    Boolean(siteMinderConnection?.siteminderClientId) &&
    Boolean(siteMinderConnection?.siteminderClientSecret);
  const apaleoConfigured =
    Boolean(apaleoConnection?.apaleoClientId) &&
    Boolean(apaleoConnection?.apaleoClientSecret);
  const connectedPms =
    (siteMinderConfigured && Boolean(siteMinderConnection?.enabled)) ||
    (apaleoConfigured && Boolean(apaleoConnection?.enabled));
  const webhookConfigured =
    Boolean(siteMinderConnection?.siteminderWebhookSecret) ||
    (Boolean(apaleoConnection?.apaleoWebhookSecret) && Boolean(apaleoConnection?.apaleoRefreshToken));
  const payoutsReady = Boolean(hostPayoutProfile?.stripeConnectAccountId);
  const activeProviderMode = getActivePmsProviderMode();
  const providerActive = activeProviderMode !== "NONE";

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
      id: "connect-pms",
      title: "Connect your PMS",
      description: "Link your property system so inventory and booking sync can be managed in one place.",
      complete: connectedPms,
      href: "/host/channel-manager",
      ctaLabel: "Connect PMS",
    },
    {
      id: "map-listings",
      title: "Map your live listings",
      description: "Match each active listing to the correct external property and rate plan.",
      complete:
        syncManagedListings.length > 0 &&
        mappedSyncManagedListings === syncManagedListings.length,
      href: "/host/channel-manager",
      ctaLabel: "Map Listings",
    },
    {
      id: "enable-live-sync",
      title: "Enable live sync",
      description: "Finish PMS verification so rates, availability, and booking updates flow automatically.",
      complete: webhookConfigured,
      href: "/host/channel-manager",
      ctaLabel: "Finish Sync Setup",
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
      <HostPageHeader
        eyebrow="Host workspace"
        title={`Welcome back, ${session.user.name || "Host"}`}
        description="Everything important in one place: listings, bookings, payouts, and PMS setup."
        actions={
          <>
            <Button asChild className="bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]">
              <Link href="/host/listings/new">
                <PlusCircle className="size-4" />
                New Listing
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/host/bookings">
                <BookOpenCheck className="size-4" />
                Bookings
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/host/channel-manager">
                <Network className="size-4" />
                PMS
              </Link>
            </Button>
          </>
        }
        aside={
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant={providerActive ? "default" : "secondary"}>
              {providerActive ? `Live mode: ${activeProviderMode}` : "PMS inactive"}
            </Badge>
            <Badge variant={connectedPms ? "default" : "secondary"}>
              {connectedPms ? "Connected" : "Needs setup"}
            </Badge>
          </div>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Listings</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{totalListings}</p>
          <p className="mt-1 text-sm text-slate-600">{activeListings} active</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Upcoming</p>
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
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Host revenue</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{formatCurrency(grossRevenue)}</p>
          <p className="mt-1 text-sm text-slate-600">
            {failedSyncListings > 0
              ? `${failedSyncListings} sync issue${failedSyncListings === 1 ? "" : "s"} to review`
              : "No current sync issues"}
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <HostOnboardingChecklist steps={onboardingSteps} />

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--ww-primary-blue)]">At a glance</h2>
            <Badge variant="outline">{mappedListings}/{totalListings} mapped</Badge>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Listings synced</p>
              <p className="mt-1 text-sm text-slate-600">
                {syncedListings} synced, {failedSyncListings} failed
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Payout profile</p>
              <p className="mt-1 text-sm text-slate-600">
                {payoutsReady ? "Ready to receive payouts" : "Needs Stripe setup"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">PMS mapping</p>
              <p className="mt-1 text-sm text-slate-600">
                {mappedSyncManagedListings}/{syncManagedListings.length} live listings mapped
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/host/listings">
                <Wrench className="size-4" />
                Listings
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/host/payouts">
                <Wallet className="size-4" />
                Payouts
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/host/calendar">
                <CalendarCheck2 className="size-4" />
                Calendar
              </Link>
            </Button>
          </div>
        </article>
      </section>

      <section className="mt-6">
        <HostAirbnbImportCard />
      </section>

      {ownerListingsForTeamAccess.length > 0 ? (
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
      ) : null}

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--ww-primary-blue)]">Listings</h2>
            <Badge variant="outline">{totalListings}</Badge>
          </div>
          {listings.length === 0 ? (
            <p className="text-sm text-slate-600">
              No listings yet. Create one to start hosting.
            </p>
          ) : (
            <div className="space-y-3">
              {listings.slice(0, 6).map((listing) => (
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
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/host/listings/${listing.id}`}>Edit</Link>
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
              Recent activity
            </h2>
            <Badge variant="outline">{recentSyncEvents.length}</Badge>
          </div>
          {recentSyncEvents.length === 0 ? (
            <p className="text-sm text-slate-600">
              No PMS sync events yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentSyncEvents.slice(0, 6).map((event) => (
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
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
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
              <Link href="/host/channel-manager">
                <Network className="size-4" />
                Open PMS
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/host/earnings">
                <CircleDollarSign className="size-4" />
                Earnings
              </Link>
            </Button>
          </div>
        </article>
      </section>
    </div>
  );
}
