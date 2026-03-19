/* =========================================================
   FEUILLE DE MESSE - APP.JS
   Version adaptée au rendu A4 allégé
   ========================================================= */

const STORAGE_KEY_GLOBAL = "fdm_global_v7";
const STORAGE_KEY_RITE_PREFIX = "fdm_rite_v7_";

const SECTIONS = {
  ordinaire: [
    "Entrée",
    "Kyrie",
    "Gloria",
    "Psaume",
    "Credo",
    "Offertoire",
    "Sanctus",
    "Anamnèse",
    "Amen",
    "Agnus Dei",
    "Communion",
    "Envoi"
  ],
  extraordinaire: [
    "Introït",
    "Kyrie",
    "Gloria",
    "Credo",
    "Offertoire",
    "Sanctus",
    "Agnus Dei",
    "Communion",
    "Antienne mariale"
  ]
};

const FUNCTION_ALIASES = {
  "Entrée": ["entree", "entrée", "chant d'entrée", "ouverture", "procession d'entrée"],
  "Introït": ["introit", "introït"],
  "Kyrie": ["kyrie"],
  "Gloria": ["gloria"],
  "Psaume": ["psaume"],
  "Credo": ["credo", "crédo"],
  "Offertoire": ["offertoire", "préparation des dons", "preparation des dons"],
  "Sanctus": ["sanctus"],
  "Anamnèse": ["anamnese", "anamnèse"],
  "Amen": ["amen"],
  "Agnus Dei": ["agnus dei", "agnus"],
  "Communion": ["communion"],
  "Envoi": ["envoi", "sortie", "chant final"],
  "Antienne mariale": ["antienne mariale", "salve regina", "alma redemptoris", "ave regina", "regina caeli"]
};

const state = {
  chants: [],
  chantsById: new Map(),

  rite: "",
  date: "",
  liturgicalInfo: null,

  currentSectionIndex: 0,
  selectedBySection: {},
  likes: {},
  visitedSections: [],

  currentSuggestions: [],
  currentSearch: "",

  selectedCarnets: [],
  availableCarnets: [],
  carnetSearch: "",

  suggestionOffsets: {},
  hiddenCoupletsBySection: {},

  parishName: "",

  drag: {
    chantId: null,
    fromSection: null
  },

  ui: {
    favoritesOpen: false
  }
};

/* ===============================
   OUTILS
================================ */

