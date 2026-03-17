// calendrier/comput.js

export function parseISODate(dateISO) {
  if (typeof dateISO !== "string") {
    throw new Error("dateISO doit être une chaîne.");
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO.trim());
  if (!match) {
    throw new Error("Format de date invalide : YYYY-MM-DD attendu.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Date invalide.");
  }

  return { year, month, day };
}

export function formatISODateFromUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function makeUTCDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(dateOrISO, days) {
  const date =
    typeof dateOrISO === "string"
      ? makeUTCDateFromISO(dateOrISO)
      : new Date(dateOrISO.getTime());

  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function addDaysISO(dateISO, days) {
  return formatISODateFromUTC(addDays(dateISO, days));
}

export function diffDays(dateISO1, dateISO2) {
  const d1 = makeUTCDateFromISO(dateISO1);
  const d2 = makeUTCDateFromISO(dateISO2);
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / 86400000);
}

export function dayOfWeek(dateISO) {
  return makeUTCDateFromISO(dateISO).getUTCDay();
}

export function isSunday(dateISO) {
  return dayOfWeek(dateISO) === 0;
}

export function isBetweenInclusive(dateISO, startISO, endISO) {
  return dateISO >= startISO && dateISO <= endISO;
}

export function makeUTCDateFromISO(dateISO) {
  const { year, month, day } = parseISODate(dateISO);
  return makeUTCDate(year, month, day);
}

/**
 * Calcul exact de la date de Pâques grégorienne
 * (algorithme de Meeus/Jones/Butcher)
 * Valable pour le calendrier grégorien.
 */
export function computeGregorianEaster(year) {
  if (!Number.isInteger(year) || year <= 0) {
    throw new Error("L'année doit être un entier positif.");
  }

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

  return {
    year,
    month,
    day,
    dateISO: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/**
 * Retourne les principales dates mobiles fondées sur Pâques.
 * Cette base servira aux modules temporal_*.
 */
export function computeMobileFeasts(year) {
  const easter = computeGregorianEaster(year).dateISO;

  return {
    easter,

    septuagesima: addDaysISO(easter, -63),
    sexagesima: addDaysISO(easter, -56),
    quinquagesima: addDaysISO(easter, -49),

    ashWednesday: addDaysISO(easter, -46),
    firstSundayOfLent: addDaysISO(easter, -42),
    secondSundayOfLent: addDaysISO(easter, -35),
    thirdSundayOfLent: addDaysISO(easter, -28),
    fourthSundayOfLent: addDaysISO(easter, -21),
    passionSunday: addDaysISO(easter, -14),
    palmSunday: addDaysISO(easter, -7),

    holyThursday: addDaysISO(easter, -3),
    goodFriday: addDaysISO(easter, -2),
    holySaturday: addDaysISO(easter, -1),

    easterMonday: addDaysISO(easter, 1),
    lowSunday: addDaysISO(easter, 7),

    rogationSunday: addDaysISO(easter, 35),
    ascension: addDaysISO(easter, 39),
    sundayAfterAscension: addDaysISO(easter, 42),
    pentecost: addDaysISO(easter, 49),
    pentecostMonday: addDaysISO(easter, 50),
    trinitySunday: addDaysISO(easter, 56),
    corpusChristi: addDaysISO(easter, 60),
    sacredHeart: addDaysISO(easter, 68),
    immaculateHeart: addDaysISO(easter, 69),

    firstSundayOfAdvent: computeFirstSundayOfAdvent(year),
    christmas: `${year}-12-25`,
    epiphanyFixed: `${year}-01-06`,
  };
}

/**
 * 1er dimanche de l'Avent :
 * dimanche tombant entre le 27 novembre et le 3 décembre inclus.
 */
export function computeFirstSundayOfAdvent(year) {
  for (let day = 27; day <= 30; day += 1) {
    const candidate = `${year}-11-${String(day).padStart(2, "0")}`;
    if (isSunday(candidate)) return candidate;
  }

  for (let day = 1; day <= 3; day += 1) {
    const candidate = `${year}-12-${String(day).padStart(2, "0")}`;
    if (isSunday(candidate)) return candidate;
  }

  throw new Error("Impossible de calculer le premier dimanche de l'Avent.");
}

/**
 * Baptême du Seigneur (forme ordinaire, version simple universelle)
 * Ici : dimanche après le 6 janvier ; si l'Épiphanie tombe un dimanche,
 * le baptême est le dimanche suivant.
 * Ce point pourra être affiné plus tard selon vos choix exacts.
 */
export function computeBaptismOfTheLord(year) {
  const epiphany = `${year}-01-06`;
  const epiphanyDow = dayOfWeek(epiphany);

  const nextSundayOffset = epiphanyDow === 0 ? 7 : 7 - epiphanyDow;
  return addDaysISO(epiphany, nextSundayOffset);
}

/**
 * Sainte Famille (forme ordinaire, version simple universelle)
 * - dimanche dans l'octave de Noël
 * - si Noël tombe un dimanche, le 30 décembre
 */
export function computeHolyFamily(year) {
  const christmas = `${year}-12-25`;
  const christmasDow = dayOfWeek(christmas);

  if (christmasDow === 0) {
    return `${year}-12-30`;
  }

  for (let day = 26; day <= 31; day += 1) {
    const candidate = `${year}-12-${String(day).padStart(2, "0")}`;
    if (isSunday(candidate)) return candidate;
  }

  throw new Error("Impossible de calculer la Sainte Famille.");
}

/**
 * Renvoie une vue d'ensemble utile pour débogage ou pour les futurs modules.
 */
export function computeLiturgicalYearSkeleton(year) {
  return {
    year,
    easter: computeGregorianEaster(year),
    mobileFeasts: computeMobileFeasts(year),
    firstSundayOfAdvent: computeFirstSundayOfAdvent(year),
    baptismOfTheLord: computeBaptismOfTheLord(year),
    holyFamily: computeHolyFamily(year),
  };
}
