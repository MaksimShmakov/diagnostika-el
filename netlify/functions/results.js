// netlify/functions/results.js
// Upstash Redis через PATH API (GET /<cmd>/<arg1>/...)
// Ключ: test:<group>:<subject>:<client_id>
// Ограничение: один тест на пользователя (по любому subject)

const URL   = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ВСЕ поддерживаемые предметы
const SUBJECTS = ["rus", "rus_oge", "math", "math_oge"];

// Вызов команды Path API
async function redis(cmd, ...args) {
  const path = [cmd.toLowerCase(), ...args.map(a => encodeURIComponent(String(a)))].join("/");
  const r = await fetch(`${URL}/${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

// Проверка: уже есть попытка по ЛЮБОМУ subject?
async function checkAnyAttempt(group, clientId) {
  for (const subj of SUBJECTS) {
    const key = `test:${group}:${subj}:${clientId}`;
    const exists = await redis("exists", key); // 1 | 0
    if (Number(exists) === 1) return subj;
  }
  return null;
}

exports.handler = async (event) => {
  try {
    const qs   = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const method  = event.httpMethod;

    const clientId = body.client_id || qs.client_id;
    const group    = (body.group || qs.group || "default").trim();
    const subject  = (body.subject || qs.subject || "rus").trim();

    if (!clientId) return json(400, { ok: false, error: "Нет client_id" });
    if (!SUBJECTS.includes(subject)) {
      return json(400, { ok: false, error: `Неизвестный subject: ${subject}` });
    }

    const key = `test:${group}:${subject}:${clientId}`;

    if (method === "POST") {
      // запрет повторов (по любому предмету)
      const already = await checkAnyAttempt(group, clientId);
      if (already) {
        return json(409, { ok: false, code: "already_submitted", subject: already });
      }

      const good = (body.good && String(body.good).trim()) || "нет 😱";
      const bad  = (body.bad  && String(body.bad).trim())  || "нет 😱";
      const value = JSON.stringify({ good, bad, ts: Date.now(), group, subject });

      await redis("set", key, value);
      await redis("expire", key, 60 * 60 * 24 * 7); // 7 дней

      return json(200, { ok: true, good, bad, group, subject });
    }

    if (method === "GET") {
      const raw = await redis("get", key);
      if (!raw) {
        return json(200, { ok: true, good: "нет 😱", bad: "нет 😱", ts: null, group, subject });
      }
      const obj = JSON.parse(raw);
      return json(200, {
        ok: true,
        good: obj.good || "нет 😱",
        bad:  obj.bad  || "нет 😱",
        ts: obj.ts || null,
        group,
        subject,
      });
    }

    return json(405, { ok: false, error: "Method Not Allowed" });
  } catch (e) {
    return json(500, { ok: false, error: e.message || "Internal error" });
  }
};
