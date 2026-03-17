/* =========================================================
   FEUILLE DE MESSE - APP.JS
   Version robuste, défensive, orientée "zéro plantage"
   ========================================================= */

/* ===============================
   CONSTANTES / CONFIG
================================ */

const STORAGE_KEY_GLOBAL = "fdm_global_v2";
const STORAGE_KEY_RITE_PREFIX = "fdm_rite_";

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
  "Psaume": ["psaume", "psalm"],
  "Credo": ["credo", "credoo"],
  "Offertoire": ["offertoire", "offertory", "préparation des dons", "preparation des dons"],
  "Sanctus": ["sanctus"],
  "Anamnèse": ["anamnese", "anamnèse"],
  "Amen": ["amen"],
  "Agnus Dei": ["agnus dei", "agnus"],
  "Communion": ["communion"],
  "Envoi": ["envoi", "sortie", "chant final"],
  "Antienne mariale": ["antienne mariale", "salve regina", "alma redemptoris", "ave regina", "regina caeli"]
};

/* ===============================
   ETAT GLOBAL
================================ */

const state = {
  chants: [],
  chantsById: new Map(),

  rite: "",
  date: "",

  liturgicalInfo: null,
  currentSectionIndex: 0,

  selectedBySection: {},
  likes: {},

  selectedCarnets: [],
  availableCarnets: [],

  visitedSections: [],
  favoritesOnly: false,
  lastSearch: "",
  currentSuggestions: [],

  ui: {
    searchOpen: false
  }
};

/* ===============================
   UTILITAIRES GENERAUX
================================ */

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function byId(id) {
  return document.getElementById(id);
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

function todayLocalISO() {
  const now = new Date();
  return toISODate(now);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISODate(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDateFr(isoDate) {
  const date = fromISODate(isoDate);
  if (!date) return "Non renseignée";
  return date.toLocaleDateString("fr-FR");
}

function getNextSundayISO() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const day = date.getDay(); // 0 = dimanche
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

function hasResumeForRite(rite) {
  if (!rite || !SECTIONS[rite]) return false;
  const saved = loadRiteState(rite);
  if (!saved) return false;

  const hasSelected = saved.selectedBySection && Object.values(saved.selectedBySection).some(
    (arr) => Array.isArray(arr) && arr.length > 0
  );

  return Boolean(
    saved.date ||
    hasSelected ||
    (typeof saved.currentSectionIndex === "number" && saved.currentSectionIndex > 0)
  );
}

/* ===============================
   STOCKAGE LOCAL
================================ */

function loadJsonFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
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
    lastRite: ""
  });
}

function saveGlobalState() {
  saveJsonToStorage(STORAGE_KEY_GLOBAL, {
    likes: state.likes || {},
    selectedCarnets: state.selectedCarnets || [],
    lastDate: state.date || "",
    lastRite: state.rite || ""
  });
}

function loadRiteState(rite) {
  return loadJsonFromStorage(`${STORAGE_KEY_RITE_PREFIX}${rite}`, null);
}

function saveRiteState(rite) {
  if (!rite) return;

  saveJsonToStorage(`${STORAGE_KEY_RITE_PREFIX}${rite}`, {
    date: state.date || "",
    currentSectionIndex: state.currentSectionIndex || 0,
    selectedBySection: state.selectedBySection || {},
    visitedSections: state.visitedSections || []
  });
}

function restoreLocalState() {
  const global = loadGlobalState();

  state.likes = global?.likes || {};
  state.selectedCarnets = global?.selectedCarnets || [];
  state.date = global?.lastDate || "";
  state.rite = global?.lastRite || "";
}

/* ===============================
   CHARGEMENT CHANTS
================================ */

