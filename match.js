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

document.getElementById("matchTitle").textContent = `${teamAName} проти ${teamBName}`;
document.getElementById("catName").textContent = category ? category.title : "";
document.getElementById("teamAName").textContent = teamAName;
document.getElementById("teamBName").textContent = teamBName;

let currentTask = null;

function refreshScores() {
  document.getElementById("teamAScore").textContent = match.scoreA;
  document.getElementById("teamBScore").textContent = match.scoreB;
}

function renderTiles() {
  const grid = document.getElementById("tasksGrid");
  grid.innerHTML = "";

  category.tasks
    .slice()
    .sort((a, b) => a.points - b.points)
    .forEach((task) => {
      const isDone = match.answeredPoints.includes(task.points);
      const tile = document.createElement("div");
      tile.className = "task-tile" + (isDone ? " done" : "");
      tile.style.setProperty("--accent-color", "#3b82f6");
      tile.textContent = task.points;
      if (!isDone) {
        tile.addEventListener("click", () => openModal(task));
      }
      grid.appendChild(tile);
    });

  const allDone = match.answeredPoints.length === category.tasks.length;
  document.getElementById("finishPanel").style.display = allDone ? "block" : "none";

  if (allDone) {
    const winABtn = document.getElementById("winABtn");
    const winBBtn = document.getElementById("winBBtn");
    winABtn.textContent = `🏆 Перемогла: ${teamAName} (${match.scoreA})`;
    winBBtn.textContent = `🏆 Перемогла: ${teamBName} (${match.scoreB})`;
    winABtn.classList.toggle("suggested", match.scoreA >= match.scoreB);
    winBBtn.classList.toggle("suggested", match.scoreB > match.scoreA);
  }
}

function openModal(task) {
  currentTask = task;
  document.getElementById("modalPoints").textContent = task.points + " балів";
  document.getElementById("modalQuestion").textContent = task.question;
  document.getElementById("modalAnswerText").textContent = task.answer;
  document.getElementById("modalAnswerBox").classList.remove("show");
  document.getElementById("modalActionsShow").style.display = "flex";
  document.getElementById("modalActionsJudge").style.display = "none";
  document.getElementById("pointsABtn").textContent = `${teamAName} +${task.points}`;
  document.getElementById("pointsBBtn").textContent = `${teamBName} +${task.points}`;
  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  currentTask = null;
}

function awardPoints(who) {
  if (!currentTask) return;
  if (who === "A") match.scoreA += currentTask.points;
  if (who === "B") match.scoreB += currentTask.points;
  match.answeredPoints.push(currentTask.points);
  saveTournament(state);
  closeModal();
  refreshScores();
  renderTiles();
}

document.getElementById("showAnswerBtn").addEventListener("click", () => {
  document.getElementById("modalAnswerBox").classList.add("show");
  document.getElementById("modalActionsShow").style.display = "none";
  document.getElementById("modalActionsJudge").style.display = "flex";
});
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("noOneBtn").addEventListener("click", () => awardPoints(null));
document.getElementById("pointsABtn").addEventListener("click", () => awardPoints("A"));
document.getElementById("pointsBBtn").addEventListener("click", () => awardPoints("B"));
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
  window.location.href = "tournament.html";
}

document.getElementById("winABtn").addEventListener("click", () => finishMatch("A"));
document.getElementById("winBBtn").addEventListener("click", () => finishMatch("B"));

refreshScores();
renderTiles();
