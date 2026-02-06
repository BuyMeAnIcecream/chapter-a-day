const PACIFIC_TZ = "America/Los_Angeles";

/** Returns YYYY-MM-DD for the given date in California (Pacific) time. */
export const getDateKey = (date: Date): string =>
  date.toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });

/** Returns a Date during the given day in Pacific (for DB storage). */
export const getStartOfDayPacific = (dateKey: string): Date =>
  new Date(`${dateKey}T12:00:00.000Z`);

export const CHAPTER_DELIVERY_START_DATE = "2026-01-01";

/** Days from chapter delivery start (Jan 1, 2026 Pacific) to the given date, in Pacific time. */
export const getDaysSinceStart = (date: Date): number => {
  const currentKey = getDateKey(date);
  const start = new Date(`${CHAPTER_DELIVERY_START_DATE}T12:00:00.000Z`);
  const current = new Date(`${currentKey}T12:00:00.000Z`);
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};
