"use client";

import { useMemo } from "react";
import { Wifi, Monitor, Users, Volume2, Armchair, Video, TrendingUp } from "lucide-react";
import { computeWorkScore } from "@/lib/work-score";
import { cn } from "@/lib/utils";

interface Amenity {
  category: string;
  name: string;
  quantity: number;
}

interface Connectivity {
  declaredDownloadMbps: number;
  declaredUploadMbps: number;
}

interface WorkScorePreviewProps {
  amenities: Amenity[];
  connectivity: Connectivity;
  /** Which wizard step (0-indexed) — controls whether to show nudges */
  currentStep?: number;
}

const CATEGORIES = [
  { key: "connectivity", label: "Connectivity", max: 30, icon: Wifi, tip: "Speed & network type" },
  { key: "deskSetup", label: "Desk Setup", max: 20, icon: Monitor, tip: "Desk, monitor, standing option" },
  { key: "meetingSpace", label: "Meeting", max: 15, icon: Users, tip: "Conference table, whiteboard" },
  { key: "quietEnvironment", label: "Quiet", max: 15, icon: Volume2, tip: "Private rooms, focus environment" },
  { key: "ergonomics", label: "Ergonomics", max: 10, icon: Armchair, tip: "Chair, lighting, adjustable desk" },
  { key: "avReadiness", label: "AV Ready", max: 10, icon: Video, tip: "Webcam, speaker, monitor" },
] as const;

// Quick-win suggestions keyed by what's missing
const QUICK_WINS: { condition: (s: ReturnType<typeof computeWorkScore>, a: Amenity[]) => boolean; text: string; pts: string }[] = [
  {
    condition: (s) => s.deskSetup < 15,
    text: "Add a standing desk option",
    pts: "+5 pts",
  },
  {
    condition: (s, a) => !a.some((x) => x.name.toLowerCase().includes("monitor") || x.name.toLowerCase().includes("screen")),
    text: "Add an external monitor",
    pts: "+5 pts",
  },
  {
    condition: (s, a) => !a.some((x) => x.name.toLowerCase().includes("webcam")),
    text: "Add a webcam",
    pts: "+3 pts",
  },
  {
    condition: (s, a) => !a.some((x) => x.name.toLowerCase().includes("speaker") || x.name.toLowerCase().includes("bluetooth")),
    text: "Add a Bluetooth speaker",
    pts: "+2 pts",
  },
  {
    condition: (s) => s.meetingSpace < 10,
    text: "Add a whiteboard",
    pts: "+4 pts",
  },
  {
    condition: (s, a) => !a.some((x) => x.name.toLowerCase().includes("ergonomic") || x.name.toLowerCase().includes("ergo")),
    text: "Add an ergonomic chair",
    pts: "+5 pts",
  },
  {
    condition: (s, a) => !a.some((x) => x.name.toLowerCase().includes("lamp") || x.name.toLowerCase().includes("light")),
    text: "Add an adjustable desk lamp",
    pts: "+3 pts",
  },
];

function scoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.7) return "bg-emerald-500";
  if (pct >= 0.4) return "bg-amber-400";
  return "bg-slate-300";
}

function totalColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-slate-500";
}

function scoreLabel(score: number) {
  if (score >= 85) return "Exceptional";
  if (score >= 70) return "Work-ready";
  if (score >= 55) return "Good start";
  return "Needs work";
}

export function WorkScorePreview({ amenities, connectivity, currentStep = 0 }: WorkScorePreviewProps) {
  const score = useMemo(
    () =>
      computeWorkScore({
        amenities: amenities.map((a) => ({
          category: a.category as Parameters<typeof computeWorkScore>[0]["amenities"][0]["category"],
          name: a.name,
          quantity: a.quantity,
        })),
        connectivity:
          connectivity.declaredDownloadMbps > 0
            ? {
                declaredDownloadMbps: connectivity.declaredDownloadMbps,
                declaredUploadMbps: connectivity.declaredUploadMbps,
              }
            : null,
      }),
    [amenities, connectivity]
  );

  const quickWins = useMemo(
    () => QUICK_WINS.filter((w) => w.condition(score, amenities)).slice(0, 3),
    [score, amenities]
  );

  // Only show on amenities (step 4) and connectivity (step 5) and review (step 8)
  const showNudges = currentStep >= 4;

  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--ww-ink)] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100/70">
              Work Score preview
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={cn("text-4xl font-bold text-white tabular-nums")}>{score.total}</span>
              <span className="text-sm text-blue-300">/100</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                score.total >= 80
                  ? "bg-emerald-400/20 text-emerald-300"
                  : score.total >= 60
                    ? "bg-amber-400/20 text-amber-300"
                    : "bg-slate-400/20 text-slate-300"
              )}
            >
              {scoreLabel(score.total)}
            </div>
            <TrendingUp className="size-4 text-blue-300" />
          </div>
        </div>

        {/* Total bar */}
        <div className="mt-3 h-2 w-full rounded-full bg-white/20">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              score.total >= 80 ? "bg-emerald-400" : score.total >= 60 ? "bg-amber-400" : "bg-slate-400"
            )}
            style={{ width: `${score.total}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Breakdown
        </p>
        {CATEGORIES.map((cat) => {
          const val = score[cat.key as keyof typeof score] as number;
          const Icon = cat.icon;
          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">{cat.label}</span>
                </div>
                <span className={cn("text-xs font-semibold tabular-nums", val === 0 ? "text-slate-300" : "text-slate-700")}>
                  {val === 0 ? "—" : `${val}/${cat.max}`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", scoreColor(val, cat.max))}
                  style={{ width: val === 0 ? "0%" : `${(val / cat.max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick wins — only show from amenities step onwards */}
      {showNudges && quickWins.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Quick wins to boost your score
          </p>
          <ul className="space-y-2">
            {quickWins.map((w) => (
              <li key={w.text} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700">
                  +
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-slate-700">{w.text}</span>
                  <span className="ml-1.5 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {w.pts}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Context message */}
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-400 leading-relaxed">
        {score.total >= 80
          ? "🏆 Top-tier score — guests will filter for this listing specifically."
          : score.total >= 65
            ? "✓ Good score — you'll appear in most filtered searches."
            : "Fill in your amenities and connectivity to improve your score."}
      </div>
    </div>
  );
}
