import { json, optionsResponse, handleWevoRequest, cognitoLogin } from "../_shared/wevo.js";
import { pushToAllSubscribers } from "../_shared/push.js";

// שומר צד־שרת להמשך טעינה במעבר לתעריף פרימיום.
// המשתמש נרשם מהאפליקציה (opt-in) עם אישור מראש פעיל + premiumContinue.
// פרטי ההתחברות נשמרים ב־KV מוצפנים ב־AES-GCM (מפתח ב־env.EV_WATCH_KEY).
// טריגר חיצוני (קרון) קורא action=tick עם env.EV_WATCH_TICK_SECRET כל דקה.

const CFG_KEY = "watch:cfg";
const STATUS_KEY = "watch:status";
const LOG_KEY = "watch:log";
const EVENTS_KEY = "watch:events";

function b64encode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(str) {
  const bin = atob(String(str || ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function aesKey(env) {
  const raw = b64decode(env.EV_WATCH_KEY || "");
  if (raw.length !== 32) {
    const err = new Error("שומר השרת לא מוגדר (חסר EV_WATCH_KEY תקין)");
    err.status = 503;
    throw err;
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptJson(env, obj) {
  const key = await aesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(obj))
  );
  return { iv: b64encode(iv), ct: b64encode(new Uint8Array(ct)) };
}

async function decryptJson(env, blob) {
  const key = await aesKey(env);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(blob.iv) },
    key,
    b64decode(blob.ct)
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

function jerusalemParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = {};
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value;
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: dayMap[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`
  };
}

// זהה ל־isOwnerPeakNow בצד הלקוח: אין פיק בשישי/שבת; חלון יכול לחצות חצות (endMin עד 2880)
function isPeak(cfg, parts) {
  if (parts.day === 5 || parts.day === 6) return false;
  const s = Number(cfg && cfg.peakStartMin);
  const e = Number(cfg && cfg.peakEndMin);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
  const m = parts.minutes;
  if (m >= s && m < Math.min(e, 1440)) return true;
  return e > 1440 && m < e - 1440;
}

function peakKey(cfg, parts, now) {
  const s = Number(cfg && cfg.peakStartMin);
  // בחלק החוצה־חצות של החלון, תחילת החלון הייתה אתמול
  const startedYesterday = parts.minutes < s;
  const d = startedYesterday ? new Date(now.getTime() - 86400000) : now;
  return `${jerusalemParts(d).dateKey}@${s}`;
}

async function loadCfg(env) {
  const kv = env.EV_BACKUP;
  if (!kv) {
    const err = new Error("KV לא מוגדר בשרת");
    err.status = 503;
    throw err;
  }
  const raw = await kv.get(CFG_KEY, { type: "json" });
  return raw || null;
}

async function pushLog(env, entry) {
  try {
    const kv = env.EV_BACKUP;
    const list = (await kv.get(LOG_KEY, { type: "json" })) || [];
    list.unshift({ at: Date.now(), ...entry });
    await kv.put(LOG_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {}
}

// ב3 — גזירת אירועי טעינה מהפרש בין דגימת מצב קודמת לנוכחית (פונקציה טהורה).
// prev: {connected, charging, lastTxnId, lastFullMs} מתוך cfg; st: מצב מנורמל נוכחי.
export function eventsFromStateDiff(prev, st, nowMs) {
  const p = prev || {};
  const out = {};
  const txnId = st && st.transactionId != null && String(st.transactionId) !== "" ? String(st.transactionId) : null;
  const connected = !!(st && st.connected);
  const charging = !!(st && st.charging);
  if (!p.connected && connected && txnId) {
    const at = st.plugInTime != null && Number(st.plugInTime) > 0 ? Number(st.plugInTime) : nowMs;
    out.plugIn = { txnId, atMs: at };
  }
  if (!p.charging && charging && txnId) out.chargeStart = { txnId, atMs: nowMs };
  const fullMs = st && st.chargingFullTime != null && Number(st.chargingFullTime) > 0 ? Number(st.chargingFullTime) : null;
  if (txnId && fullMs && fullMs !== (p.lastFullMs || null)) out.full = { txnId, atMs: fullMs };
  if (p.connected && !connected && p.lastTxnId) out.plugOut = { txnId: String(p.lastTxnId), atMs: nowMs };
  return out;
}

// שמירת האירועים ב־KV תחת watch:events (לפי transactionId), עם גיזום ל־48 שעות / 5 עסקאות.
async function recordWatchEvents(env, cfg, diff, nowMs) {
  try {
    const kv = env.EV_BACKUP;
    const all = (await kv.get(EVENTS_KEY, { type: "json" })) || {};
    const touch = (txnId) => {
      const e = all[txnId] || (all[txnId] = {
        txnId, clientId: cfg.clientId || null,
        plugInAt: null, chargeStartedAt: null, chargingFullTime: null,
        chargeEndedAt: null, plugOutAt: null, updatedAt: 0, source: "watch"
      });
      e.updatedAt = nowMs;
      return e;
    };
    if (diff.plugIn) { const e = touch(diff.plugIn.txnId); if (e.plugInAt == null) e.plugInAt = diff.plugIn.atMs; }
    if (diff.chargeStart) { const e = touch(diff.chargeStart.txnId); if (e.chargeStartedAt == null) e.chargeStartedAt = diff.chargeStart.atMs; }
    if (diff.full) { const e = touch(diff.full.txnId); e.chargingFullTime = diff.full.atMs; e.chargeEndedAt = diff.full.atMs; }
    if (diff.plugOut) { const e = touch(diff.plugOut.txnId); if (e.plugOutAt == null) e.plugOutAt = diff.plugOut.atMs; }
    const kept = Object.entries(all)
      .filter(([, e]) => nowMs - (e.updatedAt || 0) < 48 * 3600 * 1000)
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
      .slice(0, 5);
    await kv.put(EVENTS_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {}
}

async function verifyCreds(email, password) {
  if (!email || !password) {
    const err = new Error("חסרים אימייל או סיסמה");
    err.status = 400;
    throw err;
  }
  await cognitoLogin(email, password);
}

async function handleRegister(env, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  await verifyCreds(email, password);
  const credsBlob = await encryptJson(env, { email, password });
  const cfg = {
    armed: true,
    clientId: body.clientId != null ? String(body.clientId) : null,
    clientName: body.clientName != null ? String(body.clientName) : null,
    peakStartMin: Number(body.peakStartMin),
    peakEndMin: Number(body.peakEndMin),
    armedAt: Date.now(),
    credsBlob,
    wasCharging: null,
    wasPeak: null,
    wasConnected: null,
    lastTxnId: null,
    lastFullMs: null,
    actedKey: null
  };
  if (!Number.isFinite(cfg.peakStartMin) || !Number.isFinite(cfg.peakEndMin)) {
    const err = new Error("חסר חלון תעריף פרימיום");
    err.status = 400;
    throw err;
  }
  await env.EV_BACKUP.put(CFG_KEY, JSON.stringify(cfg));
  await pushLog(env, { kind: "register", detail: `שומר הופעל ללקוח ${cfg.clientName || cfg.clientId || ""}` });
  return { ok: true, action: "register", armed: true };
}

async function handleDeregister(env, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  await verifyCreds(email, password);
  const cfg = await loadCfg(env);
  if (cfg) {
    const creds = await decryptJson(env, cfg.credsBlob);
    if (creds.email !== email) {
      const err = new Error("הפרטים אינם תואמים את הרישום הקיים");
      err.status = 403;
      throw err;
    }
  }
  await env.EV_BACKUP.delete(CFG_KEY);
  await env.EV_BACKUP.delete(STATUS_KEY);
  await env.EV_BACKUP.delete(EVENTS_KEY);
  await pushLog(env, { kind: "deregister", detail: "שומר כובה והפרטים נמחקו מהשרת" });
  return { ok: true, action: "deregister", armed: false };
}

async function handleStatus(env, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  await verifyCreds(email, password);
  const cfg = await loadCfg(env);
  if (!cfg) return { ok: true, action: "status", armed: false };
  const status = (await env.EV_BACKUP.get(STATUS_KEY, { type: "json" })) || null;
  const log = (await env.EV_BACKUP.get(LOG_KEY, { type: "json" })) || [];
  const events = (await env.EV_BACKUP.get(EVENTS_KEY, { type: "json" })) || {};
  return {
    ok: true,
    action: "status",
    armed: !!cfg.armed,
    clientName: cfg.clientName,
    armedAt: cfg.armedAt,
    status,
    events,
    log: log.slice(0, 5)
  };
}

async function handleTick(env, body) {
  const secret = String((body && body.secret) || "");
  if (!env.EV_WATCH_TICK_SECRET || secret !== env.EV_WATCH_TICK_SECRET) {
    const err = new Error("סוד טריגר שגוי");
    err.status = 403;
    throw err;
  }
  const cfg = await loadCfg(env);
  if (!cfg || !cfg.armed) return { ok: true, action: "tick", armed: false };
  // פקיעה אוטומטית אחרי 24 שעות מההפעלה — השומר לא רץ לנצח בלי חידוש מהאפליקציה
  if (Date.now() - Number(cfg.armedAt || 0) > 24 * 3600 * 1000) {
    await env.EV_BACKUP.delete(CFG_KEY);
    await env.EV_BACKUP.delete(STATUS_KEY);
    await env.EV_BACKUP.delete(EVENTS_KEY);
    await pushLog(env, { kind: "expire", detail: "שומר כובה אוטומטית אחרי 24 שעות" });
    try {
      await pushToAllSubscribers(env, {
        title: "🛰️ שומר הפרימיום כובה",
        body: "השומר כובה אוטומטית אחרי 24 שעות. להפעלה מחדש — סמן שוב «המשך אוטומטי בפרימיום» באפליקציה.",
        tag: "ev-watch-expired"
      });
    } catch {}
    return { ok: true, action: "tick", armed: false, expired: true };
  }
  const creds = await decryptJson(env, cfg.credsBlob);

  const stateRes = await handleWevoRequest({ email: creds.email, password: creds.password, action: "state" });
  const st = stateRes.state || {};
  const now = new Date();
  const parts = jerusalemParts(now);
  const peak = isPeak(cfg, parts);
  const charging = !!st.charging;
  const connected = !!st.connected;

  const flip = cfg.wasPeak === false && peak === true;
  const key = peakKey(cfg, parts, now);
  let action = null;
  if (flip && cfg.wasCharging === true && !charging && connected && cfg.actedKey !== key) {
    const res = await handleWevoRequest({
      email: creds.email,
      password: creds.password,
      action: "authorize",
      confirmPremium: true
    });
    cfg.actedKey = key;
    action = {
      kind: "authorize",
      at: Date.now(),
      detail: "זוהה מעבר לפרימיום והטעינה נעצרה — נשלח אישור המשך אוטומטי",
      chargingAfter: !!(res && res.state && res.state.charging)
    };
    await pushLog(env, action);
    try {
      await pushToAllSubscribers(env, {
        title: "⚡ הטעינה ממשיכה בפרימיום",
        body: `השומר זיהה מעבר לתעריף פרימיום וחידש את הטעינה אוטומטית${cfg.clientName ? ` (${cfg.clientName})` : ""}`,
        tag: "ev-watch-premium"
      });
    } catch {}
  }

  // ב3: לכידת אירועי טעינה מהמצב שכבר נשלף בטיק הזה — אפס קריאות Wevo נוספות.
  // האירועים נשמרים ב־watch:events והאפליקציה ממזגת אותם לרשומות הפתוחות.
  const stTxnId = st.transactionId != null && String(st.transactionId) !== "" ? String(st.transactionId) : null;
  const stFullMs = st.chargingFullTime != null && Number(st.chargingFullTime) > 0 ? Number(st.chargingFullTime) : null;
  const diff = eventsFromStateDiff(
    { connected: cfg.wasConnected, charging: cfg.wasCharging, lastTxnId: cfg.lastTxnId, lastFullMs: cfg.lastFullMs },
    st,
    Date.now()
  );
  if (diff.plugIn || diff.chargeStart || diff.full || diff.plugOut) {
    await recordWatchEvents(env, cfg, diff, Date.now());
  }
  cfg.wasConnected = connected;
  if (stTxnId) {
    if (cfg.lastTxnId !== stTxnId) cfg.lastFullMs = stFullMs;
    else if (stFullMs != null) cfg.lastFullMs = stFullMs;
    cfg.lastTxnId = stTxnId;
  }

  cfg.wasCharging = charging;
  cfg.wasPeak = peak;
  cfg.lastTickAt = Date.now();
  await env.EV_BACKUP.put(CFG_KEY, JSON.stringify(cfg));

  const status = {
    lastTickAt: cfg.lastTickAt,
    state: st.state || null,
    charging,
    connected,
    peak,
    lastAction: action || null
  };
  await env.EV_BACKUP.put(STATUS_KEY, JSON.stringify(status));
  return { ok: true, action: "tick", armed: true, ...status };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const action = String(body.action || "");
    let result;
    if (action === "register") result = await handleRegister(context.env, body);
    else if (action === "deregister") result = await handleDeregister(context.env, body);
    else if (action === "status") result = await handleStatus(context.env, body);
    else if (action === "tick") result = await handleTick(context.env, body);
    else {
      const err = new Error("פעולה לא מוכרת");
      err.status = 400;
      throw err;
    }
    return json(200, result);
  } catch (e) {
    const status = e.status || 500;
    return json(status, { error: e.message || "שגיאה לא צפויה", ok: false });
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return optionsResponse();
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed", ok: false });
}
