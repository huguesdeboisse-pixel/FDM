// calendrier/temporal_extraordinaire.js

import {
  parseISODate,
  computeMobileFeasts,
  isSunday
} from "./comput.js";

export function buildTemporalExtraordinaire(dateISO) {

  const { year } = parseISODate(dateISO);
  const mobiles = computeMobileFeasts(year);

  const results = [];

  // --- Temps de Septuagésime

  if (dateISO === mobiles.septuagesima) {
    results.push(buildCelebration(
      "septuagesima",
      "Dimanche de la Septuagésime",
      "septuagesime",
      "dimanche_I_classe",
      "violet",
      2
    ));
  }

  if (dateISO === mobiles.sexagesima) {
    results.push(buildCelebration(
      "sexagesima",
      "Dimanche de la Sexagésime",
      "septuagesime",
      "dimanche_I_classe",
      "violet",
      2
    ));
  }

  if (dateISO === mobiles.quinquagesima) {
    results.push(buildCelebration(
      "quinquagesima",
      "Dimanche de la Quinquagésime",
      "septuagesime",
      "dimanche_I_classe",
      "violet",
      2
    ));
  }

  // --- Carême

  if (dateISO === mobiles.ashWednesday) {
    results.push(buildCelebration(
      "ash_wednesday",
      "Mercredi des Cendres",
      "careme",
      "I_classe",
      "violet",
      1
    ));
  }

  if (dateISO === mobiles.firstSundayOfLent) {
    results.push(buildCelebration(
      "lent_1",
      "1er dimanche de Carême",
      "careme",
      "dimanche_I_classe",
      "violet",
      1
    ));
  }

  if (dateISO === mobiles.palmSunday) {
    results.push(buildCelebration(
      "palm_sunday",
      "Dimanche des Rameaux",
      "semaine_sainte",
      "I_classe",
      "rouge",
      1
    ));
  }

  if (dateISO === mobiles.goodFriday) {
    results.push(buildCelebration(
      "good_friday",
      "Vendredi Saint",
      "semaine_sainte",
      "I_classe",
      "rouge",
      1
    ));
  }

  // --- Temps pascal

  if (dateISO === mobiles.easter) {
    results.push(buildCelebration(
      "easter",
      "Dimanche de Pâques",
      "temps_pascal",
      "I_classe",
      "blanc",
      1
    ));
  }

  if (dateISO === mobiles.ascension) {
    results.push(buildCelebration(
      "ascension",
      "Ascension du Seigneur",
      "temps_pascal",
      "I_classe",
      "blanc",
      1
    ));
  }

  if (dateISO === mobiles.pentecost) {
    results.push(buildCelebration(
      "pentecost",
      "Pentecôte",
      "temps_pascal",
      "I_classe",
      "rouge",
      1
    ));
  }

  // --- Dimanches après Pentecôte

  if (isSunday(dateISO)) {

    results.push(buildCelebration(
      "post_pentecost_sunday",
      "Dimanche après la Pentecôte",
      "temps_apres_pentecote",
      "dimanche_II_classe",
      "vert",
      5
    ));

  }

  // --- Féries

  if (results.length === 0) {

    results.push(buildCelebration(
      "feria",
      "Férie",
      "temps_ordinaire",
      "IV_classe",
      "vert",
      10
    ));

  }

  return results;

}

function buildCelebration(
  id,
  label,
  season,
  rank,
  color,
  priority
) {

  return {

    id,

    source: "temporal",

    celebration: {
      id,
      label
    },

    season: {
      id: season,
      label: mapSeason(season)
    },

    rank: {
      id: rank,
      label: mapRank(rank)
    },

    color: {
      id: color,
      label: mapColor(color)
    },

    priority

  };

}

function mapSeason(id) {

  const map = {

    septuagesime: "Temps de Septuagésime",
    careme: "Carême",
    semaine_sainte: "Semaine sainte",
    temps_pascal: "Temps pascal",
    temps_apres_pentecote: "Temps après la Pentecôte",
    temps_ordinaire: "Temps ordinaire"

  };

  return map[id] || id;

}

function mapRank(id) {

  const map = {

    I_classe: "Ire classe",
    II_classe: "IIe classe",
    III_classe: "IIIe classe",
    IV_classe: "IVe classe",
    dimanche_I_classe: "Dimanche de Ire classe",
    dimanche_II_classe: "Dimanche de IIe classe"

  };

  return map[id] || id;

}

function mapColor(id) {

  const map = {

    blanc: "ornements blancs",
    rouge: "ornements rouges",
    vert: "ornements verts",
    violet: "ornements violets"

  };

  return map[id] || id;

}
