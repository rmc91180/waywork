import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { seedLimehomeMadridPilot } from "../src/lib/demo-seed";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await seedLimehomeMadridPilot(prisma);
  console.log(
    `Limehome pilot seed summary: host=${result.hostEmail}, listingsCreated=${result.listingsCreated}, listingsUpdated=${result.listingsUpdated}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
