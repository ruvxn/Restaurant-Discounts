import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const restaurants = [
  {
    slug: 'sunset-grill',
    name: 'Sunset Grill',
    openHour: 10,
    closeHour: 22,
    totalSeats: 60,
    googleRating: 4.3,
    averageBill: 28.0,
    distanceKm: 3.5,
    category: 'grill'
  },
  {
    slug: 'pasta-place',
    name: 'Pasta Place',
    openHour: 11,
    closeHour: 21,
    totalSeats: 40,
    googleRating: 4.5,
    averageBill: 24.0,
    distanceKm: 4.2,
    category: 'italian'
  },
  {
    slug: 'sushi-house',
    name: 'Sushi House',
    openHour: 11,
    closeHour: 22,
    totalSeats: 50,
    googleRating: 4.6,
    averageBill: 32.0,
    distanceKm: 2.8,
    category: 'japanese'
  }
];

async function main() {
  for (const r of restaurants) {
    await prisma.restaurant.upsert({
      where: { slug: r.slug },
      update: {
        name: r.name,
        openHour: r.openHour,
        closeHour: r.closeHour,
        totalSeats: r.totalSeats,
        googleRating: r.googleRating,
        averageBill: r.averageBill,
        distanceKm: r.distanceKm,
        category: r.category
      },
      create: r
    });
  }
  console.log('Seed complete: inserted/updated restaurants:', restaurants.map(r => r.slug));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
