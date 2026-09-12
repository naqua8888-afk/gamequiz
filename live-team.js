/* =========================================================
   ЛОГІКА ЕКРАНА КОМАНДИ (live-team.html)
   ========================================================= */

const TEAM_SESSION_KEY = "live_team_session";
let session = JSON.parse(sessionStorage.getItem(TEAM_SESSION_KEY) || "null");
let serverOffsetMs = 0;
let lastSubmittedQuestionId = null;

function serverNow() {
  return Date.now() + serverOffsetMs;
}

async function login() {
  const name = document.getElementById("teamNameInput").value.trim();
  const password = document.getElementById("teamPasswordInput").value.trim();
  if (!name || !password) return;

  const res = await liveApi("login", { team: name, password });
  const errorEl = document.getElementById("loginError");
  if (!res.ok) {
    errorEl.textContent = res.error || "Помилка входу";
    errorEl.style.display = "block";
    return;
  }

  session = { team: name, password };
  sessionStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(session));
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("gameCard").style.display = "block";
  startPolling();
}

document.getElementById("loginBtn").addEventListener("click", login);

function startPolling() {
  pollOnce();
  setInterval(pollOnce, 1500);
}

async function pollOnce() {
  let state;
  try {
    state = await liveApi("state", {});
  } catch (e) {
    return;
  }
  if (!state.ok) return;
  serverOffsetMs = computeServerOffset(state.serverTime);
  render(state);
}

function render(state) {
  const labels = { idle: "Очікування", running: "Йде раунд", finished: "Раунд завершено" };
  const statusPill = document.getElementById("teamStatusPill");
  statusPill.textContent = labels[state.status] || state.status;
  statusPill.className = "live-status-pill " + state.status;

  const waitingNote = document.getElementById("teamWaitingNote");
  const questionBox = document.getElementById("teamQuestionBox");

  if (!state.currentQuestion || state.status !== "running") {
    waitingNote.style.display = "block";
    questionBox.style.display = "none";
    document.getElementById("teamQTimer").textContent = "—";
    return;
  }

  waitingNote.style.display = "none";
  questionBox.style.display = "block";

  document.getElementById("teamQCategory").textContent = state.currentQuestion.category;
  document.getElementById("teamQText").textContent = state.currentQuestion.text;
  document.getElementById("teamSongHint").style.display =
    state.currentQuestion.type === "song" ? "block" : "none";

  const elapsedQ = (serverNow() - state.questionStartedAt) / 1000;
  const remainingQ = Math.max(0, Math.ceil(state.questionSeconds - elapsedQ));
  document.getElementById("teamQTimer").textContent = remainingQ;

  const answerInput = document.getElementById("teamAnswerInput");
  const submitBtn = document.getElementById("submitAnswerBtn");
  const isNewQuestion = lastSubmittedQuestionId !== state.currentQuestion.id;

  if (isNewQuestion) {
    answerInput.value = "";
    document.getElementById("submitStatus").textContent = "";
  }

  const timeUp = remainingQ <= 0;
  answerInput.disabled = timeUp;
  submitBtn.disabled = timeUp;
}

document.getElementById("submitAnswerBtn").addEventListener("click", async () => {
  const state = await liveApi("state", {});
  if (!state.ok || !state.currentQuestion) return;

  const answer = document.getElementById("teamAnswerInput").value.trim();
  const res = await liveApi("submitAnswer", {
    team: session.team,
    password: session.password,
    questionId: state.currentQuestion.id,
    answer
  });

  const statusEl = document.getElementById("submitStatus");
  if (res.ok) {
    lastSubmittedQuestionId = state.currentQuestion.id;
    statusEl.style.color = "#4ade80";
    statusEl.textContent = "Відповідь надіслано ✓";
  } else {
    statusEl.style.color = "#ef4444";
    statusEl.textContent = res.error || "Помилка надсилання";
  }
});

if (session) {
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("gameCard").style.display = "block";
  startPolling();
}