function byId(id) {
  return document.getElementById(id);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function safeText(value) {
  return value == null ? "" : String(value);
}

function normalize(value) {
  return safeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function uniqueArray(arr) {
  return [...new Set((Array.isArray(arr) ? arr : []).filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISODate(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeText(isoDate))) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDateFr(isoDate) {
  const date = fromISODate(isoDate);
  return date ? date.toLocaleDateString("fr-FR") : "Non renseignée";
}

function formatDateFrLong(isoDate) {
  const date = fromISODate(isoDate);
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getNextSundayISO() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const day = date.getDay();
  const offset = day === 0 ? 7 : 7 - day;
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

function getSectionsForCurrentRite() {
  return SECTIONS[state.rite] || [];
}

function getCurrentSection() {
  return getSectionsForCurrentRite()[state.currentSectionIndex] || "";
}

function isLiked(chantId) {
  return Boolean(state.likes[chantId]);
}

function isSelectedInSection(chantId, section) {
  const list = state.selectedBySection[section];
  return Array.isArray(list) && list.includes(chantId);
}

function hasSelectionsInSection(section) {
  const list = state.selectedBySection[section];
  return Array.isArray(list) && list.length > 0;
}

function getChantById(id) {
  return state.chantsById.get(id) || null;
}

function ensureSectionState(section) {
  if (!section) return;
  if (!Array.isArray(state.selectedBySection[section])) {
    state.selectedBySection[section] = [];
  }
  if (typeof state.suggestionOffsets[section] !== "number") {
    state.suggestionOffsets[section] = 0;
  }
  if (!state.hiddenCoupletsBySection[section] || typeof state.hiddenCoupletsBySection[section] !== "object") {
    state.hiddenCoupletsBySection[section] = {};
  }
}

function getHiddenCouplets(section, chantId) {
  ensureSectionState(section);
  const raw = state.hiddenCoupletsBySection[section]?.[chantId];
  return Array.isArray(raw) ? raw : [];
}

function setHiddenCouplets(section, chantId, indexes) {
  ensureSectionState(section);
  state.hiddenCoupletsBySection[section][chantId] = uniqueArray(indexes).sort((a, b) => a - b);
}

function getRefrainText(chant) {
  return safeText(chant?.texte_normalise?.refrain).trim();
}

function getCoupletsArray(chant) {
  return Array.isArray(chant?.texte_normalise?.couplets)
    ? chant.texte_normalise.couplets.map((c) => safeText(c).trim()).filter(Boolean)
    : [];
}

function getFullText(chant) {
  return safeText(chant?.texte_normalise?.texte_complet).trim();
}

/* ===============================
   STORAGE
================================ */

function loadJsonFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Lecture localStorage impossible :", key, error);
    return fallback;
  }
}

function saveJsonToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Écriture localStorage impossible :", key, error);
  }
}

function loadGlobalState() {
  return loadJsonFromStorage(STORAGE_KEY_GLOBAL, {
    likes: {},
    selectedCarnets: [],
    lastDate: "",
    lastRite: "",
    parishName: ""
  });
}

function saveGlobalState() {
  saveJsonToStorage(STORAGE_KEY_GLOBAL, {
    likes: state.likes,
    selectedCarnets: state.selectedCarnets,
    lastDate: state.date,
    lastRite: state.rite,
    parishName: state.parishName
  });
}

function loadRiteState(rite) {
  return loadJsonFromStorage(`${STORAGE_KEY_RITE_PREFIX}${rite}`, null);
}

function saveRiteState(rite) {
  if (!rite) return;
  saveJsonToStorage(`${STORAGE_KEY_RITE_PREFIX}${rite}`, {
    date: state.date,
    currentSectionIndex: state.currentSectionIndex,
    selectedBySection: state.selectedBySection,
    visitedSections: state.visitedSections,
    suggestionOffsets: state.suggestionOffsets,
    hiddenCoupletsBySection: state.hiddenCoupletsBySection,
    parishName: state.parishName
  });
}

function restoreLocalState() {
  const globalState = loadGlobalState();
  state.likes = globalState?.likes || {};
  state.selectedCarnets = globalState?.selectedCarnets || [];
  state.date = globalState?.lastDate || "";
  state.rite = globalState?.lastRite || "";
  state.parishName = globalState?.parishName || "";
}

/* ===============================
   CHARGEMENT DES CHANTS
================================ */

async function loadChants() {
  try {
    const response = await fetch("./chants.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.chants = Array.isArray(data) ? data.filter(Boolean) : [];
    state.chantsById.clear();

    for (const chant of state.chants) {
      if (chant && chant.id != null) {
        state.chantsById.set(chant.id, chant);
      }
    }

    state.availableCarnets = extractAvailableCarnets(state.chants);
  } catch (error) {
    console.error("Impossible de charger chants.json :", error);
    state.chants = [];
    state.chantsById.clear();
    state.availableCarnets = [];
  }
}

function extractAvailableCarnets(chants) {
  const values = [];

  for (const chant of chants) {
    const sources = [
      chant?.carnet,
      chant?.source,
      chant?.source_pdf,
      chant?.metadata?.carnet,
      chant?.metadata?.source
    ];

    for (const source of sources) {
      if (source && typeof source === "string") {
        values.push(source);
      }
    }
  }

  return uniqueArray(values).sort((a, b) => a.localeCompare(b, "fr"));
}

/* ===============================
   CALCUL LITURGIQUE
================================ */

function updateLiturgicalInfo() {
  if (!state.rite) {
    state.liturgicalInfo = null;
    return;
  }

  const effectiveDate = state.date || getNextSundayISO();

  if (typeof window.calculerTempsLiturgique !== "function") {
    console.log("calculerTempsLiturgique indisponible");
    state.liturgicalInfo = {
      display: { title: "", subtitle: "" },
      season: {}
    };
    return;
  }

  try {
    state.liturgicalInfo = window.calculerTempsLiturgique(effectiveDate, state.rite);
    console.log("liturgicalInfo =", state.liturgicalInfo);
  } catch (error) {
    console.error("Erreur de calcul liturgique :", error);
    state.liturgicalInfo = {
      display: { title: "", subtitle: "" },
      season: {}
    };
  }
}

/* ===============================
   INITIALISATION
================================ */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    restoreLocalState();

    if (!state.date) {
      state.date = getNextSundayISO();
    }

    syncDateInput();
    syncParishInput();

    await loadChants();
    bindEvents();

    if (state.rite && SECTIONS[state.rite]) {
      const saved = loadRiteState(state.rite);
      if (saved) {
        state.date = saved.date || state.date || getNextSundayISO();
        state.currentSectionIndex = clamp(saved.currentSectionIndex || 0, 0, getSectionsForCurrentRite().length - 1);
        state.selectedBySection = saved.selectedBySection || {};
        state.visitedSections = saved.visitedSections || [];
        state.suggestionOffsets = saved.suggestionOffsets || {};
        state.hiddenCoupletsBySection = saved.hiddenCoupletsBySection || {};
        state.parishName = saved.parishName || state.parishName || "";
      } else {
        resetRiteState(state.rite);
      }

      syncDateInput();
      syncParishInput();
      updateLiturgicalInfo();
      render();
      showScreen(2);
    } else {
      render();
      showScreen(1);
    }
  } catch (error) {
    console.error("Erreur d'initialisation :", error);
    render();
    showScreen(1);
  }
}

/* ===============================
   ÉVÉNEMENTS
================================ */

