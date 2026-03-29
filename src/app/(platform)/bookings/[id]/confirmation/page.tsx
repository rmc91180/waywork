import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleCheckBig, Mail, MessageSquareText, ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 md:px-6">
        <header className="mb-6 rounded-2xl border border-emerald-200 bg-white/90 p-6 text-center shadow-sm backdrop-blur">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CircleCheckBig className="size-8" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Confirmed</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Your workspace is booked</h1>
          <p className="mt-2 text-sm text-slate-600">Booking #{booking.id.slice(0, 8).toUpperCase()} is ready.</p>
        </header>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">No photo</div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-900">{booking.listing.title}</h2>
                <p className="text-sm text-slate-600">
                  {booking.listing.city}
                  {booking.listing.state ? `, ${booking.listing.state}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-500">Hosted by {booking.listing.host.name}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Check-in</p>
                <p className="font-medium text-slate-900">{format(new Date(booking.checkIn), "EEE, MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Check-out</p>
                <p className="font-medium text-slate-900">{format(new Date(booking.checkOut), "EEE, MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Duration</p>
                <p className="font-medium text-slate-900">
                  {booking.numberOfDays} day{booking.numberOfDays > 1 ? "s" : ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Guests</p>
                <p className="font-medium text-slate-900">
                  {booking.numberOfGuests} guest{booking.numberOfGuests > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>
                  {formatCurrency(booking.listing.pricePerDay)} x {booking.numberOfDays} day
                  {booking.numberOfDays > 1 ? "s" : ""}
                </span>
                <span>{formatCurrency(booking.subtotal)}</span>
              </div>
              {booking.cleaningFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Cleaning fee</span>
                  <span>{formatCurrency(booking.cleaningFee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-semibold text-slate-900">
                <span>Total paid</span>
                <span>{formatCurrency(booking.totalPrice)}</span>
              </div>
            </div>

            {booking.attendees.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Attendees</p>
                  <div className="space-y-1 text-sm text-slate-700">
                    {booking.attendees.map((attendee) => (
                      <p key={attendee.id}>{attendee.email}</p>
                    ))}
                  </div>
                </div>
              </>
            )}

            {booking.specialRequests && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Special Requests</p>
                  <p className="mt-1 text-sm text-slate-700">{booking.specialRequests}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 border-slate-200 shadow-sm">
          <CardContent className="space-y-2 p-4 text-sm text-slate-700">
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-cyan-700" />
              Confirmation details have been sent to your email.
            </p>
            <p className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-cyan-700" />
              Message your host anytime from the booking page.
            </p>
            <p className="flex items-center gap-2">
              <ReceiptText className="size-4 text-cyan-700" />
              Keep this booking ID for support requests.
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-cyan-700 hover:bg-cyan-800">
            <Link href={`/bookings/${booking.id}`}>View Booking</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/bookings">My Bookings</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search">Find Another Space</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
