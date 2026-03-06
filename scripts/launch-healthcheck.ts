import "dotenv/config";

type HealthResponse = {
  ok?: boolean;
  [key: string]: unknown;
};

function resolveAppUrl() {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

async function requestJson(endpoint: string, init?: RequestInit) {
  const response = await fetch(endpoint, init);
  const text = await response.text();
  let json: HealthResponse | null = null;

  try {
    json = text ? (JSON.parse(text) as HealthResponse) : {};
  } catch {
    json = null;
  }

  return { response, text, json };
}

function assertHealthyResult(input: {
  name: string;
  status: number;
  body: HealthResponse | null;
  raw: string;
}) {
  if (input.status !== 200) {
    throw new Error(`[healthcheck] ${input.name} returned HTTP ${input.status}: ${input.raw}`);
  }
  if (!input.body || input.body.ok !== true) {
    throw new Error(`[healthcheck] ${input.name} returned ok!=true: ${input.raw}`);
  }
}

async function main() {
  const appUrl = resolveAppUrl();
  const cronSecret = process.env.PMS_SYNC_CRON_SECRET;

  console.log(`[healthcheck] app URL: ${appUrl}`);

  const db = await requestJson(`${appUrl}/api/health/db`);
  assertHealthyResult({
    name: "DB health",
    status: db.response.status,
    body: db.json,
    raw: db.text,
  });
  console.log("[healthcheck] DB endpoint is healthy.");

  const pms = await requestJson(`${appUrl}/api/health/pms`);
  assertHealthyResult({
    name: "PMS health",
    status: pms.response.status,
    body: pms.json,
    raw: pms.text,
  });
  console.log("[healthcheck] PMS endpoint is healthy.");

  const mode = typeof pms.json?.mode === "string" ? pms.json.mode : "UNKNOWN";
  if (mode === "SITEMINDER" && cronSecret) {
    const processor = await requestJson(`${appUrl}/api/pms/siteminder/jobs/process?limit=5`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });

    if (processor.response.status !== 200) {
      throw new Error(
        `[healthcheck] SiteMinder processor returned HTTP ${processor.response.status}: ${processor.text}`
      );
    }

    console.log("[healthcheck] SiteMinder job processor endpoint accepted request.");
  } else {
    console.log(
      `[healthcheck] Processor call skipped (mode=${mode}, PMS_SYNC_CRON_SECRET=${cronSecret ? "set" : "unset"}).`
    );
  }

  console.log("[healthcheck] launch healthcheck passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
