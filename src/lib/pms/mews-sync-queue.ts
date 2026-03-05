import { addMinutes } from "date-fns";
import { db } from "@/lib/db";
import { captureObservedError, createObservationContext, logObservation } from "@/lib/observability";
import { requestAriSyncForConnection, syncBookingToMews } from "@/lib/pms/mews-sync";

const MAX_SYNC_ATTEMPTS = 5;

function nextRetryDelayMinutes(attemptCount: number) {
  return Math.min(60, Math.pow(2, Math.max(0, attemptCount - 1)));
}

export async function enqueueBookingSyncJob(
  bookingId: string,
  action: "UPSERT" | "CANCEL"
): Promise<string | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      listingId: true,
      listing: {
        select: {
          pmsConnectionId: true,
          pmsConnection: {
            select: {
              id: true,
              provider: true,
              enabled: true,
            },
          },
        },
      },
    },
  });

  const connection = booking?.listing.pmsConnection;
  if (!booking || !connection || !connection.enabled || connection.provider !== "MEWS") {
    return null;
  }

  const job = await db.pmsSyncJob.create({
    data: {
      connectionId: connection.id,
      listingId: booking.listingId,
      bookingId: booking.id,
      type: action === "UPSERT" ? "BOOKING_UPSERT" : "BOOKING_CANCEL",
      status: "PENDING",
      nextAttemptAt: new Date(),
      payload: { action },
    },
    select: { id: true },
  });

  return job.id;
}

export async function enqueueAriSyncJob(connectionId: string): Promise<string> {
  const job = await db.pmsSyncJob.create({
    data: {
      connectionId,
      type: "REQUEST_ARI_UPDATE",
      status: "PENDING",
      nextAttemptAt: new Date(),
      payload: { reason: "manual_request" },
    },
    select: { id: true },
  });

  return job.id;
}

export async function processPendingMewsSyncJobs(limit = 25) {
  const now = new Date();
  const dueJobs = await db.pmsSyncJob.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
    },
    select: {
      id: true,
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  let completed = 0;
  let failed = 0;
  let deadLetter = 0;
  let skipped = 0;

  for (const dueJob of dueJobs) {
    const locked = await db.pmsSyncJob.updateMany({
      where: {
        id: dueJob.id,
        status: { in: ["PENDING", "FAILED"] },
      },
      data: {
        status: "PROCESSING",
        lockedAt: new Date(),
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    if (locked.count === 0) {
      skipped += 1;
      continue;
    }

    const job = await db.pmsSyncJob.findUnique({
      where: { id: dueJob.id },
      select: {
        id: true,
        type: true,
        connectionId: true,
        listingId: true,
        bookingId: true,
        attemptCount: true,
      },
    });

    if (!job) {
      skipped += 1;
      continue;
    }

    const context = createObservationContext("pms.sync.job", {
      jobId: job.id,
      type: job.type,
      connectionId: job.connectionId,
      listingId: job.listingId,
      bookingId: job.bookingId,
      attemptCount: job.attemptCount,
    });

    try {
      if (job.type === "BOOKING_UPSERT") {
        if (!job.bookingId) throw new Error("Booking sync job is missing bookingId.");
        const result = await syncBookingToMews(job.bookingId, "UPSERT");
        if (!result.ok) throw new Error(result.error || "Booking UPSERT sync failed.");
      } else if (job.type === "BOOKING_CANCEL") {
        if (!job.bookingId) throw new Error("Booking sync job is missing bookingId.");
        const result = await syncBookingToMews(job.bookingId, "CANCEL");
        if (!result.ok) throw new Error(result.error || "Booking CANCEL sync failed.");
      } else if (job.type === "REQUEST_ARI_UPDATE") {
        await requestAriSyncForConnection(job.connectionId);
      }

      await db.pmsSyncJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });

      logObservation("info", "PMS sync job completed", context);
      completed += 1;
    } catch (error) {
      const isDeadLetter = job.attemptCount >= MAX_SYNC_ATTEMPTS;
      const errorMessage = error instanceof Error ? error.message : "Unknown sync job error";

      await db.pmsSyncJob.update({
        where: { id: job.id },
        data: {
          status: isDeadLetter ? "DEAD_LETTER" : "FAILED",
          nextAttemptAt: isDeadLetter
            ? undefined
            : addMinutes(new Date(), nextRetryDelayMinutes(job.attemptCount)),
          lockedAt: null,
          lastError: errorMessage,
        },
      });

      if (isDeadLetter) {
        await db.pmsSyncEvent.create({
          data: {
            connectionId: job.connectionId,
            listingId: job.listingId || undefined,
            bookingId: job.bookingId || undefined,
            direction: "OUTBOUND",
            action: "JOB_DEAD_LETTER",
            success: false,
            error: errorMessage,
            requestPayload: {
              jobId: job.id,
              type: job.type,
              attemptCount: job.attemptCount,
            },
          },
        });
      }

      captureObservedError({
        error,
        message: isDeadLetter ? "PMS sync job moved to dead letter" : "PMS sync job failed",
        context,
      });

      if (isDeadLetter) {
        deadLetter += 1;
      } else {
        failed += 1;
      }
    }
  }

  return {
    scanned: dueJobs.length,
    completed,
    failed,
    deadLetter,
    skipped,
  };
}

export async function retryFailedMewsSyncJobs(input: {
  connectionId: string;
  listingId?: string;
  bookingId?: string;
}) {
  const updated = await db.pmsSyncJob.updateMany({
    where: {
      connectionId: input.connectionId,
      listingId: input.listingId,
      bookingId: input.bookingId,
      status: { in: ["FAILED", "DEAD_LETTER"] },
    },
    data: {
      status: "PENDING",
      nextAttemptAt: new Date(),
      lockedAt: null,
      lastError: null,
    },
  });

  return updated.count;
}

export async function getMewsSyncQueueCounts(connectionId: string) {
  const [pending, failed, deadLetter] = await Promise.all([
    db.pmsSyncJob.count({ where: { connectionId, status: "PENDING" } }),
    db.pmsSyncJob.count({ where: { connectionId, status: "FAILED" } }),
    db.pmsSyncJob.count({ where: { connectionId, status: "DEAD_LETTER" } }),
  ]);

  return { pending, failed, deadLetter };
}
