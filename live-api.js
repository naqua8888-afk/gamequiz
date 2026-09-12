/* =========================================================
   Спільний клієнт для звернень до Google Apps Script бекенду.
   Усі запити — GET (щоб уникнути CORS preflight), з параметрами
   у query string.
   ========================================================= */

async function liveApi(action, params) {
  if (!LIVE_API_URL || LIVE_API_URL.indexOf("PASTE_YOUR") === 0) {
    throw new Error("Спочатку вкажіть LIVE_API_URL у файлі live-config.js");
  }
  const url = new URL(LIVE_API_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("_t", Date.now());
  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString());
  const data = await res.json();
  return data;
}

/* Обчислює зсув годинника клієнта відносно сервера (обидва в мс),
   щоб таймер відлічував секунди синхронно на всіх пристроях. */
function computeServerOffset(serverTimeMs) {
  return serverTimeMs - Date.now();
}
