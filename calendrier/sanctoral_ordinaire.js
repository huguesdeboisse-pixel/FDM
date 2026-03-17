export function getSanctoralOrdinaire(date){

  const month = date.getMonth() + 1;
  const day = date.getDate();

  const key = `${month}-${day}`;

  const table = SANCTORAL_ORDINAIRE[key];

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



const SANCTORAL_ORDINAIRE = {

  "1-1": {
    id:"marie_mere_de_dieu",
    label:"Sainte Marie, Mère de Dieu",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "1-6": {
    id:"epiphanie",
    label:"Épiphanie du Seigneur",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "2-2": {
    id:"presentation",
    label:"Présentation du Seigneur",
    rank:{ id:"fete", label:"Fête"},
    color:{ id:"blanc", label:"blancs"},
    priority:3
  },

  "3-19": {
    id:"saint_joseph",
    label:"Saint Joseph, époux de la Vierge Marie",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "3-25": {
    id:"annonciation",
    label:"Annonciation du Seigneur",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "6-24": {
    id:"jean_baptiste",
    label:"Nativité de saint Jean Baptiste",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "6-29": {
    id:"pierre_paul",
    label:"Saints Pierre et Paul",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"rouge", label:"rouges"},
    priority:1
  },

  "8-15": {
    id:"assomption",
    label:"Assomption de la Vierge Marie",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "11-1": {
    id:"toussaint",
    label:"Tous les saints",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "11-2": {
    id:"defunts",
    label:"Commémoration de tous les fidèles défunts",
    rank:{ id:"commemoration", label:"Commémoration"},
    color:{ id:"violet", label:"violets"},
    priority:2
  },

  "12-8": {
    id:"immaculee_conception",
    label:"Immaculée Conception",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  },

  "12-25": {
    id:"noel",
    label:"Nativité du Seigneur",
    rank:{ id:"solennite", label:"Solennité"},
    color:{ id:"blanc", label:"blancs"},
    priority:1
  }

};
