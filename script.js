// === Referências de DOM ===
const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d");
const categoryList = document.getElementById("categoryList");
const btnSave = document.getElementById("btnSave");

// === Configuração ===
const ROOT_PATH = "assets/";
const CHARACTER_TYPES = ["female", "male", "female-mature", "male-mature", "female-pose"];
const CATEGORIES = ["base", "eyes", "hair_front", "hair_back", "outfit", "accessory", "blush"];

let allLayers = {};
let layers = {};
let selected = {};
let currentCharacter = "female";
const imgCache = new Map();

// === Configuração dos olhos ===
const EYE_KEYS = {
  default: "eyes",
  green: "eye-verde",
  lilac: "eye-lilas",
  brown: "eye-marrom",
};
let eyeKey = EYE_KEYS.default;

// === Sistema de saves ===
const SAVE_KEY = "otome_saves";
let saves = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");

// ------------------------------------------------------------
// util: carrega imagem com cache
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
  imgCache.set(src, p);
  return p;
}

// ------------------------------------------------------------
// carrega manifesto
async function loadManifest() {
  const resp = await fetch("assets_manifest.json");
  allLayers = await resp.json();
  applyCharacter(currentCharacter);
}

// ------------------------------------------------------------
function applyCharacter(charType) {
  currentCharacter = charType;
  layers = allLayers[currentCharacter] || {};
  selected = {};
  eyeKey = EYE_KEYS.default;
  renderCharacterSelector();
  renderUI();
  renderSavesUI();
  redraw();
}

// ------------------------------------------------------------
// seletor de personagem
function renderCharacterSelector() {
  const old = document.querySelector(".character-selector");
  if (old) old.remove();

  const selectorDiv = document.createElement("div");
  selectorDiv.className = "character-selector";
  selectorDiv.innerHTML = `<h3>🧬 Tipo de Personagem</h3>`;

  CHARACTER_TYPES.forEach((type) => {
    const btn = document.createElement("button");
    btn.textContent = type.replace("-", " ");
    btn.className = "char-btn" + (type === currentCharacter ? " active" : "");
    btn.onclick = () => applyCharacter(type);
    selectorDiv.appendChild(btn);
  });

  categoryList.before(selectorDiv);
}

// ------------------------------------------------------------
// Obter arquivos da categoria (inclui variantes dos olhos)
function getFilesForCategory(cat) {
  if (cat !== "eyes") return layers[cat] || [];
  const key =
    currentCharacter === "female-pose" && layers[eyeKey]
      ? eyeKey
      : "eyes";
  return layers[key] || [];
}

// ------------------------------------------------------------
// Monta categoria
function renderCategory(cat) {
  const div = document.createElement("div");
  div.className = "category";
  div.innerHTML = `<h3>${cat.replace("_", " ")}</h3><div class="option-list" id="opt-${cat}"></div>`;
  categoryList.appendChild(div);

  const optDiv = div.querySelector(".option-list");

  // botão limpar
  const noneBtn = document.createElement("div");
  noneBtn.className = "option";
  noneBtn.title = "Remover";
  noneBtn.innerHTML = `<span style="color:#888;font-size:20px;">✖</span>`;
  noneBtn.onclick = () => {
    delete selected[cat];
    renderSelection(cat);
    redraw();
  };
  optDiv.appendChild(noneBtn);

  const files = getFilesForCategory(cat);
  const folderToUse =
    cat === "eyes" && currentCharacter === "female-pose" ? eyeKey : cat;

  files.forEach((file) => {
    const src = `${ROOT_PATH}${currentCharacter}/${folderToUse}/${file}`;
    const option = document.createElement("div");
    option.className = "option";
    const img = document.createElement("img");
    img.src = src;
    option.appendChild(img);
    option.onclick = () => {
      selected[cat] = src;
      renderSelection(cat);
      redraw();
    };
    optDiv.appendChild(option);
  });

  if (cat === "eyes" && currentCharacter === "female-pose") {
    renderEyesPalette(div);
  }
}

// ------------------------------------------------------------
// Paleta dos olhos
function renderEyesPalette(container) {
  const wrap = document.createElement("div");
  wrap.className = "eyes-palette";

  const colors = {
    default: "#6ccfef",
    green: "#b8be79",
    lilac: "#A580EF",
    brown: "#896c77",
  };

  Object.entries(colors).forEach(([key, color]) => {
    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.backgroundColor = color;
    sw.title = key;
    if (EYE_KEYS[key] === eyeKey) sw.classList.add("active");
    sw.onclick = () => {
      eyeKey = EYE_KEYS[key];
      updateEyesCategory();
      wrap.querySelectorAll(".swatch").forEach((s) => s.classList.remove("active"));
      sw.classList.add("active");
    };
    wrap.appendChild(sw);
  });

  container.prepend(wrap);
}