function bindEvents() {
  const dateInput = byId("dateInput");
  if (dateInput) {
    dateInput.addEventListener("change", onDateChange);
    dateInput.addEventListener("input", onDateChange);
    dateInput.addEventListener("click", (event) => {
      event.stopPropagation();
      try {
        if (typeof dateInput.showPicker === "function") {
          dateInput.showPicker();
        }
      } catch (error) {}
    });
  }

  bindDateCard();

  qsa("[data-rite]").forEach((button) => {
    button.addEventListener("click", () => onRiteSelect(button.dataset.rite));
  });

  const parishInput =
    byId("parishInput") ||
    byId("paroisseInput") ||
    byId("paroisse") ||
    byId("nomParoisse");

  if (parishInput) {
    parishInput.addEventListener("input", (event) => {
      state.parishName = safeText(event.target.value).trim();
      saveCurrentRiteState();
      saveGlobalState();
      renderSheet();
    });
  }

  const searchCarnet = byId("searchCarnet");
  if (searchCarnet) {
    searchCarnet.addEventListener("input", (event) => {
      state.carnetSearch = safeText(event.target.value);
      renderCarnetsList();
    });
  }

  const selectAllCarnets = byId("selectAllCarnets");
  if (selectAllCarnets) {
    selectAllCarnets.addEventListener("click", () => {
      state.selectedCarnets = [...state.availableCarnets];
      saveGlobalState();
      renderCarnetsList();
      renderSuggestions();
    });
  }

  const clearCarnetsSelection = byId("clearCarnetsSelection");
  if (clearCarnetsSelection) {
    clearCarnetsSelection.addEventListener("click", () => {
      state.selectedCarnets = [];
      saveGlobalState();
      renderCarnetsList();
      renderSuggestions();
    });
  }

  const prevButton = byId("prev");
  if (prevButton) {
    prevButton.addEventListener("click", prevSection);
  }

  const nextButton = byId("next");
  if (nextButton) {
    nextButton.addEventListener("click", nextSection);
  }

  const backButton = byId("backToSetup");
  if (backButton) {
    backButton.addEventListener("click", () => {
      saveCurrentRiteState();
      showScreen(1);
    });
  }

  const favoritesButton = byId("favoritesButton");
  if (favoritesButton) {
    favoritesButton.addEventListener("click", openFavoritesModal);
  }

  const chantSearch = byId("chantSearch");
  if (chantSearch) {
    chantSearch.addEventListener("input", (event) => {
      state.currentSearch = event.target.value || "";
      resetSuggestionOffset(getCurrentSection());
      renderSuggestions();
    });
  }

  const refreshButton =
    byId("refreshSuggestions") ||
    byId("refreshButton") ||
    byId("refreshChants") ||
    byId("refresh");
  if (refreshButton) {
    refreshButton.addEventListener("click", refreshSuggestions);
  }

  const downloadButton = byId("download");
  if (downloadButton) {
    downloadButton.addEventListener("click", () => window.print());
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.ui.favoritesOpen) {
      closeFavoritesModal();
    }
  });
}

function bindDateCard() {
  const card = byId("dateCard");
  const input = byId("dateInput");
  if (!card || !input) return;

  const openPicker = () => {
    try {
      input.focus();
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.click();
      }
    } catch (error) {
      input.focus();
    }
  };

  card.addEventListener("click", (event) => {
    event.preventDefault();
    openPicker();
  });

  card.addEventListener("pointerdown", () => {
    openPicker();
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  });
}

/* ===============================
   NAVIGATION D'ÉCRAN
================================ */

function showScreen(screenNumber) {
  const screen1 = byId("screen1");
  const screen2 = byId("screen2");

  if (screen1) {
    screen1.classList.toggle("active", screenNumber === 1);
  }

  if (screen2) {
    screen2.classList.toggle("active", screenNumber === 2);
  }
}

/* ===============================
   RITE / REPRISE
================================ */

function hasResumeForRite(rite) {
  const saved = loadRiteState(rite);
  if (!saved) return false;

  const hasFilledSection = Object.values(saved.selectedBySection || {}).some(
    (list) => Array.isArray(list) && list.length > 0
  );

  return Boolean(
    saved.date ||
    hasFilledSection ||
    (typeof saved.currentSectionIndex === "number" && saved.currentSectionIndex > 0)
  );
}

function onRiteSelect(rite) {
  if (!SECTIONS[rite]) return;

  state.rite = rite;
  state.currentSearch = "";
  closeFavoritesModal();

  if (hasResumeForRite(rite)) {
    const reprendre = window.confirm("Un brouillon local existe pour ce rite. Reprendre ?");
    if (reprendre) {
      restoreRiteState(rite);
    } else {
      resetRiteState(rite);
    }
  } else {
    resetRiteState(rite);
  }

  if (!state.date) {
    state.date = getNextSundayISO();
  }

  syncDateInput();
  syncParishInput();
  updateLiturgicalInfo();
  saveCurrentRiteState();
  saveGlobalState();
  render();
  showScreen(2);
}

function restoreRiteState(rite) {
  const saved = loadRiteState(rite);

  state.date = saved?.date || state.date || getNextSundayISO();
  state.currentSectionIndex = clamp(saved?.currentSectionIndex || 0, 0, SECTIONS[rite].length - 1);
  state.selectedBySection = saved?.selectedBySection || {};
  state.visitedSections = saved?.visitedSections || [];
  state.suggestionOffsets = saved?.suggestionOffsets || {};
  state.hiddenCoupletsBySection = saved?.hiddenCoupletsBySection || {};
  state.parishName = saved?.parishName || state.parishName || "";

  for (const section of SECTIONS[rite]) {
    ensureSectionState(section);
  }
}

function resetRiteState(rite) {
  state.currentSectionIndex = 0;
  state.selectedBySection = {};
  state.visitedSections = [];
  state.suggestionOffsets = {};
  state.hiddenCoupletsBySection = {};

  for (const section of SECTIONS[rite]) {
    state.selectedBySection[section] = [];
    state.suggestionOffsets[section] = 0;
    state.hiddenCoupletsBySection[section] = {};
  }

  state.date = state.date || getNextSundayISO();
}

function saveCurrentRiteState() {
  if (!state.rite) return;
  saveRiteState(state.rite);
}

