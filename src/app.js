import { TILE_DEFINITIONS, TILE_ORDER, assignmentsFor, createTile, faceLabel } from "./tiles.js";

const translations = {
  en: {
    title: "find the possible equation",
    subtitle: "Add the tiles on the board and in your hand, then find the top 30 solutions.",
    boardTitle: "Tiles on the Board",
    lineLength: "Line length", locked: "Tile on the Board", selected: "Selected", clearBoard: "Clear board",
    lockedPalette: "Locked tile palette", tapTileToggle: "Tap a tile to add or remove it",
    handTitle: "Add the tiles in your hand",
    clearHand: "Clear hand", handPalette: "Hand tile palette",
    bingoOnly: "Bingo only", solve: "Find best equations",
    ranked: "RANKED BY SCORE", results: "Best equations",
    chooseValue: "CHOOSE ITS VALUE", assignmentHelp: "This records the physical tile and the value shown on the board.",
    searching: "Searching legal equations…", searchingHelp: "Exact arithmetic, no rounding", blankTile: "Blank tile", flexibleTile: "Flexible tile",
    placed: "Placed", score: "points", baseScore: "Tile score", bingoBonus: "Bingo bonus", used: "hand tiles used",
    completeSearch: "Search complete", partialSearch: "The analysis limit was reached. These are the best results found so far; try fewer hand tiles for an exhaustive search.",
    noResults: "No legal equations found", noResultsHelp: "Try adding an equals tile, changing the locked tiles, or turning off Bingo only.",
    needHand: "Add at least one tile to your hand.",
    handFull: "The hand can contain at most 15 tiles.", workerError: "The solver could not start. Please reload and try again.",
    resultCount: "{count} result", resultCountPlural: "{count} results",
    removeTile: "Remove {tile}", selectCell: "Select empty cell {cell}", removeLocked: "Remove locked tile from cell {cell}",
    addTile: "Add {tile}", placeTile: "Place {tile} in selected cell", lineLabel: "Board line with {count} cells"
  },
  th: {
    title: "ค้นหาสมการที่เป็นไปได้",
    subtitle: "ใส่เบี้ยบนกระดาน เบี้ยในมือ แล้วหาคำตอบที่ดีที่สุด 30 อันดับแรก",
    boardTitle: "เบี้ยบนกระดาน",
    lineLength: "จำนวนช่อง", locked: "เบี้ยบนกระดาน", selected: "ช่องที่เลือก", clearBoard: "ล้างกระดาน",
    lockedPalette: "เบี้ยสำหรับกระดาน", tapTileToggle: "แตะที่เบี้ยเพื่อนำเข้าและนำออก",
    handTitle: "ใส่เบี้ยในมือ",
    clearHand: "ล้างเบี้ยในมือ", handPalette: "เบี้ยในมือ",
    bingoOnly: "เฉพาะบิงโก", solve: "ค้นหาสมการที่ดีที่สุด",
    ranked: "เรียงตามคะแนน", results: "สมการที่ดีที่สุด",
    chooseValue: "เลือกค่าของเบี้ย", assignmentHelp: "ระบบจะจำทั้งชนิดเบี้ยจริงและค่าที่แสดงอยู่บนกระดาน",
    searching: "กำลังค้นหาสมการที่ถูกต้อง…", searchingHelp: "คำนวณแบบแม่นยำ ไม่มีการปัดเศษ", blankTile: "เบี้ย Blank", flexibleTile: "เบี้ยเครื่องหมายเลือกได้",
    placed: "วางใหม่", score: "คะแนน", baseScore: "คะแนนเบี้ย", bingoBonus: "โบนัสบิงโก", used: "เบี้ยจากมือที่ใช้",
    completeSearch: "ค้นหาครบแล้ว", partialSearch: "ถึงขีดจำกัดการวิเคราะห์แล้ว นี่คือคำตอบที่ดีที่สุดที่พบ ลองลดจำนวนเบี้ยเพื่อค้นหาแบบครบทั้งหมด",
    noResults: "ไม่พบสมการที่ถูกต้อง", noResultsHelp: "ลองเพิ่มเครื่องหมายเท่ากับ เปลี่ยนเบี้ยล็อก หรือปิดตัวกรองเฉพาะบิงโก",
    needHand: "กรุณาใส่เบี้ยในมืออย่างน้อย 1 ตัว",
    handFull: "ใส่เบี้ยในมือได้สูงสุด 15 ตัว", workerError: "ไม่สามารถเริ่มตัวค้นหาได้ กรุณารีโหลดแล้วลองอีกครั้ง",
    resultCount: "{count} คำตอบ", resultCountPlural: "{count} คำตอบ",
    removeTile: "นำ {tile} ออก", selectCell: "เลือกช่องว่างที่ {cell}", removeLocked: "นำเบี้ยล็อกออกจากช่อง {cell}",
    addTile: "เพิ่ม {tile}", placeTile: "วาง {tile} ในช่องที่เลือก", lineLabel: "แนวกระดาน {count} ช่อง"
  }
};

