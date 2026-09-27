const BOOKS = {
  genesis: "GEN", exodo: "EXO", levitico: "LEV", numeros: "NUM", deuteronomio: "DEU",
  josue: "JOS", jueces: "JDG", rut: "RUT", "1 samuel": "1SA", "2 samuel": "2SA",
  "1 reyes": "1KI", "2 reyes": "2KI", "1 cronicas": "1CH", "2 cronicas": "2CH",
  esdras: "EZR", nehemias: "NEH", ester: "EST", job: "JOB", salmos: "PSA", salmo: "PSA",
  proverbios: "PRO", eclesiastes: "ECC", cantares: "SNG", isaias: "ISA", jeremias: "JER",
  lamentaciones: "LAM", ezequiel: "EZK", daniel: "DAN", oseas: "HOS", joel: "JOL",
  amos: "AMO", abdias: "OBA", jonas: "JON", miqueas: "MIC", nahum: "NAM", habacuc: "HAB",
  sofonias: "ZEP", hageo: "HAG", zacarias: "ZEC", malaquias: "MAL", mateo: "MAT",
  marcos: "MRK", lucas: "LUK", juan: "JHN", hechos: "ACT", romanos: "ROM",
  "1 corintios": "1CO", "2 corintios": "2CO", galatas: "GAL", efesios: "EPH",
  filipenses: "PHP", colosenses: "COL", "1 tesalonicenses": "1TH", "2 tesalonicenses": "2TH",
  "1 timoteo": "1TI", "2 timoteo": "2TI", tito: "TIT", filemon: "PHM", hebreos: "HEB",
  santiago: "JAS", "1 pedro": "1PE", "2 pedro": "2PE", "1 juan": "1JN", "2 juan": "2JN",
  "3 juan": "3JN", judas: "JUD", apocalipsis: "REV"
};

const COLORS = ["#dc6248", "#3579b8", "#8a62b4", "#23866f", "#c58a14", "#d05289", "#647338"];
const COPYRIGHTS = {
  NTV: "Nueva Traducción Viviente (NTV) © 2009, 2010 por Tyndale House Foundation. Usado con permiso de Tyndale House Publishers, Inc. Todos los derechos reservados.",
  RVR1960: "Reina-Valera 1960 (RVR1960) © 1960 Sociedades Bíblicas Unidas. Usado con permiso. Todos los derechos reservados."
};
const PRINT_FONT_STACKS = {
  Inter: "'Inter', Arial, sans-serif",
  Lora: "'Lora', Georgia, serif",
  Nunito: "'Nunito', 'Trebuchet MS', sans-serif",
  "Atkinson Hyperlegible": "'Atkinson Hyperlegible', Verdana, sans-serif"
};
const state = {
  reference: "",
  version: "",
  verses: [],
  characters: [],
  activeCharacter: null,
  erasing: false,
  dragging: false,
  selectionOrigin: null,
  copyright: ""
};

const $ = (selector) => document.querySelector(selector);
const els = {
  passageForm: $("#passage-form"), passageInput: $("#passage-input"), versionSelect: $("#version-select"),
  passageTitle: $("#passage-title"), passageVersion: $("#passage-version"), passageContent: $("#passage-content"),
  emptyState: $("#empty-state"), copyright: $("#copyright"), characterList: $("#character-list"),
  characterCount: $("#character-count"), characterForm: $("#character-form"), characterName: $("#character-name"),
  characterColor: $("#character-color"), eraser: $("#eraser-button"), selectionTip: $("#selection-tip"),
  activeColor: $("#active-color"), activeName: $("#active-name"),
  toast: $("#toast"), pasteDialog: $("#paste-dialog"), printRoot: $("#print-root"),
  selectionBox: $("#selection-box")
};

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function parseReference(input) {
  const cleaned = normalize(input).replace(/[–—]/g, "-");
  const match = cleaned.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(?:(\d+)\s*:\s*)?(\d+))?$/);
  if (!match) throw new Error("Usa un formato como Juan 3:1-12.");
  const [, bookName, chapter, start, endChapter, end] = match;
  const book = BOOKS[bookName];
  if (!book) throw new Error(`No reconozco el libro “${bookName}”.`);
  const lastChapter = endChapter || chapter;
  const lastVerse = end || start;
  return {
    id: `${book}.${chapter}.${start}-${book}.${lastChapter}.${lastVerse}`,
    bookName, start: Number(start), end: Number(lastVerse), chapter: Number(chapter), endChapter: Number(lastChapter)
  };
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