/* ===============================
   DATE / PAROISSE
================================ */

function syncDateInput() {
  const input = byId("dateInput");
  if (input) {
    input.value = state.date || "";
  }
}

function syncParishInput() {
  const parishInput =
    byId("parishInput") ||
    byId("paroisseInput") ||
    byId("paroisse") ||
    byId("nomParoisse");

  if (parishInput) {
    parishInput.value = state.parishName || "";
  }
}

function onDateChange(event) {
  state.date = event?.target?.value || "";

  if (!state.date) {
    state.date = getNextSundayISO();
    syncDateInput();
  }

  updateLiturgicalInfo();
  saveCurrentRiteState();
  saveGlobalState();
  renderSummary();
  renderSectionTitle();
  renderSuggestions();
  renderSheet();
}

/* ===============================
   NAVIGATION ENTRE SECTIONS
================================ */

function markCurrentSectionVisited() {
  const section = getCurrentSection();
  if (!section) return;
  state.visitedSections = uniqueArray([...state.visitedSections, section]);
}

function prevSection() {
  if (!state.rite) return;
  state.currentSectionIndex = clamp(state.currentSectionIndex - 1, 0, getSectionsForCurrentRite().length - 1);
  markCurrentSectionVisited();
  saveCurrentRiteState();
  render();
}

function nextSection() {
  if (!state.rite) return;
  state.currentSectionIndex = clamp(state.currentSectionIndex + 1, 0, getSectionsForCurrentRite().length - 1);
  markCurrentSectionVisited();
  saveCurrentRiteState();
  render();
}

function goToSection(index) {
  if (!state.rite) return;
  state.currentSectionIndex = clamp(index, 0, getSectionsForCurrentRite().length - 1);
  saveCurrentRiteState();
  render();
}

/* ===============================
   CARNETS
================================ */

function toggleCarnetSelection(carnetName) {
  if (!carnetName) return;

  if (state.selectedCarnets.includes(carnetName)) {
    state.selectedCarnets = state.selectedCarnets.filter((name) => name !== carnetName);
  } else {
    state.selectedCarnets = uniqueArray([...state.selectedCarnets, carnetName]);
  }

  saveGlobalState();
  renderCarnetsList();
  renderSuggestions();
}

function getFilteredCarnetsList() {
  const query = normalize(state.carnetSearch);
  if (!query) return state.availableCarnets;

  return state.availableCarnets.filter((name) => normalize(name).includes(query));
}

