// selectionChants.js

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(chant) {
  const texte = chant?.texte_normalise || {};
  const texteComplet = typeof texte.texte_complet === "string" ? texte.texte_complet.trim() : "";

  if (texteComplet) return true;

  const refrain = asArray(texte.refrain).filter((x) => typeof x === "string" && x.trim());
  const couplets = asArray(texte.couplets).filter((x) => typeof x === "string" && x.trim());

  return refrain.length > 0 || couplets.length > 0;
}

function isExploitable(chant) {
  const statut = String(chant?.qualite?.statut || "").trim().toLowerCase();

  if (statut && statut !== "valide_auto") {
    return false;
  }

  return hasText(chant);
}

function scoreAnnotation(chant) {
  const statut = String(chant?.qualite_annotation?.statut_annotation || "").trim().toLowerCase();

  if (statut === "annote_auto") return 10;
  if (statut === "annote_partiel") return 5;
  if (statut === "annotation_partielle") return 5;
  return 0;
}

function scoreFonction(chant, fonctionDemandee) {
  if (!fonctionDemandee) return 0;

  const fonctions = asArray(chant?.liturgie?.fonctions);
  if (fonctions.includes(fonctionDemandee)) return 50;

  return 0;
}

function scoreTemps(chant, tempsLiturgique) {
  if (!tempsLiturgique) return 0;

  const temps = asArray(chant?.liturgie?.temps_liturgiques);

  if (temps.includes(tempsLiturgique)) return 30;
  if (temps.includes("T_TOUS_TEMPS")) return 18;

  return 0;
}

function scoreRite(chant, rite) {
  if (!rite) return 0;

  const rites = asArray(chant?.liturgie?.rites);

  if (rites.length === 0) return 5;
  if (rites.includes(rite)) return 20;

  return -1000;
}

function scoreThemes(chant) {
  const themes = asArray(chant?.liturgie?.themes);
  return Math.min(themes.length * 2, 10);
}

function scoreQualite(chant) {
  const score = Number(chant?.qualite?.score_confiance || 0);
  if (Number.isNaN(score)) return 0;
  return Math.min(Math.floor(score / 10), 10);
}

function scoreVariete() {
  return Math.random() * 4;
}

function computeScore(chant, context = {}) {
  if (!isExploitable(chant)) {
    return -9999;
  }

  const total =
    scoreFonction(chant, context.fonction) +
    scoreTemps(chant, context.tempsLiturgique) +
    scoreRite(chant, context.rite) +
    scoreThemes(chant) +
    scoreAnnotation(chant) +
    scoreQualite(chant) +
    scoreVariete();

  return total;
}

export function selectionChants(chants, context = {}, maxResults = 3) {
  return chants
    .map((chant) => ({
      chant,
      score: computeScore(chant, context),
    }))
    .filter((item) => item.score > -1000)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
