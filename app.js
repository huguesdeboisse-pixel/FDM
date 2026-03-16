const STORAGE_KEY = "fdm_state_v2";

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
    season: "Non déterminé",
    celebration: "",
  },

  selectedCarnets: [],
  currentSectionKey: "",
  visitedSections: [],
  selectedBySection: {},
  visibleSuggestionsBySection: {},
  expandedCardsBySection: {},
  likes: {},
  favoritesPanelOpen: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  restoreState();
  bindEvents();
  await loadChants();
  initializeDefaultDateIfNeeded();
  updateLiturgicalInfo();
  ensureSectionState();
  renderAll();
});

function cacheElements() {
  els.dateInput = document.getElementById("date-input");
  els.riteButtons = Array.from(document.querySelectorAll("[data-rite]"));
  els.liturgicalSummary = document.getElementById("liturgical-summary");

  els.carnetSearch = document.getElementById("carnet-search");
  els.selectedCarnets = document.getElementById("selected-carnets");
  els.carnetsResults = document.getElementById("carnets-results");
  els.clearCarnetsButton = document.getElementById("clear-carnets-button");

  els.favoritesBlock = document.getElementById("favorites-block");
  els.favoritesContent = document.getElementById("favorites-content");
  els.toggleFavoritesButton = document.getElementById("toggle-favorites-button");
  els.reportIssueButton = document.getElementById("report-issue-button");

  els.sectionsNavBlock = document.getElementById("sections-nav-block");
  els.sectionsNav = document.getElementById("sections-nav");

  els.currentSectionTitle = document.getElementById("current-section-title");
  els.currentSectionSubtitle = document.getElementById("current-section-subtitle");
  els.kyrialeBadge = document.getElementById("kyriale-badge");

  els.mainEmptyState = document.getElementById("main-empty-state");
  els.sectionWorkspace = document.getElementById("section-workspace");
  els.chantSearch = document.getElementById("chant-search");
  els.searchOverlay = document.getElementById("search-overlay");
  els.searchOverlayLabel = document.getElementById("search-overlay-label");
  els.searchResults = document.getElementById("search-results");
  els.closeSearchOverlay = document.getElementById("close-search-overlay");
  els.refreshButton = document.getElementById("refresh-button");
  els.chantsList = document.getElementById("chants-list");
  els.previousSectionButton = document.getElementById("previous-section-button");
  els.skipSectionButton = document.getElementById("skip-section-button");

  els.sheetMeta = document.getElementById("sheet-meta");
  els.sheetBody = document.getElementById("sheet-body");
  els.downloadButton = document.getElementById("download-button");
}

function bindEvents() {
  els.dateInput.addEventListener("change", (event) => {
    state.date = event.target.value || "";
    updateLiturgicalInfo();
    ensureSectionState();
    saveState();
    renderAll();
  });

  els.riteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextRite = button.dataset.rite;
      if (state.rite !== nextRite) {
        state.rite = nextRite;
        resetSectionProgressForNewRite();
        updateLiturgicalInfo();
        ensureSectionState();
        saveState();
        renderAll();
      }
    });
  });

  els.carnetSearch.addEventListener("input", () => {
    renderCarnets();
  });

  els.clearCarnetsButton.addEventListener("click", () => {
    state.selectedCarnets = [];
    saveState();
    renderAll();
  });

  els.toggleFavoritesButton.addEventListener("click", () => {
    state.favoritesPanelOpen = !state.favoritesPanelOpen;
    renderFavorites();
    saveState();
  });

  els.reportIssueButton.addEventListener("click", () => {
    const message = [
      "Fonction à brancher plus tard :",
      "",
      "vous pourrez ici ouvrir un formulaire, un mailto:,",
      "ou une petite fenêtre de signalement."
    ].join("\n");
    alert(message);
  });

  els.chantSearch.addEventListener("input", () => {
    renderSearchOverlay();
  });

  els.closeSearchOverlay.addEventListener("click", () => {
    els.chantSearch.value = "";
    renderSearchOverlay();
  });

  els.refreshButton.addEventListener("click", () => {
    if (!state.currentSectionKey) return;
    appendSuggestionsForCurrentSection(3);
    saveState();
    renderSectionWorkspace();
  });

  els.previousSectionButton.addEventListener("click", () => {
    goToPreviousSection();
  });

  els.skipSectionButton.addEventListener("click", () => {
    goToNextSection();
  });

  els.downloadButton.addEventListener("click", () => {
    window.print();
  });

  document.addEventListener("click", (event) => {
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
    if (!response.ok) {
      throw new Error("Impossible de charger chants.json");
    }

    const data = await response.json();
    const chants = Array.isArray(data) ? data : Array.isArray(data.chants) ? data.chants : [];

    state.chants = chants.map(normalizeChant).filter(Boolean);
    state.chantsById = new Map(state.chants.map((chant) => [chant.id, chant]));
    state.carnetNames = extractCarnetNames(state.chants);
    state.loading = false;
  } catch (error) {
    console.error(error);
    state.loading = false;
    alert("Erreur lors du chargement de chants.json. Vérifiez que le fichier est bien à la racine du projet.");
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

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);

    state.rite = parsed.rite || "";
    state.date = parsed.date || "";
    state.selectedCarnets = Array.isArray(parsed.selectedCarnets) ? parsed.selectedCarnets : [];
    state.currentSectionKey = parsed.currentSectionKey || "";
    state.visitedSections = Array.isArray(parsed.visitedSections) ? parsed.visitedSections : [];
    state.selectedBySection = parsed.selectedBySection || {};
    state.visibleSuggestionsBySection = parsed.visibleSuggestionsBySection || {};
    state.expandedCardsBySection = parsed.expandedCardsBySection || {};
    state.likes = parsed.likes || {};
    state.favoritesPanelOpen = Boolean(parsed.favoritesPanelOpen);
  } catch (error) {
    console.warn("Impossible de restaurer l’état local :", error);
  }
}

