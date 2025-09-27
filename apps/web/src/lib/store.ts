// simple in-memory store for now.
// after prisma is set teh same API route can be used for it.

export const accounts: any[] = []

type Slot = { time: string; discount: number };

type GlobalStore = { accepted: Record<string, Slot[]> };
const g = globalThis as unknown as { __discountStore?: GlobalStore };
if (!g.__discountStore) g.__discountStore = { accepted: {} };
const store = g.__discountStore;

export function saveAccepted(restaurantId: string, date: string, rows: Slot[]) {
  store.accepted[`${restaurantId}:${date}`] = rows;
}

export function getAccepted(restaurantId: string, date: string): Slot[] | null {
  return store.accepted[`${restaurantId}:${date}`] ?? null;
}

export function mergeWithDefaults(saved: Slot[] | null, defaults: Slot[]): Slot[] {
  if (!saved || saved.length === 0) return defaults;
  const map = new Map(defaults.map(d => [d.time, d.discount]));
  for (const s of saved) map.set(s.time, s.discount);
  return defaults.map(d => ({ time: d.time, discount: map.get(d.time)! }));
}

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
