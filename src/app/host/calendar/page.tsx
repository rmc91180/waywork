import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildHostListingScope } from "@/lib/host-access";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { CalendarView } from "@/components/host/calendar-view";
import { HostPageHeader } from "@/components/host/host-page-header";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fhost");

  // Fetch all host listings
  const listings = await db.listing
    .findMany({
      where: buildHostListingScope(session.user.id),
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
      },
      orderBy: { title: "asc" },
    })
    .catch(async (error) => {
      console.error("[host/calendar] fallback to owner-only scope", error);
      return db.listing.findMany({
        where: { hostId: session.user.id },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
        },
        orderBy: { title: "asc" },
      });
    });

  if (listings.length === 0) {
    return (
      <div className="waywork-shell py-8 md:py-10">
        <HostPageHeader
          eyebrow="Host workspace"
          title="Calendar"
          description="View availability and booking holds across your listings."
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="text-4xl mb-4">📅</div>
          <p className="mb-2 text-slate-500">No listings yet</p>
          <p className="text-sm text-slate-400">
            Create a listing first to manage your calendar.
          </p>
        </div>
      </div>
    );
  }

  // Fetch blocked dates and bookings for all listings (current month ± 2)
  const now = new Date();
  const rangeStart = startOfMonth(subMonths(now, 1));
  const rangeEnd = endOfMonth(addMonths(now, 2));

  const blockedDates = await db.blockedDate.findMany({
    where: {
      listingId: { in: listings.map((l) => l.id) },
      date: { gte: rangeStart, lte: rangeEnd },
    },
    select: {
      id: true,
      listingId: true,
      date: true,
      source: true,
    },
  });

  const bookings = await db.booking.findMany({
    where: {
      listingId: { in: listings.map((l) => l.id) },
      status: { in: ["CONFIRMED", "PENDING"] },
      checkOut: { gte: rangeStart },
      checkIn: { lte: rangeEnd },
    },
    select: {
      id: true,
      listingId: true,
      checkIn: true,
      checkOut: true,
      status: true,
      numberOfGuests: true,
      guest: {
        select: { name: true, email: true },
      },
    },
  });

  // Serialize dates for client component
  const serializedListings = listings.map((l) => ({
    ...l,
  }));

  const serializedBlockedDates = blockedDates.map((bd) => ({
    ...bd,
    date: bd.date.toISOString(),
  }));

  const serializedBookings = bookings.map((b) => ({
    ...b,
    checkIn: b.checkIn.toISOString(),
    checkOut: b.checkOut.toISOString(),
  }));

  return (
    <div className="waywork-shell py-8 md:py-10">
      <HostPageHeader
        eyebrow="Host workspace"
        title="Calendar"
        description="See booked, blocked, and pending dates without switching between listings."
        aside={
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span className="text-slate-600">Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-red-400" />
              <span className="text-slate-600">Blocked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-yellow-400" />
              <span className="text-slate-600">Pending</span>
            </div>
          </div>
        }
      />

      <div className="mt-6">
        <CalendarView
        listings={serializedListings}
        blockedDates={serializedBlockedDates}
        bookings={serializedBookings}
        />
      </div>
    </div>
  );
}
