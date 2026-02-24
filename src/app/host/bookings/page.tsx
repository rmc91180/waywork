import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-cyan-100 text-cyan-800",
  CANCELLED_BY_GUEST: "bg-rose-100 text-rose-800",
  CANCELLED_BY_HOST: "bg-rose-100 text-rose-800",
  REFUNDED: "bg-slate-100 text-slate-700",
};

export default async function HostBookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bookings = await db.booking.findMany({
    where: {
      listing: { hostId: session.user.id },
    },
    include: {
      listing: true,
      guest: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const pending = bookings.filter((booking) => booking.status === "PENDING");
  const confirmed = bookings.filter(
    (booking) => booking.status === "CONFIRMED" && new Date(booking.checkIn) >= now
  );
  const past = bookings.filter(
    (booking) =>
      booking.status === "COMPLETED" ||
      (booking.status === "CONFIRMED" && new Date(booking.checkOut) < now)
  );
  const cancelled = bookings.filter(
    (booking) =>
      booking.status === "CANCELLED_BY_GUEST" ||
      booking.status === "CANCELLED_BY_HOST" ||
      booking.status === "REFUNDED"
  );

  const upcomingPayout = confirmed.reduce((sum, booking) => sum + booking.hostPayout, 0);

  return (
    <div className="waywork-shell py-8 md:py-10">
      <section className="waywork-section mb-6 p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Host Booking Operations
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
              Bookings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track upcoming guests, pending requests, and completed stays.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Upcoming Payout Value</p>
            <p className="text-xl font-semibold text-slate-900">{formatCurrency(upcomingPayout)}</p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="confirmed">
        <TabsList className="h-auto rounded-xl bg-white p-1 shadow-sm">
          {pending.length > 0 && <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>}
          <TabsTrigger value="confirmed">
            Upcoming {confirmed.length > 0 && `(${confirmed.length})`}
          </TabsTrigger>
          <TabsTrigger value="past">Past {past.length > 0 && `(${past.length})`}</TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled {cancelled.length > 0 && `(${cancelled.length})`}
          </TabsTrigger>
        </TabsList>

        {pending.length > 0 && (
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending.map((booking) => (
              <HostBookingCard key={booking.id} booking={booking} />
            ))}
          </TabsContent>
        )}

        <TabsContent value="confirmed" className="mt-4 space-y-3">
          {confirmed.length > 0 ? (
            confirmed.map((booking) => <HostBookingCard key={booking.id} booking={booking} />)
          ) : (
            <EmptyState message="No upcoming bookings." />
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length > 0 ? (
            past.map((booking) => <HostBookingCard key={booking.id} booking={booking} />)
          ) : (
            <EmptyState message="No past bookings yet." />
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length > 0 ? (
            cancelled.map((booking) => <HostBookingCard key={booking.id} booking={booking} />)
          ) : (
            <EmptyState message="No cancelled bookings." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HostBookingCard({
  booking,
}: {
  booking: {
    id: string;
    status: string;
    checkIn: Date;
    checkOut: Date;
    numberOfGuests: number;
    hostPayout: number;
    listing: { title: string };
    guest: { name: string | null; email: string | null; image: string | null };
  };
}) {
  return (
    <Link href={`/bookings/${booking.id}`} className="block">
      <Card className="border-slate-200/80 bg-white/95 py-0 transition hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={booking.guest.image || undefined} />
              <AvatarFallback>{booking.guest.name?.[0] || "G"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="line-clamp-1 font-semibold text-slate-900">
                    {booking.guest.name || booking.guest.email}
                  </h3>
                  <p className="truncate text-sm text-slate-600">{booking.listing.title}</p>
                </div>
                <Badge className={`text-xs ${statusColors[booking.status] || "bg-slate-100 text-slate-700"}`}>
                  {booking.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {format(new Date(booking.checkIn), "MMM d")} - {format(new Date(booking.checkOut), "MMM d")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-3.5" />
                  {booking.numberOfGuests} guest{booking.numberOfGuests > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(booking.hostPayout)}
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
      {message}
    </div>
  );
}
