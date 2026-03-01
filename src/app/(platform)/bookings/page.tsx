import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format, startOfDay } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-cyan-100 text-cyan-800",
  CANCELLED_BY_GUEST: "bg-rose-100 text-rose-800",
  CANCELLED_BY_HOST: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-slate-100 text-slate-700",
};

export default async function GuestBookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bookings = await db.booking.findMany({
    where: { guestId: session.user.id },
    include: {
      listing: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const today = startOfDay(new Date());
  const upcoming = bookings.filter(
    (booking) =>
      (booking.status === "CONFIRMED" || booking.status === "PENDING") &&
      new Date(booking.checkOut) > today
  );
  const past = bookings.filter(
    (booking) =>
      booking.status === "COMPLETED" ||
      (booking.status === "CONFIRMED" && new Date(booking.checkOut) <= today)
  );
  const cancelled = bookings.filter(
    (booking) =>
      booking.status === "CANCELLED_BY_GUEST" ||
      booking.status === "CANCELLED_BY_HOST" ||
      booking.status === "REFUNDED"
  );

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50" />
      <div className="relative mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <header className="mb-6 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Booking Hub
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">My Bookings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage upcoming stays, revisit past workdays, and track cancellations.
          </p>
        </header>

        <Tabs defaultValue="upcoming">
          <TabsList className="h-auto rounded-xl bg-white p-1 shadow-sm">
            <TabsTrigger value="upcoming">
              Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
            </TabsTrigger>
            <TabsTrigger value="past">Past {past.length > 0 && `(${past.length})`}</TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled {cancelled.length > 0 && `(${cancelled.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcoming.length > 0 ? (
              upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} />)
            ) : (
              <EmptyState message="No upcoming bookings yet." />
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {past.length > 0 ? (
              past.map((booking) => <BookingCard key={booking.id} booking={booking} />)
            ) : (
              <EmptyState message="No past bookings yet." />
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4 space-y-3">
            {cancelled.length > 0 ? (
              cancelled.map((booking) => <BookingCard key={booking.id} booking={booking} />)
            ) : (
              <EmptyState message="No cancelled bookings." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
}: {
  booking: {
    id: string;
    status: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    listing: {
      title: string;
      city: string;
      state: string | null;
      images: { url: string }[];
    };
  };
}) {
  const primaryImage = booking.listing.images[0]?.url;

  return (
    <Link href={`/bookings/${booking.id}`} className="block">
      <Card className="overflow-hidden border-slate-200 py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {primaryImage ? (
                <Image
                  src={primaryImage}
                  alt={booking.listing.title}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-semibold text-slate-900">{booking.listing.title}</h3>
                <Badge className={`shrink-0 text-xs ${statusColors[booking.status] || "bg-slate-100 text-slate-700"}`}>
                  {booking.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                {booking.listing.city}
                {booking.listing.state ? `, ${booking.listing.state}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-slate-500">
                  {format(new Date(booking.checkIn), "MMM d")} -{" "}
                  {format(new Date(booking.checkOut), "MMM d, yyyy")}
                </span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(booking.totalPrice)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
      <p>{message}</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link href="/search">Find a workspace</Link>
      </Button>
    </div>
  );
}
