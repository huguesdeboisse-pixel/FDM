// calendrier/sanctoral_extraordinaire.js

import { parseISODate } from "./comput.js";

export function getSanctoralExtraordinaireForDate(dateISO) {

  const { month, day } = parseISODate(dateISO);

  const key = `${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  const entry = SANCTORAL[key];

  if (!entry) {
    return [];
  }

  return entry.map(e => buildCelebration(e));

}

const SANCTORAL = {

  "01-01": [
    {
      id: "circumcision",
      label: "Circoncision du Seigneur",
      rank: "I_classe",
      color: "blanc",
      priority: 1
    }
  ],

  "01-06": [
    {
      id: "epiphany",
      label: "Épiphanie du Seigneur",
      rank: "I_classe",
      color: "blanc",
      priority: 1
    }
  ],

  "02-02": [
    {
      id: "presentation",
      label: "Purification de la Sainte Vierge",
      rank: "II_classe",
      color: "blanc",
      priority: 3
    }
  ],

  "03-19": [
    {
      id: "st_joseph",
      label: "Saint Joseph, époux de la Bienheureuse Vierge Marie",
      rank: "I_classe",
      color: "blanc",
      priority: 2
    }
  ],

  "03-25": [
    {
      id: "annunciation",
      label: "Annonciation de la Bienheureuse Vierge Marie",
      rank: "I_classe",
      color: "blanc",
      priority: 2
    }
  ],

  "06-24": [
    {
      id: "nativity_john_baptist",
      label: "Nativité de saint Jean-Baptiste",
      rank: "I_classe",
      color: "blanc",
      priority: 2
    }
  ],

  "06-29": [
    {
      id: "peter_paul",
      label: "Saints Pierre et Paul",
      rank: "I_classe",
      color: "rouge",
      priority: 2
    }
  ],

  "08-15": [
    {
      id: "assumption",
      label: "Assomption de la Bienheureuse Vierge Marie",
      rank: "I_classe",
      color: "blanc",
      priority: 2
    }
  ],

  "09-29": [
    {
      id: "st_michael",
      label: "Saint Michel Archange",
      rank: "I_classe",
      color: "blanc",
      priority: 2
    }
  ],

  "11-01": [
    {
      id: "all_saints",
      label: "Tous les Saints",
      rank: "I_classe",
      color: "blanc",
      priority: 2
    }
  ],

  "11-02": [
    {
      id: "all_souls",
      label: "Commémoration de tous les fidèles défunts",
      rank: "I_classe",
      color: "violet",
      priority: 3
    }
  ],

  "12-08": [
    {
      id: "immaculate_conception",
      label: "Immaculée Conception de la Bienheureuse Vierge Marie",
      rank: "I_classe",
      color: "blanc",
      priority: 2
    }
  ],

  "12-25": [
    {
      id: "christmas",
      label: "Nativité du Seigneur",
      rank: "I_classe",
      color: "blanc",
      priority: 1
    }
  ]

};

function buildCelebration({
  id,
  label,
  rank,
  color,
  priority
}) {

  return {

    id,

    source: "sanctoral",

    celebration: {
      id,
      label
    },

    rank: {
      id: rank,
      label: mapRank(rank)
    },

    color: {
      id: color,
      label: mapColor(color)
    },

    season: {
      id: "sanctoral",
      label: "Sanctoral"
    },

    priority

  };

}

function mapRank(id) {

  const map = {

    I_classe: "Ire classe",
    II_classe: "IIe classe",
    III_classe: "IIIe classe",
    IV_classe: "IVe classe"

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
