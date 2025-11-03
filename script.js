// =============================================================
// 🔧 Referências de DOM - aplicação principal
// =============================================================
const routeListEl = document.getElementById("routeList");
const sceneInspectorEl = document.getElementById("sceneInspector");
const instanceInspectorEl = document.getElementById("instanceInspector");
const stageEl = document.getElementById("stage");
const stageBgEl = document.getElementById("stageBackground");
const instancesEl = document.getElementById("sceneInstances");

const btnCreateRoute = document.getElementById("createRoute");
const btnCreateScene = document.getElementById("createScene");
const btnSaveProject = document.getElementById("saveProject");
const backgroundInput = document.getElementById("backgroundInput");
const btnClearBackground = document.getElementById("clearBackground");
const btnAddDialogue = document.getElementById("addDialogue");
const btnAddChoice = document.getElementById("addChoice");
const btnAddCharacterScene = document.getElementById("addCharacterToScene");
const btnOpenCharacterEditor = document.getElementById("openCharacterEditor");

// =============================================================
// 🎨 Character Editor DOM
// =============================================================
const overlayEl = document.getElementById("characterEditorOverlay");
const btnCloseOverlay = document.getElementById("closeCharacterEditor");
const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d");
const characterSelectorEl = document.getElementById("characterSelector");
const categoryListEl = document.getElementById("categoryList");
const savedListEl = document.getElementById("savedList");
const btnSaveChar = document.getElementById("btnSaveChar");
const btnExportPNG = document.getElementById("btnExportPNG");
const btnApplyInstance = document.getElementById("btnApplyToInstance");
const saveNameInput = document.getElementById("saveName");

// =============================================================
// ⚙️ Configurações
// =============================================================
const ROOT_PATH = "assets/";
const CHARACTER_TYPES = ["female", "male", "female-mature", "male-mature", "female-pose"];
const CATEGORIES = ["base", "eyes", "hair_front", "hair_back", "outfit", "accessory", "blush"];
const DRAW_ORDER = ["hair_back", "base", "outfit", "blush", "eyes", "hair_front", "accessory"];

const EYE_KEYS = {
  default: "eyes",
  green: "eye-verde",
  lilac: "eye-lilas",
  brown: "eye-marrom",
};

const SAVE_KEY = "otome_saves";
const PROJECT_KEY = "otome_project_v1";

// =============================================================
// 🔄 Estados globais
// =============================================================
let manifestLayers = {};
let layers = {};
let selectedLayers = {};
let currentCharacter = "female";
let eyeKey = EYE_KEYS.default;
const imgCache = new Map();

let saves = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");

const renderCanvas = document.createElement("canvas");
renderCanvas.width = 600;
renderCanvas.height = 800;
const renderCtx = renderCanvas.getContext("2d");

let editorContext = { mode: "standalone" };

let project = null;
let selectedSceneId = null;
let selectedInstanceId = null;

// =============================================================
// 📦 Utilidades
// =============================================================
function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  imgCache.set(src, promise);
  return promise;
}

async function loadManifest() {
  const resp = await fetch("assets_manifest.json");
  manifestLayers = await resp.json();
  applyCharacter(currentCharacter);
}

// =============================================================
// 🎭 Character Editor
// =============================================================
function applyCharacter(charType) {
  currentCharacter = charType;
  layers = manifestLayers[currentCharacter] || {};
  selectedLayers = {};
  eyeKey = EYE_KEYS.default;
  renderCharacterSelector();
  renderCategoryUI();
  redrawCharacter();
  renderSavedCharacters();
}

function renderCharacterSelector() {
  characterSelectorEl.innerHTML = "<h3>🧬 Tipo de personagem</h3>";
  const wrapper = document.createElement("div");
  wrapper.className = "character-selector";
  CHARACTER_TYPES.forEach((type) => {
    const btn = document.createElement("button");
    btn.className = "char-btn" + (type === currentCharacter ? " active" : "");
    btn.textContent = type.replace(/-/g, " ");
    btn.onclick = () => applyCharacter(type);
    wrapper.appendChild(btn);
  });
  characterSelectorEl.appendChild(wrapper);
}

