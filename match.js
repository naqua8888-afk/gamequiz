/* =========================================================
   ЛОГІКА СТОРІНКИ match.html
   ========================================================= */

const params = new URLSearchParams(window.location.search);
const stageKey = params.get("stage"); // r1 | r2 | r3 | final
const idx = parseInt(params.get("idx") || "0", 10);

let state = loadTournament();
let match = getRawMatch(state, stageKey, idx);

if (!match || !match.categoryId) {
  alert("Цей матч ще не готовий до гри (не обрано категорію).");
  window.location.href = "tournament.html";
}

const category = findCategory(match.categoryId);

/* Визначаємо назви команд */
let teamAName, teamBName;
if (stageKey === "final") {
  teamAName = state.final.subA;
  teamBName = state.final.subB;
} else {
  const view = getBracketView(state);
  const viewMatch = view[stageKey][idx];
  teamAName = state.teams[viewMatch.teamAIndex];
  teamBName = state.teams[viewMatch.teamBIndex];
}

document.getElementById("catName").textContent = category ? category.title : "";
document.getElementById("teamAName").textContent = teamAName;
document.getElementById("teamBName").textContent = teamBName;

// Номери (індекси) вже зіграних питань; старе поле answeredPoints більше не використовується
if (!Array.isArray(match.answered)) match.answered = [];

let currentTaskIndex = null;

/* Команди обирають питання по черзі: першою ходить команда A.
   Черга визначається кількістю вже зіграних питань. */
function currentTurn() {
  return match.answered.length % 2 === 0 ? "A" : "B";
}

function teamName(who) {
  return who === "A" ? teamAName : teamBName;
}

function otherTeam(who) {
  return who === "A" ? "B" : "A";
}

function refreshTurn() {
  const allDone = match.answered.length === category.tasks.length;
  const turn = currentTurn();
  document.getElementById("teamABox").classList.toggle("active", !allDone && turn === "A");
  document.getElementById("teamBBox").classList.toggle("active", !allDone && turn === "B");
  document.getElementById("turnIndicator").textContent = allDone
    ? ""
    : `Обирає: ${teamName(turn)}`;
}

function refreshScores() {
  document.getElementById("teamAScore").textContent = match.scoreA;
  document.getElementById("teamBScore").textContent = match.scoreB;
}

function renderTiles() {
  const grid = document.getElementById("tasksGrid");
  grid.innerHTML = "";

  category.tasks.forEach((task, i) => {
    const isDone = match.answered.includes(i);
    const tile = document.createElement("div");
    tile.className = "task-tile" + (isDone ? " done" : "");
    tile.style.setProperty("--accent-color", "#3b82f6");
    tile.textContent = i + 1;
    if (!isDone) {
      tile.addEventListener("click", () => openModal(i));
    }
    grid.appendChild(tile);
  });

  const allDone = match.answered.length === category.tasks.length;
  document.getElementById("finishPanel").style.display = allDone ? "block" : "none";

  if (allDone) {
    // Нічиєї не буває: сума балів 1+…+6 = 21 — непарна
    const winner = match.scoreA > match.scoreB ? "A" : "B";
    if (!match.completed) finishMatch(winner);
    document.getElementById("winnerText").textContent = `🏆 Перемогла ${teamName(winner)}!`;
  }
}

function pointsLabel(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} бал`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} бали`;
  return `${n} балів`;
}

/* Питання №N коштує N балів */
function questionPoints(i) {
  return i + 1;
}

/* Фото / аудіо до питання (поля image та audio в data.js) */
const modalImage = document.getElementById("modalImage");
const modalAudio = document.getElementById("modalAudio");
const modalMediaMissing = document.getElementById("modalMediaMissing");

function showMissing(src) {
  modalMediaMissing.textContent = `⚠️ Файл не знайдено: ${src}`;
  modalMediaMissing.style.display = "block";
}

modalImage.addEventListener("error", () => {
  modalImage.style.display = "none";
  showMissing(modalImage.getAttribute("src"));
});
modalAudio.addEventListener("error", () => {
  modalAudio.style.display = "none";
  showMissing(modalAudio.getAttribute("src"));
});
// Клік по фото — на весь екран і назад
modalImage.addEventListener("click", () => modalImage.classList.toggle("zoomed"));

function renderMedia(task) {
  modalMediaMissing.style.display = "none";
  modalImage.classList.remove("zoomed");

  if (task.image) {
    modalImage.src = task.image;
    modalImage.style.display = "block";
  } else {
    modalImage.removeAttribute("src");
    modalImage.style.display = "none";
  }

  if (task.audio) {
    modalAudio.src = task.audio;
    modalAudio.style.display = "block";
  } else {
    stopAudio();
    modalAudio.style.display = "none";
  }
}

function stopAudio() {
  modalAudio.pause();
  modalAudio.removeAttribute("src");
  modalAudio.load();
}

function openModal(i) {
  const task = category.tasks[i];
  const points = questionPoints(i);
  currentTaskIndex = i;
  document.getElementById("modalPoints").textContent = `Питання ${i + 1} · ${pointsLabel(points)}`;
  document.getElementById("modalQuestion").textContent = task.question;
  document.getElementById("modalAnswerText").textContent = task.answer;
  renderMedia(task);
  document.getElementById("modalAnswerBox").classList.remove("show");
  document.getElementById("modalActionsShow").style.display = "flex";
  document.getElementById("modalActionsJudge").style.display = "none";
  const turn = currentTurn();
  document.getElementById("modalTurn").textContent = `Відповідає: ${teamName(turn)}`;
  document.getElementById("correctBtn").textContent = `✅ Правильно`;
  document.getElementById("wrongBtn").textContent = `❌ Неправильно`;
  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  stopAudio();
  currentTaskIndex = null;
}

/* Правильна відповідь — бал команді, що обирала питання;
   неправильна — бал суперникам. */
function judgeAnswer(isCorrect) {
  if (currentTaskIndex === null) return;
  const turn = currentTurn();
  const who = isCorrect ? turn : otherTeam(turn);
  const points = questionPoints(currentTaskIndex);
  if (who === "A") match.scoreA += points;
  if (who === "B") match.scoreB += points;
  match.answered.push(currentTaskIndex);
  saveTournament(state);
  closeModal();
  refreshScores();
  renderTiles();
  refreshTurn();
}

document.getElementById("showAnswerBtn").addEventListener("click", () => {
  document.getElementById("modalAnswerBox").classList.add("show");
  document.getElementById("modalActionsShow").style.display = "none";
  document.getElementById("modalActionsJudge").style.display = "flex";
});
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("correctBtn").addEventListener("click", () => judgeAnswer(true));
document.getElementById("wrongBtn").addEventListener("click", () => judgeAnswer(false));
document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target.id === "modalOverlay") closeModal();
});

function finishMatch(winner) {
  match.completed = true;
  if (stageKey === "final") {
    match.winner = winner; // 'A' | 'B'
  } else {
    const view = getBracketView(state);
    const viewMatch = view[stageKey][idx];
    match.winnerIndex = winner === "A" ? viewMatch.teamAIndex : viewMatch.teamBIndex;
  }
  saveTournament(state);
}

refreshScores();
renderTiles();
refreshTurn();
