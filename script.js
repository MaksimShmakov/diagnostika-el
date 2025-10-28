// Telegram WebApp init
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

const WEBHOOK_URL = "/.netlify/functions/results";
const params = new URLSearchParams(location.search);
const CLIENT_ID = params.get("client_id") || null;
const GROUP = params.get("group") || "default";
const SUBJECT = (params.get("subject") || "rus").toLowerCase();

// ===== Inline SVG для задачи с клетками (ОГЭ №4) =====
const GRID_SVG = `
<svg width="240" height="200" viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0H0V20" fill="none" stroke="#555" stroke-width="0.5"/>
    </pattern>
  </defs>

  <!-- Сетка -->
  <rect x="0" y="0" width="240" height="200" fill="url(#gridPattern)" />

  <!-- Две белые стороны -->
  <path d="M40 100 L220 55" stroke="#ffffff" stroke-width="2" />
  <path d="M40 100 L220 165" stroke="#ffffff" stroke-width="2" />

  <!-- Отрезок AB (сдвинут на 20px вправо) -->
  <line x1="60" y1="90" x2="60" y2="100" stroke="#ff6b73" stroke-width="4" stroke-linecap="round"/>

  <!-- Подписи (тоже чуть сдвигаем вправо, чтобы совпали) -->
  <text x="50" y="88" fill="#ffffff" font-size="12" font-family="Inter, Arial">A</text>
  <text x="50" y="103" fill="#ffffff" font-size="12" font-family="Inter, Arial">B</text>
</svg>`;

