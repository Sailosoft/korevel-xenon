import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

// const pool = new Pool({
//   connectionString: process.env.POSTGRES_PRISMA_URL,
//   ssl: {
//     rejectUnauthorized: false, // Don't forget this!
//   },
// });

// const adapter = new PrismaPg(pool);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