const browserThai = navigator.language?.toLowerCase().startsWith("th");
let language = localStorage.getItem("amath-language") || (browserThai ? "th" : "en");
let board = Array(13).fill(null);
let hand = [];
let selectedCell = 6;
let worker = null;
let lastSolveBoardLength = 13;
let lastResultsPayload = null;

const elements = Object.fromEntries([
  "languageButton", "lineLength", "lineLengthValue", "decreaseLength", "increaseLength", "boardCells", "boardPalette",
  "clearBoard", "handRack", "handCount", "clearHand", "handPalette",
  "bingoOnly", "solveButton", "solveError", "resultsSection", "resultCount", "searchNotice", "resultsList",
  "assignmentDialog", "assignmentTitle", "assignmentOptions", "loadingOverlay"
].map((id) => [id, document.getElementById(id)]));

function t(key, values = {}) {
  let text = translations[language][key] ?? translations.en[key] ?? key;
  for (const [name, value] of Object.entries(values)) text = text.replace(`{${name}}`, value);
  return text;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  elements.languageButton.textContent = language === "en" ? "ไทย" : "EN";
  elements.languageButton.setAttribute("aria-label", language === "en" ? "เปลี่ยนเป็นภาษาไทย" : "Switch to English");
  renderAll();
  if (lastResultsPayload && !elements.resultsSection.hidden) renderResults(lastResultsPayload, false);
}

function invalidateResults() {
  elements.resultsSection.hidden = true;
  lastResultsPayload = null;
  elements.solveError.textContent = "";
}

function physicalLabel(type) {
  return TILE_DEFINITIONS[type].label;
}

function tileButton(type, purpose) {
  const definition = TILE_DEFINITIONS[type];
  const button = document.createElement("button");
  button.type = "button";
  button.className = `tile tile-${definition.kind}`;
  button.innerHTML = `<strong>${definition.label}</strong><small>${definition.score}</small>`;
  button.title = `${definition.label} · ${definition.score} ${t("score")}`;
  button.setAttribute("aria-label", t(purpose === "board" ? "placeTile" : "addTile", { tile: definition.label }));
  button.addEventListener("click", () => purpose === "board" ? addBoardTile(type) : addHandTile(type));
  return button;
}

function renderPalettes() {
  elements.boardPalette.replaceChildren(...TILE_ORDER.map((type) => tileButton(type, "board")));
  elements.handPalette.replaceChildren(...TILE_ORDER.map((type) => tileButton(type, "hand")));
}

function tileMarkup(tile, options = {}) {
  const face = tile.face == null ? TILE_DEFINITIONS[tile.type].label : faceLabel(tile.face);
  const actual = physicalLabel(tile.type);
  const special = ["+-", "*/", "?"].includes(tile.type);
  return `<strong>${face}</strong><small>${tile.score}</small>${special && options.showType !== false ? `<em>${actual}</em>` : ""}`;
}

