/* =========================================================
   LIVE QUIZ BACKEND — Google Apps Script, бекенд на базі Google Sheets.

   ЯК ПІДКЛЮЧИТИ:
   1. Створіть нову Google Таблицю (Google Sheets).
   2. У ній: Розширення → Apps Script.
   3. Видаліть вміст файлу Code.gs, який там за замовчуванням, і вставте
      весь вміст цього файлу.
   4. Запустіть функцію `setupSheets` один раз (меню "Виконати" / Run),
      підтвердіть дозволи. Вона створить усі потрібні аркуші з прикладом.
   5. Розгорніть: Deploy → New deployment → Web app.
      - Execute as: Me
      - Who has access: Anyone
      Скопіюйте URL веб-застосунку (закінчується на /exec).
   6. Вставте цей URL у файл live-config.js цього репозиторію
      (константа LIVE_API_URL).
   7. Відредагуйте аркуші "Teams" (команди/паролі), "Questions"
      (питання раунду) і "Config" (hostPassword і таймінги)
      прямо в таблиці — без повторного деплою.
   ========================================================= */

function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const config = ss.getSheetByName("Config") || ss.insertSheet("Config");
  config.clear();
  config.appendRow(["key", "value"]);
  config.appendRow(["hostPassword", "змінити-цей-пароль"]);
  config.appendRow(["questionSeconds", 15]);
  config.appendRow(["revealDelaySeconds", 15]);
  config.appendRow(["roundSeconds", 300]);

  const teams = ss.getSheetByName("Teams") || ss.insertSheet("Teams");
  teams.clear();
  teams.appendRow(["name", "password"]);
  teams.appendRow(["Команда 1", "1111"]);
  teams.appendRow(["Команда 2", "2222"]);

  const questions = ss.getSheetByName("Questions") || ss.insertSheet("Questions");
  questions.clear();
  questions.appendRow(["id", "order", "category", "type", "text", "mediaUrl", "points"]);
  questions.appendRow(["q1", 1, "🎬 Кіно та музика", "text", "Хто виконує головну роль у серії фільмів про Джеймса Бонда наразі?", "", 100]);
  questions.appendRow(["q2", 2, "🎬 Кіно та музика", "song", "Яка це пісня і виконавець?", "https://example.com/song.mp3", 200]);

  const roundState = ss.getSheetByName("RoundState") || ss.insertSheet("RoundState");
  roundState.clear();
  roundState.appendRow(["key", "value"]);
  roundState.appendRow(["status", "idle"]);
  roundState.appendRow(["currentIndex", -1]);
  roundState.appendRow(["roundStartedAt", ""]);
  roundState.appendRow(["questionStartedAt", ""]);

  const answers = ss.getSheetByName("Answers") || ss.insertSheet("Answers");
  answers.clear();
  answers.appendRow(["id", "questionId", "team", "answerText", "submittedAt", "verdict", "pointsAwarded"]);

  SpreadsheetApp.flush();
}

/* ---------- Config / RoundState helpers ---------- */

function readKeyValueSheet_(name) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < values.length; i++) {
    map[values[i][0]] = values[i][1];
  }
  return map;
}

function writeKeyValue_(name, key, value) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getConfig_() {
  const cfg = readKeyValueSheet_("Config");
  return {
    hostPassword: String(cfg.hostPassword || ""),
    questionSeconds: Number(cfg.questionSeconds || 15),
    revealDelaySeconds: Number(cfg.revealDelaySeconds || 15),
    roundSeconds: Number(cfg.roundSeconds || 300)
  };
}

function getRoundState_() {
  const rs = readKeyValueSheet_("RoundState");
  return {
    status: String(rs.status || "idle"),
    currentIndex: Number(rs.currentIndex != null && rs.currentIndex !== "" ? rs.currentIndex : -1),
    roundStartedAt: rs.roundStartedAt ? Number(rs.roundStartedAt) : null,
    questionStartedAt: rs.questionStartedAt ? Number(rs.questionStartedAt) : null
  };
}

function getQuestions_() {
  const sheet = getSheet_("Questions");
  const values = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    list.push({
      id: String(row[0]),
      order: Number(row[1]),
      category: String(row[2] || ""),
      type: String(row[3] || "text"),
      text: String(row[4] || ""),
      mediaUrl: String(row[5] || ""),
      points: Number(row[6] || 0)
    });
  }
  list.sort((a, b) => a.order - b.order);
  return list;
}

function findTeam_(name, password) {
  const sheet = getSheet_("Teams");
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === name && String(values[i][1]) === String(password)) {
      return { name: String(values[i][0]) };
    }
  }
  return null;
}

/* ---------- Public read: state ---------- */

function actionState_() {
  const config = getConfig_();
  const round = getRoundState_();
  const questions = getQuestions_();
  const currentQuestion = round.currentIndex >= 0 && round.currentIndex < questions.length
    ? questions[round.currentIndex]
    : null;

  return {
    ok: true,
    serverTime: Date.now(),
    status: round.status,
    roundStartedAt: round.roundStartedAt,
    questionStartedAt: round.questionStartedAt,
    currentIndex: round.currentIndex,
    totalQuestions: questions.length,
    questionSeconds: config.questionSeconds,
    revealDelaySeconds: config.revealDelaySeconds,
    roundSeconds: config.roundSeconds,
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          category: currentQuestion.category,
          type: currentQuestion.type,
          text: currentQuestion.text,
          mediaUrl: currentQuestion.mediaUrl,
          points: currentQuestion.points
        }
      : null
  };
}

