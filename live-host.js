/* =========================================================
   ЛОГІКА ЕКРАНА ВЕДУЧОГО (live-host.html)
   ========================================================= */

const HOST_PW_KEY = "live_host_password";
let hostPassword = sessionStorage.getItem(HOST_PW_KEY) || "";
let serverOffsetMs = 0;
let lastKnownIndex = null;
let revealTimer = null;
let pollTimer = null;
const questionIdByIndex = {};

function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

async function tryAuth(password) {
  const res = await liveApi("hostAuth", { hostPassword: password });
  return res.ok;
}

document.getElementById("authBtn").addEventListener("click", async () => {
  const pw = document.getElementById("hostPasswordInput").value.trim();
  const ok = await tryAuth(pw);
  if (!ok) {
    document.getElementById("authError").style.display = "block";
    return;
  }
  hostPassword = pw;
  sessionStorage.setItem(HOST_PW_KEY, pw);
  document.getElementById("authGate").style.display = "none";
  document.getElementById("hostApp").style.display = "block";
  initJoinPanel();
  startPolling();
});

async function initApp() {
  if (!hostPassword) return;
  const ok = await tryAuth(hostPassword);
  if (!ok) {
    hostPassword = "";
    sessionStorage.removeItem(HOST_PW_KEY);
    return;
  }
  document.getElementById("authGate").style.display = "none";
  document.getElementById("hostApp").style.display = "block";
  initJoinPanel();
  startPolling();
}

function initJoinPanel() {
  const joinUrl = new URL("live-team.html", window.location.href).toString();
  document.getElementById("joinLink").textContent = joinUrl;
  const qrImg = document.createElement("img");
  qrImg.alt = "QR-код для входу";
  qrImg.width = 220;
  qrImg.height = 220;
  qrImg.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
    encodeURIComponent(joinUrl);
  document.getElementById("qrBox").innerHTML = "";
  document.getElementById("qrBox").appendChild(qrImg);
}

function startPolling() {
  pollOnce();
  pollTimer = setInterval(pollOnce, 1500);
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
  renderState(state);
  renderScores();
}

function serverNow() {
  return Date.now() + serverOffsetMs;
}

function renderState(state) {
  const statusPill = document.getElementById("statusPill");
  const roundTimer = document.getElementById("roundTimer");
  const startBtn = document.getElementById("startRoundBtn");
  const nextBtn = document.getElementById("nextQuestionBtn");
  const noQuestionNote = document.getElementById("noQuestionNote");
  const questionBox = document.getElementById("questionBox");

  const labels = { idle: "Очікування", running: "Йде раунд", finished: "Раунд завершено" };
  statusPill.textContent = labels[state.status] || state.status;
  statusPill.className = "live-status-pill " + state.status;

  if (state.status === "idle") {
    roundTimer.textContent = fmtClock(state.roundSeconds);
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
  } else if (state.status === "running") {
    const elapsed = (serverNow() - state.roundStartedAt) / 1000;
    roundTimer.textContent = fmtClock(state.roundSeconds - elapsed);
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  } else {
    roundTimer.textContent = "00:00";
    startBtn.style.display = "none";
    nextBtn.style.display = "none";
  }

  if (!state.currentQuestion) {
    noQuestionNote.style.display = "block";
    questionBox.style.display = "none";
  } else {
    noQuestionNote.style.display = "none";
    questionBox.style.display = "block";

    document.getElementById("qCategory").textContent = state.currentQuestion.category;
    document.getElementById("qText").textContent = state.currentQuestion.text;
    document.getElementById("qPoints").textContent = state.currentQuestion.points + " балів";

    const audio = document.getElementById("qAudio");
    if (state.currentQuestion.type === "song" && state.currentQuestion.mediaUrl) {
      audio.style.display = "block";
      if (audio.dataset.currentId !== state.currentQuestion.id) {
        audio.src = state.currentQuestion.mediaUrl;
        audio.dataset.currentId = state.currentQuestion.id;
        audio.play().catch(() => {});
      }
    } else {
      audio.style.display = "none";
      audio.pause();
    }

    questionIdByIndex[state.currentIndex] = state.currentQuestion.id;

    const elapsedQ = (serverNow() - state.questionStartedAt) / 1000;
    const remainingQ = Math.max(0, Math.ceil(state.questionSeconds - elapsedQ));
    document.getElementById("qTimer").textContent = remainingQ;

    if (lastKnownIndex !== state.currentIndex) {
      onQuestionChanged(lastKnownIndex, state);
      lastKnownIndex = state.currentIndex;
    }
  }
}

function onQuestionChanged(previousIndex, state) {
  if (previousIndex == null || previousIndex < 0) return;
  clearTimeout(revealTimer);
  const prevQuestionId = questionIdByIndex[previousIndex];
  revealTimer = setTimeout(() => {
    if (prevQuestionId) renderJudgePanel(prevQuestionId);
  }, state.revealDelaySeconds * 1000);
}

async function renderJudgePanel(questionId) {
  const res = await liveApi("answersFor", { questionId });
  if (!res.ok) return;

  const panel = document.getElementById("judgePanel");
  const list = document.getElementById("judgeList");
  panel.style.display = "block";
  list.innerHTML = "";

  if (res.answers.length === 0) {
    list.innerHTML = '<p class="locked-note">Ще немає відповідей.</p>';
    return;
  }

  res.answers.forEach((a) => {
    const row = document.createElement("div");
    row.className = "live-answer-row";
    row.innerHTML = `
      <span class="live-answer-team">${a.team}</span>
      <span class="live-answer-text">${a.answerText || "—"}</span>
      <span class="live-answer-actions">
        <button class="btn btn-correct live-judge-btn ${a.verdict === "correct" ? "active" : ""}">✓</button>
        <button class="btn btn-wrong live-judge-btn ${a.verdict === "wrong" ? "active" : ""}">✗</button>
      </span>
    `;
    const [correctBtn, wrongBtn] = row.querySelectorAll(".live-judge-btn");
    correctBtn.addEventListener("click", () => judge(questionId, a.team, "correct"));
    wrongBtn.addEventListener("click", () => judge(questionId, a.team, "wrong"));
    list.appendChild(row);
  });
}

async function judge(questionId, team, verdict) {
  await liveApi("judge", { questionId, team, verdict, hostPassword });
  renderJudgePanel(questionId);
  renderScores();
}

async function renderScores() {
  const res = await liveApi("scores", {});
  if (!res.ok) return;
  const list = document.getElementById("scoreList");
  const entries = Object.entries(res.scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    list.innerHTML = '<p class="locked-note">Поки немає зарахованих балів.</p>';
    return;
  }
  list.innerHTML = entries
    .map(([team, points]) => `<div class="live-score-row"><span>${team}</span><span>${points}</span></div>`)
    .join("");
}

document.getElementById("startRoundBtn").addEventListener("click", async () => {
  await liveApi("hostStart", { hostPassword });
  lastKnownIndex = null;
  document.getElementById("judgePanel").style.display = "none";
  pollOnce();
});

document.getElementById("nextQuestionBtn").addEventListener("click", async () => {
  await liveApi("hostNext", { hostPassword });
  pollOnce();
});

document.getElementById("resetRoundBtn").addEventListener("click", async () => {
  if (!confirm("Скинути поточний live-раунд і всі відповіді?")) return;
  await liveApi("hostReset", { hostPassword });
  lastKnownIndex = null;
  document.getElementById("judgePanel").style.display = "none";
  pollOnce();
});

initApp();
