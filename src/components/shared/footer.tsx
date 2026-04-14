import Link from "next/link";
import { Instagram, Linkedin, Send, Twitter } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-gradient-to-b from-white to-[#f8fbfa]">
      <div className="waywork-shell py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
          <div>
            <BrandLogo showTagline />
            <p className="mt-4 max-w-sm text-sm text-slate-600">
              Find high-speed work-ready homes and team hubs designed for productive travel.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Explore
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
                  href="/about"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/support"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/terms#guest-terms"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Guest Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/terms#host-terms"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Host Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Get Workation Deals
            </h4>
            <form action="/register" className="space-y-2">
              <label htmlFor="workation-email" className="sr-only">
                Email address
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="workation-email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--ww-secondary-green)] focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] transition hover:brightness-95"
                  aria-label="Submit email"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </form>
            <div className="mt-4 flex items-center gap-2">
              <Link
                href="https://x.com"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900"
                aria-label="Way Work on X"
              >
                <Twitter className="size-4" />
              </Link>
              <Link
                href="https://linkedin.com"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900"
                aria-label="Way Work on LinkedIn"
              >
                <Linkedin className="size-4" />
              </Link>
              <Link
                href="https://instagram.com"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900"
                aria-label="Way Work on Instagram"
              >
                <Instagram className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/80 pt-6">
          <p className="text-xs text-slate-500">
            &copy; 2026 Way Work. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
