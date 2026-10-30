import { json, optionsResponse, handleWevoRequest, cognitoLogin, requestOrigin, verifyCreds } from "../_shared/wevo.js";
import { pushToAllSubscribers } from "../_shared/push.js";
import { storeGetJson, storePutJson, storeDelete } from "../_shared/watch-store.js";

// שומר צד־שרת (watch): שלושה מצבים — שומר קבוע (אישור ראשון אוטומטי +
// התראות), שומר התראות בלבד, וחימוש המשך־פרימיום במעבר לתעריף פרימיום.
// המשתמש נרשם מהאפליקציה (opt-in) מהפאנל החי.
// פרטי ההתחברות נשמרים מוצפנים ב־AES-GCM (מפתח ב־env.EV_WATCH_KEY) במאגר
// השומר (watch-store: ‏D1 אם כרוך, אחרת KV).
// טריגר חיצוני (קרון) קורא action=tick עם env.EV_WATCH_TICK_SECRET כל דקה.

const CFG_KEY = "watch:cfg";
const STATUS_KEY = "watch:status";
const LOG_KEY = "watch:log";
const EVENTS_KEY = "watch:events";

// M27 (ביקורת 30.10): ספי הבטיחות של השומר — בלוק אחד. שינוי מדיניות עובר
// כאן בלבד; בעבר כל סף היה ליטרל גולמי בכמה מקומות ופספוס של מופע אחד
// היה שובר את הגנת השחזור בחלק מהמסלולים.
const FRESH_MS = 5 * 60 * 1000; // טריות חותמת סיום / חיבור / שידור חוזר
const STALE_SNAPSHOT_MS = 15 * 60 * 1000; // snapshot ישן מזה = ההתמדה לא בריאה
const STOP_REPUSH_MS = 15 * 60 * 1000; // חלון דה־דופ להתראת עצירה חוזרת
const POLL_FRESH_MS = 3 * 60 * 1000; // טריות סקירת האפליקציה (דילוג טיק)
const FLOW_STABLE_MS = 3 * 60 * 1000; // זרם יציב לחימוש־מחדש (כמו FLOW_STABLE_MS ב־lib/ev-timeline)
const HEARTBEAT_MS = 10 * 60 * 1000; // דופק סטטוס / גיל מינימלי לחימוש־מחדש של שער הסיום
const EXPIRY_MS = 24 * 3600 * 1000; // פקיעת חימוש (רגיל ופרימיום)
const EVENTS_KEEP_MS = 48 * 3600 * 1000; // שמירת יומן אירועים במאגר

// תיקון מכסת KV (19.10.2026): השוואת cfg בלי שדות הזמן התנודתיים (lastTickAt/lastPollAt),
// כדי לזהות אם טיק שינה משהו מהותי. בעבר כל טיק כתב cfg+status מחדש (2 כתיבות לטיק,
// ~1,000+ ביום) ושרף את מכסת הכתיבה היומית של Workers KV — הכתיבה עכשיו רק על שינוי.
function stableCfgJson(cfg) {
  if (!cfg) return "";
  const { lastTickAt, lastPollAt, ...rest } = cfg;
  return JSON.stringify(rest);
}

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
  if (!env.EV_BACKUP && !env.EV_WATCH_DB) {
    const err = new Error("KV לא מוגדר בשרת");
    err.status = 503;
    throw err;
  }
  return storeGetJson(env, CFG_KEY);
}

async function pushLog(env, entry) {
  try {
    const list = (await storeGetJson(env, LOG_KEY)) || [];
    list.unshift({ at: Date.now(), ...entry });
    await storePutJson(env, LOG_KEY, list.slice(0, 20));
  } catch {}
}

// ב3 — גזירת אירועי טעינה מהפרש בין דגימת מצב קודמת לנוכחית (פונקציה טהורה).
// לקח משטח (18–19.10): הדגל st.charging של normalizeState נשאר true גם ב־SuspendedEV
// (רכב מלא ומחובר), ומזהה העסקה חוזר ריק בעמדה הזו — לכן הזיהוי מבוסס מצב OCPP,
// חותמת full, ‏didCompleteFull וזהות לפי שעת חיבור, ולא על הדגל/המזהה בלבד.
// prev: {connected, charging, state, lastTxnId, lastEventKey, lastFullMs, didCompleteFull} מתוך cfg.
export function watchEventKey(st) {
  if (!st) return null;
  if (st.transactionId != null && String(st.transactionId) !== "" && String(st.transactionId) !== "0") {
    return String(st.transactionId);
  }
  if (st.plugInTime != null && Number(st.plugInTime) > 0) return `plug-${Number(st.plugInTime)}`;
  return null;
}

