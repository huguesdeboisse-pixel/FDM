import { daysBetween } from "./comput.js";

export function getTemporalOrdinaire(date, easter) {

  const year = date.getFullYear();

  const ashWednesday = new Date(easter);
  ashWednesday.setDate(easter.getDate() - 46);

  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);

  const adventStart = getAdventStart(year);

  const christmas = new Date(year,11,25);

  if(date >= ashWednesday && date < easter){

    return {
      id:"careme",
      label:"Temps du Carême",
      season:{ id:"careme", label:"Carême"},
      color:{ id:"violet", label:"violets"},
      rank:{ id:"temps", label:"Temps liturgique"},
      privilegedSeason:true,
      source:"temporal"
    };

  }

  if(date >= easter && date <= pentecost){

    return {
      id:"temps_pascal",
      label:"Temps pascal",
      season:{ id:"paques", label:"Temps pascal"},
      color:{ id:"blanc", label:"blancs"},
      rank:{ id:"temps", label:"Temps liturgique"},
      privilegedSeason:true,
      source:"temporal"
    };

  }

  if(date >= adventStart && date < christmas){

    return {
      id:"avent",
      label:"Temps de l'Avent",
      season:{ id:"avent", label:"Avent"},
      color:{ id:"violet", label:"violets"},
      rank:{ id:"temps", label:"Temps liturgique"},
      privilegedSeason:true,
      source:"temporal"
    };

  }

  const sunday = date.getDay() === 0;

  if(sunday){

    const sundayNumber = computeOrdinarySundayNumber(date,easter,pentecost);

    return {

      id:"dimanche_temps_ordinaire",

      label: sundayNumber + "e dimanche du temps ordinaire",

      season:{ id:"temps_ordinaire", label:"Temps ordinaire"},

      color:{ id:"vert", label:"verts"},

      rank:{ id:"dimanche", label:"Dimanche"},

      privilegedSeason:false,

      source:"temporal"

    };

  }

  return {

    id:"temps_ordinaire",

    label:"Temps ordinaire",

    season:{ id:"temps_ordinaire", label:"Temps ordinaire"},

    color:{ id:"vert", label:"verts"},

    rank:{ id:"ferie", label:"Férie"},

    privilegedSeason:false,

    source:"temporal"

  };

}

function computeOrdinarySundayNumber(date,easter,pentecost){

  const baptism = getBaptismOfLord(date.getFullYear());

  const firstPeriodStart = new Date(baptism);
  firstPeriodStart.setDate(baptism.getDate()+1);

  if(date < easter){

    const diff = daysBetween(firstPeriodStart,date);

    return Math.floor(diff/7)+1;

  }

  const resume = new Date(pentecost);
  resume.setDate(pentecost.getDate()+7);

  const diff = daysBetween(resume,date);

  return Math.floor(diff/7)+1+6;

}

function getBaptismOfLord(year){

  const epiphany = new Date(year,0,6);

  const sunday = new Date(epiphany);

  sunday.setDate(epiphany.getDate() + (7 - epiphany.getDay()));

  return sunday;

}

function getAdventStart(year){

  const christmas = new Date(year,11,25);

  const sunday = new Date(christmas);

  sunday.setDate(christmas.getDate() - christmas.getDay());

  sunday.setDate(sunday.getDate() - 21);

  return sunday;

}
