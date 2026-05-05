import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { NewsletterForm } from "@/components/shared/newsletter-form";

const EXPLORE = [
  { href: "/search",    label: "Find spaces"   },
  { href: "/cities",    label: "Destinations"  },
  { href: "/for-teams", label: "For teams"     },
  { href: "/about",     label: "About"         },
  { href: "/blog",      label: "Blog"          },
];

const SUPPORT = [
  { href: "/support",           label: "Help centre"  },
  { href: "/terms#guest-terms", label: "Guest terms"  },
  { href: "/terms#host-terms",  label: "Host terms"   },
  { href: "/privacy",           label: "Privacy"      },
];

const HOST = [
  { href: "/host/listings/new", label: "List your space" },
  { href: "/host",              label: "Host dashboard"  },
];

export function Footer() {
  return (
    <footer
      style={{
        background: "linear-gradient(180deg, var(--ww-parchment) 0%, #f0ebe2 100%)",
        borderTop: "1px solid var(--ww-mist)",
      }}
    >
      {/* Main footer grid */}
      <div className="waywork-shell py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">

          {/* Brand column — wider */}
          <div className="lg:col-span-2">
            <BrandLogo showTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: "#7a6e62" }}>
              Work-ready homes for remote professionals and teams.
              Verified internet. Real desk setups. Cities worth living in.
            </p>

            {/* Social links */}
            <div className="mt-6 flex gap-3">
              {[
                { href: "https://x.com/waywork",       label: "X / Twitter", icon: "𝕏" },
                { href: "https://linkedin.com/company/waywork", label: "LinkedIn", icon: "in" },
              ].map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex size-8 items-center justify-center rounded-lg border text-xs font-bold transition"
                  style={{
                    borderColor: "var(--ww-mist)",
                    background: "var(--ww-warm-white)",
                    color: "var(--ww-ink)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ww-gold)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "var(--ww-gold-light)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ww-mist)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "var(--ww-warm-white)";
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <p className="ww-eyebrow mb-4">Explore</p>
            <ul className="space-y-2.5">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm transition-colors"
                    style={{ color: "#7a6e62" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ww-ink)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#7a6e62"; }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Host & Support */}
          <div>
            <p className="ww-eyebrow mb-4">Host</p>
            <ul className="space-y-2.5 mb-8">
              {HOST.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm transition-colors"
                    style={{ color: "#7a6e62" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ww-ink)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#7a6e62"; }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="ww-eyebrow mb-4">Support</p>
            <ul className="space-y-2.5">
              {SUPPORT.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm transition-colors"
                    style={{ color: "#7a6e62" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ww-ink)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#7a6e62"; }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <p className="ww-eyebrow mb-4">Stay in the loop</p>
            <p className="mb-3 text-sm leading-relaxed" style={{ color: "#7a6e62" }}>
              New cities, curated stays, and remote work tips — once a month, no spam.
            </p>
            <NewsletterForm />
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="waywork-shell flex flex-wrap items-center justify-between gap-2 border-t py-5 text-xs"
        style={{ borderColor: "var(--ww-mist)", color: "#b8afa4" }}
      >
        <p>© {new Date().getFullYear()} Way Work. All rights reserved.</p>
        <p className="flex items-center gap-1">
          Built for remote workers, by remote workers.
          <span style={{ color: "var(--ww-terra)" }}>♥</span>
        </p>
      </div>
    </footer>
  );
}