function getFilesForCategory(cat) {
  if (cat !== "eyes") return layers[cat] || [];
  const key = currentCharacter === "female-pose" && layers[eyeKey] ? eyeKey : "eyes";
  return layers[key] || [];
}

function renderCategoryUI() {
  categoryListEl.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const container = document.createElement("div");
    container.className = "category";
    container.innerHTML = `<h3>${cat.replace("_", " ")}</h3>`;

    const optionList = document.createElement("div");
    optionList.className = "option-list";
    optionList.id = `opt-${cat}`;

    const none = document.createElement("div");
    none.className = "option";
    none.innerHTML = `<span style="font-size:22px;color:#888;">✖</span>`;
    none.title = "Remover camada";
    none.onclick = () => {
      delete selectedLayers[cat];
      renderSelection(cat);
      redrawCharacter();
    };
    optionList.appendChild(none);

    const files = getFilesForCategory(cat);
    const folder = cat === "eyes" && currentCharacter === "female-pose" ? eyeKey : cat;

    files.forEach((file) => {
      const src = `${ROOT_PATH}${currentCharacter}/${folder}/${file}`;
      const opt = document.createElement("div");
      opt.className = "option";
      const img = document.createElement("img");
      img.src = src;
      opt.appendChild(img);
      opt.onclick = () => {
        selectedLayers[cat] = src;
        renderSelection(cat);
        redrawCharacter();
      };
      optionList.appendChild(opt);
    });

    container.appendChild(optionList);

    if (cat === "eyes" && currentCharacter === "female-pose") {
      container.prepend(renderEyesPalette());
    }

    categoryListEl.appendChild(container);
    renderSelection(cat);
  });
}

function renderEyesPalette() {
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
    if (EYE_KEYS[key] === eyeKey) sw.classList.add("active");
    sw.onclick = () => {
      eyeKey = EYE_KEYS[key];
      renderCategoryUI();
    };
    wrap.appendChild(sw);
  });
  return wrap;
}

function renderSelection(cat) {
  const optList = categoryListEl.querySelector(`#opt-${cat}`);
  if (!optList) return;
  optList.querySelectorAll(".option").forEach((opt) => {
    const img = opt.querySelector("img");
    const isSel = img && img.src === selectedLayers[cat];
    opt.classList.toggle("selected", isSel);
  });
}

async function redrawCharacter() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cat of DRAW_ORDER) {
    const src = selectedLayers[cat];
    if (!src) continue;
    const img = await loadImage(src);
    if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}

function collectCharacterData() {
  return {
    character: currentCharacter,
    eyeKey,
    selected: deepClone(selectedLayers),
  };
}

function loadCharacterData(data) {
  currentCharacter = data.character;
  eyeKey = data.eyeKey || EYE_KEYS.default;
  layers = manifestLayers[currentCharacter] || {};
  selectedLayers = deepClone(data.selected || {});
  renderCharacterSelector();
  renderCategoryUI();
  redrawCharacter();
}

