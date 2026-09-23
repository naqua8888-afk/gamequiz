/* =========================================================
   ЯДРО ТУРНІРУ
   Структура: 8 команд -> Раунд1 (4 матчі) -> Раунд2 (2 матчі)
   -> Раунд3 / Фінал команд (1 матч) -> Фінальний поділ (1 матч,
   команда-переможець ділиться на 2 підгрупи) -> Вирішальний
   раунд (додатковий, не з категорій, визначає абсолютного
   переможця).
   Разом 8 "ігрових" матчів = 8 категорій (по одній на матч).
   ========================================================= */

const TOURNAMENT_KEY = "corp_tournament_state_v2";

function emptyMatch() {
  return {
    categoryId: null,
    scoreA: 0,
    scoreB: 0,
    completed: false,
    winnerIndex: null, // для r1/r2/r3 — індекс команди (0-7)
    answered: [] // індекси зіграних питань
  };
}

function defaultState() {
  return {
    teams: Array.from({ length: 8 }, (_, i) => `Команда ${i + 1}`),
    usedCategoryIds: [],
    r1: [
      { teamA: 0, teamB: 1, ...emptyMatch() },
      { teamA: 2, teamB: 3, ...emptyMatch() },
      { teamA: 4, teamB: 5, ...emptyMatch() },
      { teamA: 6, teamB: 7, ...emptyMatch() }
    ],
    r2: [emptyMatch(), emptyMatch()],
    r3: [emptyMatch()],
    final: {
      subA: "Підгрупа 1",
      subB: "Підгрупа 2",
      categoryId: null,
      scoreA: 0,
      scoreB: 0,
      completed: false,
      winner: null, // 'A' | 'B'
      answered: [] // індекси зіграних питань
    },
    tiebreak: {
      currentQuestionIndex: 0,
      completed: false,
      winner: null // 'A' | 'B'
    }
  };
}

function loadTournament() {
  try {
    const raw = localStorage.getItem(TOURNAMENT_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Легка міграція про всяк випадок, якщо чогось бракує
    const def = defaultState();
    return Object.assign(def, parsed);
  } catch (e) {
    return defaultState();
  }
}

function saveTournament(state) {
  localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(state));
}

function resetTournament() {
  localStorage.removeItem(TOURNAMENT_KEY);
}

function tournamentExists() {
  return !!localStorage.getItem(TOURNAMENT_KEY);
}

/* Повертає "сиру" мутовану ланку матчу для збереження змін */
function getRawMatch(state, stageKey, idx) {
  if (stageKey === "r1") return state.r1[idx];
  if (stageKey === "r2") return state.r2[idx];
  if (stageKey === "r3") return state.r3[0];
  if (stageKey === "final") return state.final;
  return null;
}

/* Обчислює похідні дані сітки (хто з ким грає далі) */
function getBracketView(state) {
  const r1 = state.r1.map((m) => ({ ...m, teamAIndex: m.teamA, teamBIndex: m.teamB }));

  const r2 = state.r2.map((m, i) => ({
    ...m,
    teamAIndex: state.r1[2 * i].completed ? state.r1[2 * i].winnerIndex : null,
    teamBIndex: state.r1[2 * i + 1].completed ? state.r1[2 * i + 1].winnerIndex : null
  }));

  const r3 = [
    {
      ...state.r3[0],
      teamAIndex: state.r2[0].completed ? state.r2[0].winnerIndex : null,
      teamBIndex: state.r2[1].completed ? state.r2[1].winnerIndex : null
    }
  ];

  const final = {
    ...state.final,
    championIndex: state.r3[0].completed ? state.r3[0].winnerIndex : null
  };

  const tiebreak = { ...state.tiebreak, unlocked: final.completed };

  return { r1, r2, r3, final, tiebreak };
}

/* Резервує / звільняє категорію під конкретний матч */
function setMatchCategory(stageKey, idx, newCategoryId) {
  const state = loadTournament();
  const match = getRawMatch(state, stageKey, idx);
  if (!match) return;

  if (match.categoryId && match.categoryId !== newCategoryId && !match.completed) {
    state.usedCategoryIds = state.usedCategoryIds.filter((id) => id !== match.categoryId);
  }

  match.categoryId = newCategoryId || null;

  if (newCategoryId && !state.usedCategoryIds.includes(newCategoryId)) {
    state.usedCategoryIds.push(newCategoryId);
  }

  saveTournament(state);
}

function findCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

/* Стадії з людською назвою — для підпису "де саме зіграно категорію" */
const STAGE_LABELS = {
  r1: "Раунд 1",
  r2: "Раунд 2",
  r3: "Фінал команд",
  final: "Фінальний поділ"
};

/* Знаходить, у якому матчі (якщо є) використана категорія,
   і повертає зручний для відображення опис матчу */
function getCategoryUsageInfo(state, categoryId) {
  const view = getBracketView(state);

  const stages = ["r1", "r2", "r3"];
  for (const stageKey of stages) {
    for (let i = 0; i < view[stageKey].length; i++) {
      const m = view[stageKey][i];
      if (m.categoryId === categoryId) {
        const teamAName = m.teamAIndex != null ? state.teams[m.teamAIndex] : "?";
        const teamBName = m.teamBIndex != null ? state.teams[m.teamBIndex] : "?";
        return {
          stageLabel: STAGE_LABELS[stageKey],
          matchLabel: `${teamAName} vs ${teamBName}`,
          completed: m.completed
        };
      }
    }
  }

  if (view.final.categoryId === categoryId) {
    return {
      stageLabel: STAGE_LABELS.final,
      matchLabel: `${state.final.subA} vs ${state.final.subB}`,
      completed: view.final.completed
    };
  }

  return null;
}
