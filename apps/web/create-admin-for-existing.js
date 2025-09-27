// Usage:
//   node create-admin-for-existing.js <restaurant-slug> <admin-email> "Admin Name"
// Example:
//   node create-admin-for-existing.js sunset-grill manager@sunset.local "Sunset Manager"

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [slug, email, nameArg] = process.argv.slice(2);
  if (!slug || !email) {
    console.error('Usage: node create-admin-for-existing.js <restaurant-slug> <admin-email> "Admin Name"');
    process.exit(1);
  }
  const name = nameArg || 'Restaurant Admin';

  // 1) Find existing restaurant by slug
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) {
    console.error(`❌ No restaurant found with slug: ${slug}`);
    process.exit(1);
  }

  // 2) Upsert account (create if missing, otherwise ensure role=ADMIN)
  const account = await prisma.account.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      email,
      role: 'ADMIN',
      // passwordHash optional for now
    },
  });

  // 3) Upsert Admin for this account (unique on accountId)
  const admin = await prisma.admin.upsert({
    where: { accountId: account.id }, // ensures only one Admin per Account
    update: { restaurantId: restaurant.id, name },
    create: {
      accountId: account.id,
      restaurantId: restaurant.id,
      name,
    },
  });

  console.log('✅ Linked admin to existing restaurant:');
  console.log({ restaurant: { id: restaurant.id, slug: restaurant.slug }, account: { id: account.id, email }, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
