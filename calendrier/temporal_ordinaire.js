// calendrier/temporal_ordinaire.js

import {
  parseISODate,
  computeMobileFeasts,
  computeBaptismOfTheLord,
  computeHolyFamily,
  addDaysISO,
  isSunday
} from "./comput.js";

export function buildTemporalOrdinaire(dateISO) {

  const { year } = parseISODate(dateISO);
  const mobiles = computeMobileFeasts(year);

  const results = [];

  // --- Noël et octave de Noël

  const christmas = mobiles.christmas;

  if (dateISO === christmas) {
    results.push(buildCelebration({
      id: "christmas",
      label: "Nativité du Seigneur",
      season: "temps_de_noel",
      rank: "solennite",
      color: "blanc",
      priority: 1
    }));
  }

  const holyFamily = computeHolyFamily(year);

  if (dateISO === holyFamily) {
    results.push(buildCelebration({
      id: "holy_family",
      label: "Sainte Famille",
      season: "temps_de_noel",
      rank: "fete",
      color: "blanc",
      priority: 4
    }));
  }

  if (dateISO === mobiles.epiphanyFixed) {
    results.push(buildCelebration({
      id: "epiphany",
      label: "Épiphanie du Seigneur",
      season: "temps_de_noel",
      rank: "solennite",
      color: "blanc",
      priority: 1
    }));
  }

  const baptism = computeBaptismOfTheLord(year);

  if (dateISO === baptism) {
    results.push(buildCelebration({
      id: "baptism_lord",
      label: "Baptême du Seigneur",
      season: "temps_de_noel",
      rank: "fete",
      color: "blanc",
      priority: 3
    }));
  }

  // --- Carême

  if (dateISO === mobiles.ashWednesday) {
    results.push(buildCelebration({
      id: "ash_wednesday",
      label: "Mercredi des Cendres",
      season: "careme",
      rank: "jour_ferial_majeur",
      color: "violet",
      priority: 2,
      privilegedSeason: true
    }));
  }

  if (dateISO === mobiles.firstSundayOfLent) {
    results.push(buildCelebration({
      id: "lent_1",
      label: "1er dimanche de Carême",
      season: "careme",
      rank: "dimanche",
      color: "violet",
      priority: 2,
      privilegedSeason: true
    }));
  }

  if (dateISO === mobiles.secondSundayOfLent) {
    results.push(buildCelebration({
      id: "lent_2",
      label: "2e dimanche de Carême",
      season: "careme",
      rank: "dimanche",
      color: "violet",
      priority: 2,
      privilegedSeason: true
    }));
  }

  if (dateISO === mobiles.thirdSundayOfLent) {
    results.push(buildCelebration({
      id: "lent_3",
      label: "3e dimanche de Carême",
      season: "careme",
      rank: "dimanche",
      color: "violet",
      priority: 2,
      privilegedSeason: true
    }));
  }

  if (dateISO === mobiles.fourthSundayOfLent) {
    results.push(buildCelebration({
      id: "lent_4",
      label: "4e dimanche de Carême",
      season: "careme",
      rank: "dimanche",
      color: "rose",
      priority: 2,
      privilegedSeason: true
    }));
  }

  if (dateISO === mobiles.palmSunday) {
    results.push(buildCelebration({
      id: "palm_sunday",
      label: "Dimanche des Rameaux",
      season: "semaine_sainte",
      rank: "dimanche",
      color: "rouge",
      priority: 1,
      privilegedSeason: true
    }));
  }

  if (dateISO === mobiles.goodFriday) {
    results.push(buildCelebration({
      id: "good_friday",
      label: "Vendredi Saint",
      season: "semaine_sainte",
      rank: "celebration_du_seigneur",
      color: "rouge",
      priority: 1,
      privilegedSeason: true
    }));
  }

  // --- Temps pascal

  if (dateISO === mobiles.easter) {
    results.push(buildCelebration({
      id: "easter",
      label: "Dimanche de Pâques",
      season: "temps_pascal",
      rank: "solennite",
      color: "blanc",
      priority: 1
    }));
  }

  if (dateISO === mobiles.ascension) {
    results.push(buildCelebration({
      id: "ascension",
      label: "Ascension du Seigneur",
      season: "temps_pascal",
      rank: "solennite",
      color: "blanc",
      priority: 1
    }));
  }

  if (dateISO === mobiles.pentecost) {
    results.push(buildCelebration({
      id: "pentecost",
      label: "Pentecôte",
      season: "temps_pascal",
      rank: "solennite",
      color: "rouge",
      priority: 1
    }));
  }

  if (dateISO === mobiles.trinitySunday) {
    results.push(buildCelebration({
      id: "trinity",
      label: "Sainte Trinité",
      season: "temps_ordinaire",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }));
  }

  if (dateISO === mobiles.corpusChristi) {
    results.push(buildCelebration({
      id: "corpus_christi",
      label: "Fête du Saint-Sacrement",
      season: "temps_ordinaire",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }));
  }

  // --- Dimanches ordinaires

  if (isSunday(dateISO)) {

    const label = "Dimanche du Temps ordinaire";

    results.push(buildCelebration({
      id: "ordinary_sunday",
      label,
      season: "temps_ordinaire",
      rank: "dimanche",
      color: "vert",
      priority: 6
    }));

  }

  // --- Ferial ordinaire

  if (results.length === 0) {

    results.push(buildCelebration({
      id: "weekday_ordinary",
      label: "Férie du Temps ordinaire",
      season: "temps_ordinaire",
      rank: "ferial",
      color: "vert",
      priority: 10
    }));

  }

  return results;
}

function buildCelebration({
  id,
  label,
  season,
  rank,
  color,
  priority,
  privilegedSeason = false
}) {

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

    privilegedSeason,

    priority

  };

}

function mapSeason(id) {

  const map = {

    temps_de_noel: "Temps de Noël",
    careme: "Carême",
    semaine_sainte: "Semaine sainte",
    temps_pascal: "Temps pascal",
    temps_ordinaire: "Temps ordinaire"

  };

  return map[id] || id;

}

function mapRank(id) {

  const map = {

    solennite: "Solennité",
    fete: "Fête",
    dimanche: "Dimanche",
    ferial: "Férie",
    jour_ferial_majeur: "Jour férial majeur",
    celebration_du_seigneur: "Célébration du Seigneur"

  };

  return map[id] || id;

}

function mapColor(id) {

  const map = {

    blanc: "ornements blancs",
    rouge: "ornements rouges",
    vert: "ornements verts",
    violet: "ornements violets",
    rose: "ornements roses"

  };

  return map[id] || id;

}
