import { spawnSync } from "node:child_process";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const globalForPgPool = globalThis as unknown as {
  wayWorkPgPool: Pool | undefined;
};

const LOCAL_DATABASE_PROBE_PORTS = [51215, 51214, 51213, 51216, 51255];

function isLocalDatabaseHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function buildLocalDatabaseCandidates(connectionString: string) {
  const parsed = new URL(connectionString);
  const candidatePorts = [parsed.port, ...LOCAL_DATABASE_PROBE_PORTS.map(String)];
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const port of candidatePorts) {
    if (!port) continue;
    const candidate = new URL(connectionString);
    candidate.hostname = "127.0.0.1";
    candidate.port = port;
    const value = candidate.toString();
    if (seen.has(value)) continue;
    seen.add(value);
    candidates.push(value);
  }

  return candidates;
}

function probeLocalDatabaseUrl(candidates: string[]) {
  if (candidates.length === 0) return null;

  const script = `
    const { Client } = require("pg");
    const candidates = JSON.parse(process.argv[1]);

    (async () => {
      for (const connectionString of candidates) {
        const client = new Client({
          connectionString,
          connectionTimeoutMillis: 1200,
        });

        try {
          await client.connect();
          await client.query("SELECT 1");
          await client.end();
          process.stdout.write(connectionString);
          process.exit(0);
        } catch {
          await client.end().catch(() => undefined);
        }
      }

      process.exit(1);
    })().catch(() => process.exit(1));
  `;

  const result = spawnSync(process.execPath, ["-e", script, JSON.stringify(candidates)], {
    encoding: "utf8",
    stdio: "pipe",
    timeout: 12_000,
  });

  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }

  return null;
}

function resolveDatabaseConnectionString(connectionString: string) {
  const parsed = new URL(connectionString);

  if (!isLocalDatabaseHost(parsed.hostname)) {
    return connectionString;
  }

  const candidates = buildLocalDatabaseCandidates(connectionString);
  const resolved = probeLocalDatabaseUrl(candidates);

  if (resolved && resolved !== connectionString) {
    const parsedResolved = new URL(resolved);
    console.warn(
      `[db] resolved local DATABASE_URL to ${parsedResolved.hostname}:${parsedResolved.port}`
    );
  }

  return resolved ?? connectionString;
}

function createPool(connectionString: string) {
  const parsed = new URL(connectionString);
  const isLocalHost = isLocalDatabaseHost(parsed.hostname);
  const isLocalPgliteFallback = parsed.hostname === "127.0.0.1" && parsed.port === "51255";

  return new Pool({
    connectionString,
    // Local dev databases (and especially PGlite-backed pools) can become unstable
    // under high concurrency, so keep local pools intentionally small.
    max: isLocalHost || isLocalPgliteFallback ? 1 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: process.env.NODE_ENV !== "production",
  });
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const resolvedConnectionString = resolveDatabaseConnectionString(connectionString);
  const pool =
    globalForPgPool.wayWorkPgPool ?? createPool(resolvedConnectionString);
  globalForPgPool.wayWorkPgPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  const prisma = globalForPrisma.prisma ?? createPrismaClient();
  globalForPrisma.prisma = prisma;
  return prisma;
}

function createRetryingModelProxy(modelName: string, modelDelegate: object) {
  return new Proxy(modelDelegate, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") {
        return value;
      }

      if (typeof prop !== "string" || prop.startsWith("$")) {
        return value.bind(target);
      }

      return (...args: unknown[]) =>
        withDbRetry((client) => {
          const freshModel = Reflect.get(client, modelName) as Record<string, unknown>;
          const freshMethod = freshModel[prop];
          if (typeof freshMethod !== "function") {
            throw new Error(`Prisma model method ${modelName}.${prop} is not available`);
          }
          return (freshMethod as (...methodArgs: unknown[]) => Promise<unknown>).apply(
            freshModel,
            args
          );
        });
    },
  });
}

async function resetPrismaClient() {
  await globalForPrisma.prisma?.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
  globalForPgPool.wayWorkPgPool = undefined;
}

function isRetryableConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const prismaCode =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message = error.message.toLowerCase();

  return (
    prismaCode === "P1017" ||
    message.includes("server has closed the connection") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("socket hang up") ||
    message.includes("cannot use a pool after calling end on the pool")
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry<T>(
  operation: (client: PrismaClient) => Promise<T>,
  maxAttempts = 6
) {
  let attempt = 1;

  while (true) {
    try {
      return await operation(getPrismaClient());
    } catch (error) {
      if (!isRetryableConnectionError(error) || attempt >= maxAttempts) {
        throw error;
      }

      await resetPrismaClient();
      await sleep(500 * attempt);
      attempt += 1;
    }
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }

    if (typeof prop === "string" && prop in client && typeof value === "object" && value) {
      return createRetryingModelProxy(prop, value);
    }

    return value;
  },
}) as PrismaClient;