function stateActivelyCharging(state) {
  return state === "Charging";
}

// האם בדגימה הקודמת זרם באמת — לפי state אם נרשם, אחרת לפי הדגל הישן (תאימות לאחור)
function prevWasFlowing(p, forStart) {
  if (p.state != null) return stateActivelyCharging(p.state);
  return forStart ? false : !!p.charging;
}

export function eventsFromStateDiff(prev, st, nowMs) {
  const p = prev || {};
  const out = {};
  // זהות: מזהה/שעת־חיבור מהמצב; כשאין — מפתח המושב שהטיק מנפיק ושומר ב־cfg
  const key = watchEventKey(st) || (st && st.connected ? (p.lastEventKey || null) : null);
  const connected = !!(st && st.connected);
  const active = stateActivelyCharging(st && st.state);
  if (!p.connected && connected && key) {
    const at = st.plugInTime != null && Number(st.plugInTime) > 0 ? Number(st.plugInTime) : nowMs;
    out.plugIn = { txnId: key, atMs: at };
  }
  if (!prevWasFlowing(p, true) && active && key) out.chargeStart = { txnId: key, atMs: nowMs };
  const fullMs = st && st.chargingFullTime != null && Number(st.chargingFullTime) > 0 ? Number(st.chargingFullTime) : null;
  // כלל החותמת — מוגבל בשער הסיום של החיבור (fullNotifiedKey): העמדה מחזירה
  // chargingFullTime שמתקדם מדקה לדקה בטעינה חיה (רגרסיית הצפה 19.10), ולכן
  // חותמת לבדה אינה הוכחה. חותמת אמיתית מתקבלת מיד כש־didCompleteFull דלוק,
  // או כשהיא יציבה שתי דגימות רצופות (lastFullSeenMs) — חותמת אמיתית לא זזה.
  if (key && connected && p.fullNotifiedKey == null && fullMs && fullMs !== (p.lastFullMs || null) &&
      (st.didCompleteFull || fullMs === (p.lastFullSeenMs || null))) {
    out.full = { txnId: key, atMs: fullMs };
  }
  // סיום בלי חותמת: didCompleteFull התהפך, או מעבר ל־SuspendedEV/Finishing אחרי זרם פעיל.
  // שער fullNotifiedKey: סיום מקורב מדווח פעם אחת לחיבור — מצב שמתהפך
  // Charging↔SuspendedEV (טעינה איטית/איזון עומסים) לא יורה שוב ושוב (רגרסיית 19.10).
  if (key && connected && !out.full && p.fullNotifiedKey == null) {
    const fullFlag = !!(st && st.didCompleteFull);
    const endedByState = (st.state === "SuspendedEV" || st.state === "Finishing") && prevWasFlowing(p, false);
    if ((fullFlag && p.didCompleteFull !== true) || endedByState) {
      out.full = { txnId: key, atMs: nowMs, approx: true };
    }
  }
  // סיום שכבר קרה לפני שהמעברים נצפו (למשל חימוש מאוחר או מעבר שנצרך בלי זהות):
  // didCompleteFull דלוק ועוד לא דווח שום סיום בחיבור הזה — מדווחים פעם אחת.
  if (key && connected && !out.full && st && st.didCompleteFull && p.fullNotifiedKey == null) {
    out.full = { txnId: key, atMs: fullMs || nowMs, approx: !fullMs };
  }
  // עצירת עמדה (SuspendedEVSE) אחרי זרם פעיל — מועמד להתראת פרימיום (רק כשאין סיום באותה דגימה)
  if (prevWasFlowing(p, false) && !active && connected && key && !out.full && st.state === "SuspendedEVSE") {
    out.chargeStop = { txnId: key, atMs: nowMs, evsePaused: true };
  }
  const prevKey = p.lastEventKey || (p.lastTxnId ? String(p.lastTxnId) : null);
  if (p.connected && !connected && prevKey) out.plugOut = { txnId: prevKey, atMs: nowMs };
  return out;
}

// האם חימוש המשך־הפרימיום פעיל? רישומי מורשת (לפני שדה premiumContinue):
// חימוש חולף שאינו notifyOnly היה תמיד חימוש פרימיום.
export function premiumArmActive(cfg) {
  if (!cfg || cfg.notifyOnly) return false;
  if (cfg.premiumContinue === true) return true;
  return cfg.premiumContinue == null && !cfg.persistent;
}

