import Link from "next/link";

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
        background: "#0d1f2d",
        borderTop: "1px solid rgba(201,168,76,0.2)",
      }}
    >
      <div
        className="waywork-shell flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-between"
      >
        {/* Brand */}
        <Link href="/" className="shrink-0">
          <span
            className="font-bold tracking-tight"
            style={{ color: "white", fontSize: "1rem", fontFamily: "var(--font-playfair), Georgia, serif", letterSpacing: "-0.02em" }}
          >
            Way<span style={{ color: "#c9a84c" }}>Work</span>
          </span>
        </Link>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          © {new Date().getFullYear()} Way Work
        </p>
      </div>
    </footer>
  );
}
