import { processPendingPmsSyncJobs } from "@/lib/pms/mews-sync-queue";

function isDatabaseUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "P1001" || candidate.message?.includes("Can't reach database server");
}

async function main() {
  const rawLimit = process.argv[2];
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 25;

  const result = await processPendingPmsSyncJobs(limit);
  console.log("[pms-jobs] processed", JSON.stringify({ limit, ...result }));
}

main().catch((error) => {
  if (isDatabaseUnavailable(error)) {
    console.error(
      "[pms-jobs] database unavailable. Start a local DB first (example: `npm run db:bootstrap -- --skip-seed`) or set a reachable DATABASE_URL."
    );
  }
  console.error("[pms-jobs] failed", error);
  process.exit(1);
});