// החלטות השומר הקבוע/החמוש לטיק אחד — פונקציה טהורה (נבדקת ביחידה, בלי Wevo):
// אישור ראשון אוטומטי בחיבור (לא בפרימיום), אישור המשך־פרימיום רק עם חימוש פרימיום,
// ובפרימיום בלי חימוש — רק התראה להחלטת עדן.
// שער דחיפת "הטעינה הסתיימה" במצב שמירה־קפואה (persistenceHealthy=false):
// בלי זיכרון מתמיד, כל טיק משחזר את הסיום מההפרש מול המצב הקפוא. דוחפים רק
// עם עוגן טרי מ־Wevo: חותמת סיום בת ≤5 דקות, או מצב Finishing חולף.
export function fullPushAllowed(full, st, nowMs, persistenceHealthy) {
  if (!full) return false;
  if (persistenceHealthy) return true;
  const stamp = st && Number(st.chargingFullTime) > 0 ? Number(st.chargingFullTime) : (!full.approx ? full.atMs : 0);
  if (stamp && nowMs - stamp <= FRESH_MS) return true;
  return !!(full.approx && st && st.state === "Finishing");
}

export function decideGuardActions(cfg, prev, st, diff, ctx) {
  const out = { authorizeFirst: false, plugKey: null, authorizePremium: false, notifyPeakPlug: false, notifyPeakStop: false };
  if (!cfg || cfg.notifyOnly) return out;
  const peak = !!(ctx && ctx.peak);
  const flip = !!(ctx && ctx.flip);
  const connected = !!(st && st.connected);
  const activeNow = !!(st && st.state === "Charging");
  const flowedBefore = prev && prev.state != null ? prev.state === "Charging" : !!(prev && prev.charging);
  if (diff && diff.plugIn && cfg.autoApprove) {
    out.plugKey = `plug:${diff.plugIn.txnId}:${diff.plugIn.atMs}`;
    if (peak) out.notifyPeakPlug = true;
    else if (!activeNow && cfg.plugActedKey !== out.plugKey) out.authorizeFirst = true;
  }
  if (flip && flowedBefore && !activeNow && connected) {
    if (premiumArmActive(cfg)) {
      if (cfg.actedKey !== (ctx && ctx.peakKey)) out.authorizePremium = true;
    } else if (cfg.persistent) {
      out.notifyPeakStop = true;
    }
  }
  return out;
}

// שמירת האירועים תחת watch:events (לפי transactionId), עם גיזום ל־48 שעות / 5 עסקאות.
async function recordWatchEvents(env, cfg, diff, nowMs) {
  try {
    const all = (await storeGetJson(env, EVENTS_KEY)) || {};
    const touch = (txnId) => {
      const e = all[txnId] || (all[txnId] = {
        txnId, clientId: cfg.clientId || null,
        plugInAt: null, chargeStartedAt: null, chargingFullTime: null,
        chargeEndedAt: null, chargeStoppedAt: null, plugOutAt: null, updatedAt: 0, source: "watch"
      });
      e.updatedAt = nowMs;
      return e;
    };
    if (diff.plugIn) { const e = touch(diff.plugIn.txnId); if (e.plugInAt == null) e.plugInAt = diff.plugIn.atMs; }
    if (diff.chargeStart) {
      const e = touch(diff.chargeStart.txnId);
      if (e.chargeStartedAt == null) {
        e.chargeStartedAt = diff.chargeStart.atMs;
        // חותמת ההתחלה היא זמן־צפייה של הטיק, לא חותמת Wevo — מסומן כמקורב (B9)
        e.chargeStartApprox = true;
      }
    }
    if (diff.full) {
      const e = touch(diff.full.txnId);
      if (diff.full.approx) {
        // סיום שנגזר ממעבר מצב (בלי חותמת Wevo) — chargeEndedAt מקורב, בלי chargingFullTime
        if (e.chargeEndedAt == null) e.chargeEndedAt = diff.full.atMs;
        e.endApprox = true;
      } else {
        e.chargingFullTime = diff.full.atMs;
        e.chargeEndedAt = diff.full.atMs;
      }
    }
    if (diff.chargeStop) { const e = touch(diff.chargeStop.txnId); if (e.chargeStoppedAt == null) e.chargeStoppedAt = diff.chargeStop.atMs; }
    if (diff.plugOut) { const e = touch(diff.plugOut.txnId); if (e.plugOutAt == null) e.plugOutAt = diff.plugOut.atMs; }
    // M7 (ביקורת 30.10): מעבר זהות — העמדה החזירה קודם "0"/ריק (מפתח plug-… או
    // watch-…) ואחר כך מזהה עסקה אמיתי: מאחדים את הרשומה הישנה לתוך החדשה,
    // שלא יישארו שתי רשומות לאותה טעינה (הפאנל ממזג רק אחת מהן).
    const oldKey = cfg && cfg.lastEventKey;
    const diffKeys = [diff.plugIn, diff.chargeStart, diff.full, diff.chargeStop, diff.plugOut]
      .filter(Boolean).map(d => d.txnId);
    if (oldKey && (String(oldKey).startsWith("plug-") || String(oldKey).startsWith("watch-")) && all[oldKey]) {
      const target = diffKeys.find(k => k && k !== oldKey && !String(k).startsWith("plug-") && !String(k).startsWith("watch-"));
      if (target) {
        const from = all[oldKey];
        const to = touch(target);
        for (const f of ["plugInAt", "chargeStartedAt", "chargingFullTime", "chargeEndedAt", "chargeStoppedAt", "plugOutAt"]) {
          if (to[f] == null && from[f] != null) to[f] = from[f];
        }
        if (from.endApprox && to.endApprox == null) to.endApprox = true;
        if (from.chargeStartApprox && to.chargeStartApprox == null) to.chargeStartApprox = true;
        delete all[oldKey];
      }
    }
    const kept = Object.entries(all)
      .filter(([, e]) => nowMs - (e.updatedAt || 0) < EVENTS_KEEP_MS)
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
      .slice(0, 5);
    await storePutJson(env, EVENTS_KEY, Object.fromEntries(kept));
  } catch (e) {
    // M9 (ביקורת 30.10): בעבר ה־catch בלע הכול — כשלי שמירת אירועים היו בלתי נראים
    try {
      await pushLog(env, { kind: "events-error", detail: `שמירת אירועי שומר נכשלה: ${e && e.message || "שגיאה"}` });
    } catch {}
  }
}

