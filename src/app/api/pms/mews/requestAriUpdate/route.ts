import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueAriSyncJob, processPendingMewsSyncJobs } from "@/lib/pms/mews-sync-queue";
import { createObservationContext, captureObservedError, logObservation } from "@/lib/observability";
import { isMewsProviderActive } from "@/lib/pms/provider-mode";

const requestAriBodySchema = z.object({
  connectionId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  if (!isMewsProviderActive()) {
    return NextResponse.json(
      { error: "Mews integration is disabled. Use SiteMinder endpoints." },
      { status: 410 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = createObservationContext("api.pms.mews.requestAriUpdate", {
    userId: session.user.id,
  });

  try {
    let payload: unknown = {};
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
    }

    const parsedBody = requestAriBodySchema.safeParse(payload);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid ARI request payload.", details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    let connectionId = parsedBody.data.connectionId;

    if (!connectionId) {
      const connection = await db.pmsConnection.findFirst({
        where: {
          userId: session.user.id,
          provider: "MEWS",
        },
        select: { id: true },
      });
      connectionId = connection?.id;
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: "No Mews connection configured for this user." },
        { status: 404 }
      );
    }

    const connection = await db.pmsConnection.findUnique({
      where: { id: connectionId },
      select: { userId: true },
    });

    if (!connection || connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobId = await enqueueAriSyncJob(connectionId);
    const processing = await processPendingMewsSyncJobs(5);

    if (processing.failed > 0 || processing.deadLetter > 0) {
      return NextResponse.json(
        {
          error: "ARI sync request was queued but failed initial processing. Check diagnostics.",
          eventId: context.eventId,
          jobId,
          processing,
        },
        { status: 409 }
      );
    }

    logObservation("info", "ARI update sync job queued", {
      ...context,
      connectionId,
      jobId,
      processing,
    });

    return NextResponse.json({ ok: true, eventId: context.eventId, jobId, processing });
  } catch (error) {
    const eventId = captureObservedError({
      error,
      message: "Failed to queue ARI update sync job",
      context,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to request ARI sync from Mews.",
        eventId,
      },
      { status: 500 }
    );
  }
}
