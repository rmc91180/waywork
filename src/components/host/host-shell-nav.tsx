"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const HOST_LINKS = [
  { href: "/host", label: "Dashboard" },
  { href: "/host/listings", label: "Listings" },
  { href: "/host/bookings", label: "Bookings" },
  { href: "/host/calendar", label: "Calendar" },
  { href: "/host/earnings", label: "Earnings" },
  { href: "/host/payouts", label: "Payouts" },
];

export function HostShellNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="waywork-shell">
        <nav className="flex gap-1 overflow-x-auto py-2">
          {HOST_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-cyan-700 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