function tokenize(text) {
  return text.trim().split(/(\s+)/).filter(Boolean).map((text) => ({ id: uid(), text, characterId: null }));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("visible"), 2800);
}

function setBusy(isBusy) {
  const button = els.passageForm.querySelector("button[type=submit]");
  button.disabled = isBusy;
  button.innerHTML = isBusy ? "Cargando…" : '<span aria-hidden="true">↗</span> Cargar pasaje';
}

function scheduleSave() {
  $("#save-status").textContent = "Guardando…";
  clearTimeout(scheduleSave.timer);
  scheduleSave.timer = setTimeout(() => {
    localStorage.setItem("voces-project", JSON.stringify({
      reference: state.reference, version: state.version, verses: state.verses,
      characters: state.characters, copyright: state.copyright
    }));
    $("#save-status").textContent = "Guardado";
  }, 350);
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem("voces-project"));
    if (!saved) return false;
    Object.assign(state, saved);
    els.passageInput.value = state.reference || els.passageInput.value;
    els.versionSelect.value = state.version || "RVR1960";
    return true;
  } catch { localStorage.removeItem("voces-project"); return false; }
}

function renderCharacters() {
  els.characterCount.textContent = state.characters.length;
  els.characterList.innerHTML = state.characters.map((character) => `
    <div class="character-row ${state.activeCharacter === character.id && !state.erasing ? "active" : ""}"
      style="--character-color:${character.color}">
      <input class="color-dot" type="color" value="${character.color}" data-color="${character.id}" title="Cambiar color de ${escapeHtml(character.name)}" aria-label="Color de ${escapeHtml(character.name)}" />
      <button type="button" class="character-select" data-character="${character.id}"><span class="character-name">${escapeHtml(character.name)}</span></button>
      <button type="button" class="remove-character" data-remove="${character.id}" title="Eliminar" aria-label="Eliminar ${escapeHtml(character.name)}">×</button>
    </div>`).join("");
  els.eraser.classList.toggle("active", state.erasing);
  const active = state.characters.find((c) => c.id === state.activeCharacter);
  els.selectionTip.hidden = !active && !state.erasing;
  if (state.erasing) {
    els.activeColor.style.background = "#7e7e76";
    els.activeName.textContent = "borrador";
  } else if (active) {
    els.activeColor.style.background = active.color;
    els.activeName.textContent = active.name;
  }
}

function characterById(id) { return state.characters.find((character) => character.id === id); }

function renderPassage() {
  const hasText = state.verses.length > 0;
  els.emptyState.hidden = hasText;
  els.passageContent.hidden = !hasText;
  els.passageTitle.textContent = hasText ? state.reference : "Prepara tu lectura";
  els.passageVersion.textContent = hasText ? versionLabel(state.version) : "Sin pasaje";
  els.copyright.textContent = state.copyright || "";
  els.passageContent.innerHTML = state.verses.map((verse, verseIndex) => `
    <span class="verse"><sup class="verse-number">${escapeHtml(String(verse.number))}</sup>${verse.tokens.map((token, tokenIndex) => {
      if (/^\s+$/.test(token.text)) return token.text;
      const character = characterById(token.characterId);
      return `<span class="word ${character ? "assigned" : ""}" data-verse="${verseIndex}" data-token="${tokenIndex}" ${character ? `style="--word-color:${character.color}" title="${escapeHtml(character.name)}"` : ""}>${escapeHtml(token.text)}</span>`;
    }).join("")}</span>`).join("");
}

function render() { renderCharacters(); renderPassage(); }
function versionLabel(code) { return code === "NTV" ? "Nueva Traducción Viviente · NTV" : "Reina-Valera 1960 · RVR1960"; }

function addCharacter(name, color) {
  const character = { id: uid(), name: name.trim(), color };
  state.characters.push(character);
  state.activeCharacter = character.id;
  state.erasing = false;
  els.characterColor.value = COLORS[state.characters.length % COLORS.length];
  renderCharacters(); scheduleSave();
}