// ------------------------------------------------------------
// Atualiza categoria dos olhos sem recarregar o resto
function updateEyesCategory() {
  const eyesDiv = document.getElementById("opt-eyes");
  if (!eyesDiv) return;

  eyesDiv.innerHTML = "";
  const noneBtn = document.createElement("div");
  noneBtn.className = "option";
  noneBtn.title = "Remover";
  noneBtn.innerHTML = `<span style="color:#888;font-size:20px;">✖</span>`;
  noneBtn.onclick = () => {
    delete selected["eyes"];
    renderSelection("eyes");
    redraw();
  };
  eyesDiv.appendChild(noneBtn);

  const files = getFilesForCategory("eyes");
  files.forEach((file) => {
    const src = `${ROOT_PATH}${currentCharacter}/${eyeKey}/${file}`;
    const option = document.createElement("div");
    option.className = "option";
    const img = document.createElement("img");
    img.src = src;
    option.appendChild(img);
    option.onclick = () => {
      selected["eyes"] = src;
      renderSelection("eyes");
      redraw();
    };
    eyesDiv.appendChild(option);
  });
}

// ------------------------------------------------------------
// Renderiza interface principal
function renderUI() {
  categoryList.innerHTML = "";
  CATEGORIES.forEach(renderCategory);
}

// ------------------------------------------------------------
// Marca seleção
function renderSelection(cat) {
  const optDiv = document.getElementById(`opt-${cat}`);
  if (!optDiv) return;
  optDiv.querySelectorAll(".option").forEach((opt) => {
    const img = opt.querySelector("img");
    const isSelected = img && img.src === selected[cat];
    opt.classList.toggle("selected", isSelected);
  });
}

// ------------------------------------------------------------
// Redesenha personagem
async function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const order = ["hair_back", "base", "outfit", "blush", "eyes", "hair_front", "accessory"];
  for (const cat of order) {
    const src = selected[cat];
    if (!src) continue;
    const img = await loadImage(src);
    if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}

// ------------------------------------------------------------
// EXPORTAR PNG
btnSave.onclick = () => {
  const link = document.createElement("a");
  link.download = `${currentCharacter}_personagem.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// ------------------------------------------------------------
// SALVAR PERSONAGEM (JSON)
function saveCharacter(name) {
  if (!name) return alert("Digite um nome para salvar o personagem!");
  saves[name] = {
    character: currentCharacter,
    eyeKey,
    selected,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  renderSavesUI();
  alert(`Personagem "${name}" salvo com sucesso!`);
}

// ------------------------------------------------------------
// CARREGAR PERSONAGEM
// ------------------------------------------------------------
// CARREGAR PERSONAGEM (corrigido)
function loadCharacter(name) {
  const data = saves[name];
  if (!data) return alert("Personagem não encontrado!");

  // Carrega dados salvos
  currentCharacter = data.character;
  eyeKey = data.eyeKey || EYE_KEYS.default;
  selected = data.selected || {};

  // Recarrega interface para o personagem
  layers = allLayers[currentCharacter] || {};
  renderCharacterSelector();
  renderUI();
  renderSavesUI();

  // Aplica seleções salvas
  for (const cat in selected) {
    renderSelection(cat);
  }

  // Redesenha visualmente
  redraw();

  alert(`✅ Personagem "${name}" carregado com sucesso!`);
}


// ------------------------------------------------------------
// DELETAR PERSONAGEM
function deleteCharacter(name) {
  if (!confirm(`Excluir o personagem "${name}"?`)) return;
  delete saves[name];
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  renderSavesUI();
}

// ------------------------------------------------------------
// UI dos Saves
function renderSavesUI() {
  let box = document.getElementById("saveBox");
  if (box) box.remove();

  box = document.createElement("div");
  box.id = "saveBox";
  box.className = "save-box";
  box.innerHTML = `
    <h3>💾 Personagens Salvos</h3>
    <input type="text" id="saveName" placeholder="Nome do personagem...">
    <button id="btnSaveChar">Salvar Configuração</button>
    <div id="savedList"></div>
  `;
  categoryList.after(box);

  document.getElementById("btnSaveChar").onclick = () => {
    const name = document.getElementById("saveName").value.trim();
    saveCharacter(name);
  };

  const savedList = box.querySelector("#savedList");
  savedList.innerHTML = "";

  Object.keys(saves).forEach((name) => {
    const div = document.createElement("div");
    div.className = "saved-item";
    div.innerHTML = `
      <span>${name}</span>
      <div class="saved-actions">
        <button class="load">Carregar</button>
        <button class="delete">🗑</button>
      </div>
    `;
    div.querySelector(".load").onclick = () => loadCharacter(name);
    div.querySelector(".delete").onclick = () => deleteCharacter(name);
    savedList.appendChild(div);
  });
}

// ------------------------------------------------------------
// Inicialização
loadManifest();
