// calendrier/sanctoral_ordinaire.js

import { parseISODate } from "./comput.js";

export function getSanctoralOrdinaireForDate(dateISO) {

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
      id: "mary_mother_of_god",
      label: "Marie, Mère de Dieu",
      rank: "solennite",
      color: "blanc",
      priority: 1
    }
  ],

  "01-06": [
    {
      id: "epiphany",
      label: "Épiphanie du Seigneur",
      rank: "solennite",
      color: "blanc",
      priority: 1
    }
  ],

  "02-02": [
    {
      id: "presentation",
      label: "Présentation du Seigneur",
      rank: "fete_du_seigneur",
      color: "blanc",
      priority: 2
    }
  ],

  "03-19": [
    {
      id: "st_joseph",
      label: "Saint Joseph, époux de la Vierge Marie",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }
  ],

  "03-25": [
    {
      id: "annunciation",
      label: "Annonciation du Seigneur",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }
  ],

  "06-24": [
    {
      id: "nativity_john_baptist",
      label: "Nativité de saint Jean-Baptiste",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }
  ],

  "06-29": [
    {
      id: "peter_paul",
      label: "Saints Pierre et Paul",
      rank: "solennite",
      color: "rouge",
      priority: 2
    }
  ],

  "08-15": [
    {
      id: "assumption",
      label: "Assomption de la Vierge Marie",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }
  ],

  "11-01": [
    {
      id: "all_saints",
      label: "Toussaint",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }
  ],

  "11-02": [
    {
      id: "all_souls",
      label: "Commémoration des fidèles défunts",
      rank: "commemoration",
      color: "violet",
      priority: 3
    }
  ],

  "12-08": [
    {
      id: "immaculate_conception",
      label: "Immaculée Conception",
      rank: "solennite",
      color: "blanc",
      priority: 2
    }
  ],

  "12-25": [
    {
      id: "christmas",
      label: "Nativité du Seigneur",
      rank: "solennite",
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

    priority,

    season: {
      id: "sanctoral",
      label: "Sanctoral"
    }

  };

}

function mapRank(id) {

  const map = {

    solennite: "Solennité",
    fete: "Fête",
    fete_du_seigneur: "Fête du Seigneur",
    commemoration: "Commémoration"

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
