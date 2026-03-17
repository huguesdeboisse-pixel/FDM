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
  likes: {}
};

/* ===============================
SECTIONS PAR RITE
================================ */

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

/* ===============================
INITIALISATION
================================ */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadChants();

  restoreLocalState();
  ensureDefaultDate();
  updateLiturgicalInfo();

  bindEvents();
  render();

  if (state.rite) {
    showScreen(2);
  } else {
    showScreen(1);
  }
}

/* ===============================
CHARGEMENT CHANTS
================================ */

async function loadChants() {
  const res = await fetch("./chants.json");
  const data = await res.json();

  state.chants = Array.isArray(data) ? data : [];

  state.chants.forEach((chant) => {
    state.chantsById.set(chant.id, chant);
  });
}

/* ===============================
EVENEMENTS
================================ */

function bindEvents() {
  const dateInput = document.getElementById("dateInput");
  if (dateInput) {
    dateInput.addEventListener("change", onDateChange);
  }

  document.querySelectorAll("[data-rite]").forEach((btn) => {
    btn.addEventListener("click", () => onRiteSelect(btn.dataset.rite));
  });

  const prevBtn = document.getElementById("prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", prevSection);
  }

  const nextBtn = document.getElementById("next");
  if (nextBtn) {
    nextBtn.addEventListener("click", nextSection);
  }

  const backBtn = document.getElementById("backToSetup");
  if (backBtn) {
    backBtn.addEventListener("click", () => showScreen(1));
  }

  bindDateCard();
}

/* ===============================
DATE : CARTOUCHE CLIQUABLE
================================ */

