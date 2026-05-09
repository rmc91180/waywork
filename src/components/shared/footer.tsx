import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

const LINKS = [
  { href: "/about",   label: "About us" },
  { href: "/terms",   label: "Terms"    },
  { href: "/privacy", label: "Privacy"  },
  { href: "/support", label: "Contact"  },
];

export function Footer() {
  return (
    <footer
      style={{
        background: "linear-gradient(180deg, var(--ww-parchment) 0%, #f0ebe2 100%)",
        borderTop: "1px solid var(--ww-mist)",
      }}
    >
      <div
        className="waywork-shell flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-between"
      >
        {/* Brand */}
        <BrandLogo compact />

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm transition-colors"
              style={{ color: "#7a6e62" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-xs" style={{ color: "#b8afa4" }}>
          © {new Date().getFullYear()} Way Work
        </p>
      </div>
    </footer>
  );
}
