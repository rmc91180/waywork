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

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={cn("h-10 w-10 shrink-0", compact && "h-9 w-9")}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="55%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${gradientId})`} />
        <path d="M14 28L32 14L50 28" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="17" y="28" width="30" height="22" rx="6" fill="#ffffff" fillOpacity="0.94" />
        <path d="M25 40H39" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 34V46" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold tracking-tight text-slate-900">
          {BRAND.name}
        </p>
        {!compact ? (
          <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">
            {BRAND.tagline}
          </p>
        ) : null}
        {showTagline ? (
          <p className="mt-1 max-w-sm text-xs text-slate-600">{BRAND.hostValueProp}</p>
        ) : null}
      </div>
    </div>
  );
}
