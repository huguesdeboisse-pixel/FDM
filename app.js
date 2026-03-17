const APP_STORAGE_KEY = "fdm_app_state_v6";
const SHEET_STORAGE_PREFIX = "fdm_sheet_";

const RITE_CONFIG = {
  ordinaire: {
    label: "Rite ordinaire",
    sections: [
      { key: "entree", label: "Entrée" },
      { key: "kyrie", label: "Kyrie" },
      { key: "gloria", label: "Gloria" },
      { key: "psaume", label: "Psaume" },
      { key: "credo", label: "Credo" },
      { key: "offertoire", label: "Offertoire" },
      { key: "sanctus", label: "Sanctus" },
      { key: "anamnese", label: "Anamnèse" },
      { key: "amen", label: "Amen" },
      { key: "agnus", label: "Agnus Dei" },
      { key: "communion", label: "Communion" },
      { key: "envoi", label: "Envoi" }
    ]
  },
  extraordinaire: {
    label: "Rite extraordinaire",
    sections: [
      { key: "introit", label: "Introït" },
      { key: "kyrie", label: "Kyrie" },
      { key: "gloria", label: "Gloria" },
      { key: "credo", label: "Credo" },
      { key: "offertoire", label: "Offertoire" },
      { key: "sanctus", label: "Sanctus" },
      { key: "agnus", label: "Agnus Dei" },
      { key: "communion", label: "Communion" },
      { key: "antienne_mariale", label: "Antienne mariale" }
    ]
  }
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
  likes: {},

  pendingRiteChoice: ""
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
  els.screen1 = document.getElementById("screen1");
  els.screen2 = document.getElementById("screen2");

  els.dateInput = document.getElementById("dateInput");
  els.riteButtons = Array.from(document.querySelectorAll("[data-rite]"));
  els.searchCarnet = document.getElementById("searchCarnet");

  els.summary = document.getElementById("summary");
  els.sections = document.getElementById("sections");

  els.sectionTitle = document.getElementById("sectionTitle");
  els.sectionSubtitle = document.getElementById("sectionSubtitle");
  els.chantSearch = document.getElementById("chantSearch");
  els.chants = document.getElementById("chants");
  els.prev = document.getElementById("prev");
  els.next = document.getElementById("next");
  els.favoritesButton = document.getElementById("favoritesButton");

  els.sheetTitle = document.getElementById("sheetTitle");
  els.sheetSubtitle = document.getElementById("sheetSubtitle");
  els.sheetContent = document.getElementById("sheetContent");
  els.download = document.getElementById("download");
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
      handleRiteSelection(button.dataset.rite);
    });
  });

  if (els.searchCarnet) {
    els.searchCarnet.addEventListener("input", renderScreen1);
  }

  if (els.chantSearch) {
    els.chantSearch.addEventListener("input", renderMiddleColumn);
  }

  if (els.prev) {
    els.prev.addEventListener("click", goToPreviousSection);
  }

  if (els.next) {
    els.next.addEventListener("click", goToNextSection);
  }

  if (els.favoritesButton) {
    els.favoritesButton.addEventListener("click", () => {
      renderFavoritesAlert();
    });
  }

  if (els.download) {
    els.download.addEventListener("click", () => window.print());
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
}

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
      date: ""
    },
    metadata: {
      source: "",
      priority: null,
      omittedCelebrations: []
    }
  };
}

