"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createThread } from "@/actions/messaging";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import { formatCurrency } from "@/lib/stripe";
import { WORKSPACE_TYPES } from "@/lib/constants";

type TeamStayCandidate = {
  id: string;
  title: string;
  maxGuests: number;
  pricePerDay: number;
  workspaceType: string;
  images: Array<{ url: string; alt: string | null }>;
};

interface TeamStayPlannerProps {
  listingId: string;
  listingTitle: string;
  hostName: string;
  city: string;
  currency: string;
  baseMaxGuests: number;
  basePricePerDay: number;
  mode: "same-building" | "city-portfolio";
  candidates: TeamStayCandidate[];
}

export function TeamStayPlanner({
  listingId,
  listingTitle,
  hostName,
  city,
  currency,
  baseMaxGuests,
  basePricePerDay,
  mode,
  candidates,
}: TeamStayPlannerProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedUnits = useMemo(
    () => candidates.filter((candidate) => selectedIds.includes(candidate.id)),
    [candidates, selectedIds]
  );

  const totalCapacity = baseMaxGuests + selectedUnits.reduce((sum, unit) => sum + unit.maxGuests, 0);
  const totalNightly = basePricePerDay + selectedUnits.reduce((sum, unit) => sum + unit.pricePerDay, 0);
  const totalUnits = 1 + selectedUnits.length;

  function toggleUnit(unitId: string) {
    setSelectedIds((current) => {
      const next = current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId];

      trackEvent({
        event: "team_stay_unit_toggled",
        properties: {
          listingId,
          unitId,
          selectedCount: next.length,
          mode,
        },
      });

      return next;
    });
  }

  async function handleGroupedInquiry() {
    if (selectedUnits.length === 0) return;

    const intro =
      mode === "same-building"
        ? "I would like to organize a multi-unit team stay in this building."
        : `I would like to organize a multi-unit team stay across your ${city} portfolio.`;

    const messageLines = [
      `Hi ${hostName || "there"},`,
      "",
      intro,
      "",
      `Primary stay: ${listingTitle}`,
      `Additional units requested: ${selectedUnits.map((unit) => unit.title).join("; ")}`,
      `Total units requested: ${totalUnits}`,
      `Estimated combined capacity: up to ${totalCapacity} guests`,
      `Estimated nightly subtotal: ${formatCurrency(totalNightly, currency)}`,
    ];

    if (teamSize.trim()) {
      messageLines.push(`Expected team size: ${teamSize.trim()}`);
    }

    if (note.trim()) {
      messageLines.push("", `Extra notes: ${note.trim()}`);
    }

    setSending(true);
    try {
      const result = await createThread({
        listingId,
        message: messageLines.join("\n"),
      });
      trackEvent({
        event: "team_stay_request_sent",
        properties: {
          listingId,
          mode,
          totalUnits,
          totalCapacity,
          selectedUnitIds: selectedUnits.map((unit) => unit.id),
        },
      });
      toast.success("Team stay request sent");
      setOpen(false);
      setTeamSize("");
      setNote("");
      setSelectedIds([]);
      router.push(`/messages/${result.threadId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send team stay request"
      );
    } finally {
      setSending(false);
    }
  }

  const eyebrow =
    mode === "same-building" ? "Same-building team stay" : "Team stay planner";
  const heading =
    mode === "same-building"
      ? "Bundle multiple units in one building"
      : `Pair this stay with more ${city} Limehome units`;
  const description =
    mode === "same-building"
      ? "Choose extra units in the same building and send one grouped request to the host."
      : `Need more room for an offsite? Combine this stay with nearby ${city} units and send one grouped request.`;

  return (
    <div className="mb-8 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{heading}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{description}</p>
        </div>
        <div className="grid min-w-[240px] gap-2 rounded-2xl border border-cyan-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Units</span>
            <span className="font-semibold text-slate-900">{totalUnits}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Guest capacity</span>
            <span className="font-semibold text-slate-900">Up to {totalCapacity}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Nightly estimate</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(totalNightly, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {candidates.map((candidate) => {
          const checked = selectedIds.includes(candidate.id);
          const workspaceLabel =
            WORKSPACE_TYPES[candidate.workspaceType as keyof typeof WORKSPACE_TYPES]?.label ||
            candidate.workspaceType;

          return (
            <div
              key={candidate.id}
              className={`overflow-hidden rounded-2xl border bg-white transition ${
                checked
                  ? "border-cyan-500 shadow-md shadow-cyan-100"
                  : "border-cyan-200 hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <div className="aspect-[4/3] bg-slate-100">
                {candidate.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={candidate.images[0].url}
                    alt={candidate.images[0].alt || candidate.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Additional unit
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold text-slate-900">{candidate.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{workspaceLabel}</p>
                  </div>
                  <Checkbox
                    id={`team-stay-${candidate.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleUnit(candidate.id)}
                    aria-label={`Select ${candidate.title} for a team stay`}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    Up to {candidate.maxGuests} guest{candidate.maxGuests === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    {formatCurrency(candidate.pricePerDay, currency)}/day
                  </Badge>
                </div>
                <Link
                  href={`/spaces/${candidate.id}`}
                  className="inline-flex text-sm font-medium text-cyan-700 underline-offset-4 hover:underline"
                >
                  View this unit
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-cyan-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-900">Primary stay included: {listingTitle}</p>
          <p className="mt-1 text-sm text-slate-600">
            Select at least one extra unit to send a grouped team-stay request.
          </p>
        </div>
        <Button
          onClick={() => {
            trackEvent({
              event: "team_stay_request_opened",
              properties: {
                listingId,
                mode,
                selectedCount: selectedUnits.length,
              },
            });
            setOpen(true);
          }}
          disabled={selectedUnits.length === 0}
          className="bg-[var(--ww-ink)] text-white hover:bg-[var(--ww-celadon)]"
        >
          Request multiple units
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a grouped team-stay request</DialogTitle>
            <DialogDescription>
              We&apos;ll open one message thread with the host and include the units you selected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-900">Included in this request</p>
              <ul className="mt-2 space-y-1 text-slate-600">
                <li>{listingTitle}</li>
                {selectedUnits.map((unit) => (
                  <li key={unit.id}>{unit.title}</li>
                ))}
              </ul>
              <p className="mt-3 text-slate-700">
                Up to {totalCapacity} guests · {formatCurrency(totalNightly, currency)} estimated per night
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="team-stay-size" className="text-sm font-medium text-slate-900">
                Expected team size
              </label>
              <Input
                id="team-stay-size"
                value={teamSize}
                onChange={(event) => setTeamSize(event.target.value)}
                placeholder="Example: 8 teammates"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="team-stay-note" className="text-sm font-medium text-slate-900">
                Notes for the host
              </label>
              <Textarea
                id="team-stay-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Tell the host about dates, arrival timing, or anything your team needs."
              />
            </div>
            <Button
              onClick={handleGroupedInquiry}
              disabled={sending || selectedUnits.length === 0}
              className="w-full"
            >
              {sending ? "Sending..." : "Send team stay request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