function renderSavedCharacters() {
  savedListEl.innerHTML = "";
  const names = Object.keys(saves);
  if (!names.length) {
    savedListEl.innerHTML = "<p style='color:var(--muted);text-align:center;'>Nenhum personagem salvo ainda.</p>";
    return;
  }

  names.forEach((name) => {
    const item = document.createElement("div");
    item.className = "saved-item";
    const title = document.createElement("span");
    title.textContent = name;
    const actions = document.createElement("div");
    actions.className = "saved-actions";

    const loadBtn = document.createElement("button");
    loadBtn.textContent = "Editar";
    loadBtn.onclick = () => {
      const data = saves[name];
      if (!data) return;
      loadCharacterData(data);
      saveNameInput.value = name;
      editorContext = { mode: "saved", savedName: name };
      updateApplyButtonVisibility();
    };

    const addBtn = document.createElement("button");
    addBtn.textContent = "Usar na cena";
    addBtn.onclick = async () => {
      await addSavedCharacterToScene(name);
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.onclick = () => deleteCharacter(name);

    actions.append(loadBtn, addBtn, delBtn);
    item.append(title, actions);
    savedListEl.appendChild(item);
  });
}

function saveCharacter(name) {
  if (!name) return alert("Digite um nome para salvar o personagem!");
  const data = collectCharacterData();
  saves[name] = data;
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  alert(`Personagem "${name}" salvo com sucesso!`);
  renderSavedCharacters();
}

function deleteCharacter(name) {
  if (!confirm(`Excluir o personagem "${name}"?`)) return;
  delete saves[name];
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  renderSavedCharacters();
}

function exportCharacterPNG() {
  const link = document.createElement("a");
  link.download = `${currentCharacter}_personagem.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function openCharacterEditor(options = {}) {
  editorContext = { mode: "standalone", ...options };
  overlayEl.classList.remove("hidden");
  if (options.data) {
    loadCharacterData(options.data);
    if (options.name) saveNameInput.value = options.name;
  } else {
    applyCharacter(currentCharacter);
    saveNameInput.value = "";
  }
  renderSavedCharacters();
  updateApplyButtonVisibility();
}

function closeCharacterEditor() {
  overlayEl.classList.add("hidden");
  editorContext = { mode: "standalone" };
  saveNameInput.value = "";
}

function updateApplyButtonVisibility() {
  if (editorContext.mode === "instance" && editorContext.onApply) {
    btnApplyInstance.style.display = "inline-flex";
  } else {
    btnApplyInstance.style.display = "none";
  }
}

btnOpenCharacterEditor.onclick = () => openCharacterEditor();
btnCloseOverlay.onclick = () => closeCharacterEditor();
btnSaveChar.onclick = () => {
  const name = saveNameInput.value.trim();
  saveCharacter(name);
};
btnExportPNG.onclick = () => exportCharacterPNG();
btnApplyInstance.onclick = async () => {
  if (editorContext.mode !== "instance" || !editorContext.onApply) return;
  const data = collectCharacterData();
  const image = await renderCharacterToDataURL(data);
  editorContext.onApply({ data, image });
  closeCharacterEditor();
};

updateApplyButtonVisibility();

// =============================================================
// 🖼️ Render util para cenas
// =============================================================
async function renderCharacterToDataURL(characterData) {
  const { character, eyeKey: eyeOption, selected } = characterData;
  const setLayers = manifestLayers[character] || {};
  renderCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
  for (const cat of DRAW_ORDER) {
    let src = selected?.[cat];
    if (!src && cat === "eyes" && character === "female-pose") {
      const key = eyeOption || EYE_KEYS.default;
      const files = setLayers[key] || [];
      if (files.length && selected?.eyes) src = selected.eyes;
    }
    if (!src) continue;
    const img = await loadImage(src);
    if (img) renderCtx.drawImage(img, 0, 0, renderCanvas.width, renderCanvas.height);
  }
  return renderCanvas.toDataURL("image/png");
}

// =============================================================
// 🎬 Gerenciamento de cenas e rotas
// =============================================================
function defaultProject() {
  const sceneId = uid("scene");
  return {
    routes: {
      Principal: [sceneId],
    },
    scenes: {
      [sceneId]: {
        id: sceneId,
        title: "Cena inicial",
        route: "Principal",
        background: "",
        dialogues: [],
        choices: [],
        instances: [],
      },
    },
  };
}

function loadProject() {
  const stored = localStorage.getItem(PROJECT_KEY);
  if (stored) {
    try {
      project = JSON.parse(stored);
    } catch (e) {
      project = defaultProject();
    }
  } else {
    project = defaultProject();
  }
  const firstRoute = Object.keys(project.routes)[0];
  const firstScene = project.routes[firstRoute]?.[0];
  selectedSceneId = firstScene || null;
}

function saveProject() {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
  alert("Projeto salvo!");
}

function createRoute() {
  const name = prompt("Nome da nova rota:");
  if (!name) return;
  if (project.routes[name]) return alert("Já existe uma rota com esse nome.");
  project.routes[name] = [];
  renderRoutes();
}

function createScene(routeName) {
  const routes = Object.keys(project.routes);
  const route = routeName || prompt(`Adicionar em qual rota?\nOpções: ${routes.join(", ")}`) || "Principal";
  if (!project.routes[route]) project.routes[route] = [];
  const id = uid("scene");
  project.scenes[id] = {
    id,
    title: `Cena ${project.routes[route].length + 1}`,
    route,
    background: "",
    dialogues: [],
    choices: [],
    instances: [],
  };
  project.routes[route].push(id);
  selectedSceneId = id;
  renderRoutes();
  renderSceneInspector();
  updateStage();
}

function selectScene(id) {
  selectedSceneId = id;
  selectedInstanceId = null;
  renderRoutes();
  renderSceneInspector();
  renderInstanceInspector();
  updateStage();
}

function renderRoutes() {
  routeListEl.innerHTML = "";
  Object.entries(project.routes).forEach(([routeName, sceneIds]) => {
    const block = document.createElement("div");
    block.className = "route-block";
    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.className = "route-title";
    title.textContent = `Rota ${routeName}`;
    const addSceneBtn = document.createElement("button");
    addSceneBtn.textContent = "➕ Cena";
    addSceneBtn.onclick = () => createScene(routeName);
    header.append(title, addSceneBtn);
    block.appendChild(header);

    const sceneList = document.createElement("div");
    sceneList.className = "scene-list";

    if (!sceneIds.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhuma cena ainda.";
      empty.style.color = "var(--muted)";
      sceneList.appendChild(empty);
    }

    sceneIds.forEach((sceneId, idx) => {
      const scene = project.scenes[sceneId];
      if (!scene) return;
      const card = document.createElement("div");
      card.className = "scene-card" + (sceneId === selectedSceneId ? " active" : "");
      const title = document.createElement("strong");
      title.textContent = scene.title;
      const meta = document.createElement("span");
      meta.className = "scene-meta";
      meta.textContent = `#${idx + 1} • ${scene.dialogues.length} diálogos • ${scene.choices.length} escolhas`;
      card.append(title, meta);
      card.onclick = () => selectScene(sceneId);
      sceneList.appendChild(card);
    });

    block.appendChild(sceneList);
    routeListEl.appendChild(block);
  });
}

