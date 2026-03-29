"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search } from "lucide-react";
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

export function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
      <div className="waywork-shell">
        <div className="flex h-18 items-center justify-between gap-4">
          <Link href="/" className="group inline-flex items-center gap-3">
            <BrandLogo compact />
          </Link>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <Link href="/search" aria-label="Search spaces">
                <Search className="size-4" />
                Search
              </Link>
            </Button>
            {status === "loading" ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-slate-200 bg-white">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || ""}
                      />
                      <AvatarFallback>
                        {session.user.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="space-y-0.5 px-2 py-1.5">
                    <p className="text-sm font-semibold">{session.user.name || "User"}</p>
                    <p className="truncate text-xs text-slate-500">{session.user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/bookings">My Bookings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites">Saved Spaces</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages">Messages</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/host">Host Dashboard</Link>
                  </DropdownMenuItem>
                  {session.user.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard">Admin Console</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-red-600"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="hidden sm:inline-flex" asChild>
                  <Link href="/login" onClick={(event) => handleAuthClick(event, "/login")}>
                    Log In
                  </Link>
                </Button>
                <Button
                  className="bg-[var(--ww-accent-orange)] text-[var(--ww-primary-blue)] shadow-sm shadow-orange-300/40 hover:bg-[var(--ww-neutral-light)]"
                  asChild
                >
                  <Link href="/register" onClick={(event) => handleAuthClick(event, "/register")}>
                    Sign Up
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="hidden lg:inline-flex text-[var(--ww-secondary-green)]"
                  asChild
                >
                  <Link href="/register?callbackUrl=%2Fhost">Become a Host</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
