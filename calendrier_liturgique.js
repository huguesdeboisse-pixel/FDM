// calendrier/calendrier_liturgique.js

import { buildTemporalOrdinaire } from "./temporal_ordinaire.js";
import { buildTemporalExtraordinaire } from "./temporal_extraordinaire.js";
import { getSanctoralOrdinaireForDate } from "./sanctoral_ordinaire.js";
import { getSanctoralExtraordinaireForDate } from "./sanctoral_extraordinaire.js";
import { resolveOrdinairePrecedence } from "./precedence_ordinaire.js";
import { resolveExtraordinairePrecedence } from "./precedence_extraordinaire.js";

const RITES = {
  ORDINAIRE: "ordinaire",
  EXTRAORDINAIRE: "extraordinaire",
};

export function calculerTempsLiturgique(dateISO, rite) {
  validateInputs(dateISO, rite);

  const normalizedRite = rite.toLowerCase().trim();
  const iso = normalizeISODate(dateISO);

  const temporalCandidates =
    normalizedRite === RITES.ORDINAIRE
      ? buildTemporalOrdinaire(iso)
      : buildTemporalExtraordinaire(iso);

  const sanctoralCandidates =
    normalizedRite === RITES.ORDINAIRE
      ? getSanctoralOrdinaireForDate(iso)
      : getSanctoralExtraordinaireForDate(iso);

  const allCandidates = [...temporalCandidates, ...sanctoralCandidates];

  if (allCandidates.length === 0) {
    return buildFallbackResult(iso, normalizedRite);
  }

  const resolution =
    normalizedRite === RITES.ORDINAIRE
      ? resolveOrdinairePrecedence(allCandidates, iso)
      : resolveExtraordinairePrecedence(allCandidates, iso);

  return buildPublicResult({
    dateISO: iso,
    rite: normalizedRite,
    winner: resolution.winner,
    omittedCelebrations: resolution.omittedCelebrations,
  });
}

function validateInputs(dateISO, rite) {
  if (typeof dateISO !== "string" || !dateISO.trim()) {
    throw new Error("dateISO invalide : une chaîne YYYY-MM-DD est attendue.");
  }

  if (typeof rite !== "string" || !rite.trim()) {
    throw new Error("rite invalide : 'ordinaire' ou 'extraordinaire' est attendu.");
  }

  const normalizedRite = rite.toLowerCase().trim();
  if (
    normalizedRite !== RITES.ORDINAIRE &&
    normalizedRite !== RITES.EXTRAORDINAIRE
  ) {
    throw new Error("rite invalide : 'ordinaire' ou 'extraordinaire' est attendu.");
  }

  normalizeISODate(dateISO);
}

function normalizeISODate(dateISO) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!match) {
    throw new Error("Format de date invalide : YYYY-MM-DD attendu.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw new Error("Date invalide.");
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildPublicResult({ dateISO, rite, winner, omittedCelebrations }) {
  const displayDate = formatDateFrenchShort(dateISO);

  const title =
    winner.display?.title ||
    winner.celebration?.label ||
    winner.label ||
    "Célébration à déterminer";

  const subtitle =
    winner.display?.subtitle ||
    buildSubtitle({
      dateLabel: displayDate,
      sanctoralLabel: winner.sanctoralLabel || "",
      colorLabel: winner.color?.label || "",
    });

  return {
    dateISO,
    rite,

    season: {
      id: winner.season?.id || "",
      label: winner.season?.label || "",
    },

    celebration: {
      id: winner.celebration?.id || winner.id || "",
      label: winner.celebration?.label || winner.label || "",
    },

    rank: {
      id: winner.rank?.id || "",
      label: winner.rank?.label || "",
    },

    color: {
      id: winner.color?.id || "",
      label: winner.color?.label || "",
    },

    privilegedSeason: Boolean(winner.privilegedSeason),

    sanctoral: {
      id: winner.sanctoral?.id || "",
      label: winner.sanctoral?.label || winner.sanctoralLabel || "",
    },

    display: {
      title,
      subtitle,
      date: displayDate,
    },

    metadata: {
      source: winner.source || "",
      priority:
        typeof winner.priority === "number" ? winner.priority : null,
      omittedCelebrations: (omittedCelebrations || []).map((item) => ({
        id: item.id || "",
        label: item.label || item.celebration?.label || "",
        source: item.source || "",
        priority:
          typeof item.priority === "number" ? item.priority : null,
      })),
    },
  };
}

function buildFallbackResult(dateISO, rite) {
  return {
    dateISO,
    rite,

    season: { id: "", label: "" },
    celebration: { id: "", label: "" },
    rank: { id: "", label: "" },
    color: { id: "", label: "" },
    privilegedSeason: false,
    sanctoral: { id: "", label: "" },

    display: {
      title: "",
      subtitle: formatDateFrenchShort(dateISO),
      date: formatDateFrenchShort(dateISO),
    },

    metadata: {
      source: "fallback",
      priority: null,
      omittedCelebrations: [],
    },
  };
}

function buildSubtitle({ dateLabel, sanctoralLabel, colorLabel }) {
  const parts = [dateLabel];

  if (sanctoralLabel) {
    parts.push(sanctoralLabel);
  }

  if (colorLabel) {
    parts.push(colorLabel);
  }

  return parts.filter(Boolean).join(" — ");
}

function formatDateFrenchShort(dateISO) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

// Optionnel : exposition globale si vous chargez ce fichier directement dans le navigateur
if (typeof window !== "undefined") {
  window.calculerTempsLiturgique = calculerTempsLiturgique;
}
