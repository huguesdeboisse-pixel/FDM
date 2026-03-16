// selectionChants.js

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function scoreChant(chant, context) {

  let score = 0;

  const fonctions = asArray(chant?.liturgie?.fonctions);
  const temps = asArray(chant?.liturgie?.temps_liturgiques);
  const rites = asArray(chant?.liturgie?.rites);
  const themes = asArray(chant?.liturgie?.themes);

  if (context.fonction && fonctions.includes(context.fonction)) {
    score += 50;
  }

  if (context.tempsLiturgique) {

    if (temps.includes(context.tempsLiturgique)) {
      score += 30;
    }

    if (temps.includes("T_TOUS_TEMPS")) {
      score += 20;
    }

  }

  if (context.rite) {

    if (rites.length === 0) {
      score += 5;
    }

    if (rites.includes(context.rite)) {
      score += 20;
    }

  }

  if (themes.length > 0) {
    score += Math.min(themes.length * 2, 10);
  }

  score += Math.random() * 5;

  return score;
}

export function selectionChants(chants, context, max = 3) {

  const valides = chants.filter(c =>
    c?.qualite?.statut === "valide_auto"
  );

  const scored = valides.map(c => ({
    chant: c,
    score: scoreChant(c, context)
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, max);
}
