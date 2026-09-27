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

// Категорія «з підказками»: скільки підказок відкрито в кожному завданні
const isClueMode = category.mode === "clues";
if (isClueMode && typeof match.cluesOpened !== "object") match.cluesOpened = {};

// Категорія «змагання»: місця йдуть по черзі, при одночасному
// знаходженні грається запасне (raceReserve — індекс запасного в грі)
const isRaceMode = category.mode === "race";
if (isRaceMode) {
  if (typeof match.reserveUsed !== "number") match.reserveUsed = 0;
  if (match.raceReserve === undefined) match.raceReserve = null;
}

let currentTaskIndex = null;

/* Команди обирають питання по черзі: першою ходить команда, яку
   ведучий обрав на початку раунду (за замовчуванням A).
   Черга визначається кількістю вже зіграних питань. */
if (match.firstTurn !== "B") match.firstTurn = "A";

function currentTurn() {
  return match.answered.length % 2 === 0 ? match.firstTurn : otherTeam(match.firstTurn);
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
  const showTurn = !allDone && !isRaceMode; // у змаганні шукають обидві команди
  document.getElementById("teamABox").classList.toggle("active", showTurn && turn === "A");
  document.getElementById("teamBBox").classList.toggle("active", showTurn && turn === "B");
  document.getElementById("turnIndicator").textContent = showTurn
    ? `Обирає: ${teamName(turn)}`
    : "";

  // Поки не зіграно жодного питання, можна обрати, хто починає
  const canChoose = !isRaceMode && match.answered.length === 0;
  document.getElementById("firstTurnPicker").style.display = canChoose ? "flex" : "none";
  if (canChoose) {
    document.getElementById("firstTurnA").textContent = teamAName;
    document.getElementById("firstTurnB").textContent = teamBName;
    document.getElementById("firstTurnA").classList.toggle("selected", match.firstTurn === "A");
    document.getElementById("firstTurnB").classList.toggle("selected", match.firstTurn === "B");
  }
}

function setFirstTurn(who) {
  if (match.answered.length > 0) return;
  match.firstTurn = who;
  saveTournament(state);
  refreshTurn();
}

document.getElementById("firstTurnA").addEventListener("click", () => setFirstTurn("A"));
document.getElementById("firstTurnB").addEventListener("click", () => setFirstTurn("B"));

function refreshScores() {
  document.getElementById("teamAScore").textContent = match.scoreA;
  document.getElementById("teamBScore").textContent = match.scoreB;
}

