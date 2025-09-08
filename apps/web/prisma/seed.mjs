// apps/web/prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// small helper
async function upsertRestaurant(data) {
  const { slug, ...rest } = data;
  return prisma.restaurant.upsert({
    where: { slug },
    update: rest,
    create: { slug, ...rest },
  });
}

async function seedTables(restaurantId, tables) {
  if (!restaurantId) return;
  await prisma.diningTable.createMany({
    data: tables.map(t => ({ restaurantId, ...t })),
    skipDuplicates: true, // ignores (restaurantId,label) duplicates thanks to @@unique
  });
}

async function seedAdmin({ restaurant, email, name }) {
  // create or update the account as an ADMIN, then upsert Admin row
  const account = await prisma.account.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: { email, role: 'ADMIN' }, // passwordHash is optional per your schema
  });

  await prisma.admin.upsert({
    where: { accountId: account.id },
    update: { restaurantId: restaurant.id, name },
    create: { accountId: account.id, restaurantId: restaurant.id, name },
  });
}

async function seedCustomer({ email, name, interests }) {
  const account = await prisma.account.upsert({
    where: { email },
    update: { role: 'CUSTOMER' },
    create: { email, role: 'CUSTOMER' },
  });

  await prisma.customer.upsert({
    where: { accountId: account.id },
    update: { name, interests },
    create: { accountId: account.id, name, interests },
  });
}

async function main() {
  // --- Restaurants (hardcoded) ---
  const sushi = await upsertRestaurant({
    slug: 'sushi-house',
    name: 'Sushi House',
    openHour: 11,
    closeHour: 22,
    totalSeats: 80,
    googleRating: 4.6,
    averageBill: 25.0,
    distanceKm: 3.0,
    category: 'Japanese',
  });

  const sunset = await upsertRestaurant({
    slug: 'sunset-grill',
    name: 'Sunset Grill',
    openHour: 11,
    closeHour: 23,
    totalSeats: 100,
    googleRating: 4.5,
    averageBill: 28.0,
    distanceKm: 5.5,
    category: 'Grill',
  });

  const pasta = await upsertRestaurant({
    slug: 'pasta-place',
    name: 'Pasta Place',
    openHour: 11,
    closeHour: 22,
    totalSeats: 90,
    googleRating: 4.4,
    averageBill: 27.0,
    distanceKm: 2.0,
    category: 'Italian',
  });

  // --- Tables for each restaurant (labels must be unique per restaurant) ---
  await seedTables(sushi.id, [
    { label: 'T1', seatingCap: 2 },
    { label: 'T2', seatingCap: 2 },
    { label: 'T3', seatingCap: 4 },
    { label: 'Booth-1', seatingCap: 6 },
    { label: 'Window-1', seatingCap: 4 },
  ]);

  await seedTables(sunset.id, [
    { label: 'A1', seatingCap: 4 },
    { label: 'A2', seatingCap: 4 },
    { label: 'A3', seatingCap: 4 },
    { label: 'Patio-1', seatingCap: 6 },
    { label: 'Patio-2', seatingCap: 6 },
    { label: 'Bar-1', seatingCap: 2 },
  ]);

  await seedTables(pasta.id, [
    { label: 'B1', seatingCap: 2 },
    { label: 'B2', seatingCap: 2 },
    { label: 'B3', seatingCap: 4 },
    { label: 'Booth-2', seatingCap: 6 },
    { label: 'Family-1', seatingCap: 6 },
  ]);

  // --- Admins (one per restaurant) ---
  await seedAdmin({ restaurant: sushi,  email: 'admin+sushi@demo.local',  name: 'Sushi Admin'  });
  await seedAdmin({ restaurant: sunset, email: 'admin+sunset@demo.local', name: 'Sunset Admin' });
  await seedAdmin({ restaurant: pasta,  email: 'admin+pasta@demo.local',  name: 'Pasta Admin'  });

  // --- Demo customer ---
  await seedCustomer({
    email: 'alice@demo.local',
    name: 'Alice Demo',
    interests: ['cats', 'music'],
  });

  console.log('✅ Seed finished.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
