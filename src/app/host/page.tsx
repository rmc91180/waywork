import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, CalendarCheck2, CircleDollarSign, LayoutDashboard, PlusCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";

export default async function HostDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fhost");
  }

  const hostId = session.user.id;
  let totalListings = 0;
  let activeListings = 0;
  let upcomingBookings = 0;
  let grossRevenue = 0;

  try {
    const [total, active, bookings, payouts] = await Promise.all([
      db.listing.count({ where: { hostId } }),
      db.listing.count({ where: { hostId, status: "ACTIVE" } }),
      db.booking.count({
        where: {
          listing: { hostId },
          status: "CONFIRMED",
          checkIn: { gte: new Date() },
        },
      }),
      db.booking.aggregate({
        _sum: { hostPayout: true },
        where: {
          listing: { hostId },
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
      }),
    ]);

    totalListings = total;
    activeListings = active;
    upcomingBookings = bookings;
    grossRevenue = payouts._sum.hostPayout ?? 0;
  } catch (error) {
    console.error("[host/dashboard] failed to load host metrics", error);
  }

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
          Manage listings, bookings, calendar, and earnings from one place.
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
        </div>
      </section>

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
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gross Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ww-primary-blue)]">{formatCurrency(grossRevenue)}</p>
          <p className="mt-1 text-sm text-slate-600">confirmed + completed payouts</p>
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
    </div>
  );
}