function assignWord(element, forcedValue) {
  const verse = state.verses[Number(element.dataset.verse)];
  const token = verse?.tokens[Number(element.dataset.token)];
  if (!token) return;
  const isForced = arguments.length > 1;
  const value = isForced ? forcedValue : (state.erasing ? null : state.activeCharacter);
  if (!isForced && !value && !state.erasing) return;
  token.characterId = value;
  const character = characterById(value);
  element.classList.toggle("assigned", Boolean(character));
  element.style.setProperty("--word-color", character?.color || "transparent");
  element.title = character?.name || "";
  scheduleSave();
}

async function loadPassage(reference, version) {
  const parsed = parseReference(reference);
  if (parsed.chapter !== parsed.endChapter) throw new Error("Por ahora, carga rangos dentro de un mismo capítulo.");
  const bookSlug = encodeURIComponent(parsed.bookName.replace(/\s+/g, "-"));
  const verseRange = parsed.start === parsed.end ? String(parsed.start) : `${parsed.start}-${parsed.end}`;
  const response = await fetch(`https://api.midvash.com/v1/${version.toLowerCase()}/${bookSlug}/${parsed.chapter}/${verseRange}`);
  if (!response.ok) throw new Error(response.status === 404 ? "No se encontró ese pasaje." : "La fuente bíblica no respondió. Puedes usar «Pegar texto».");
  const payload = await response.json();
  const verses = payload.data?.verses || (payload.data?.text ? [payload.data.text] : []);
  if (!verses.length) throw new Error("La fuente no devolvió texto para ese pasaje.");
  state.reference = reference;
  state.version = version;
  state.verses = verses.map((text, index) => ({ number: parsed.start + index, tokens: tokenize(text) }));
  state.copyright = COPYRIGHTS[version];
  render(); scheduleSave();
}

function parseManualText(text, reference = "") {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Pega primero el texto del pasaje.");
  if (lines.length === 1 && reference) {
    try {
      const parsed = parseReference(reference);
      if (parsed.chapter === parsed.endChapter) {
        const source = lines[0];
        const markers = [];
        let cursor = 0;
        for (let number = parsed.start; number <= parsed.end; number += 1) {
          const pattern = new RegExp(`(?:^|\\s)${number}\\s+`, "g");
          pattern.lastIndex = cursor;
          const match = pattern.exec(source);
          if (!match) break;
          markers.push({ number, start: match.index, contentStart: pattern.lastIndex });
          cursor = pattern.lastIndex;
        }
        if (markers.length > 1) {
          return markers.map((marker, index) => ({
            number: marker.number,
            tokens: tokenize(source.slice(marker.contentStart, markers[index + 1]?.start ?? source.length))
          }));
        }
      }
    } catch { /* El formato por líneas sigue funcionando sin una referencia válida. */ }
  }
  return lines.map((line, index) => {
    const match = line.match(/^(\d+[a-z]?)\s*[.\-:]?\s+(.+)$/i);
    return { number: match?.[1] || index + 1, tokens: tokenize(match?.[2] || line) };
  });
}

function printWord(token, focusId = null) {
  const character = characterById(token.characterId);
  const classes = ["print-word", character ? "colored" : "", focusId && token.characterId === focusId ? "focus" : ""].filter(Boolean).join(" ");
  return /^\s+$/.test(token.text) ? token.text : `<span class="${classes}" style="--word-color:${character?.color || "inherit"}">${escapeHtml(token.text)}</span>`;
}

function createSheet(character = null) {
  const font = $("#print-font")?.value || "Inter";
  const fontStack = PRINT_FONT_STACKS[font] || PRINT_FONT_STACKS.Inter;
  const size = $("#print-size")?.value || "14";
  const weight = $("#print-weight")?.value || "400";
  const role = character ? character.name : "Lectura completa";
  return `<article class="print-sheet ${character ? "solo" : ""}" style="--sheet-color:${character?.color || "#24251f"};--print-font:${fontStack};--print-size:${size}pt;--print-weight:${weight}">
    <header class="print-header"><div><p class="print-kicker">${escapeHtml(versionLabel(state.version))}</p><h1 class="print-title">${escapeHtml(state.reference)}</h1></div>
    <div class="print-role"><p class="print-role-label">Guion de</p><p class="print-role-name">${escapeHtml(role)}</p></div></header>
    <div class="print-passage">${state.verses.map((verse) => `<span class="print-verse"><sup class="print-number">${escapeHtml(String(verse.number))}</sup>${verse.tokens.map((token) => printWord(token, character?.id)).join("")}</span>`).join("")}</div>
    <footer class="print-footer">${escapeHtml(state.copyright || "Documento preparado con Voces.")}</footer>
  </article>`;
}

