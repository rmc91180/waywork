import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, Clock3, MessageSquare, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  CANCELLED_BY_GUEST: "bg-rose-100 text-rose-800 border-rose-200",
  CANCELLED_BY_HOST: "bg-rose-100 text-rose-800 border-rose-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default async function BookingDetailPage({ params, searchParams }: Props) {
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

  const isGuest = booking.guestId === session.user.id;
  const isHost = booking.listing.hostId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isGuest && !isHost && !isAdmin) notFound();

  const primaryImage = booking.listing.images[0]?.url;
  const perDaySnapshot =
    booking.numberOfDays > 0
      ? Math.round(booking.subtotal / booking.numberOfDays)
      : booking.listing.pricePerDay;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50" />
      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
            <p className="text-sm font-semibold">Booking confirmed</p>
            <p className="mt-0.5 text-sm">Your workspace is reserved and ready.</p>
          </div>
        )}

        <header className="mb-6 rounded-2xl border border-white/60 bg-white/85 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Booking Details
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Booking #{booking.id.slice(0, 8).toUpperCase()}</h1>
            </div>
            <Badge className={`border text-xs ${statusStyles[booking.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
              {booking.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden border-slate-200 py-0 shadow-sm">
              <CardContent className="p-0">
                <Link href={`/spaces/${booking.listingId}`} className="grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="relative h-52 bg-slate-100 sm:h-full">
                    {primaryImage ? (
                      <Image
                        src={primaryImage}
                        alt={booking.listing.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 220px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">No photo</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-semibold text-slate-900">{booking.listing.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {booking.listing.city}
                      {booking.listing.state ? `, ${booking.listing.state}` : ""}
                    </p>
                    {booking.listing.workScore && (
                      <Badge variant="secondary" className="mt-3 bg-cyan-50 text-cyan-700">
                        Work Score {booking.listing.workScore}
                      </Badge>
                    )}
                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="size-4" />
                        {format(new Date(booking.checkIn), "EEE, MMM d, yyyy")} to{" "}
                        {format(new Date(booking.checkOut), "EEE, MMM d, yyyy")}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock3 className="size-4" />
                        {booking.numberOfDays} day{booking.numberOfDays > 1 ? "s" : ""}
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="size-4" />
                        {booking.numberOfGuests} guest{booking.numberOfGuests > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Reservation Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.specialRequests ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {booking.specialRequests}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">No special requests were submitted.</p>
                )}

                {booking.attendees.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Attendees
                      </p>
                      <div className="space-y-2">
                        {booking.attendees.map((attendee) => (
                          <div
                            key={attendee.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          >
                            <span className="text-slate-700">{attendee.email}</span>
                            <Badge variant="outline">{attendee.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {isGuest && booking.status === "CONFIRMED" && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex flex-wrap gap-3 p-4">
                  <Button variant="outline" asChild>
                    <Link href={`/messages?listing=${booking.listingId}`}>
                      <MessageSquare className="mr-1.5 size-4" />
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

            {isGuest && booking.status === "COMPLETED" && !booking.review && (
              <Card className="border-cyan-200 bg-cyan-50/60 shadow-sm">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">Share your workspace experience</p>
                    <p className="text-sm text-slate-600">Your review helps other remote workers choose well.</p>
                  </div>
                  <Button asChild className="bg-cyan-700 hover:bg-cyan-800">
                    <Link href={`/bookings/${booking.id}/review`}>Leave Review</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Price Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {formatCurrency(perDaySnapshot)} x {booking.numberOfDays} day
                    {booking.numberOfDays > 1 ? "s" : ""}
                  </span>
                  <span>
                    {formatCurrency(booking.subtotal)}
                  </span>
                </div>
                {booking.cleaningFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Cleaning fee</span>
                    <span>{formatCurrency(booking.cleaningFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Way Work commission</span>
                  <span>{formatCurrency(booking.serviceFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold text-slate-900">
                  <span>Total paid</span>
                  <span>{formatCurrency(booking.totalPrice)}</span>
                </div>
                {isHost && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm font-medium text-emerald-700">
                      <span>Your payout</span>
                      <span>{formatCurrency(booking.hostPayout)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{isGuest ? "Your Host" : "Guest"}</CardTitle>
              </CardHeader>
              <CardContent>
                {isGuest ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={booking.listing.host.image || undefined} />
                      <AvatarFallback>{booking.listing.host.name?.[0] || "H"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900">{booking.listing.host.name}</p>
                      <p className="text-sm text-slate-500">Host</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={booking.guest.image || undefined} />
                      <AvatarFallback>{booking.guest.name?.[0] || "G"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900">{booking.guest.name}</p>
                      <p className="text-sm text-slate-500">{booking.guest.email}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
