const BOOKS = new Set(["genesis","exodo","levitico","numeros","deuteronomio","josue","jueces","rut","1 samuel","2 samuel","1 reyes","2 reyes","1 cronicas","2 cronicas","esdras","nehemias","ester","job","salmos","salmo","proverbios","eclesiastes","cantares","isaias","jeremias","lamentaciones","ezequiel","daniel","oseas","joel","amos","abdias","jonas","miqueas","nahum","habacuc","sofonias","hageo","zacarias","malaquias","mateo","marcos","lucas","juan","hechos","romanos","1 corintios","2 corintios","galatas","efesios","filipenses","colosenses","1 tesalonicenses","2 tesalonicenses","1 timoteo","2 timoteo","tito","filemon","hebreos","santiago","1 pedro","2 pedro","1 juan","2 juan","3 juan","judas","apocalipsis"]);
const COPYRIGHTS = {
  NTV:"Nueva Traducción Viviente (NTV) © 2009, 2010 por Tyndale House Foundation. Usado con permiso.",
  RVR1960:"Reina-Valera 1960 (RVR1960) © 1960 Sociedades Bíblicas Unidas. Usado con permiso."
};
const FONT_STACKS = {
  Nunito:"'Nunito', Arial, sans-serif", Quicksand:"'Quicksand', Arial, sans-serif",
  Fredoka:"'Fredoka', 'Trebuchet MS', sans-serif", "Atkinson Hyperlegible":"'Atkinson Hyperlegible', Verdana, sans-serif",
  "Baloo 2":"'Baloo 2', 'Trebuchet MS', sans-serif"
};
const EMOJIS = {
  fe:["❤️","🙏","🕊️","✝️","📖","👑","⭐","🌟","✨","🙌","🫶","🤍","💛","🔥","🌈","🪽","💒","🎵"],
  naturaleza:["🌍","🌎","🌏","☀️","🌙","☁️","🌊","💧","🌱","🌿","🌳","🌾","🌻","🌹","🪻","🍇","🐑","🦁","🐟","🦋","🐦","🐋","⛰️","🏜️"],
  personas:["👶","🧒","👧","👦","👩","👨","🧓","👴","👵","👨‍👩‍👧‍👦","🤝","🫂","👀","👂","🗣️","💪","🫴","👉","🏃","🧎","😇","😊","😮","🥰"],
  objetos:["💡","🔑","🚪","🏠","🛡️","⚔️","📜","✉️","🎁","💎","🪙","🍞","🏺","🕯️","⛵","⚓","🪜","⏳","🔔","🎺","🧺","🪨","🧭","🗺️"]
};
const state = { reference:"", version:"RVR1960", tokens:[], selected:new Set(), dragging:false, origin:null, copyright:"", baseColor:"#25251f" };
const $ = (selector) => document.querySelector(selector);
const els = { form:$("#verse-form"), reference:$("#reference-input"), version:$("#version-select"), canvas:$("#verse-canvas"), empty:$("#empty-state"), title:$("#verse-reference"), versionLabel:$("#verse-version"), copyright:$("#copyright"), selectionCount:$("#selection-count"), selectionBox:$("#selection-box"), toast:$("#toast"), printRoot:$("#print-root") };

