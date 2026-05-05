import Link from "next/link";

export const metadata = {
  title: "Support",
  description: "Get help with Way Work bookings, hosting, and account questions.",
};

export default function SupportPage() {
  return (
    <div className="waywork-shell py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-semibold text-[var(--ww-ink)]">Support</h1>
        <p className="mt-2 text-[var(--ww-celadon)]">
          Need help with booking, hosting, your account, or the legal terms that govern the platform?
          Start here.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-semibold text-[var(--ww-ink)]">Guests</h2>
          <p className="mt-2 text-sm text-[var(--ww-celadon)]">
            Booking support, cancellation windows, and payment questions.
          </p>
          <Link
            href="/bookings"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--ww-ink)] underline"
          >
            View your bookings
          </Link>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-semibold text-[var(--ww-ink)]">Hosts</h2>
          <p className="mt-2 text-sm text-[var(--ww-celadon)]">
            Listing setup, connectivity verification, and payout support.
          </p>
          <Link
            href="/host/listings"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--ww-ink)] underline"
          >
            Open host dashboard
          </Link>
        </article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-semibold text-[var(--ww-ink)]">Account</h2>
          <p className="mt-2 text-sm text-[var(--ww-celadon)]">
            Profile updates, authentication, and account security preferences.
          </p>
          <Link
            href="/account"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--ww-ink)] underline"
          >
            Manage account
          </Link>
        </article>
      </div>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Legal</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ww-ink)]">
              Clear links to the core legal pages
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="group rounded-[1.5rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              Guest Terms
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Booking rules for guests</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Covers booking flow, cancellation, house rules, consumer carveouts, and how the guest
              contract works on Way Work.
            </p>
            <Link
              href="/terms#guest-terms"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ww-ink)]"
            >
              Read guest terms
              <span aria-hidden>→</span>
            </Link>
          </article>

          <article className="group rounded-[1.5rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Host Terms
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Listing and payout terms</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sets the commercial and operational terms for hosts, including listing accuracy,
              commission, payout handling, liabilities, and dispute venue.
            </p>
            <Link
              href="/terms#host-terms"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ww-ink)]"
            >
              Read host terms
              <span aria-hidden>→</span>
            </Link>
          </article>

          <article className="group rounded-[1.5rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Privacy
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Data handling and rights</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Explains what we collect, why we collect it, how long we keep it, and the rights available
              to guests and hosts.
            </p>
            <Link
              href="/privacy"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ww-ink)]"
            >
              Read privacy policy
              <span aria-hidden>→</span>
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}
