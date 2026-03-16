import { searchChants } from "./rechercheChants.js";
import { selectionChants } from "./selectionChants.js";

let chants = [];

const selectionsParSection = {
  F_ENTREE: [],
  F_OFFRANDE: [],
  F_COMMUNION: [],
  F_ENVOI: [],
};

const SHEET_MAPPING = {
  F_ENTREE: "sheetEntree",
  F_OFFRANDE: "sheetOffrande",
  F_COMMUNION: "sheetCommunion",
  F_ENVOI: "sheetEnvoi",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function chargerChants() {
  const response = await fetch("./chants.json");
  if (!response.ok) {
    throw new Error("Impossible de charger chants.json");
  }

  chants = await response.json();
}

function getContext(section) {
  return {
    fonction: section,
    tempsLiturgique: document.getElementById("tempsLiturgique").value,
    rite: document.getElementById("riteMesse").value,
    themes: [],
  };
}

function getChantPreview(chant) {
  const refrain = asArray(chant?.texte_normalise?.refrain).filter(
    (x) => typeof x === "string" && x.trim()
  );

  if (refrain.length > 0) {
    return refrain[0];
  }

  const texteComplet = String(chant?.texte_normalise?.texte_complet || "").trim();
  if (texteComplet) {
    return texteComplet.slice(0, 120) + (texteComplet.length > 120 ? "…" : "");
  }

  return "";
}

function creerCarteChant(chant, section) {
  const card = document.createElement("div");
  card.className = "chant-card";

  const title = document.createElement("div");
  title.className = "chant-title";
  title.textContent = chant.titre;

  const meta = document.createElement("div");
  meta.className = "chant-meta";
  meta.textContent = getChantPreview(chant);

  card.appendChild(title);
  card.appendChild(meta);

  card.addEventListener("click", () => {
    ajouterChant(section, chant);
  });

  return card;
}

function afficherCartes(container, items, section, extractor = (x) => x) {
  container.innerHTML = "";

  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Aucun résultat.";
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const chant = extractor(item);
    const card = creerCarteChant(chant, section);
    container.appendChild(card);
  });
}

function ajouterChant(section, chant) {
  const dejaPresent = selectionsParSection[section].some((c) => c.id === chant.id);

  if (dejaPresent) {
    return;
  }

  selectionsParSection[section].push(chant);
  rafraichirSelectionSection(section);
  rafraichirFeuille();
}

function supprimerChant(section, chantId) {
  selectionsParSection[section] = selectionsParSection[section].filter((chant) => chant.id !== chantId);
  rafraichirSelectionSection(section);
  rafraichirFeuille();
}

function rafraichirSelectionSection(section) {
  const block = document.querySelector(`.section-block[data-section="${section}"]`);
  const container = block.querySelector(".selected-list");

  container.innerHTML = "";

  const selection = selectionsParSection[section];

  if (selection.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Aucun chant sélectionné.";
    container.appendChild(empty);
    return;
  }

  selection.forEach((chant) => {
    const row = document.createElement("div");
    row.className = "chant-card";

    const title = document.createElement("div");
    title.className = "chant-title";
    title.textContent = chant.titre;

    const removeButton = document.createElement("button");
    removeButton.className = "small-button";
    removeButton.textContent = "Retirer";
    removeButton.addEventListener("click", () => {
      supprimerChant(section, chant.id);
    });

    row.appendChild(title);
    row.appendChild(removeButton);

    container.appendChild(row);
  });
}

function rafraichirFeuille() {
  Object.entries(SHEET_MAPPING).forEach(([section, elementId]) => {
    const container = document.getElementById(elementId);
    const selection = selectionsParSection[section];

    container.innerHTML = "";

    if (selection.length === 0) {
      container.textContent = "Aucun chant sélectionné.";
      container.className = "empty-state";
      return;
    }

    container.className = "";

    selection.forEach((chant) => {
      const div = document.createElement("div");
      div.textContent = chant.titre;
      container.appendChild(div);
    });
  });
}

function genererSuggestions(sectionBlock) {
  const section = sectionBlock.dataset.section;
  const container = sectionBlock.querySelector(".suggestions-list");

  const suggestions = selectionChants(chants, getContext(section), 3);

  afficherCartes(container, suggestions, section, (item) => item.chant);
}

function lancerRecherche(sectionBlock) {
  const section = sectionBlock.dataset.section;
  const input = sectionBlock.querySelector(".search-input");
  const container = sectionBlock.querySelector(".results-list");

  const query = input.value.trim();

  if (query.length < 2) {
    container.innerHTML = "";
    return;
  }

  const resultats = searchChants(chants, query, getContext(section), {}, { maxResults: 10 });

  afficherCartes(container, resultats, section, (item) => item.chant);
}

function connecterRecherche(sectionBlock) {
  const input = sectionBlock.querySelector(".search-input");

  input.addEventListener("input", () => {
    lancerRecherche(sectionBlock);
  });
}

function connecterRefresh(sectionBlock) {
  const refreshButton = sectionBlock.querySelector(".refresh-button");

  refreshButton.addEventListener("click", () => {
    genererSuggestions(sectionBlock);
  });
}

function connecterSection(sectionBlock) {
  connecterRecherche(sectionBlock);
  connecterRefresh(sectionBlock);
  genererSuggestions(sectionBlock);
  rafraichirSelectionSection(sectionBlock.dataset.section);
}

function connecterToutesLesSections() {
  const blocks = document.querySelectorAll(".section-block");
  blocks.forEach((block) => {
    connecterSection(block);
  });
}

function mettreAJourBadgeTemps() {
  const temps = document.getElementById("tempsLiturgique").value;
  const badge = document.getElementById("liturgicalBadge");

  const labels = {
    T_ORDINAIRE: "Temps ordinaire",
    T_AVENT: "Avent",
    T_NOEL: "Noël",
    T_CAREME: "Carême",
    T_PAQUES: "Pâques",
    T_PENTECOTE: "Pentecôte",
    T_TOUS_TEMPS: "Tous temps",
  };

  badge.textContent = labels[temps] || "Temps liturgique";
}

function mettreAJourDateFeuille() {
  const dateInput = document.getElementById("dateMesse").value;
  const sheetDate = document.getElementById("sheetDate");

  if (!dateInput) {
    sheetDate.textContent = "Date non renseignée";
    return;
  }

  const date = new Date(dateInput);
  sheetDate.textContent = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function regenererToutesLesSuggestions() {
  const blocks = document.querySelectorAll(".section-block");
  blocks.forEach((block) => {
    genererSuggestions(block);
    lancerRecherche(block);
  });
}

function connecterParametres() {
  const temps = document.getElementById("tempsLiturgique");
  const rite = document.getElementById("riteMesse");
  const date = document.getElementById("dateMesse");

  temps.addEventListener("change", () => {
    mettreAJourBadgeTemps();
    regenererToutesLesSuggestions();
  });

  rite.addEventListener("change", () => {
    regenererToutesLesSuggestions();
  });

  date.addEventListener("change", () => {
    mettreAJourDateFeuille();
  });
}

async function init() {
  await chargerChants();

  mettreAJourBadgeTemps();
  mettreAJourDateFeuille();
  connecterParametres();
  connecterToutesLesSections();
  rafraichirFeuille();
}

init().catch((error) => {
  console.error(error);
  alert("Erreur au chargement du site. Vérifiez la présence de chants.json.");
});