// ==================== БАНК ВОПРОСОВ ====================
const BANKS = {
  // === РУССКИЙ ОГЭ ===
  rus_oge: [
    {
      id: "rq1",
      topic: "Сжатие текста",
      text: "Сколько приёмов сжатия текста существует? В ответ запишите цифру.",
      options: ["1) 2", "2) 3", "3) 5"],
      correct: [2]
    },
    {
      id: "rq2",
      topic: "Грамматическая основа",
      text: `(1)Одним из признаков лженаучных обобщений является отрицание опыта и теории всей предыдущей науки. (2)На самом деле с этим нельзя согласиться: новое в науке никогда не бывает просто отрицанием старого. (3)Новое – это лишь существенное изменение, углубление и обобщение старого в связи с новыми сферами исследования. (4)Если бы новая теория начисто отрицала сложившиеся знания, наука вообще не смогла бы развиваться. (5)Без опоры на достижения предшественников любая фантастическая концепция стала бы претендовать на истину, и стал бы возможен полный разгул воображения и чувств учёного.<br><br>Выберите варианты, где верно определена грамматическая основа.`,
      options: [
        "1) «одним из признаков является отрицание» (1)",
        "2) «нельзя согласиться» (2)",
        "3) «обобщение» (3)",
        "4) «теория отрицала» (4)",
        "5) «стал бы возможен разгул» (5)"
      ],
      correct: [1, 2, 5]
    },
    {
      id: "rq3",
      topic: "Сложные предложения",
      text: `(1)Одним из признаков лженаучных обобщений является отрицание опыта и теории всей предыдущей науки. (2)На самом деле с этим нельзя согласиться: новое в науке никогда не бывает просто отрицанием старого. (3)Новое – это лишь существенное изменение, углубление и обобщение старого в связи с новыми сферами исследования. (4)Если бы новая теория начисто отрицала сложившиеся знания, наука вообще не смогла бы развиваться. (5)Без опоры на достижения предшественников любая фантастическая концепция стала бы претендовать на истину, и стал бы возможен полный разгул воображения и чувств учёного.<br><br>Выберите верные утверждения о типах и составе предложений.`,
      options: [
        "1) (1) — простое, осложнённое однородными членами.",
        "2) (2) — сложное бессоюзное.",
        "3) В (3) — две грамматические основы.",
        "4) (4) — СПП с придаточным причины.",
        "5) В (5) первая часть — составное глагольное сказуемое."
      ],
      correct: [1, 2, 5]
    },
    {
      id: "rq4",
      topic: "Орфография (суффиксы, приставки, окончания)",
      text: `Укажите варианты ответов, в которых дано верное объяснение написания выделенного слова. Запишите номера этих ответов.<br><br>
1) ДОВЕРЧИВЫЙ – правописание гласной И в суффиксе причастия настоящего времени определяется принадлежностью ко II спряжению глагола.<br>
2) РАСТУЩИЙ – в корне слова с чередующейся гласной перед -СТ- пишется буква А.<br>
3) ВЫТРИТЕ (стол) – в форме будущего времени 2-го лица множественного числа глагола II спряжения пишется окончание -ИТЕ.<br>
4) БЕЗЫНИЦИАТИВНЫЙ – после русскоязычной приставки, оканчивающейся на согласную, пишется буква Ы.<br>
5) (на) БОЧОК – в окончании имён существительных после шипящих под ударением пишется буква О.`,
      options: ["1) 1,2", "2) 2,4", "3) 2,3,4", "4) 2,5"],
      correct: [2]
    },
    {
      id: "rq5",
      topic: "Средства выразительности",
      text: `Укажите варианты ответов, в которых средством выразительности речи является метафора.<br><br>
1) Пустыня была её родиной, а география – поэзией.<br>
2) Песок подходил к подоконникам домов, лежал буграми на дворах и точил дыхание людей.<br>
3) Мария Никифоровна увидела тяжкий и почти ненужный труд, потому что расчищенные места снова заваливались песком, увидела молчаливую бедность и смиренное отчаяние.<br>
4) Школа Марии Никифоровны всегда была полна не только детьми, но и взрослыми, которые слушали чтение учительницы про мудрость жить в песчаной степи.<br>
5) Мария Никифоровна задумалась: «Неужели молодость придётся похоронить в песчаной пустыне и умереть в кустарнике?..»`,
      options: ["1) 1,2,5", "2) 1,3", "3) 1,4,5"],
      correct: [1]
    }
  ],

  // === МАТЕМАТИКА ОГЭ ===
  math_oge: [
    {
      id: "mo1",
      topic: "Вычисления (корни и степени)",
      text: `Найдите значение выражения: $\\displaystyle \\frac{\\sqrt{99b^{7}}\\cdot\\sqrt{11a^{8}}}{\\sqrt{a^{2}b^{3}}}$, при $a=2$, $b=3$.`,
      options: ["1) 2736", "2) 2376", "3) 3760"],
      correct: [2]
    },
    {
      id: "mo2",
      topic: "Бета-распад",
      text: "В ходе бета-распада радиоактивного изотопа А каждые 8 минут половина его атомов без потери массы преобразуются в атомы стабильного изотопа Б. В начальный момент масса изотопа А составляла 160 мг. Найдите массу образовавшегося изотопа Б через 40 минут. Ответ дайте в миллиграммах.",
      options: ["1) 155", "2) 160", "3) 150"],
      correct: [1]
    },
    {
      id: "mo3",
      topic: "Углы трапеции",
      text: "Меньший угол равнобедренной трапеции, если два угла относятся как 1:2.",
      options: ["1) 60°", "2) 120°", "3) 30°"],
      correct: [1]
    },
    {
      id: "mo4",
      topic: "Клетчатая бумага",
      text: `На клетчатой бумаге с размером клетки 1×1 изображена фигура. Найдите длину отрезка AB.<br><br>${GRID_SVG}`,
      options: ["1) 1,1", "2) 1,2", "3) 1"],
      correct: [3]
    },
    {
      id: "mo5",
      topic: "Окружности",
      text: `Какие из следующих утверждений верны?<br><br>
1) Вписанные углы, опирающиеся на одну и ту же хорду окружности, равны.<br>
2) Если радиусы двух окружностей равны 5 и 7, а расстояние между их центрами равно 3, то эти окружности не имеют общих точек.<br>
3) Если радиус окружности равен 3, а расстояние от центра окружности до прямой равно 2, то эта прямая и окружность пересекаются.<br>
4) Если вписанный угол равен 30°, то дуга окружности, на которую опирается этот угол, равна 60°.<br><br>
Если утверждений несколько, запишите их номера в порядке возрастания.`,
      options: ["1) 1,3", "2) 3,4", "3) 1,4"],
      correct: [2]
    }
  ]
};