function currentScene() {
  return selectedSceneId ? project.scenes[selectedSceneId] : null;
}

function renderSceneInspector() {
  const scene = currentScene();
  sceneInspectorEl.innerHTML = "";
  if (!scene) {
    sceneInspectorEl.innerHTML = "<p style='color:var(--muted)'>Selecione uma cena para editar.</p>";
    return;
  }

  const title = document.createElement("h3");
  title.textContent = `🎬 ${scene.title}`;
  sceneInspectorEl.appendChild(title);

  const titleLabel = document.createElement("label");
  titleLabel.textContent = "Título da cena";
  const titleInput = document.createElement("input");
  titleInput.value = scene.title;
  titleInput.oninput = () => {
    scene.title = titleInput.value;
    renderRoutes();
  };
  sceneInspectorEl.append(titleLabel, titleInput);

  const routeLabel = document.createElement("label");
  routeLabel.textContent = "Rota";
  const routeSelect = document.createElement("select");
  Object.keys(project.routes).forEach((routeName) => {
    const opt = document.createElement("option");
    opt.value = routeName;
    opt.textContent = routeName;
    if (routeName === scene.route) opt.selected = true;
    routeSelect.appendChild(opt);
  });
  routeSelect.onchange = () => moveSceneToRoute(scene.id, routeSelect.value);
  sceneInspectorEl.append(routeLabel, routeSelect);

  // Diálogos
  const dialogHeader = document.createElement("h4");
  dialogHeader.textContent = "Diálogos";
  sceneInspectorEl.appendChild(dialogHeader);
  scene.dialogues.forEach((dialogue) => {
    sceneInspectorEl.appendChild(renderDialogueBlock(scene, dialogue));
  });

  if (!scene.dialogues.length) {
    const hint = document.createElement("p");
    hint.style.color = "var(--muted)";
    hint.textContent = "Use o botão ➕ Diálogo para adicionar falas.";
    sceneInspectorEl.appendChild(hint);
  }

  const choiceHeader = document.createElement("h4");
  choiceHeader.textContent = "Escolhas e rotas";
  sceneInspectorEl.appendChild(choiceHeader);
  scene.choices.forEach((choice) => {
    sceneInspectorEl.appendChild(renderChoiceBlock(scene, choice));
  });

  if (!scene.choices.length) {
    const hint = document.createElement("p");
    hint.style.color = "var(--muted)";
    hint.textContent = "Adicione escolhas para criar rotas alternativas.";
    sceneInspectorEl.appendChild(hint);
  }
}

