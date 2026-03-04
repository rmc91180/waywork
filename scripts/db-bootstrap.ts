import { spawnSync } from "node:child_process";

type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

const SERVER_NAME = process.env.PRISMA_DEV_NAME ?? "waywork";
const IS_WINDOWS = process.platform === "win32";

function quoteWindowsArg(arg: string): string {
  if (/^[a-zA-Z0-9_./:-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function run(
  args: string[],
  extraEnv?: Record<string, string | undefined>
): RunResult {
  const env = { ...process.env, ...extraEnv };
  const result = IS_WINDOWS
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", ["npx", ...args].map(quoteWindowsArg).join(" ")],
        {
          encoding: "utf8",
          stdio: "pipe",
          env,
        }
      )
    : spawnSync("npx", args, {
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

function ensureSuccess(label: string, result: RunResult) {
  if (result.code === 0) return;
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
  throw new Error(`${label} failed with code ${result.code}\n${output}`);
}

function extractDbUrl(output: string): string {
  const match = output.match(/postgres:\/\/[^\s]+/);
  if (!match) {
    throw new Error(`Could not parse Prisma dev DB URL from output:\n${output}`);
  }
  const normalized = new URL(match[0]);
  if (normalized.hostname === "localhost") {
    normalized.hostname = "127.0.0.1";
  }
  return normalized.toString();
}

async function main() {
  console.log(`[db-bootstrap] starting Prisma dev server "${SERVER_NAME}"...`);
  const devStart = run(["prisma", "dev", "-d", "-n", SERVER_NAME]);
  ensureSuccess("prisma dev", devStart);

  const databaseUrl = extractDbUrl(`${devStart.stdout}\n${devStart.stderr}`);
  console.log(`[db-bootstrap] using DATABASE_URL=${databaseUrl}`);

  console.log("[db-bootstrap] pushing Prisma schema...");
  const dbPush = run(["prisma", "db", "push"], { DATABASE_URL: databaseUrl });
  ensureSuccess("prisma db push", dbPush);
  process.stdout.write(dbPush.stdout);

  if (process.argv.includes("--skip-seed")) {
    console.log("[db-bootstrap] skipping seed (--skip-seed)");
    return;
  }

  console.log("[db-bootstrap] seeding demo data...");
  const seed = run(["tsx", "prisma/seed.ts"], { DATABASE_URL: databaseUrl });
  ensureSuccess("prisma seed", seed);
  process.stdout.write(seed.stdout);

  console.log("[db-bootstrap] complete.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[db-bootstrap] error: ${message}`);
  process.exit(1);
});
