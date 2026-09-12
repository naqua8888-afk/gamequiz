/* =========================================================
   ЛОГІКА СТОРІНКИ tournament.html
   ========================================================= */

function categoryOptionsHtml(state, currentCategoryId) {
  const usedExcludingSelf = state.usedCategoryIds.filter((id) => id !== currentCategoryId);
  let html = `<option value="">— Оберіть категорію —</option>`;
  CATEGORIES.forEach((cat) => {
    const isUsedElsewhere = usedExcludingSelf.includes(cat.id);
    const selected = cat.id === currentCategoryId ? "selected" : "";
    const disabled = isUsedElsewhere ? "disabled" : "";
    const label = cat.title + (isUsedElsewhere ? " (вже зіграно)" : "");
    html += `<option value="${cat.id}" ${selected} ${disabled}>${label}</option>`;
  });
  return html;
}

function buildMatchCard(state, stageKey, idx, m) {
  const card = document.createElement("div");
  const teamsKnown = m.teamAIndex != null && m.teamBIndex != null;
  const teamAName = m.teamAIndex != null ? state.teams[m.teamAIndex] : "Очікується";
  const teamBName = m.teamBIndex != null ? state.teams[m.teamBIndex] : "Очікується";

  card.className = "match-card" + (m.completed ? " done" : teamsKnown ? "" : " pending");

  if (m.completed) {
    const cat = findCategory(m.categoryId);
    card.innerHTML = `
      <div class="match-team-row ${m.winnerIndex === m.teamAIndex ? "winner" : ""}">
        <span>${teamAName}</span><span class="match-score">${m.scoreA}</span>
      </div>
      <div class="match-vs">VS</div>
      <div class="match-team-row ${m.winnerIndex === m.teamBIndex ? "winner" : ""}">
        <span>${teamBName}</span><span class="match-score">${m.scoreB}</span>
      </div>
      <div class="match-category-label">✅ Категорія: ${cat ? cat.title : "—"}</div>
    `;
    return card;
  }

  if (!teamsKnown) {
    card.innerHTML = `
      <div class="match-team-row"><span>${teamAName}</span></div>
      <div class="match-vs">VS</div>
      <div class="match-team-row"><span>${teamBName}</span></div>
      <div class="pending-note">Очікування переможців попереднього раунду</div>
    `;
    return card;
  }

  card.innerHTML = `
    <div class="match-team-row"><span>${teamAName}</span></div>
    <div class="match-vs">VS</div>
    <div class="match-team-row"><span>${teamBName}</span></div>
    <select class="match-category-select">${categoryOptionsHtml(state, m.categoryId)}</select>
    <button class="match-play-btn" ${m.categoryId ? "" : "disabled"}>▶ Грати цей раунд</button>
  `;

  const select = card.querySelector(".match-category-select");
  const playBtn = card.querySelector(".match-play-btn");

  select.addEventListener("change", () => {
    setMatchCategory(stageKey, idx, select.value || null);
    renderBracket();
  });

  playBtn.addEventListener("click", () => {
    if (!m.categoryId) return;
    window.location.href = `match.html?stage=${stageKey}&idx=${idx}`;
  });

  return card;
}

function renderRoundColumn(containerId, stageKey, matches) {
  const state = loadTournament();
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  matches.forEach((m, idx) => {
    container.appendChild(buildMatchCard(state, stageKey, idx, m));
  });
}

