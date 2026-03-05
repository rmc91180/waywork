import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildHostListingScope } from "@/lib/host-access";
import { formatCurrency } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED_BY_GUEST: "bg-red-100 text-red-800",
  CANCELLED_BY_HOST: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

export default async function EarningsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fhost");

  const bookings = await db.booking
    .findMany({
      where: { listing: buildHostListingScope(session.user.id) },
      include: { listing: { select: { id: true, title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    })
    .catch(async (error) => {
      console.error("[host/earnings] fallback to owner-only scope", error);
      return db.booking.findMany({
        where: { listing: { hostId: session.user.id } },
        include: { listing: { select: { id: true, title: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      });
    });

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  const now = new Date();

  const earningBookings = bookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "COMPLETED"
  );

  const totalEarnings = earningBookings.reduce(
    (sum, b) => sum + b.hostPayout,
    0
  );

  const pendingPayouts = bookings
    .filter(
      (b) => b.status === "CONFIRMED" && new Date(b.checkOut) >= now
    )
    .reduce((sum, b) => sum + b.hostPayout, 0);

  const completedPayouts = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.hostPayout, 0);

  const nonCancelledBookings = bookings.filter(
    (b) =>
      b.status !== "CANCELLED_BY_GUEST" &&
      b.status !== "CANCELLED_BY_HOST" &&
      b.status !== "REFUNDED"
  );

  const totalBookings = nonCancelledBookings.length;

  const averageBookingValue =
    totalBookings > 0 ? Math.round(totalEarnings / totalBookings) : 0;

  // ---------------------------------------------------------------------------
  // Monthly breakdown (last 6 months)
  // ---------------------------------------------------------------------------
  const months: {
    label: string;
    start: Date;
    end: Date;
    total: number;
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const monthTotal = earningBookings
      .filter((b) => {
        const created = new Date(b.createdAt);
        return created >= start && created <= end;
      })
      .reduce((sum, b) => sum + b.hostPayout, 0);

    months.push({
      label: format(start, "MMM yyyy"),
      start,
      end,
      total: monthTotal,
    });
  }

  const maxMonthTotal = Math.max(...months.map((m) => m.total), 1);

  // ---------------------------------------------------------------------------
  // Per-listing breakdown
  // ---------------------------------------------------------------------------
  const listingMap = new Map<
    string,
    {
      id: string;
      title: string;
      slug: string;
      totalEarnings: number;
      bookingCount: number;
    }
  >();

  for (const b of earningBookings) {
    const existing = listingMap.get(b.listing.id);
    if (existing) {
      existing.totalEarnings += b.hostPayout;
      existing.bookingCount += 1;
    } else {
      listingMap.set(b.listing.id, {
        id: b.listing.id,
        title: b.listing.title,
        slug: b.listing.slug,
        totalEarnings: b.hostPayout,
        bookingCount: 1,
      });
    }
  }

  const listingBreakdown = Array.from(listingMap.values()).sort(
    (a, b) => b.totalEarnings - a.totalEarnings
  );

  // ---------------------------------------------------------------------------
  // Recent transactions (last 10)
  // ---------------------------------------------------------------------------
  const recentTransactions = bookings.slice(0, 10);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="waywork-shell py-8 md:py-10">
      <section className="waywork-section mb-6 p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Host Revenue Analytics
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          Earnings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Track payout performance across listings, months, and booking activity.
        </p>
      </section>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(pendingPayouts)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Completed Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(completedPayouts)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Avg. Booking Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(averageBookingValue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {totalBookings} booking{totalBookings !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Chart */}
      <Card className="mb-8 border-slate-200/80 bg-white/95">
        <CardHeader>
          <CardTitle>Monthly Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {months.every((m) => m.total === 0) ? (
            <p className="text-center text-gray-500 py-8">
              No earnings data for the last 6 months
            </p>
          ) : (
            <div className="space-y-3">
              {months.map((month) => (
                <div key={month.label} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-slate-600 shrink-0">
                      {month.label}
                    </span>
                  <div className="flex-1 h-8 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-cyan-700 rounded transition-all"
                      style={{
                        width: `${(month.total / maxMonthTotal) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-24 text-sm font-medium text-right shrink-0">
                    {formatCurrency(month.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-Listing Breakdown */}
      <Card className="mb-8 border-slate-200/80 bg-white/95">
        <CardHeader>
          <CardTitle>Earnings by Listing</CardTitle>
        </CardHeader>
        <CardContent>
          {listingBreakdown.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No listing earnings yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-slate-500">Listing</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">
                      Bookings
                    </th>
                    <th className="pb-3 font-medium text-slate-500 text-right">
                      Avg / Booking
                    </th>
                    <th className="pb-3 font-medium text-slate-500 text-right">
                      Total Earnings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listingBreakdown.map((listing) => (
                    <tr key={listing.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{listing.title}</td>
                      <td className="py-3 text-right text-gray-600">
                        {listing.bookingCount}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {formatCurrency(
                          listing.bookingCount > 0
                            ? Math.round(
                                listing.totalEarnings / listing.bookingCount
                              )
                            : 0
                        )}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(listing.totalEarnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {listingBreakdown.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2">
                      <td className="pt-3 font-bold">Total</td>
                      <td className="pt-3 text-right font-bold">
                        {listingBreakdown.reduce(
                          (sum, l) => sum + l.bookingCount,
                          0
                        )}
                      </td>
                      <td className="pt-3 text-right" />
                      <td className="pt-3 text-right font-bold">
                        {formatCurrency(totalEarnings)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-slate-200/80 bg-white/95">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-0">
              {recentTransactions.map((booking, idx) => (
                <div key={booking.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {booking.listing.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(booking.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <Badge
                        className={`text-xs ${statusColors[booking.status] || ""}`}
                      >
                        {booking.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-medium w-24 text-right">
                        {formatCurrency(booking.hostPayout)}
                      </span>
                    </div>
                  </div>
                  {idx < recentTransactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