function normalize(value) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/\s+/g," "); }
function escapeHtml(value) { const node=document.createElement("div"); node.textContent=value; return node.innerHTML; }
function uid() { return Math.random().toString(36).slice(2,9); }
function parseReference(value) {
  const match=normalize(value).match(/^(.+?)\s+(\d+)\s*:\s*(\d+)$/);
  if(!match) throw new Error("Usa un formato como Juan 3:16.");
  const [,book,chapter,verse]=match;
  if(!BOOKS.has(book)) throw new Error(`No reconozco el libro “${book}”.`);
  return { book,chapter:Number(chapter),verse:Number(verse) };
}
function splitWord(text) {
  const match=text.match(/^([^\p{L}\p{N}]*)((?:[\p{L}\p{N}ÁÉÍÓÚÜÑáéíóúüñ'-])+)([^\p{L}\p{N}]*)$/u);
  return match ? { prefix:match[1],core:match[2],suffix:match[3] } : { prefix:"",core:text,suffix:"" };
}
function tokenize(text) {
  return text.trim().split(/(\s+)/).filter(Boolean).map((value) => /^\s+$/.test(value) ? { id:uid(),space:true,text:value } : { id:uid(),...splitWord(value),color:null,emoji:null });
}
function showToast(message) { els.toast.textContent=message; els.toast.classList.add("visible"); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>els.toast.classList.remove("visible"),2600); }
function versionName() { return state.version==="NTV" ? "Nueva Traducción Viviente · NTV" : "Reina-Valera 1960 · RVR1960"; }
function tokenById(id) { return state.tokens.find((token)=>token.id===id); }
function wordHtml(token,{print=false,visibleReplacementIds=null}={}) {
  if(token.space) return token.text;
  const selected=!print&&state.selected.has(token.id);
  const style=token.color?`style="color:${token.color}"`:"";
  const showReplacement=Boolean(token.emoji||token.image)&&(!visibleReplacementIds||visibleReplacementIds.has(token.id));
  const replacement=token.image?`<img class="replacement replacement-image" src="${escapeHtml(token.image)}" alt="" />`:`<span class="replacement">${escapeHtml(token.emoji||"")}</span>`;
  return `<span class="word ${selected?"selected":""} ${showReplacement?"replaced":""}" data-id="${token.id}" ${style}>${escapeHtml(token.prefix)}<span class="word-core"><span class="original">${escapeHtml(token.core)}</span>${replacement}</span>${escapeHtml(token.suffix)}</span>`;
}
function render() {
  const hasVerse=state.tokens.length>0;
  els.empty.hidden=hasVerse; els.canvas.hidden=!hasVerse;
  els.title.textContent=hasVerse?state.reference:"Carga un versículo";
  els.versionLabel.textContent=hasVerse?versionName():"Sin verso";
  els.copyright.textContent=state.copyright||"";
  els.canvas.style.color=state.baseColor;
  els.canvas.innerHTML=state.tokens.map((token)=>wordHtml(token)).join("");
  $("#base-color").value=state.baseColor;
  $("#base-colors").querySelectorAll("[data-base-color]").forEach((button)=>button.classList.toggle("active",button.dataset.baseColor.toLowerCase()===state.baseColor.toLowerCase()));
  updateSelectionCount();
}
function updateSelectionCount() { const count=state.selected.size; els.selectionCount.textContent=`${count} ${count===1?"seleccionada":"seleccionadas"}`; }
function save() {
  $("#save-status").textContent="Guardando…"; clearTimeout(save.timer);
  save.timer=setTimeout(()=>{ try{localStorage.setItem("verso-magico-project",JSON.stringify({reference:state.reference,version:state.version,tokens:state.tokens,copyright:state.copyright,baseColor:state.baseColor}));$("#save-status").textContent="Guardado";}catch{$("#save-status").textContent="PNG demasiado grande";showToast("No se pudo guardar: prueba con un PNG más pequeño.");} },250);
}
function restore() {
  try { const saved=JSON.parse(localStorage.getItem("verso-magico-project")); if(!saved) return; Object.assign(state,saved); state.selected=new Set(); ensureReplacementOrders(); els.reference.value=state.reference||els.reference.value; els.version.value=state.version||"RVR1960"; } catch { localStorage.removeItem("verso-magico-project"); }
}
function ensureReplacementOrders(){
  let next=Math.max(0,...state.tokens.map((token)=>Number.isFinite(token.replacementOrder)?token.replacementOrder:0))+1;
  state.tokens.forEach((token)=>{if((token.emoji||token.image)&&!Number.isFinite(token.replacementOrder)){token.replacementOrder=next;next+=1;}});
}
function ensureTokenReplacementOrder(token){if(!Number.isFinite(token.replacementOrder)){ensureReplacementOrders();token.replacementOrder=Math.max(0,...state.tokens.map((item)=>Number.isFinite(item.replacementOrder)?item.replacementOrder:0))+1;}}
async function loadVerse(reference,version) {
  const parsed=parseReference(reference); const slug=encodeURIComponent(parsed.book.replace(/\s+/g,"-"));
  const response=await fetch(`https://api.midvash.com/v1/${version.toLowerCase()}/${slug}/${parsed.chapter}/${parsed.verse}`);
  if(!response.ok) throw new Error(response.status===404?"No encontré ese versículo.":"La fuente bíblica no respondió. Puedes escribirlo manualmente.");
  const payload=await response.json(); const text=payload.data?.text;
  if(!text) throw new Error("La fuente no devolvió texto.");
  state.reference=reference; state.version=version; state.tokens=tokenize(text); state.selected.clear(); state.copyright=COPYRIGHTS[version]; render(); save();
}
function requireSelection() { if(!state.selected.size){showToast("Selecciona una o varias palabras primero."); return false;} return true; }
function modifySelected(change) { if(!requireSelection()) return; state.tokens.forEach((token)=>{if(state.selected.has(token.id)) change(token);}); render(); save(); }
function rectTo(x,y) { return {left:Math.min(state.origin.x,x),top:Math.min(state.origin.y,y),right:Math.max(state.origin.x,x),bottom:Math.max(state.origin.y,y)}; }
function wordsIn(rect) { return [...els.canvas.querySelectorAll(".word")].filter((word)=>{const box=word.getBoundingClientRect(); const x=box.left+box.width/2,y=box.top+box.height/2; return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;}); }
function clearMarquee() { els.selectionBox.classList.remove("visible"); els.canvas.querySelectorAll(".selection-preview").forEach((word)=>word.classList.remove("selection-preview")); }

els.form.addEventListener("submit",async(event)=>{event.preventDefault(); const button=els.form.querySelector("button[type=submit]"); button.disabled=true; button.textContent="Cargando…"; try{await loadVerse(els.reference.value.trim(),els.version.value); showToast("¡Versículo listo para jugar!");}catch(error){showToast(error.message);}finally{button.disabled=false; button.innerHTML="Cargar verso <span>→</span>";}});
els.canvas.addEventListener("pointerdown",(event)=>{if(event.button!==0||!state.tokens.length)return; event.preventDefault(); state.dragging=true; state.origin={x:event.clientX,y:event.clientY,target:event.target.closest(".word")};});
window.addEventListener("pointermove",(event)=>{if(!state.dragging)return; event.preventDefault(); const rect=rectTo(event.clientX,event.clientY); if(rect.right-rect.left<5&&rect.bottom-rect.top<5)return; Object.assign(els.selectionBox.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.right-rect.left}px`,height:`${rect.bottom-rect.top}px`}); els.selectionBox.classList.add("visible"); els.canvas.querySelectorAll(".word").forEach((word)=>word.classList.remove("selection-preview")); wordsIn(rect).forEach((word)=>word.classList.add("selection-preview"));},{passive:false});
window.addEventListener("pointerup",(event)=>{if(!state.dragging)return; const origin=state.origin,rect=rectTo(event.clientX,event.clientY); const click=rect.right-rect.left<5&&rect.bottom-rect.top<5; if(click&&origin.target){const id=origin.target.dataset.id; state.selected.has(id)?state.selected.delete(id):state.selected.add(id);}else{wordsIn(rect).forEach((word)=>state.selected.add(word.dataset.id));} state.dragging=false; state.origin=null; clearMarquee(); render();});
function cancelMarquee(){if(!state.dragging)return;state.dragging=false;state.origin=null;clearMarquee();} window.addEventListener("pointercancel",cancelMarquee); window.addEventListener("blur",cancelMarquee);
$("#select-all").addEventListener("click",()=>{state.tokens.filter((token)=>!token.space).forEach((token)=>state.selected.add(token.id));render();});
$("#color-palette").addEventListener("click",(event)=>{const button=event.target.closest("[data-color]");if(button)modifySelected((token)=>{token.color=button.dataset.color;});});
$("#custom-color").addEventListener("change",(event)=>modifySelected((token)=>{token.color=event.target.value;}));
function renderEmojiCategory(category){$("#emoji-palette").innerHTML=EMOJIS[category].map((emoji)=>`<button type="button" data-emoji="${emoji}" aria-label="Usar ${emoji}">${emoji}</button>`).join("");}
$("#emoji-tabs").addEventListener("click",(event)=>{const button=event.target.closest("[data-emoji-category]");if(!button)return;$("#emoji-tabs").querySelectorAll("button").forEach((item)=>item.classList.remove("active"));button.classList.add("active");renderEmojiCategory(button.dataset.emojiCategory);});
$("#emoji-palette").addEventListener("click",(event)=>{const button=event.target.closest("[data-emoji]");if(button)modifySelected((token)=>{ensureTokenReplacementOrder(token);token.emoji=button.dataset.emoji;token.image=null;});});
$("#apply-custom-emoji").addEventListener("click",()=>{const emoji=$("#custom-emoji").value.trim();if(!emoji)return showToast("Escribe o pega un emoji.");modifySelected((token)=>{ensureTokenReplacementOrder(token);token.emoji=emoji;token.image=null;});});
$("#base-colors").addEventListener("click",(event)=>{const button=event.target.closest("[data-base-color]");if(!button)return;state.baseColor=button.dataset.baseColor;render();save();});
$("#base-color").addEventListener("change",(event)=>{state.baseColor=event.target.value;render();save();});
function resizePng(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const image=new Image();image.onerror=reject;image.onload=()=>{const scale=Math.min(1,256/Math.max(image.width,image.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/png"));};image.src=reader.result;};reader.readAsDataURL(file);});}
async function applyPng(file,label="PNG pegado"){
  if(!requireSelection())return false;
  if(file.type&&file.type!=="image/png"){showToast("La imagen debe estar en formato PNG.");return false;}
  $("#png-status").textContent="Preparando imagen…";
  try{const image=await resizePng(file);modifySelected((token)=>{ensureTokenReplacementOrder(token);token.image=image;token.emoji=null;});$("#png-status").textContent=label;showToast("PNG colocado sin alterar el espacio.");return true;}
  catch{$("#png-status").textContent="No se pudo leer el PNG";showToast("No se pudo procesar esa imagen.");return false;}
}
$("#png-input").addEventListener("change",async(event)=>{const file=event.target.files[0];if(file)await applyPng(file,file.name);event.target.value="";});
window.addEventListener("paste",async(event)=>{const item=[...(event.clipboardData?.items||[])].find((entry)=>entry.kind==="file"&&entry.type==="image/png");if(!item)return;event.preventDefault();const file=item.getAsFile();if(file)await applyPng(file,"PNG pegado desde el portapapeles");});
$("#restore-selected").addEventListener("click",()=>modifySelected((token)=>{token.color=null;token.emoji=null;token.image=null;token.replacementOrder=null;}));
$("#restore-all").addEventListener("click",()=>{state.tokens.forEach((token)=>{token.color=null;token.emoji=null;token.image=null;token.replacementOrder=null;});state.selected.clear();render();save();});
window.addEventListener("keydown",(event)=>{
  const target=event.target;
  const isTyping=target.matches("input,textarea,select,button,a")||target.isContentEditable;
  const dialogOpen=document.querySelector("dialog[open]");
  if(isTyping||dialogOpen)return;
  if(event.key==="Delete"&&state.selected.size){event.preventDefault();modifySelected((token)=>{token.color=null;token.emoji=null;token.image=null;token.replacementOrder=null;});showToast("Selección restaurada.");}
  if(event.key==="Enter"&&state.selected.size){event.preventDefault();state.selected.clear();render();showToast("Selección desmarcada.");}
});
$("#paste-button").addEventListener("click",()=>{$("#manual-reference").value=els.reference.value;$("#manual-dialog").showModal();});
$("#use-manual").addEventListener("click",(event)=>{event.preventDefault();const text=$("#manual-text").value.trim();if(!text)return showToast("Escribe el texto del versículo.");state.reference=$("#manual-reference").value.trim()||"Versículo";state.version=els.version.value;state.tokens=tokenize(text.replace(/\s+/g," "));state.selected.clear();state.copyright="Texto introducido manualmente por el usuario.";els.reference.value=state.reference;$("#manual-dialog").close();render();save();});

async function preparePrint() {
  const font=$("input[name=print-font]:checked").value,stack=FONT_STACKS[font]; const button=$("#confirm-print");
  button.disabled=true;button.textContent="Calculando tamaño…";
  if(document.fonts?.load){await Promise.race([document.fonts.load(`700 40pt "${font}"`),new Promise((resolve)=>setTimeout(resolve,3000))]);await Promise.race([document.fonts.ready,new Promise((resolve)=>setTimeout(resolve,1500))]);}
  ensureReplacementOrders();
  const replacements=state.tokens.filter((token)=>token.emoji||token.image).sort((a,b)=>a.replacementOrder-b.replacementOrder);
  const stages=[new Set(),...replacements.map((_,index)=>new Set(replacements.slice(0,index+1).map((token)=>token.id)))];
  const canvas=document.createElement("canvas");
  const context=canvas.getContext("2d");
  const availableWidth=267*96/25.4;
  const availableHeight=180*96/25.4;
  const lineHeight=1.2;
  const fitsAt=(sizePt)=>{
    const sizePx=sizePt*96/72;
    context.font=`700 ${sizePx}px "${font}"`;
    let lines=1,lineWidth=0,pendingSpace=0;
    const letterSpacing=-.015*sizePx;
    const textWidth=(text)=>Math.max(0,context.measureText(text).width+Math.max(0,[...text].length-1)*letterSpacing);
    for(const token of state.tokens){
      if(token.space){pendingSpace=textWidth(" ");continue;}
      const word=`${token.prefix}${token.core}${token.suffix}`;
      const width=textWidth(word);
      if(lineWidth>0&&lineWidth+pendingSpace+width>availableWidth){lines+=1;lineWidth=width;}else{lineWidth+=pendingSpace+width;}
      pendingSpace=0;
      if(width>availableWidth)return false;
    }
    return lines*sizePx*lineHeight<=availableHeight;
  };
  let low=12,high=420,best=12;
  while(low<=high){const middle=Math.floor((low+high)/2);if(fitsAt(middle)){best=middle;low=middle+1;}else{high=middle-1;}}
  const safeSize=Math.max(12,best-3);
  els.printRoot.innerHTML=stages.map((visibleReplacementIds)=>`<article class="print-page"><div class="print-verse" style="font-family:${stack};font-weight:700;color:${state.baseColor};font-size:${safeSize}pt">${state.tokens.map((token)=>wordHtml(token,{print:true,visibleReplacementIds})).join("")}</div></article>`).join("");
  $("#print-dialog").close();
  await new Promise((resolve)=>setTimeout(resolve,220));
  const resetButton=()=>{button.disabled=false;button.textContent="Preparar impresión";};
  window.addEventListener("afterprint",resetButton,{once:true});
  window.print();
  setTimeout(resetButton,10000);
}
$("#print-button").addEventListener("click",()=>{if(!state.tokens.length)return showToast("Carga un versículo antes de imprimir.");ensureReplacementOrders();const pages=state.tokens.filter((token)=>token.emoji||token.image).length+1;$("#print-dialog .dialog-copy").textContent=`Se generarán ${pages} ${pages===1?"hoja":"hojas"}: primero solo colores y después los reemplazos progresivos.`;$("#print-dialog").showModal();});
$("#confirm-print").addEventListener("click",(event)=>{event.preventDefault();preparePrint();});

renderEmojiCategory("fe");restore();render();