function bindDateCard() {
  const card = document.getElementById("dateCard");
  const input = document.getElementById("dateInput");

  if (!card || !input) return;

  const openPicker = () => {
    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
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
RITE
================================ */

function onRiteSelect(rite) {
  if (!SECTIONS[rite]) return;

  state.rite = rite;
  state.currentSectionIndex = 0;

  updateLiturgicalInfo();
  saveLocalState();
  render();
  showScreen(2);
}

/* ===============================
DATE
================================ */

function onDateChange(e) {
  state.date = e.target.value || "";

  updateLiturgicalInfo();
  saveLocalState();
  render();
}

/* ===============================
AIDE DATE
================================ */

function ensureDefaultDate() {
  const input = document.getElementById("dateInput");
  if (!input) return;

  if (state.date) {
    input.value = state.date;
    return;
  }

  const nextSunday = getNextSunday();
  state.date = nextSunday;
  input.value = nextSunday;
}

function getNextSunday() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const day = date.getDay();
  const offset = day === 0 ? 7 : 7 - day;

  date.setDate(date.getDate() + offset);

  return toISODate(date);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ===============================
CALCUL LITURGIQUE
================================ */

function updateLiturgicalInfo() {
  if (!state.rite) {
    state.liturgicalInfo = null;
    return;
  }

  const effectiveDate = state.date || getNextSunday();

  if (typeof window.calculerTempsLiturgique !== "function") {
    state.liturgicalInfo = null;
    return;
  }

  try {
    state.liturgicalInfo = window.calculerTempsLiturgique(effectiveDate, state.rite);
  } catch (error) {
    console.error("Erreur de calcul liturgique :", error);
    state.liturgicalInfo = null;
  }
}

/* ===============================
NAVIGATION ECRANS
================================ */

function showScreen(screenNumber) {
  const screen1 = document.getElementById("screen1");
  const screen2 = document.getElementById("screen2");

  if (screen1) {
    screen1.classList.toggle("active", screenNumber === 1);
  }

  if (screen2) {
    screen2.classList.toggle("active", screenNumber === 2);
  }
}

/* ===============================
NAVIGATION SECTIONS
================================ */

function prevSection() {
  if (!state.rite) return;

  if (state.currentSectionIndex > 0) {
    state.currentSectionIndex--;
    saveLocalState();
    render();
  }
}

function nextSection() {
  if (!state.rite) return;

  const maxIndex = SECTIONS[state.rite].length - 1;

  if (state.currentSectionIndex < maxIndex) {
    state.currentSectionIndex++;
    saveLocalState();
    render();
  }
}

/* ===============================
RENDER GLOBAL
================================ */

function render() {
  renderSectionTitle();
  renderSuggestions();
  renderSheet();
  renderSummary();
  renderSectionsList();
}

/* ===============================
TITRE SECTION
================================ */

function renderSectionTitle() {
  const titleEl = document.getElementById("sectionTitle");
  const subtitleEl = document.getElementById("sectionSubtitle");

  if (!titleEl || !subtitleEl) return;

  const section = SECTIONS[state.rite]?.[state.currentSectionIndex];

  titleEl.textContent = section || "";
  subtitleEl.textContent = state.liturgicalInfo?.display?.title || "";
}

/* ===============================
SUGGESTIONS
================================ */

function renderSuggestions() {
  const container = document.getElementById("chants");
  if (!container) return;

  container.innerHTML = "";

  if (!state.rite) return;

  const section = SECTIONS[state.rite]?.[state.currentSectionIndex];
  if (!section) return;

  const suggestions = getRankedSuggestions(section).slice(0, 3);

  suggestions.forEach((chant) => {
    const card = createChantCard(chant);
    container.appendChild(card);
  });
}

/* ===============================
ALGORITHME SUGGESTION
================================ */

function getRankedSuggestions(section) {
  const season = state.liturgicalInfo?.season?.id;

  const results = state.chants.map((chant) => {
    let score = 0;

    if (matchesFunction(chant, section)) score += 100;
    if (matchesSeason(chant, season)) score += 60;
    if (matchesRite(chant, state.rite)) score += 20;
    if (state.likes[chant.id]) score += 80;

    const quality = Number(chant?.qualite_annotation || chant?.qualite || 0);
    score += quality;

    return { chant, score };
  });

  results.sort((a, b) => b.score - a.score);

  const liked = results.filter((x) => state.likes[x.chant.id]);
  if (liked.length) {
    const topLiked = liked[0];
    results.splice(results.indexOf(topLiked), 1);
    results.unshift(topLiked);
  }

  return results.map((x) => x.chant);
}

/* ===============================
MATCHERS
================================ */

function matchesFunction(chant, section) {
  return chant?.liturgie?.fonctions?.some((f) =>
    normalize(f).includes(normalize(section))
  );
}

function matchesSeason(chant, season) {
  if (!season) return true;

  return chant?.liturgie?.temps_liturgiques?.some((t) =>
    normalize(t).includes(normalize(season))
  );
}

function matchesRite(chant, rite) {
  if (!rite) return true;

  return chant?.liturgie?.rites?.some((r) =>
    normalize(r).includes(normalize(rite))
  );
}

function normalize(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ===============================
CARTE CHANT
================================ */

function createChantCard(chant) {
  const div = document.createElement("div");
  div.className = "chant";

  const title = document.createElement("div");
  title.className = "chant-title";
  title.textContent = chant.titre || "Sans titre";

  const actions = document.createElement("div");
  actions.className = "chant-actions";

  const like = document.createElement("button");
  like.type = "button";
  like.textContent = state.likes[chant.id] ? "♥" : "♡";
  like.title = "Ajouter aux favoris";

  like.onclick = () => {
    state.likes[chant.id] = !state.likes[chant.id];
    saveLocalState();
    render();
  };

  const select = document.createElement("button");
  select.type = "button";
  select.textContent = "Sélectionner";
  select.onclick = () => selectChant(chant);

  actions.appendChild(like);
  actions.appendChild(select);

  div.appendChild(title);
  div.appendChild(actions);

  return div;
}

/* ===============================
SELECTION CHANT
================================ */

function selectChant(chant) {
  const section = SECTIONS[state.rite]?.[state.currentSectionIndex];
  if (!section) return;

  if (!state.selectedBySection[section]) {
    state.selectedBySection[section] = [];
  }

  if (!state.selectedBySection[section].includes(chant.id)) {
    state.selectedBySection[section].push(chant.id);
  }

  saveLocalState();
  nextSection();
}

/* ===============================
FEUILLE A4
================================ */

function renderSheet() {
  const titleEl = document.getElementById("sheetTitle");
  const subtitleEl = document.getElementById("sheetSubtitle");
  const container = document.getElementById("sheetContent");

  if (!titleEl || !subtitleEl || !container) return;

  titleEl.textContent = state.liturgicalInfo?.display?.title || "";
  subtitleEl.textContent = state.liturgicalInfo?.display?.subtitle || "";

  container.innerHTML = "";

  Object.entries(state.selectedBySection).forEach(([section, chants]) => {
    const block = document.createElement("div");
    block.className = "sheet-section";

    const h = document.createElement("h3");
    h.textContent = section;
    block.appendChild(h);

    chants.forEach((id) => {
      const chant = state.chantsById.get(id);
      if (!chant) return;

      const line = document.createElement("div");
      line.textContent = chant.titre || "Sans titre";
      block.appendChild(line);
    });

    container.appendChild(block);
  });
}

/* ===============================
RESUME COLONNE 1
================================ */

function renderSummary() {
  const container = document.getElementById("summary");
  if (!container) return;

  const riteLabel =
    state.rite === "ordinaire"
      ? "Rite ordinaire"
      : state.rite === "extraordinaire"
      ? "Rite extraordinaire"
      : "Non choisi";

  container.innerHTML = `
    <div class="summary-title">Résumé</div>
    <div class="summary-line"><strong>Rite :</strong> ${riteLabel}</div>
    <div class="summary-line"><strong>Date :</strong> ${formatDateFr(state.date)}</div>
  `;
}

function renderSectionsList() {
  const container = document.getElementById("sections");
  if (!container) return;

  container.innerHTML = "";

  const sections = SECTIONS[state.rite] || [];

  sections.forEach((section, index) => {
    const item = document.createElement("div");
    item.className = "section-pill" + (index === state.currentSectionIndex ? " active" : "");
    item.textContent = section;
    container.appendChild(item);
  });
}

function formatDateFr(isoDate) {
  if (!isoDate) return "Non renseignée";

  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;

  return `${d}/${m}/${y}`;
}

/* ===============================
LOCAL STORAGE
================================ */

function restoreLocalState() {
  const raw = localStorage.getItem("fdm_state");
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);

    state.likes = saved.likes || {};
    state.date = saved.date || "";
    state.rite = saved.rite || "";
    state.currentSectionIndex = Number.isInteger(saved.currentSectionIndex)
      ? saved.currentSectionIndex
      : 0;
    state.selectedBySection = saved.selectedBySection || {};
  } catch (error) {
    console.warn("Échec de restauration du localStorage :", error);
  }
}

function saveLocalState() {
  localStorage.setItem(
    "fdm_state",
    JSON.stringify({
      likes: state.likes,
      date: state.date,
      rite: state.rite,
      currentSectionIndex: state.currentSectionIndex,
      selectedBySection: state.selectedBySection
    })
  );
}
