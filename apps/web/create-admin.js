// apps/web/create-admin.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1) ensure a restaurant exists (or create one)
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'test-restaurant' },
    update: {},
    create: {
      slug: 'test-restaurant',
      name: 'Test Restaurant',
      openHour: 10,
      closeHour: 22,
      totalSeats: 80,
    },
  });

  // 2) create an account for the admin
  const account = await prisma.account.upsert({
    where: { email: 'admin@test.local' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@test.local',
      role: 'ADMIN',
      // passwordHash optional for now
    },
  });

  // 3) create the Admin linked to the restaurant
  const admin = await prisma.admin.upsert({
    where: { accountId: account.id },
    update: { restaurantId: restaurant.id, name: 'Test Admin' },
    create: {
      accountId: account.id,
      restaurantId: restaurant.id,
      name: 'Test Admin',
    },
  });

  console.log({ restaurant, account, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
