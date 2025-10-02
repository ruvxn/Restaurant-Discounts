import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface BookingValidationResult {
  isAvailable: boolean;
  availableSeats: number;
  totalCapacity: number;
  bookedSeats: number;
}

/**
 * Calculate available seats for a restaurant at a specific datetime
 * Uses the schema's startsAt/endsAt approach
 *
 * NOTE: Tables can be shared between bookings as long as the total party size
 * doesn't exceed the table's capacity at any moment in time.
 * This calculates available seats by checking max concurrent occupancy per table.
 */
export async function calculateAvailableSeats(
  restaurantId: number,
  startsAt: Date
): Promise<{ availableSeats: number; totalCapacity: number; bookedSeats: number }> {
  // Calculate the end time (2 hours later)
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

  // Get all tables for the restaurant
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId },
    select: {
      id: true,
      seatingCap: true,
    },
  });

  const totalCapacity = tables.reduce((sum, table) => sum + table.seatingCap, 0);

  // Get all bookings that overlap with this time slot
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      restaurantId,
      startsAt: {
        lt: endsAt,
      },
      endsAt: {
        gt: startsAt,
      },
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
    },
    select: {
      tableId: true,
      partySize: true,
      startsAt: true,
      endsAt: true,
    },
  });

  // Group bookings by table
  const bookingsByTable = new Map<number, Array<typeof overlappingBookings[0]>>();
  overlappingBookings.forEach((booking) => {
    if (!bookingsByTable.has(booking.tableId)) {
      bookingsByTable.set(booking.tableId, []);
    }
    bookingsByTable.get(booking.tableId)!.push(booking);
  });

  // Calculate available seats per table
  let totalAvailableSeats = 0;
  let totalBookedSeats = 0;

  tables.forEach((table) => {
    const tableBookings = bookingsByTable.get(table.id) || [];

    if (tableBookings.length === 0) {
      // Table is completely free
      totalAvailableSeats += table.seatingCap;
    } else {
      // Calculate max occupancy during the query window
      const maxOccupancy = getMaxOccupancyDuringWindow(tableBookings, startsAt, endsAt);
      const available = Math.max(0, table.seatingCap - maxOccupancy);
      totalAvailableSeats += available;
      totalBookedSeats += maxOccupancy;
    }
  });

  return {
    availableSeats: Math.max(0, totalAvailableSeats),
    totalCapacity,
    bookedSeats: totalBookedSeats,
  };
}

/**
 * Calculate the maximum occupancy during a specific query window
 * Different from calculateMaxConcurrentOccupancy because this only looks at existing bookings
 */
function getMaxOccupancyDuringWindow(
  bookings: Array<{ partySize: number; startsAt: Date; endsAt: Date }>,
  queryStart: Date,
  queryEnd: Date
): number {
  const timePoints: Array<{ time: number; delta: number }> = [];

  bookings.forEach((booking) => {
    timePoints.push({ time: booking.startsAt.getTime(), delta: booking.partySize });
    timePoints.push({ time: booking.endsAt.getTime(), delta: -booking.partySize });
  });

  timePoints.sort((a, b) => a.time - b.time);

  let currentOccupancy = 0;
  let maxOccupancy = 0;
  const queryStartTime = queryStart.getTime();
  const queryEndTime = queryEnd.getTime();

  for (const point of timePoints) {
    // Only count occupancy within our query window
    if (point.time >= queryStartTime && point.time < queryEndTime) {
      currentOccupancy += point.delta;
      maxOccupancy = Math.max(maxOccupancy, currentOccupancy);
    } else if (point.time < queryStartTime) {
      // Accumulate occupancy before window starts
      currentOccupancy += point.delta;
      if (point.time === queryStartTime - 1) {
        maxOccupancy = Math.max(maxOccupancy, currentOccupancy);
      }
    }
  }

  // Check occupancy at the start of the window
  let occupancyAtStart = 0;
  for (const booking of bookings) {
    if (booking.startsAt.getTime() <= queryStartTime && booking.endsAt.getTime() > queryStartTime) {
      occupancyAtStart += booking.partySize;
    }
  }
  maxOccupancy = Math.max(maxOccupancy, occupancyAtStart);

  return maxOccupancy;
}

/**
 * Validate if a booking can be made for the given parameters
 */
export async function validateBooking(
  restaurantId: number,
  startsAt: Date,
  partySize: number
): Promise<BookingValidationResult> {
  const { availableSeats, totalCapacity, bookedSeats } = await calculateAvailableSeats(
    restaurantId,
    startsAt
  );

  return {
    isAvailable: availableSeats >= partySize,
    availableSeats,
    totalCapacity,
    bookedSeats,
  };
}

/**
 * Calculate the total price for menu items
 * Returns the original total in cents
 */
