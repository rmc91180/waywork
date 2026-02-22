import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED_BY_GUEST: "bg-red-100 text-red-800",
  CANCELLED_BY_HOST: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { success } = await searchParams;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: {
        include: {
          host: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      guest: true,
      attendees: true,
      review: true,
    },
  });

  if (!booking) notFound();

  // Auth check: only guest, host, or admin
  const isGuest = booking.guestId === session.user.id;
  const isHost = booking.listing.hostId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isGuest && !isHost && !isAdmin) notFound();

  const primaryImage = booking.listing.images[0]?.url;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Success banner */}
      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <h2 className="font-semibold text-green-800">Booking Confirmed!</h2>
          <p className="text-sm text-green-700 mt-1">
            Your workspace is reserved. Check your email for details.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Details</h1>
          <p className="text-gray-600 text-sm mt-1">
            Booking #{booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Badge className={statusColors[booking.status] || "bg-gray-100"}>
          {booking.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Listing card */}
          <Card>
            <CardContent className="p-4">
              <Link
                href={`/spaces/${booking.listingId}`}
                className="flex gap-4 hover:opacity-80 transition-opacity"
              >
                <div className="w-32 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={booking.listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      No photo
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{booking.listing.title}</h3>
                  <p className="text-sm text-gray-600">
                    {booking.listing.city}, {booking.listing.state}
                  </p>
                  {booking.listing.workScore && (
                    <span className="inline-block mt-1 text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Work Score: {booking.listing.workScore}
                    </span>
                  )}
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Dates & Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stay Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Check-in</p>
                  <p className="font-medium">
                    {format(new Date(booking.checkIn), "EEE, MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Check-out</p>
                  <p className="font-medium">
                    {format(new Date(booking.checkOut), "EEE, MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Duration</p>
                  <p className="font-medium">
                    {booking.numberOfDays} day{booking.numberOfDays > 1 ? "s" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Guests</p>
                  <p className="font-medium">
                    {booking.numberOfGuests} guest
                    {booking.numberOfGuests > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {booking.specialRequests && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Special Requests
                    </p>
                    <p className="text-sm mt-1">{booking.specialRequests}</p>
                  </div>
                </>
              )}

              {/* Attendees */}
              {booking.attendees.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">
                      Attendees
                    </p>
                    <div className="space-y-2">
                      {booking.attendees.map((attendee) => (
                        <div
                          key={attendee.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{attendee.email}</span>
                          <Badge variant="outline" className="text-xs">
                            {attendee.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {isGuest && booking.status === "CONFIRMED" && (
            <Card>
              <CardContent className="p-4 flex gap-3">
                <Button variant="outline" asChild>
                  <Link href={`/messages?listing=${booking.listingId}`}>
                    Message Host
                  </Link>
                </Button>
                <CancelBookingButton
                  bookingId={booking.id}
                  cancellationPolicy={booking.listing.cancellationPolicy}
                  checkIn={booking.checkIn.toISOString()}
                />
              </CardContent>
            </Card>
          )}

          {/* Review prompt */}
          {isGuest &&
            booking.status === "COMPLETED" &&
            !booking.review && (
              <Card>
                <CardContent className="p-4">
                  <p className="font-medium mb-2">How was your stay?</p>
                  <Button asChild>
                    <Link href={`/bookings/${booking.id}/review`}>
                      Leave a Review
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {formatCurrency(booking.listing.pricePerDay)} x{" "}
                  {booking.numberOfDays} day
                  {booking.numberOfDays > 1 ? "s" : ""}
                </span>
                <span>
                  {formatCurrency(
                    booking.listing.pricePerDay * booking.numberOfDays
                  )}
                </span>
              </div>
              {booking.listing.cleaningFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cleaning fee</span>
                  <span>
                    {formatCurrency(booking.listing.cleaningFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service fee</span>
                <span>{formatCurrency(booking.serviceFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(booking.totalPrice)}</span>
              </div>
              {isHost && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Your payout</span>
                    <span className="font-medium">
                      {formatCurrency(booking.hostPayout)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Host/Guest info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isGuest ? "Your Host" : "Guest"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGuest ? (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={booking.listing.host.image || undefined} />
                    <AvatarFallback>
                      {booking.listing.host.name?.[0] || "H"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {booking.listing.host.name}
                    </p>
                    <p className="text-sm text-gray-500">Host</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={booking.guest.image || undefined} />
                    <AvatarFallback>
                      {booking.guest.name?.[0] || "G"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{booking.guest.name}</p>
                    <p className="text-sm text-gray-500">
                      {booking.guest.email}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
