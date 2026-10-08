export function toDailyKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDailyKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function previousDailyKey(key: string): string {
  if (!isValidDailyKey(key)) {
    throw new Error(`Invalid daily key: ${key}`);
  }
  const [yearStr, monthStr, dayStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year);
  date.setUTCDate(date.getUTCDate() - 1);
  const prevYear = String(date.getUTCFullYear()).padStart(4, "0");
  const prevMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const prevDay = String(date.getUTCDate()).padStart(2, "0");
  return `${prevYear}-${prevMonth}-${prevDay}`;
}

export function daysBetween(earlier: string, later: string): number {
  if (!isValidDailyKey(earlier) || !isValidDailyKey(later)) {
    throw new Error("Invalid daily key");
  }
  const [y1, m1, d1] = earlier.split("-").map(Number);
  const [y2, m2, d2] = later.split("-").map(Number);
  const date1 = new Date(Date.UTC(y1, m1 - 1, d1));
  date1.setUTCFullYear(y1);
  const date2 = new Date(Date.UTC(y2, m2 - 1, d2));
  date2.setUTCFullYear(y2);
  const msPerDay = 86400000;
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}
