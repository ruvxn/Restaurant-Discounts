// apps/web/src/lib/discountsRepo.ts
<<<<<<< Updated upstream
import { prisma } from './db';

export type AcceptedRow = { time: string; discount: number };

function ymdToUtcMidnight(ymd: string): Date {
  // Persist the calendar day as UTC midnight (e.g., "2025-09-06" -> "2025-09-06T00:00:00.000Z")
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function getRestaurantById(id: number) {
  return prisma.restaurant.findUnique({ where: { id } });
}

export async function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findUnique({ where: { slug } });
}

export async function getAccepted(restaurantId: number, ymd: string) {
  const date = ymdToUtcMidnight(ymd);
  return prisma.acceptedDiscount.findMany({
    where: { restaurantId, date },
    select: { time: true, discount: true },
    orderBy: { time: 'asc' },
  });
}

/**
 * saveAccepted semantics:
 * - Upsert each provided row for (restaurantId, date, time).
 * - Rows not mentioned are left as-is (same behavior as your in-memory store).
 */
export async function saveAccepted(
  restaurantId: number,
  ymd: string,
  rows: AcceptedRow[],
) {
  const date = ymdToUtcMidnight(ymd);

  await prisma.$transaction(
    rows.map((r) =>
      prisma.acceptedDiscount.upsert({
        where: {
          restaurantId_date_time: {
            restaurantId,
            date,
            time: r.time,
          },
        },
        update: { discount: r.discount },
        create: {
          restaurantId,
          date,
          time: r.time,
          discount: r.discount,
        },
      }),
    ),
  );
=======
import { PrismaClient } from "@prisma/client";
import { ymdToUtcMidnight } from "./time";

const prisma = new PrismaClient();

/** Read saved rows for a day (exact UTC midnight literal) */
export async function getAccepted(restaurantId: number, ymd: string) {
  const day = ymdToUtcMidnight(ymd);
  return prisma.acceptedDiscount.findMany({
    where: { restaurantId, date: day },
    orderBy: { time: "asc" },
    select: { time: true, discount: true },
  });
}

/** Upsert many rows for that day; returns count saved/updated */
export async function saveAccepted(
  restaurantId: number,
  ymd: string,
  rows: { time: string; discount: number }[]
) {
  const day = ymdToUtcMidnight(ymd);
  let saved = 0;
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const time = String(r.time ?? "");
      const discount = Number(r.discount ?? 0);
      if (!time.match(/^\d{2}:\d{2}$/)) continue; // guard
      await tx.acceptedDiscount.upsert({
        where: {
          restaurantId_date_time: { restaurantId, date: day, time },
        },
        update: { discount },
        create: { restaurantId, date: day, time, discount },
      });
      saved++;
    }
  });
  return saved;
>>>>>>> Stashed changes
}