async function loadChants() {
  try {
    const response = await fetch("./chants.json");
    if (!response.ok) {
      throw new Error("Impossible de charger chants.json");
    }

    const raw = await response.json();
    const data = Array.isArray(raw) ? raw : Array.isArray(raw.chants) ? raw.chants : [];

    state.chants = data.map(normalizeChant).filter(Boolean);
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
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = String(raw.id || raw.titre_normalise || raw.titre || `chant_${index}`);
  const title = String(raw.titre || "Sans titre").trim();

  const refrainLines = normalizeLinesArray(raw?.texte_normalise?.refrain ?? []);
  const couplets = normalizeLinesArray(raw?.texte_normalise?.couplets ?? []);
  const completeText = String(
    raw?.texte_normalise?.texte_complet ||
      [...refrainLines, ...couplets].join("\n\n")
  ).trim();

  const carnet = extractCarnetName(raw);

  return {
    ...raw,
    id,
    title,
    refrainLines,
    refrain: refrainLines.join("\n"),
    couplets,
    completeText,
    carnet,
    functions: normalizeStringArray(raw?.liturgie?.fonctions),
    seasons: normalizeStringArray(raw?.liturgie?.temps_liturgiques),
    rites: normalizeStringArray(raw?.liturgie?.rites),
    themes: normalizeStringArray(raw?.liturgie?.themes),
    fetes: normalizeStringArray(raw?.liturgie?.fetes_specifiques),
    qualityScore: Number(raw?.qualite?.score_confiance) || 0
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
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
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
  if (typeof raw?.source?.pdf_nom === "string" && raw.source.pdf_nom.trim()) {
    return raw.source.pdf_nom.trim();
  }
  if (typeof raw.carnet === "string" && raw.carnet.trim()) {
    return raw.carnet.trim();
  }
  return "";
}

function extractCarnetNames(chants) {
  return Array.from(new Set(chants.map((chant) => chant.carnet).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "fr")
  );
}

function restoreAppState() {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    state.date = parsed.date || "";
    state.selectedCarnets = Array.isArray(parsed.selectedCarnets) ? parsed.selectedCarnets : [];
    state.likes = parsed.likes || {};

    state.rite = "";
    state.currentSectionKey = "";
    state.visitedSections = [];
    state.selectedBySection = {};
    state.visibleSuggestionsBySection = {};
  } catch (error) {
    console.warn("Impossible de restaurer l’état général :", error);
  }
}

function saveAppState() {
  localStorage.setItem(
    APP_STORAGE_KEY,
    JSON.stringify({
      date: state.date,
      selectedCarnets: state.selectedCarnets,
      likes: state.likes
    })
  );
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
  if (!state.rite) {
    return;
  }

  localStorage.setItem(
    getSheetStorageKey(state.rite),
    JSON.stringify({
      rite: state.rite,
      date: state.date,
      currentSectionKey: state.currentSectionKey,
      visitedSections: state.visitedSections,
      selectedBySection: state.selectedBySection,
      visibleSuggestionsBySection: state.visibleSuggestionsBySection
    })
  );
}

function hasUsableSavedSheet(savedSheet) {
  if (!savedSheet) {
    return false;
  }

  return Object.values(savedSheet.selectedBySection || {}).some(
    (value) => Array.isArray(value) && value.length > 0
  );
}

function handleRiteSelection(nextRite) {
  const saved = getSavedSheetForRite(nextRite);
  state.pendingRiteChoice = nextRite;

  if (saved && hasUsableSavedSheet(saved)) {
    openResumeModal();
    return;
  }

  startNewSheetForRite(nextRite);
}

function startNewSheetForRite(rite) {
  state.rite = rite;
  state.currentSectionKey = "";
  state.visitedSections = [];
  state.selectedBySection = {};
  state.visibleSuggestionsBySection = {};

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

  updateLiturgicalInfo();
  ensureSectionState();
  saveAppState();
  renderAll();
}

function openResumeModal() {
  if (els.resumeModal) {
    els.resumeModal.style.display = "flex";
  }
}

function closeResumeModal() {
  if (els.resumeModal) {
    els.resumeModal.style.display = "none";
  }
  state.pendingRiteChoice = "";
}

function initializeDefaultDateIfNeeded() {
  if (state.date) {
    if (els.dateInput) {
      els.dateInput.value = state.date;
    }
    return;
  }

  const nextSunday = getNextSundayISO();
  state.date = nextSunday;
  if (els.dateInput) {
    els.dateInput.value = nextSunday;
  }
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
  if (!state.date || !state.rite) {
    state.liturgicalInfo = createEmptyLiturgicalInfo();
    return;
  }

  try {
    const result = window.calculerTempsLiturgique(state.date, state.rite);
    state.liturgicalInfo = result && typeof result === "object" ? result : createEmptyLiturgicalInfo();
  } catch (error) {
    console.error("Erreur calendrier liturgique :", error);
    state.liturgicalInfo = createEmptyLiturgicalInfo();
  }
}

function ensureSectionState() {
  const sections = getCurrentSections();
  if (!sections.length) {
    state.currentSectionKey = "";
    return;
  }

  sections.forEach((section) => {
    if (!state.selectedBySection[section.key]) {
      state.selectedBySection[section.key] = [];
    }
    if (!state.visibleSuggestionsBySection[section.key]) {
      state.visibleSuggestionsBySection[section.key] = [];
    }
  });

  if (!state.currentSectionKey) {
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
  return state.rite ? RITE_CONFIG[state.rite].sections : [];
}

function getSectionByKey(key) {
  return getCurrentSections().find((section) => section.key === key) || null;
}

function recomputeAllSuggestions() {
  getCurrentSections().forEach((section) => {
    const selected = new Set(state.selectedBySection[section.key] || []);
    state.visibleSuggestionsBySection[section.key] = getRankedSuggestions(section.key)
      .filter((chant) => !selected.has(chant.id))
      .slice(0, 3)
      .map((chant) => chant.id);
  });
}

function renderAll() {
  renderScreenMode();
  renderScreen1();
  renderLeftColumn();
  renderMiddleColumn();
  renderSheet();
}

function renderScreenMode() {
  const hasRite = Boolean(state.rite);
  els.screen1.classList.toggle("active", !hasRite);
  els.screen1.classList.toggle("hidden", hasRite);
  els.screen2.classList.toggle("active", hasRite);
  els.screen2.classList.toggle("hidden", !hasRite);
}

function renderScreen1() {
  els.riteButtons.forEach((button) => {
    button.style.background = button.dataset.rite === state.rite ? "#efe7da" : "white";
  });

  const query = (els.searchCarnet?.value || "").trim().toLowerCase();
  const container = els.searchCarnet?.parentElement;

  let resultsBox = document.getElementById("carnet-results-box");
  if (!resultsBox && container) {
    resultsBox = document.createElement("div");
    resultsBox.id = "carnet-results-box";
    resultsBox.style.marginTop = "10px";
    container.appendChild(resultsBox);
  }

  if (!resultsBox) {
    return;
  }

  resultsBox.innerHTML = "";

  const filtered = state.carnetNames.filter((name) => name.toLowerCase().includes(query)).slice(0, 12);

  if (filtered.length === 0) {
    resultsBox.innerHTML = `<div style="font-size:0.9rem;color:#666;">Aucun carnet trouvé.</div>`;
    return;
  }

  filtered.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = state.selectedCarnets.includes(name) ? `${name} — Sélectionné` : name;
    button.style.display = "block";
    button.style.marginTop = "8px";
    button.style.padding = "10px 12px";
    button.style.border = "1px solid #ddd";
    button.style.borderRadius = "10px";
    button.style.background = state.selectedCarnets.includes(name) ? "#efe7da" : "white";
    button.style.cursor = "pointer";
    button.addEventListener("click", () => {
      toggleCarnet(name);
    });
    resultsBox.appendChild(button);
  });
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

function renderLeftColumn() {
  if (!els.summary || !els.sections) {
    return;
  }

  els.summary.innerHTML = `
    <div style="font-size:0.92rem;color:#666;line-height:1.5;">
      ${state.date ? `<div>Date : ${escapeHtml(formatDateLongFr(state.date))}</div>` : ""}
      ${state.rite ? `<div>Rite : ${escapeHtml(RITE_CONFIG[state.rite].label)}</div>` : ""}
      ${state.liturgicalInfo.display.title ? `<div>${escapeHtml(state.liturgicalInfo.display.title)}</div>` : ""}
      <div>${escapeHtml(state.selectedCarnets.length ? state.selectedCarnets.join(" • ") : "Toute la base")}</div>
    </div>
  `;

  els.sections.innerHTML = "";
  getCurrentSections()
    .filter((section) => state.visitedSections.includes(section.key))
    .forEach((section) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = section.label;
      button.style.display = "block";
      button.style.width = "100%";
      button.style.marginTop = "10px";
      button.style.padding = "10px 12px";
      button.style.border = "1px solid #ddd";
      button.style.borderRadius = "10px";
      button.style.background = section.key === state.currentSectionKey ? "#efe7da" : "white";
      button.style.cursor = "pointer";
      button.addEventListener("click", () => {
        state.currentSectionKey = section.key;
        markSectionVisited(section.key);
        saveCurrentSheetForRite();
        renderAll();
      });
      els.sections.appendChild(button);
    });
}

