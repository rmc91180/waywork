import { processPendingMewsSyncJobs } from "@/lib/pms/mews-sync-queue";

async function main() {
  const rawLimit = process.argv[2];
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 25;

  const result = await processPendingMewsSyncJobs(limit);
  console.log("[pms-jobs] processed", JSON.stringify({ limit, ...result }));
}

main().catch((error) => {
  console.error("[pms-jobs] failed", error);
  process.exit(1);
});
