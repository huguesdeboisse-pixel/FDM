// rechercheChants.js
// ======================================================
// Moteur de recherche pour Feuille de Messe
// La pertinence textuelle domine.
// Le contexte liturgique n'ajoute qu'un bonus léger.
// ======================================================

function normalizeString(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueArray(arr) {
  return [...new Set(arr)];
}

function tokenize(value) {
  return normalizeString(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

function getTexteComplet(chant) {
  return safeText(chant?.texte_normalise?.texte_complet);
}

function getTitre(chant) {
  return safeText(chant?.titre);
}

function getTitreNormalise(chant) {
  return safeText(chant?.titre_normalise) || getTitre(chant);
}

function isChantExploitable(chant) {
  const statutQualite = normalizeString(chant?.qualite?.statut);
  const texteComplet = getTexteComplet(chant);

  if (statutQualite && statutQualite !== "valide_auto") {
    return false;
  }

  if (!texteComplet.trim()) {
    const refrain = asArray(chant?.texte_normalise?.refrain).filter((x) => safeText(x).trim());
    const couplets = asArray(chant?.texte_normalise?.couplets).filter((x) => safeText(x).trim());
    return refrain.length > 0 || couplets.length > 0;
  }

  return true;
}

function countTokenMatches(queryTokens, targetTokens) {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;

  let count = 0;
  const targetSet = new Set(targetTokens);

  for (const token of queryTokens) {
    if (targetSet.has(token)) count += 1;
  }

  return count;
}

function includesNormalized(haystack, needle) {
  const h = normalizeString(haystack);
  const n = normalizeString(needle);
  return Boolean(n) && h.includes(n);
}

function computeTextScore(chant, query) {
  const normalizedQuery = normalizeString(query);
  const queryTokens = tokenize(query);

  if (!normalizedQuery) {
    return { total: 0, details: {} };
  }

  const titre = getTitre(chant);
  const titreNormalise = getTitreNormalise(chant);
  const texteComplet = getTexteComplet(chant);

  const titreNorm = normalizeString(titreNormalise);
  const texteNorm = normalizeString(texteComplet);

  const titreTokens = tokenize(titreNormalise);
  const texteTokens = tokenize(texteComplet);

  let score = 0;
  const details = {
    exactTitle: 0,
    titleStartsWith: 0,
    titleContains: 0,
    titleTokenMatch: 0,
    textContains: 0,
    textTokenMatch: 0,
  };

  // Correspondance très forte : titre exact
  if (titreNorm === normalizedQuery) {
    details.exactTitle = 300;
    score += details.exactTitle;
  }

  // Titre commence par la requête
  if (titreNorm.startsWith(normalizedQuery) && titreNorm !== normalizedQuery) {
    details.titleStartsWith = 180;
    score += details.titleStartsWith;
  }

  // Requête contenue dans le titre
  if (includesNormalized(titreNormalise, query) && !titreNorm.startsWith(normalizedQuery)) {
    details.titleContains = 120;
    score += details.titleContains;
  }

  // Recouvrement lexical sur le titre
  const titleTokenMatches = countTokenMatches(queryTokens, titreTokens);
  if (titleTokenMatches > 0) {
    details.titleTokenMatch = Math.min(titleTokenMatches * 25, 100);
    score += details.titleTokenMatch;
  }

  // Requête contenue dans le texte complet
  if (includesNormalized(texteComplet, query)) {
    details.textContains = 35;
    score += details.textContains;
  }

  // Recouvrement lexical sur le texte complet
  const textTokenMatches = countTokenMatches(queryTokens, texteTokens);
  if (textTokenMatches > 0) {
    details.textTokenMatch = Math.min(textTokenMatches * 6, 30);
    score += details.textTokenMatch;
  }

  return { total: score, details };
}

function computeContextBonus(chant, context = {}) {
  const fonctions = asArray(chant?.liturgie?.fonctions);
  const temps = asArray(chant?.liturgie?.temps_liturgiques);
  const rites = asArray(chant?.liturgie?.rites);
  const themes = asArray(chant?.liturgie?.themes);

  let bonus = 0;
  const details = {
    fonction: 0,
    temps: 0,
    rite: 0,
    themes: 0,
  };

  if (context.fonction && fonctions.includes(context.fonction)) {
    details.fonction = 12;
    bonus += details.fonction;
  }

  if (context.tempsLiturgique) {
    if (temps.includes(context.tempsLiturgique)) {
      details.temps = 8;
      bonus += details.temps;
    } else if (temps.includes("T_TOUS_TEMPS")) {
      details.temps = 4;
      bonus += details.temps;
    }
  }

  if (context.rite) {
    if (rites.length === 0) {
      details.rite = 2;
      bonus += details.rite;
    } else if (rites.includes(context.rite)) {
      details.rite = 5;
      bonus += details.rite;
    }
  }

  const requestedThemes = asArray(context.themes);
  if (requestedThemes.length > 0 && themes.length > 0) {
    let themeMatches = 0;
    for (const theme of requestedThemes) {
      if (themes.includes(theme)) {
        themeMatches += 1;
      }
    }
    details.themes = Math.min(themeMatches * 3, 9);
    bonus += details.themes;
  }

  return { total: bonus, details };
}

function computeLikeBonus(chant, userProfile = {}) {
  const likedIds = new Set(asArray(userProfile.likedIds));
  if (likedIds.has(chant.id)) {
    return 6;
  }
  return 0;
}

function computeFinalSearchScore(chant, query, context = {}, userProfile = {}) {
  if (!isChantExploitable(chant)) {
    return {
      total: -9999,
      details: {
        excluded: true,
      },
    };
  }

  const textScore = computeTextScore(chant, query);
  const contextBonus = computeContextBonus(chant, context);
  const likeBonus = computeLikeBonus(chant, userProfile);

  const total = textScore.total + contextBonus.total + likeBonus;

  return {
    total,
    details: {
      text: textScore.details,
      context: contextBonus.details,
      like: likeBonus,
    },
  };
}

export function searchChants(chants, query, context = {}, userProfile = {}, options = {}) {
  const {
    maxResults = 20,
    minScore = 20,
  } = options;

  const normalizedQuery = normalizeString(query);
  if (!normalizedQuery) return [];

  const ranked = chants
    .map((chant) => {
      const scoring = computeFinalSearchScore(chant, query, context, userProfile);
      return {
        chant,
        score: scoring.total,
        scoreDetails: scoring.details,
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, maxResults);
}

export function buildSearchIndex(chants) {
  return chants.map((chant) => ({
    id: chant.id,
    titre: getTitre(chant),
    titreNormalise: getTitreNormalise(chant),
    texteComplet: getTexteComplet(chant),
  }));
}

export function highlightMatch(text, query) {
  const source = safeText(text);
  const q = safeText(query).trim();

  if (!source || !q) return source;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "ig");

  return source.replace(regex, "<mark>$1</mark>");
}
