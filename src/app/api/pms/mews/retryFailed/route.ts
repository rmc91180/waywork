import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  processPendingMewsSyncJobs,
  retryFailedMewsSyncJobs,
  getMewsSyncQueueCounts,
} from "@/lib/pms/mews-sync-queue";
import { createObservationContext, captureObservedError, logObservation } from "@/lib/observability";
import { isMewsProviderActive } from "@/lib/pms/provider-mode";

const retryPayloadSchema = z.object({
  listingId: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
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

  let payload: unknown = {};
  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  }

  const parsed = retryPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid retry payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const connection = await db.pmsConnection.findFirst({
    where: {
      userId: session.user.id,
      provider: "MEWS",
    },
    select: { id: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "No Mews connection found." }, { status: 404 });
  }

  const context = createObservationContext("api.pms.mews.retryFailed", {
    userId: session.user.id,
    connectionId: connection.id,
    listingId: parsed.data.listingId,
    bookingId: parsed.data.bookingId,
  });

  try {
    const retriedCount = await retryFailedMewsSyncJobs({
      connectionId: connection.id,
      listingId: parsed.data.listingId,
      bookingId: parsed.data.bookingId,
    });

    const processing = await processPendingMewsSyncJobs(25);
    const queueCounts = await getMewsSyncQueueCounts(connection.id);

    logObservation("info", "Retry failed sync jobs requested", {
      ...context,
      retriedCount,
      processing,
      queueCounts,
    });

    return NextResponse.json({
      ok: true,
      eventId: context.eventId,
      retriedCount,
      processing,
      queueCounts,
    });
  } catch (error) {
    const eventId = captureObservedError({
      error,
      message: "Failed retrying sync jobs",
      context,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed retrying sync jobs.",
        eventId,
      },
      { status: 500 }
    );
  }
}
