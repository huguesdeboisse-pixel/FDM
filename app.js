import { searchChants } from "./rechercheChants.js";

let chants = [];

const sections = {
  F_ENTREE: [],
  F_OFFRANDE: [],
  F_COMMUNION: [],
  F_ENVOI: []
};

const context = {
  fonction: null,
  tempsLiturgique: "T_ORDINAIRE",
  rite: "R_ORDINAIRE"
};

async function chargerChants() {
  const response = await fetch("./chants.json");
  chants = await response.json();
}

function getContext(section) {
  return {
    fonction: section,
    tempsLiturgique: document.getElementById("tempsLiturgique").value,
    rite: document.getElementById("riteMesse").value
  };
}

function creerCarteChant(chant, section) {

  const card = document.createElement("div");
  card.className = "chant-card";

  const title = document.createElement("div");
  title.className = "chant-title";
  title.textContent = chant.titre;

  card.appendChild(title);

  card.addEventListener("click", () => {
    ajouterChant(section, chant);
  });

  return card;
}

function afficherResultats(container, resultats, section) {

  container.innerHTML = "";

  resultats.forEach((r) => {
    const card = creerCarteChant(r.chant, section);
    container.appendChild(card);
  });
}

function ajouterChant(section, chant) {

  sections[section].push(chant);

  rafraichirFeuille();
}

function rafraichirFeuille() {

  const mapping = {
    F_ENTREE: "sheetEntree",
    F_OFFRANDE: "sheetOffrande",
    F_COMMUNION: "sheetCommunion",
    F_ENVOI: "sheetEnvoi"
  };

  Object.keys(mapping).forEach((section) => {

    const container = document.getElementById(mapping[section]);
    container.innerHTML = "";

    if (sections[section].length === 0) {
      container.textContent = "Aucun chant sélectionné.";
      return;
    }

    sections[section].forEach((chant) => {

      const div = document.createElement("div");
      div.textContent = chant.titre;

      container.appendChild(div);

    });

  });
}

function connecterRecherche(sectionBlock) {

  const section = sectionBlock.dataset.section;

  const input = sectionBlock.querySelector(".search-input");
  const results = sectionBlock.querySelector(".results-list");

  input.addEventListener("input", () => {

    const query = input.value.trim();

    if (query.length < 2) {
      results.innerHTML = "";
      return;
    }

    const resultats = searchChants(
      chants,
      query,
      getContext(section),
      {},
      { maxResults: 10 }
    );

    afficherResultats(results, resultats, section);

  });

}

function connecterSections() {

  const blocks = document.querySelectorAll(".section-block");

  blocks.forEach((block) => {
    connecterRecherche(block);
  });

}

function connecterParametres() {

  const temps = document.getElementById("tempsLiturgique");

  temps.addEventListener("change", () => {

    const badge = document.getElementById("liturgicalBadge");

    const labels = {
      T_ORDINAIRE: "Temps ordinaire",
      T_AVENT: "Avent",
      T_NOEL: "Noël",
      T_CAREME: "Carême",
      T_PAQUES: "Pâques",
      T_PENTECOTE: "Pentecôte",
      T_TOUS_TEMPS: "Tous temps"
    };

    badge.textContent = labels[temps.value] || "";

  });

  const dateInput = document.getElementById("dateMesse");

  dateInput.addEventListener("change", () => {

    const date = dateInput.value;

    const sheetDate = document.getElementById("sheetDate");

    if (!date) {
      sheetDate.textContent = "Date non renseignée";
      return;
    }

    const d = new Date(date);

    sheetDate.textContent = d.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

  });

}

async function init() {

  await chargerChants();

  connecterSections();

  connecterParametres();

}

init();