function saveState() {
  const serializable = {
    rite: state.rite,
    date: state.date,
    selectedCarnets: state.selectedCarnets,
    currentSectionKey: state.currentSectionKey,
    visitedSections: state.visitedSections,
    selectedBySection: state.selectedBySection,
    visibleSuggestionsBySection: state.visibleSuggestionsBySection,
    expandedCardsBySection: state.expandedCardsBySection,
    likes: state.likes,
    favoritesPanelOpen: state.favoritesPanelOpen,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

function initializeDefaultDateIfNeeded() {
  if (state.date) {
    els.dateInput.value = state.date;
    return;
  }

  const nextSunday = getNextSundayISO();
  state.date = nextSunday;
  els.dateInput.value = nextSunday;
  saveState();
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
      season: "Non déterminé",
      celebration: "Date non renseignée",
    };
  }

  if (typeof window.calculerTempsLiturgique === "function") {
    try {
      const result = window.calculerTempsLiturgique(dateStr, rite);
      return {
        season: result?.season || result?.temps || "Non déterminé",
        celebration: result?.celebration || result?.fete || "",
      };
    } catch (error) {
      console.warn("calculerTempsLiturgique a échoué, fallback utilisé.", error);
    }
  }

  return fallbackLiturgicalInfo(dateStr);
}

function fallbackLiturgicalInfo(dateStr) {
  const date = new Date(dateStr + "T12:00:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let season = "Temps ordinaire";

  if ((month === 12 && day >= 1) || (month === 1 && day <= 13)) {
    season = "Temps de Noël";
  } else if (month === 2 || (month === 3 && day < 20)) {
    season = "Carême";
  } else if ((month === 3 && day >= 20) || month === 4 || (month === 5 && day <= 20)) {
    season = "Temps pascal";
  } else if (month === 11 || (month === 12 && day < 1)) {
    season = "Avent";
  }

  return {
    season,
    celebration: "Célébration du jour à intégrer plus finement",
  };
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

function resetSectionProgressForNewRite() {
  state.currentSectionKey = "";
  state.visitedSections = [];
  state.selectedBySection = {};
  state.visibleSuggestionsBySection = {};
  state.expandedCardsBySection = {};
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
  renderFavorites();
  renderSectionsNav();
  renderMainArea();
  renderSheet();
}

function renderRiteButtons() {
  els.riteButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.rite === state.rite);
  });
}

function renderLiturgicalSummary() {
  const parts = [state.liturgicalInfo.season || "Non déterminé"];
  if (state.liturgicalInfo.celebration) {
    parts.push(state.liturgicalInfo.celebration);
  }
  els.liturgicalSummary.textContent = parts.join(" — ");
}

function renderCarnets() {
  const query = els.carnetSearch.value.trim().toLowerCase();

  els.selectedCarnets.innerHTML = "";
  if (state.selectedCarnets.length === 0) {
    const note = document.createElement("div");
    note.className = "muted-note";
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
      removeButton.addEventListener("click", () => {
        toggleCarnet(name);
      });
      chip.appendChild(removeButton);
      els.selectedCarnets.appendChild(chip);
    });
  }

  els.carnetsResults.innerHTML = "";

  const filtered = state.carnetNames.filter((name) =>
    name.toLowerCase().includes(query)
  );

  filtered.slice(0, 12).forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sommaire-item";
    if (state.selectedCarnets.includes(name)) {
      button.classList.add("current");
    }

    const label = document.createElement("span");
    label.textContent = name;

    const stateLabel = document.createElement("span");
    stateLabel.className = "sommaire-state";
    stateLabel.textContent = state.selectedCarnets.includes(name) ? "Sélectionné" : "Ajouter";

    button.appendChild(label);
    button.appendChild(stateLabel);

    button.addEventListener("click", () => {
      toggleCarnet(name);
    });

    els.carnetsResults.appendChild(button);
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted-note";
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
  saveState();
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

