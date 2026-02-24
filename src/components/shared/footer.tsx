import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70">
      <div className="waywork-shell py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-slate-900">WayWork</h3>
            <p className="mt-2 max-w-xs text-sm text-slate-600">
              The marketplace for work-verified offsite spaces.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              For Guests
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/search"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Find Spaces
                </Link>
              </li>
              <li>
                <Link
                  href="/bookings"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  My Bookings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              For Hosts
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/host/listings"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Listings Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/host/payouts"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Payouts
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/messages"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Messages
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/80 pt-6">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} WayWork. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