function openPrintOptions() {
  if (!state.verses.length) return showToast("Carga o pega un pasaje antes de imprimir.");
  let dialog = $("#print-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "print-dialog";
    dialog.innerHTML = `<form method="dialog" class="dialog-card">
      <button class="dialog-close" value="cancel" aria-label="Cerrar">×</button><p class="eyebrow">Salida</p><h2>Preparar impresión</h2>
      <p>Se crearán ${state.characters.length + 1} hojas: una completa y una por personaje.</p>
      <label for="print-font">Tipografía</label><select id="print-font"><option>Inter</option><option>Lora</option><option>Nunito</option><option>Atkinson Hyperlegible</option></select>
      <label for="print-weight">Variante</label><select id="print-weight"><option value="400">Regular</option><option value="700">Bold</option></select>
      <label for="print-size">Tamaño de letra</label><select id="print-size"><option value="11">11 pt</option><option value="12">12 pt</option><option value="14" selected>14 pt</option><option value="16">16 pt</option><option value="18">18 pt</option><option value="20">20 pt</option></select>
      <div id="print-preview" class="print-preview"><span>Vista previa</span><p>En el principio era el Verbo.</p></div>
      <div class="dialog-actions end"><button value="cancel" class="button button-ghost">Cancelar</button><button id="confirm-print" value="default" class="button button-accent">Imprimir ${state.characters.length + 1} hojas</button></div>
    </form>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll("select").forEach((select) => { select.style.cssText = "width:100%;height:44px;border:1px solid var(--line);border-radius:7px;padding:0 10px;background:white"; });
    const updatePrintPreview = () => {
      const font = $("#print-font").value;
      const preview = $("#print-preview");
      preview.style.fontFamily = PRINT_FONT_STACKS[font];
      preview.style.fontWeight = $("#print-weight").value;
      preview.querySelector("p").style.fontSize = `${$("#print-size").value}pt`;
    };
    dialog.querySelectorAll("select").forEach((select) => select.addEventListener("change", updatePrintPreview));
    updatePrintPreview();
    $("#confirm-print").addEventListener("click", async (event) => {
      event.preventDefault();
      const printButton = event.currentTarget;
      const font = $("#print-font").value;
      const weight = $("#print-weight").value;
      const size = $("#print-size").value;
      printButton.disabled = true;
      printButton.textContent = "Preparando tipografía…";
      if (document.fonts?.load) {
        await Promise.race([
          document.fonts.load(`${weight} ${size}pt "${font}"`),
          new Promise((resolve) => setTimeout(resolve, 2500))
        ]);
      }
      els.printRoot.innerHTML = createSheet() + state.characters.map(createSheet).join("");
      dialog.close();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
      printButton.disabled = false;
    });
  }
  dialog.querySelector("p:not(.eyebrow)").textContent = `Se crearán ${state.characters.length + 1} hojas: una completa y una por personaje.`;
  $("#confirm-print").textContent = `Imprimir ${state.characters.length + 1} hojas`;
  dialog.showModal();
}

els.passageForm.addEventListener("submit", async (event) => {
  event.preventDefault(); setBusy(true);
  try { await loadPassage(els.passageInput.value.trim(), els.versionSelect.value); showToast("Pasaje cargado."); }
  catch (error) { showToast(error.message); }
  finally { setBusy(false); }
});

els.characterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (els.characterName.value.trim()) addCharacter(els.characterName.value, els.characterColor.value);
  els.characterName.value = ""; els.characterName.focus();
});

els.characterList.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (remove) {
    event.stopPropagation();
    const id = remove.dataset.remove;
    state.characters = state.characters.filter((c) => c.id !== id);
    state.verses.forEach((v) => v.tokens.forEach((t) => { if (t.characterId === id) t.characterId = null; }));
    if (state.activeCharacter === id) state.activeCharacter = null;
    render(); scheduleSave(); return;
  }
  const row = event.target.closest("[data-character]");
  if (row) { state.activeCharacter = row.dataset.character; state.erasing = false; renderCharacters(); }
});
els.characterList.addEventListener("change", (event) => {
  const input = event.target.closest("[data-color]");
  if (!input) return;
  const character = characterById(input.dataset.color);
  if (character) { character.color = input.value; render(); scheduleSave(); }
});

els.eraser.addEventListener("click", () => { state.erasing = !state.erasing; renderCharacters(); });
function selectionRectangle(x, y) {
  const origin = state.selectionOrigin;
  return { left: Math.min(origin.x, x), top: Math.min(origin.y, y), right: Math.max(origin.x, x), bottom: Math.max(origin.y, y) };
}

function wordsInside(rectangle) {
  return [...els.passageContent.querySelectorAll(".word")].filter((word) => {
    const box = word.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    return centerX >= rectangle.left && centerX <= rectangle.right && centerY >= rectangle.top && centerY <= rectangle.bottom;
  });
}

function clearSelectionPreview() {
  els.passageContent.querySelectorAll(".selection-preview").forEach((word) => word.classList.remove("selection-preview"));
  els.selectionBox.classList.remove("visible");
}

els.passageContent.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !state.verses.length) return;
  const desired = state.erasing ? null : state.activeCharacter;
  if (!desired && !state.erasing) return showToast("Selecciona primero un personaje.");
  event.preventDefault();
  const active = characterById(state.activeCharacter);
  state.dragging = true;
  state.selectionOrigin = { x: event.clientX, y: event.clientY, target: event.target.closest(".word") };
  els.selectionBox.style.setProperty("--selection-color", state.erasing ? "#6f706a" : active.color);
  els.passageContent.style.setProperty("--selection-color", state.erasing ? "#6f706a" : active.color);
});

window.addEventListener("pointermove", (event) => {
  if (!state.dragging || !state.selectionOrigin) return;
  event.preventDefault();
  const rect = selectionRectangle(event.clientX, event.clientY);
  if (rect.right - rect.left < 5 && rect.bottom - rect.top < 5) return;
  Object.assign(els.selectionBox.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.right - rect.left}px`, height: `${rect.bottom - rect.top}px` });
  els.selectionBox.classList.add("visible");
  els.passageContent.querySelectorAll(".word").forEach((word) => word.classList.remove("selection-preview"));
  wordsInside(rect).forEach((word) => word.classList.add("selection-preview"));
}, { passive: false });

