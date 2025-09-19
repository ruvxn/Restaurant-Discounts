const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('DATABASE_URL =', process.env.DATABASE_URL || '(not set)');
  const info = await prisma.$queryRawUnsafe(`
    SELECT current_database()    AS db,
           inet_server_addr()    AS host,
           inet_server_port()    AS port,
           version()             AS version
  `);
  console.log('Server info:', info[0]);

  const [{ count }] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count FROM "AcceptedDiscount"
  `);
  console.log('AcceptedDiscount rows =', count);
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
