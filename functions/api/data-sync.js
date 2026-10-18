import { corsHeaders, json, optionsResponse } from "../_shared/wevo.js";

async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin) + "|eden-ev-charge-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- ב5: אחסון מפוצל (שלב 1 — כתיבה כפולה + קריאה מפוצלת עם נפילה לבלוב הישן) ---
// מפתחות: data:clients / data:payments / data:openSess / data:config / data:sessions:YYYY-MM
const SESSIONS_PREFIX = "data:sessions:";

function sessionMonth(session) {
  const d = session && typeof session.date === "string" ? session.date : "";
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : "undated";
}

async function listAllKeys(kv, prefix) {
  const names = [];
  let cursor = undefined;
  for (let page = 0; page < 20; page++) {
    const res = await kv.list({ prefix, cursor });
    for (const k of res.keys || []) names.push(k.name);
    if (res.list_complete || !res.cursor) break;
    cursor = res.cursor;
  }
  return names;
}

async function writeSplit(kv, payload) {
  const groups = new Map();
  for (const s of payload.sessions || []) {
    const m = sessionMonth(s);
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m).push(s);
  }
  const existing = await listAllKeys(kv, SESSIONS_PREFIX);
  const wanted = new Set();
  for (const [month, arr] of groups) {
    const key = SESSIONS_PREFIX + month;
    wanted.add(key);
    await kv.put(key, JSON.stringify(arr));
  }
  for (const name of existing) {
    if (!wanted.has(name)) await kv.delete(name);
  }
  await kv.put("data:clients", JSON.stringify(payload.clients || []));
  await kv.put("data:payments", JSON.stringify(payload.payments || []));
  await kv.put("data:openSess", JSON.stringify(payload.openSess || []));
  await kv.put("data:config", JSON.stringify(payload.config != null ? payload.config : null));
}

async function readSplit(kv, meta) {
  const names = (await listAllKeys(kv, SESSIONS_PREFIX)).sort();
  const sessions = [];
  for (const name of names) {
    const arr = await kv.get(name, { type: "json" });
    if (!Array.isArray(arr)) throw new Error("אחסון מפוצל פגום: " + name);
    sessions.push(...arr);
  }
  const clients = await kv.get("data:clients", { type: "json" });
  const payments = await kv.get("data:payments", { type: "json" });
  const openSess = await kv.get("data:openSess", { type: "json" });
  const config = await kv.get("data:config", { type: "json" });
  if (!Array.isArray(clients) || !Array.isArray(payments) || !Array.isArray(openSess)) {
    throw new Error("אחסון מפוצל פגום: אוספים חסרים");
  }
  return {
    clients,
    sessions,
    payments,
    openSess,
    config: config != null ? config : null,
    updatedAt: (meta && meta.updatedAt) || null
  };
}

async function handleDataSync(env, body) {
  const kv = env.EV_BACKUP;
  if (!kv) {
    const err = new Error("גיבוי ענן לא מוגדר (KV חסר)");
    err.status = 503;
    throw err;
  }

  const action = String(body.action || "status");
  const pin = String(body.pin || "").trim();

  let meta = null;
  try {
    meta = await kv.get("meta", { type: "json" });
  } catch {
    meta = null;
  }

  if (action === "status") {
    return {
      ok: true,
      configured: !!(meta && meta.pinHash),
      updatedAt: (meta && meta.updatedAt) || null,
      provider: "cloudflare"
    };
  }

  if (action === "setup") {
    if (meta && meta.pinHash) {
      const err = new Error("כבר הוגדר PIN לגיבוי. התחבר עם אותו PIN.");
      err.status = 400;
      throw err;
    }
    if (pin.length < 4) {
      const err = new Error("בחר PIN באורך 4 ספרות לפחות");
      err.status = 400;
      throw err;
    }
    const now = Date.now();
    const payload =
      body.data && typeof body.data === "object"
        ? { ...body.data, updatedAt: now }
        : { clients: [], sessions: [], payments: [], openSess: [], config: null, updatedAt: now };
    await kv.put("data", JSON.stringify(payload));
    let splitVersion = null;
    let splitError = null;
    try {
      await writeSplit(kv, payload);
      splitVersion = 2;
    } catch (e) {
      splitError = String((e && e.message) || e);
    }
    await kv.put("meta", JSON.stringify({
      pinHash: await hashPin(pin), updatedAt: now,
      ...(splitVersion ? { splitVersion } : {}),
      ...(splitError ? { splitError } : {})
    }));
    return { ok: true, setup: true, updatedAt: now };
  }

  if (!meta || !meta.pinHash) {
    const err = new Error("עדיין לא הוגדר גיבוי ענן — הגדר PIN ראשוני");
    err.status = 400;
    throw err;
  }
  if (pin.length < 4 || (await hashPin(pin)) !== meta.pinHash) {
    const err = new Error("PIN שגוי");
    err.status = 401;
    throw err;
  }

  if (action === "load") {
    if (meta.splitVersion >= 2) {
      try {
        const data = await readSplit(kv, meta);
        return { ok: true, data, updatedAt: data.updatedAt || meta.updatedAt || null };
      } catch {
        // אחסון מפוצל פגום — נופלים לבלוב הישן, לא מפילים את הטעינה
      }
    }
    let data = null;
    try {
      data = await kv.get("data", { type: "json" });
    } catch {
      data = null;
    }
    return {
      ok: true,
      data,
      updatedAt: (data && data.updatedAt) || meta.updatedAt || null
    };
  }

  if (action === "save") {
    if (!body.data || typeof body.data !== "object") {
      const err = new Error("חסרים נתונים לשמירה");
      err.status = 400;
      throw err;
    }
    const now = Date.now();
    const payload = {
      clients: body.data.clients || [],
      sessions: body.data.sessions || [],
      payments: body.data.payments || [],
      openSess: body.data.openSess || [],
      config: body.data.config != null ? body.data.config : null,
      updatedAt: now
    };
    await kv.put("data", JSON.stringify(payload));
    // כתיבת הפיצול היא הכל־או־לא־כלום מבחינת הקריאה: כשל חלקי מכבה את
    // splitVersion כדי שהטעינה תיפול לבלוב הישן עד כתיבה מפוצלת תקינה מלאה.
    let splitFields = { splitVersion: 2 };
    try {
      await writeSplit(kv, payload);
    } catch (e) {
      splitFields = { splitVersion: 0, splitError: String((e && e.message) || e) };
    }
    await kv.put("meta", JSON.stringify({ ...meta, updatedAt: now, ...splitFields }));
    return { ok: true, saved: true, updatedAt: now };
  }

  const err = new Error("action לא מוכר (status|setup|load|save)");
  err.status = 400;
  throw err;
}

export async function onRequestOptions() {
  return optionsResponse();
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const result = await handleDataSync(context.env, body);
    return json(200, result);
  } catch (e) {
    return json(e.status || 500, { error: e.message || "שגיאה לא צפויה", ok: false });
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return optionsResponse();
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed", ok: false });
}
