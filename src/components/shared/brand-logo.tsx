import { useId } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  compact?: boolean;
}

export function BrandLogo({
  className,
  showTagline = false,
  compact = false,
}: BrandLogoProps) {
  const gradientId = useId();
  const shineId = useId();

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Mark — a home with a forward-moving path, in gold */}
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className={cn("shrink-0", compact ? "h-8 w-8" : "h-9 w-9")}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0d1f2d" />
            <stop offset="100%" stopColor="#1a3a52" />
          </linearGradient>
          <linearGradient id={shineId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {/* Base */}
        <rect width="48" height="48" rx="13" fill={`url(#${gradientId})`} />
        <rect width="48" height="48" rx="13" fill={`url(#${shineId})`} />
        {/* House roof */}
        <path
          d="M10 22L24 11L38 22"
          fill="none"
          stroke="#c9a84c"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* House body */}
        <rect x="14" y="22" width="20" height="15" rx="4" fill="#c9a84c" fillOpacity="0.15" stroke="#c9a84c" strokeWidth="2" />
        {/* Laptop / work symbol inside */}
        <rect x="18" y="27" width="12" height="7" rx="2" fill="#c9a84c" fillOpacity="0.9" />
        <path d="M16 34h16" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="leading-tight">
        <p
          className="font-display font-bold tracking-tight"
          style={{
            color: "var(--ww-ink)",
            fontSize: compact ? "1.0625rem" : "1.125rem",
            letterSpacing: "-0.03em",
          }}
        >
          Way<span style={{ color: "var(--ww-gold)" }}>Work</span>
        </p>
        {!compact && !showTagline && (
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--ww-celadon)" }}
          >
            {BRAND.tagline}
          </p>
        )}
        {showTagline && (
          <p
            className="mt-0.5 max-w-xs text-[11px] leading-relaxed"
            style={{ color: "#7a6e62" }}
          >
            {BRAND.descriptor}
          </p>
        )}
      </div>
    </div>
  );
}