// === Остальная логика (рендер, проверка, MathJax) ===
const QUESTIONS = BANKS[SUBJECT] || BANKS.rus_oge;
const quizRoot = document.getElementById("quiz");

function renderQuiz() {
  quizRoot.innerHTML = "";
  QUESTIONS.forEach((q, idx) => {
    const isMultiple = q.correct.length > 1;
    const card = document.createElement("section");
    card.className = "card";

    const title = document.createElement("div");
    title.className = "card-title";
    title.innerHTML = `<span class="q-index">Вопрос ${idx + 1}</span><span class="topic">${q.topic}</span>`;

    const qtext = document.createElement("div");
    qtext.className = "q-text";
    qtext.innerHTML = q.text;

    const opts = document.createElement("div");
    opts.className = "options";
    q.options.forEach((optText, i) => {
      const id = `${q.id}_${i + 1}`;
      const wrap = document.createElement("label");
      wrap.className = "option";

      const input = document.createElement("input");
      input.type = isMultiple ? "checkbox" : "radio";
      input.name = q.id;
      input.value = (i + 1).toString();
      input.id = id;

      const span = document.createElement("span");
      span.className = "option-label";
      span.textContent = optText;

      wrap.appendChild(input);
      wrap.appendChild(span);
      opts.appendChild(wrap);
    });

    card.appendChild(title);
    card.appendChild(qtext);
    card.appendChild(opts);
    quizRoot.appendChild(card);
  });

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

function getUserSelections() {
  const selections = {};
  QUESTIONS.forEach(q => {
    const inputs = Array.from(document.querySelectorAll(`input[name="${q.id}"]`));
    const picked = inputs.filter(i => i.checked).map(i => parseInt(i.value, 10));
    selections[q.id] = picked;
  });
  return selections;
}

function arraysEqualAsSets(a, b) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

function computeTopics() {
  const selections = getUserSelections();
  const good = new Set();
  const bad = new Set();

  QUESTIONS.forEach(q => {
    const picked = selections[q.id] || [];
    if (picked.length === 0) bad.add(q.topic);
    else if (arraysEqualAsSets(picked, q.correct)) good.add(q.topic);
    else bad.add(q.topic);
  });

  const goodText = good.size ? [...good].join(", ") : "нет 😱";
  const badText = bad.size ? [...bad].join(", ") : "нет 😱";
  return { good: goodText, bad: badText };
}

document.getElementById("submitBtn").addEventListener("click", async () => {
  const result = computeTopics();
  if (!CLIENT_ID) {
    alert("Не передан client_id. Откройте мини-апп через кнопку бота.");
    return;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        group: GROUP,
        subject: SUBJECT,
        good: result.good,
        bad: result.bad
      })
    });
    const payload = await res.json();

    if (!res.ok && payload?.code === "already_submitted") {
      quizRoot.innerHTML = `<div class="done-message">
        Вы уже проходили тест по предмету: <b>${payload.subject}</b>.<br/>
        В рамках акции доступен только один тест.
      </div>`;
      return;
    }

    quizRoot.innerHTML = `<div class="done-message">
      Спасибо за ответы, можете возвращаться в бота!
    </div>`;
  } catch (err) {
    console.error(err);
    alert("Ошибка при сохранении результата.");
  }
});

renderQuiz();
