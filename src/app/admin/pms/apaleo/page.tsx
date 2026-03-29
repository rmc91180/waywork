import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApaleoPilotOpsPanel } from "@/components/admin/apaleo-pilot-ops-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bookingCommissionBpsToPercent } from "@/lib/payout-config";
import { getApaleoPilotPreflightSummary } from "@/lib/pms/apaleo-pilot-preflight";
import { getApaleoPilotReadinessSummary } from "@/lib/pms/apaleo-pilot-readiness";

const readinessBadgeClasses: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-800 border-emerald-200",
  YELLOW: "bg-amber-100 text-amber-800 border-amber-200",
  RED: "bg-rose-100 text-rose-800 border-rose-200",
};

const preflightBadgeClasses: Record<string, string> = {
  ACTION_REQUIRED: "bg-rose-100 text-rose-800 border-rose-200",
  READY_FOR_CREDENTIAL_INPUT: "bg-sky-100 text-sky-800 border-sky-200",
  READY_FOR_LIVE_CUTOVER: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function formatRelativeTimestamp(value: string | null) {
  if (!value) return "Never";
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export default async function AdminApaleoPilotPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const [summary, preflight, pilotConnection, recentListings] = await Promise.all([
    getApaleoPilotReadinessSummary(),
    getApaleoPilotPreflightSummary(),
    db.pmsConnection.findFirst({
      where: { provider: "APALEO" },
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      select: {
        apaleoAccountCode: true,
        bookingCommissionBps: true,
        user: {
          select: {
            email: true,
            name: true,
            stripeConnectAccountId: true,
            defaultBookingCommissionBps: true,
          },
        },
      },
    }),
    db.listing.findMany({
      where: {
        pmsConnection: { provider: "APALEO" },
        city: { equals: "Madrid", mode: "insensitive" },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        host: {
          select: {
            name: true,
            email: true,
          },
        },
        status: true,
        curationStatus: true,
        pmsSyncStatus: true,
        pmsSyncError: true,
        pmsLastSyncedAt: true,
        pricePerDay: true,
        currency: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Apaleo Pilot Control Room</h1>
            <Badge className={readinessBadgeClasses[summary.readiness] || ""}>
              {summary.readiness}
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Madrid pilot launch status for apaleo-managed inventory. This view pulls the
            operational blockers, review queue, sync health, and payout readiness into one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/listings"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Review Listings
          </Link>
          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-700">
            <p>{summary.connections.enabled} enabled</p>
            <p>{summary.connections.connected} connected</p>
            <p>{summary.connections.expiringAccessTokens} tokens expiring soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Madrid Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-700">
            <p>{summary.listings.importedMadrid} imported listings</p>
            <p>{summary.listings.publishableMadrid} publishable after curation</p>
            <p>{summary.listings.activeMadrid} active on-site</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Review Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-700">
            <p>{summary.listings.needsReviewMadrid} need curation review</p>
            <p>{summary.listings.pendingAdminReviewMadrid} pending admin approval</p>
            <p>{summary.listings.rejectedMadrid} rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sync + Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-700">
            <p>{summary.listings.listingsWithSyncErrors} listings with sync issues</p>
            <p>{summary.listings.activeMissingStripeConnect} active missing Stripe Connect</p>
            <p>{summary.events.outboundFailures24h} outbound failures in 24h</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg">Pilot Preflight</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                This is the launch filter: everything operational should be green before we switch
                over to real Limehome credentials.
              </p>
            </div>
            <Badge className={preflightBadgeClasses[preflight.state] || ""}>
              {preflight.state.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">{preflight.recommendedNextStep}</p>
            {preflight.onlyCredentialsRemain && (
              <p className="mt-2 text-sm text-sky-700">
                All remaining launch work is credential entry and live partner hookup.
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Completed</h2>
              {preflight.completed.length === 0 ? (
                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Nothing has been marked complete yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-emerald-700">
                  {preflight.completed.map((item) => (
                    <li key={item} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Remaining Non-Credential Tasks</h2>
              {preflight.nonCredentialTasks.length === 0 ? (
                <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  No non-credential tasks remain.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-rose-700">
                  {preflight.nonCredentialTasks.map((item) => (
                    <li key={item} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Remaining Credential Inputs</h2>
              {preflight.credentialTasks.length === 0 ? (
                <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  All required credential inputs are present.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-sky-700">
                  {preflight.credentialTasks.map((item) => (
                    <li key={item} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {[
              { title: "Environment", items: preflight.credentialChecks.environment },
              { title: "Apaleo Connection", items: preflight.credentialChecks.apaleoConnection },
              { title: "Host Payout", items: preflight.credentialChecks.hostPayout },
            ].map((section) => (
              <div key={section.title} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                <div className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        item.status === "READY"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-sky-200 bg-sky-50 text-sky-700"
                      }`}
                    >
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-1 text-xs">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Launch Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last inbound success
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {formatRelativeTimestamp(summary.events.lastInboundSuccessAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last outbound success
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {formatRelativeTimestamp(summary.events.lastOutboundSuccessAt)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Blockers</h2>
                  {summary.blockers.length === 0 ? (
                    <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      No launch blockers detected.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm text-rose-700">
                      {summary.blockers.map((blocker) => (
                        <li key={blocker} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Warnings</h2>
                  {summary.warnings.length === 0 ? (
                    <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      No launch warnings detected.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm text-amber-700">
                      {summary.warnings.map((warning) => (
                        <li key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <ApaleoPilotOpsPanel
            defaultHostEmail={pilotConnection?.user.email}
            defaultHostName={pilotConnection?.user.name}
            defaultAccountCode={pilotConnection?.apaleoAccountCode}
            defaultStripeConnectAccountId={pilotConnection?.user.stripeConnectAccountId}
            defaultBookingCommissionPercent={bookingCommissionBpsToPercent(
              pilotConnection?.bookingCommissionBps ??
                pilotConnection?.user.defaultBookingCommissionBps
            )}
          />
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Madrid Review Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentListings.length === 0 ? (
              <p className="text-sm text-slate-500">No Madrid apaleo listings found yet.</p>
            ) : (
              recentListings.map((listing) => (
                <div key={listing.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/spaces/${listing.id}`} className="font-medium hover:underline">
                        {listing.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {listing.host.name || listing.host.email} · {listing.host.email}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{listing.status.replace(/_/g, " ")}</p>
                      <p>{listing.curationStatus.replace(/_/g, " ")}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      Sync: {listing.pmsSyncStatus}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: listing.currency,
                        maximumFractionDigits: 0,
                      }).format(listing.pricePerDay / 100)}
                      /day
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      Last synced:{" "}
                      {formatRelativeTimestamp(listing.pmsLastSyncedAt?.toISOString() || null)}
                    </span>
                  </div>

                  {listing.pmsSyncError && (
                    <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {listing.pmsSyncError}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
