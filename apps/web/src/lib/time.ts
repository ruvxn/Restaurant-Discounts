// apps/web/src/lib/time.ts

/** "YYYY-MM-DD" for today (local machine) */
export function todayYMD() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

/** Convert "YYYY-MM-DD" -> Date at exact 00:00:00.000 UTC using Date.UTC */
export function ymdToUtcMidnight(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0));
}
