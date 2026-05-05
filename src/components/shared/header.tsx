"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/search",    label: "Find spaces"  },
  { href: "/cities",    label: "Destinations" },
  { href: "/for-teams", label: "For teams"    },
];

export function Header() {
  const { data: session, status } = useSession();
  const router   = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const resolveAuthHref = (basePath: "/login" | "/register") => {
    if (typeof window === "undefined") return basePath;
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    if (callbackUrl?.startsWith("/")) {
      return `${basePath}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return basePath;
  };

  const handleAuthClick = (
    event: MouseEvent<HTMLAnchorElement>,
    basePath: "/login" | "/register"
  ) => {
    const targetHref = resolveAuthHref(basePath);
    if (targetHref === basePath) return;
    event.preventDefault();
    router.push(targetHref);
  };

  return (
    <>
      <header className="ww-header sticky top-0 z-50">
        <div className="waywork-shell">
          <div className="flex h-16 items-center justify-between gap-6">

            {/* Logo */}
            <Link href="/" className="shrink-0">
              <BrandLogo compact />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "text-[var(--ww-ink)]"
                      : "text-[#7a6e62] hover:text-[var(--ww-ink)]"
                  )}
                >
                  {link.label}
                  {pathname === link.href && (
                    <span className="absolute bottom-1 left-3.5 right-3.5 h-0.5 rounded-full bg-[var(--ww-gold)]" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">

              {/* Search icon — mobile */}
              <Button variant="ghost" size="icon" className="md:hidden text-[var(--ww-ink)]" asChild>
                <Link href="/search"><Search className="size-4.5" /></Link>
              </Button>

              {status === "loading" ? (
                <div className="size-8 animate-pulse rounded-full bg-[var(--ww-mist)]" />
              ) : session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-xl border border-[var(--ww-mist)] bg-[var(--ww-warm-white)] px-2.5 py-1.5 transition hover:border-[var(--ww-gold)] hover:shadow-sm">
                      <Avatar className="size-7">
                        <AvatarImage src={session.user.image || undefined} alt={session.user.name || ""} />
                        <AvatarFallback className="text-xs bg-[var(--ww-gold-light)] text-[var(--ww-ink)]">
                          {session.user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <Menu className="size-3.5 text-[#7a6e62]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-[var(--ww-mist)] bg-[var(--ww-warm-white)] shadow-xl">
                    <div className="space-y-0.5 px-2 py-2">
                      <p className="text-sm font-semibold text-[var(--ww-ink)]">{session.user.name || "Traveler"}</p>
                      <p className="truncate text-xs text-[#7a6e62]">{session.user.email}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-[var(--ww-mist)]" />
                    <DropdownMenuItem asChild><Link href="/bookings">My bookings</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/favorites">Saved spaces</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/messages">Messages</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/account">Account</Link></DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[var(--ww-mist)]" />
                    <DropdownMenuItem asChild><Link href="/host">Host dashboard</Link></DropdownMenuItem>
                    {session.user.role === "ADMIN" && (
                      <DropdownMenuItem asChild><Link href="/admin/dashboard">Admin</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-[var(--ww-mist)]" />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-red-600 focus:text-red-600"
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="hidden text-[var(--ww-ink)] sm:inline-flex"
                    asChild
                  >
                    <Link href="/login" onClick={(e) => handleAuthClick(e, "/login")}>
                      Log in
                    </Link>
                  </Button>
                  <Button
                    className="bg-[var(--ww-terra)] text-white hover:bg-[var(--ww-terra-deep)] shadow-sm"
                    asChild
                  >
                    <Link href="/register" onClick={(e) => handleAuthClick(e, "/register")}>
                      Get started
                    </Link>
                  </Button>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="rounded-lg p-2 text-[var(--ww-ink)] transition hover:bg-[var(--ww-gold-light)] md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-[var(--ww-ink)]/20 backdrop-blur-sm" />
          <nav
            className="absolute right-0 top-16 w-72 rounded-bl-2xl border-b border-l border-[var(--ww-mist)] bg-[var(--ww-warm-white)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-[var(--ww-ink)] transition hover:bg-[var(--ww-gold-light)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {!session?.user && (
              <div className="mt-4 border-t border-[var(--ww-mist)] pt-4 space-y-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-[var(--ww-mist)] py-2.5 text-sm font-medium text-[var(--ww-ink)] transition hover:border-[var(--ww-gold)]"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl bg-[var(--ww-terra)] py-2.5 text-sm font-medium text-white transition hover:bg-[var(--ww-terra-deep)]"
                >
                  Get started
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
