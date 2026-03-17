import { computeEaster } from "./comput.js";

import { getTemporalOrdinaire } from "./temporal_ordinaire.js";
import { getSanctoralOrdinaire } from "./sanctoral_ordinaire.js";
import { resolveOrdinairePrecedence } from "./precedence_ordinaire.js";

import { getTemporalExtraordinaire } from "./temporal_extraordinaire.js";
import { getSanctoralExtraordinaire } from "./sanctoral_extraordinaire.js";
import { resolveExtraordinairePrecedence } from "./precedence_extraordinaire.js";

window.calculerTempsLiturgique = function(dateISO, rite){

  const date = new Date(dateISO + "T12:00:00");

  const year = date.getFullYear();

  const easter = computeEaster(year);

  let temporal;
  let sanctoral;

  if(rite === "ordinaire"){

    temporal = getTemporalOrdinaire(date, easter);
    sanctoral = getSanctoralOrdinaire(date);

  }else{

    temporal = getTemporalExtraordinaire(date, easter);
    sanctoral = getSanctoralExtraordinaire(date);

  }

  const candidates = [];

  if(temporal){
    candidates.push(temporal);
  }

  if(sanctoral){
    candidates.push(sanctoral);
  }

  let result;

  if(rite === "ordinaire"){

    result = resolveOrdinairePrecedence(candidates, dateISO);

  }else{

    result = resolveExtraordinairePrecedence(candidates, dateISO);

  }

  const celebration = result.winner || {};

  const displayTitle = celebration.label || temporal?.label || "";

  const subtitleParts = [];

  const dateLabel = formatDateFr(date);

  subtitleParts.push(dateLabel);

  if(sanctoral && sanctoral.label){
    subtitleParts.push(sanctoral.label);
  }

  if(celebration.color?.label){
    subtitleParts.push("ornements " + celebration.color.label.toLowerCase());
  }

  const subtitle = subtitleParts.join(" — ");

  return {

    dateISO,

    rite,

    season: temporal?.season || {},

    celebration: {
      id: celebration.id || "",
      label: celebration.label || ""
    },

    rank: celebration.rank || {},

    color: celebration.color || {},

    privilegedSeason: temporal?.privilegedSeason || false,

    sanctoral: sanctoral || {},

    display: {
      title: displayTitle,
      subtitle: subtitle,
      date: dateLabel
    },

    metadata: {
      source: celebration.source || "",
      priority: celebration.priority || null,
      omittedCelebrations: result.omittedCelebrations || []
    }

  };

};



function formatDateFr(date){

  return date.toLocaleDateString("fr-FR",{
    day:"numeric",
    month:"long"
  });

}
