import { corsHeaders, json, optionsResponse } from "../_shared/wevo.js";

async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin) + "|eden-ev-charge-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
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
    await kv.put("meta", JSON.stringify({ pinHash: await hashPin(pin), updatedAt: now }));
    const payload =
      body.data && typeof body.data === "object"
        ? { ...body.data, updatedAt: now }
        : { clients: [], sessions: [], payments: [], openSess: [], config: null, updatedAt: now };
    await kv.put("data", JSON.stringify(payload));
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
    await kv.put("meta", JSON.stringify({ ...meta, updatedAt: now }));
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
