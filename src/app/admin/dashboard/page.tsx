import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { getPilotAnalyticsDashboard } from "@/lib/pilot-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeedDemoDataButton } from "@/components/admin/seed-demo-data-button";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const [
    totalUsers,
    totalHosts,
    totalListings,
    activeListings,
    pendingListings,
    totalBookings,
    confirmedBookings,
    totalReviews,
    revenueResult,
    pilotAnalytics,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "HOST" } }),
    db.listing.count(),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.listing.count({ where: { status: "PENDING_REVIEW" } }),
    db.booking.count(),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    db.review.count(),
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      _sum: { totalPrice: true },
    }),
    getPilotAnalyticsDashboard(14),
  ]);

  const totalRevenue = revenueResult._sum.totalPrice || 0;

  const stats = [
    { label: "Total Users", value: totalUsers, href: "/admin/users" },
    { label: "Hosts", value: totalHosts, href: "/admin/users" },
    { label: "Total Listings", value: totalListings, href: "/admin/listings" },
    { label: "Active Listings", value: activeListings, href: "/admin/listings" },
    { label: "Pending Review", value: pendingListings, href: "/admin/listings", highlight: pendingListings > 0 },
    { label: "Total Bookings", value: totalBookings, href: "/admin/bookings" },
    { label: "Confirmed Bookings", value: confirmedBookings, href: "/admin/bookings" },
    { label: "Total Reviews", value: totalReviews, href: null },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {pendingListings > 0 && (
          <Button asChild>
            <Link href="/admin/listings">
              Review {pendingListings} Pending Listing{pendingListings > 1 ? "s" : ""}
            </Link>
          </Button>
        )}
      </div>

      {/* Revenue card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="p-6">
          <p className="text-blue-100 text-sm">Total Platform Revenue</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
          <p className="text-blue-200 text-xs mt-1">
            From {confirmedBookings} confirmed bookings
          </p>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={stat.highlight ? "border-yellow-300 bg-yellow-50" : ""}
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              {stat.href && (
                <Link
                  href={stat.href}
                  className="text-xs text-blue-600 hover:underline mt-1 block"
                >
                  View →
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-cyan-200 bg-cyan-50/60">
          <CardHeader>
            <CardTitle className="text-lg">Limehome Pilot Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-cyan-800">Events</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{pilotAnalytics.totals.limehomeEvents}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-cyan-800">Sessions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{pilotAnalytics.totals.limehomeSessions}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-cyan-800">Property Views</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {pilotAnalytics.limehomeFunnel.find((step) => step.key === "property_viewed")?.sessions || 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-cyan-800">Checkout Starts</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {pilotAnalytics.limehomeFunnel.find((step) => step.key === "checkout_started")?.sessions || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilot Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pilotAnalytics.limehomeFunnel.slice(0, 4).map((step) => (
              <div key={step.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{step.label}</span>
                <span className="font-semibold text-slate-900">{step.sessions}</span>
              </div>
            ))}
            <Button variant="outline" className="mt-2 w-full justify-start" asChild>
              <Link href="/admin/analytics">Open Launch Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Listings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/listings">Review Pending Listings</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/bookings">View All Bookings</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Apaleo Pilot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/pms/apaleo">Open Control Room</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/analytics">View Pilot Funnel</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demo Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-500">
              Re-seed listings, photos, and amenities for demos.
            </p>
            <SeedDemoDataButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
