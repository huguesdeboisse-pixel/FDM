const APP_STORAGE_KEY = "fdm_app_state_v5";
const SHEET_STORAGE_PREFIX = "fdm_sheet_";

const RITE_CONFIG = {
  ordinaire: {
    label: "Rite ordinaire",
    sections: [
      { key: "entree", label: "Entrée", liturgyKeys: ["entree", "entrée", "ouverture"] },
      { key: "kyrie", label: "Kyrie", liturgyKeys: ["kyrie"], kyrialePart: true },
      { key: "gloria", label: "Gloria", liturgyKeys: ["gloria"], kyrialePart: true },
      { key: "psaume", label: "Psaume", liturgyKeys: ["psaume", "psalm"], collapsedByDefault: true },
      { key: "credo", label: "Credo", liturgyKeys: ["credo"], kyrialePart: true },
      { key: "offertoire", label: "Offertoire", liturgyKeys: ["offertoire", "offrande", "offertoire"] },
      { key: "sanctus", label: "Sanctus", liturgyKeys: ["sanctus"], kyrialePart: true },
      { key: "anamnese", label: "Anamnèse", liturgyKeys: ["anamnese", "anamnèse"], collapsedByDefault: true },
      { key: "amen", label: "Amen", liturgyKeys: ["amen"], collapsedByDefault: true },
      { key: "agnus", label: "Agnus Dei", liturgyKeys: ["agnus", "agnus dei"], kyrialePart: true },
      { key: "communion", label: "Communion", liturgyKeys: ["communion"] },
      { key: "envoi", label: "Envoi", liturgyKeys: ["envoi", "sortie"] },
    ],
  },
  extraordinaire: {
    label: "Rite extraordinaire",
    sections: [
      { key: "introit", label: "Introït", liturgyKeys: ["introit", "introït", "entree", "entrée"] },
      { key: "kyrie", label: "Kyrie", liturgyKeys: ["kyrie"], kyrialePart: true },
      { key: "gloria", label: "Gloria", liturgyKeys: ["gloria"], kyrialePart: true },
      { key: "credo", label: "Credo", liturgyKeys: ["credo"], kyrialePart: true },
      { key: "offertoire", label: "Offertoire", liturgyKeys: ["offertoire"] },
      { key: "sanctus", label: "Sanctus", liturgyKeys: ["sanctus"], kyrialePart: true },
      { key: "agnus", label: "Agnus Dei", liturgyKeys: ["agnus", "agnus dei"], kyrialePart: true },
      { key: "communion", label: "Communion", liturgyKeys: ["communion"] },
      { key: "antienne_mariale", label: "Antienne mariale", liturgyKeys: ["antienne mariale", "marial", "mariale"] },
    ],
  },
};

const state = {
  chants: [],
  chantsById: new Map(),
  carnetNames: [],
  loading: true,

  rite: "",
  date: "",
  liturgicalInfo: createEmptyLiturgicalInfo(),

  selectedCarnets: [],
  currentSectionKey: "",
  visitedSections: [],
  selectedBySection: {},
  visibleSuggestionsBySection: {},
  expandedCardsBySection: {},
  likes: {},
  favoritesPanelOpen: false,

  pendingRiteChoice: "",
  isAwaitingResumeChoice: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  injectResumeModal();
  restoreAppState();
  bindEvents();
  applyStaticUiAdjustments();
  await loadChants();
  initializeDefaultDateIfNeeded();
  updateLiturgicalInfo();
  renderAll();
});

function createEmptyLiturgicalInfo() {
  return {
    dateISO: "",
    rite: "",
    season: { id: "", label: "" },
    celebration: { id: "", label: "" },
    rank: { id: "", label: "" },
    color: { id: "", label: "" },
    privilegedSeason: false,
    sanctoral: { id: "", label: "" },
    display: {
      title: "",
      subtitle: "",
      date: "",
    },
    metadata: {
      source: "",
      priority: null,
      omittedCelebrations: [],
    },
  };
}

function cacheElements() {
  els.screen1 = document.getElementById("screen-1");
  els.workspace = document.getElementById("workspace");

  els.dateInput = document.getElementById("date-input");
  els.riteButtons = Array.from(document.querySelectorAll("[data-rite]"));
  els.liturgicalSummary = document.getElementById("liturgical-summary");

  els.carnetSearch = document.getElementById("carnet-search");
  els.selectedCarnets = document.getElementById("selected-carnets");
  els.carnetsResults = document.getElementById("carnets-results");
  els.clearCarnetsButton = document.getElementById("clear-carnets-button");

  els.leftSummaryDate = document.getElementById("left-summary-date");
  els.leftSummaryRite = document.getElementById("left-summary-rite");
  els.leftSummarySeason = document.getElementById("left-summary-season");
  els.leftSelectedCarnets = document.getElementById("left-selected-carnets");
  els.sectionsNav = document.getElementById("sections-nav");

  els.currentSectionTitle = document.getElementById("current-section-title");
  els.currentSectionSubtitle = document.getElementById("current-section-subtitle");
  els.currentSectionDate = document.getElementById("current-section-date");
  els.kyrialeBadge = document.getElementById("kyriale-badge");

  els.chantSearch = document.getElementById("chant-search");
  els.searchOverlay = document.getElementById("search-overlay");
  els.searchOverlayLabel = document.getElementById("search-overlay-label");
  els.searchResults = document.getElementById("search-results");
  els.closeSearchOverlay = document.getElementById("close-search-overlay");
  els.refreshButton = document.getElementById("refresh-button");
  els.chantsList = document.getElementById("chants-list");
  els.previousSectionButton = document.getElementById("previous-section-button");
  els.skipSectionButton = document.getElementById("skip-section-button");

  els.toggleFavoritesButton = document.getElementById("toggle-favorites-button");
  els.favoritesPanel = document.getElementById("favorites-panel");
  els.favoritesContent = document.getElementById("favorites-content");

  els.sheetTitle = document.getElementById("sheet-title");
  els.sheetMeta = document.getElementById("sheet-meta");
  els.sheetBody = document.getElementById("sheet-body");
  els.downloadButton = document.getElementById("download-button");
  els.reportIssueButton = document.getElementById("report-issue-button");
}

