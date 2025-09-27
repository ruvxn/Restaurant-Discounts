// apps/web/prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** ---------- Helpers you already had ---------- */
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
    skipDuplicates: true, // uses @@unique([restaurantId, label])
  });
}

async function seedAdmin({ restaurant, email, name }) {
  const account = await prisma.account.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: { email, role: 'ADMIN' },
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

  // Return the customer row (handy later)
  return prisma.customer.findUnique({
    where: { accountId: account.id },
  });
}

/** ---------- New helpers ---------- */

/**
 * Create menu items for a restaurant (idempotent).
 */
async function seedMenu(restaurantId, items) {
  for (const m of items) {
    await prisma.menuItem.upsert({
      where: {
        // ensure uniqueness per restaurant + name
        // (Prisma doesn't have a composite unique on these fields by default,
        // so we use a synthetic where: create/find by (restaurantId, name) via a findFirst fallback)
        // To keep it simple in seed, we emulate "upsert by pair":
        id: await (async () => {
          const found = await prisma.menuItem.findFirst({
            where: { restaurantId, name: m.name },
            select: { id: true },
          });
          if (found) return found.id;
          // create then return id
          const created = await prisma.menuItem.create({
            data: { restaurantId, ...m },
            select: { id: true },
          });
          return created.id;
        })(),
      },
      update: { ...m },
      create: { restaurantId, ...m },
    });
  }
}

/**
 * Small helper to build UTC Date objects from a local Melbourne wall time.
 * Example: toUtc('2025-09-08','18:00') => 2025-09-08T08:00:00.000Z (depending on DST)
 */
function toUtc(ymd, hhmm) {
  // Australia/Melbourne is your app TZ; for seed we can hardcode offset using an ISO with TZ.
  // Node will parse "YYYY-MM-DDTHH:MM:00+10:00" or "+11:00" correctly.
  // For a quick seed, we’ll assume +10:00 (AEST). If your date is in AEDT (+11:00), adjust.
  const assumedOffset = '+10:00';
  const d = new Date(`${ymd}T${hhmm}:00${assumedOffset}`);
  return d; // JS Date is UTC internally; Prisma will store Date as timestamp with timezone
}

/**
 * Create a 1-hour booking (startsAt must be on the hour).
 * We do not enforce seat math here; this seed just demonstrates multiple bookings on the same table/hour.
 */
async function createOneHourBooking({
  restaurantId,
  tableId,
  customerId,
  partySize,
  ymd,   // "YYYY-MM-DD"
  time,  // "HH:MM" at local Melbourne hour
  items = [], // array of { menuItemId, qty }
}) {
  const startsAt = toUtc(ymd, time);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const booking = await prisma.booking.create({
    data: {
      restaurantId,
      tableId,
      customerId,
      partySize,
      startsAt,
      endsAt,
      status: 'BOOKED',
    },
  });

  if (items.length > 0) {
    await prisma.bookingItem.createMany({
      data: items.map(i => ({
        bookingId: booking.id,
        menuItemId: i.menuItemId,
        qty: i.qty ?? 1,
      })),
    });
  }

  return booking;
}

async function main() {
  /** --- Restaurants --- */
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

  /** --- Tables --- */
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

  /** --- Admins --- */
  await seedAdmin({ restaurant: sushi,  email: 'admin+sushi@demo.local',  name: 'Sushi Admin'  });
  await seedAdmin({ restaurant: sunset, email: 'admin+sunset@demo.local', name: 'Sunset Admin' });
  await seedAdmin({ restaurant: pasta,  email: 'admin+pasta@demo.local',  name: 'Pasta Admin'  });

  /** --- Customers --- */
  const alice = await seedCustomer({
    email: 'alice@demo.local',
    name: 'Alice Demo',
    interests: ['cats', 'music'],
  });
  const bob = await seedCustomer({
    email: 'bob@demo.local',
    name: 'Bob Demo',
    interests: ['archery'],
  });

  /** --- Menu Items --- */
  await seedMenu(sushi.id, [
    { name: 'Salmon Nigiri (2pc)', priceCents: 600, isSetMenu: false, isActive: true },
    { name: 'Chef Omakase',        priceCents: 5500, isSetMenu: true,  isActive: true },
    { name: 'Miso Soup',           priceCents: 300, isSetMenu: false,  isActive: true },
  ]);

  await seedMenu(sunset.id, [
    { name: 'Ribeye Steak',  priceCents: 3200, isSetMenu: false, isActive: true },
    { name: 'Grill Combo',   priceCents: 4500, isSetMenu: true,  isActive: true },
    { name: 'House Salad',   priceCents: 900,  isSetMenu: false, isActive: true },
  ]);

  await seedMenu(pasta.id, [
    { name: 'Spaghetti Bolognese', priceCents: 2200, isSetMenu: false, isActive: true },
    { name: 'Tasting Menu',        priceCents: 3900, isSetMenu: true,  isActive: true },
    { name: 'Garlic Bread',        priceCents: 700,  isSetMenu: false, isActive: true },
  ]);

  /** --- Bookings (1-hour) ---
   * We’ll create two bookings at Sushi on the SAME TABLE and SAME HOUR (shared seats),
   * and one booking at Sunset on a different hour.
   */
  // look up useful ids:
  const sushiT3 = await prisma.diningTable.findFirst({ where: { restaurantId: sushi.id, label: 'T3' } });
  const sunsetPatio1 = await prisma.diningTable.findFirst({ where: { restaurantId: sunset.id, label: 'Patio-1' } });

  const sushiNigiri = await prisma.menuItem.findFirst({ where: { restaurantId: sushi.id, name: 'Salmon Nigiri (2pc)' } });
  const sushiOmakase = await prisma.menuItem.findFirst({ where: { restaurantId: sushi.id, name: 'Chef Omakase' } });
  const sunsetRibeye = await prisma.menuItem.findFirst({ where: { restaurantId: sunset.id, name: 'Ribeye Steak' } });

  // choose a date you like; using today for convenience
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const ymd = `${y}-${m}-${d}`;

  if (sushiT3 && alice && sushiNigiri && sushiOmakase) {
    // Booking 1: Alice, Sushi House, table T3, party 2 at 18:00
    await createOneHourBooking({
      restaurantId: sushi.id,
      tableId: sushiT3.id,
      customerId: alice.id,
      partySize: 2,
      ymd,
      time: '18:00',
      items: [
        { menuItemId: sushiNigiri.id, qty: 2 },
        { menuItemId: sushiOmakase.id, qty: 1 },
      ],
    });
  }

  if (sushiT3 && bob && sushiNigiri) {
    // Booking 2: Bob, SAME restaurant/table/hour (18:00), party 1
    await createOneHourBooking({
      restaurantId: sushi.id,
      tableId: sushiT3.id,
      customerId: bob.id,
      partySize: 1,
      ymd,
      time: '18:00',
      items: [{ menuItemId: sushiNigiri.id, qty: 1 }],
    });
    // T3 capacity is 4 → Alice(2) + Bob(1) = 3/4 seats taken → still one seat left.
  }

  if (sunsetPatio1 && alice && sunsetRibeye) {
    // Booking 3: Alice, Sunset Grill, Patio-1 at 19:00, party 4
    await createOneHourBooking({
      restaurantId: sunset.id,
      tableId: sunsetPatio1.id,
      customerId: alice.id,
      partySize: 4,
      ymd,
      time: '19:00',
      items: [{ menuItemId: sunsetRibeye.id, qty: 4 }],
    });
  }

  console.log('✅ Seed finished (restaurants, tables, admins, customers, menu items, bookings).');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
