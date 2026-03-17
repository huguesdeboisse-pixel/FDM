export function getSanctoralExtraordinaire(date){

  const month = date.getMonth() + 1;
  const day = date.getDate();

  const key = `${month}-${day}`;

  const table = SANCTORAL_EXTRAORDINAIRE[key];

  if(!table){
    return null;
  }

  return {
    id: table.id,
    label: table.label,
    rank: table.rank,
    color: table.color,
    source: "sanctoral",
    priority: table.priority
  };

}



const SANCTORAL_EXTRAORDINAIRE = {

  "1-1": {
    id:"circoncision",
    label:"Circoncision du Seigneur",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "1-6": {
    id:"epiphanie",
    label:"Épiphanie du Seigneur",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "2-2": {
    id:"presentation",
    label:"Purification de la Bienheureuse Vierge Marie",
    rank:{ id:"II_classe", label:"II classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:2
  },

  "3-19": {
    id:"saint_joseph",
    label:"Saint Joseph, époux de la Bienheureuse Vierge Marie",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "3-25": {
    id:"annonciation",
    label:"Annonciation de la Bienheureuse Vierge Marie",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "6-24": {
    id:"jean_baptiste",
    label:"Nativité de saint Jean Baptiste",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "6-29": {
    id:"pierre_paul",
    label:"Saints Pierre et Paul",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"rouge", label:"rouges"},
    priority:1
  },

  "8-15": {
    id:"assomption",
    label:"Assomption de la Bienheureuse Vierge Marie",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "11-1": {
    id:"toussaint",
    label:"Tous les Saints",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "12-8": {
    id:"immaculee_conception",
    label:"Immaculée Conception de la Bienheureuse Vierge Marie",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "12-25": {
    id:"noel",
    label:"Nativité du Seigneur",
    rank:{ id:"I_classe", label:"I classe"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  }

};
