"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TEAM_SIZES = ["3–5", "6–10", "11–20", "21–30", "30+"];
const DURATIONS = ["3–5 nights", "6–9 nights", "10–14 nights", "2+ weeks"];
const PURPOSES = ["Strategy / planning", "Team bonding", "Deep focus sprint", "Onboarding", "Mixed"];
const CITIES = ["Madrid", "Lisbon", "Bangkok", "Bali", "Mexico City", "Barcelona", "Amsterdam", "Other / flexible"];

type Status = "idle" | "loading" | "success" | "error";

interface FormState {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  duration: string;
  purpose: string;
  city: string;
  dates: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "", email: "", company: "",
  teamSize: "", duration: "", purpose: "",
  city: "", dates: "", notes: "",
};

function Chip({
  label, selected, onClick,
}: {
  label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-1.5 text-sm font-medium transition-all",
        selected
          ? "border-[var(--ww-ink)] bg-[var(--ww-ink)] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-[var(--ww-ink)]/50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function ForTeamsIntakeForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>("idle");

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggle = (key: keyof FormState, val: string) =>
    setForm((f) => ({ ...f, [key]: f[key] === val ? "" : val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "success") return;
    if (!form.name || !form.email || !form.teamSize || !form.city) return;

    setStatus("loading");
    try {
      await fetch("/api/teams/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-8 py-12 text-center">
        <CheckCircle2 className="size-12 text-emerald-500" />
        <div>
          <h3 className="text-xl font-semibold text-emerald-900">Request received!</h3>
          <p className="mt-2 text-sm text-emerald-700">
            We&apos;ll send you 3–5 curated options within 48 hours at{" "}
            <strong>{form.email}</strong>. No commitment required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="waywork-section space-y-7 rounded-3xl p-7 md:p-9"
    >
      {/* Name + email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your name <span className="text-red-400">*</span>
          </Label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="Rafi Cohen"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--ww-celadon)] focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Work email <span className="text-red-400">*</span>
          </Label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            placeholder="rafi@company.com"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--ww-celadon)] focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      {/* Company */}
      <div className="space-y-1.5">
        <Label htmlFor="company" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Company name
        </Label>
        <input
          id="company"
          value={form.company}
          onChange={(e) => set("company")(e.target.value)}
          placeholder="Acme Inc."
          className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--ww-celadon)] focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Team size */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Team size <span className="text-red-400">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {TEAM_SIZES.map((s) => (
            <Chip key={s} label={s} selected={form.teamSize === s} onClick={() => toggle("teamSize", s)} />
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          How long?
        </Label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <Chip key={d} label={d} selected={form.duration === d} onClick={() => toggle("duration", d)} />
          ))}
        </div>
      </div>

      {/* Purpose */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Main purpose
        </Label>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <Chip key={p} label={p} selected={form.purpose === p} onClick={() => toggle("purpose", p)} />
          ))}
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Preferred city <span className="text-red-400">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <Chip key={c} label={c} selected={form.city === c} onClick={() => toggle("city", c)} />
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-1.5">
        <Label htmlFor="dates" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Rough dates or window
        </Label>
        <input
          id="dates"
          value={form.dates}
          onChange={(e) => set("dates")(e.target.value)}
          placeholder="e.g. Late September 2025, flexible within Q3"
          className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[var(--ww-celadon)] focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Anything else we should know?
        </Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set("notes")(e.target.value)}
          placeholder="Accessibility needs, must-haves, budget range, or anything specific..."
          rows={3}
          className="resize-none rounded-xl text-sm"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-500">
          Something went wrong — please try again or email us at{" "}
          <a href="mailto:teams@waywork.com" className="underline">teams@waywork.com</a>.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={status === "loading" || !form.name || !form.email || !form.teamSize || !form.city}
        className="w-full bg-[var(--ww-terra)] text-[var(--ww-ink)] font-semibold shadow-md shadow-orange-300/40 hover:brightness-95 disabled:opacity-60"
      >
        {status === "loading" ? (
          <><Loader2 className="mr-2 size-4 animate-spin" /> Sending request...</>
        ) : (
          "Send offsite request →"
        )}
      </Button>

      <p className="text-center text-xs text-slate-400">
        No commitment. We&apos;ll respond within 48 hours with curated options.
      </p>
    </form>
  );
}
