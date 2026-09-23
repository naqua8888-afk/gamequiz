/* =========================================================
   ЛОГІКА СТОРІНКИ tiebreak.html
   ========================================================= */

let state = loadTournament();

if (!state.final.completed) {
  alert("Спершу зіграйте фінальний поділ.");
  window.location.href = "tournament.html";
}

document.getElementById("subHeading").textContent =
  `${state.final.subA} vs ${state.final.subB}`;

document.getElementById("winABtn").textContent = `🏆 ${state.final.subA}`;
document.getElementById("winBBtn").textContent = `🏆 ${state.final.subB}`;

function currentQuestion() {
  const i = state.tiebreak.currentQuestionIndex % TIEBREAK_QUESTIONS.length;
  return TIEBREAK_QUESTIONS[i];
}

function renderQuestion() {
  const q = currentQuestion();
  document.getElementById("qCounter").textContent =
    `Питання ${state.tiebreak.currentQuestionIndex + 1}`;
  document.getElementById("qText").textContent = q.question;
  document.getElementById("aText").textContent = q.answer;
  document.getElementById("aBox").classList.remove("show");
  document.getElementById("showBtnWrap").style.display = "flex";
  document.getElementById("judgePanel").style.display = "none";
}

document.getElementById("showAnswerBtn").addEventListener("click", () => {
  document.getElementById("aBox").classList.add("show");
  document.getElementById("showBtnWrap").style.display = "none";
  document.getElementById("judgePanel").style.display = "block";
});

function finishTiebreak(winner) {
  state.tiebreak.completed = true;
  state.tiebreak.winner = winner;
  saveTournament(state);
  window.location.href = "tournament.html";
}

document.getElementById("winABtn").addEventListener("click", () => finishTiebreak("A"));
document.getElementById("winBBtn").addEventListener("click", () => finishTiebreak("B"));
document.getElementById("nextQBtn").addEventListener("click", () => {
  state.tiebreak.currentQuestionIndex += 1;
  saveTournament(state);
  renderQuestion();
});

renderQuestion();
