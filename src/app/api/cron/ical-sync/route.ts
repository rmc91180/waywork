import { NextRequest, NextResponse } from "next/server";
import { syncAllIcalFeeds } from "@/lib/ical";

/**
 * GET /api/cron/ical-sync
 *
 * Syncs iCal feeds for all active/paused listings with an icalUrl set.
 * Requires a Bearer token matching the CRON_SECRET environment variable.
 *
 * Railway cron job setup (one-time):
 *   1. Dashboard → your project → New Service → Cron Job
 *   2. Schedule:  0 *\/3 * * *   (every 3 hours — adjust as needed)
 *   3. Command:
 *        curl -sf -o /dev/null \
 *          -H "Authorization: Bearer $CRON_SECRET" \
 *          https://waywork-production.up.railway.app/api/cron/ical-sync
 *   4. Add env var CRON_SECRET to both the cron service and the main app service.
 *      Generate with: openssl rand -hex 32
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!cronSecret || !token || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    await syncAllIcalFeeds();
    const durationMs = Date.now() - startedAt;
    console.log(`[cron/ical-sync] completed in ${durationMs}ms`);
    return NextResponse.json({ ok: true, durationMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron/ical-sync] failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