function renderMiddleColumn() {
  const section = getSectionByKey(state.currentSectionKey);
  if (!section) {
    return;
  }

  els.sectionTitle.textContent = section.label;
  els.sectionSubtitle.textContent = state.liturgicalInfo.display.title || "";

  const query = (els.chantSearch?.value || "").trim();
  const selectedIds = state.selectedBySection[section.key] || [];
  const visibleIds = state.visibleSuggestionsBySection[section.key] || [];
  const ids = query
    ? searchChants(query, section.key).slice(0, 12).map((chant) => chant.id)
    : uniqueArray([...selectedIds, ...visibleIds]);

  els.chants.innerHTML = "";

  if (ids.length === 0) {
    els.chants.innerHTML = `<div style="color:#666;font-size:0.94rem;">Aucune suggestion pour cette section.</div>`;
  }

  ids.map((id) => state.chantsById.get(id)).filter(Boolean).forEach((chant) => {
    els.chants.appendChild(createChantCard(chant, section));
  });

  const index = getCurrentSections().findIndex((item) => item.key === section.key);
  els.prev.disabled = index <= 0;
}

function createChantCard(chant, section) {
  const isSelected = (state.selectedBySection[section.key] || []).includes(chant.id);
  const isLiked = Boolean(state.likes[chant.id]);

  const wrapper = document.createElement("div");
  wrapper.className = "chant";
  wrapper.style.background = isSelected ? "#f7f1e8" : "white";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.marginBottom = "6px";
  title.textContent = chant.title;

  const meta = document.createElement("div");
  meta.style.fontSize = "0.84rem";
  meta.style.color = "#666";
  meta.style.marginBottom = "10px";
  meta.textContent = chant.carnet || "Carnet non précisé";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.flexWrap = "wrap";

  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.textContent = "Aperçu";
  previewButton.style.padding = "8px 10px";
  previewButton.style.border = "1px solid #ddd";
  previewButton.style.borderRadius = "10px";
  previewButton.style.background = "white";
  previewButton.style.cursor = "pointer";
  previewButton.addEventListener("click", () => {
    alert(buildPreviewText(chant));
  });

  const likeButton = document.createElement("button");
  likeButton.type = "button";
  likeButton.textContent = isLiked ? "♥" : "♡";
  likeButton.style.padding = "8px 10px";
  likeButton.style.border = "1px solid #ddd";
  likeButton.style.borderRadius = "10px";
  likeButton.style.background = isLiked ? "#f3e6e6" : "white";
  likeButton.style.cursor = "pointer";
  likeButton.addEventListener("click", () => {
    toggleLike(chant.id);
  });

  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.textContent = isSelected ? "Désélectionner" : "Sélectionner";
  selectButton.style.padding = "8px 10px";
  selectButton.style.border = "1px solid #ddd";
  selectButton.style.borderRadius = "10px";
  selectButton.style.background = "white";
  selectButton.style.cursor = "pointer";
  selectButton.addEventListener("click", () => {
    toggleSelection(section.key, chant.id);
  });

  actions.appendChild(previewButton);
  actions.appendChild(likeButton);
  actions.appendChild(selectButton);

  wrapper.appendChild(title);
  wrapper.appendChild(meta);
  wrapper.appendChild(actions);

  return wrapper;
}

