import { NextRequest, NextResponse } from "next/server";
import { processPendingPmsSyncJobs } from "@/lib/pms/mews-sync-queue";
import { captureObservedError, createObservationContext, logObservation } from "@/lib/observability";
import { isSiteMinderProviderActive } from "@/lib/pms/provider-mode";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.PMS_SYNC_CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSiteMinderProviderActive()) {
    return NextResponse.json(
      { error: "SiteMinder provider is not active in this environment." },
      { status: 409 }
    );
  }

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 25;

  const context = createObservationContext("api.pms.siteminder.jobs.process", { limit });

  try {
    const result = await processPendingPmsSyncJobs(limit);
    logObservation("info", "Processed SiteMinder sync jobs", { ...context, result });
    return NextResponse.json({ ok: true, eventId: context.eventId, ...result });
  } catch (error) {
    const eventId = captureObservedError({
      error,
      message: "Failed processing SiteMinder sync jobs",
      context,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed processing SiteMinder jobs.",
        eventId,
      },
      { status: 500 }
    );
  }
}