function renderTiles() {
  const grid = document.getElementById("tasksGrid");
  grid.innerHTML = "";
  if (isRaceMode) renderRace();

  if (!isRaceMode) category.tasks.forEach((task, i) => {
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

  if (!allDone) return;

  // У звичайних категоріях нічиєї не буває (1+…+6 = 21 — непарна),
  // а в категоріях з підказками чи змаганням — може бути: тоді переможця обирає ведучий.
  const isTie = match.scoreA === match.scoreB && !match.completed;
  document.getElementById("tieButtons").style.display = isTie ? "flex" : "none";
  document.getElementById("continueButtons").style.display = isTie ? "none" : "flex";

  if (isTie) {
    document.getElementById("winnerText").textContent =
      "🤝 Нічия! Ведучий визначає переможця (напр. додатковим питанням):";
    document.getElementById("tieWinABtn").textContent = `🏆 ${teamAName}`;
    document.getElementById("tieWinBBtn").textContent = `🏆 ${teamBName}`;
    return;
  }

  if (!match.completed) finishMatch(match.scoreA > match.scoreB ? "A" : "B");
  document.getElementById("winnerText").textContent = `🏆 Перемогла ${teamName(winnerOf())}!`;
}

/* ---------- Змагання «А де таке написано?» ---------- */

function reserveList() {
  return category.reserve || [];
}

function renderRace() {
  const total = category.tasks.length;
  const allDone = match.answered.length === total;
  document.getElementById("racePanel").style.display = allDone ? "none" : "block";
  if (allDone) return;

  const mainIndex = match.answered.length; // місця йдуть по порядку
  const onReserve = match.raceReserve !== null;
  const item = onReserve ? reserveList()[match.raceReserve] : category.tasks[mainIndex];
  const reservesLeft = reserveList().length - match.reserveUsed;

  document.getElementById("raceCounter").textContent = onReserve
    ? `⚡ Запасне місце ${match.raceReserve + 1} (замість №${mainIndex + 1}) · запасних лишилось: ${reservesLeft}`
    : `Місце ${mainIndex + 1} з ${total} · запасних лишилось: ${reservesLeft}`;
  document.getElementById("raceRef").textContent = item.question;
  document.getElementById("raceAnswerText").textContent = item.answer;
  document.getElementById("raceAnswerBox").classList.remove("show");
  document.getElementById("raceShowBtn").style.display = item.answer ? "" : "none";

  document.getElementById("raceWinA").textContent = `🏆 Першою: ${teamAName}`;
  document.getElementById("raceWinB").textContent = `🏆 Першою: ${teamBName}`;
  document.getElementById("raceTie").textContent = reservesLeft > 0
    ? "🤝 Одночасно → запасне"
    : "🤝 Одночасно (+1 обом)";
}

/* who: "A" | "B" | "tie". Перша команда отримує 1 бал.
   Одночасно — грається наступне запасне місце; коли запасних
   не лишилось — по балу обом. */
function judgeRace(who) {
  if (match.answered.length === category.tasks.length) return;
  if (who === "tie" && match.reserveUsed < reserveList().length) {
    match.raceReserve = match.reserveUsed;
    match.reserveUsed += 1;
  } else {
    if (who === "A" || who === "tie") match.scoreA += 1;
    if (who === "B" || who === "tie") match.scoreB += 1;
    match.answered.push(match.answered.length);
    match.raceReserve = null;
  }
  saveTournament(state);
  refreshScores();
  renderTiles();
  refreshTurn();
}

document.getElementById("raceWinA").addEventListener("click", () => judgeRace("A"));
document.getElementById("raceWinB").addEventListener("click", () => judgeRace("B"));
document.getElementById("raceTie").addEventListener("click", () => judgeRace("tie"));
document.getElementById("raceShowBtn").addEventListener("click", () => {
  document.getElementById("raceAnswerBox").classList.add("show");
});

function winnerOf() {
  if (stageKey === "final") return match.winner;
  const viewMatch = getBracketView(state)[stageKey][idx];
  return match.winnerIndex === viewMatch.teamAIndex ? "A" : "B";
}

function resolveTie(winner) {
  finishMatch(winner);
  renderTiles();
}
document.getElementById("tieWinABtn").addEventListener("click", () => resolveTie("A"));
document.getElementById("tieWinBBtn").addEventListener("click", () => resolveTie("B"));

function pointsLabel(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} бал`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} бали`;
  return `${n} балів`;
}

/* Питання №N коштує N балів.
   У категорії з підказками — стільки балів, скільки підказок ще закрито. */
function questionPoints(i) {
  if (isClueMode) return category.tasks[i].clues.length - openedClues(i);
  return i + 1;
}

function openedClues(i) {
  return match.cluesOpened[i] || 0;
}

function renderClues() {
  const task = category.tasks[currentTaskIndex];
  const opened = openedClues(currentTaskIndex);
  const list = document.getElementById("cluesList");
  list.innerHTML = "";
  task.clues.forEach((clue, n) => {
    const li = document.createElement("li");
    li.className = n < opened ? "open" : "closed";
    li.textContent = n < opened ? clue : "🔒 Підказка закрита";
    list.appendChild(li);
  });
  const points = questionPoints(currentTaskIndex);
  document.getElementById("cluesWorth").textContent =
    `Можна заробити: ${pointsLabel(points)} · відкрито ${opened} з ${task.clues.length}`;
  document.getElementById("modalPoints").textContent =
    `Питання ${currentTaskIndex + 1} · ${pointsLabel(points)}`;
  document.getElementById("nextClueBtn").disabled = opened >= task.clues.length;
}

document.getElementById("nextClueBtn").addEventListener("click", () => {
  if (currentTaskIndex === null) return;
  const task = category.tasks[currentTaskIndex];
  if (openedClues(currentTaskIndex) >= task.clues.length) return;
  match.cluesOpened[currentTaskIndex] = openedClues(currentTaskIndex) + 1;
  saveTournament(state);
  renderClues();
});

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

/* Фото до відповіді (поле answerImage) — показується разом із відповіддю */
const modalAnswerImage = document.getElementById("modalAnswerImage");
const modalAnswerMissing = document.getElementById("modalAnswerMissing");

modalAnswerImage.addEventListener("error", () => {
  modalAnswerImage.style.display = "none";
  modalAnswerMissing.textContent = `⚠️ Файл не знайдено: ${modalAnswerImage.getAttribute("src")}`;
  modalAnswerMissing.style.display = "block";
});
modalAnswerImage.addEventListener("click", () => modalAnswerImage.classList.toggle("zoomed"));

function renderAnswerImage(task) {
  modalAnswerMissing.style.display = "none";
  modalAnswerImage.classList.remove("zoomed");
  if (task.answerImage) {
    modalAnswerImage.src = task.answerImage;
    modalAnswerImage.style.display = "block";
  } else {
    modalAnswerImage.removeAttribute("src");
    modalAnswerImage.style.display = "none";
  }
}

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
  renderAnswerImage(task);
  document.getElementById("modalAnswerBox").classList.remove("show");
  document.getElementById("modalActionsShow").style.display = "flex";
  document.getElementById("modalActionsJudge").style.display = "none";
  document.getElementById("cluesBox").style.display = isClueMode ? "block" : "none";
  document.getElementById("nextClueBtn").style.display = isClueMode ? "" : "none";
  if (isClueMode) renderClues();
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
   неправильна — бал суперникам.
   У категорії з підказками суперники при помилці отримують
   стільки балів, скільки підказок лишилося закритими. */
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
  // Фото-відповідь замінює фото-питання, щоб усе влізло на екран
  if (category.tasks[currentTaskIndex].answerImage) {
    modalImage.classList.remove("zoomed");
    modalImage.style.display = "none";
  }
  if (isClueMode) {
    const points = pointsLabel(questionPoints(currentTaskIndex));
    const turn = currentTurn();
    document.getElementById("correctBtn").textContent =
      `✅ Правильно (+${points} → ${teamName(turn)})`;
    document.getElementById("wrongBtn").textContent =
      `❌ Неправильно (+${points} → ${teamName(otherTeam(turn))})`;
  }
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