export async function calculateMenuTotal(
  menuItems: Array<{ menuItemId: number; quantity: number }>
): Promise<number> {
  if (menuItems.length === 0) return 0;

  // Fetch all menu items
  const items = await prisma.menuItem.findMany({
    where: {
      id: {
        in: menuItems.map(item => item.menuItemId),
      },
    },
    select: {
      id: true,
      priceCents: true,
    },
  });

  // Create a map for quick lookup
  const priceMap = new Map(items.map(item => [item.id, item.priceCents]));

  // Calculate total in cents
  const totalCents = menuItems.reduce((sum, item) => {
    const priceCents = priceMap.get(item.menuItemId) || 0;
    return sum + (priceCents * item.quantity);
  }, 0);

  return totalCents;
}

/**
 * Get the discount percentage for a specific restaurant, date, and time
 * Time should be in "HH:MM" format
 */
export async function getDiscountForDateTime(
  restaurantId: number,
  date: Date,
  time: string
): Promise<number> {
  // Normalize to UTC noon for the date (to match how discounts are stored)
  const dateOnly = new Date(date);
  dateOnly.setUTCHours(12, 0, 0, 0);

  console.log('[getDiscountForDateTime] Looking up discount:', {
    restaurantId,
    date: dateOnly.toISOString(),
    time
  });

  const discount = await prisma.acceptedDiscount.findFirst({
    where: {
      restaurantId,
      date: dateOnly,
      time,
    },
    select: {
      discount: true,
    },
  });

  console.log('[getDiscountForDateTime] Found discount:', discount?.discount || 0);

  return discount?.discount || 0;
}

/**
 * Apply discount to a price (in cents)
 * Returns { originalTotal, discountedTotal, savings }
 */
export function applyDiscount(
  originalTotalCents: number,
  discountPercent: number
): {
  originalTotal: number;
  discountedTotal: number;
  savings: number;
} {
  const originalTotal = originalTotalCents / 100; // Convert to dollars
  const savings = (originalTotal * discountPercent) / 100;
  const discountedTotal = originalTotal - savings;

  return {
    originalTotal: parseFloat(originalTotal.toFixed(2)),
    discountedTotal: parseFloat(Math.max(0, discountedTotal).toFixed(2)),
    savings: parseFloat(savings.toFixed(2)),
  };
}

/**
 * Validate that booking is for a future date/time
 */
export function isFutureBooking(startsAt: Date): boolean {
  const now = new Date();
  return startsAt > now;
}

/**
 * Convert hour (0-23) to "HH:MM" format
 */
export function hourToTimeString(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Parse "HH:MM" time string to hour number
 */
export function timeStringToHour(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10);
}

/**
 * Get real-time available capacity for a specific table at a given time
 * Returns remaining seats on that table during the 2-hour booking window
 *
 * Tables CAN be shared - this returns the available seats after accounting
 * for the maximum concurrent occupancy during the time window.
 */
export async function getTableAvailableCapacity(
  tableId: number,
  startsAt: Date
): Promise<{ availableSeats: number; totalCapacity: number; bookedSeats: number }> {
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

  // Get table capacity
  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    select: { seatingCap: true },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  const totalCapacity = table.seatingCap;

  // Get all overlapping bookings for this table
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      tableId,
      startsAt: {
        lt: endsAt,
      },
      endsAt: {
        gt: startsAt,
      },
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
    },
    select: {
      partySize: true,
      startsAt: true,
      endsAt: true,
    },
  });

  if (overlappingBookings.length === 0) {
    return {
      availableSeats: totalCapacity,
      totalCapacity,
      bookedSeats: 0,
    };
  }

  // Calculate max occupancy during the query window
  const maxOccupancy = getMaxOccupancyDuringWindow(overlappingBookings, startsAt, endsAt);

  return {
    availableSeats: Math.max(0, totalCapacity - maxOccupancy),
    totalCapacity,
    bookedSeats: maxOccupancy,
  };
}

/**
 * Get real-time available capacity for all tables in a restaurant at a given time
 * Returns array of tables with their current availability
 *
 * Tables CAN be shared - calculates available seats based on maximum
 * concurrent occupancy during the time window.
 */
