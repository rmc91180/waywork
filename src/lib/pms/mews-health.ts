import { subDays } from "date-fns";
import { db } from "@/lib/db";

export interface MewsHealthSnapshot {
  score: number;
  mappedManagedListings: number;
  managedListings: number;
  outboundSuccessCount: number;
  outboundFailureCount: number;
  inboundSuccessCount: number;
  inboundFailureCount: number;
  pendingJobCount: number;
  failedJobCount: number;
  deadLetterJobCount: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
}

export async function computeMewsConnectionHealth(
  connectionId: string
): Promise<MewsHealthSnapshot> {
  const since = subDays(new Date(), 30);

  const [connection, events, pendingJobCount, failedJobCount, deadLetterJobCount] = await Promise.all([
    db.pmsConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        listings: {
          where: { status: { in: ["ACTIVE", "PAUSED"] } },
          select: { pmsExternalListingId: true },
        },
      },
    }),
    db.pmsSyncEvent.findMany({
      where: {
        connectionId,
        createdAt: { gte: since },
      },
      select: {
        direction: true,
        success: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.pmsSyncJob.count({
      where: {
        connectionId,
        status: "PENDING",
      },
    }),
    db.pmsSyncJob.count({
      where: {
        connectionId,
        status: "FAILED",
      },
    }),
    db.pmsSyncJob.count({
      where: {
        connectionId,
        status: "DEAD_LETTER",
      },
    }),
  ]);

  const managedListings = connection?.listings.length || 0;
  const mappedManagedListings = (connection?.listings || []).filter((listing) =>
    Boolean(listing.pmsExternalListingId)
  ).length;

  const outboundEvents = events.filter((event) => event.direction === "OUTBOUND");
  const inboundEvents = events.filter((event) => event.direction === "INBOUND");

  const outboundSuccessCount = outboundEvents.filter((event) => event.success).length;
  const outboundFailureCount = outboundEvents.filter((event) => !event.success).length;
  const inboundSuccessCount = inboundEvents.filter((event) => event.success).length;
  const inboundFailureCount = inboundEvents.filter((event) => !event.success).length;

  const lastSuccessAt = events.find((event) => event.success)?.createdAt || null;
  const lastFailureAt = events.find((event) => !event.success)?.createdAt || null;

  const totalEvents = Math.max(1, events.length);
  const failureRate = (outboundFailureCount + inboundFailureCount) / totalEvents;

  let score = 100;
  score -= Math.round(failureRate * 40);

  if (managedListings > 0) {
    const mappingCoverage = mappedManagedListings / managedListings;
    score -= Math.round((1 - mappingCoverage) * 30);
  }

  score -= Math.min(20, deadLetterJobCount * 5);
  score -= Math.min(10, failedJobCount * 2);
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    mappedManagedListings,
    managedListings,
    outboundSuccessCount,
    outboundFailureCount,
    inboundSuccessCount,
    inboundFailureCount,
    pendingJobCount,
    failedJobCount,
    deadLetterJobCount,
    lastSuccessAt,
    lastFailureAt,
  };
}
