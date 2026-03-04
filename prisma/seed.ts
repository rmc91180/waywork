import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedDemoData } from "../src/lib/demo-seed";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await seedDemoData(prisma);
  console.log(
    `Seed summary: users=${result.users}, listingsCreated=${result.listingsCreated}, listingsUpdated=${result.listingsUpdated}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
