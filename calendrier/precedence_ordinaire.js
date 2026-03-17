export function resolveOrdinairePrecedence(candidates){

  if(!Array.isArray(candidates) || candidates.length === 0){
    return {
      winner:null,
      omittedCelebrations:[]
    };
  }

  const sorted = [...candidates].sort(compareCelebrations);

  return {
    winner:sorted[0],
    omittedCelebrations:sorted.slice(1)
  };

}



function compareCelebrations(a,b){

  const pa = precedenceScore(a);
  const pb = precedenceScore(b);

  if(pa !== pb){
    return pa - pb;
  }

  const prioA = typeof a.priority === "number" ? a.priority : 100;
  const prioB = typeof b.priority === "number" ? b.priority : 100;

  return prioA - prioB;

}



function precedenceScore(c){

  const rank = c?.rank?.id;

  switch(rank){

    case "solennite":
      return 1;

    case "fete":
      return 2;

    case "dimanche":
      return 3;

    case "memorial":
      return 4;

    case "commemoration":
      return 5;

    case "ferie":
      return 6;

    default:
      return 10;

  }

}
