import Link from "next/link";

export const metadata = {
  title: "Support",
  description: "Get help with Way Work bookings, hosting, and account questions.",
};

export default function SupportPage() {
  return (
    <div className="waywork-shell py-12">
      <h1 className="text-4xl font-semibold text-[var(--ww-primary-blue)]">Support</h1>
      <p className="mt-2 max-w-2xl text-[var(--ww-text-primary)]">
        Need help with booking, hosting, or your account? Start with these quick options.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-[var(--ww-primary-blue)]">Guests</h2>
          <p className="mt-2 text-sm text-[var(--ww-text-primary)]">
            Booking support, cancellation windows, and payment questions.
          </p>
          <Link href="/bookings" className="mt-4 inline-flex text-sm font-semibold text-[var(--ww-primary-blue)] underline">
            View your bookings
          </Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-[var(--ww-primary-blue)]">Hosts</h2>
          <p className="mt-2 text-sm text-[var(--ww-text-primary)]">
            Listing setup, connectivity verification, and payout support.
          </p>
          <Link
            href="/host/listings"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--ww-primary-blue)] underline"
          >
            Open host dashboard
          </Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-[var(--ww-primary-blue)]">Account</h2>
          <p className="mt-2 text-sm text-[var(--ww-text-primary)]">
            Profile updates, authentication, and account security preferences.
          </p>
          <Link href="/account" className="mt-4 inline-flex text-sm font-semibold text-[var(--ww-primary-blue)] underline">
            Manage account
          </Link>
        </article>
      </div>
    </div>
  );
}

