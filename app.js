/* ===============================
ETAT GLOBAL
================================ */

const state = {

chants:[],
chantsById:new Map(),

rite:"",
date:"",

liturgicalInfo:null,

currentSectionIndex:0,

selectedBySection:{},

likes:{}

};


/* ===============================
SECTIONS PAR RITE
================================ */

const SECTIONS = {

ordinaire:[
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

extraordinaire:[
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

document.addEventListener("DOMContentLoaded",init);

async function init(){

await loadChants();

restoreLocalState();

bindEvents();

render();

}



/* ===============================
CHARGEMENT CHANTS
================================ */

async function loadChants(){

const res = await fetch("./chants.json");

const data = await res.json();

state.chants = data;

state.chants.forEach(c=>{
state.chantsById.set(c.id,c);
});

}



/* ===============================
EVENEMENTS
================================ */

function bindEvents(){

document.getElementById("dateInput")
.addEventListener("change",onDateChange);

document.querySelectorAll("[data-rite]")
.forEach(btn=>{
btn.addEventListener("click",()=>onRiteSelect(btn.dataset.rite));
});

document.getElementById("prev")
.addEventListener("click",prevSection);

document.getElementById("next")
.addEventListener("click",nextSection);

}



/* ===============================
RITE
================================ */

function onRiteSelect(rite){

state.rite = rite;

state.currentSectionIndex = 0;

updateLiturgicalInfo();

render();

}



/* ===============================
DATE
================================ */

function onDateChange(e){

state.date = e.target.value;

updateLiturgicalInfo();

render();

}



/* ===============================
CALCUL LITURGIQUE
================================ */

function updateLiturgicalInfo(){

if(!state.date || !state.rite) return;

state.liturgicalInfo =
window.calculerTempsLiturgique(state.date,state.rite);

}



/* ===============================
NAVIGATION
================================ */

function prevSection(){

if(state.currentSectionIndex>0){
state.currentSectionIndex--;
render();
}

}

function nextSection(){

state.currentSectionIndex++;

render();

}



/* ===============================
RENDER GLOBAL
================================ */

function render(){

renderSectionTitle();

renderSuggestions();

renderSheet();

}



/* ===============================
TITRE SECTION
================================ */

function renderSectionTitle(){

const section =
SECTIONS[state.rite]?.[state.currentSectionIndex];

document.getElementById("sectionTitle")
.textContent = section || "";

document.getElementById("sectionSubtitle")
.textContent =
state.liturgicalInfo?.display?.title || "";

}



/* ===============================
SUGGESTIONS
================================ */

function renderSuggestions(){

const container = document.getElementById("chants");

container.innerHTML="";

const section =
SECTIONS[state.rite][state.currentSectionIndex];

const suggestions =
getRankedSuggestions(section).slice(0,3);

suggestions.forEach(chant=>{

const card = createChantCard(chant);

container.appendChild(card);

});

}



/* ===============================
ALGORITHME SUGGESTION
================================ */

function getRankedSuggestions(section){

const season = state.liturgicalInfo?.season?.id;

const results = state.chants.map(chant=>{

let score = 0;

if(matchesFunction(chant,section))
score += 100;

if(matchesSeason(chant,season))
score += 60;

if(matchesRite(chant,state.rite))
score += 20;

if(state.likes[chant.id])
score += 80;

return {chant,score};

});

results.sort((a,b)=>b.score-a.score);

const liked =
results.filter(x=>state.likes[x.chant.id]);

if(liked.length){
const topLiked = liked[0];
results.splice(results.indexOf(topLiked),1);
results.unshift(topLiked);
}

return results.map(x=>x.chant);

}



/* ===============================
MATCHERS
================================ */

function matchesFunction(chant,section){

return chant?.liturgie?.fonctions
?.some(f=>normalize(f).includes(normalize(section)));

}

function matchesSeason(chant,season){

if(!season) return true;

return chant?.liturgie?.temps_liturgiques
?.some(t=>normalize(t).includes(normalize(season)));

}

function matchesRite(chant,rite){

return chant?.liturgie?.rites
?.some(r=>normalize(r).includes(normalize(rite)));

}

function normalize(s){

return (s||"")
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"");

}



/* ===============================
CARTE CHANT
================================ */

function createChantCard(chant){

const div = document.createElement("div");

div.className="chant";

const title = document.createElement("div");
title.textContent = chant.titre;

const like = document.createElement("button");
like.textContent = state.likes[chant.id]?"♥":"♡";

like.onclick = ()=>{
state.likes[chant.id]=!state.likes[chant.id];
render();
};

const select = document.createElement("button");
select.textContent="Sélectionner";

select.onclick=()=>selectChant(chant);

div.appendChild(title);
div.appendChild(like);
div.appendChild(select);

return div;

}



/* ===============================
SELECTION CHANT
================================ */

function selectChant(chant){

const section =
SECTIONS[state.rite][state.currentSectionIndex];

if(!state.selectedBySection[section])
state.selectedBySection[section]=[];

state.selectedBySection[section].push(chant.id);

nextSection();

}



/* ===============================
FEUILLE A4
================================ */

function renderSheet(){

const title =
state.liturgicalInfo?.display?.title || "";

const subtitle =
state.liturgicalInfo?.display?.subtitle || "";

document.getElementById("sheetTitle").textContent = title;

document.getElementById("sheetSubtitle").textContent = subtitle;

const container = document.getElementById("sheetContent");

container.innerHTML="";

Object.entries(state.selectedBySection)
.forEach(([section,chants])=>{

const block = document.createElement("div");

const h = document.createElement("h3");
h.textContent = section;

block.appendChild(h);

chants.forEach(id=>{

const chant = state.chantsById.get(id);

const line = document.createElement("div");

line.textContent = chant.titre;

block.appendChild(line);

});

container.appendChild(block);

});

}



/* ===============================
LOCAL STORAGE
================================ */

function restoreLocalState(){

const raw = localStorage.getItem("fdm_state");

if(!raw) return;

try{

const saved = JSON.parse(raw);

state.likes = saved.likes || {};

}catch{}

}

function saveLocalState(){

localStorage.setItem("fdm_state",JSON.stringify({

likes:state.likes

}));

}