function applyStaticUiAdjustments() {
  if (els.toggleFavoritesButton) {
    els.toggleFavoritesButton.textContent = "Favoris";
    els.toggleFavoritesButton.setAttribute("aria-label", "Ouvrir les favoris");
  }

  if (els.previousSectionButton) {
    els.previousSectionButton.innerHTML = "← Précédent";
    els.previousSectionButton.setAttribute("aria-label", "Revenir à la section précédente");
  }

  if (els.skipSectionButton) {
    els.skipSectionButton.innerHTML = "Suivant →";
    els.skipSectionButton.setAttribute("aria-label", "Passer à la section suivante");
  }

  if (els.sheetTitle) {
    els.sheetTitle.style.textAlign = "center";
  }

  if (els.sheetMeta) {
    els.sheetMeta.style.textAlign = "center";
  }
}

function injectResumeModal() {
  const modal = document.createElement("div");
  modal.id = "resume-modal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,0.18)";
  modal.style.zIndex = "2000";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.innerHTML = `
    <div style="
      background: rgba(255,255,255,0.98);
      border: 1px solid #ddd6ca;
      border-radius: 18px;
      padding: 22px 20px;
      min-width: 280px;
      box-shadow: 0 14px 34px rgba(0,0,0,0.08);
      text-align: center;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    ">
      <div style="font-size: 1rem; font-weight: 600; margin-bottom: 16px;">Reprendre ?</div>
      <div style="display:flex; justify-content:center; gap:10px;">
        <button id="resume-yes" type="button" style="
          border: 1px solid #ddd6ca;
          background: #fff;
          border-radius: 12px;
          padding: 9px 16px;
          cursor: pointer;
        ">Oui</button>
        <button id="resume-no" type="button" style="
          border: 1px solid #ddd6ca;
          background: #fff;
          border-radius: 12px;
          padding: 9px 16px;
          cursor: pointer;
        ">Non</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  els.resumeModal = modal;
  els.resumeYes = document.getElementById("resume-yes");
  els.resumeNo = document.getElementById("resume-no");
}

function bindEvents() {
  if (els.dateInput) {
    els.dateInput.addEventListener("change", (event) => {
      state.date = event.target.value || "";
      updateLiturgicalInfo();
      recomputeAllSuggestions();
      saveAppState();
      saveCurrentSheetForRite();
      renderAll();
    });
  }

  els.riteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextRite = button.dataset.rite;
      handleRiteSelection(nextRite);
    });
  });

  if (els.carnetSearch) {
    els.carnetSearch.addEventListener("input", renderCarnets);
  }

  if (els.clearCarnetsButton) {
    els.clearCarnetsButton.addEventListener("click", () => {
      state.selectedCarnets = [];
      recomputeAllSuggestions();
      saveAppState();
      saveCurrentSheetForRite();
      renderAll();
    });
  }

  if (els.chantSearch) {
    els.chantSearch.addEventListener("input", renderSearchOverlay);
  }

  if (els.closeSearchOverlay) {
    els.closeSearchOverlay.addEventListener("click", () => {
      els.chantSearch.value = "";
      renderSearchOverlay();
    });
  }

  if (els.refreshButton) {
    els.refreshButton.addEventListener("click", () => {
      if (!state.currentSectionKey) return;
      appendSuggestionsForCurrentSection(3);
      saveCurrentSheetForRite();
      renderSectionWorkspace();
    });
  }

  if (els.previousSectionButton) {
    els.previousSectionButton.addEventListener("click", goToPreviousSection);
  }

  if (els.skipSectionButton) {
    els.skipSectionButton.addEventListener("click", goToNextSection);
  }

  if (els.toggleFavoritesButton) {
    els.toggleFavoritesButton.addEventListener("click", () => {
      state.favoritesPanelOpen = !state.favoritesPanelOpen;
      saveAppState();
      renderFavorites();
    });
  }

  if (els.downloadButton) {
    els.downloadButton.addEventListener("click", () => window.print());
  }

  if (els.reportIssueButton) {
    els.reportIssueButton.addEventListener("click", () => {
      alert("Fonction à brancher plus tard.");
    });
  }

  if (els.resumeYes) {
    els.resumeYes.addEventListener("click", () => {
      const rite = state.pendingRiteChoice;
      closeResumeModal();
      applySavedSheetForRite(rite);
    });
  }

  if (els.resumeNo) {
    els.resumeNo.addEventListener("click", () => {
      const rite = state.pendingRiteChoice;
      closeResumeModal();
      startNewSheetForRite(rite);
    });
  }

  document.addEventListener("click", (event) => {
    if (!els.searchOverlay || !els.chantSearch) return;
    const clickInsideSearch =
      els.searchOverlay.contains(event.target) || els.chantSearch.contains(event.target);

    if (!clickInsideSearch) {
      els.chantSearch.value = "";
      renderSearchOverlay();
    }
  });
}

async function loadChants() {
  try {
    const response = await fetch("./chants.json");
    if (!response.ok) throw new Error("Impossible de charger chants.json");

    const data = await response.json();
    const chants = Array.isArray(data) ? data : Array.isArray(data.chants) ? data.chants : [];

    state.chants = chants.map(normalizeChant).filter(Boolean);
    state.chantsById = new Map(state.chants.map((chant) => [chant.id, chant]));
    state.carnetNames = extractCarnetNames(state.chants);
    state.loading = false;
  } catch (error) {
    console.error(error);
    state.loading = false;
    alert("Erreur lors du chargement de chants.json.");
  }
}

function normalizeChant(raw, index) {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id || raw.titre_normalise || raw.titre || `chant_${index}`);
  const title = String(raw.titre || raw.title || "Sans titre").trim();

  const refrainLines = normalizeLinesArray(
    raw?.texte_normalise?.refrain ??
      raw?.texte?.refrain ??
      raw?.refrain ??
      []
  );

  const couplets = normalizeLinesArray(
    raw?.texte_normalise?.couplets ??
      raw?.texte?.couplets ??
      raw?.couplets ??
      []
  );

  const completeText =
    String(
      raw?.texte_normalise?.texte_complet ||
        raw?.texte?.texte_complet ||
        raw?.texte_complet ||
        [...refrainLines, ...couplets].join("\n\n")
    ).trim();

  const liturgie = raw.liturgie || {};
  const functions = normalizeStringArray(liturgie.fonctions);
  const seasons = normalizeStringArray(liturgie.temps_liturgiques);
  const rites = normalizeStringArray(liturgie.rites);
  const themes = normalizeStringArray(liturgie.themes);
  const fetes = normalizeStringArray(liturgie.fetes_specifiques);

  const qualityScore =
    Number(raw?.qualite?.score_confiance) ||
    Number(raw?.score_confiance) ||
    0;

  const annotationStatus = String(raw?.qualite_annotation?.statut_annotation || "").toLowerCase();

  const carnet = extractCarnetName(raw);

  return {
    ...raw,
    id,
    title,
    refrainLines,
    refrain: refrainLines.join("\n"),
    couplets,
    completeText,
    functions,
    seasons,
    rites,
    themes,
    fetes,
    qualityScore,
    annotationStatus,
    carnet,
  };
}

function normalizeLinesArray(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item || "").split("\n"))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[;,/|]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function extractCarnetName(raw) {
  if (typeof raw.carnet === "string" && raw.carnet.trim()) return raw.carnet.trim();
  if (typeof raw.collection === "string" && raw.collection.trim()) return raw.collection.trim();
  if (typeof raw.origine === "string" && raw.origine.trim()) return raw.origine.trim();
  if (typeof raw?.meta?.carnet === "string" && raw.meta.carnet.trim()) return raw.meta.carnet.trim();
  if (typeof raw?.metadata?.carnet === "string" && raw.metadata.carnet.trim()) return raw.metadata.carnet.trim();

  if (typeof raw.source === "string" && raw.source.trim()) return raw.source.trim();
  if (raw.source && typeof raw.source === "object") {
    if (typeof raw.source.pdf_nom === "string" && raw.source.pdf_nom.trim()) return raw.source.pdf_nom.trim();
    if (typeof raw.source.nom === "string" && raw.source.nom.trim()) return raw.source.nom.trim();
    if (typeof raw.source.file === "string" && raw.source.file.trim()) return raw.source.file.trim();
  }

  return "";
}

function extractCarnetNames(chants) {
  return Array.from(
    new Set(
      chants
        .map((chant) => chant.carnet)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "fr"))
    )
  );
}

function restoreAppState() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    state.date = parsed.date || "";
    state.selectedCarnets = Array.isArray(parsed.selectedCarnets) ? parsed.selectedCarnets : [];
    state.likes = parsed.likes || {};
    state.favoritesPanelOpen = Boolean(parsed.favoritesPanelOpen);

    state.rite = "";
    state.currentSectionKey = "";
    state.visitedSections = [];
    state.selectedBySection = {};
    state.visibleSuggestionsBySection = {};
    state.expandedCardsBySection = {};
  } catch (error) {
    console.warn("Impossible de restaurer l’état général :", error);
  }
}

function saveAppState() {
  const serializable = {
    date: state.date,
    selectedCarnets: state.selectedCarnets,
    likes: state.likes,
    favoritesPanelOpen: state.favoritesPanelOpen,
  };
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(serializable));
}

function getSheetStorageKey(rite) {
  return `${SHEET_STORAGE_PREFIX}${rite}`;
}

function getSavedSheetForRite(rite) {
  try {
    const raw = localStorage.getItem(getSheetStorageKey(rite));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCurrentSheetForRite() {
  if (!state.rite) return;

  const payload = {
    rite: state.rite,
    date: state.date,
    currentSectionKey: state.currentSectionKey,
    visitedSections: state.visitedSections,
    selectedBySection: state.selectedBySection,
    visibleSuggestionsBySection: state.visibleSuggestionsBySection,
    expandedCardsBySection: state.expandedCardsBySection,
  };

  localStorage.setItem(getSheetStorageKey(state.rite), JSON.stringify(payload));
}

function handleRiteSelection(nextRite) {
  const savedSheet = getSavedSheetForRite(nextRite);
  state.pendingRiteChoice = nextRite;

  if (savedSheet && hasUsableSavedSheet(savedSheet)) {
    openResumeModal();
    return;
  }

  startNewSheetForRite(nextRite);
}

function hasUsableSavedSheet(savedSheet) {
  if (!savedSheet) return false;
  const selectedBySection = savedSheet.selectedBySection || {};
  return Object.values(selectedBySection).some((arr) => Array.isArray(arr) && arr.length > 0);
}

function startNewSheetForRite(rite) {
  state.rite = rite;
  state.currentSectionKey = "";
  state.visitedSections = [];
  state.selectedBySection = {};
  state.visibleSuggestionsBySection = {};
  state.expandedCardsBySection = {};

  updateLiturgicalInfo();
  ensureSectionState();
  saveAppState();
  saveCurrentSheetForRite();
  renderAll();
}

function applySavedSheetForRite(rite) {
  const saved = getSavedSheetForRite(rite);

  state.rite = rite;

  if (!saved) {
    startNewSheetForRite(rite);
    return;
  }

  state.date = saved.date || state.date;
  if (els.dateInput) {
    els.dateInput.value = state.date || "";
  }

  state.currentSectionKey = saved.currentSectionKey || "";
  state.visitedSections = Array.isArray(saved.visitedSections) ? saved.visitedSections : [];
  state.selectedBySection = saved.selectedBySection || {};
  state.visibleSuggestionsBySection = saved.visibleSuggestionsBySection || {};
  state.expandedCardsBySection = saved.expandedCardsBySection || {};

  updateLiturgicalInfo();
  ensureSectionState();
  saveAppState();
  renderAll();
}

function openResumeModal() {
  state.isAwaitingResumeChoice = true;
  if (els.resumeModal) {
    els.resumeModal.style.display = "flex";
  }
}

function closeResumeModal() {
  state.isAwaitingResumeChoice = false;
  if (els.resumeModal) {
    els.resumeModal.style.display = "none";
  }
  state.pendingRiteChoice = "";
}

function initializeDefaultDateIfNeeded() {
  if (state.date) {
    if (els.dateInput) els.dateInput.value = state.date;
    return;
  }

  const nextSunday = getNextSundayISO();
  state.date = nextSunday;
  if (els.dateInput) els.dateInput.value = nextSunday;
  saveAppState();
}

function getNextSundayISO() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateLiturgicalInfo() {
  state.liturgicalInfo = computeLiturgicalInfo(state.date, state.rite);
}

function computeLiturgicalInfo(dateISO, rite) {
  if (!dateISO || !rite) {
    return createEmptyLiturgicalInfo();
  }

  if (typeof window.calculerTempsLiturgique === "function") {
    try {
      const rawResult = window.calculerTempsLiturgique(dateISO, rite);
      return normalizeLiturgicalResult(rawResult, dateISO, rite);
    } catch (error) {
      console.warn("Erreur dans calculerTempsLiturgique, utilisation d’un mode transitoire.", error);
    }
  }

  return createTransitionalLiturgicalInfo(dateISO, rite);
}

function normalizeLiturgicalResult(rawResult, dateISO, rite) {
  const base = createEmptyLiturgicalInfo();

  const result = rawResult && typeof rawResult === "object" ? rawResult : {};

  const seasonLabel = pickString(
    result?.season?.label,
    result?.season,
    ""
  );

  const celebrationLabel = pickString(
    result?.celebration?.label,
    result?.celebration,
    ""
  );

  const rankLabel = pickString(
    result?.rank?.label,
    result?.rank,
    ""
  );

  const colorLabel = pickString(
    result?.color?.label,
    result?.color,
    ""
  );

  const sanctoralLabel = pickString(
    result?.sanctoral?.label,
    result?.sanctoral,
    ""
  );

  const displayDate = pickString(
    result?.display?.date,
    result?.displayDate,
    formatDateShortFr(dateISO, false)
  );

  let displayTitle = pickString(
    result?.display?.title,
    result?.displayTitle,
    celebrationLabel,
    seasonLabel
  );

  let displaySubtitle = pickString(
    result?.display?.subtitle,
    result?.displaySubtitle,
    ""
  );

  if (!displaySubtitle) {
    const subtitleParts = [displayDate];
    if (sanctoralLabel && sanctoralLabel !== displayTitle) subtitleParts.push(sanctoralLabel);
    if (colorLabel) subtitleParts.push(colorLabel);
    displaySubtitle = subtitleParts.filter(Boolean).join(" — ");
  }

  if (!displayTitle && dateISO) {
    displayTitle = "Célébration à déterminer";
  }

  return {
    ...base,
    dateISO,
    rite,
    season: {
      id: pickString(result?.season?.id, ""),
      label: seasonLabel,
    },
    celebration: {
      id: pickString(result?.celebration?.id, ""),
      label: celebrationLabel,
    },
    rank: {
      id: pickString(result?.rank?.id, ""),
      label: rankLabel,
    },
    color: {
      id: pickString(result?.color?.id, ""),
      label: colorLabel,
    },
    privilegedSeason: Boolean(result?.privilegedSeason),
    sanctoral: {
      id: pickString(result?.sanctoral?.id, ""),
      label: sanctoralLabel,
    },
    display: {
      title: displayTitle,
      subtitle: displaySubtitle,
      date: displayDate,
    },
    metadata: {
      source: pickString(result?.metadata?.source, ""),
      priority:
        typeof result?.metadata?.priority === "number" ? result.metadata.priority : null,
      omittedCelebrations: Array.isArray(result?.metadata?.omittedCelebrations)
        ? result.metadata.omittedCelebrations
        : [],
    },
  };
}

function createTransitionalLiturgicalInfo(dateISO, rite) {
  const dateLabel = formatDateShortFr(dateISO, false);
  const riteLabel = RITE_CONFIG[rite]?.label || rite;

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
      subtitle: dateLabel ? `${dateLabel} — ${riteLabel}` : riteLabel,
      date: dateLabel,
    },
    metadata: {
      source: "transitional_stub",
      priority: null,
      omittedCelebrations: [],
    },
  };
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function ensureSectionState() {
  const sections = getCurrentSections();
  if (!sections.length) {
    state.currentSectionKey = "";
    return;
  }

  sections.forEach((section) => {
    if (!state.selectedBySection[section.key]) state.selectedBySection[section.key] = [];
    if (!state.visibleSuggestionsBySection[section.key]) state.visibleSuggestionsBySection[section.key] = [];
    if (!state.expandedCardsBySection[section.key]) state.expandedCardsBySection[section.key] = [];
  });

  const validKeys = new Set(sections.map((section) => section.key));

  Object.keys(state.selectedBySection).forEach((key) => {
    if (!validKeys.has(key)) delete state.selectedBySection[key];
  });
  Object.keys(state.visibleSuggestionsBySection).forEach((key) => {
    if (!validKeys.has(key)) delete state.visibleSuggestionsBySection[key];
  });
  Object.keys(state.expandedCardsBySection).forEach((key) => {
    if (!validKeys.has(key)) delete state.expandedCardsBySection[key];
  });

  state.visitedSections = state.visitedSections.filter((key) => validKeys.has(key));

  if (!state.currentSectionKey || !validKeys.has(state.currentSectionKey)) {
    state.currentSectionKey = sections[0].key;
  }

  markSectionVisited(state.currentSectionKey);

  sections.forEach((section) => {
    if (state.visibleSuggestionsBySection[section.key].length === 0) {
      state.visibleSuggestionsBySection[section.key] = getRankedSuggestions(section.key)
        .slice(0, 3)
        .map((chant) => chant.id);
    }
  });
}

function getCurrentSections() {
  if (!state.rite || !RITE_CONFIG[state.rite]) return [];
  return RITE_CONFIG[state.rite].sections;
}

function getSectionByKey(sectionKey) {
  return getCurrentSections().find((section) => section.key === sectionKey) || null;
}

function renderAll() {
  renderRiteButtons();
  renderLiturgicalSummary();
  renderCarnets();
  renderScreenMode();
  renderLeftColumn();
  renderSectionWorkspace();
  renderFavorites();
  renderSheet();
}

function renderScreenMode() {
  const hasRite = Boolean(state.rite);
  if (els.screen1) els.screen1.classList.toggle("hidden", hasRite);
  if (els.workspace) els.workspace.classList.toggle("active", hasRite);
}

function renderRiteButtons() {
  els.riteButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.rite === state.rite);
  });
}

function renderLiturgicalSummary() {
  if (!els.liturgicalSummary) return;
  els.liturgicalSummary.textContent = state.liturgicalInfo.display.title || "";
}

function renderCarnets() {
  if (!els.selectedCarnets || !els.carnetsResults) return;

  const query = (els.carnetSearch?.value || "").trim().toLowerCase();

  els.selectedCarnets.innerHTML = "";
  if (state.selectedCarnets.length === 0) {
    const note = document.createElement("div");
    note.className = "small-note";
    note.textContent = "Aucun carnet sélectionné : toute la base sera utilisée.";
    els.selectedCarnets.appendChild(note);
  } else {
    state.selectedCarnets.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "mini-chip";
      chip.innerHTML = `<span>${escapeHtml(name)}</span>`;
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => toggleCarnet(name));
      chip.appendChild(removeButton);
      els.selectedCarnets.appendChild(chip);
    });
  }

  els.carnetsResults.innerHTML = "";
  const filtered = state.carnetNames.filter((name) => name.toLowerCase().includes(query));

  filtered.slice(0, 12).forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "carnet-item";
    if (state.selectedCarnets.includes(name)) button.classList.add("active");

    const label = document.createElement("span");
    label.textContent = name;

    const stateLabel = document.createElement("span");
    stateLabel.textContent = state.selectedCarnets.includes(name) ? "Sélectionné" : "Ajouter";

    button.appendChild(label);
    button.appendChild(stateLabel);
    button.addEventListener("click", () => toggleCarnet(name));
    els.carnetsResults.appendChild(button);
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "small-note";
    empty.textContent = "Aucun carnet trouvé.";
    els.carnetsResults.appendChild(empty);
  }
}

function toggleCarnet(name) {
  if (state.selectedCarnets.includes(name)) {
    state.selectedCarnets = state.selectedCarnets.filter((item) => item !== name);
  } else {
    state.selectedCarnets = [...state.selectedCarnets, name];
  }

  recomputeAllSuggestions();
  saveAppState();
  saveCurrentSheetForRite();
  renderAll();
}

function recomputeAllSuggestions() {
  const sections = getCurrentSections();
  sections.forEach((section) => {
    const selectedIds = new Set(state.selectedBySection[section.key] || []);
    const suggestions = getRankedSuggestions(section.key)
      .filter((chant) => !selectedIds.has(chant.id))
      .slice(0, 3)
      .map((chant) => chant.id);

    state.visibleSuggestionsBySection[section.key] = suggestions;
  });
}

function renderLeftColumn() {
  if (!els.leftSummaryDate) return;

  els.leftSummaryDate.textContent = state.date ? `Date : ${formatDateShortFr(state.date)}` : "";
  els.leftSummaryRite.textContent = state.rite ? `Rite : ${RITE_CONFIG[state.rite]?.label || state.rite}` : "";
  els.leftSummarySeason.textContent = state.liturgicalInfo.display.title || "";

  els.leftSelectedCarnets.textContent =
    state.selectedCarnets.length === 0 ? "Toute la base" : state.selectedCarnets.join(" • ");

  renderSectionsNav();
}

function renderSectionsNav() {
  if (!els.sectionsNav) return;
  const sections = getCurrentSections();
  els.sectionsNav.innerHTML = "";

  const visibleVisited = sections.filter((section) => state.visitedSections.includes(section.key));

  visibleVisited.forEach((section) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    if (section.key === state.currentSectionKey) button.classList.add("current");

    const label = document.createElement("span");
    label.textContent = section.label;

    const stateLabel = document.createElement("span");
    stateLabel.textContent = (state.selectedBySection[section.key] || []).length > 0 ? "✓" : "";

    button.appendChild(label);
    button.appendChild(stateLabel);
    button.addEventListener("click", () => {
      state.currentSectionKey = section.key;
      markSectionVisited(section.key);
      saveCurrentSheetForRite();
      renderAll();
    });

    els.sectionsNav.appendChild(button);
  });
}

function renderSectionWorkspace() {
  if (!state.rite) return;
  const section = getSectionByKey(state.currentSectionKey);
  if (!section) return;

  if (els.currentSectionTitle) {
    els.currentSectionTitle.textContent = section.label;
  }

  if (els.currentSectionSubtitle) {
    els.currentSectionSubtitle.textContent = state.liturgicalInfo.display.title || "";
  }

  if (els.currentSectionDate) {
    els.currentSectionDate.textContent = state.liturgicalInfo.display.subtitle || "";
  }

  renderKyrialeBadge(section);
  renderSearchOverlay();
  renderCards();

  const currentIndex = getCurrentSections().findIndex((item) => item.key === section.key);
  if (els.previousSectionButton) els.previousSectionButton.disabled = currentIndex <= 0;
}

function renderKyrialeBadge(section) {
  if (!els.kyrialeBadge) return;

  if (!section.kyrialePart || !state.date) {
    els.kyrialeBadge.classList.add("hidden");
    els.kyrialeBadge.textContent = "";
    return;
  }

  const uniformKyriale = inferUniformKyrialeChoice();
  els.kyrialeBadge.classList.remove("hidden");
  els.kyrialeBadge.textContent = uniformKyriale
    ? `Kyriale : ${uniformKyriale}`
    : "Kyriale homogène par défaut";
}

function inferUniformKyrialeChoice() {
  const kyrialeSectionKeys = getCurrentSections()
    .filter((section) => section.kyrialePart)
    .map((section) => section.key);

  const selectedTitles = kyrialeSectionKeys
    .flatMap((sectionKey) => state.selectedBySection[sectionKey] || [])
    .map((id) => state.chantsById.get(id))
    .filter(Boolean)
    .map((chant) => chant.title);

  if (selectedTitles.length === 0) return "";

  const kyrialePattern = selectedTitles
    .map((title) => {
      const match = title.match(/\b([ivxlcdm]+|\d+)\b/i);
      return match ? match[1].toUpperCase() : "";
    })
    .filter(Boolean);

  if (!kyrialePattern.length) return "";
  const first = kyrialePattern[0];
  return kyrialePattern.every((value) => value === first) ? first : "";
}

function renderSearchOverlay() {
  if (!els.searchOverlay || !els.searchResults || !els.chantSearch) return;

  const section = getSectionByKey(state.currentSectionKey);
  const query = els.chantSearch.value.trim();

  if (!query || !section) {
    els.searchOverlay.classList.add("hidden");
    els.searchResults.innerHTML = "";
    return;
  }

  const results = searchChants(query, section.key).slice(0, 12);
  els.searchOverlay.classList.remove("hidden");
  if (els.searchOverlayLabel) {
    els.searchOverlayLabel.textContent = `${results.length} résultat(s)`;
  }

  els.searchResults.innerHTML = "";

  if (results.length === 0) {
    const empty = document.createElement("div");
    empty.className = "small-note";
    empty.style.padding = "12px 14px";
    empty.textContent = "Aucun chant trouvé.";
    els.searchResults.appendChild(empty);
    return;
  }

  results.forEach((chant) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result-button";
    button.innerHTML = `
      <div style="font-weight:700;">${escapeHtml(chant.title)}</div>
      <div style="color:#6c675f; margin-top:4px; font-size:0.85rem;">
        ${escapeHtml(chant.carnet || "Carnet non précisé")}
      </div>
    `;
    button.addEventListener("click", () => injectSearchResultIntoCurrentSection(chant.id));
    els.searchResults.appendChild(button);
  });
}

function renderCards() {
  if (!els.chantsList) return;
  const section = getSectionByKey(state.currentSectionKey);
  if (!section) return;

  const selectedIds = state.selectedBySection[section.key] || [];
  const visibleSuggestions = state.visibleSuggestionsBySection[section.key] || [];
  const orderedIds = uniqueArray([...selectedIds, ...visibleSuggestions]);

  const chants = orderedIds
    .map((id) => state.chantsById.get(id))
    .filter(Boolean);

  els.chantsList.innerHTML = "";

  if (chants.length === 0) {
    const empty = document.createElement("div");
    empty.className = "sheet-empty";
    empty.textContent = "Aucune suggestion pour cette section.";
    els.chantsList.appendChild(empty);
    return;
  }

  chants.forEach((chant) => {
    els.chantsList.appendChild(createChantCard(chant, section));
  });
}

function createChantCard(chant, section) {
  const selectedIds = state.selectedBySection[section.key] || [];
  const expandedIds = state.expandedCardsBySection[section.key] || [];
  const isSelected = selectedIds.includes(chant.id);
  const isExpanded = expandedIds.includes(chant.id);
  const isLiked = Boolean(state.likes[chant.id]);

  const card = document.createElement("article");
  card.className = `chant-card${isSelected ? " selected" : ""}`;

  const main = document.createElement("div");
  main.className = "chant-card-main";

  const contentButton = document.createElement("button");
  contentButton.type = "button";
  contentButton.className = "chant-main-button";
  contentButton.innerHTML = `
    <div class="chant-title">${escapeHtml(chant.title)}</div>
    <div class="chant-meta">${escapeHtml(buildChantMeta(chant, section))}</div>
  `;
  contentButton.addEventListener("click", () => toggleExpanded(section.key, chant.id));

  const heartButton = document.createElement("button");
  heartButton.type = "button";
  heartButton.className = `heart-button${isLiked ? " liked" : ""}`;
  heartButton.textContent = isLiked ? "♥" : "♡";
  heartButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLike(chant.id);
  });

  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.className = "toggle-select-button";
  selectButton.textContent = isSelected ? "Désélectionner" : "Sélectionner";
  selectButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSelection(section.key, chant.id);
  });

  main.appendChild(contentButton);
  main.appendChild(heartButton);
  main.appendChild(selectButton);
  card.appendChild(main);

  if (isExpanded) {
    const preview = document.createElement("div");
    preview.className = "chant-preview";
    preview.innerHTML = buildPreviewHtml(chant);
    card.appendChild(preview);
  }

  return card;
}

function buildPreviewHtml(chant) {
  const parts = [];

  if (chant.refrainLines.length > 0) {
    const refrainHtml = chant.refrainLines
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("");
    parts.push(`<div><strong>${refrainHtml}</strong></div>`);
  }

  if (chant.couplets.length > 0) {
    chant.couplets.slice(0, 6).forEach((couplet) => {
      parts.push(`<p>${escapeHtml(couplet).replaceAll("\n", "<br>")}</p>`);
    });
  } else if (chant.completeText) {
    parts.push(`<p>${escapeHtml(chant.completeText).replaceAll("\n", "<br>")}</p>`);
  } else {
    parts.push(`<p>Texte non disponible.</p>`);
  }

  return parts.join("");
}

function buildChantMeta(chant, section) {
  const meta = [];
  if (chant.carnet) meta.push(chant.carnet);
  if (section.kyrialePart) meta.push("Pièce de messe");
  if (chant.qualityScore) meta.push(`Confiance ${Math.round(chant.qualityScore)}`);
  return meta.join(" — ") || "Chant disponible";
}

function toggleExpanded(sectionKey, chantId) {
  const list = new Set(state.expandedCardsBySection[sectionKey] || []);
  if (list.has(chantId)) list.delete(chantId);
  else list.add(chantId);
  state.expandedCardsBySection[sectionKey] = Array.from(list);
  saveCurrentSheetForRite();
  renderSectionWorkspace();
}

function toggleLike(chantId) {
  state.likes[chantId] = !state.likes[chantId];
  recomputeAllSuggestions();
  saveAppState();
  saveCurrentSheetForRite();
  renderAll();
}

function toggleSelection(sectionKey, chantId) {
  const list = new Set(state.selectedBySection[sectionKey] || []);
  const wasSelected = list.has(chantId);

  if (wasSelected) list.delete(chantId);
  else list.add(chantId);

  state.selectedBySection[sectionKey] = Array.from(list);

  const visible = new Set(state.visibleSuggestionsBySection[sectionKey] || []);
  visible.add(chantId);
  state.visibleSuggestionsBySection[sectionKey] = Array.from(visible);

  if (!wasSelected) goToNextSection(true);

  saveCurrentSheetForRite();
  renderAll();
}

function injectSearchResultIntoCurrentSection(chantId) {
  const sectionKey = state.currentSectionKey;
  if (!sectionKey) return;

  const currentSuggestions = state.visibleSuggestionsBySection[sectionKey] || [];
  state.visibleSuggestionsBySection[sectionKey] = uniqueArray([chantId, ...currentSuggestions]);

  const selectedSet = new Set(state.selectedBySection[sectionKey] || []);
  selectedSet.add(chantId);
  state.selectedBySection[sectionKey] = Array.from(selectedSet);

  if (els.chantSearch) {
    els.chantSearch.value = "";
  }

  markSectionVisited(sectionKey);
  goToNextSection(true);
  saveCurrentSheetForRite();
  renderAll();
}

function appendSuggestionsForCurrentSection(count = 3) {
  const sectionKey = state.currentSectionKey;
  if (!sectionKey) return;

  const alreadyVisible = new Set([
    ...(state.visibleSuggestionsBySection[sectionKey] || []),
    ...(state.selectedBySection[sectionKey] || []),
  ]);

  const additional = getRankedSuggestions(sectionKey)
    .filter((chant) => !alreadyVisible.has(chant.id))
    .slice(0, count)
    .map((chant) => chant.id);

  state.visibleSuggestionsBySection[sectionKey] = [
    ...(state.visibleSuggestionsBySection[sectionKey] || []),
    ...additional,
  ];
}

function searchChants(query, sectionKey) {
  const normalizedQuery = normalizeText(query);
  const section = getSectionByKey(sectionKey);
  const base = getFilteredChants();

  return base
    .map((chant) => {
      let score = 0;
      const title = normalizeText(chant.title);
      const refrain = normalizeText(chant.refrain);
      const text = normalizeText(chant.completeText);

      if (title.includes(normalizedQuery)) score += 120;
      if (refrain.includes(normalizedQuery)) score += 80;
      if (text.includes(normalizedQuery)) score += 50;

      normalizedQuery.split(/\s+/).filter(Boolean).forEach((word) => {
        if (title.includes(word)) score += 25;
        if (refrain.includes(word)) score += 12;
        if (text.includes(word)) score += 8;
      });

      if (section && chantMatchesSection(chant, section)) score += 20;
      if (chantMatchesSeason(chant, state.liturgicalInfo.season.label)) score += 10;
      if (chantMatchesRite(chant, state.rite)) score += 8;

      return { chant, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chant.title.localeCompare(b.chant.title, "fr"))
    .map((item) => item.chant);
}

function getRankedSuggestions(sectionKey) {
  const section = getSectionByKey(sectionKey);
  if (!section) return [];

  return getFilteredChants()
    .map((chant) => {
      let score = 0;
      if (chantMatchesSection(chant, section)) score += 140;
      if (chantMatchesSeason(chant, state.liturgicalInfo.season.label)) score += 32;
      if (chantMatchesRite(chant, state.rite)) score += 18;
      if (state.likes[chant.id]) score += 50;
      if (chant.annotationStatus.includes("annote_auto")) score += 8;
      score += Math.min(chant.qualityScore, 100) * 0.18;
      score += Math.random() * 3;
      return { chant, score };
    })
    .sort((a, b) => b.score - a.score || a.chant.title.localeCompare(b.chant.title, "fr"))
    .map((item) => item.chant);
}

function getFilteredChants() {
  let chants = state.chants;
  if (state.selectedCarnets.length > 0) {
    chants = chants.filter((chant) => state.selectedCarnets.includes(chant.carnet));
  }
  return chants;
}

function chantMatchesSection(chant, section) {
  if (!section) return false;

  const searchable = [
    ...chant.functions,
    ...chant.themes,
    ...chant.fetes,
    normalizeText(chant.title),
    normalizeText(chant.completeText),
  ].join(" ");

  return section.liturgyKeys.some((key) => searchable.includes(normalizeText(key)));
}

function chantMatchesSeason(chant, seasonLabel) {
  if (!seasonLabel) return true;
  if (chant.seasons.length === 0) return true;

  const normalizedSeason = normalizeText(seasonLabel);

  return chant.seasons.some((season) => {
    const s = normalizeText(season);
    return (
      s.includes(normalizedSeason) ||
      normalizedSeason.includes(s) ||
      s.includes("t_tous_temps")
    );
  });
}

function chantMatchesRite(chant, rite) {
  if (!rite) return true;
  if (chant.rites.length === 0) return true;
  return chant.rites.some((item) => normalizeText(item).includes(normalizeText(rite)));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function goToPreviousSection() {
  const sections = getCurrentSections();
  const index = sections.findIndex((section) => section.key === state.currentSectionKey);
  if (index <= 0) return;

  state.currentSectionKey = sections[index - 1].key;
  markSectionVisited(state.currentSectionKey);
  saveCurrentSheetForRite();
  renderAll();
}

function goToNextSection(fromAutoProgress = false) {
  const sections = getCurrentSections();
  const index = sections.findIndex((section) => section.key === state.currentSectionKey);
  if (index < 0) return;

  const next = sections[index + 1];
  if (!next) {
    if (!fromAutoProgress) {
      saveCurrentSheetForRite();
      renderAll();
    }
    return;
  }

  state.currentSectionKey = next.key;
  markSectionVisited(next.key);
  saveCurrentSheetForRite();
  renderAll();
}

function markSectionVisited(sectionKey) {
  if (!sectionKey) return;
  if (!state.visitedSections.includes(sectionKey)) {
    state.visitedSections.push(sectionKey);
  }
}

function renderFavorites() {
  if (!els.favoritesPanel || !els.favoritesContent) return;
  els.favoritesPanel.classList.toggle("hidden", !state.favoritesPanelOpen);

  const likedIds = Object.entries(state.likes)
    .filter(([, liked]) => liked)
    .map(([id]) => id);

  if (likedIds.length === 0) {
    els.favoritesContent.innerHTML = "Aucun favori pour l’instant.";
    return;
  }

  const grouped = {};
  getCurrentSections().forEach((section) => {
    grouped[section.key] = [];
  });

  likedIds.forEach((id) => {
    const chant = state.chantsById.get(id);
    if (!chant) return;

    const matchingSection = getCurrentSections().find((section) =>
      chantMatchesSection(chant, section)
    );

    const key = matchingSection ? matchingSection.key : "autres";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(chant);
  });

  const fragment = document.createDocumentFragment();

  Object.entries(grouped).forEach(([sectionKey, chants]) => {
    if (!chants.length) return;

    const block = document.createElement("div");
    block.className = "favorite-group";

    const title = document.createElement("div");
    title.className = "favorite-group-title";
    title.textContent =
      getSectionByKey(sectionKey)?.label || (sectionKey === "autres" ? "Autres" : sectionKey);

    const list = document.createElement("div");
    chants
      .sort((a, b) => a.title.localeCompare(b.title, "fr"))
      .forEach((chant) => {
        const item = document.createElement("div");
        item.className = "favorite-item";
        item.textContent = chant.title;
        list.appendChild(item);
      });

    block.appendChild(title);
    block.appendChild(list);
    fragment.appendChild(block);
  });

  els.favoritesContent.innerHTML = "";
  els.favoritesContent.appendChild(fragment);
}

function renderSheet() {
  if (!els.sheetBody || !els.sheetMeta) return;

  if (els.sheetTitle) {
    els.sheetTitle.textContent = state.liturgicalInfo.display.title || "Feuille de messe";
    els.sheetTitle.style.textAlign = "center";
  }

  els.sheetMeta.textContent = state.liturgicalInfo.display.subtitle || "";
  els.sheetMeta.style.textAlign = "center";
  els.sheetBody.innerHTML = "";

  const sections = getCurrentSections();
  const hasAnySelection = sections.some(
    (section) => (state.selectedBySection[section.key] || []).length > 0
  );

  if (!hasAnySelection) {
    const empty = document.createElement("div");
    empty.className = "sheet-empty";
    empty.textContent = "Aucun chant sélectionné pour l’instant.";
    els.sheetBody.appendChild(empty);
    return;
  }

  sections.forEach((section) => {
    const selectedIds = state.selectedBySection[section.key] || [];
    if (selectedIds.length === 0) return;

    const block = document.createElement("section");
    block.className = "sheet-section";

    const title = document.createElement("h3");
    title.textContent = section.label;
    block.appendChild(title);

    selectedIds.forEach((id, index) => {
      const chant = state.chantsById.get(id);
      if (!chant) return;

      const row = document.createElement("div");
      row.className = "sheet-item";

      const name = document.createElement("div");
      name.textContent = chant.title;

      const controls = document.createElement("div");
      controls.className = "sheet-item-controls";

      const up = document.createElement("button");
      up.type = "button";
      up.className = "icon-button";
      up.textContent = "↑";
      up.disabled = index === 0;
      up.addEventListener("click", () => moveSelectedChant(section.key, index, -1));

      const down = document.createElement("button");
      down.type = "button";
      down.className = "icon-button";
      down.textContent = "↓";
      down.disabled = index === selectedIds.length - 1;
      down.addEventListener("click", () => moveSelectedChant(section.key, index, 1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "×";
      remove.addEventListener("click", () => toggleSelection(section.key, id));

      controls.appendChild(up);
      controls.appendChild(down);
      controls.appendChild(remove);

      row.appendChild(name);
      row.appendChild(controls);
      block.appendChild(row);
    });

    els.sheetBody.appendChild(block);
  });
}

function moveSelectedChant(sectionKey, index, delta) {
  const list = [...(state.selectedBySection[sectionKey] || [])];
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= list.length) return;

  [list[index], list[newIndex]] = [list[newIndex], list[index]];
  state.selectedBySection[sectionKey] = list;
  saveCurrentSheetForRite();
  renderSheet();
}

function formatDateShortFr(isoDate, withWeekday = true) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("fr-FR", withWeekday
    ? { weekday: "long", day: "numeric", month: "long" }
    : { day: "numeric", month: "long" }
  );
}

function uniqueArray(array) {
  return Array.from(new Set(array));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
