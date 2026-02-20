import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold tracking-tight">WayWork</h3>
            <p className="mt-2 text-sm text-gray-600">
              The marketplace for work-verified offsite spaces.
            </p>
          </div>

          {/* For Guests */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              For Guests
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/search"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Find Spaces
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* For Hosts */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              For Hosts
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/host/listings"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  List Your Space
                </Link>
              </li>
              <li>
                <Link
                  href="/host-guide"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Host Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} WayWork. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
