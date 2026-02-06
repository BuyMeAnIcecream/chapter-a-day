export const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const getStartOfDayUtc = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`);

export const CHAPTER_DELIVERY_START_DATE = new Date("2026-01-01T00:00:00.000Z");

export const getDaysSinceStart = (date: Date): number => {
  const start = new Date(CHAPTER_DELIVERY_START_DATE);
  start.setUTCHours(0, 0, 0, 0);
  const current = new Date(date);
  current.setUTCHours(0, 0, 0, 0);
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};
