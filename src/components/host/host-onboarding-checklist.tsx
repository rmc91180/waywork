import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface HostOnboardingStep {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  href: string;
  ctaLabel: string;
}

interface HostOnboardingChecklistProps {
  steps: HostOnboardingStep[];
}

export function HostOnboardingChecklist({ steps }: HostOnboardingChecklistProps) {
  const total = steps.length;
  const completed = steps.filter((step) => step.complete).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const nextStep = steps.find((step) => !step.complete) || null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ww-secondary-green)]">
            Host Onboarding
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--ww-primary-blue)]">
            Launch Checklist
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Complete these steps to go live with direct host controls and full channel manager readiness.
          </p>
        </div>
        <Badge variant={completed === total ? "default" : "secondary"}>
          {completed}/{total} complete
        </Badge>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[var(--ww-secondary-green)] transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{percent}% setup complete</p>
      </div>

      {nextStep ? (
        <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-800">
            Next Recommended Step
          </p>
          <p className="mt-1 text-sm font-semibold text-cyan-900">{nextStep.title}</p>
          <p className="text-sm text-cyan-800">{nextStep.description}</p>
          <Button
            size="sm"
            className="mt-2 bg-[var(--ww-primary-blue)] text-white hover:bg-[var(--ww-secondary-green)]"
            asChild
          >
            <Link href={nextStep.href}>
              {nextStep.ctaLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Checklist complete. Your host setup is production-ready for direct operations and PMS sync.
        </div>
      )}

      <div className="mt-4 space-y-2">
        {steps.map((step) => (
          <article
            key={step.id}
            className={`rounded-xl border p-3 ${
              step.complete ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {step.complete ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <Circle className="size-4 text-slate-400" />
                  )}
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{step.description}</p>
              </div>
              <Button size="sm" variant={step.complete ? "outline" : "default"} asChild>
                <Link href={step.href}>{step.complete ? "Review" : step.ctaLabel}</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
