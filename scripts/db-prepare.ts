import "dotenv/config";
import { spawnSync } from "node:child_process";
import { Client } from "pg";

const IS_WINDOWS = process.platform === "win32";
const REQUIRED_TABLES = [
  "User",
  "Listing",
  "Booking",
] as const;
const RECOMMENDED_TABLES = ["PmsConnection", "PmsSyncEvent", "PmsSyncJob"] as const;

function quoteWindowsArg(arg: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function runPrisma(args: string[], extraEnv?: Record<string, string | undefined>) {
  const env = { ...process.env, ...extraEnv };
  const result = IS_WINDOWS
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", ["npx", "prisma", ...args].map(quoteWindowsArg).join(" ")],
        {
          encoding: "utf8",
          stdio: "pipe",
          env,
        }
      )
    : spawnSync("npx", ["prisma", ...args], {
        encoding: "utf8",
        stdio: "pipe",
        env,
      });

  return {
    code: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ?? "",
    stderr: result.error ? `${result.stderr ?? ""}\n${result.error.message}` : result.stderr ?? "",
  };
}

function getRequiredEnv(name: "DATABASE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabaseConnection(databaseUrl: string, attempts: number, delayMs: number) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = new Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5_000,
    });

    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      console.log(`[db-prepare] database reachable (attempt ${attempt}/${attempts}).`);
      return;
    } catch (error) {
      await client.end().catch(() => undefined);
      if (attempt === attempts) {
        throw new Error(
          `[db-prepare] database is unreachable after ${attempts} attempts: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      console.warn(
        `[db-prepare] database not ready (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
  }
}

async function verifyCriticalTables(databaseUrl: string) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();
    const result = await client.query<{ tablename: string }>(
      `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = ANY($1::text[])
      `,
      [[...REQUIRED_TABLES, ...RECOMMENDED_TABLES]]
    );

    const existing = new Set(result.rows.map((row) => row.tablename));
    const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));
    if (missing.length > 0) {
      throw new Error(`[db-prepare] missing required tables: ${missing.join(", ")}`);
    }

    const missingRecommended = RECOMMENDED_TABLES.filter((table) => !existing.has(table));
    if (missingRecommended.length > 0) {
      console.warn(
        `[db-prepare] warning: missing recommended PMS tables: ${missingRecommended.join(", ")}`
      );
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

function ensurePrismaMigrationHistory() {
  const baselineName = "20260305190000_init";
  const fallbackEnabled = process.env.DB_MIGRATION_FALLBACK_PUSH !== "false";
  const migrationUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  console.log("[db-prepare] running prisma migrate deploy...");
  const migrateResult = runPrisma(["migrate", "deploy"], {
    DATABASE_URL: migrationUrl,
  });
  if (migrateResult.code === 0) {
    process.stdout.write(migrateResult.stdout);
    return;
  }

  const output = [migrateResult.stdout.trim(), migrateResult.stderr.trim()]
    .filter(Boolean)
    .join("\n");

  if (!fallbackEnabled) {
    throw new Error(
      `[db-prepare] prisma migrate deploy failed.\n${output}\n` +
        `[db-prepare] If this DB was previously managed by db push, baseline with:\n` +
        `npx prisma migrate resolve --applied ${baselineName}`
    );
  }

  console.warn("[db-prepare] migrate deploy failed; running controlled fallback: prisma db push.");
  const pushResult = runPrisma(["db", "push"]);
  if (pushResult.code !== 0) {
    const pushOutput = [pushResult.stdout.trim(), pushResult.stderr.trim()]
      .filter(Boolean)
      .join("\n");
    throw new Error(`[db-prepare] fallback prisma db push failed.\n${output}\n${pushOutput}`);
  }
  process.stdout.write(pushResult.stdout);
  console.warn(
    `[db-prepare] fallback db push succeeded. Baseline migrations ASAP with: ` +
      `npx prisma migrate resolve --applied ${baselineName}`
  );
}

async function main() {
  const databaseUrl = getRequiredEnv("DATABASE_URL");
  const runMigrations = !process.argv.includes("--check-only");
  const attempts = Number(process.env.DB_STARTUP_MAX_RETRIES ?? "20");
  const delayMs = Number(process.env.DB_STARTUP_RETRY_DELAY_MS ?? "3000");

  if (!Number.isFinite(attempts) || attempts < 1) {
    throw new Error("DB_STARTUP_MAX_RETRIES must be a positive number.");
  }
  if (!Number.isFinite(delayMs) || delayMs < 100) {
    throw new Error("DB_STARTUP_RETRY_DELAY_MS must be at least 100.");
  }

  await waitForDatabaseConnection(databaseUrl, attempts, delayMs);

  if (runMigrations) {
    ensurePrismaMigrationHistory();
  } else {
    console.log("[db-prepare] --check-only set, skipping migrations.");
  }

  await verifyCriticalTables(databaseUrl);
  console.log("[db-prepare] database preflight passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
