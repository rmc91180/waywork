import type { ListingAmenity, ConnectivityProfile } from "@/generated/prisma";

interface WorkScoreInput {
  amenities: Pick<ListingAmenity, "category" | "name" | "quantity">[];
  connectivity: Pick<
    ConnectivityProfile,
    "declaredDownloadMbps" | "declaredUploadMbps"
  > | null;
}

interface WorkScoreBreakdown {
  connectivity: number;
  deskSetup: number;
  meetingSpace: number;
  quietEnvironment: number;
  ergonomics: number;
  avReadiness: number;
  total: number;
}

// ─── Work Score weights (total max = 100) ───────────────────────────────────
//
//  Connectivity       max 30   (internet speed + upload + backup)
//  Desk & Display     max 22   (desk, standing, monitor, big screen 60"+)
//  Meeting & AV       max 18   (table, whiteboard, video conf, HDMI, projector)
//  Quiet & Focus      max 15   (private rooms, soundproofing)
//  Ergonomics         max 10   (chair, adjustable desk, lighting)
//  Office Equipment   max 5    (printer, business TV, cable)
//  ─────────────────────────
//  Total              max 100

export function computeWorkScore(input: WorkScoreInput): WorkScoreBreakdown {
  const { amenities, connectivity } = input;

  const hasAmenity = (category: string, namePattern?: string) =>
    amenities.some(
      (a) =>
        a.category === category &&
        (!namePattern ||
          a.name.toLowerCase().includes(namePattern.toLowerCase()))
    );

  const countAmenity = (category: string) =>
    amenities.filter((a) => a.category === category).length;

  // ── Connectivity (max 30) ──────────────────────────────────────────────
  let connectivityScore = 0;
  if (connectivity) {
    const dl = connectivity.declaredDownloadMbps;
    const ul = connectivity.declaredUploadMbps ?? 0;

    // Download speed
    if (dl >= 500)      connectivityScore += 20;
    else if (dl >= 200) connectivityScore += 18;
    else if (dl >= 100) connectivityScore += 15;
    else if (dl >= 50)  connectivityScore += 10;
    else if (dl >= 25)  connectivityScore += 6;
    else if (dl >= 10)  connectivityScore += 3;

    // Upload quality — important for video calls
    if (ul >= 100)      connectivityScore += 6;
    else if (ul >= 50)  connectivityScore += 5;
    else if (ul >= 20)  connectivityScore += 3;
    else if (ul >= 10)  connectivityScore += 1;

    // Backup connection
    if (hasAmenity("CONNECTIVITY", "backup") ||
        hasAmenity("CONNECTIVITY", "5g") ||
        hasAmenity("CONNECTIVITY", "hotspot")) {
      connectivityScore += 4;
    }
  }
  connectivityScore = Math.min(connectivityScore, 30);

  // ── Desk & Display (max 22) ────────────────────────────────────────────
  let deskSetup = 0;
  if (hasAmenity("DESK")) deskSetup += 8;
  if (hasAmenity("DESK", "standing") || hasAmenity("DESK", "adjustable"))
    deskSetup += 4;
  if (hasAmenity("MONITOR") || hasAmenity("AV", "monitor"))
    deskSetup += 4;
  // Big screen 60"+ is a major upgrade — replaces or supplements a monitor
  if (hasAmenity("AV", "60") || hasAmenity("AV", "65") ||
      hasAmenity("AV", "70") || hasAmenity("AV", "75") ||
      hasAmenity("AV", "85") || hasAmenity("AV", "big screen") ||
      hasAmenity("AV", "large screen") || hasAmenity("AV", "presentation screen"))
    deskSetup += 6;
  deskSetup = Math.min(deskSetup, 22);

  // ── Meeting & AV (max 18) ──────────────────────────────────────────────
  let meetingSpace = 0;
  if (hasAmenity("MEETING", "table") || hasAmenity("MEETING", "conference"))
    meetingSpace += 5;
  if (hasAmenity("MEETING", "whiteboard"))
    meetingSpace += 4;
  if (hasAmenity("AV", "video") || hasAmenity("AV", "conference"))
    meetingSpace += 3;
  if (hasAmenity("AV", "webcam") || hasAmenity("AV", "camera"))
    meetingSpace += 3;
  // HDMI cable — enables laptop-to-screen presentations
  if (hasAmenity("AV", "hdmi") || hasAmenity("CONNECTIVITY", "hdmi"))
    meetingSpace += 3;
  meetingSpace = Math.min(meetingSpace, 18);

  // ── Quiet & Focus (max 15) ─────────────────────────────────────────────
  let quietEnvironment = 0;
  if (hasAmenity("QUIET", "quiet") || hasAmenity("QUIET", "private"))
    quietEnvironment += 10;
  if (countAmenity("QUIET") > 0)
    quietEnvironment += 5;
  quietEnvironment = Math.min(quietEnvironment, 15);

  // ── Ergonomics (max 10) ────────────────────────────────────────────────
  let ergonomics = 0;
  if (hasAmenity("ERGONOMICS", "chair"))   ergonomics += 5;
  if (hasAmenity("ERGONOMICS", "adjustable") || hasAmenity("DESK", "adjustable"))
    ergonomics += 3;
  if (hasAmenity("ERGONOMICS", "light") || hasAmenity("ERGONOMICS", "lamp"))
    ergonomics += 2;
  ergonomics = Math.min(ergonomics, 10);

  // ── Office Equipment (max 5) ───────────────────────────────────────────
  // Printer, business TV with cable/business channels
  let officeEquip = 0;
  if (hasAmenity("OFFICE", "printer") || hasAmenity("OTHER", "printer"))
    officeEquip += 3;
  if (hasAmenity("AV", "cable tv") || hasAmenity("AV", "business channel") ||
      hasAmenity("AV", "cable") || hasAmenity("OFFICE", "business tv"))
    officeEquip += 2;
  officeEquip = Math.min(officeEquip, 5);

  const total = Math.min(
    connectivityScore + deskSetup + meetingSpace +
    quietEnvironment + ergonomics + officeEquip,
    100
  );

  return {
    connectivity: connectivityScore,
    deskSetup,
    meetingSpace,
    quietEnvironment,
    ergonomics,
    avReadiness: officeEquip, // kept as avReadiness for UI compatibility
    total,
  };
}

// ─── Searchable-but-not-scored attributes ───────────────────────────────────
// These show in search filters but don't affect Work Score.
// They address practical logistics that matter to guests.
export const SEARCHABLE_EXTRAS = [
  { key: "hasCellService",       label: "Good cell signal",          icon: "📶" },
  { key: "hasUberAccess",        label: "Uber / ride-share nearby",  icon: "🚗" },
  { key: "hasPublicTransport",   label: "Public transport access",   icon: "🚇" },
  { key: "hasParking",           label: "Parking available",         icon: "🅿️" },
  { key: "hasGroceryNearby",     label: "Grocery store nearby",      icon: "🛒" },
  { key: "hasCoffeeNearby",      label: "Coffee shop nearby",        icon: "☕" },
] as const;

export type SearchableExtraKey = typeof SEARCHABLE_EXTRAS[number]["key"];

// ─── Score tier helpers ──────────────────────────────────────────────────────

export function getWorkScoreLabel(score: number): string {
  if (score >= 90) return "Elite";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Work-ready";
  if (score >= 55) return "Good";
  if (score >= 40) return "Basic";
  return "Needs work";
}

export function getWorkScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-orange-500";
}

export function getWorkScoreBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}
