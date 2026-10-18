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
  if (key && fullMs && fullMs !== (p.lastFullMs || null)) out.full = { txnId: key, atMs: fullMs };
  // סיום בלי חותמת: didCompleteFull התהפך, או מעבר ל־SuspendedEV/Finishing אחרי זרם פעיל
  if (key && connected && !out.full) {
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
  // עצירת עמדה (SuspendedEVSE) אחרי זרם פעיל — מועמד להתראת שיא (רק כשאין סיום באותה דגימה)
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
// אישור ראשון אוטומטי בחיבור (לא בשיא), אישור המשך־פרימיום רק עם חימוש פרימיום,
// ובשיא בלי חימוש — רק התראה להחלטת עדן.
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

// שמירת האירועים ב־KV תחת watch:events (לפי transactionId), עם גיזום ל־48 שעות / 5 עסקאות.
async function recordWatchEvents(env, cfg, diff, nowMs) {
  try {
    const kv = env.EV_BACKUP;
    const all = (await kv.get(EVENTS_KEY, { type: "json" })) || {};
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
    if (diff.chargeStart) { const e = touch(diff.chargeStart.txnId); if (e.chargeStartedAt == null) e.chargeStartedAt = diff.chargeStart.atMs; }
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
  const existing = await loadCfg(env);
  const now = Date.now();
  // שומר קבוע: persistent שורד חימושי פרימיום — חימוש פרימיום מתמזג לתוכו ולא דורס אותו.
  const mergeIntoGuard = !!(existing && existing.persistent && body.premiumContinue === true);
  const persistent = body.persistent === true || mergeIntoGuard;
  let premiumContinue = body.premiumContinue === true;
  let premiumArmedAt = premiumContinue ? now : null;
  if (!premiumContinue && persistent && existing && existing.premiumContinue
      && now - Number(existing.premiumArmedAt || 0) < 24 * 3600 * 1000) {
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
    // autoApprove: אישור ראשון אוטומטי בחיבור (לא בשעות שיא);
    // premiumContinue: חימוש המשך־פרימיום ל־24 שעות (premiumArmedAt).
    persistent,
    autoApprove: persistent ? true : body.autoApprove === true,
    premiumContinue,
    premiumArmedAt,
    peakStartMin: Number(body.peakStartMin),
    peakEndMin: Number(body.peakEndMin),
    armedAt: mergeIntoGuard ? Number(existing.armedAt || now) : now,
    credsBlob,
    wasCharging: mergeIntoGuard ? existing.wasCharging : null,
    wasPeak: mergeIntoGuard ? existing.wasPeak : null,
    wasConnected: mergeIntoGuard ? existing.wasConnected : null,
    lastTxnId: mergeIntoGuard ? existing.lastTxnId : null,
    lastFullMs: mergeIntoGuard ? existing.lastFullMs : null,
    actedKey: mergeIntoGuard ? existing.actedKey : null,
    plugActedKey: mergeIntoGuard ? existing.plugActedKey : null,
    lastPollAt: mergeIntoGuard ? existing.lastPollAt : null
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
  // פקיעה: רישום חולף פג כולו אחרי 24 שעות. שומר קבוע לא פג — רק חימוש
  // המשך־הפרימיום שבתוכו מתבטל אחרי 24 שעות, והשומר ממשיך כהתראות + אישור ראשון.
  if (!cfg.persistent && Date.now() - Number(cfg.armedAt || 0) > 24 * 3600 * 1000) {
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
  if (cfg.persistent && cfg.premiumContinue
      && Date.now() - Number(cfg.premiumArmedAt || cfg.armedAt || 0) > 24 * 3600 * 1000) {
    cfg.premiumContinue = false;
    cfg.premiumArmedAt = null;
    cfg.actedKey = null;
    await env.EV_BACKUP.put(CFG_KEY, JSON.stringify(cfg));
    await pushLog(env, { kind: "premium-expire", detail: "חימוש המשך־הפרימיום פג אחרי 24 שעות — השומר הקבוע ממשיך" });
  }
  // שומר קבוע במנוחה: סריקה מדורגת (כל ~3 דקות כשאין רכב) כדי לא להציף את Wevo
  if (cfg.persistent && !cfg.wasConnected && cfg.lastPollAt
      && Date.now() - Number(cfg.lastPollAt) < 3 * 60 * 1000) {
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
      lastFullMs: cfg.lastFullMs, didCompleteFull: cfg.wasFull === true,
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
      await pushToAllSubscribers(env, {
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
      await pushToAllSubscribers(env, {
        title: "⚡ טעינה אושרה אוטומטית",
        body: `רכב חובר לעמדה והשומר אישר טעינה בתעריף רגיל${cfg.clientName ? ` (${cfg.clientName})` : ""}. לאישור המשך גם בפרימיום — הפעל «אישור מראש כולל פרימיום» באפליקציה.`,
        tag: "ev-watch-firstauth"
      });
    } catch {}
  }

  if (diff.plugIn || diff.chargeStart || diff.full || diff.chargeStop || diff.plugOut) {
    await recordWatchEvents(env, cfg, diff, Date.now());
  }
  if (diff.plugIn) cfg.fullNotifiedKey = null;
  if (diff.full) cfg.fullNotifiedKey = diff.full.txnId;
  if (!connected) {
    cfg.fullNotifiedKey = null;
    cfg.lastEventKey = null;
  }
  // התראות על אירועי הטעינה (אותם אירועים שנלכדו) — גם בחימוש פרימיום וגם ב־notifyOnly
  const hhmm = (ms) => new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(new Date(ms));
  const who = cfg.clientName ? `${cfg.clientName} · ` : "";
  if (diff.plugIn) {
    try {
      await pushToAllSubscribers(env, decide.notifyPeakPlug ? {
        title: "🔌 רכב חובר בשעות שיא",
        body: `${who}רכב חובר לעמדה בשעות תעריף שיא — השומר לא אישר אוטומטית. לאישור, פתחו את האפליקציה.`,
        tag: "ev-watch-peakplug"
      } : {
        title: "🔌 רכב חובר לעמדה",
        body: `${who}רכב חובר לעמדה`,
        tag: "ev-watch-plugin"
      });
    } catch {}
  }
  if (decide.notifyPeakStop) {
    try {
      await pushToAllSubscribers(env, {
        title: "⏸️ הטעינה הופסקה במעבר לשיא",
        body: `${who}הטעינה הופסקה במעבר לתעריף שיא והשומר הקבוע לא מאשר פרימיום אוטומטית. לאישור המשך — הפעילו «אישור מראש כולל פרימיום» באפליקציה.`,
        tag: "ev-watch-peakstop"
      });
    } catch {}
  }
  if (diff.full) {
    try {
      await pushToAllSubscribers(env, {
        title: "🔋 הטעינה הסתיימה",
        body: `${who}הטעינה הסתיימה ב־${hhmm(diff.full.atMs)}`,
        tag: "ev-watch-full"
      });
    } catch {}
  }
  if (diff.chargeStop && diff.chargeStop.evsePaused && !decide.notifyPeakStop) {
    try {
      await pushToAllSubscribers(env, {
        title: "⏸️ הטעינה הופסקה",
        body: `${who}הטעינה הופסקה מצד העמדה — ככל הנראה מעבר לתעריף שיא`,
        tag: "ev-watch-stop"
      });
    } catch {}
  }
  if (diff.plugOut) {
    try {
      await pushToAllSubscribers(env, {
        title: "🔌 הכבל נותק",
        body: `${who}הכבל נותק מהעמדה`,
        tag: "ev-watch-unplug"
      });
    } catch {}
  }
  cfg.wasConnected = connected;
  cfg.wasState = st.state || null;
  cfg.wasFull = !!st.didCompleteFull;
  const evKey = watchEventKey(st);
  if (evKey) cfg.lastEventKey = evKey;
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
