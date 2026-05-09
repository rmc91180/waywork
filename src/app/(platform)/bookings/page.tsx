import Link from "next/link";
import { redirect } from "next/navigation";
import { format, startOfDay, differenceInDays } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, MapPin, Star } from "lucide-react";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:           { label: "Pending",    color: "#805000", bg: "#fff0cc" },
  CONFIRMED:         { label: "Confirmed",  color: "#2d6a4f", bg: "#d8f3dc" },
  COMPLETED:         { label: "Completed",  color: "#4a7fa5", bg: "#e0eef8" },
  CANCELLED_BY_GUEST:{ label: "Cancelled",  color: "#7a2020", bg: "#ffe0e0" },
  CANCELLED_BY_HOST: { label: "Cancelled",  color: "#7a2020", bg: "#ffe0e0" },
  REFUNDED:          { label: "Refunded",   color: "#6b5e52", bg: "#f0ebe2" },
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
          host: { select: { name: true } },
        },
      },
      review: { select: { id: true } },
    },
    orderBy: { checkIn: "desc" },
  });

  const today = startOfDay(new Date());

  const upcoming  = bookings.filter(b =>
    (b.status === "CONFIRMED" || b.status === "PENDING") && new Date(b.checkOut) > today
  );
  const past      = bookings.filter(b =>
    b.status === "COMPLETED" ||
    (b.status === "CONFIRMED" && new Date(b.checkOut) <= today)
  );
  const cancelled = bookings.filter(b =>
    b.status === "CANCELLED_BY_GUEST" || b.status === "CANCELLED_BY_HOST" || b.status === "REFUNDED"
  );

  function BookingCard({ booking, showReview = false }: {
    booking: typeof bookings[0];
    showReview?: boolean;
  }) {
    const img   = booking.listing.images[0]?.url;
    const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
    const st    = STATUS_STYLE[booking.status] ?? STATUS_STYLE.PENDING;
    const currency = booking.listing.currency ?? "USD";
    const daysUntil = differenceInDays(new Date(booking.checkIn), today);

    return (
      <Link
        href={`/bookings/${booking.id}`}
        className="group flex gap-4 overflow-hidden rounded-2xl transition hover:shadow-md"
        style={{ background: "var(--ww-warm-white)", border: "1px solid var(--ww-mist)" }}
      >
        {/* Image */}
        <div className="relative h-28 w-36 shrink-0 overflow-hidden sm:h-32 sm:w-44">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={booking.listing.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl"
              style={{ background: "var(--ww-gold-light)" }}>🏠</div>
          )}
          {/* Upcoming countdown */}
          {booking.status === "CONFIRMED" && daysUntil >= 0 && daysUntil <= 30 && (
            <div className="absolute bottom-2 left-2 rounded-lg px-2 py-0.5 text-xs font-bold"
              style={{ background: "var(--ww-ink)", color: "var(--ww-gold)" }}>
              {daysUntil === 0 ? "Today!" : `In ${daysUntil}d`}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-4 pr-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 font-semibold"
                style={{ color: "var(--ww-ink)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                {booking.listing.title}
              </h3>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: st.bg, color: st.color }}>
                {st.label}
              </span>
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "#7a6e62" }}>
              <MapPin className="size-3 shrink-0" />
              {booking.listing.city}
            </p>

            <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: "#7a6e62" }}>
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5 shrink-0" />
                {format(new Date(booking.checkIn), "d MMM")} – {format(new Date(booking.checkOut), "d MMM yyyy")}
              </span>
              <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {nights} night{nights !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold" style={{ color: "var(--ww-ink)" }}>
              {formatCurrency(booking.totalPrice, currency)}
            </span>

            <div className="flex items-center gap-2">
              {showReview && !booking.review && (
                <Link
                  href={`/bookings/${booking.id}/review`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition hover:opacity-80"
                  style={{ background: "var(--ww-gold-light)", color: "var(--ww-ink)" }}
                >
                  <Star className="size-3" /> Leave review
                </Link>
              )}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1"
                style={{ color: "var(--ww-terra)" }} />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  function Section({ title, count, children, empty }: {
    title: string; count: number; children: React.ReactNode; empty: string;
  }) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: "var(--ww-ink)" }}>{title}</h2>
          <span className="rounded-full px-2.5 py-0.5 font-mono text-xs font-bold"
            style={{ background: "var(--ww-mist)", color: "var(--ww-ink)" }}>
            {count}
          </span>
        </div>
        {count === 0 ? (
          <p className="rounded-2xl py-8 text-center text-sm"
            style={{ background: "var(--ww-warm-white)", border: "1px solid var(--ww-mist)", color: "#b8afa4" }}>
            {empty}
          </p>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--ww-parchment)", minHeight: "100vh" }}>
      {/* Header band */}
      <div style={{ background: "var(--ww-ink)", paddingBottom: "64px" }}>
        <div className="waywork-shell pt-10">
          <p className="ww-eyebrow mb-1" style={{ color: "var(--ww-gold)" }}>My stays</p>
          <h1 className="text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            Your bookings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            {bookings.length} total · {upcoming.length} upcoming
          </p>
        </div>
      </div>

      {/* Cards — overlap header */}
      <div className="waywork-shell -mt-10 pb-16">

        {/* Upcoming — most prominent */}
        <Section title="Upcoming" count={upcoming.length} empty="No upcoming stays — time to book one.">
          {upcoming.map(b => <BookingCard key={b.id} booking={b} />)}
        </Section>

        {upcoming.length === 0 && (
          <div className="mt-3 flex justify-center">
            <Button style={{ background: "var(--ww-terra)", color: "white" }} asChild>
              <Link href="/search">Find a space <ArrowRight className="ml-2 size-4" /></Link>
            </Button>
          </div>
        )}

        {/* Past */}
        <div className="mt-10">
          <Section title="Past stays" count={past.length} empty="No completed stays yet.">
            {past.map(b => <BookingCard key={b.id} booking={b} showReview />)}
          </Section>
        </div>

        {/* Cancelled */}
        {cancelled.length > 0 && (
          <div className="mt-10">
            <Section title="Cancelled" count={cancelled.length} empty="">
              {cancelled.map(b => <BookingCard key={b.id} booking={b} />)}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