function renderBoard() {
  elements.boardCells.setAttribute("aria-label", t("lineLabel", { count: board.length }));
  elements.boardCells.style.setProperty("--cell-count", board.length);
  elements.boardCells.replaceChildren(...board.map((tile, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `board-cell${tile ? " has-tile" : ""}${index === selectedCell ? " is-selected" : ""}`;
    button.setAttribute("role", "gridcell");
    button.dataset.index = String(index);
    button.innerHTML = tile ? tileMarkup(tile) : `<span>${index + 1}</span>`;
    button.setAttribute("aria-label", tile ? t("removeLocked", { cell: index + 1 }) : t("selectCell", { cell: index + 1 }));
    button.addEventListener("click", () => {
      if (board[index]) {
        board[index] = null;
        selectedCell = index;
      } else selectedCell = index;
      invalidateResults();
      renderBoard();
    });
    return button;
  }));
}

function renderHand() {
  if (!hand.length) {
    const empty = document.createElement("p");
    empty.className = "empty-rack";
    empty.textContent = language === "th" ? "เบี้ยที่เพิ่มจะแสดงที่นี่" : "Your tiles will appear here";
    elements.handRack.replaceChildren(empty);
  } else {
    elements.handRack.replaceChildren(...hand.map((tile, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tile rack-tile tile-${tile.kind}`;
      button.innerHTML = tileMarkup(tile, { showType: false });
      button.setAttribute("aria-label", t("removeTile", { tile: physicalLabel(tile.type) }));
      button.title = `${language === "th" ? "แตะเพื่อนำออก" : "Tap to remove"}: ${physicalLabel(tile.type)}`;
      button.addEventListener("click", () => {
        hand.splice(index, 1);
        invalidateResults();
        renderHand();
      });
      return button;
    }));
  }
  elements.handCount.textContent = `${hand.length} / 15`;
}

function renderAll() {
  renderBoard();
  renderHand();
  renderPalettes();
}

function chooseAssignment(type) {
  const unassigned = createTile(type, null, "board");
  const choices = assignmentsFor(unassigned);
  elements.assignmentTitle.textContent = type === "?" ? t("blankTile") : t("flexibleTile");
  elements.assignmentOptions.replaceChildren(...choices.map((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "assignment-option";
    button.innerHTML = `<strong>${faceLabel(tile.face)}</strong><span>${physicalLabel(type)} · ${tile.score} ${t("score")}</span>`;
    button.addEventListener("click", () => {
      elements.assignmentDialog.dispatchEvent(new CustomEvent("tilechosen", { detail: tile }));
      elements.assignmentDialog.close();
    });
    return button;
  }));
  elements.assignmentDialog.showModal();
  return new Promise((resolve) => {
    const chosen = (event) => { cleanup(); resolve(event.detail); };
    const closed = () => { cleanup(); resolve(null); };
    const cleanup = () => {
      elements.assignmentDialog.removeEventListener("tilechosen", chosen);
      elements.assignmentDialog.removeEventListener("close", closed);
    };
    elements.assignmentDialog.addEventListener("tilechosen", chosen, { once: true });
    elements.assignmentDialog.addEventListener("close", closed, { once: true });
  });
}

async function addBoardTile(type) {
  if (selectedCell == null) selectedCell = board.findIndex((tile) => !tile);
  if (selectedCell < 0) return;
  let tile = createTile(type, null, "board");
  if (tile.face == null) tile = await chooseAssignment(type);
  if (!tile) return;
  board[selectedCell] = { ...tile, source: "board" };
  const nextEmpty = board.findIndex((entry, index) => index > selectedCell && !entry);
  if (nextEmpty >= 0) selectedCell = nextEmpty;
  invalidateResults();
  renderBoard();
}

function addHandTile(type) {
  if (hand.length >= 15) {
    elements.solveError.textContent = t("handFull");
    return;
  }
  hand.push(createTile(type, null, "hand"));
  invalidateResults();
  renderHand();
}

function setLineLength(value) {
  const length = Math.max(3, Math.min(15, Number(value)));
  if (length > board.length) board.push(...Array(length - board.length).fill(null));
  else if (length < board.length) board = board.slice(0, length);
  selectedCell = Math.min(selectedCell ?? 0, length - 1);
  elements.lineLength.value = String(length);
  elements.lineLengthValue.textContent = String(length);
  invalidateResults();
  renderBoard();
}

function renderResults(payload, shouldScroll = true) {
  const { results, complete } = payload;
  lastResultsPayload = payload;
  elements.resultsSection.hidden = false;
  elements.resultCount.textContent = t(results.length === 1 ? "resultCount" : "resultCountPlural", { count: results.length });
  elements.searchNotice.hidden = complete;
  elements.searchNotice.textContent = complete ? "" : t("partialSearch");

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "no-results";
    empty.innerHTML = `<strong>${t("noResults")}</strong><p>${t("noResultsHelp")}</p>`;
    elements.resultsList.replaceChildren(empty);
  } else {
    elements.resultsList.replaceChildren(...results.map((result, rank) => {
      const article = document.createElement("article");
      article.className = "result-card";
      const resultCells = Array(lastSolveBoardLength).fill(null);
      result.cells.forEach((cell, index) => { resultCells[result.start + index] = cell; });
      article.innerHTML = `
        <div class="result-summary">
          <span class="rank">#${rank + 1}</span>
          <div class="equation-text">${result.equation}</div>
          <div class="score-pill"><strong>${result.score}</strong><span>${t("score")}</span></div>
        </div>
        <div class="result-board" role="grid" style="--result-cell-count:${lastSolveBoardLength}">
          ${resultCells.map((cell, index) => cell
            ? `<div class="result-cell ${cell.source}" role="gridcell"><span class="cell-number">${index + 1}</span>${tileMarkup(cell)}<b>${cell.source === "board" ? t("locked") : t("placed")}</b></div>`
            : `<div class="result-cell empty" role="gridcell"><span class="cell-number">${index + 1}</span></div>`).join("")}
        </div>
        <div class="result-details">
          <span>${t("baseScore")} <strong>${result.baseScore}</strong></span>
          ${result.bingoBonus ? `<span>${t("bingoBonus")} <strong>+${result.bingoBonus}</strong></span>` : ""}
          <span><strong>${result.usedCount}</strong> ${t("used")}</span>
        </div>`;
      return article;
    }));
  }
  if (shouldScroll) elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function solve() {
  elements.solveError.textContent = "";
  if (!hand.length) {
    elements.solveError.textContent = t("needHand");
    return;
  }
  if (worker) worker.terminate();
  worker = new Worker(new URL("./solver-worker.js", import.meta.url), { type: "module" });
  lastSolveBoardLength = board.length;
  elements.loadingOverlay.hidden = false;
  elements.solveButton.disabled = true;
  worker.addEventListener("message", (event) => {
    elements.loadingOverlay.hidden = true;
    elements.solveButton.disabled = false;
    if (event.data.ok) renderResults(event.data.payload);
    else elements.solveError.textContent = event.data.error || t("workerError");
    worker.terminate();
    worker = null;
  }, { once: true });
  worker.addEventListener("error", () => {
    elements.loadingOverlay.hidden = true;
    elements.solveButton.disabled = false;
    elements.solveError.textContent = t("workerError");
    worker?.terminate();
    worker = null;
  }, { once: true });
  worker.postMessage({ board, hand, bingoOnly: elements.bingoOnly.checked, limit: 30, timeLimitMs: 3500, maxNodes: 2_500_000 });
}

elements.languageButton.addEventListener("click", () => {
  language = language === "en" ? "th" : "en";
  localStorage.setItem("amath-language", language);
  applyLanguage();
});
elements.lineLength.addEventListener("input", (event) => setLineLength(event.target.value));
elements.decreaseLength.addEventListener("click", () => setLineLength(board.length - 1));
elements.increaseLength.addEventListener("click", () => setLineLength(board.length + 1));
elements.clearBoard.addEventListener("click", () => { board = Array(board.length).fill(null); selectedCell = Math.floor(board.length / 2); invalidateResults(); renderBoard(); });
elements.clearHand.addEventListener("click", () => { hand = []; invalidateResults(); renderHand(); });
elements.solveButton.addEventListener("click", solve);
elements.bingoOnly.addEventListener("change", invalidateResults);

applyLanguage();
