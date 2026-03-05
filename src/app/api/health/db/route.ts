import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    const [pendingJobs, failedJobs] = await Promise.all([
      db.pmsSyncJob.count({ where: { status: "PENDING" } }),
      db.pmsSyncJob.count({ where: { status: "FAILED" } }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        service: "waywork-db",
        latencyMs: Date.now() - startedAt,
        pmsQueue: {
          pending: pendingJobs,
          failed: failedJobs,
        },
        checkedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DB error";

    return NextResponse.json(
      {
        ok: false,
        service: "waywork-db",
        latencyMs: Date.now() - startedAt,
        error: message,
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