function renderCarnetsList() {
  const container = byId("carnetsList");
  if (!container) return;

  container.innerHTML = "";

  const carnets = getFilteredCarnetsList();

  if (!carnets.length) {
    const empty = document.createElement("div");
    empty.className = "carnets-empty";
    empty.textContent = "Aucun carnet trouvé.";
    container.appendChild(empty);
    return;
  }

  for (const carnet of carnets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "carnet-item";

    if (state.selectedCarnets.includes(carnet)) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <span class="carnet-item-name">${escapeHtml(carnet)}</span>
      <span class="carnet-item-check">${state.selectedCarnets.includes(carnet) ? "✓" : ""}</span>
    `;

    button.addEventListener("click", () => toggleCarnetSelection(carnet));
    container.appendChild(button);
  }
}

/* ===============================
   FILTRAGE DES CHANTS
================================ */

function getFilteredChantsBase() {
  let base = [...state.chants];

  if (state.selectedCarnets.length > 0 && state.selectedCarnets.length < state.availableCarnets.length) {
    base = base.filter((chant) => {
      const sources = uniqueArray([
        chant?.carnet,
        chant?.source,
        chant?.source_pdf,
        chant?.metadata?.carnet,
        chant?.metadata?.source
      ].filter(Boolean));

      return sources.some((src) => state.selectedCarnets.includes(src));
    });
  }

  return base;
}

function matchesFunction(chant, section) {
  const aliases = (FUNCTION_ALIASES[section] || [section]).map(normalize);
  const functions = Array.isArray(chant?.liturgie?.fonctions) ? chant.liturgie.fonctions : [];

  return functions.some((func) => {
    const n = normalize(func);
    return aliases.some((alias) => n.includes(alias) || alias.includes(n));
  });
}

function matchesSeason(chant, seasonId) {
  if (!seasonId) return true;

  const seasons = Array.isArray(chant?.liturgie?.temps_liturgiques)
    ? chant.liturgie.temps_liturgiques
    : [];

  const target = normalize(seasonId);

  return seasons.some((season) => {
    const n = normalize(season);
    return n.includes(target) || target.includes(n);
  });
}

function matchesRite(chant, rite) {
  if (!rite) return true;

  const rites = Array.isArray(chant?.liturgie?.rites) ? chant.liturgie.rites : [];
  if (!rites.length) return true;

  const target = normalize(rite);

  return rites.some((r) => {
    const n = normalize(r);
    return n.includes(target) || target.includes(n);
  });
}

function getQualityScore(chant) {
  const q1 = Number(chant?.qualite_annotation);
  const q2 = Number(chant?.qualite);

  if (Number.isFinite(q1)) return q1;
  if (Number.isFinite(q2)) return q2;
  return 0;
}

function matchesSearch(chant, query) {
  const q = normalize(query);
  if (!q) return true;

  const haystacks = [
    chant?.titre,
    chant?.titre_normalise,
    chant?.texte_normalise?.refrain,
    chant?.texte_normalise?.texte_complet
  ].map(normalize);

  return haystacks.some((text) => text.includes(q));
}

function computeSuggestionScore(chant, section) {
  let score = 0;

  if (matchesFunction(chant, section)) score += 120;
  if (matchesSeason(chant, state.liturgicalInfo?.season?.id)) score += 60;
  if (matchesRite(chant, state.rite)) score += 25;
  if (isLiked(chant.id)) score += 80;

  score += getQualityScore(chant);

  return score;
}

function getRankedSuggestions(section) {
  const ranked = getFilteredChantsBase()
    .filter((chant) => chant && chant.id != null)
    .filter((chant) => matchesRite(chant, state.rite))
    .filter((chant) => matchesSearch(chant, state.currentSearch))
    .map((chant) => ({
      chant,
      score: computeSuggestionScore(chant, section)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return safeText(a.chant?.titre).localeCompare(safeText(b.chant?.titre), "fr");
    });

  const liked = ranked.filter((item) => isLiked(item.chant.id));
  const others = ranked.filter((item) => !isLiked(item.chant.id));

  return [...liked, ...others].map((item) => item.chant);
}

function resetSuggestionOffset(section) {
  if (!section) return;
  state.suggestionOffsets[section] = 0;
}

function refreshSuggestions() {
  const section = getCurrentSection();
  if (!section) return;

  ensureSectionState(section);

  const ranked = getRankedSuggestions(section);
  const selectedIds = state.selectedBySection[section] || [];
  const selectedSet = new Set(selectedIds);
  const unselected = ranked.filter((chant) => !selectedSet.has(chant.id));

  if (!unselected.length) {
    renderSuggestions();
    return;
  }

  const currentOffset = Number(state.suggestionOffsets[section]) || 0;
  state.suggestionOffsets[section] = (currentOffset + 1) % unselected.length;

  saveCurrentRiteState();
  renderSuggestions();
}

function getVisibleSuggestions(section) {
  ensureSectionState(section);

  const ranked = getRankedSuggestions(section);
  const selectedIds = state.selectedBySection[section] || [];
  const selectedSet = new Set(selectedIds);

  const selectedVisible = [];
  for (const chant of ranked) {
    if (selectedSet.has(chant.id)) {
      selectedVisible.push(chant);
    }
  }

  const unselected = ranked.filter((chant) => !selectedSet.has(chant.id));

  const maxVisible = 3;
  const needed = Math.max(0, maxVisible - selectedVisible.length);

  if (needed === 0) {
    return selectedVisible.slice(0, maxVisible);
  }

  if (!unselected.length) {
    return selectedVisible.slice(0, maxVisible);
  }

  let offset = Number(state.suggestionOffsets[section]) || 0;
  if (offset >= unselected.length) {
    offset = 0;
    state.suggestionOffsets[section] = 0;
  }

  const rotated = unselected.slice(offset).concat(unselected.slice(0, offset));
  const fill = rotated.slice(0, needed);

  return [...selectedVisible, ...fill].slice(0, maxVisible);
}

/* ===============================
   FAVORIS : PANNEAU DÉDIÉ
================================ */

function ensureFavoritesModal() {
  let modal = byId("favoritesModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "favoritesModal";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,0.28)";
  modal.style.display = "none";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.padding = "24px";
  modal.style.zIndex = "9999";

  modal.innerHTML = `
    <div id="favoritesPanel" style="
      width:min(760px, 100%);
      max-height:80vh;
      overflow:auto;
      background:#ffffff;
      border-radius:18px;
      padding:20px;
      box-sizing:border-box;
      box-shadow:0 18px 40px rgba(0,0,0,0.18);
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:1.2rem;">Favoris</h2>
        <button id="closeFavoritesModal" type="button" style="
          border:1px solid #cfc7ba;
          background:#fff;
          border-radius:10px;
          padding:8px 12px;
          cursor:pointer;
        ">Fermer</button>
      </div>
      <div id="favoritesPanelText" style="margin-bottom:14px;color:#555;"></div>
      <div id="favoritesList"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeButton = byId("closeFavoritesModal");
  if (closeButton) {
    closeButton.addEventListener("click", closeFavoritesModal);
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeFavoritesModal();
    }
  });

  return modal;
}

function openFavoritesModal() {
  const modal = ensureFavoritesModal();
  state.ui.favoritesOpen = true;
  renderFavoritesModal();
  modal.style.display = "flex";
}