function buildPreviewText(chant) {
  const parts = [];

  if (chant.refrainLines.length) {
    parts.push("Refrain");
    parts.push(chant.refrainLines.join("\n"));
  }

  if (chant.couplets.length) {
    chant.couplets.forEach((couplet, index) => {
      parts.push(`\nCouplet ${index + 1}`);
      parts.push(couplet);
    });
  }

  return parts.join("\n");
}

function toggleLike(chantId) {
  state.likes[chantId] = !state.likes[chantId];
  saveAppState();
  recomputeAllSuggestions();
  renderAll();
}

function toggleSelection(sectionKey, chantId) {
  const list = new Set(state.selectedBySection[sectionKey] || []);
  const wasSelected = list.has(chantId);

  if (wasSelected) {
    list.delete(chantId);
  } else {
    list.add(chantId);
  }

  state.selectedBySection[sectionKey] = Array.from(list);

  const visible = new Set(state.visibleSuggestionsBySection[sectionKey] || []);
  visible.add(chantId);
  state.visibleSuggestionsBySection[sectionKey] = Array.from(visible);

  saveCurrentSheetForRite();
  renderAll();

  if (!wasSelected) {
    goToNextSection(true);
  }
}

function renderSheet() {
  els.sheetTitle.textContent = state.liturgicalInfo.display.title || "Feuille de messe";
  els.sheetSubtitle.textContent = state.liturgicalInfo.display.subtitle || "";
  els.sheetContent.innerHTML = "";

  const sections = getCurrentSections();
  const hasSelection = sections.some((section) => (state.selectedBySection[section.key] || []).length > 0);

  if (!hasSelection) {
    els.sheetContent.innerHTML = `<div style="color:#666;font-size:0.94rem;">Aucun chant sélectionné pour l’instant.</div>`;
    return;
  }

  sections.forEach((section) => {
    const ids = state.selectedBySection[section.key] || [];
    if (!ids.length) {
      return;
    }

    const block = document.createElement("div");
    block.className = "sheet-section";

    const title = document.createElement("h3");
    title.textContent = section.label;
    block.appendChild(title);

    ids.forEach((id) => {
      const chant = state.chantsById.get(id);
      if (!chant) {
        return;
      }

      const line = document.createElement("div");
      line.style.marginBottom = "6px";
      line.textContent = chant.title;
      block.appendChild(line);
    });

    els.sheetContent.appendChild(block);
  });
}

