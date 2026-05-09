import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Download, Mail, MapPin, MessageSquare, Users } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/stripe";
import { Button } from "@/components/ui/button";

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
          host: { select: { name: true, image: true, email: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      attendees: true,
    },
  });

  if (!booking) notFound();
  if (booking.guestId !== session.user.id) notFound();

  const primaryImage = booking.listing.images[0]?.url;
  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
  const currency = booking.listing.currency ?? "USD";

  // Build .ics calendar content
  const icsStart = format(new Date(booking.checkIn), "yyyyMMdd");
  const icsEnd   = format(new Date(booking.checkOut), "yyyyMMdd");
  const icsContent = encodeURIComponent(
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${icsStart}`,
      `DTEND;VALUE=DATE:${icsEnd}`,
      `SUMMARY:WayWork stay – ${booking.listing.title}`,
      `DESCRIPTION:Booking #${booking.id.slice(0, 8).toUpperCase()}\\nHost: ${booking.listing.host.name}`,
      `LOCATION:${booking.listing.address}, ${booking.listing.city}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--ww-parchment)" }}>
      {/* Hero confirmation strip */}
      <div style={{ background: "var(--ww-celadon)", padding: "48px 16px 80px" }}>
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <CheckCircle2 className="size-9 text-white" />
          </div>
          <p
            className="text-xs font-bold uppercase tracking-[0.22em] text-white/70"
          >
            Booking confirmed
          </p>
          <h1
            className="mt-2 text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            You&apos;re all set.
          </h1>
          <p className="mt-2 text-base text-white/80">
            Confirmation #{booking.id.slice(0, 8).toUpperCase()} · A receipt has been sent to your email
          </p>
        </div>
      </div>

      {/* Main card — overlaps hero */}
      <div className="mx-auto -mt-10 max-w-2xl px-4 pb-16">
        <div
          className="overflow-hidden rounded-3xl shadow-xl"
          style={{ background: "var(--ww-warm-white)", border: "1px solid var(--ww-mist)" }}
        >
          {/* Property header */}
          <div className="flex gap-5 p-6" style={{ borderBottom: "1px solid var(--ww-mist)" }}>
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage}
                alt={booking.listing.title}
                className="h-24 w-32 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div
                className="flex h-24 w-32 shrink-0 items-center justify-center rounded-xl text-3xl"
                style={{ background: "var(--ww-gold-light)" }}
              >
                🏠
              </div>
            )}
            <div className="min-w-0">
              <h2
                className="truncate text-lg font-semibold"
                style={{ color: "var(--ww-ink)", fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                {booking.listing.title}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: "#7a6e62" }}>
                <MapPin className="size-3.5 shrink-0" />
                {booking.listing.city}{booking.listing.state ? `, ${booking.listing.state}` : ""}
              </p>
              <p className="mt-1 text-sm" style={{ color: "#7a6e62" }}>
                Hosted by <span style={{ color: "var(--ww-ink)", fontWeight: 500 }}>{booking.listing.host.name}</span>
              </p>
            </div>
          </div>

          {/* Stay details */}
          <div className="grid grid-cols-2 gap-px" style={{ background: "var(--ww-mist)", borderBottom: "1px solid var(--ww-mist)" }}>
            {[
              { label: "Check-in", value: format(new Date(booking.checkIn), "EEE, d MMM yyyy") },
              { label: "Check-out", value: format(new Date(booking.checkOut), "EEE, d MMM yyyy") },
              { label: "Duration", value: `${nights} night${nights !== 1 ? "s" : ""}` },
              { label: "Guests", value: `${booking.numberOfGuests} guest${booking.numberOfGuests > 1 ? "s" : ""}` },
            ].map((item) => (
              <div key={item.label} className="px-5 py-4" style={{ background: "var(--ww-warm-white)" }}>
                <p className="ww-eyebrow text-[10px]">{item.label}</p>
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: "var(--ww-ink)", fontFamily: "var(--font-mono, monospace)" }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="space-y-2.5 p-5 text-sm" style={{ borderBottom: "1px solid var(--ww-mist)" }}>
            <div className="flex justify-between" style={{ color: "#7a6e62" }}>
              <span>{formatCurrency(booking.listing.pricePerDay, currency)} × {nights} night{nights !== 1 ? "s" : ""}</span>
              <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatCurrency(booking.subtotal, currency)}</span>
            </div>
            {booking.cleaningFee > 0 && (
              <div className="flex justify-between" style={{ color: "#7a6e62" }}>
                <span>Cleaning fee</span>
                <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatCurrency(booking.cleaningFee, currency)}</span>
              </div>
            )}
            <div
              className="flex justify-between border-t pt-2.5 font-semibold"
              style={{ borderColor: "var(--ww-mist)", color: "var(--ww-ink)" }}
            >
              <span>Total paid</span>
              <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--ww-celadon)" }}>
                {formatCurrency(booking.totalPrice, currency)}
              </span>
            </div>
          </div>

          {/* Attendees */}
          {booking.attendees.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--ww-mist)" }}>
              <p className="ww-eyebrow mb-3 flex items-center gap-1.5">
                <Users className="size-3.5" /> Team members
              </p>
              <div className="space-y-1">
                {booking.attendees.map((a) => (
                  <p key={a.id} className="text-sm" style={{ color: "#4a4540" }}>{a.email}</p>
                ))}
              </div>
            </div>
          )}

          {/* Special requests */}
          {booking.specialRequests && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--ww-mist)" }}>
              <p className="ww-eyebrow mb-2">Special requests</p>
              <p className="text-sm leading-relaxed" style={{ color: "#4a4540" }}>{booking.specialRequests}</p>
            </div>
          )}

          {/* Info strip */}
          <div className="space-y-3 px-5 py-5" style={{ background: "var(--ww-celadon-light)", borderBottom: "1px solid var(--ww-mist)" }}>
            {[
              { icon: Mail, text: "A full receipt has been emailed to your account." },
              { icon: MessageSquare, text: "Message your host anytime from your booking page." },
              { icon: CalendarDays, text: "Download the calendar invite below to block your dates." },
            ].map(({ icon: Icon, text }) => (
              <p key={text} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--ww-celadon)" }}>
                <Icon className="mt-0.5 size-4 shrink-0" />
                {text}
              </p>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 p-5">
            <Button
              className="flex-1"
              style={{ background: "var(--ww-ink)", color: "white" }}
              asChild
            >
              <Link href={`/bookings/${booking.id}`}>
                View booking <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>

            <Button variant="outline" style={{ borderColor: "var(--ww-mist)" }} asChild>
              <Link href={`/messages?listing=${booking.listingId}`}>
                <MessageSquare className="mr-1.5 size-4" />
                Message host
              </Link>
            </Button>

            <Button
              variant="outline"
              style={{ borderColor: "var(--ww-mist)" }}
              asChild
            >
              <a
                href={`data:text/calendar;charset=utf-8,${icsContent}`}
                download={`waywork-${booking.id.slice(0, 8)}.ics`}
              >
                <Download className="mr-1.5 size-4" />
                Add to calendar
              </a>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "#b8afa4" }}>
          Need help?{" "}
          <Link href="/support" className="underline hover:opacity-70">Contact support</Link>
          {" "}or{" "}
          <Link href="/search" className="underline hover:opacity-70">find another space</Link>
        </p>
      </div>
    </div>
  );
}
