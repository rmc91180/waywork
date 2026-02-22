import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingConfirmationPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: {
        include: {
          host: { select: { name: true, image: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      attendees: true,
    },
  });

  if (!booking) notFound();
  if (booking.guestId !== session.user.id) notFound();

  const primaryImage = booking.listing.images[0]?.url;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-green-800">
          Booking Confirmed!
        </h1>
        <p className="text-gray-600 mt-2">
          Your workspace is reserved. Get ready for a productive day!
        </p>
      </div>

      {/* Booking summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Listing */}
          <div className="flex gap-4">
            <div className="w-24 h-18 rounded-lg bg-gray-100 overflow-hidden shrink-0">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={booking.listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  🏢
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{booking.listing.title}</h3>
              <p className="text-sm text-gray-600">
                {booking.listing.city}, {booking.listing.state}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Hosted by {booking.listing.host.name}
              </p>
            </div>
          </div>

          <Separator />

          {/* Dates */}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <Separator />

          {/* Pricing */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {formatCurrency(booking.listing.pricePerDay)} x{" "}
                {booking.numberOfDays} day{booking.numberOfDays > 1 ? "s" : ""}
              </span>
              <span>{formatCurrency(booking.subtotal)}</span>
            </div>
            {booking.cleaningFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cleaning fee</span>
                <span>{formatCurrency(booking.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Service fee</span>
              <span>{formatCurrency(booking.serviceFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(booking.totalPrice)}</span>
            </div>
          </div>

          {/* Attendees */}
          {booking.attendees.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-gray-500 uppercase mb-2">
                  Attendees
                </p>
                <div className="space-y-1">
                  {booking.attendees.map((a) => (
                    <p key={a.id} className="text-sm">
                      {a.email}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}

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
        </CardContent>
      </Card>

      {/* Booking ID */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">
          Booking ID:{" "}
          <span className="font-mono">
            {booking.id.slice(0, 8).toUpperCase()}
          </span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button asChild>
          <Link href={`/bookings/${booking.id}`}>View Booking</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/bookings">My Bookings</Link>
        </Button>
      </div>
    </div>
  );
}
