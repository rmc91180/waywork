import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPilotAnalyticsDashboard } from "@/lib/pilot-analytics";

function FunnelCard({
  title,
  steps,
}: {
  title: string;
  steps: Array<{
    key: string;
    label: string;
    sessions: number;
    events: number;
    conversionFromPrevious: number | null;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.key}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.events} events</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-slate-900">{step.sessions}</p>
                <p className="text-xs text-slate-500">
                  {step.conversionFromPrevious === null
                    ? "Starting point"
                    : `${step.conversionFromPrevious}% from previous`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const dashboard = await getPilotAnalyticsDashboard(30);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Pilot Analytics
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Limehome Launch Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Guest funnel activity for the last {dashboard.windowDays} days, with a
            dedicated view of Madrid apaleo-managed inventory.
          </p>
        </div>
        <Link
          href="/admin/dashboard"
          className="text-sm font-medium text-[var(--ww-ink)] hover:underline"
        >
          Back to admin dashboard
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">All analytics events</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{dashboard.totals.totalEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Unique guest sessions</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{dashboard.totals.uniqueSessions}</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-200 bg-cyan-50/60">
          <CardContent className="p-5">
            <p className="text-sm text-cyan-800">Limehome pilot events</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{dashboard.totals.limehomeEvents}</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-200 bg-cyan-50/60">
          <CardContent className="p-5">
            <p className="text-sm text-cyan-800">Limehome unique sessions</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{dashboard.totals.limehomeSessions}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelCard title="Guest Funnel" steps={dashboard.guestFunnel} />
        <FunnelCard title="Limehome Funnel" steps={dashboard.limehomeFunnel} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Limehome Madrid Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.topLimehomeListings.map((listing) => (
                <div
                  key={listing.listingId}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{listing.title}</p>
                      <p className="text-sm text-slate-500">{listing.city}</p>
                    </div>
                    {listing.propertyId ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {listing.propertyId}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Clicks</p>
                      <p className="text-lg font-semibold text-slate-900">{listing.resultClicks}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Views</p>
                      <p className="text-lg font-semibold text-slate-900">{listing.propertyViews}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Checkouts</p>
                      <p className="text-lg font-semibold text-slate-900">{listing.checkoutStarts}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Team Requests</p>
                      <p className="text-lg font-semibold text-slate-900">{listing.teamStayRequests}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Booking Progress</p>
                      <p className="text-lg font-semibold text-slate-900">{listing.bookingProgressions}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.dailyActivity.map((day) => (
              <div
                key={day.day}
                className="grid grid-cols-[110px_1fr_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-sm font-medium text-slate-900">{day.day}</p>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Site events</p>
                  <p className="text-base font-semibold text-slate-900">{day.siteEvents}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Limehome events</p>
                  <p className="text-base font-semibold text-slate-900">{day.limehomeEvents}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
