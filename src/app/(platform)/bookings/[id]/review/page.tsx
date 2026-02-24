import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewForm } from "@/components/booking/review-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: {
        select: {
          title: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      },
      review: true,
    },
  });

  if (!booking) notFound();
  if (booking.guestId !== session.user.id) notFound();

  if (booking.status !== "COMPLETED") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Cannot review yet</h1>
        <p className="mt-2 text-slate-600">
          Reviews are available after checkout is complete.
        </p>
        <Button className="mt-5" variant="outline" asChild>
          <Link href={`/bookings/${booking.id}`}>Back to Booking</Link>
        </Button>
      </div>
    );
  }

  if (booking.review) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Review already submitted</h1>
        <p className="mt-2 text-slate-600">You can manage this booking from your details page.</p>
        <Button className="mt-5" variant="outline" asChild>
          <Link href={`/bookings/${booking.id}`}>Back to Booking</Link>
        </Button>
      </div>
    );
  }

  const primaryImage = booking.listing.images[0]?.url;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-br from-amber-50 via-orange-50 to-cyan-50" />
      <div className="relative mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
        <header className="mb-6 rounded-2xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Post-Stay Review</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">How was your workspace experience?</h1>
          <p className="mt-2 text-sm text-slate-600">
            Help other remote workers with practical feedback on internet quality, comfort, and productivity.
          </p>
        </header>

        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {primaryImage ? (
                  <Image
                    src={primaryImage}
                    alt={booking.listing.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">No photo</div>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{booking.listing.title}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                  <CalendarDays className="size-4" />
                  {booking.checkIn.toLocaleDateString()} to {booking.checkOut.toLocaleDateString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">Booking #{booking.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
              <p className="flex items-start gap-2">
                <Star className="mt-0.5 size-3.5 shrink-0" />
                Specific ratings for WiFi, quietness, desk setup, and cleanliness make the review most useful.
              </p>
            </div>
          </CardContent>
        </Card>

        <ReviewForm bookingId={booking.id} />
      </div>
    </div>
  );
}
