// Простий захист паролем: сторінка відкривається лише якщо в localStorage збережено правильний пароль.
(function () {
  const PASSWORD_KEY = 'password';
  const PASSWORD = 'q1234';

  let saved = null;
  try { saved = localStorage.getItem(PASSWORD_KEY); } catch (e) {}
  if (saved === PASSWORD) return;

  // Зупиняємо завантаження решти сторінки (і її скриптів) та показуємо форму входу.
  window.stop();
  document.documentElement.innerHTML =
    '<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    '<title>Вхід</title><link rel="stylesheet" href="style.css" /></head>' +
    '<body><div class="wrap" style="max-width:360px;margin:15vh auto;text-align:center">' +
    '<h1>Вхід</h1>' +
    '<form id="auth-form">' +
    '<input id="auth-password" type="password" placeholder="Пароль" autofocus style="width:100%;padding:10px;font-size:18px;box-sizing:border-box" />' +
    '<button type="submit" style="margin-top:12px;width:100%;padding:10px;font-size:18px">Увійти</button>' +
    '<p id="auth-error" style="color:#c0392b;visibility:hidden">Невірний пароль</p>' +
    '</form></div></body>';

  document.getElementById('auth-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const value = document.getElementById('auth-password').value;
    if (value === PASSWORD) {
      try { localStorage.setItem(PASSWORD_KEY, value); } catch (err) {}
      location.reload();
    } else {
      document.getElementById('auth-error').style.visibility = 'visible';
    }
  });
})();