function renderFavorites() {
  els.favoritesBlock.classList.toggle("hidden", !state.favoritesPanelOpen);
  if (!state.favoritesPanelOpen) return;

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
    block.style.marginBottom = "12px";

    const title = document.createElement("div");
    title.style.fontWeight = "700";
    title.style.marginBottom = "6px";
    title.textContent =
      getSectionByKey(sectionKey)?.label || (sectionKey === "autres" ? "Autres" : sectionKey);

    const list = document.createElement("div");
    chants
      .sort((a, b) => a.title.localeCompare(b.title, "fr"))
      .forEach((chant) => {
        const item = document.createElement("div");
        item.className = "muted-note";
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

function renderSectionsNav() {
  const sections = getCurrentSections();
  const shouldShow = sections.length > 0 && state.visitedSections.length > 0;
  els.sectionsNavBlock.classList.toggle("hidden", !shouldShow);
  els.sectionsNav.innerHTML = "";

  if (!shouldShow) return;

  const visibleVisited = sections.filter((section) => state.visitedSections.includes(section.key));

  visibleVisited.forEach((section) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sommaire-item";
    if (section.key === state.currentSectionKey) button.classList.add("current");
    if ((state.selectedBySection[section.key] || []).length > 0) button.classList.add("completed");

    const label = document.createElement("span");
    label.textContent = section.label;

    const stateLabel = document.createElement("span");
    stateLabel.className = "sommaire-state";
    stateLabel.textContent = (state.selectedBySection[section.key] || []).length > 0 ? "✓" : "";

    button.appendChild(label);
    button.appendChild(stateLabel);

    button.addEventListener("click", () => {
      state.currentSectionKey = section.key;
      markSectionVisited(section.key);
      saveState();
      renderAll();
    });

    els.sectionsNav.appendChild(button);
  });
}

function renderMainArea() {
  const sections = getCurrentSections();

  if (!state.rite || sections.length === 0) {
    els.mainEmptyState.classList.remove("hidden");
    els.sectionWorkspace.classList.add("hidden");
    els.currentSectionTitle.textContent = "Choisissez d’abord une date et un rite";
    els.currentSectionSubtitle.textContent = "La première section apparaîtra automatiquement ensuite.";
    els.kyrialeBadge.classList.add("hidden");
    return;
  }

  els.mainEmptyState.classList.add("hidden");
  els.sectionWorkspace.classList.remove("hidden");
  renderSectionWorkspace();
}

function renderSectionWorkspace() {
  const section = getSectionByKey(state.currentSectionKey);
  if (!section) return;

  const season = state.liturgicalInfo.season || "Non déterminé";
  const celebration = state.liturgicalInfo.celebration || "";

  els.currentSectionTitle.textContent = section.label;

  const subtitleParts = [`Temps liturgique : ${season}`];
  if (celebration) subtitleParts.push(celebration);
  els.currentSectionSubtitle.textContent = subtitleParts.join(" — ");

  renderKyrialeBadge(section);
  renderSearchOverlay();
  renderCards();
}

function renderKyrialeBadge(section) {
  if (!section.kyrialePart) {
    els.kyrialeBadge.classList.add("hidden");
    els.kyrialeBadge.textContent = "";
    return;
  }

  const uniformKyriale = inferUniformKyrialeChoice();
  if (!uniformKyriale) {
    els.kyrialeBadge.classList.remove("hidden");
    els.kyrialeBadge.textContent = "Mode du Kyriale : homogène par défaut, personnalisable.";
    return;
  }

  els.kyrialeBadge.classList.remove("hidden");
  els.kyrialeBadge.textContent = `Kyriale sélectionné par défaut : ${uniformKyriale}`;
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
  const allSame = kyrialePattern.every((value) => value === first);
  return allSame ? first : "";
}

function renderSearchOverlay() {
  const section = getSectionByKey(state.currentSectionKey);
  const query = els.chantSearch.value.trim();

  if (!query || !section) {
    els.searchOverlay.classList.add("hidden");
    els.searchResults.innerHTML = "";
    return;
  }

  const results = searchChants(query, section.key).slice(0, 12);
  els.searchOverlay.classList.remove("hidden");
  els.searchOverlayLabel.textContent = `${results.length} résultat(s)`;

  els.searchResults.innerHTML = "";

  if (results.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted-note";
    empty.style.padding = "14px";
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
      <div style="color:#6e6a63; margin-top:4px; font-size:0.92rem;">
        ${escapeHtml(chant.carnet || "Carnet non précisé")}
      </div>
    `;

    button.addEventListener("click", () => {
      injectSearchResultIntoCurrentSection(chant.id);
    });

    els.searchResults.appendChild(button);
  });
}

function renderCards() {
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
    empty.className = "empty-state";
    empty.textContent = "Aucune suggestion pour cette section pour l’instant.";
    els.chantsList.appendChild(empty);
  } else {
    chants.forEach((chant) => {
      els.chantsList.appendChild(createChantCard(chant, section));
    });
  }

  const currentIndex = getCurrentSections().findIndex((item) => item.key === section.key);
  els.previousSectionButton.disabled = currentIndex <= 0;
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
  contentButton.addEventListener("click", () => {
    toggleExpanded(section.key, chant.id);
  });

  const heartButton = document.createElement("button");
  heartButton.type = "button";
  heartButton.className = `heart-button${isLiked ? " liked" : ""}`;
  heartButton.textContent = isLiked ? "♥" : "♡";
  heartButton.title = isLiked ? "Retirer des favoris" : "Ajouter aux favoris";
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

  if (chant.refrain) {
    parts.push(`<strong>${escapeHtml(chant.refrain)}</strong>`);
  }

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

  if (section.kyrialePart) {
    const title = chant.title.toLowerCase();
    if (title.includes("messe") || title.includes("kyriale")) {
      meta.push("Pièce de messe");
    }
  }

  if (chant.qualityScore) {
    meta.push(`Confiance ${Math.round(chant.qualityScore)}`);
  }

  return meta.join(" — ") || "Chant disponible";
}

function toggleExpanded(sectionKey, chantId) {
  const list = new Set(state.expandedCardsBySection[sectionKey] || []);
  if (list.has(chantId)) {
    list.delete(chantId);
  } else {
    list.add(chantId);
  }
  state.expandedCardsBySection[sectionKey] = Array.from(list);
  saveState();
  renderSectionWorkspace();
}

function toggleLike(chantId) {
  state.likes[chantId] = !state.likes[chantId];
  recomputeAllSuggestions();
  saveState();
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

  if (!wasSelected) {
    goToNextSection(true);
  }

  saveState();
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
  saveState();
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

      const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
      queryWords.forEach((word) => {
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

  const functionText = [
    ...chant.functions,
    ...chant.themes,
    ...chant.fetes,
  ].join(" ");

  return section.liturgyKeys.some((key) => functionText.includes(key.toLowerCase()));
}

function chantMatchesSeason(chant, seasonLabel) {
  if (!seasonLabel || seasonLabel === "Non déterminé") return true;
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
  saveState();
  renderAll();
}

function goToNextSection(fromAutoProgress = false) {
  const sections = getCurrentSections();
  const index = sections.findIndex((section) => section.key === state.currentSectionKey);
  if (index < 0) return;

  const next = sections[index + 1];
  if (!next) {
    if (!fromAutoProgress) {
      saveState();
      renderAll();
    }
    return;
  }

  state.currentSectionKey = next.key;
  markSectionVisited(next.key);
  saveState();
  renderAll();
}

function markSectionVisited(sectionKey) {
  if (!sectionKey) return;
  if (!state.visitedSections.includes(sectionKey)) {
    state.visitedSections.push(sectionKey);
  }
}

function renderSheet() {
  const sections = getCurrentSections();

  const metaParts = [];
  if (state.date) metaParts.push(`Date : ${formatDateFr(state.date)}`);
  if (state.rite) metaParts.push(RITE_CONFIG[state.rite]?.label || state.rite);
  if (state.liturgicalInfo?.season) metaParts.push(state.liturgicalInfo.season);
  if (state.liturgicalInfo?.celebration) metaParts.push(state.liturgicalInfo.celebration);

  els.sheetMeta.textContent = metaParts.length
    ? metaParts.join(" — ")
    : "La feuille se construira ici au fur et à mesure.";

  els.sheetBody.innerHTML = "";

  const hasAnySelection = sections.some(
    (section) => (state.selectedBySection[section.key] || []).length > 0
  );

  if (!hasAnySelection) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
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
      up.title = "Monter";
      up.textContent = "↑";
      up.disabled = index === 0;
      up.addEventListener("click", () => moveSelectedChant(section.key, index, -1));

      const down = document.createElement("button");
      down.type = "button";
      down.className = "icon-button";
      down.title = "Descendre";
      down.textContent = "↓";
      down.disabled = index === selectedIds.length - 1;
      down.addEventListener("click", () => moveSelectedChant(section.key, index, 1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.title = "Retirer";
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        toggleSelection(section.key, id);
      });

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

  const temp = list[index];
  list[index] = list[newIndex];
  list[newIndex] = temp;

  state.selectedBySection[sectionKey] = list;
  saveState();
  renderSheet();
}

function formatDateFr(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate + "T12:00:00");
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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
