import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookingPaymentButton } from "@/components/booking/booking-payment-button";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}

export default async function BookingPaymentPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { cancelled } = await searchParams;

  const booking = await withDbRetry((client) =>
    client.booking.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            host: {
              select: {
                name: true,
                stripeConnectAccountId: true,
              },
            },
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    })
  );

  if (!booking) notFound();
  if (booking.guestId !== session.user.id) notFound();
  if (booking.status !== "PENDING") redirect(`/bookings/${booking.id}`);

  const primaryImage = booking.listing.images[0]?.url;
  const hasStripePayout = Boolean(booking.listing.host.stripeConnectAccountId);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50" />
      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        {cancelled ? (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <p className="text-sm font-semibold">Checkout cancelled</p>
            <p className="mt-0.5 text-sm">Your reservation is still waiting for payment.</p>
          </div>
        ) : null}

        <header className="mb-6 rounded-2xl border border-white/60 bg-white/85 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Payment
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                Complete your reservation
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Secure checkout through Stripe with automatic split payouts for Way Work and the host.
              </p>
            </div>
            <Badge className="border border-amber-200 bg-amber-100 text-amber-800">PENDING</Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden border-slate-200 py-0 shadow-sm">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)]">
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
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-semibold text-slate-900">{booking.listing.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {booking.listing.city}
                      {booking.listing.state ? `, ${booking.listing.state}` : ""}, {booking.listing.country}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Hosted by {booking.listing.host.name || "your host"}
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-900">Check-in:</span>{" "}
                        {format(new Date(booking.checkIn), "EEE, MMM d, yyyy")}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Check-out:</span>{" "}
                        {format(new Date(booking.checkOut), "EEE, MMM d, yyyy")}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Guests:</span>{" "}
                        {booking.numberOfGuests} guest{booking.numberOfGuests > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">What happens next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>1. You complete payment in Stripe&apos;s secure checkout.</p>
                <p>2. Way Work keeps its platform fee automatically.</p>
                <p>3. The host receives the remainder through Stripe Connect.</p>
                <p>4. Your reservation moves to confirmed after payment succeeds.</p>
                {!hasStripePayout ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    Payments for this host are not fully configured yet.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {formatCurrency(booking.listing.pricePerDay, booking.listing.currency)} x{" "}
                    {booking.numberOfDays} day{booking.numberOfDays > 1 ? "s" : ""}
                  </span>
                  <span>{formatCurrency(booking.subtotal, booking.listing.currency)}</span>
                </div>
                {booking.cleaningFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Cleaning fee</span>
                    <span>{formatCurrency(booking.cleaningFee, booking.listing.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Way Work fee</span>
                  <span>{formatCurrency(booking.serviceFee, booking.listing.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold text-slate-900">
                  <span>Amount due</span>
                  <span>{formatCurrency(booking.totalPrice, booking.listing.currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-emerald-700">
                  <span>Host payout</span>
                  <span>{formatCurrency(booking.hostPayout, booking.listing.currency)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <BookingPaymentButton bookingId={booking.id} listingId={booking.listingId} />
                <p className="text-center text-xs text-slate-500">
                  You&apos;ll be redirected to Stripe to finish payment securely.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
