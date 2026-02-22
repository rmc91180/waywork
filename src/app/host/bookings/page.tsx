import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED_BY_GUEST: "bg-red-100 text-red-800",
  CANCELLED_BY_HOST: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
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
  const pending = bookings.filter((b) => b.status === "PENDING");
  const confirmed = bookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.checkIn) >= now
  );
  const past = bookings.filter(
    (b) =>
      b.status === "COMPLETED" ||
      (b.status === "CONFIRMED" && new Date(b.checkOut) < now)
  );
  const cancelled = bookings.filter(
    (b) =>
      b.status === "CANCELLED_BY_GUEST" ||
      b.status === "CANCELLED_BY_HOST" ||
      b.status === "REFUNDED"
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>

      <Tabs defaultValue="confirmed">
        <TabsList>
          {pending.length > 0 && (
            <TabsTrigger value="pending">
              Pending ({pending.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="confirmed">
            Upcoming {confirmed.length > 0 && `(${confirmed.length})`}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past {past.length > 0 && `(${past.length})`}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled {cancelled.length > 0 && `(${cancelled.length})`}
          </TabsTrigger>
        </TabsList>

        {pending.length > 0 && (
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending.map((b) => (
              <HostBookingCard key={b.id} booking={b} />
            ))}
          </TabsContent>
        )}

        <TabsContent value="confirmed" className="mt-4 space-y-3">
          {confirmed.length > 0 ? (
            confirmed.map((b) => (
              <HostBookingCard key={b.id} booking={b} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No upcoming bookings
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length > 0 ? (
            past.map((b) => <HostBookingCard key={b.id} booking={b} />)
          ) : (
            <div className="text-center py-12 text-gray-500">
              No past bookings yet
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length > 0 ? (
            cancelled.map((b) => (
              <HostBookingCard key={b.id} booking={b} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No cancelled bookings
            </div>
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
    numberOfDays: number;
    numberOfGuests: number;
    totalPrice: number;
    hostPayout: number;
    listing: { title: string };
    guest: { name: string | null; email: string | null; image: string | null };
  };
}) {
  return (
    <Link href={`/bookings/${booking.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={booking.guest.image || undefined} />
              <AvatarFallback>
                {booking.guest.name?.[0] || "G"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">
                    {booking.guest.name || booking.guest.email}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {booking.listing.title}
                  </p>
                </div>
                <Badge
                  className={`shrink-0 text-xs ${statusColors[booking.status] || ""}`}
                >
                  {booking.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>
                  {format(new Date(booking.checkIn), "MMM d")} —{" "}
                  {format(new Date(booking.checkOut), "MMM d")}
                </span>
                <span>
                  {booking.numberOfGuests} guest
                  {booking.numberOfGuests > 1 ? "s" : ""}
                </span>
                <span className="font-medium text-green-700">
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
