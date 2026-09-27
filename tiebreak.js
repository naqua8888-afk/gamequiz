/* =========================================================
   ЛОГІКА СТОРІНКИ tiebreak.html — «Асоціації»
   Етап «show»: слова вмикаються по черзі, на кожне WORD_SECONDS с.
   Етап «check»: ведучий вписує відповіді з листків і перевіряє.
   ========================================================= */

let state = loadTournament();

if (!state.final.completed) {
  alert("Спершу зіграйте фінальний поділ.");
  window.location.href = "tournament.html";
}

const tb = state.tiebreak;
const subA = state.final.subA;
const subB = state.final.subB;

function newRow(w) {
  // aWrong/bWrong і same (відповіді співпадають) ведучий відмічає вручну
  return { word: w.word, a: "", b: "", aWrong: false, bWrong: false, same: false };
}

if (!Array.isArray(tb.rows)) {
  tb.rows = TIEBREAK_WORDS.map(newRow);
  tb.phase = "show";
  tb.round = "main"; // main | reserve
}

document.getElementById("subHeading").textContent = `${subA} vs ${subB}`;
document.getElementById("teamAName").textContent = subA;
document.getElementById("teamBName").textContent = subB;
document.getElementById("thA").textContent = subA;
document.getElementById("thB").textContent = subB;