async function loadChants() {
  try {
    const response = await fetch("./chants.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const chants = Array.isArray(data) ? data : [];

    state.chants = chants.filter(Boolean);
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
  const results = [];

  for (const chant of chants || []) {
    const candidates = [
      chant?.carnet,
      chant?.source,
      chant?.source_pdf,
      chant?.metadata?.carnet,
      chant?.metadata?.source
    ];

    for (const c of candidates) {
      if (c && typeof c === "string") {
        results.push(c);
      }
    }
  }

  return uniqueArray(results).sort((a, b) => a.localeCompare(b, "fr"));
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
    state.liturgicalInfo = {
      display: {
        title: "",
        subtitle: ""
      },
      season: {},
      celebration: {},
      color: {},
      rank: {}
    };
    return;
  }

  try {
    state.liturgicalInfo = window.calculerTempsLiturgique(effectiveDate, state.rite) || null;
  } catch (error) {
    console.error("Erreur de calcul liturgique :", error);
    state.liturgicalInfo = {
      display: {
        title: "",
        subtitle: ""
      },
      season: {},
      celebration: {},
      color: {},
      rank: {}
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

    await loadChants();
    bindEvents();

    if (state.rite && SECTIONS[state.rite]) {
      const savedRite = loadRiteState(state.rite);
      if (savedRite) {
        state.currentSectionIndex = clamp(savedRite.currentSectionIndex || 0, 0, (SECTIONS[state.rite].length - 1));
        state.selectedBySection = savedRite.selectedBySection || {};
        state.visitedSections = savedRite.visitedSections || [];
      }
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
   EVENEMENTS
================================ */

function bindEvents() {
  const dateInput = byId("dateInput");
  if (dateInput) {
    dateInput.addEventListener("change", onDateChange);
    dateInput.addEventListener("input", onDateChange);
  }

  const dateCard = byId("dateCard");
  if (dateCard && dateInput) {
    bindDateCard(dateCard, dateInput);
  }

  qsa("[data-rite]").forEach((btn) => {
    btn.addEventListener("click", () => onRiteSelect(btn.dataset.rite));
  });

  const prevBtn = byId("prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", prevSection);
  }

  const nextBtn = byId("next");
  if (nextBtn) {
    nextBtn.addEventListener("click", nextSection);
  }

  const backBtn = byId("backToSetup");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      saveCurrentRiteState();
      showScreen(1);
    });
  }

  const favoritesBtn = byId("favoritesButton");
  if (favoritesBtn) {
    favoritesBtn.addEventListener("click", () => {
      state.favoritesOnly = !state.favoritesOnly;
      renderSuggestions();
      renderFavoritesButton();
    });
  }

  const chantSearch = byId("chantSearch");
  if (chantSearch) {
    chantSearch.addEventListener("input", onSearchInput);
    chantSearch.addEventListener("focus", onSearchInput);
  }

  const closeSearchOverlay = byId("closeSearchOverlay");
  if (closeSearchOverlay) {
    closeSearchOverlay.addEventListener("click", closeSearchPanel);
  }

  const carnetSearch = byId("searchCarnet");
  if (carnetSearch) {
    carnetSearch.addEventListener("input", renderCarnets);
  }

  const downloadBtn = byId("download");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      window.print();
    });
  }

  const reportBtn = byId("reportErrorButton");
  if (reportBtn) {
    reportBtn.addEventListener("click", openReportPanel);
  }

  document.addEventListener("click", (event) => {
    const overlay = byId("searchOverlay");
    const input = byId("chantSearch");
    if (!overlay || !input) return;
    if (!state.ui.searchOpen) return;

    const clickInsideOverlay = overlay.contains(event.target);
    const clickInsideInput = input.contains(event.target);

    if (!clickInsideOverlay && !clickInsideInput) {
      closeSearchPanel();
    }
  });
}

