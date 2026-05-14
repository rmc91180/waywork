import type { ListingAmenity, ConnectivityProfile } from "@/generated/prisma";

interface WorkScoreInput {
  amenities: Pick<ListingAmenity, "category" | "name" | "quantity">[];
  connectivity: Pick<
    ConnectivityProfile,
    "declaredDownloadMbps" | "declaredUploadMbps"
  > & { verified?: boolean } | null;
}

export interface WorkScoreBreakdown {
  connectivity: number;   // max 40 — internet is the #1 work tool
  deskSetup: number;      // max 20 — physical workspace quality
  quietEnvironment: number; // max 15 — focus and call quality
  meetingSpace: number;   // max 10 — team collaboration capability
  ergonomics: number;     // max 8  — physical comfort for long sessions
  officeEquipment: number;// max 7  — professional extras
  total: number;          // max 100
  // Legacy field kept for UI compatibility
  avReadiness: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// WORK SCORE — Weight Philosophy
//
//  Internet connectivity is the single non-negotiable for remote work.
//  A space with 500 Mbps fiber and a basic desk is more productive than
//  a luxury apartment with 10 Mbps WiFi. The algorithm reflects this.
//
//  Max points by category:
//  ┌─────────────────────┬─────┬─────────────────────────────────────────┐
//  │ Connectivity        │  40 │ Download, upload, verified, backup, type│
//  │ Desk & Display      │  20 │ Desk, standing, monitor, big screen     │
//  │ Quiet & Focus       │  15 │ Private, soundproofing, dedicated room  │
//  │ Meeting & AV        │  10 │ Table, whiteboard, webcam, HDMI         │
//  │ Ergonomics          │   8 │ Chair, adjustable, lighting             │
//  │ Office Equipment    │   7 │ Printer, business TV, UPS, safe storage │
//  ├─────────────────────┼─────┤                                         │
//  │ Total               │ 100 │                                         │
//  └─────────────────────┴─────┴─────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════════

export function computeWorkScore(input: WorkScoreInput): WorkScoreBreakdown {
  const { amenities, connectivity } = input;

  // ─── Helpers ───────────────────────────────────────────────────────────
  const has = (category: string, pattern?: string) =>
    amenities.some(
      (a) =>
        a.category === category &&
        (!pattern || a.name.toLowerCase().includes(pattern.toLowerCase()))
    );

  const count = (category: string) =>
    amenities.filter((a) => a.category === category).length;

  // ─── 1. CONNECTIVITY (max 40) ──────────────────────────────────────────
  //
  //  Download speed   max 20  — raw throughput for files, video, cloud tools
  //  Upload speed     max 10  — video calls are upload-bound; most critical
  //  Connection type  max 4   — fiber/ethernet > cable > WiFi-only
  //  Verified test    max 3   — declared speed vs guest-tested (trust signal)
  //  Backup/redundancy max 3  — 5G backup, second ISP, mobile hotspot
  //
  let connectivity_score = 0;

  if (connectivity) {
    const dl = connectivity.declaredDownloadMbps ?? 0;
    const ul = connectivity.declaredUploadMbps ?? 0;
    const verified = connectivity.verified ?? false;

    // Download speed (max 20)
    // Tiers calibrated to real remote work needs:
    //   <10 Mbps  — unusable for video calls
    //   10-24     — barely manageable, single user
    //   25-49     — acceptable solo
    //   50-99     — comfortable solo, marginal for teams
    //   100-199   — good for teams of 2-3
    //   200-499   — great, handles concurrent streams
    //   500+      — elite, enterprise-grade
    if      (dl >= 500) connectivity_score += 20;
    else if (dl >= 200) connectivity_score += 17;
    else if (dl >= 100) connectivity_score += 14;
    else if (dl >= 50)  connectivity_score += 10;
    else if (dl >= 25)  connectivity_score += 6;
    else if (dl >= 10)  connectivity_score += 3;
    else if (dl > 0)    connectivity_score += 1;

    // Upload speed (max 10)
    // Video calls (Zoom, Teams, Meet) need 3-5 Mbps upload per participant.
    // A team of 4 on a call needs 15-20 Mbps upload minimum.
    if      (ul >= 100) connectivity_score += 10;
    else if (ul >= 50)  connectivity_score += 8;
    else if (ul >= 20)  connectivity_score += 6;
    else if (ul >= 10)  connectivity_score += 4;
    else if (ul >= 5)   connectivity_score += 2;
    else if (ul > 0)    connectivity_score += 1;

    // Connection type (max 4) — inferred from amenity declarations
    const hasFiber    = has("CONNECTIVITY", "fiber");
    const hasEthernet = has("CONNECTIVITY", "ethernet") || has("CONNECTIVITY", "wired");
    const hasBoth     = has("CONNECTIVITY", "both") || (has("CONNECTIVITY", "wifi") && hasEthernet);
    if      (hasFiber && hasEthernet) connectivity_score += 4;
    else if (hasFiber || hasBoth)     connectivity_score += 3;
    else if (hasEthernet)             connectivity_score += 2;

    // Verified speed test (max 3) — guest-verified > host-declared
    if (verified) connectivity_score += 3;

    // Backup / redundancy (max 3)
    if (has("CONNECTIVITY", "backup") || has("CONNECTIVITY", "second") ||
        has("CONNECTIVITY", "5g")     || has("CONNECTIVITY", "hotspot") ||
        has("CONNECTIVITY", "4g"))    connectivity_score += 3;
  }
  connectivity_score = Math.min(connectivity_score, 40);

  // ─── 2. DESK & DISPLAY (max 20) ────────────────────────────────────────
  //
  //  A real desk (not a dining table or coffee table)  max 7
  //  Standing desk or height-adjustable option         max 4
  //  External monitor or dedicated display             max 4
  //  Big screen 60"+ (presentation / shared view)      max 5 (bonus)
  //
  let desk = 0;
  if (has("DESK"))                                          desk += 7;
  if (has("DESK", "standing") || has("DESK", "adjustable") ||
      has("DESK", "height"))                                desk += 4;
  if (has("MONITOR") || has("AV", "monitor") ||
      has("AV", "display"))                                 desk += 4;
  // Big screen 60"+ — great for shared work sessions and presentations
  if (has("AV", "60\"") || has("AV", "65\"") || has("AV", "70\"") ||
      has("AV", "75\"") || has("AV", "85\"") || has("AV", "big screen") ||
      has("AV", "large screen") || has("AV", "presentation screen") ||
      has("AV", "60 inch") || has("AV", "65 inch"))         desk += 5;
  desk = Math.min(desk, 20);

  // ─── 3. QUIET & FOCUS (max 15) ─────────────────────────────────────────
  //
  //  Background noise is the #1 complaint on work calls. A space marketed
  //  as "quiet" or "private" gets full base credit. Dedicated rooms add more.
  //
  let quiet = 0;
  if (has("QUIET", "quiet") || has("QUIET", "private") ||
      has("QUIET", "soundproof"))                           quiet += 8;
  if (count("QUIET") > 0)                                   quiet += 4;
  // Dedicated office / study room — separate from sleeping area
  if (has("QUIET", "office") || has("QUIET", "study") ||
      has("QUIET", "dedicated") || has("DESK", "office"))   quiet += 3;
  quiet = Math.min(quiet, 15);

  // ─── 4. MEETING & AV (max 10) ──────────────────────────────────────────
  //
  //  Conference/meeting table                           max 3
  //  Whiteboard or flipchart                            max 2
  //  Webcam (built-in or external)                      max 2
  //  HDMI cable / DisplayPort (laptop-to-screen)        max 2
  //  Speaker / speakerphone for calls                   max 1
  //
  let meeting = 0;
  if (has("MEETING", "table") || has("MEETING", "conference") ||
      has("MEETING", "boardroom"))                          meeting += 3;
  if (has("MEETING", "whiteboard") || has("MEETING", "flipchart") ||
      has("MEETING", "glass wall"))                         meeting += 2;
  if (has("AV", "webcam") || has("AV", "camera"))          meeting += 2;
  if (has("AV", "hdmi") || has("CONNECTIVITY", "hdmi") ||
      has("AV", "displayport") || has("AV", "adapter"))    meeting += 2;
  if (has("AV", "speaker") || has("AV", "speakerphone"))   meeting += 1;
  meeting = Math.min(meeting, 10);

  // ─── 5. ERGONOMICS (max 8) ─────────────────────────────────────────────
  //
  //  Long-session comfort: chair quality, desk height, lighting, footrest
  //
  let ergonomics = 0;
  if (has("ERGONOMICS", "chair") || has("ERGONOMICS", "ergonomic"))
    ergonomics += 4;
  if (has("ERGONOMICS", "adjustable") || has("DESK", "adjustable"))
    ergonomics += 2;
  if (has("ERGONOMICS", "light") || has("ERGONOMICS", "lamp") ||
      has("ERGONOMICS", "lighting"))                        ergonomics += 1;
  if (has("ERGONOMICS", "footrest") || has("ERGONOMICS", "wrist") ||
      has("ERGONOMICS", "mat"))                             ergonomics += 1;
  ergonomics = Math.min(ergonomics, 8);

  // ─── 6. OFFICE EQUIPMENT (max 7) ───────────────────────────────────────
  //
  //  Professional extras that signal a workspace built for serious work:
  //  printer, business TV, UPS (power backup), secure storage, shredder
  //
  let office = 0;
  if (has("OFFICE", "printer") || has("OTHER", "printer"))  office += 3;
  if (has("AV", "cable tv") || has("AV", "business channel") ||
      has("AV", "cable") || has("OFFICE", "business tv"))   office += 2;
  if (has("OFFICE", "ups") || has("OFFICE", "power backup") ||
      has("OFFICE", "surge"))                                office += 1;
  if (has("OFFICE", "safe") || has("OFFICE", "locker") ||
      has("OFFICE", "secure storage") || has("OFFICE", "shredder"))
    office += 1;
  office = Math.min(office, 7);

  // ─── Total ─────────────────────────────────────────────────────────────
  const total = Math.min(
    connectivity_score + desk + quiet + meeting + ergonomics + office,
    100
  );

  return {
    connectivity:     connectivity_score,
    deskSetup:        desk,
    quietEnvironment: quiet,
    meetingSpace:     meeting,
    ergonomics,
    officeEquipment:  office,
    avReadiness:      office, // legacy alias for UI
    total,
  };
}

// ─── Searchable-but-not-scored attributes ───────────────────────────────────
// Practical logistics that matter to guests but don't directly affect
// productivity in the workspace itself.
export const SEARCHABLE_EXTRAS = [
  { key: "hasCellService",     label: "Good cell signal",         icon: "📶", detail: "Reliable 4G/5G coverage for mobile hotspot backup" },
  { key: "hasUberAccess",      label: "Uber / ride-share nearby", icon: "🚗", detail: "Ride-hailing available within 5 minutes" },
  { key: "hasPublicTransport", label: "Public transport nearby",  icon: "🚇", detail: "Metro, bus, or tram stop within walking distance" },
  { key: "hasParking",         label: "Parking available",        icon: "🅿️", detail: "On-site or nearby parking for guests with cars" },
  { key: "hasGroceryNearby",   label: "Grocery store nearby",     icon: "🛒", detail: "Supermarket within 10 minutes walk" },
  { key: "hasCoffeeNearby",    label: "Coffee shop nearby",       icon: "☕", detail: "Good café within 5 minutes for off-site meetings" },
  { key: "hasCoworkingNearby", label: "Coworking backup nearby",  icon: "🏢", detail: "Coworking space within 15 minutes as overflow option" },
  { key: "hasAirportAccess",   label: "Easy airport access",      icon: "✈️", detail: "Under 45 minutes to main airport" },
] as const;

export type SearchableExtraKey = typeof SEARCHABLE_EXTRAS[number]["key"];

// ─── Score tier labels ───────────────────────────────────────────────────────

export function getWorkScoreLabel(score: number): string {
  if (score >= 92) return "Elite";
  if (score >= 80) return "Excellent";
  if (score >= 68) return "Work-ready";
  if (score >= 52) return "Good start";
  if (score >= 36) return "Basic";
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

// ─── Score category metadata (for UI breakdown display) ─────────────────────

export const SCORE_CATEGORIES = [
  {
    key: "connectivity"      as const,
    label: "Connectivity",
    max: 40,
    icon: "wifi",
    description: "Internet speed (download + upload), connection type, verified test, backup",
    why: "Internet is the single non-negotiable. Nothing else compensates for bad connectivity.",
  },
  {
    key: "deskSetup"         as const,
    label: "Desk & Display",
    max: 20,
    icon: "monitor",
    description: "Dedicated desk, standing option, external monitor, big screen 60\"+",
    why: "A proper physical workspace prevents fatigue and enables multi-screen workflows.",
  },
  {
    key: "quietEnvironment"  as const,
    label: "Quiet & Focus",
    max: 15,
    icon: "volume-x",
    description: "Private rooms, soundproofing, dedicated office or study space",
    why: "Background noise on calls is unprofessional. A quiet space is a prerequisite for calls.",
  },
  {
    key: "meetingSpace"      as const,
    label: "Meeting & AV",
    max: 10,
    icon: "users",
    description: "Conference table, whiteboard, webcam, HDMI cable, speaker",
    why: "Team spaces need meeting infrastructure. Even solos need webcam and screen sharing.",
  },
  {
    key: "ergonomics"        as const,
    label: "Ergonomics",
    max: 8,
    icon: "armchair",
    description: "Ergonomic chair, adjustable desk, proper task lighting, footrest",
    why: "Long work sessions require physical comfort. Cheap chairs cause injury over weeks.",
  },
  {
    key: "officeEquipment"   as const,
    label: "Office Equipment",
    max: 7,
    icon: "printer",
    description: "Printer, business TV with cable, UPS power backup, secure storage",
    why: "Professional extras that signal a space built for serious business use.",
  },
] as const;

export type ScoreCategoryKey = typeof SCORE_CATEGORIES[number]["key"];
