export function computeEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day, 12, 0, 0);
}

export function daysBetween(dateA, dateB) {
  const a = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), 12, 0, 0);
  const b = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), 12, 0, 0);

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b - a) / millisecondsPerDay);
}