export async function getRestaurantTablesAvailability(
  restaurantId: number,
  startsAt: Date
): Promise<Array<{
  tableId: number;
  tableLabel: string;
  totalCapacity: number;
  availableSeats: number;
  bookedSeats: number;
}>> {
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

  // Get all tables for the restaurant
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId },
    select: {
      id: true,
      label: true,
      seatingCap: true,
    },
    orderBy: {
      label: 'asc',
    },
  });

  // Get all overlapping bookings for this restaurant
  const bookings = await prisma.booking.findMany({
    where: {
      restaurantId,
      startsAt: {
        lt: endsAt,
      },
      endsAt: {
        gt: startsAt,
      },
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
    },
    select: {
      tableId: true,
      partySize: true,
      startsAt: true,
      endsAt: true,
    },
  });

  // Group bookings by table
  const bookingsByTable = new Map<number, Array<typeof bookings[0]>>();
  bookings.forEach((booking) => {
    if (!bookingsByTable.has(booking.tableId)) {
      bookingsByTable.set(booking.tableId, []);
    }
    bookingsByTable.get(booking.tableId)!.push(booking);
  });

  // Calculate availability for each table
  return tables.map((table) => {
    const tableBookings = bookingsByTable.get(table.id) || [];

    if (tableBookings.length === 0) {
      return {
        tableId: table.id,
        tableLabel: table.label,
        totalCapacity: table.seatingCap,
        availableSeats: table.seatingCap,
        bookedSeats: 0,
      };
    }

    const maxOccupancy = getMaxOccupancyDuringWindow(tableBookings, startsAt, endsAt);

    return {
      tableId: table.id,
      tableLabel: table.label,
      totalCapacity: table.seatingCap,
      availableSeats: Math.max(0, table.seatingCap - maxOccupancy),
      bookedSeats: maxOccupancy,
    };
  });
}

/**
 * Create startsAt datetime from date and hour
 */
export function createStartsAt(date: Date, hour: number): Date {
  const startsAt = new Date(date);
  startsAt.setHours(hour, 0, 0, 0);
  return startsAt;
}

/**
 * Find best available table for a party size with row-level locking
 * This prevents race conditions during concurrent bookings
 *
 * IMPORTANT: Tables CAN be shared between different bookings as long as:
 * - The sum of all party sizes during ANY overlapping moment doesn't exceed table capacity
 * - We need to check the MAXIMUM concurrent occupancy across the entire 2-hour window
 */
export async function findAvailableTable(
  tx: Prisma.TransactionClient,
  restaurantId: number,
  startsAt: Date,
  partySize: number
): Promise<number | null> {
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

  // Get all tables for the restaurant, ordered by capacity (smallest first)
  // Use FOR UPDATE to lock the rows and prevent race conditions
  const tables = await tx.$queryRaw<Array<{ id: number; seatingCap: number }>>`
    SELECT id, "seatingCap"
    FROM "DiningTable"
    WHERE "restaurantId" = ${restaurantId}
    ORDER BY "seatingCap" ASC
    FOR UPDATE
  `;

  // For each table, check if there's enough capacity
  for (const table of tables) {
    // Table must have enough seats for the party
    if (table.seatingCap < partySize) continue;

    // Get all bookings that overlap with the requested time window
    const overlappingBookings = await tx.booking.findMany({
      where: {
        tableId: table.id,
        startsAt: {
          lt: endsAt,
        },
        endsAt: {
          gt: startsAt,
        },
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
      select: {
        id: true,
        partySize: true,
        startsAt: true,
        endsAt: true,
      },
    });

    // Calculate maximum concurrent occupancy across the entire time window
    const maxOccupancy = calculateMaxConcurrentOccupancy(
      overlappingBookings,
      startsAt,
      endsAt,
      partySize
    );

    // Table is available if max occupancy doesn't exceed capacity
    if (maxOccupancy <= table.seatingCap) {
      return table.id;
    }
  }

  return null; // No available table found
}

/**
 * Calculate the maximum concurrent occupancy for a table across a time window
 * This checks every moment in time to find the peak occupancy
 */
function calculateMaxConcurrentOccupancy(
  existingBookings: Array<{ id: number; partySize: number; startsAt: Date; endsAt: Date }>,
  newStartsAt: Date,
  newEndsAt: Date,
  newPartySize: number
): number {
  // Collect all time points where occupancy changes (booking starts or ends)
  const timePoints: Array<{ time: number; delta: number }> = [];

  // Add existing bookings
  existingBookings.forEach((booking) => {
    timePoints.push({ time: booking.startsAt.getTime(), delta: booking.partySize }); // People arrive
    timePoints.push({ time: booking.endsAt.getTime(), delta: -booking.partySize }); // People leave
  });

  // Add new booking
  timePoints.push({ time: newStartsAt.getTime(), delta: newPartySize });
  timePoints.push({ time: newEndsAt.getTime(), delta: -newPartySize });

  // Sort by time
  timePoints.sort((a, b) => a.time - b.time);

  // Calculate occupancy at each time point and track the maximum
  let currentOccupancy = 0;
  let maxOccupancy = 0;

  for (const point of timePoints) {
    currentOccupancy += point.delta;
    maxOccupancy = Math.max(maxOccupancy, currentOccupancy);
  }

  return maxOccupancy;
}
