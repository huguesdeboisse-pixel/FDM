const APP_STORAGE_KEY = "fdm_app_state_v4";
const SHEET_STORAGE_PREFIX = "fdm_sheet_";

const RITE_CONFIG = {
  ordinaire: {
    label: "Rite ordinaire",
    sections: [
      { key: "entree", label: "Entrée", liturgyKeys: ["entree"] },
      { key: "kyrie", label: "Kyrie", liturgyKeys: ["kyrie"], kyrialePart: true },
      { key: "gloria", label: "Gloria", liturgyKeys: ["gloria"], kyrialePart: true },
      { key: "psaume", label: "Psaume", liturgyKeys: ["psaume"], collapsedByDefault: true },
      { key: "credo", label: "Credo", liturgyKeys: ["credo"], kyrialePart: true },
      { key: "offertoire", label: "Offertoire", liturgyKeys: ["offertoire"] },
      { key: "sanctus", label: "Sanctus", liturgyKeys: ["sanctus"], kyrialePart: true },
      { key: "anamnese", label: "Anamnèse", liturgyKeys: ["anamnese"], collapsedByDefault: true },
      { key: "amen", label: "Amen", liturgyKeys: ["amen"], collapsedByDefault: true },
      { key: "agnus", label: "Agnus Dei", liturgyKeys: ["agnus", "agnus dei"], kyrialePart: true },
      { key: "communion", label: "Communion", liturgyKeys: ["communion"] },
      { key: "envoi", label: "Envoi", liturgyKeys: ["envoi", "sortie"] },
    ],
  },
  extraordinaire: {
    label: "Rite extraordinaire",
    sections: [
      { key: "introit", label: "Introït", liturgyKeys: ["introit", "introït", "entree"] },
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
  liturgicalInfo: {
    season: "",
    celebration: "",
    displayTitle: "",
    displayDate: "",
  },

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
  await loadChants();
  initializeDefaultDateIfNeeded();
  updateLiturgicalInfo();
  renderAll();
});

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
  els.dateInput.addEventListener("change", (event) => {
    state.date = event.target.value || "";
    updateLiturgicalInfo();
    saveAppState();
    saveCurrentSheetForRite();
    renderAll();
  });

  els.riteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextRite = button.dataset.rite;
      handleRiteSelection(nextRite);
    });
  });

  els.carnetSearch.addEventListener("input", renderCarnets);

  els.clearCarnetsButton.addEventListener("click", () => {
    state.selectedCarnets = [];
    recomputeAllSuggestions();
    saveAppState();
    saveCurrentSheetForRite();
    renderAll();
  });

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

  els.resumeYes.addEventListener("click", () => {
    const rite = state.pendingRiteChoice;
    closeResumeModal();
    applySavedSheetForRite(rite);
  });

  els.resumeNo.addEventListener("click", () => {
    const rite = state.pendingRiteChoice;
    closeResumeModal();
    startNewSheetForRite(rite);
  });

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
  const title = String(raw.titre || raw.title || "Sans titre");

  const refrain =
    raw?.texte_normalise?.refrain ||
    raw?.texte?.refrain ||
    raw?.refrain ||
    "";

  const coupletsArray =
    raw?.texte_normalise?.couplets ||
    raw?.texte?.couplets ||
    raw?.couplets ||
    [];

  const couplets = Array.isArray(coupletsArray)
    ? coupletsArray.filter(Boolean).map(String)
    : typeof coupletsArray === "string"
    ? [coupletsArray]
    : [];

  const completeText =
    raw?.texte_normalise?.texte_complet ||
    raw?.texte?.texte_complet ||
    raw?.texte_complet ||
    [refrain, ...couplets].filter(Boolean).join("\n\n");

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

  const annotationStatus =
    String(raw?.qualite_annotation?.statut_annotation || "").toLowerCase();

  const carnet =
    raw.carnet ||
    raw.source ||
    raw.origine ||
    raw.collection ||
    raw?.meta?.carnet ||
    raw?.metadata?.carnet ||
    "";

  return {
    ...raw,
    id,
    title,
    refrain: String(refrain || ""),
    couplets,
    completeText: String(completeText || ""),
    functions,
    seasons,
    rites,
    themes,
    fetes,
    qualityScore,
    annotationStatus,
    carnet: String(carnet || "").trim(),
  };
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
  els.resumeModal.style.display = "flex";
}

