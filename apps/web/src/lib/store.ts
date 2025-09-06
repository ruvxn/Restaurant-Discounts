// apps/web/src/lib/store.ts
// Helpers only — persistence is now in Prisma/Postgres.

export type Slot = { time: string; discount: number };

// Default discount grid used when no saved rows exist.
export const defaultHours: Slot[] = [
  { time: "08:00", discount: 15 },
  { time: "09:00", discount: 20 },
  { time: "10:00", discount: 10 },
  { time: "11:00", discount: 10 },
  { time: "12:00", discount: 30 },
  { time: "13:00", discount: 20 },
  { time: "14:00", discount: 10 },
  { time: "15:00", discount: 10 },
  { time: "16:00", discount: 5  },
  { time: "17:00", discount: 15 },
  { time: "18:00", discount: 20 },
  { time: "19:00", discount: 25 },
  { time: "20:00", discount: 10 },
  { time: "21:00", discount: 5  },
  { time: "22:00", discount: 10 },
];

// Overlay any saved rows onto the defaults, keeping unspecified slots as defaults.
export function mergeWithDefaults(
  saved: Array<{ time: string; discount: number }> | null | undefined,
  defaults: Array<{ time: string; discount: number }> = defaultHours
): Slot[] {
  if (!saved || saved.length === 0) return defaults;
  const map = new Map(defaults.map(d => [d.time, d.discount]));
  for (const s of saved) map.set(s.time, s.discount);
  return defaults.map(d => ({ time: d.time, discount: map.get(d.time)! }));
}
