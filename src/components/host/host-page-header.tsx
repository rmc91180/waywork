import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HostPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export function HostPageHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: HostPageHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6",
        className
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ww-celadon)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ww-ink)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm text-slate-600 md:text-base">{description}</p>
          ) : null}
          {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}