function renderDialogueBlock(scene, dialogue) {
  const block = document.createElement("div");
  block.className = "dialogue-block";

  const header = document.createElement("header");
  const label = document.createElement("strong");
  label.textContent = "Diálogo";
  const remove = document.createElement("button");
  remove.textContent = "Remover";
  remove.onclick = () => {
    scene.dialogues = scene.dialogues.filter((d) => d.id !== dialogue.id);
    renderSceneInspector();
  };
  header.append(label, remove);
  block.appendChild(header);

  const speakerLabel = document.createElement("label");
  speakerLabel.textContent = "Quem fala";
  const speakerInput = document.createElement("input");
  speakerInput.value = dialogue.speaker;
  speakerInput.oninput = () => (dialogue.speaker = speakerInput.value);

  const textLabel = document.createElement("label");
  textLabel.textContent = "Texto";
  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.value = dialogue.text;
  textarea.oninput = () => (dialogue.text = textarea.value);

  block.append(speakerLabel, speakerInput, textLabel, textarea);
  return block;
}

function renderChoiceBlock(scene, choice) {
  const block = document.createElement("div");
  block.className = "choice-block";

  const header = document.createElement("header");
  const label = document.createElement("strong");
  label.textContent = "Escolha";
  const remove = document.createElement("button");
  remove.textContent = "Remover";
  remove.onclick = () => {
    scene.choices = scene.choices.filter((c) => c.id !== choice.id);
    renderSceneInspector();
  };
  header.append(label, remove);
  block.appendChild(header);

  const textLabel = document.createElement("label");
  textLabel.textContent = "Texto apresentado ao jogador";
  const textInput = document.createElement("textarea");
  textInput.rows = 2;
  textInput.value = choice.text;
  textInput.oninput = () => (choice.text = textInput.value);

  const routeLabel = document.createElement("label");
  routeLabel.textContent = "Rota / Caminho";
  const routeInput = document.createElement("input");
  routeInput.value = choice.route;
  routeInput.placeholder = "Ex: A, B, Principal";
  routeInput.oninput = () => (choice.route = routeInput.value);

  const targetLabel = document.createElement("label");
  targetLabel.textContent = "Cena destino";
  const targetSelect = document.createElement("select");
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Finaliza rota";
  targetSelect.appendChild(empty);

  Object.entries(project.routes).forEach(([routeName, sceneIds]) => {
    const group = document.createElement("optgroup");
    group.label = `Rota ${routeName}`;
    sceneIds.forEach((sceneId) => {
      const sc = project.scenes[sceneId];
      const opt = document.createElement("option");
      opt.value = sc.id;
      opt.textContent = sc.title;
      if (sc.id === choice.targetSceneId) opt.selected = true;
      group.appendChild(opt);
    });
    targetSelect.appendChild(group);
  });

  targetSelect.onchange = () => (choice.targetSceneId = targetSelect.value || "");

  block.append(textLabel, textInput, routeLabel, routeInput, targetLabel, targetSelect);
  return block;
}

function moveSceneToRoute(sceneId, newRoute) {
  const scene = project.scenes[sceneId];
  if (!scene) return;
  if (!project.routes[newRoute]) project.routes[newRoute] = [];
  const oldList = project.routes[scene.route];
  project.routes[scene.route] = oldList.filter((id) => id !== sceneId);
  project.routes[newRoute].push(sceneId);
  scene.route = newRoute;
  renderRoutes();
}