function searchChants(query, sectionKey) {
  const normalizedQuery = normalizeText(query);
  const base = getFilteredChants();

  return base
    .map((chant) => {
      let score = 0;
      const title = normalizeText(chant.title);
      const text = normalizeText(chant.completeText);

      if (title.includes(normalizedQuery)) score += 100;
      if (text.includes(normalizedQuery)) score += 40;

      normalizedQuery.split(/\s+/).filter(Boolean).forEach((word) => {
        if (title.includes(word)) score += 20;
        if (text.includes(word)) score += 8;
      });

      if (chantMatchesSection(chant, getSectionByKey(sectionKey))) score += 20;
      if (chantMatchesRite(chant, state.rite)) score += 10;

      return { chant, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chant.title.localeCompare(b.chant.title, "fr"))
    .map((item) => item.chant);
}

function getRankedSuggestions(sectionKey) {
  const section = getSectionByKey(sectionKey);
  if (!section) {
    return [];
  }

  return getFilteredChants()
    .map((chant) => {
      let score = 0;
      if (chantMatchesSection(chant, section)) score += 100;
      if (chantMatchesRite(chant, state.rite)) score += 10;
      if (state.likes[chant.id]) score += 40;
      score += Math.min(chant.qualityScore, 100) * 0.2;
      score += Math.random() * 2;
      return { chant, score };
    })
    .sort((a, b) => b.score - a.score || a.chant.title.localeCompare(b.chant.title, "fr"))
    .map((item) => item.chant);
}

function getFilteredChants() {
  if (!state.selectedCarnets.length) {
    return state.chants;
  }
  return state.chants.filter((chant) => state.selectedCarnets.includes(chant.carnet));
}

function chantMatchesSection(chant, section) {
  if (!section) {
    return false;
  }

  const content = normalizeText(
    [chant.title, chant.completeText, ...chant.functions, ...chant.themes, ...chant.fetes].join(" ")
  );

  return content.includes(normalizeText(section.label));
}

function chantMatchesRite(chant, rite) {
  if (!rite || !chant.rites.length) {
    return true;
  }
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
  if (index <= 0) {
    return;
  }

  state.currentSectionKey = sections[index - 1].key;
  markSectionVisited(state.currentSectionKey);
  saveCurrentSheetForRite();
  renderAll();
}

function goToNextSection(fromAutoProgress = false) {
  const sections = getCurrentSections();
  const index = sections.findIndex((section) => section.key === state.currentSectionKey);
  if (index < 0) {
    return;
  }

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
  if (!state.visitedSections.includes(sectionKey)) {
    state.visitedSections.push(sectionKey);
  }
}

function renderFavoritesAlert() {
  const liked = Object.entries(state.likes)
    .filter(([, value]) => value)
    .map(([id]) => state.chantsById.get(id))
    .filter(Boolean)
    .map((chant) => `- ${chant.title}`);

  alert(liked.length ? liked.join("\n") : "Aucun favori pour l’instant.");
}

function uniqueArray(array) {
  return Array.from(new Set(array));
}

function formatDateLongFr(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
