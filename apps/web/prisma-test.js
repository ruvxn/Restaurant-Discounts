const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log("✅ Prisma Client connected successfully");
  } catch (err) {
    console.error("❌ Prisma Client connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