function bindDateCard(card, input) {
  const openPicker = () => {
    try {
      input.focus();
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.click();
      }
    } catch (error) {
      console.warn("Ouverture du calendrier impossible :", error);
      input.focus();
    }
  };

  card.addEventListener("click", (event) => {
    if (event.target === input) return;
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
   NAVIGATION ECRANS
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

function onRiteSelect(rite) {
  if (!SECTIONS[rite]) return;

  const hasResume = hasResumeForRite(rite);

  state.rite = rite;
  state.favoritesOnly = false;
  state.lastSearch = "";

  if (hasResume) {
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
  updateLiturgicalInfo();
  saveCurrentRiteState();
  saveGlobalState();
  render();
  showScreen(2);
}

function restoreRiteState(rite) {
  const saved = loadRiteState(rite);

  state.selectedBySection = saved?.selectedBySection || {};
  state.currentSectionIndex = clamp(saved?.currentSectionIndex || 0, 0, (SECTIONS[rite].length - 1));
  state.visitedSections = saved?.visitedSections || [];
  state.date = saved?.date || state.date || getNextSundayISO();
}

function resetRiteState(rite) {
  state.selectedBySection = {};
  state.currentSectionIndex = 0;
  state.visitedSections = [];
  state.date = state.date || getNextSundayISO();

  for (const section of SECTIONS[rite] || []) {
    state.selectedBySection[section] = [];
  }
}

function saveCurrentRiteState() {
  if (!state.rite) return;
  saveRiteState(state.rite);
}

/* ===============================
   DATE
================================ */

function syncDateInput() {
  const input = byId("dateInput");
  if (input) {
    input.value = state.date || "";
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
  renderSheet();
  renderSectionTitle();
  renderSuggestions();
}

/* ===============================
   NAVIGATION SECTIONS
================================ */

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
  markCurrentSectionVisited();
  saveCurrentRiteState();
  render();
}

function markCurrentSectionVisited() {
  const section = getCurrentSection();
  if (!section) return;
  state.visitedSections = uniqueArray([...(state.visitedSections || []), section]);
}

/* ===============================
   RECHERCHE
================================ */

function onSearchInput(event) {
  state.lastSearch = event?.target?.value || "";
  renderSearchOverlay();
}

function openSearchPanel() {
  state.ui.searchOpen = true;
  const overlay = byId("searchOverlay");
  if (overlay) {
    overlay.hidden = false;
  }
}

function closeSearchPanel() {
  state.ui.searchOpen = false;
  const overlay = byId("searchOverlay");
  if (overlay) {
    overlay.hidden = true;
  }
}

function getSearchResults(query) {
  const q = normalize(query);
  if (!q) return [];

  const filtered = getFilteredChantsBase().filter((chant) => {
    const title = normalize(chant?.titre);
    const titleNorm = normalize(chant?.titre_normalise);
    const fullText = normalize(chant?.texte_normalise?.texte_complet);
    const refrain = normalize(chant?.texte_normalise?.refrain);

    return (
      title.includes(q) ||
      titleNorm.includes(q) ||
      refrain.includes(q) ||
      fullText.includes(q)
    );
  });

  return filtered.slice(0, 30);
}

function renderSearchOverlay() {
  const overlay = byId("searchOverlay");
  const resultsBox = byId("searchResults");
  const input = byId("chantSearch");

  if (!overlay || !resultsBox || !input) return;

  const query = input.value || "";
  if (!query.trim()) {
    resultsBox.innerHTML = "";
    closeSearchPanel();
    return;
  }

  const results = getSearchResults(query);
  openSearchPanel();

  if (!results.length) {
    resultsBox.innerHTML = `<div class="search-empty">Aucun chant trouvé.</div>`;
    return;
  }

  resultsBox.innerHTML = "";

  for (const chant of results) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "search-result-item";

    const selected = isSelectedSomewhere(chant.id);
    item.innerHTML = `
      <div class="search-result-title">${escapeHtml(chant.titre || "Sans titre")}</div>
      <div class="search-result-meta">${selected ? "Déjà sélectionné" : "Ajouter à la section en cours"}</div>
    `;

    item.addEventListener("click", () => {
      selectChant(chant, { autoAdvance: false, fromSearch: true });
      renderSearchOverlay();
      render();
    });

    resultsBox.appendChild(item);
  }
}

/* ===============================
   CARNETS
================================ */

function getFilteredChantsBase() {
  let base = [...state.chants];

  if (state.selectedCarnets && state.selectedCarnets.length) {
    base = base.filter((chant) => {
      const sources = uniqueArray([
        chant?.carnet,
        chant?.source,
        chant?.source_pdf,
        chant?.metadata?.carnet,
        chant?.metadata?.source
      ].filter(Boolean));

      if (!sources.length) return false;
      return sources.some((src) => state.selectedCarnets.includes(src));
    });
  }

  return base;
}

function renderCarnets() {
  const container = byId("carnetsList");
  if (!container) return;

  const query = normalize(byId("searchCarnet")?.value || "");
  const items = state.availableCarnets.filter((name) => normalize(name).includes(query));

  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `<div class="carnet-empty">Aucun carnet détecté.</div>`;
    return;
  }

  const allWrap = document.createElement("label");
  allWrap.className = "carnet-item";
  allWrap.innerHTML = `
    <input type="checkbox" id="carnetAllCheckbox" ${state.selectedCarnets.length === 0 ? "checked" : ""}>
    <span>Tous les chants</span>
  `;
  container.appendChild(allWrap);

  const allCheckbox = allWrap.querySelector("input");
  if (allCheckbox) {
    allCheckbox.addEventListener("change", () => {
      state.selectedCarnets = [];
      saveGlobalState();
      renderCarnets();
      renderSuggestions();
      renderSearchOverlay();
    });
  }

  for (const name of items) {
    const label = document.createElement("label");
    label.className = "carnet-item";
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(name)}" ${state.selectedCarnets.includes(name) ? "checked" : ""}>
      <span>${escapeHtml(name)}</span>
    `;

    const checkbox = label.querySelector("input");
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.selectedCarnets = uniqueArray([...state.selectedCarnets, name]);
        } else {
          state.selectedCarnets = state.selectedCarnets.filter((x) => x !== name);
        }

        saveGlobalState();
        renderCarnets();
        renderSuggestions();
        renderSearchOverlay();
      });
    }

    container.appendChild(label);
  }
}

/* ===============================
   SUGGESTIONS
================================ */

function getSectionAliases(section) {
  return FUNCTION_ALIASES[section] || [section];
}

function matchesFunction(chant, section) {
  const aliases = getSectionAliases(section).map(normalize);
  const functions = Array.isArray(chant?.liturgie?.fonctions) ? chant.liturgie.fonctions : [];

  return functions.some((f) => {
    const nf = normalize(f);
    return aliases.some((alias) => nf.includes(alias) || alias.includes(nf));
  });
}

function matchesSeason(chant, seasonId) {
  if (!seasonId) return true;
  const seasons = Array.isArray(chant?.liturgie?.temps_liturgiques) ? chant.liturgie.temps_liturgiques : [];
  const nSeason = normalize(seasonId);

  return seasons.some((s) => {
    const ns = normalize(s);
    return ns.includes(nSeason) || nSeason.includes(ns);
  });
}

function matchesRite(chant, rite) {
  if (!rite) return true;
  const rites = Array.isArray(chant?.liturgie?.rites) ? chant.liturgie.rites : [];
  if (!rites.length) return true;

  const nRite = normalize(rite);
  return rites.some((r) => {
    const nr = normalize(r);
    return nr.includes(nRite) || nRite.includes(nr);
  });
}

function getQualityScore(chant) {
  const q1 = Number(chant?.qualite_annotation);
  const q2 = Number(chant?.qualite);

  if (Number.isFinite(q1)) return q1;
  if (Number.isFinite(q2)) return q2;
  return 0;
}

function isLiked(chantId) {
  return Boolean(state.likes && state.likes[chantId]);
}

function isSelectedInSection(chantId, section) {
  const arr = state.selectedBySection?.[section];
  return Array.isArray(arr) && arr.includes(chantId);
}

function isSelectedSomewhere(chantId) {
  return Object.values(state.selectedBySection || {}).some(
    (arr) => Array.isArray(arr) && arr.includes(chantId)
  );
}

function computeSuggestionScore(chant, section) {
  let score = 0;

  if (matchesFunction(chant, section)) score += 120;
  if (matchesSeason(chant, state.liturgicalInfo?.season?.id)) score += 60;
  if (matchesRite(chant, state.rite)) score += 20;
  if (isLiked(chant.id)) score += 80;

  score += getQualityScore(chant);

  if (isSelectedInSection(chant.id, section)) score -= 150;

  return score;
}

function getRankedSuggestions(section) {
  const base = getFilteredChantsBase()
    .filter((chant) => chant && chant.id != null)
    .filter((chant) => matchesRite(chant, state.rite));

  let ranked = base
    .map((chant) => ({ chant, score: computeSuggestionScore(chant, section) }))
    .sort((a, b) => b.score - a.score);

  if (state.favoritesOnly) {
    ranked = ranked.filter((x) => isLiked(x.chant.id));
  }

  const liked = ranked.filter((x) => isLiked(x.chant.id));
  const nonLiked = ranked.filter((x) => !isLiked(x.chant.id));

  return [...liked, ...nonLiked].map((x) => x.chant);
}

function renderSuggestions() {
  const container = byId("chants");
  if (!container) return;

  container.innerHTML = "";

  if (!state.rite) return;

  const section = getCurrentSection();
  if (!section) return;

  const suggestions = getRankedSuggestions(section).slice(0, 3);
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

  const header = document.createElement("div");
  header.className = "chant-header";

  const title = document.createElement("div");
  title.className = "chant-title";
  title.textContent = chant?.titre || "Sans titre";

  const actions = document.createElement("div");
  actions.className = "chant-actions";

  const likeBtn = document.createElement("button");
  likeBtn.type = "button";
  likeBtn.className = "chant-like";
  likeBtn.setAttribute("aria-label", "Mettre en favori");
  likeBtn.textContent = isLiked(chant.id) ? "♥" : "♡";
  likeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLike(chant.id);
  });

  const selectBtn = document.createElement("button");
  selectBtn.type = "button";
  selectBtn.className = "chant-select";
  selectBtn.textContent = isSelectedInSection(chant.id, section) ? "Ajouté" : "Sélectionner";
  selectBtn.disabled = isSelectedInSection(chant.id, section);
  selectBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    selectChant(chant, { autoAdvance: true, fromSearch: false });
  });

  actions.appendChild(likeBtn);
  actions.appendChild(selectBtn);

  header.appendChild(title);
  header.appendChild(actions);
  card.appendChild(header);

  const preview = buildChantPreview(chant);
  if (preview) {
    const previewEl = document.createElement("div");
    previewEl.className = "chant-preview";
    previewEl.textContent = preview;
    card.appendChild(previewEl);
  }

  const details = document.createElement("div");
  details.className = "chant-details";
  details.hidden = true;

  const textLines = [];
  const refrain = safeText(chant?.texte_normalise?.refrain).trim();
  const couplets = Array.isArray(chant?.texte_normalise?.couplets) ? chant.texte_normalise.couplets : [];
  if (refrain) {
    textLines.push(`Refrain : ${refrain}`);
  }
  if (couplets.length) {
    textLines.push(...couplets.map((c, index) => `Couplet ${index + 1} : ${safeText(c)}`));
  }

  if (textLines.length) {
    details.innerHTML = textLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
    card.appendChild(details);

    card.addEventListener("click", () => {
      details.hidden = !details.hidden;
    });
  }

  return card;
}

function buildChantPreview(chant) {
  const refrain = safeText(chant?.texte_normalise?.refrain).trim();
  if (refrain) {
    return refrain.length > 120 ? `${refrain.slice(0, 117)}...` : refrain;
  }

  const full = safeText(chant?.texte_normalise?.texte_complet).trim();
  if (full) {
    return full.length > 120 ? `${full.slice(0, 117)}...` : full;
  }

  return "";
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
  renderFavoritesButton();
  renderSearchOverlay();
}

function renderFavoritesButton() {
  const btn = byId("favoritesButton");
  if (!btn) return;
  btn.textContent = state.favoritesOnly ? "Favoris activés" : "Favoris";
  btn.setAttribute("aria-pressed", state.favoritesOnly ? "true" : "false");
}

/* ===============================
   SELECTION / DESELECTION
================================ */

function selectChant(chant, options = {}) {
  const { autoAdvance = true, fromSearch = false } = options;

  const section = getCurrentSection();
  if (!section || !chant || chant.id == null) return;

  if (!Array.isArray(state.selectedBySection[section])) {
    state.selectedBySection[section] = [];
  }

  if (!state.selectedBySection[section].includes(chant.id)) {
    state.selectedBySection[section].push(chant.id);
  }

  markCurrentSectionVisited();
  saveCurrentRiteState();
  saveGlobalState();

  renderSheet();
  renderSectionsList();
  renderSuggestions();

  if (fromSearch) {
    openSearchPanel();
  }

  if (autoAdvance) {
    const maxIndex = getSectionsForCurrentRite().length - 1;
    if (state.currentSectionIndex < maxIndex) {
      state.currentSectionIndex += 1;
      markCurrentSectionVisited();
      saveCurrentRiteState();
      render();
    } else {
      render();
    }
  } else {
    render();
  }
}

function removeChantFromSection(section, chantId) {
  if (!section || chantId == null) return;

  const arr = Array.isArray(state.selectedBySection[section]) ? state.selectedBySection[section] : [];
  state.selectedBySection[section] = arr.filter((id) => id !== chantId);

  saveCurrentRiteState();
  saveGlobalState();
  render();
}

function moveSelectedChant(section, chantId, direction) {
  const arr = Array.isArray(state.selectedBySection[section]) ? [...state.selectedBySection[section]] : [];
  const index = arr.indexOf(chantId);
  if (index === -1) return;

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= arr.length) return;

  [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
  state.selectedBySection[section] = arr;

  saveCurrentRiteState();
  renderSheet();
}

/* ===============================
   RENDU GLOBAL
================================ */

function render() {
  renderSectionTitle();
  renderSummary();
  renderSectionsList();
  renderSuggestions();
  renderSheet();
  renderFavoritesButton();
  renderCarnets();
  renderSearchOverlay();
  renderNavButtons();
  renderRiteButtons();
}

/* ===============================
   RENDU - TITRE / SOUS-TITRE
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

function renderRiteButtons() {
  qsa("[data-rite]").forEach((btn) => {
    const rite = btn.dataset.rite;
    const active = rite === state.rite;
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.classList.toggle("active", active);
  });
}

/* ===============================
   RENDU - COLONNE 1
================================ */

function renderSummary() {
  const summary = byId("summary");
  if (!summary) return;

  const riteLabel =
    state.rite === "ordinaire"
      ? "Rite ordinaire"
      : state.rite === "extraordinaire"
      ? "Rite extraordinaire"
      : "Non choisi";

  const litTitle = state.liturgicalInfo?.display?.title || "";
  const litSubtitle = state.liturgicalInfo?.display?.subtitle || "";

  summary.innerHTML = `
    <div class="summary-title">Résumé</div>
    <div class="summary-line"><strong>Rite :</strong> ${escapeHtml(riteLabel)}</div>
    <div class="summary-line"><strong>Date :</strong> ${escapeHtml(formatDateFr(state.date))}</div>
    <div class="summary-line"><strong>Célébration :</strong> ${escapeHtml(litTitle || "—")}</div>
    <div class="summary-line"><strong>Détail :</strong> ${escapeHtml(litSubtitle || "—")}</div>
  `;
}

function renderSectionsList() {
  const container = byId("sections");
  if (!container) return;

  const sections = getSectionsForCurrentRite();
  container.innerHTML = "";

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const selectedCount = Array.isArray(state.selectedBySection[section]) ? state.selectedBySection[section].length : 0;
    const visited = (state.visitedSections || []).includes(section);
    const isActive = i === state.currentSectionIndex;

    const item = document.createElement("button");
    item.type = "button";
    item.className = "section-pill";
    if (isActive) item.classList.add("active");
    if (visited) item.classList.add("visited");

    item.innerHTML = `
      <span class="section-pill-label">${escapeHtml(section)}</span>
      <span class="section-pill-count">${selectedCount > 0 ? selectedCount : ""}</span>
    `;

    item.addEventListener("click", () => goToSection(i));
    container.appendChild(item);
  }
}

function renderNavButtons() {
  const prevBtn = byId("prev");
  const nextBtn = byId("next");
  const sections = getSectionsForCurrentRite();

  if (prevBtn) {
    prevBtn.disabled = !state.rite || state.currentSectionIndex <= 0;
  }

  if (nextBtn) {
    nextBtn.disabled = !state.rite || state.currentSectionIndex >= sections.length - 1;
  }
}

/* ===============================
   RENDU - FEUILLE A4
================================ */

function renderSheet() {
  const titleEl = byId("sheetTitle");
  const subtitleEl = byId("sheetSubtitle");
  const content = byId("sheetContent");

  if (titleEl) {
    titleEl.textContent = state.liturgicalInfo?.display?.title || "";
  }

  if (subtitleEl) {
    subtitleEl.textContent = state.liturgicalInfo?.display?.subtitle || "";
  }

  if (!content) return;
  content.innerHTML = "";

  const sections = getSectionsForCurrentRite();

  for (const section of sections) {
    const ids = Array.isArray(state.selectedBySection[section]) ? state.selectedBySection[section] : [];
    if (!ids.length) continue;

    const block = document.createElement("div");
    block.className = "sheet-section";

    const header = document.createElement("div");
    header.className = "sheet-section-header";

    const title = document.createElement("h3");
    title.textContent = section;

    header.appendChild(title);
    block.appendChild(header);

    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      const chant = state.chantsById.get(id);
      if (!chant) continue;

      const item = document.createElement("div");
      item.className = "sheet-chant-item";

      const textZone = document.createElement("div");
      textZone.className = "sheet-chant-text";
      textZone.innerHTML = `
        <div class="sheet-chant-title">${escapeHtml(chant.titre || "Sans titre")}</div>
      `;

      const actions = document.createElement("div");
      actions.className = "sheet-chant-actions";

      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.disabled = i === 0;
      up.addEventListener("click", () => moveSelectedChant(section, id, -1));

      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.disabled = i === ids.length - 1;
      down.addEventListener("click", () => moveSelectedChant(section, id, +1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Supprimer";
      remove.addEventListener("click", () => removeChantFromSection(section, id));

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(remove);

      item.appendChild(textZone);
      item.appendChild(actions);
      block.appendChild(item);
    }

    content.appendChild(block);
  }

  if (!content.children.length) {
    content.innerHTML = `<div class="sheet-empty">La feuille de messe se construira ici au fur et à mesure.</div>`;
  }
}

/* ===============================
   SIGNALEMENT D'ERREUR
================================ */

function openReportPanel() {
  const panel = byId("reportErrorPanel");
  if (!panel) return;
  panel.hidden = false;
}

/* ===============================
   SECURITE GLOBALE
================================ */

window.addEventListener("error", (event) => {
  console.error("Erreur JavaScript non interceptée :", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promesse rejetée :", event.reason);
});