function closeFavoritesModal() {
  state.ui.favoritesOpen = false;
  const modal = byId("favoritesModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function renderFavoritesModal() {
  const text = byId("favoritesPanelText");
  const list = byId("favoritesList");
  if (!text || !list) return;

  const favorites = getFilteredChantsBase()
    .filter((chant) => chant && chant.id != null && isLiked(chant.id))
    .sort((a, b) => safeText(a.titre).localeCompare(safeText(b.titre), "fr"));

  const currentSection = getCurrentSection();
  text.textContent = currentSection
    ? `Section en cours : ${currentSection}`
    : "Aucune section en cours.";

  list.innerHTML = "";

  if (!favorites.length) {
    list.innerHTML = `<div style="color:#555;">Aucun chant favori pour l’instant.</div>`;
    return;
  }

  for (const chant of favorites) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.gap = "12px";
    row.style.padding = "12px 0";
    row.style.borderBottom = "1px solid #eee";

    const left = document.createElement("div");
    left.innerHTML = `
      <div style="font-weight:600;">${escapeHtml(chant.titre || "Sans titre")}</div>
      <div style="font-size:0.9rem;color:#666;">${escapeHtml(buildChantPreview(chant))}</div>
    `;

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.style.flexWrap = "wrap";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Ajouter à la section";
    addButton.style.border = "1px solid #cfc7ba";
    addButton.style.background = "#fff";
    addButton.style.borderRadius = "10px";
    addButton.style.padding = "8px 10px";
    addButton.style.cursor = "pointer";
    addButton.disabled = !currentSection || isSelectedInSection(chant.id, currentSection);
    addButton.addEventListener("click", () => {
      selectChant(chant, { autoAdvance: false });
      renderFavoritesModal();
    });

    const unlikeButton = document.createElement("button");
    unlikeButton.type = "button";
    unlikeButton.textContent = "Retirer des favoris";
    unlikeButton.style.border = "1px solid #cfc7ba";
    unlikeButton.style.background = "#fff";
    unlikeButton.style.borderRadius = "10px";
    unlikeButton.style.padding = "8px 10px";
    unlikeButton.style.cursor = "pointer";
    unlikeButton.addEventListener("click", () => {
      toggleLike(chant.id);
      renderFavoritesModal();
    });

    right.appendChild(addButton);
    right.appendChild(unlikeButton);

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }
}

/* ===============================
   LIKES
================================ */

function toggleLike(chantId) {
  if (chantId == null) return;

  state.likes[chantId] = !state.likes[chantId];
  saveGlobalState();
  renderSuggestions();
  renderSheet();

  if (state.ui.favoritesOpen) {
    renderFavoritesModal();
  }
}

/* ===============================
   SÉLECTION / DÉSÉLECTION
================================ */

function selectChant(chant, options = {}) {
  const { autoAdvance = true } = options;
  const section = getCurrentSection();

  if (!section || !chant || chant.id == null) return;

  ensureSectionState(section);

  if (!state.selectedBySection[section].includes(chant.id)) {
    state.selectedBySection[section].push(chant.id);
  }

  markCurrentSectionVisited();

  saveCurrentRiteState();
  saveGlobalState();

  if (autoAdvance) {
    const maxIndex = getSectionsForCurrentRite().length - 1;
    if (state.currentSectionIndex < maxIndex) {
      state.currentSectionIndex += 1;
    }
  }

  render();
}

function removeChantFromSection(section, chantId) {
  if (!section || chantId == null) return;

  const list = Array.isArray(state.selectedBySection[section]) ? state.selectedBySection[section] : [];
  state.selectedBySection[section] = list.filter((id) => id !== chantId);

  if (state.hiddenCoupletsBySection[section]) {
    delete state.hiddenCoupletsBySection[section][chantId];
  }

  saveCurrentRiteState();
  saveGlobalState();
  render();
}

function moveChantToSection(chantId, fromSection, toSection) {
  if (!chantId || !fromSection || !toSection) return;
  if (fromSection === toSection) return;

  ensureSectionState(fromSection);
  ensureSectionState(toSection);

  const sourceList = Array.isArray(state.selectedBySection[fromSection]) ? [...state.selectedBySection[fromSection]] : [];
  if (!sourceList.includes(chantId)) return;

  state.selectedBySection[fromSection] = sourceList.filter((id) => id !== chantId);

  if (!state.selectedBySection[toSection].includes(chantId)) {
    state.selectedBySection[toSection].push(chantId);
  }

  const hidden = getHiddenCouplets(fromSection, chantId);
  if (hidden.length) {
    setHiddenCouplets(toSection, chantId, hidden);
  }
  if (state.hiddenCoupletsBySection[fromSection]) {
    delete state.hiddenCoupletsBySection[fromSection][chantId];
  }

  saveCurrentRiteState();
  saveGlobalState();
  render();
}

/* ===============================
   COUPLETS
================================ */

function toggleCoupletInSheet(section, chantId, coupletIndex) {
  const hidden = getHiddenCouplets(section, chantId);
  const isHidden = hidden.includes(coupletIndex);

  if (isHidden) {
    setHiddenCouplets(
      section,
      chantId,
      hidden.filter((i) => i !== coupletIndex)
    );
  } else {
    setHiddenCouplets(section, chantId, [...hidden, coupletIndex]);
  }

  saveCurrentRiteState();
  renderSheet();
}

/* ===============================
   RENDU GLOBAL
================================ */

function render() {
  renderSectionTitle();
  renderSummary();
  renderSectionsSummary();
  renderCarnetsList();
  renderSuggestions();
  renderSheet();
  renderNavButtons();
  renderFavoritesButton();
  renderRiteButtons();
}

/* ===============================
   RENDUS
================================ */

function renderSectionTitle() {
  const titleEl = byId("sectionTitle");
  const subtitleEl = byId("sectionSubtitle");

  if (titleEl) {
    titleEl.textContent = getCurrentSection() || "";
  }

  if (subtitleEl) {
    subtitleEl.textContent = state.liturgicalInfo?.display?.title || "";
  }
}

