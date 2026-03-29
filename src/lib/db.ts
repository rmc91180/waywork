import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const globalForPgPool = globalThis as unknown as {
  wayWorkPgPool: Pool | undefined;
};

function createPool(connectionString: string) {
  const parsed = new URL(connectionString);
  const isLocalPgliteFallback =
    parsed.hostname === "127.0.0.1" &&
    parsed.port === "51255";

  return new Pool({
    connectionString,
    // The local PGlite socket fallback is much less tolerant of parallel clients
    // than a normal Postgres instance, so keep the pool intentionally tiny there.
    max: isLocalPgliteFallback ? 1 : 10,
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
  const pool = globalForPgPool.wayWorkPgPool ?? createPool(connectionString);
  globalForPgPool.wayWorkPgPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  const prisma = globalForPrisma.prisma ?? createPrismaClient();
  globalForPrisma.prisma = prisma;
  return prisma;
}

async function resetPrismaClient() {
  await globalForPrisma.prisma?.$disconnect().catch(() => undefined);
  await globalForPgPool.wayWorkPgPool?.end().catch(() => undefined);
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
    message.includes("socket hang up")
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry<T>(
  operation: (client: PrismaClient) => Promise<T>,
  maxAttempts = 2
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
      await sleep(150 * attempt);
      attempt += 1;
    }
  }
}

export const db = getPrismaClient();