/* ---------- Підрахунок балів ---------- */

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[’`ʼ]/g, "'")
    .replace(/[^\p{L}\p{N}' ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSame(row) {
  return row.same === true;
}

function isCorrect(row, side) {
  return norm(row[side]) !== "" && !row[side + "Wrong"];
}

/* 2 — правильна; 1 — правильна, але співпадає з суперниками;
   0 — помилкова; −1 — немає відповіді */
function rowPoints(row, side) {
  if (norm(row[side]) === "") return -1;
  if (row[side + "Wrong"]) return 0;
  const other = side === "a" ? "b" : "a";
  if (isCorrect(row, other) && isSame(row)) return 1;
  return 2;
}

function totals() {
  let a = 0, b = 0;
  tb.rows.forEach((row) => {
    a += rowPoints(row, "a");
    b += rowPoints(row, "b");
  });
  return { a, b };
}

function refreshScores() {
  const t = tb.phase === "check" ? totals() : { a: 0, b: 0 };
  document.getElementById("teamAScore").textContent = t.a;
  document.getElementById("teamBScore").textContent = t.b;
}

/* ---------- Етап 1: показ слів ---------- */

let showPos = -1;
let secondsLeft = 0;
let timerId = null;
let paused = false;

function roundRows() {
  const start = tb.round === "reserve" ? TIEBREAK_WORDS.length : 0;
  return tb.rows.slice(start);
}

function renderShowIdle() {
  const words = roundRows();
  document.getElementById("wordCounter").textContent = tb.round === "reserve"
    ? `Нічия! Запасні слова: ${words.length}`
    : `Слів: ${words.length} · на кожне ${WORD_SECONDS} с`;
  document.getElementById("wordText").textContent = "Приготуйте листки ✍️";
  document.getElementById("timerText").textContent = "";
  document.getElementById("startBtn").style.display = "";
  document.getElementById("pauseBtn").style.display = "none";
  document.getElementById("toCheckBtn").style.display = "none";
}

function showWord() {
  const words = roundRows();
  document.getElementById("wordCounter").textContent = `Слово ${showPos + 1} з ${words.length}`;
  document.getElementById("wordText").textContent = words[showPos].word;
  secondsLeft = WORD_SECONDS;
  document.getElementById("timerText").textContent = secondsLeft;
}

function tick() {
  if (paused) return;
  secondsLeft -= 1;
  if (secondsLeft > 0) {
    document.getElementById("timerText").textContent = secondsLeft;
    return;
  }
  showPos += 1;
  if (showPos < roundRows().length) {
    showWord();
    return;
  }
  clearInterval(timerId);
  timerId = null;
  document.getElementById("wordCounter").textContent = "";
  document.getElementById("wordText").textContent = "⏰ Час вийшов! Здайте листки";
  document.getElementById("timerText").textContent = "";
  document.getElementById("pauseBtn").style.display = "none";
  document.getElementById("toCheckBtn").style.display = "";
}

document.getElementById("startBtn").addEventListener("click", () => {
  showPos = 0;
  paused = false;
  showWord();
  document.getElementById("startBtn").style.display = "none";
  document.getElementById("pauseBtn").style.display = "";
  document.getElementById("pauseBtn").textContent = "⏸ Пауза";
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "▶ Продовжити" : "⏸ Пауза";
});

document.getElementById("toCheckBtn").addEventListener("click", () => {
  tb.phase = "check";
  saveTournament(state);
  render();
});

document.getElementById("backToShowBtn").addEventListener("click", () => {
  tb.phase = "show";
  saveTournament(state);
  render();
});

/* ---------- Етап 2: перевірка ---------- */

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function teamCell(i, side) {
  const td = el("td", "assoc-team");
  const input = el("input");
  input.type = "text";
  input.placeholder = "порожньо";
  input.value = tb.rows[i][side];
  input.addEventListener("input", () => {
    tb.rows[i][side] = input.value;
    onRowChanged();
  });
  const mark = el("button", "assoc-mark");
  mark.id = `mark-${side}-${i}`;
  mark.title = "Правильна / помилкова";
  mark.addEventListener("click", () => {
    tb.rows[i][side + "Wrong"] = !tb.rows[i][side + "Wrong"];
    onRowChanged();
  });
  const pts = el("span", "assoc-pts");
  pts.id = `pts-${side}-${i}`;
  td.append(input, mark, pts);
  return td;
}

function renderTable() {
  const body = document.getElementById("assocBody");
  body.innerHTML = "";
  tb.rows.forEach((row, i) => {
    const tr = el("tr", i >= TIEBREAK_WORDS.length ? "reserve" : "");
    tr.append(el("td", "assoc-num", i >= TIEBREAK_WORDS.length ? `Зап.${i - TIEBREAK_WORDS.length + 1}` : i + 1));

    tr.append(el("td", "assoc-hero", row.word));

    tr.append(teamCell(i, "a"));

    const sameTd = el("td");
    const sameBtn = el("button", "assoc-same");
    sameBtn.id = `same-${i}`;
    sameBtn.title = "Чи співпадають відповіді";
    sameBtn.addEventListener("click", () => {
      tb.rows[i].same = !isSame(tb.rows[i]);
      onRowChanged();
    });
    sameTd.append(sameBtn);
    tr.append(sameTd);

    tr.append(teamCell(i, "b"));
    body.append(tr);
  });
  refreshMarks();
}

/* Оновлює позначки й бали без перемальовування полів вводу (щоб не губився фокус) */
function refreshMarks() {
  tb.rows.forEach((row, i) => {
    ["a", "b"].forEach((side) => {
      const empty = norm(row[side]) === "";
      const mark = document.getElementById(`mark-${side}-${i}`);
      mark.textContent = row[side + "Wrong"] ? "✗" : "✓";
      mark.classList.toggle("wrong", row[side + "Wrong"]);
      mark.disabled = empty;
      const p = rowPoints(row, side);
      const pts = document.getElementById(`pts-${side}-${i}`);
      pts.textContent = p > 0 ? `+${p}` : p;
      pts.dataset.p = p;
    });
    const same = isSame(row);
    const sameBtn = document.getElementById(`same-${i}`);
    sameBtn.textContent = same ? "=" : "≠";
    sameBtn.classList.toggle("on", same);
  });
}

function onRowChanged() {
  saveTournament(state);
  refreshMarks();
  refreshScores();
  renderResult();
}

function renderResult() {
  const t = totals();
  const text = document.getElementById("resultText");
  const buttons = document.getElementById("resultButtons");
  buttons.innerHTML = "";

  if (t.a !== t.b) {
    const winner = t.a > t.b ? "A" : "B";
    text.textContent = `Рахунок ${t.a} : ${t.b} — веде ${winner === "A" ? subA : subB}`;
    const btn = el("button", "big-win-btn suggested", `🏆 Перемогла ${winner === "A" ? subA : subB} — завершити турнір`);
    btn.addEventListener("click", () => finishTiebreak(winner));
    buttons.append(btn);
    return;
  }

  if (tb.round === "main" && TIEBREAK_RESERVE.length > 0) {
    text.textContent = `Нічия ${t.a} : ${t.b}`;
    const btn = el("button", "big-win-btn suggested", `🔁 Грати ${TIEBREAK_RESERVE.length} запасних слова`);
    btn.addEventListener("click", startReserve);
    buttons.append(btn);
    return;
  }

  text.textContent = `Нічия ${t.a} : ${t.b} — ведучий визначає переможця:`;
  ["A", "B"].forEach((who) => {
    const btn = el("button", "big-win-btn", `🏆 ${who === "A" ? subA : subB}`);
    btn.addEventListener("click", () => finishTiebreak(who));
    buttons.append(btn);
  });
}

function startReserve() {
  tb.rows = tb.rows.concat(TIEBREAK_RESERVE.map(newRow));
  tb.round = "reserve";
  tb.phase = "show";
  saveTournament(state);
  render();
}

function finishTiebreak(winner) {
  tb.completed = true;
  tb.winner = winner;
  saveTournament(state);
  window.location.href = "tournament.html";
}

/* ---------- Загальне ---------- */

function render() {
  const isCheck = tb.phase === "check";
  document.getElementById("showPhase").style.display = isCheck ? "none" : "block";
  document.getElementById("checkPhase").style.display = isCheck ? "block" : "none";
  clearInterval(timerId);
  timerId = null;
  if (isCheck) {
    renderTable();
    renderResult();
  } else {
    renderShowIdle();
  }
  refreshScores();
}

render();