async function handleRegister(env, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  await verifyCreds(email, password);
  const credsBlob = await encryptJson(env, { email, password });
  const existing = await loadCfg(env);
  const now = Date.now();
  // שומר קבוע: persistent שורד כל חימוש־על. H6+M6 (ביקורת 30.10): בעבר רק
  // חימוש פרימיום התמזג לתוך השומר הקבוע; חימוש notifyOnly (או כל רישום אחר)
  // דרס אותו בשקט — מחק את ה־persistent ואיפס את שערי הדה־דופ (fullNotifiedKey
  // וחבריו), עם סיכון להתראות סיום כפולות. כעת: persistent נשמר תמיד מעל שומר
  // קבוע קיים, ומצב המעקב נשמר בכל רישום מעל רישום קיים (רישום חדש באמת
  // קורה רק אחרי deregister/פקיעה, כש־existing ריק).
  const keepPersistent = !!(existing && existing.persistent);
  const mergeIntoGuard = !!existing;
  const persistent = body.persistent === true || keepPersistent;
  let premiumContinue = body.premiumContinue === true;
  let premiumArmedAt = premiumContinue ? now : null;
  if (!premiumContinue && persistent && existing && existing.premiumContinue
      && now - Number(existing.premiumArmedAt || 0) < EXPIRY_MS) {
    premiumContinue = true;
    premiumArmedAt = existing.premiumArmedAt;
  }
  const cfg = {
    armed: true,
    clientId: body.clientId != null ? String(body.clientId) : null,
    clientName: body.clientName != null ? String(body.clientName) : null,
    // notifyOnly: חימוש להתראות בלבד (גם ללקוח עצמי) — בלי אישורי פרימיום אוטומטיים בטיק
    notifyOnly: body.notifyOnly === true,
    // persistent: שומר קבוע (התראות + אישור ראשון) בלי פקיעת 24 שעות;
    // autoApprove: אישור ראשון אוטומטי בחיבור (לא בשעות פרימיום);
    // premiumContinue: חימוש המשך־פרימיום ל־24 שעות (premiumArmedAt).
    persistent,
    autoApprove: persistent ? true : body.autoApprove === true,
    premiumContinue,
    premiumArmedAt,
    peakStartMin: Number(body.peakStartMin),
    peakEndMin: Number(body.peakEndMin),
    armedAt: keepPersistent ? Number(existing.armedAt || now) : now,
    credsBlob,
    wasCharging: mergeIntoGuard ? existing.wasCharging : null,
    wasPeak: mergeIntoGuard ? existing.wasPeak : null,
    wasConnected: mergeIntoGuard ? existing.wasConnected : null,
    // שדות מצב ודה־דופ — נשמרים במיזוג, בלי לאפס שערי "כבר הותרע" (H6)
    wasState: mergeIntoGuard ? (existing.wasState ?? null) : null,
    wasFull: mergeIntoGuard ? (existing.wasFull ?? null) : null,
    lastTxnId: mergeIntoGuard ? existing.lastTxnId : null,
    lastEventKey: mergeIntoGuard ? (existing.lastEventKey ?? null) : null,
    lastFullMs: mergeIntoGuard ? existing.lastFullMs : null,
    lastFullSeenMs: mergeIntoGuard ? (existing.lastFullSeenMs ?? null) : null,
    lastFullAtMs: mergeIntoGuard ? (existing.lastFullAtMs ?? null) : null,
    fullNotifiedKey: mergeIntoGuard ? (existing.fullNotifiedKey ?? null) : null,
    flowSinceMs: mergeIntoGuard ? (existing.flowSinceMs ?? null) : null,
    lastStopPushKey: mergeIntoGuard ? (existing.lastStopPushKey ?? null) : null,
    lastStopPushAtMs: mergeIntoGuard ? (existing.lastStopPushAtMs ?? null) : null,
    actedKey: mergeIntoGuard ? existing.actedKey : null,
    plugActedKey: mergeIntoGuard ? existing.plugActedKey : null,
    lastPollAt: mergeIntoGuard ? existing.lastPollAt : null
  };
  if (!Number.isFinite(cfg.peakStartMin) || !Number.isFinite(cfg.peakEndMin)) {
    const err = new Error("חסר חלון תעריף פרימיום");
    err.status = 400;
    throw err;
  }
  if (!await storePutJson(env, CFG_KEY, cfg)) {
    const err = new Error("שמירת השומר נכשלה");
    err.status = 503;
    throw err;
  }
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
  await storeDelete(env, CFG_KEY);
  await storeDelete(env, STATUS_KEY);
  await storeDelete(env, EVENTS_KEY);
  await pushLog(env, { kind: "deregister", detail: "שומר כובה והפרטים נמחקו מהשרת" });
  return { ok: true, action: "deregister", armed: false };
}

