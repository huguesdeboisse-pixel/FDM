import { daysBetween } from "./comput.js";

export function getTemporalExtraordinaire(date, easter) {

  const year = date.getFullYear();

  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);

  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);

  const septuagesima = new Date(easter);
  septuagesima.setDate(easter.getDate() - 63);

  const sexagesima = new Date(easter);
  sexagesima.setDate(easter.getDate() - 56);

  const quinquagesima = new Date(easter);
  quinquagesima.setDate(easter.getDate() - 49);

  const adventStart = getAdventStart(year);
  const christmas = new Date(year, 11, 25);

  const sunday = date.getDay() === 0;

  /* ---------------- Avent ---------------- */

  if (date >= adventStart && date < christmas) {

    if (sunday) {

      const n = Math.floor(daysBetween(adventStart, date) / 7) + 1;

      return {
        id: "dimanche_avent",
        label: ordinal(n) + " dimanche de l'Avent",
        season: { id: "avent", label: "Avent" },
        color: { id: "violet", label: "violets" },
        rank: { id: "I_classe", label: "I classe" },
        privilegedSeason: true,
        source: "temporal"
      };

    }

    return {
      id: "avent",
      label: "Temps de l'Avent",
      season: { id: "avent", label: "Avent" },
      color: { id: "violet", label: "violets" },
      rank: { id: "ferie", label: "Férie" },
      privilegedSeason: true,
      source: "temporal"
    };

  }

  /* ---------------- Septuagésime ---------------- */

  if (date >= septuagesima && date < ashWednesday) {

    if (sunday) {

      if (date.getTime() === septuagesima.getTime())
        return createSeptuagesima("Septuagésime");

      if (date.getTime() === sexagesima.getTime())
        return createSeptuagesima("Sexagésime");

      if (date.getTime() === quinquagesima.getTime())
        return createSeptuagesima("Quinquagésime");

    }

    return {
      id: "temps_septuagesime",
      label: "Temps de Septuagésime",
      season: { id: "septuagesime", label: "Temps de Septuagésime" },
      color: { id: "violet", label: "violets" },
      rank: { id: "ferie", label: "Férie" },
      privilegedSeason: true,
      source: "temporal"
    };

  }

  /* ---------------- Carême ---------------- */

  if (date >= ashWednesday && date < easter) {

    if (sunday) {

      const firstSunday = new Date(ashWednesday);
      firstSunday.setDate(ashWednesday.getDate() + (7 - ashWednesday.getDay()));

      const n = Math.floor(daysBetween(firstSunday, date) / 7) + 1;

      return {
        id: "dimanche_careme",
        label: ordinal(n) + " dimanche de Carême",
        season: { id: "careme", label: "Carême" },
        color: { id: "violet", label: "violets" },
        rank: { id: "I_classe", label: "I classe" },
        privilegedSeason: true,
        source: "temporal"
      };

    }

    return {
      id: "careme",
      label: "Temps du Carême",
      season: { id: "careme", label: "Carême" },
      color: { id: "violet", label: "violets" },
      rank: { id: "ferie", label: "Férie" },
      privilegedSeason: true,
      source: "temporal"
    };

  }

  /* ---------------- Temps pascal ---------------- */

  if (date >= easter && date <= pentecost) {

    if (sunday) {

      const n = Math.floor(daysBetween(easter, date) / 7) + 1;

      return {
        id: "dimanche_pascal",
        label: ordinal(n) + " dimanche après Pâques",
        season: { id: "paques", label: "Temps pascal" },
        color: { id: "blanc", label: "blancs" },
        rank: { id: "I_classe", label: "I classe" },
        privilegedSeason: true,
        source: "temporal"
      };

    }

    return {
      id: "temps_pascal",
      label: "Temps pascal",
      season: { id: "paques", label: "Temps pascal" },
      color: { id: "blanc", label: "blancs" },
      rank: { id: "ferie", label: "Férie" },
      privilegedSeason: true,
      source: "temporal"
    };

  }

  /* ---------------- Dimanches après Pentecôte ---------------- */

  if (sunday && date > pentecost) {

    const first = new Date(pentecost);
    first.setDate(pentecost.getDate() + 7);

    const n = Math.floor(daysBetween(first, date) / 7) + 1;

    return {
      id: "dimanche_apres_pentecote",
      label: ordinal(n) + " dimanche après la Pentecôte",
      season: { id: "pentecote", label: "Temps après la Pentecôte" },
      color: { id: "vert", label: "verts" },
      rank: { id: "II_classe", label: "II classe" },
      privilegedSeason: false,
      source: "temporal"
    };

  }

  return {
    id: "temps_ferial",
    label: "Férie",
    season: { id: "ferial", label: "Temps ordinaire" },
    color: { id: "vert", label: "verts" },
    rank: { id: "ferie", label: "Férie" },
    privilegedSeason: false,
    source: "temporal"
  };

}

/* ---------- Fonctions utilitaires ---------- */

function createSeptuagesima(name) {

  return {
    id: "dimanche_septuagesime",
    label: name,
    season: { id: "septuagesime", label: "Temps de Septuagésime" },
    color: { id: "violet", label: "violets" },
    rank: { id: "II_classe", label: "II classe" },
    privilegedSeason: true,
    source: "temporal"
  };

}

function getAdventStart(year) {

  const christmas = new Date(year, 11, 25);

  const sunday = new Date(christmas);
  sunday.setDate(christmas.getDate() - christmas.getDay());
  sunday.setDate(sunday.getDate() - 21);

  return sunday;

}

function ordinal(n) {

  if (n === 1) return "1er";
  return n + "e";

}
