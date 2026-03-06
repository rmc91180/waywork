import { NextRequest, NextResponse } from "next/server";
import { processPendingMewsSyncJobs } from "@/lib/pms/mews-sync-queue";
import { captureObservedError, createObservationContext, logObservation } from "@/lib/observability";
import { isMewsProviderActive } from "@/lib/pms/provider-mode";

export async function POST(request: NextRequest) {
  if (!isMewsProviderActive()) {
    return NextResponse.json(
      { error: "Mews integration is disabled. Switch to SiteMinder processing route." },
      { status: 410 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.PMS_SYNC_CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 25;

  const context = createObservationContext("api.pms.mews.jobs.process", { limit });

  try {
    const result = await processPendingMewsSyncJobs(limit);
    logObservation("info", "Processed PMS sync jobs", { ...context, result });
    return NextResponse.json({ ok: true, eventId: context.eventId, ...result });
  } catch (error) {
    const eventId = captureObservedError({
      error,
      message: "Failed processing PMS sync jobs",
      context,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed processing PMS jobs.",
        eventId,
      },
      { status: 500 }
    );
  }
}
