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

export function computeWorkScore(input: WorkScoreInput): WorkScoreBreakdown {
  const { amenities, connectivity } = input;

  // Connectivity (max 30)
  let connectivityScore = 0;
  if (connectivity) {
    const mbps = connectivity.declaredDownloadMbps;
    if (mbps >= 100) connectivityScore = 30;
    else if (mbps >= 50) connectivityScore = 22;
    else if (mbps >= 25) connectivityScore = 15;
    else if (mbps >= 10) connectivityScore = 8;
    else connectivityScore = 3;
  }

  // Helper to check if amenity exists by category and optional name pattern
  const hasAmenity = (category: string, namePattern?: string) =>
    amenities.some(
      (a) =>
        a.category === category &&
        (!namePattern ||
          a.name.toLowerCase().includes(namePattern.toLowerCase()))
    );

  const countAmenity = (category: string) =>
    amenities.filter((a) => a.category === category).length;

  // Desk Setup (max 20)
  let deskSetup = 0;
  if (hasAmenity("DESK")) deskSetup += 10;
  if (hasAmenity("DESK", "standing")) deskSetup += 5;
  if (hasAmenity("MONITOR")) deskSetup += 5;
  deskSetup = Math.min(deskSetup, 20);

  // Meeting Space (max 15)
  let meetingSpace = 0;
  if (hasAmenity("MEETING", "table") || hasAmenity("MEETING", "conference"))
    meetingSpace += 8;
  if (hasAmenity("MEETING", "whiteboard")) meetingSpace += 4;
  if (hasAmenity("AV", "video") || hasAmenity("AV", "conference"))
    meetingSpace += 3;
  meetingSpace = Math.min(meetingSpace, 15);

  // Quiet Environment (max 15)
  let quietEnvironment = 0;
  if (hasAmenity("QUIET", "quiet") || hasAmenity("QUIET", "private"))
    quietEnvironment += 10;
  if (countAmenity("QUIET") > 0) quietEnvironment += 5;
  quietEnvironment = Math.min(quietEnvironment, 15);

  // Ergonomics (max 10)
  let ergonomics = 0;
  if (hasAmenity("ERGONOMICS", "chair")) ergonomics += 5;
  if (hasAmenity("ERGONOMICS", "adjustable") || hasAmenity("DESK", "adjustable"))
    ergonomics += 3;
  if (hasAmenity("ERGONOMICS", "light") || hasAmenity("ERGONOMICS", "lamp"))
    ergonomics += 2;
  ergonomics = Math.min(ergonomics, 10);

  // AV Readiness (max 10)
  let avReadiness = 0;
  if (hasAmenity("MONITOR") || hasAmenity("AV", "monitor")) avReadiness += 4;
  if (hasAmenity("AV", "webcam") || hasAmenity("AV", "camera"))
    avReadiness += 3;
  if (hasAmenity("AV", "speaker")) avReadiness += 3;
  avReadiness = Math.min(avReadiness, 10);

  const total =
    connectivityScore +
    deskSetup +
    meetingSpace +
    quietEnvironment +
    ergonomics +
    avReadiness;

  return {
    connectivity: connectivityScore,
    deskSetup,
    meetingSpace,
    quietEnvironment,
    ergonomics,
    avReadiness,
    total: Math.min(total, 100),
  };
}

export function getWorkScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-orange-600";
}

export function getWorkScoreBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}
