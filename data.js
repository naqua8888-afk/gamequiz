/* =========================================================
   ДАНІ ГРИ
   Тут можна вільно редагувати категорії та завдання.
   Кожна категорія має: id, title (з емодзі), color, tasks[]
   Кожне завдання: question, answer, і за потреби:
     image — шлях до фото (показується разом із питанням),
     audio — шлях до аудіофайлу (у питанні з'являється плеєр).
   Файли кладіть у теку media/<id категорії>/, напр.
   media/geography/3.jpeg — фото до 3-го питання «Географії».
   Команди обирають номер питання: питання №N коштує N балів.
   Зараз по 6 питань у категорії.
   ========================================================= */

const CATEGORIES = [
  {
    id: "bible-heroes",
    title: "🙋 Хто я? - Біблійні герої",
    color: "#2563eb",
    tasks: [
      { question: "Що не так?", answer: "Давид не мав меча" },
      { question: "Що не так?", answer: "Впишіть тут правильну відповідь." },
      { question: "Що не так?", answer: "Впишіть тут правильну відповідь." },
      { question: "Що не так?", answer: "Впишіть тут правильну відповідь." },
      { question: "Що не так?", answer: "Впишіть тут правильну відповідь." },
      { question: "Що не так?", answer: "Впишіть тут правильну відповідь." }
    ]
  },
  {
    id: "where-written",
    title: "📖 А де таке написано?",
    color: "#16a34a",
    tasks: [
      { question: "Назвіть ім'я колеги праворуч від вас.", answer: "Перевірте разом із командою!" },
      { question: "Яке хобі є у вашого керівника?", answer: "Обговоріть у команді." },
      { question: "Придумайте девіз для вашої команди за 30 секунд.", answer: "Оцінюється креативність команди." },
      { question: "Хто в команді працює в компанії найдовше?", answer: "Перевірте разом." },
      { question: "Зобразіть жестами професію одного з колег — інші вгадують.", answer: "Оцінюється командою." },
      { question: "Назвіть спільне хобі, яке є хоча б у трьох членів команди.", answer: "Обговоріть у команді." }
    ]
  },
  {
    id: "know-your-own",
    title: "🔮 Впізнай своїх",
    color: "#7c3aed",
    tasks: [
      { question: "Що означає абревіатура 'API'?", answer: "Application Programming Interface — інтерфейс програмування застосунків.", image: "media/know-your-own/1.jpeg" },
      { question: "Яка мова програмування названа на честь змії?", answer: "Python.", image: "media/know-your-own/2.jpeg" },
      { question: "Що таке 'хмара' (cloud) у сфері ІТ?", answer: "Віддалені сервери для зберігання даних і обчислень через інтернет.", image: "media/know-your-own/3.jpeg" },
      { question: "Розшифруйте абревіатуру 'HTML'.", answer: "HyperText Markup Language.", image: "media/know-your-own/4.jpeg" },
      { question: "Що таке штучний інтелект (AI)?", answer: "Технологія, що дозволяє машинам виконувати завдання, які потребують людського інтелекту.", image: "media/know-your-own/5.jpeg" },
      { question: "Назвіть три компанії — лідери у розробці AI-моделей.", answer: "Наприклад: OpenAI, Anthropic, Google.", image: "media/know-your-own/6.jpeg" }
    ]
  },
  {
    id: "four-pics",
    title: "🖼️ 4 картинки 1 слово",
    color: "#ea580c",
    tasks: [
      { question: "Біблійний персонаж", answer: "Самсон", image: "media/four-pics/1.jpg" },
      { question: "Біблійний персонаж", answer: "Дружина Лотова", image: "media/four-pics/2.jpg" },
      { question: "Біблійний персонаж", answer: "Ілля", image: "media/four-pics/3.jpg" },
      { question: "Біблійний персонаж", answer: "Закхей", image: "media/four-pics/4.jpg" },
      { question: "Біблійний персонаж", answer: "Іван Хреститель", image: "media/four-pics/5.jpg" },
      { question: "Біблійний персонаж", answer: "Єзекія", image: "media/four-pics/6.jpg" }
    ]
  },
  {
    id: "psalms",
    title: "🎵 Старі добрі псалми",
    color: "#0891b2",
    tasks: [
      { question: "Яка найбільша планета Сонячної системи?", answer: "Юпітер.", audio: "media/psalms/1.mp3" },
      { question: "Столиця Австралії — це Сідней чи інше місто?", answer: "Канберра.", audio: "media/psalms/2.mp3" },
      { question: "Скільки кісток у дорослої людини?", answer: "206.", audio: "media/psalms/3.mp3" },
      { question: "Яка річка є найдовшою у світі?", answer: "Ніл (за однією з версій) або Амазонка — залежно від методу вимірювання.", audio: "media/psalms/4.mp3" },
      { question: "Хто написав 'Кобзар'?", answer: "Тарас Шевченко.", audio: "media/psalms/5.mp3" },
      { question: "У якому році людина вперше висадилась на Місяці?", answer: "1969 рік (місія Аполлон-11).", audio: "media/psalms/6.mp3" }
    ]
  },
  {
    id: "geography",
    title: "🌍 Географія",
    color: "#db2777",
    tasks: [
      { question: "Місцевість", answer: "Єрусалим", image: "media/geography/1.jpg" },
      { question: "Місцевість", answer: "Йордан", image: "media/geography/2.jpg" },
      { question: "Місцевість", answer: "Сінай", image: "media/geography/3.jpg" },
      { question: "Місцевість", answer: "Арарат", image: "media/geography/4.jpg" },
      { question: "Місцевість", answer: "Віфлеєм", image: "media/geography/5.webp" },
      { question: "Місцевість", answer: "Мертве море", image: "media/geography/6.jpg" }
    ]
  },
  {
    id: "price-question",
    title: "💰 Ціна питання",
    color: "#ca8a04",
    tasks: [
      { question: "Яка мінімальна заробітна плата в Україні у вересні 2026 року?", answer: "8 647 грн | (7350-9950)", image: "media/price-question/1.jpg" },
      { question: "Який штраф за користування телефоном за кермом?", answer: "510 грн | (450–590)", image: "media/price-question/2.webp" },
      { question: "Вартість складання практичного іспиту з водіння в сервісному центрі МВС", answer: "420 грн | (350–480)", image: "media/price-question/3.png" },
      { question: "Скільки офіційно вартує iPhone 18 Pro Max 1 TB? (в $)", answer: "від $1899 | (1600–2200)", image: "media/price-question/4.webp" },
      { question: "У 2000 році $100 — це приблизно скільки гривень?", answer: "540 грн | (460–620)", image: "media/price-question/5.jpg" },
      { question: "Скільки коштує піднятися на вершину Ейфелевої вежі дорослому? (в €)", answer: "36,70€ | (30–45)", image: "media/price-question/6.webp" }
    ]
  },
  {
    id: "whats-wrong",
    title: "🔍 Що не так?",
    color: "#059669",
    tasks: [
      { question: "Що не так?", answer: "Голуб приніс вітку до того, як Ной вийшов з ковчегу", image: "media/whats-wrong/1.jpeg" },
      { question: "Що не так?", answer: "У Давида не було меча", image: "media/whats-wrong/2.jpeg" },
      { question: "Що не так?", answer: "На момент виходу з Єгипту ковчега не було", image: "media/whats-wrong/3.jpeg" },
      { question: "Що не так?", answer: "Було 6 кам'яних посудин", image: "media/whats-wrong/4.jpeg" },
      { question: "Що не так?", answer: "Авраам поклав дрова на Ісаака", image: "media/whats-wrong/5.jpeg" },
      { question: "Що не так?", answer: "Ноги Павла та Сили були закуті", image: "media/whats-wrong/6.jpeg" }
    ]
  }
];
