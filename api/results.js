// api/results.js
// Vercel API version of Netlify function
// Saves test results to Upstash Redis (via REST API)

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SUBJECTS = ["rus", "rus_oge", "math", "math_oge"];

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

function json(res, status, obj) {
  res.status(status).json(obj);
}

async function checkAnyAttempt(group, clientId) {
  for (const subj of SUBJECTS) {
    const key = `test:${group}:${subj}:${clientId}`;
    const exists = await redis("exists", key);
    if (Number(exists) === 1) return subj;
  }
  return null;
}

export default async function handler(req, res) {
  try {
    const { method, query } = req;
    const body = req.body || {};

    const clientId = body.client_id || query.client_id;
    const group = (body.group || query.group || "default").trim();
    const subject = (body.subject || query.subject || "rus").trim();

    if (!clientId)
      return json(res, 400, { ok: false, error: "Нет client_id" });
    if (!SUBJECTS.includes(subject))
      return json(res, 400, { ok: false, error: `Неизвестный subject: ${subject}` });

    const key = `test:${group}:${subject}:${clientId}`;

    if (method === "POST") {
      const already = await checkAnyAttempt(group, clientId);
      if (already)
        return json(res, 409, { ok: false, code: "already_submitted", subject: already });

      const good = (body.good && String(body.good).trim()) || "нет 😱";
      const bad = (body.bad && String(body.bad).trim()) || "нет 😱";
      const value = JSON.stringify({ good, bad, ts: Date.now(), group, subject });

      await redis("set", key, value);
      await redis("expire", key, 60 * 60 * 24 * 7);

      return json(res, 200, { ok: true, good, bad, group, subject });
    }

    if (method === "GET") {
      const raw = await redis("get", key);
      if (!raw)
        return json(res, 200, { ok: true, good: "нет 😱", bad: "нет 😱", ts: null, group, subject });
      const obj = JSON.parse(raw);
      return json(res, 200, { ok: true, ...obj, group, subject });
    }

    json(res, 405, { ok: false, error: "Method Not Allowed" });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message || "Internal error" });
  }
}