window.addEventListener("pointerup", (event) => {
  if (!state.dragging || !state.selectionOrigin) return;
  const origin = state.selectionOrigin;
  const rect = selectionRectangle(event.clientX, event.clientY);
  const isClick = rect.right - rect.left < 5 && rect.bottom - rect.top < 5;
  const desired = state.erasing ? null : state.activeCharacter;
  if (isClick && origin.target) {
    const token = state.verses[+origin.target.dataset.verse].tokens[+origin.target.dataset.token];
    assignWord(origin.target, token.characterId === desired ? null : desired);
  } else {
    const selected = wordsInside(rect);
    selected.forEach((word) => assignWord(word, desired));
    if (selected.length) showToast(`${selected.length} palabras seleccionadas.`);
  }
  state.dragging = false;
  state.selectionOrigin = null;
  clearSelectionPreview();
});

function cancelAreaSelection() {
  if (!state.dragging) return;
  state.dragging = false;
  state.selectionOrigin = null;
  clearSelectionPreview();
}
window.addEventListener("pointercancel", cancelAreaSelection);
window.addEventListener("blur", cancelAreaSelection);

$("#paste-button").addEventListener("click", () => { $("#manual-reference").value = els.passageInput.value; els.pasteDialog.showModal(); });
$("#use-manual-text").addEventListener("click", (event) => {
  event.preventDefault();
  try {
    state.reference = $("#manual-reference").value.trim() || "Pasaje bíblico";
    state.version = els.versionSelect.value;
    state.verses = parseManualText($("#manual-text").value, $("#manual-reference").value.trim());
    state.copyright = "Texto introducido manualmente por el usuario.";
    els.passageInput.value = state.reference; els.pasteDialog.close(); render(); scheduleSave(); showToast("Texto preparado.");
  } catch (error) { showToast(error.message); }
});
$("#clear-button").addEventListener("click", () => {
  if (!state.verses.length || !confirm("¿Quitar todas las asignaciones de personajes?")) return;
  state.verses.forEach((v) => v.tokens.forEach((t) => { t.characterId = null; })); renderPassage(); scheduleSave();
});
$("#print-button").addEventListener("click", openPrintOptions);

const restoredProject = restore();
if (!restoredProject) {
  addCharacter("Narrador", COLORS[0]);
  addCharacter("Jesús", COLORS[1]);
  addCharacter("Nicodemo", COLORS[2]);
}
render();
