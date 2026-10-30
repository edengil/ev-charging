import { corsHeaders, json, optionsResponse, requestOrigin } from "../_shared/wevo.js";

async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin) + "|eden-ev-charge-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// H5 (ביקורת 30.10): גיבוב PIN חזק — PBKDF2-HMAC-SHA256 (100k סיבובים) עם מלח
// אקראי פר־התקנה. פורמט: pbkdf2$<iterations>$<salt base64>$<hash hex>.
// hashPin הישן (SHA-256 מהיר + מלח קבוע בקוד) נשאר לאימות התקנות מורשת בלבד,
// ומשודרג ל־PBKDF2 בהתחברות מוצלחת ראשונה (ראו verifyPin והשדרוג בזרימה).
const PBKDF2_ITERATIONS = 100000;
function timingSafeEqualStr(a, b) {
  const x = String(a || ""), y = String(b || "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
async function pbkdf2Hex(pin, saltBytes, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pin)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hashPinV2(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Hex(pin, salt, PBKDF2_ITERATIONS);
  const saltB64 = btoa(String.fromCharCode(...salt));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hash}`;
}
async function verifyPin(pin, stored) {
  if (!stored) return false;
  if (String(stored).startsWith("pbkdf2$")) {
    const parts = String(stored).split("$");
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    let salt;
    try {
      salt = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    } catch {
      return false;
    }
    const actual = await pbkdf2Hex(pin, salt, iterations);
    return timingSafeEqualStr(actual, parts[3]);
  }
  return timingSafeEqualStr(await hashPin(pin), stored);
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

// כתיבה רק אם התוכן השתנה: מכסת הכתיבה היומית של KV היא המשאב הנדיר
// (פסק 26.10 — שמירות האפליקציה כותבות ~2,000 פעמים ביום), ורוב החלקים
// (חודשי עבר, לקוחות, תשלומים) זהים בין שמירה לשמירה. קריאות זולות בשפע.
async function putIfChanged(kv, key, value) {
  const cur = await kv.get(key);
  if (cur === value) return false;
  await kv.put(key, value);
  return true;
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
    await putIfChanged(kv, key, JSON.stringify(arr));
  }
  for (const name of existing) {
    if (!wanted.has(name)) await kv.delete(name);
  }
  await putIfChanged(kv, "data:clients", JSON.stringify(payload.clients || []));
  await putIfChanged(kv, "data:payments", JSON.stringify(payload.payments || []));
  await putIfChanged(kv, "data:openSess", JSON.stringify(payload.openSess || []));
  // M14 (ביקורת 30.10): גם פריטי הייבוא הארכיוניים מסונכרנים — בעבר חיו רק על מכשיר אחד.
  await putIfChanged(kv, "data:archivedUncat", JSON.stringify(payload.archivedUncat || []));
  await putIfChanged(kv, "data:config", JSON.stringify(payload.config != null ? payload.config : null));
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
  const archivedUncat = await kv.get("data:archivedUncat", { type: "json" });
  const config = await kv.get("data:config", { type: "json" });
  if (!Array.isArray(clients) || !Array.isArray(payments) || !Array.isArray(openSess)) {
    throw new Error("אחסון מפוצל פגום: אוספים חסרים");
  }
  return {
    clients,
    sessions,
    payments,
    openSess,
    // M14: מפתח חסר (גיבויים מלפני השדה) = רשימה ריקה, לא שגיאה.
    archivedUncat: Array.isArray(archivedUncat) ? archivedUncat : [],
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
    // M22 (ביקורת 30.10): בלי updatedAt — נקודת קצה לא־מאומתת לא חושפת
    // חותמת פעילות של ההתקנה. הלקוח צורך רק את configured.
    return {
      ok: true,
      configured: !!(meta && meta.pinHash),
      provider: "cloudflare"
    };
  }

  if (action === "setup") {
    if (meta && meta.pinHash) {
      const err = new Error("כבר הוגדר PIN לגיבוי. התחבר עם אותו PIN.");
      err.status = 400;
      throw err;
    }
    if (pin.length < 6) {
      // H4: מינימום 6 תווים ל־PIN חדש (PIN קיים קצר יותר ממשיך לעבוד באימות)
      const err = new Error("בחר PIN באורך 6 תווים לפחות");
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
      pinHash: await hashPinV2(pin), updatedAt: now,
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
  // H4 (ביקורת 30.10): הגבלת קצב לניסיונות PIN — אחרי 5 כשלונות רצופים,
  // נעילה ל־15 דקות. בעבר אפשר היה לנחש PIN של 4 ספרות מקוון בלי שום מחסום.
  let pinGuard = null;
  try {
    pinGuard = await kv.get("pin:guard", { type: "json" });
  } catch {
    pinGuard = null;
  }
  if (pinGuard && pinGuard.lockedUntil && Date.now() < pinGuard.lockedUntil) {
    const err = new Error("יותר מדי ניסיונות PIN שגויים — נסו שוב בעוד כמה דקות");
    err.status = 429;
    throw err;
  }
  if (pin.length < 4 || !(await verifyPin(pin, meta.pinHash))) {
    const fails = (pinGuard && pinGuard.fails ? pinGuard.fails : 0) + 1;
    const next = fails >= 5
      ? { fails: 0, lockedUntil: Date.now() + 15 * 60 * 1000 }
      : { fails, lockedUntil: 0 };
    try {
      await kv.put("pin:guard", JSON.stringify(next));
    } catch {}
    const err = new Error("PIN שגוי");
    err.status = 401;
    throw err;
  }
  if (pinGuard && (pinGuard.fails || pinGuard.lockedUntil)) {
    try {
      await kv.delete("pin:guard");
    } catch {}
  }
  // H5: שדרוג גיבוב מורשת ל־PBKDF2 בהתחברות מוצלחת ראשונה. ה־meta המקומי
  // מתעדכן גם הוא, כדי שכתיבת meta מאוחרת באותה בקשה (save) לא תדרוס חזרה.
  if (!String(meta.pinHash).startsWith("pbkdf2$")) {
    meta = { ...meta, pinHash: await hashPinV2(pin) };
    try {
      await kv.put("meta", JSON.stringify(meta));
    } catch {}
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

  const err = new Error("פעולה לא מוכרת (status|setup|load|save)");
  err.status = 400;
  throw err;
}

export async function onRequestOptions(context) {
  return optionsResponse(requestOrigin(context));
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const result = await handleDataSync(context.env, body);
    return json(200, result, requestOrigin(context));
  } catch (e) {
    return json(e.status || 500, { error: e.message || "שגיאה לא צפויה", ok: false }, requestOrigin(context));
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return optionsResponse(requestOrigin(context));
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed", ok: false }, requestOrigin(context));
}
