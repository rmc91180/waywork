import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApaleoPilotReadinessSummary } from "@/lib/pms/apaleo-pilot-readiness";
import { getActivePmsProviderMode } from "@/lib/pms/provider-mode";

export const dynamic = "force-dynamic";

function parseIntegerEnv(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  if (value === "1" || value.toLowerCase() === "true") return true;
  if (value === "0" || value.toLowerCase() === "false") return false;
  return fallback;
}

export async function GET() {
  const startedAt = Date.now();
  const mode = getActivePmsProviderMode();
  const dbBackedProvider =
    mode === "MEWS" || mode === "SITEMINDER" || mode === "APALEO" ? mode : null;

  const staleMinutes = parseIntegerEnv(process.env.PMS_HEALTH_STALE_JOB_MINUTES, 15);
  const maxFailedJobs = parseIntegerEnv(process.env.PMS_HEALTH_MAX_FAILED_JOBS, 25);
  const maxDeadLetterJobs = parseIntegerEnv(process.env.PMS_HEALTH_MAX_DEAD_LETTER_JOBS, 0);
  const requireEnabledConnection = parseBooleanEnv(
    process.env.PMS_HEALTH_REQUIRE_ENABLED_CONNECTION,
    false
  );

  try {
    await db.$queryRaw`SELECT 1`;
    const apaleoReadiness = mode === "APALEO" ? await getApaleoPilotReadinessSummary() : null;

    if (mode === "NONE") {
      return NextResponse.json(
        {
          ok: true,
          service: "waywork-pms",
          mode,
          latencyMs: Date.now() - startedAt,
          queue: {
            pending: 0,
            processing: 0,
            failed: 0,
            deadLetter: 0,
            stale: 0,
          },
          connections: {
            enabled: 0,
          },
          warning: "PMS sync is disabled (PMS_ACTIVE_PROVIDER=NONE).",
          checkedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    if (!dbBackedProvider) {
      return NextResponse.json(
        {
          ok: true,
          service: "waywork-pms",
          mode,
          latencyMs: Date.now() - startedAt,
          queue: {
            pending: 0,
            processing: 0,
            failed: 0,
            deadLetter: 0,
            stale: 0,
          },
          connections: {
            enabled: 0,
          },
          warning: `PMS provider ${mode} is reserved in config, but database-backed sync support is not enabled yet.`,
          checkedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    const staleCutoff = new Date(Date.now() - staleMinutes * 60_000);
    const recentWindowStart = new Date(Date.now() - 24 * 60 * 60_000);
    const queueWhere = {
      connection: {
        provider: dbBackedProvider,
        enabled: true,
      },
    } as const;

    const [enabledConnections, pending, processing, failed, deadLetter, stale, recentErrors, lastSuccess] =
      await db.$transaction([
        db.pmsConnection.count({
          where: {
            provider: dbBackedProvider,
            enabled: true,
          },
        }),
        db.pmsSyncJob.count({ where: { ...queueWhere, status: "PENDING" } }),
        db.pmsSyncJob.count({ where: { ...queueWhere, status: "PROCESSING" } }),
        db.pmsSyncJob.count({ where: { ...queueWhere, status: "FAILED" } }),
        db.pmsSyncJob.count({ where: { ...queueWhere, status: "DEAD_LETTER" } }),
        db.pmsSyncJob.count({
          where: {
            ...queueWhere,
            status: { in: ["PENDING", "FAILED"] },
            nextAttemptAt: { lte: staleCutoff },
          },
        }),
        db.pmsSyncEvent.count({
          where: {
            connection: { provider: dbBackedProvider },
            success: false,
            createdAt: { gte: recentWindowStart },
          },
        }),
        db.pmsSyncEvent.findFirst({
          where: {
            connection: { provider: dbBackedProvider },
            success: true,
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, action: true },
        }),
      ]);

    const warnings: string[] = [];
    if (enabledConnections === 0) {
      warnings.push("No enabled PMS connections found.");
    }
    if (failed > 0) {
      warnings.push(`There are ${failed} failed PMS jobs queued for retry.`);
    }
    if (deadLetter > 0) {
      warnings.push(`There are ${deadLetter} dead-letter PMS jobs.`);
    }
    if (stale > 0) {
      warnings.push(`There are ${stale} stale PMS jobs older than ${staleMinutes} minutes.`);
    }

    const hardFailure =
      (requireEnabledConnection && enabledConnections === 0) ||
      failed > maxFailedJobs ||
      deadLetter > maxDeadLetterJobs ||
      stale > 0 ||
      apaleoReadiness?.readiness === "RED";

    return NextResponse.json(
      {
        ok: !hardFailure,
        service: "waywork-pms",
        mode,
        latencyMs: Date.now() - startedAt,
        thresholds: {
          staleMinutes,
          maxFailedJobs,
          maxDeadLetterJobs,
          requireEnabledConnection,
        },
        connections: {
          enabled: enabledConnections,
        },
        queue: {
          pending,
          processing,
          failed,
          deadLetter,
          stale,
        },
        recentErrors24h: recentErrors,
        lastSuccess,
        provider: apaleoReadiness,
        warnings,
        checkedAt: new Date().toISOString(),
      },
      { status: hardFailure ? 503 : 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PMS health error";

    return NextResponse.json(
      {
        ok: false,
        service: "waywork-pms",
        mode,
        latencyMs: Date.now() - startedAt,
        error: message,
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