/* ---------- Public write: login ---------- */

function actionLogin_(params) {
  const team = findTeam_(params.team, params.password);
  if (!team) return { ok: false, error: "Невірна назва команди або пароль" };
  return { ok: true, team: team.name };
}

/* ---------- Public write: submit answer ---------- */

function actionSubmitAnswer_(params) {
  const team = findTeam_(params.team, params.password);
  if (!team) return { ok: false, error: "Невірна назва команди або пароль" };

  const round = getRoundState_();
  const config = getConfig_();
  const questions = getQuestions_();
  const currentQuestion = round.currentIndex >= 0 ? questions[round.currentIndex] : null;

  if (round.status !== "running" || !currentQuestion || currentQuestion.id !== params.questionId) {
    return { ok: false, error: "Це питання зараз не активне" };
  }

  const elapsedMs = Date.now() - round.questionStartedAt;
  if (elapsedMs > config.questionSeconds * 1000 + 2000) {
    return { ok: false, error: "Час на відповідь вийшов" };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_("Answers");
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === params.questionId && values[i][2] === params.team) {
        sheet.getRange(i + 1, 4).setValue(params.answer);
        sheet.getRange(i + 1, 5).setValue(Date.now());
        return { ok: true, updated: true };
      }
    }
    const id = Utilities.getUuid();
    sheet.appendRow([id, params.questionId, params.team, params.answer, Date.now(), "", 0]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Public read: answers for a question (для екрана ведучого) ---------- */

function actionAnswersFor_(params) {
  const sheet = getSheet_("Answers");
  const values = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === params.questionId) {
      list.push({
        team: values[i][2],
        answerText: values[i][3],
        submittedAt: values[i][4],
        verdict: values[i][5] || null
      });
    }
  }
  return { ok: true, answers: list };
}

/* ---------- Public read: aggregated scores ---------- */

function actionScores_() {
  const sheet = getSheet_("Answers");
  const values = sheet.getDataRange().getValues();
  const scores = {};
  for (let i = 1; i < values.length; i++) {
    const team = values[i][2];
    const points = Number(values[i][6] || 0);
    scores[team] = (scores[team] || 0) + points;
  }
  return { ok: true, scores: scores };
}

/* ---------- Host-only actions (потребують hostPassword) ---------- */

function requireHost_(params) {
  const config = getConfig_();
  if (!params.hostPassword || params.hostPassword !== config.hostPassword) {
    throw new Error("Невірний пароль ведучого");
  }
}

function actionHostAuth_(params) {
  requireHost_(params);
  return { ok: true };
}

function actionHostStart_(params) {
  requireHost_(params);
  const now = Date.now();
  writeKeyValue_("RoundState", "status", "running");
  writeKeyValue_("RoundState", "currentIndex", 0);
  writeKeyValue_("RoundState", "roundStartedAt", now);
  writeKeyValue_("RoundState", "questionStartedAt", now);
  return { ok: true };
}

function actionHostNext_(params) {
  requireHost_(params);
  const round = getRoundState_();
  const questions = getQuestions_();
  const nextIndex = round.currentIndex + 1;

  if (nextIndex >= questions.length) {
    writeKeyValue_("RoundState", "status", "finished");
    return { ok: true, finished: true };
  }

  writeKeyValue_("RoundState", "currentIndex", nextIndex);
  writeKeyValue_("RoundState", "questionStartedAt", Date.now());
  return { ok: true };
}

function actionHostReset_(params) {
  requireHost_(params);
  writeKeyValue_("RoundState", "status", "idle");
  writeKeyValue_("RoundState", "currentIndex", -1);
  writeKeyValue_("RoundState", "roundStartedAt", "");
  writeKeyValue_("RoundState", "questionStartedAt", "");

  const sheet = getSheet_("Answers");
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();

  return { ok: true };
}

function actionJudge_(params) {
  requireHost_(params);
  const questions = getQuestions_();
  const question = questions.find((q) => q.id === params.questionId);
  const points = question ? question.points : 0;
  const verdict = params.verdict === "correct" ? "correct" : "wrong";
  const pointsAwarded = verdict === "correct" ? points : 0;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_("Answers");
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === params.questionId && values[i][2] === params.team) {
        sheet.getRange(i + 1, 6).setValue(verdict);
        sheet.getRange(i + 1, 7).setValue(pointsAwarded);
        return { ok: true };
      }
    }
    return { ok: false, error: "Відповідь команди не знайдена" };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Роутер ---------- */

function doGet(e) {
  const params = e.parameter;
  let result;
  try {
    switch (params.action) {
      case "state":
        result = actionState_();
        break;
      case "login":
        result = actionLogin_(params);
        break;
      case "submitAnswer":
        result = actionSubmitAnswer_(params);
        break;
      case "answersFor":
        result = actionAnswersFor_(params);
        break;
      case "scores":
        result = actionScores_();
        break;
      case "hostAuth":
        result = actionHostAuth_(params);
        break;
      case "hostStart":
        result = actionHostStart_(params);
        break;
      case "hostNext":
        result = actionHostNext_(params);
        break;
      case "hostReset":
        result = actionHostReset_(params);
        break;
      case "judge":
        result = actionJudge_(params);
        break;
      default:
        result = { ok: false, error: "Невідома дія: " + params.action };
    }
  } catch (err) {
    result = { ok: false, error: String(err.message || err) };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