async function handleStatus(env, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  await verifyCreds(email, password);
  const cfg = await loadCfg(env);
  if (!cfg) return { ok: true, action: "status", armed: false };
  const status = (await storeGetJson(env, STATUS_KEY)) || null;
  const log = (await storeGetJson(env, LOG_KEY)) || [];
  const events = (await storeGetJson(env, EVENTS_KEY)) || {};
  return {
    ok: true,
    action: "status",
    armed: !!cfg.armed,
    notifyOnly: !!cfg.notifyOnly,
    persistent: !!cfg.persistent,
    autoApprove: !!cfg.autoApprove,
    premiumContinue: premiumArmActive(cfg),
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
  let cfgBefore = stableCfgJson(cfg);
  // M8 (ביקורת 30.10): pushToAllSubscribers לא זורק ומחזיר סטטוס — בעבר איש לא
  // קרא אותו, וכשל התראות טוטאלי (למשל VAPID חסר) היה שקט לגמרי. כעת כשל
  // נרשם ליומן השומר, פעם אחת לטיק.
  let pushProblemLogged = false;
  const pushAndLog = async (payload) => {
    const r = await pushToAllSubscribers(env, payload);
    const problem = r && (r.skipped || (r.subs > 0 && r.sent === 0));
    if (problem && !pushProblemLogged) {
      pushProblemLogged = true;
      await pushLog(env, {
        kind: "push-error",
        detail: r.skipped
          ? "התראת push דולגה — VAPID לא מוגדר או אחסון המנויים חסר"
          : `התראת push לא נמסרה לאף אחד מ־${r.subs} המנויים (${payload.tag || "ללא תג"})`
      });
    }
    return r;
  };
  // פקיעה: רישום חולף פג כולו אחרי 24 שעות. שומר קבוע לא פג — רק חימוש
  // המשך־הפרימיום שבתוכו מתבטל אחרי 24 שעות, והשומר ממשיך כהתראות + אישור ראשון.
  if (!cfg.persistent && Date.now() - Number(cfg.armedAt || 0) > EXPIRY_MS) {
    await storeDelete(env, CFG_KEY);
    await storeDelete(env, STATUS_KEY);
    await storeDelete(env, EVENTS_KEY);
    await pushLog(env, { kind: "expire", detail: "שומר כובה אוטומטית אחרי 24 שעות" });
    try {
      await pushAndLog({
        title: "🛰️ שומר השרת כובה",
        body: "השומר כובה אוטומטית אחרי 24 שעות. להפעלה מחדש — סמן שוב «המשך אוטומטי בפרימיום» באפליקציה.",
        tag: "ev-watch-expired"
      });
    } catch {}
    return { ok: true, action: "tick", armed: false, expired: true };
  }
  if (cfg.persistent && cfg.premiumContinue
      && Date.now() - Number(cfg.premiumArmedAt || cfg.armedAt || 0) > EXPIRY_MS) {
    cfg.premiumContinue = false;
    cfg.premiumArmedAt = null;
    cfg.actedKey = null;
    // כשל כתיבה לא עוצר את הטיק — הפקיעה תתמיד בטיק הבא
    if (await storePutJson(env, CFG_KEY, cfg)) cfgBefore = stableCfgJson(cfg);
    await pushLog(env, { kind: "premium-expire", detail: "חימוש המשך־הפרימיום פג אחרי 24 שעות — השומר הקבוע ממשיך" });
  }
  // שומר קבוע במנוחה: סריקה מדורגת (כל ~3 דקות כשאין רכב) כדי לא להציף את Wevo.
  // תיקון מכסת KV (19.10.2026): נוסף שער דקת־שעון — סריקה מלאה רק בדקות שמתחלקות
  // ב־3, כך שהמצערת לא תלויה בשמירת lastPollAt בכל טיק (מה שאילץ כתיבת cfg בכל סריקה).
  const lastPollFresh = cfg.lastPollAt && Date.now() - Number(cfg.lastPollAt) < POLL_FRESH_MS;
  if (cfg.persistent && !cfg.wasConnected
      && (lastPollFresh || Math.floor(Date.now() / 60000) % 3 !== 0)) {
    return { ok: true, action: "tick", armed: true, throttled: true };
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
  cfg.lastPollAt = Date.now();

  // ב3 + שומר קבוע: קודם מחשבים את אירועי המצב ואת החלטות השומר מהמצב שכבר
  // נשלף, ורק אז מבצעים אישורים — ההחלטה עצמה פונקציה טהורה נבדקת.
  const stTxnId = st.transactionId != null && String(st.transactionId) !== "" ? String(st.transactionId) : null;
  const stFullMs = st.chargingFullTime != null && Number(st.chargingFullTime) > 0 ? Number(st.chargingFullTime) : null;
  // זהות מושב: אם לפיד אין שום זהות (העמדה מחזירה מזהה 0 ובלי שעת חיבור) —
  // מנפיקים מפתח מקומי יציב לאורך החיבור, כדי שהאירועים וההתראות יעבדו בכל זאת.
  if (connected && !watchEventKey(st) && !cfg.lastEventKey) {
    cfg.lastEventKey = `watch-${Date.now()}`;
  }
  const diff = eventsFromStateDiff(
    {
      connected: cfg.wasConnected, charging: cfg.wasCharging, state: cfg.wasState ?? null,
      lastTxnId: cfg.lastTxnId, lastEventKey: cfg.lastEventKey ?? null,
      lastFullMs: cfg.lastFullMs, lastFullSeenMs: cfg.lastFullSeenMs ?? null,
      didCompleteFull: cfg.wasFull === true,
      fullNotifiedKey: cfg.fullNotifiedKey ?? null
    },
    st,
    Date.now()
  );
  const decide = decideGuardActions(cfg, { charging: cfg.wasCharging, state: cfg.wasState ?? null }, st, diff, { peak, flip, peakKey: key });

  let action = null;
  if (decide.authorizePremium) {
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
      await pushAndLog({
        title: "⚡ הטעינה ממשיכה בפרימיום",
        body: `השומר זיהה מעבר לתעריף פרימיום וחידש את הטעינה אוטומטית${cfg.clientName ? ` (${cfg.clientName})` : ""}`,
        tag: "ev-watch-premium"
      });
    } catch {}
  }
  if (decide.authorizeFirst) {
    const res = await handleWevoRequest({
      email: creds.email,
      password: creds.password,
      action: "authorize",
      confirmPremium: false
    });
    cfg.plugActedKey = decide.plugKey;
    action = {
      kind: "authorize-first",
      at: Date.now(),
      detail: "זוהה חיבור רכב — נשלח אישור ראשון אוטומטי (תעריף רגיל, לא פרימיום)",
      chargingAfter: !!(res && res.state && res.state.charging)
    };
    await pushLog(env, action);
    try {
      await pushAndLog({
        title: "⚡ טעינה אושרה אוטומטית",
        body: `רכב חובר לעמדה והשומר אישר טעינה בתעריף רגיל${cfg.clientName ? ` (${cfg.clientName})` : ""}. לאישור המשך גם בפרימיום — הפעילו «המשך אוטומטי בפרימיום» באפליקציה.`,
        tag: "ev-watch-firstauth"
      });
    } catch {}
  }

  if (diff.plugIn || diff.chargeStart || diff.full || diff.chargeStop || diff.plugOut) {
    await recordWatchEvents(env, cfg, diff, Date.now());
  }
  if (diff.plugIn) {
    cfg.fullNotifiedKey = null;
    cfg.lastFullMs = null;
  }
  if (diff.full) {
    cfg.fullNotifiedKey = diff.full.txnId;
    cfg.lastFullAtMs = Date.now();
    // H7: lastFullMs הוא "חותמת הסיום האחרונה שכבר דווחה" — מתעדכן רק כאן,
    // כשאירוע סיום עם חותמת אמיתית נורה (לא בכל טיק).
    if (!diff.full.approx) cfg.lastFullMs = diff.full.atMs;
  }
  // חימוש־מחדש של שער הסיום: קטע זרם חדש ויציב (3+ דקות Charging רצוף) שזורם
  // 10+ דקות אחרי הסיום הקודם מאפשר דיווח סיום נוסף באותו חיבור (חידוש אחרי
  // פרימיום). היפוכי מצב מאפסים את מונה היציבות — ולכן לא מחמשים מחדש לעולם.
  if (!connected) {
    cfg.fullNotifiedKey = null;
    cfg.lastEventKey = null;
  }
  // התראות על אירועי הטעינה (אותם אירועים שנלכדו) — גם בחימוש פרימיום וגם ב־notifyOnly
  // בריאות השמירה: סטטוס שלא התעדכן 15+ דקות = הכתיבות חסומות והמצב השמור
  // קפוא; אירועי הפרש מולו עלולים להיות שידורים חוזרים. במצב כזה דוחפים רק
  // אירועים עם עוגן־זמן טרי מ־Wevo (ראו fullPushAllowed והגנות הטריות).
  let persistenceHealthy = true;
  try {
    const snap = await storeGetJson(env, STATUS_KEY);
    if (snap && Number(snap.lastTickAt) && Date.now() - Number(snap.lastTickAt) > STALE_SNAPSHOT_MS) persistenceHealthy = false;
  } catch {}
  const hhmm = (ms) => new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(new Date(ms));
  const who = cfg.clientName ? `${cfg.clientName} · ` : "";
  // הגנת טריות גם לחיבור: חיבור ש־Wevo מתארכת ללפני 5+ דקות הוא קו־בסיס של
  // חימוש/מצב קפוא, לא אירוע חדש (אותה משפחת שידורים חוזרים כמו בניתוק).
  const plugFresh = !st.plugInTime || Date.now() - Number(st.plugInTime) <= FRESH_MS;
  if (diff.plugIn && plugFresh) {
    try {
      await pushAndLog(decide.notifyPeakPlug ? {
        title: "🔌 רכב חובר בשעות פרימיום",
        body: `${who}רכב חובר לעמדה בשעות פרימיום — השומר לא אישר אוטומטית. לאישור, פתחו את האפליקציה.`,
        tag: "ev-watch-peakplug"
      } : {
        title: "🔌 רכב חובר לעמדה",
        body: `${who}רכב חובר לעמדה`,
        tag: "ev-watch-plugin"
      });
    } catch {}
  }
  if (decide.notifyPeakStop && persistenceHealthy) {
    try {
      await pushAndLog({
        title: "⏸️ הטעינה הופסקה במעבר לפרימיום",
        body: `${who}הטעינה הופסקה במעבר לפרימיום והשומר הקבוע לא מאשר פרימיום אוטומטית. לאישור המשך — פתחו את האפליקציה והפעילו «אשר מראש · כולל פרימיום».`,
        tag: "ev-watch-peakstop"
      });
    } catch {}
  }
  if (diff.full && fullPushAllowed(diff.full, st, Date.now(), persistenceHealthy)) {
    try {
      await pushAndLog({
        title: "🔋 הטעינה הסתיימה",
        body: `${who}הטעינה הסתיימה ב־${hhmm(diff.full.atMs)}`,
        tag: "ev-watch-full"
      });
    } catch {}
  }
  if (diff.chargeStop && diff.chargeStop.evsePaused && !decide.notifyPeakStop && persistenceHealthy) {
    // דיכוי חזרות: היפוכי Charging↔SuspendedEVSE לא מציפים — עצירה אחת ל־15 דקות לעסקה
    const stopKey = diff.chargeStop.txnId;
    const lastStop = cfg.lastStopPushAtMs && cfg.lastStopPushKey === stopKey ? cfg.lastStopPushAtMs : 0;
    if (Date.now() - lastStop >= STOP_REPUSH_MS) {
      cfg.lastStopPushKey = stopKey;
      cfg.lastStopPushAtMs = Date.now();
      try {
        await pushAndLog({
          title: "⏸️ הטעינה מושהית",
          body: `${who}הטעינה מושהית מצד העמדה — ככל הנראה מעבר לפרימיום`,
          tag: "ev-watch-stop"
        });
      } catch {}
    }
  }
  if (diff.plugOut) {
    // הגנת טריות (19.10): כשהשמירה ל־KV חסומה (מכסה), המצב השמור קופא וכל טיק
    // "מגלה" את הניתוק מחדש. אם זמן הניתוק האמיתי מ־Wevo ישן מ־5 דקות — זהו
    // שידור חוזר, לא אירוע חדש, ולא דוחפים שוב.
    let staleReplay = false;
    try {
      const sync = await handleWevoRequest({ email: creds.email, password: creds.password, action: "sync" });
      const txs = Array.isArray(sync.transactions) ? sync.transactions : [];
      const withOut = txs.filter(t => Number(t.plugOutTime) > 0)
        .sort((a, b) => Number(b.plugOutTime) - Number(a.plugOutTime));
      const outMs = withOut.length ? Number(withOut[0].plugOutTime) : 0;
      if (outMs && Date.now() - outMs > FRESH_MS) staleReplay = true;
    } catch {}
    if (!staleReplay) {
      try {
        await pushAndLog({
          title: "🔌 הכבל נותק",
          body: `${who}הכבל נותק מהעמדה`,
          tag: "ev-watch-unplug"
        });
      } catch {}
    }
  }
  cfg.wasConnected = connected;
  cfg.wasState = st.state || null;
  cfg.wasFull = !!st.didCompleteFull;
  if (st.state === "Charging") {
    if (!cfg.flowSinceMs) cfg.flowSinceMs = Date.now();
  } else {
    cfg.flowSinceMs = null;
  }
  if (cfg.fullNotifiedKey != null && cfg.lastFullAtMs && Date.now() - cfg.lastFullAtMs >= HEARTBEAT_MS &&
      cfg.flowSinceMs && Date.now() - cfg.flowSinceMs >= FLOW_STABLE_MS) {
    cfg.fullNotifiedKey = null;
  }
  const evKey = watchEventKey(st);
  if (evKey) cfg.lastEventKey = evKey;
  // H7 (ביקורת 30.10): lastFullSeenMs הוא החותמת שנצפתה בטיק זה (תשמש כ"דגימה
  // קודמת" בטיק הבא), ו־lastFullMs הוא חותמת שכבר דווחה (מתעדכן רק ביריית
  // אירוע full, למעלה). בעבר שוקפו שניהם לאותו ערך בכל טיק — ושער "חותמת
  // יציבה שתי דגימות" ב־eventsFromStateDiff (fullMs !== lastFullMs וגם
  // fullMs === lastFullSeenMs) היה סתירה מתמטית שלא יכלה לירות לעולם.
  if (stTxnId && cfg.lastTxnId !== stTxnId) {
    cfg.lastTxnId = stTxnId;
    cfg.lastFullMs = null;
  }
  cfg.lastFullSeenMs = stFullMs || null;

  cfg.wasCharging = charging;
  cfg.wasPeak = peak;
  cfg.lastTickAt = Date.now();
  // תיקון מכסת KV (19.10.2026): כותבים את cfg רק אם שדה מהותי השתנה בטיק הזה,
  // וכשל כתיבה (למשל מכסה יומית שנוצלה) לא מפיל את הטיק — השומר ממשיך לפעול.
  let kvWriteFailed = false;
  if (stableCfgJson(cfg) !== cfgBefore) {
    if (!await storePutJson(env, CFG_KEY, cfg)) kvWriteFailed = true;
  }

  const status = {
    lastTickAt: cfg.lastTickAt,
    state: st.state || null,
    charging,
    connected,
    peak,
    lastAction: action || null
  };
  // וגם את הסטטוס כותבים רק על שינוי מהותי, או דופק־חיים כל ~10 דקות לכל היותר.
  let prevStatus = null;
  prevStatus = await storeGetJson(env, STATUS_KEY);
  const statusChanged = !prevStatus
    || prevStatus.state !== status.state
    || prevStatus.charging !== status.charging
    || prevStatus.connected !== status.connected
    || prevStatus.peak !== status.peak
    || JSON.stringify(prevStatus.lastAction || null) !== JSON.stringify(status.lastAction || null)
    || Date.now() - Number(prevStatus.lastTickAt || 0) >= HEARTBEAT_MS;
  if (statusChanged) {
    if (!await storePutJson(env, STATUS_KEY, status)) kvWriteFailed = true;
  }
  return { ok: true, action: "tick", armed: true, ...(kvWriteFailed ? { kvWriteFailed: true } : {}), ...status };
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
    return json(200, result, requestOrigin(context));
  } catch (e) {
    const status = e.status || 500;
    return json(status, { error: e.message || "שגיאה לא צפויה", ok: false }, requestOrigin(context));
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return optionsResponse(requestOrigin(context));
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed", ok: false }, requestOrigin(context));
}
