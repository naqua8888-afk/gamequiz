/* =========================================================
   ЛОГІКА СТОРІНКИ tournament.html
   ========================================================= */

function categoryOptionsHtml(state, currentCategoryId) {
  const usedExcludingSelf = state.usedCategoryIds.filter((id) => id !== currentCategoryId);
  let html = `<option value="">— Категорія —</option>`;
  CATEGORIES.forEach((cat) => {
    const isUsedElsewhere = usedExcludingSelf.includes(cat.id);
    const selected = cat.id === currentCategoryId ? "selected" : "";
    const disabled = isUsedElsewhere ? "disabled" : "";
    const label = cat.title + (isUsedElsewhere ? " (зайнята)" : "");
    html += `<option value="${cat.id}" ${selected} ${disabled}>${label}</option>`;
  });
  return html;
}

function buildMatchCard(state, stageKey, idx, m) {
  const card = document.createElement("div");
  const teamsKnown = m.teamAIndex != null && m.teamBIndex != null;
  const teamAName = m.teamAIndex != null ? state.teams[m.teamAIndex] : "?";
  const teamBName = m.teamBIndex != null ? state.teams[m.teamBIndex] : "?";

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
      <div class="match-category-label">${cat ? cat.title : ""}</div>
    `;
    return card;
  }

  if (!teamsKnown) {
    card.innerHTML = `
      <div class="match-team-row"><span>${teamAName}</span></div>
      <div class="match-vs">VS</div>
      <div class="match-team-row"><span>${teamBName}</span></div>
    `;
    return card;
  }

  card.innerHTML = `
    <div class="match-team-row"><span>${teamAName}</span></div>
    <div class="match-vs">VS</div>
    <div class="match-team-row"><span>${teamBName}</span></div>
    <div class="match-controls">
      <select class="match-category-select">${categoryOptionsHtml(state, m.categoryId)}</select>
      <button class="match-play-btn" ${m.categoryId ? "" : "disabled"}>▶ Грати</button>
    </div>
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
      <h2>🏁 Фінальний поділ</h2>
      <p class="locked-note">🔒 Після фіналу команд</p>
    `;
    return;
  }

  const championName = state.teams[view.final.championIndex];

  if (view.final.completed) {
    const cat = findCategory(view.final.categoryId);
    el.innerHTML = `
      <h2>🏁 Фінальний поділ · ${championName}</h2>
      <div class="final-result">
        <div class="match-team-row ${view.final.winner === "A" ? "winner" : ""}">
          <span>${view.final.subA}</span><span class="match-score">${view.final.scoreA}</span>
        </div>
        <div class="match-vs">VS</div>
        <div class="match-team-row ${view.final.winner === "B" ? "winner" : ""}">
          <span>${view.final.subB}</span><span class="match-score">${view.final.scoreB}</span>
        </div>
        <div class="match-category-label">${cat ? cat.title : ""}</div>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <h2>🏁 Фінальний поділ · ${championName}</h2>
    <div class="final-row">
      <input type="text" id="subAInput" value="${state.final.subA}" />
      <span class="match-vs">VS</span>
      <input type="text" id="subBInput" value="${state.final.subB}" />
    </div>
    <div class="final-row">
      <select class="match-category-select" id="finalCategorySelect">
        ${categoryOptionsHtml(state, state.final.categoryId)}
      </select>
      <button class="match-play-btn" id="finalPlayBtn" ${state.final.categoryId ? "" : "disabled"}>▶ Грати</button>
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
      <p class="locked-note">🔒 Після фінального поділу</p>
    `;
    return;
  }

  if (view.tiebreak.completed) {
    const winnerLabel = view.tiebreak.winner === "A" ? state.final.subA : state.final.subB;
    el.innerHTML = `
      <h2>🎉 Турнір завершено!</h2>
      <div class="champion-banner">🏆 ${winnerLabel}</div>
    `;
    return;
  }

  el.innerHTML = `
    <h2>⚡ Вирішальний раунд</h2>
    <div class="final-row">
      <button class="match-play-btn" id="startTiebreakBtn">🔥 Почати</button>
    </div>
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
      badgeHtml = `<span class="cat-board-badge free">Вільна</span>`;
    } else if (usage && usage.completed) {
      badgeHtml = `<span class="cat-board-badge done">Зіграно</span>`;
    } else {
      badgeHtml = `<span class="cat-board-badge reserved">Обрано</span>`;
    }

    const usageHtml =
      isUsed && usage
        ? `<span class="cat-board-usage">${usage.stageLabel}</span>`
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
  if (confirm("Скинути турнір?")) {
    resetTournament();
    window.location.href = "index.html";
  }
});

renderBracket();
