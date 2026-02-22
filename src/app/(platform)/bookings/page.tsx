import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED_BY_GUEST: "bg-red-100 text-red-800",
  CANCELLED_BY_HOST: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
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

  const now = new Date();
  const upcoming = bookings.filter(
    (b) =>
      (b.status === "CONFIRMED" || b.status === "PENDING") &&
      new Date(b.checkIn) >= now
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past {past.length > 0 && `(${past.length})`}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled {cancelled.length > 0 && `(${cancelled.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map((b) => <BookingCard key={b.id} booking={b} />)
          ) : (
            <EmptyState message="No upcoming bookings" />
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length > 0 ? (
            past.map((b) => <BookingCard key={b.id} booking={b} />)
          ) : (
            <EmptyState message="No past bookings yet" />
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length > 0 ? (
            cancelled.map((b) => <BookingCard key={b.id} booking={b} />)
          ) : (
            <EmptyState message="No cancelled bookings" />
          )}
        </TabsContent>
      </Tabs>
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
    <Link href={`/bookings/${booking.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-24 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={booking.listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No photo
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium truncate">
                  {booking.listing.title}
                </h3>
                <Badge
                  className={`shrink-0 text-xs ${statusColors[booking.status] || ""}`}
                >
                  {booking.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {booking.listing.city}
                {booking.listing.state && `, ${booking.listing.state}`}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>
                  {format(new Date(booking.checkIn), "MMM d")} —{" "}
                  {format(new Date(booking.checkOut), "MMM d, yyyy")}
                </span>
                <span className="font-medium text-gray-900">
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
    <div className="text-center py-12 text-gray-500">
      <p>{message}</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link href="/search">Find a Space</Link>
      </Button>
    </div>
  );
}