// =============================================================
// 🧍‍♀️ Instâncias de personagens na cena
// =============================================================
function renderInstances() {
  instancesEl.innerHTML = "";
  const scene = currentScene();
  if (!scene) return;
  const stageRect = stageEl.getBoundingClientRect();

  scene.instances.forEach((instance) => {
    const el = document.createElement("div");
    el.className = "char-instance" + (instance.id === selectedInstanceId ? " active" : "");
    el.dataset.id = instance.id;

    const img = document.createElement("img");
    img.src = instance.image;
    img.width = 300;
    img.draggable = false;
    el.appendChild(img);

    const actions = document.createElement("div");
    actions.className = "instance-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Editar";
    editBtn.onclick = (ev) => {
      ev.stopPropagation();
      openCharacterEditor({
        mode: "instance",
        data: instance.characterData,
        onApply: ({ data, image }) => {
          instance.characterData = data;
          instance.image = image;
          renderInstances();
        },
      });
    };

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "🗑";
    removeBtn.onclick = (ev) => {
      ev.stopPropagation();
      scene.instances = scene.instances.filter((inst) => inst.id !== instance.id);
      selectedInstanceId = null;
      renderInstances();
      renderInstanceInspector();
    };

    actions.append(editBtn, removeBtn);
    el.appendChild(actions);

    positionInstanceElement(el, instance, stageRect);

    el.onpointerdown = (ev) => startDragInstance(ev, instance.id);
    el.onclick = (ev) => {
      ev.stopPropagation();
      selectInstance(instance.id);
    };

    instancesEl.appendChild(el);
  });
}

function positionInstanceElement(el, instance, stageRect) {
  const rect = stageRect || stageEl.getBoundingClientRect();
  const x = instance.posX * rect.width;
  const y = instance.posY * rect.height;
  el.style.position = "absolute";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.transform = `translate(-50%, -100%) scale(${instance.scale})`;
}

let dragState = null;

function startDragInstance(ev, instanceId) {
  ev.preventDefault();
  selectInstance(instanceId);
  const scene = currentScene();
  if (!scene) return;
  const instance = scene.instances.find((i) => i.id === instanceId);
  if (!instance) return;
  const rect = stageEl.getBoundingClientRect();
  dragState = {
    id: instanceId,
    offsetX: ev.clientX,
    offsetY: ev.clientY,
    startPosX: instance.posX,
    startPosY: instance.posY,
    rect,
  };
  const el = instancesEl.querySelector(`[data-id="${instanceId}"]`);
  if (el) el.classList.add("dragging");
  document.addEventListener("pointermove", onDragInstance);
  document.addEventListener("pointerup", stopDragInstance);
}

function onDragInstance(ev) {
  if (!dragState) return;
  const scene = currentScene();
  if (!scene) return;
  const instance = scene.instances.find((i) => i.id === dragState.id);
  if (!instance) return;
  const { rect, offsetX, offsetY, startPosX, startPosY } = dragState;
  const dx = (ev.clientX - offsetX) / rect.width;
  const dy = (ev.clientY - offsetY) / rect.height;
  instance.posX = Math.min(1, Math.max(0, startPosX + dx));
  instance.posY = Math.min(1.2, Math.max(0, startPosY + dy));
  const el = instancesEl.querySelector(`[data-id="${instance.id}"]`);
  if (el) positionInstanceElement(el, instance, rect);
}

function stopDragInstance() {
  if (dragState) {
    const el = instancesEl.querySelector(`[data-id="${dragState.id}"]`);
    if (el) el.classList.remove("dragging");
  }
  dragState = null;
  document.removeEventListener("pointermove", onDragInstance);
  document.removeEventListener("pointerup", stopDragInstance);
}

function selectInstance(id) {
  selectedInstanceId = id;
  renderInstances();
  renderInstanceInspector();
}