function renderFinalSection(view, state) {
  const el = document.getElementById("finalSection");

  if (view.final.championIndex == null) {
    el.innerHTML = `
      <h2>🏁 Фінальний поділ команди</h2>
      <p class="locked-note">Стане доступним, коли визначиться команда-переможець фіналу.</p>
    `;
    return;
  }

  const championName = state.teams[view.final.championIndex];

  if (view.final.completed) {
    const cat = findCategory(view.final.categoryId);
    const winnerName = view.final.winner === "A" ? view.final.subA : view.final.subB;
    el.innerHTML = `
      <h2>🏁 Фінальний поділ команди «${championName}»</h2>
      <div class="match-team-row ${view.final.winner === "A" ? "winner" : ""}" style="max-width:320px;margin:0 auto;">
        <span>${view.final.subA}</span><span class="match-score">${view.final.scoreA}</span>
      </div>
      <div class="match-vs">VS</div>
      <div class="match-team-row ${view.final.winner === "B" ? "winner" : ""}" style="max-width:320px;margin:0 auto;">
        <span>${view.final.subB}</span><span class="match-score">${view.final.scoreB}</span>
      </div>
      <div class="match-category-label">✅ Категорія: ${cat ? cat.title : "—"}</div>
      <p style="color:#4ade80; font-weight:700; margin-top:10px;">Переможець цього раунду: ${winnerName}</p>
    `;
    return;
  }

  el.innerHTML = `
    <h2>🏁 Фінальний поділ команди «${championName}»</h2>
    <p style="color:var(--text-muted);">Команда «${championName}» ділиться на 2 підгрупи по 2 людини, які грають одна проти одної.</p>
    <div class="subteam-inputs">
      <div>
        <label style="font-size:0.78rem;color:var(--text-muted);">Назва підгрупи 1</label>
        <input type="text" id="subAInput" value="${state.final.subA}" />
      </div>
      <div>
        <label style="font-size:0.78rem;color:var(--text-muted);">Назва підгрупи 2</label>
        <input type="text" id="subBInput" value="${state.final.subB}" />
      </div>
    </div>
    <select class="match-category-select" id="finalCategorySelect" style="max-width:340px;margin:0 auto;">
      ${categoryOptionsHtml(state, state.final.categoryId)}
    </select>
    <div>
      <button class="match-play-btn" id="finalPlayBtn" style="max-width:260px;margin:16px auto 0;" ${state.final.categoryId ? "" : "disabled"}>▶ Грати фінальний раунд</button>
    </div>
  `;

  document.getElementById("subAInput").addEventListener("change", (e) => {
    const s = loadTournament();
    s.final.subA = e.target.value.trim() || "Підгрупа 1";
    saveTournament(s);
  });
  document.getElementById("subBInput").addEventListener("change", (e) => {
    const s = loadTournament();
    s.final.subB = e.target.value.trim() || "Підгрупа 2";
    saveTournament(s);
  });
  document.getElementById("finalCategorySelect").addEventListener("change", (e) => {
    setMatchCategory("final", 0, e.target.value || null);
    renderBracket();
  });
  document.getElementById("finalPlayBtn").addEventListener("click", () => {
    if (!loadTournament().final.categoryId) return;
    window.location.href = "match.html?stage=final&idx=0";
  });
}

function renderTiebreakSection(view, state) {
  const el = document.getElementById("tiebreakSection");

  if (!view.final.completed) {
    el.innerHTML = `
      <h2>⚡ Вирішальний раунд</h2>
      <p class="locked-note">Цей додатковий раунд (поза 8 категоріями) стане доступним одразу після фінального поділу.</p>
    `;
    return;
  }

  if (view.tiebreak.completed) {
    const winnerLabel = view.tiebreak.winner === "A" ? state.final.subA : state.final.subB;
    el.innerHTML = `
      <h2>🎉 Турнір завершено!</h2>
      <div class="champion-banner">🏆 ${winnerLabel}</div>
      <p style="color:var(--text-muted);">Абсолютний переможець корпоративного квіз-турніру!</p>
    `;
    return;
  }

  el.innerHTML = `
    <h2>⚡ Вирішальний раунд</h2>
    <p style="color:var(--text-muted);">
      Додатковий раунд поза списком категорій — визначає фінального переможця
      між «${state.final.subA}» та «${state.final.subB}».
    </p>
    <button class="match-play-btn" style="max-width:280px;margin:14px auto 0;" id="startTiebreakBtn">
      🔥 Розпочати вирішальний раунд
    </button>
  `;

  document.getElementById("startTiebreakBtn").addEventListener("click", () => {
    window.location.href = "tiebreak.html";
  });
}

function renderCategoriesOverview(state) {
  const board = document.getElementById("catBoard");
  board.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    const isUsed = state.usedCategoryIds.includes(cat.id);
    const usage = isUsed ? getCategoryUsageInfo(state, cat.id) : null;

    const card = document.createElement("div");
    card.className = "cat-board-card " + (isUsed ? "used" : "available");
    card.style.setProperty("--clr", cat.color || "#3b82f6");

    let badgeHtml;
    if (!isUsed) {
      badgeHtml = `<span class="cat-board-badge free">🟢 Вільна</span>`;
    } else if (usage && usage.completed) {
      badgeHtml = `<span class="cat-board-badge done">✅ Зіграно</span>`;
    } else {
      badgeHtml = `<span class="cat-board-badge reserved">🟡 Обрано для матчу</span>`;
    }

    const usageHtml =
      isUsed && usage
        ? `<div class="cat-board-usage">${usage.stageLabel}<br />${usage.matchLabel}</div>`
        : "";

    card.innerHTML = `
      <div class="cat-title">${cat.title}</div>
      ${badgeHtml}
      ${usageHtml}
    `;

    board.appendChild(card);
  });
}

function renderBracket() {
  const state = loadTournament();
  const view = getBracketView(state);

  renderCategoriesOverview(state);
  renderRoundColumn("r1Col", "r1", view.r1);
  renderRoundColumn("r2Col", "r2", view.r2);
  renderRoundColumn("r3Col", "r3", view.r3);
  renderFinalSection(view, state);
  renderTiebreakSection(view, state);
}

document.getElementById("resetTournamentBtn").addEventListener("click", () => {
  if (confirm("Скинути весь турнір і почати заново?")) {
    resetTournament();
    window.location.href = "index.html";
  }
});

renderBracket();
