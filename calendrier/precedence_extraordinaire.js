// calendrier/precedence_extraordinaire.js

export function resolveExtraordinairePrecedence(candidates, dateISO) {

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      winner: null,
      omittedCelebrations: []
    };
  }

  const sorted = [...candidates].sort(compareCelebrations);

  const winner = sorted[0];
  const omittedCelebrations = sorted.slice(1);

  return {
    winner,
    omittedCelebrations
  };

}

function compareCelebrations(a, b) {

  const pa = precedenceScore(a);
  const pb = precedenceScore(b);

  if (pa !== pb) {
    return pa - pb;
  }

  const prioA = typeof a.priority === "number" ? a.priority : 100;
  const prioB = typeof b.priority === "number" ? b.priority : 100;

  return prioA - prioB;

}

function precedenceScore(c) {

  const rank = c.rank?.id;

  switch (rank) {

    case "I_classe":
      return 1;

    case "dimanche_I_classe":
      return 2;

    case "II_classe":
      return 3;

    case "dimanche_II_classe":
      return 4;

    case "III_classe":
      return 5;

    case "IV_classe":
      return 6;

    default:
      return 10;

  }

}