function renderInstanceInspector() {
  const scene = currentScene();
  instanceInspectorEl.innerHTML = "";
  if (!scene) {
    instanceInspectorEl.innerHTML = "<p style='color:var(--muted)'>Selecione uma cena.</p>";
    return;
  }
  if (!selectedInstanceId) {
    instanceInspectorEl.innerHTML = "<p style='color:var(--muted)'>Selecione um personagem na cena para editar.</p>";
    return;
  }
  const instance = scene.instances.find((i) => i.id === selectedInstanceId);
  if (!instance) {
    instanceInspectorEl.innerHTML = "<p style='color:var(--muted)'>Selecione um personagem na cena.</p>";
    return;
  }

  const title = document.createElement("h3");
  title.textContent = `🧍 ${instance.name}`;
  instanceInspectorEl.appendChild(title);

  const scaleLabel = document.createElement("label");
  scaleLabel.textContent = "Tamanho";
  const scaleInput = document.createElement("input");
  scaleInput.type = "range";
  scaleInput.min = "0.4";
  scaleInput.max = "1.6";
  scaleInput.step = "0.01";
  scaleInput.value = instance.scale;
  scaleInput.oninput = () => {
    instance.scale = parseFloat(scaleInput.value);
    renderInstances();
  };

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remover da cena";
  removeBtn.onclick = () => {
    const scene = currentScene();
    if (!scene) return;
    scene.instances = scene.instances.filter((i) => i.id !== instance.id);
    selectedInstanceId = null;
    renderInstances();
    renderInstanceInspector();
  };

  instanceInspectorEl.append(scaleLabel, scaleInput, removeBtn);
}

async function addSavedCharacterToScene(name) {
  const scene = currentScene();
  if (!scene) return alert("Selecione uma cena primeiro.");
  const data = saves[name];
  if (!data) return alert("Personagem não encontrado.");
  const instanceId = uid("inst");
  const characterData = deepClone(data);
  const image = await renderCharacterToDataURL(characterData);
  const instance = {
    id: instanceId,
    name,
    characterData,
    image,
    posX: 0.5,
    posY: 1,
    scale: 1,
  };
  scene.instances.push(instance);
  selectedInstanceId = instanceId;
  renderInstances();
  renderInstanceInspector();
}

// =============================================================
// 🎨 Stage updates
// =============================================================
function updateStage() {
  const scene = currentScene();
  if (!scene) {
    stageBgEl.style.backgroundImage = "";
    instancesEl.innerHTML = "";
    return;
  }
  stageBgEl.style.backgroundImage = scene.background ? `url(${scene.background})` : "";
  renderInstances();
}

// =============================================================
// 🧾 Eventos principais
// =============================================================
btnCreateRoute.onclick = () => createRoute();
btnCreateScene.onclick = () => createScene();
btnSaveProject.onclick = () => saveProject();
btnAddDialogue.onclick = () => {
  const scene = currentScene();
  if (!scene) return alert("Selecione uma cena.");
  scene.dialogues.push({ id: uid("dlg"), speaker: "", text: "" });
  renderSceneInspector();
};
btnAddChoice.onclick = () => {
  const scene = currentScene();
  if (!scene) return alert("Selecione uma cena.");
  scene.choices.push({ id: uid("choice"), text: "", route: "", targetSceneId: "" });
  renderSceneInspector();
};
btnAddCharacterScene.onclick = async () => {
  if (!Object.keys(saves).length) {
    alert("Nenhum personagem salvo. Abra o editor para criar um personagem primeiro.");
    return;
  }
  const name = prompt(`Qual personagem adicionar?\nDisponíveis: ${Object.keys(saves).join(", ")}`);
  if (!name) return;
  if (!saves[name]) return alert("Personagem não encontrado.");
  await addSavedCharacterToScene(name);
};

backgroundInput.onchange = async (ev) => {
  const scene = currentScene();
  if (!scene) return alert("Selecione uma cena.");
  const file = ev.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    scene.background = reader.result;
    updateStage();
    backgroundInput.value = "";
  };
  reader.readAsDataURL(file);
};

btnClearBackground.onclick = () => {
  const scene = currentScene();
  if (!scene) return alert("Selecione uma cena.");
  scene.background = "";
  updateStage();
};

stageEl.onclick = () => {
  selectedInstanceId = null;
  renderInstanceInspector();
  renderInstances();
};

window.addEventListener("resize", () => {
  renderInstances();
});

// =============================================================
// 🚀 Inicialização
// =============================================================
(async function init() {
  await loadManifest();
  loadProject();
  renderRoutes();
  renderSceneInspector();
  renderInstanceInspector();
  updateStage();
  renderSavedCharacters();
})();