function renderSummary() {
  const summary = byId("summary");
  if (!summary) return;

  const riteLabel =
    state.rite === "ordinaire"
      ? "Rite ordinaire"
      : state.rite === "extraordinaire"
      ? "Rite extraordinaire"
      : "Non choisi";

  summary.innerHTML = `
    <div class="summary-title">Résumé</div>
    <div class="summary-line"><strong>Rite :</strong> ${escapeHtml(riteLabel)}</div>
    <div class="summary-line"><strong>Date :</strong> ${escapeHtml(formatDateFr(state.date))}</div>
    <div class="summary-line"><strong>Célébration :</strong> ${escapeHtml(state.liturgicalInfo?.display?.title || "—")}</div>
    <div class="summary-line"><strong>Détail :</strong> ${escapeHtml(state.liturgicalInfo?.display?.subtitle || "—")}</div>
  `;
}

function renderSectionsSummary() {
  const container = byId("sections");
  if (!container) return;

  container.innerHTML = "";

  const sections = getSectionsForCurrentRite();
  const filledSections = sections.filter((section) => hasSelectionsInSection(section));

  if (!filledSections.length) {
    const empty = document.createElement("div");
    empty.className = "section-summary-empty";
    empty.textContent = "Le sommaire apparaîtra au fur et à mesure des sections remplies.";
    container.appendChild(empty);
    return;
  }

  for (const section of filledSections) {
    const count = state.selectedBySection[section].length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "section-pill";
    if (section === getCurrentSection()) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <span class="section-pill-label">${escapeHtml(section)}</span>
      <span class="section-pill-count">${count}</span>
    `;

    const index = sections.indexOf(section);
    button.addEventListener("click", () => goToSection(index));

    container.appendChild(button);
  }
}

function renderSuggestions() {
  const container = byId("chants");
  if (!container) return;

  container.innerHTML = "";

  if (!state.rite) return;

  const section = getCurrentSection();
  if (!section) return;

  const suggestions = getVisibleSuggestions(section);
  state.currentSuggestions = suggestions;

  if (!suggestions.length) {
    container.innerHTML = `<div class="chant-empty">Aucun chant disponible pour cette section.</div>`;
    return;
  }

  for (const chant of suggestions) {
    container.appendChild(createChantCard(chant, section));
  }
}

function createChantCard(chant, section) {
  const card = document.createElement("div");
  card.className = "chant";
  card.tabIndex = 0;

  if (isSelectedInSection(chant.id, section)) {
    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");
  } else {
    card.setAttribute("aria-pressed", "false");
  }

  card.addEventListener("click", () => {
    if (!isSelectedInSection(chant.id, section)) {
      selectChant(chant, { autoAdvance: true });
    }
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isSelectedInSection(chant.id, section)) {
        selectChant(chant, { autoAdvance: true });
      }
    }
  });

  const title = document.createElement("div");
  title.className = "chant-title chant-title--single-line";
  title.textContent = chant?.titre || "Sans titre";

  const likeButton = document.createElement("button");
  likeButton.type = "button";
  likeButton.className = "chant-like";
  likeButton.textContent = isLiked(chant.id) ? "♥" : "♡";
  likeButton.title = "Ajouter aux favoris";
  likeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLike(chant.id);
  });

  card.appendChild(title);
  card.appendChild(likeButton);

  return card;
}

function buildChantPreview(chant) {
  const refrain = getRefrainText(chant);
  if (refrain) {
    return refrain.length > 120 ? `${refrain.slice(0, 117)}...` : refrain;
  }

  const text = getFullText(chant);
  if (text) {
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  return "";
}

function renderSheet() {
  const titleEl = byId("sheetTitle");
  const subtitleEl = byId("sheetSubtitle");
  const content = byId("sheetContent");

  const parishDisplay =
    byId("sheetParish") ||
    byId("parishDisplay") ||
    byId("sheetParishName");

  const dateDisplay =
    byId("sheetDateLong") ||
    byId("sheetDateDisplay") ||
    byId("sheetDate");

  if (parishDisplay) {
    const parish = safeText(state.parishName).trim();
    parishDisplay.textContent = parish;
    parishDisplay.style.display = parish ? "" : "none";
  }

  if (titleEl) {
    titleEl.textContent = state.liturgicalInfo?.display?.title || "";
  }

  if (subtitleEl) {
    subtitleEl.textContent = "";
    subtitleEl.style.display = "none";
  }

  if (dateDisplay) {
    const longDate = formatDateFrLong(state.date);
    dateDisplay.textContent = longDate ? longDate.charAt(0).toUpperCase() + longDate.slice(1) : "";
    dateDisplay.style.display = longDate ? "" : "none";
  }

  if (!content) return;
  content.innerHTML = "";

  const sections = getSectionsForCurrentRite();
  const filledSections = sections.filter((section) => {
    const ids = Array.isArray(state.selectedBySection[section]) ? state.selectedBySection[section] : [];
    return ids.length > 0;
  });

  if (!filledSections.length) {
    return;
  }

  for (const section of filledSections) {
    ensureSectionState(section);

    const ids = Array.isArray(state.selectedBySection[section]) ? state.selectedBySection[section] : [];
    const firstChant = ids.length ? getChantById(ids[0]) : null;

    const block = document.createElement("div");
    block.className = "sheet-section";
    block.dataset.section = section;

    block.addEventListener("dragover", (event) => {
      event.preventDefault();
      block.classList.add("drop-target");
    });

    block.addEventListener("dragleave", () => {
      block.classList.remove("drop-target");
    });

    block.addEventListener("drop", (event) => {
      event.preventDefault();
      block.classList.remove("drop-target");

      const chantId = event.dataTransfer.getData("text/plain") || state.drag.chantId;
      const fromSection = event.dataTransfer.getData("application/x-from-section") || state.drag.fromSection;

      if (chantId && fromSection && fromSection !== section) {
        moveChantToSection(chantId, fromSection, section);
      }
    });

    const header = document.createElement("div");
    header.className = "sheet-section-header";

    const h3 = document.createElement("h3");
    h3.innerHTML = `
      <span class="sheet-section-name">${escapeHtml(section)}</span>
      ${firstChant ? `<span class="sheet-section-first-chant"> — ${escapeHtml(firstChant.titre || "Sans titre")}</span>` : ""}
    `;

    header.appendChild(h3);
    block.appendChild(header);

    ids.forEach((id, index) => {
      const chant = getChantById(id);
      if (!chant) return;

      const item = document.createElement("div");
      item.className = "sheet-chant-item sheet-chant-item--plain";
      item.draggable = true;
      item.dataset.section = section;
      item.dataset.chantId = String(id);

      item.addEventListener("dragstart", (event) => {
        state.drag.chantId = String(id);
        state.drag.fromSection = section;
        event.dataTransfer.setData("text/plain", String(id));
        event.dataTransfer.setData("application/x-from-section", section);
        event.dataTransfer.effectAllowed = "move";
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        state.drag.chantId = null;
        state.drag.fromSection = null;
        qsa(".drop-target").forEach((el) => el.classList.remove("drop-target"));
      });

      const showInlineHeaderTitle = index !== 0;

      const topRow = document.createElement("div");
      topRow.className = "sheet-chant-top";

      if (showInlineHeaderTitle) {
        const titleZone = document.createElement("div");
        titleZone.className = "sheet-chant-title";
        titleZone.textContent = chant.titre || "Sans titre";
        topRow.appendChild(titleZone);
      } else {
        const spacer = document.createElement("div");
        spacer.style.flex = "1";
        topRow.appendChild(spacer);
      }

      const actions = document.createElement("div");
      actions.className = "sheet-chant-actions";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "sheet-remove-button";
      remove.textContent = "Supprimer";
      remove.addEventListener("click", () => removeChantFromSection(section, id));

      actions.appendChild(remove);
      topRow.appendChild(actions);
      item.appendChild(topRow);

      const refrain = getRefrainText(chant);
      if (refrain) {
        const refrainEl = document.createElement("div");
        refrainEl.className = "sheet-chant-refrain";
        refrainEl.innerHTML = `<strong>${escapeHtml(refrain).replace(/\n/g, "<br>")}</strong>`;
        item.appendChild(refrainEl);
      }

      const couplets = getCoupletsArray(chant);
      const hiddenCouplets = new Set(getHiddenCouplets(section, id));

      if (couplets.length) {
        const visibleCouplets = couplets
          .map((couplet, coupletIndex) => ({ couplet, coupletIndex }))
          .filter(({ coupletIndex }) => !hiddenCouplets.has(coupletIndex));

        if (visibleCouplets.length) {
          const coupletsWrap = document.createElement("div");
          coupletsWrap.className = "sheet-couplets-grid";

          visibleCouplets.forEach(({ couplet, coupletIndex }) => {
            const coupletRow = document.createElement("div");
            coupletRow.className = "sheet-couplet sheet-couplet--plain";

            const coupletText = document.createElement("div");
            coupletText.className = "sheet-couplet-text";
            coupletText.innerHTML = escapeHtml(couplet).replace(/\n/g, "<br>");

            const removeCouplet = document.createElement("button");
            removeCouplet.type = "button";
            removeCouplet.className = "sheet-couplet-remove";
            removeCouplet.textContent = "−";
            removeCouplet.title = "Retirer ce couplet de la feuille";
            removeCouplet.addEventListener("click", () => toggleCoupletInSheet(section, id, coupletIndex));

            coupletRow.appendChild(coupletText);
            coupletRow.appendChild(removeCouplet);
            coupletsWrap.appendChild(coupletRow);
          });

          item.appendChild(coupletsWrap);
        }
      } else if (!refrain) {
        const fullText = getFullText(chant);
        if (fullText) {
          const fallback = document.createElement("div");
          fallback.className = "sheet-chant-fulltext";
          fallback.innerHTML = escapeHtml(fullText).replace(/\n/g, "<br>");
          item.appendChild(fallback);
        }
      }

      block.appendChild(item);
    });

    content.appendChild(block);
  }
}

function renderNavButtons() {
  const prev = byId("prev");
  const next = byId("next");
  const sections = getSectionsForCurrentRite();

  if (prev) {
    prev.disabled = !state.rite || state.currentSectionIndex <= 0;
  }

  if (next) {
    next.disabled = !state.rite || state.currentSectionIndex >= sections.length - 1;
  }
}

function renderFavoritesButton() {
  const button = byId("favoritesButton");
  if (!button) return;

  button.textContent = "Favoris";
  button.removeAttribute("aria-pressed");
  button.classList.remove("active");
}

function renderRiteButtons() {
  qsa("[data-rite]").forEach((button) => {
    const active = button.dataset.rite === state.rite;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

/* ===============================
   SÉCURITÉ GLOBALE
================================ */

window.addEventListener("error", (event) => {
  console.error("Erreur JavaScript :", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promesse rejetée :", event.reason);
});