function closeResumeModal() {
  state.isAwaitingResumeChoice = false;
  els.resumeModal.style.display = "none";
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

function computeLiturgicalInfo(dateStr, rite) {
  if (!dateStr) {
    return {
      season: "",
      celebration: "",
      displayTitle: "",
      displayDate: "",
    };
  }

  if (typeof window.calculerTempsLiturgique === "function") {
    try {
      const result = window.calculerTempsLiturgique(dateStr, rite);
      return {
        season: result?.season || result?.temps || "",
        celebration: result?.celebration || result?.fete || "",
        displayTitle: result?.displayTitle || result?.celebration || result?.fete || "",
        displayDate: result?.displayDate || formatDateShortFr(dateStr),
      };
    } catch (error) {
      console.warn("Fallback liturgique utilisé.", error);
    }
  }

  return {
    season: fallbackSeason(dateStr),
    celebration: "Célébration du jour à intégrer plus finement",
    displayTitle: "Célébration du jour à intégrer plus finement",
    displayDate: formatDateShortFr(dateStr),
  };
}

function fallbackSeason(dateStr) {
  const date = new Date(dateStr + "T12:00:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 12 && day >= 1) || (month === 1 && day <= 13)) return "Temps de Noël";
  if (month === 2 || (month === 3 && day < 20)) return "Carême";
  if ((month === 3 && day >= 20) || month === 4 || (month === 5 && day <= 20)) return "Temps pascal";
  if (month === 11 || (month === 12 && day < 1)) return "Avent";
  return "Temps ordinaire";
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
  els.liturgicalSummary.textContent = state.liturgicalInfo.displayTitle || "";
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
  els.leftSummarySeason.textContent = state.liturgicalInfo.displayTitle || "";

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
    els.currentSectionSubtitle.textContent = state.liturgicalInfo.displayTitle || "";
  }

  if (els.currentSectionDate) {
    els.currentSectionDate.textContent = state.date ? formatDateShortFr(state.date) : "";
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
  if (chant.refrain) parts.push(`<strong>${escapeHtml(chant.refrain)}</strong>`);

  if (chant.couplets.length > 0) {
    chant.couplets.slice(0, 6).forEach((couplet) => {
      parts.push(`<p>${escapeHtml(couplet)}</p>`);
    });
  } else if (chant.completeText) {
    parts.push(`<p>${escapeHtml(chant.completeText)}</p>`);
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

  els.chantSearch.value = "";
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
      if (chantMatchesSeason(chant, state.liturgicalInfo.season)) score += 10;
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
      if (chantMatchesSeason(chant, state.liturgicalInfo.season)) score += 32;
      if (chantMatchesRite(chant, state.rite)) score += 18;
      if (state.likes[chant.id]) score += 50;
      if (chant.annotationStatus.includes("ok")) score += 8;
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
  const functionText = [...chant.functions, ...chant.themes, ...chant.fetes].join(" ");
  return section.liturgyKeys.some((key) => functionText.includes(key.toLowerCase()));
}

function chantMatchesSeason(chant, seasonLabel) {
  if (!seasonLabel) return true;
  const normalizedSeason = normalizeText(seasonLabel);
  if (chant.seasons.length === 0) return true;
  return chant.seasons.some((season) => normalizeText(season).includes(normalizedSeason));
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
    els.sheetTitle.textContent = state.liturgicalInfo.displayTitle || "Feuille de messe";
  }

  els.sheetMeta.textContent = state.date ? formatDateShortFr(state.date) : "";
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

function formatDateShortFr(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate + "T12:00:00");
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
