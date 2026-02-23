import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from "date-fns";
import { CalendarView } from "@/components/host/calendar-view";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch all host listings
  const listings = await db.listing.findMany({
    where: { hostId: session.user.id },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
    },
    orderBy: { title: "asc" },
  });

  if (listings.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Calendar</h1>
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-gray-500 mb-2">No listings yet</p>
          <p className="text-sm text-gray-400">
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
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span className="text-gray-600">Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-400" />
            <span className="text-gray-600">Pending</span>
          </div>
        </div>
      </div>

      <CalendarView
        listings={serializedListings}
        blockedDates={serializedBlockedDates}
        bookings={serializedBookings}
      />
    </div>
  );
}
