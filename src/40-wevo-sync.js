/**
 * src/40-wevo-sync.js — עזרי סנכרון Wevo (API, state, transactions).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── Wevo sync helpers ──────────────────────────────────────────────────────
function wevoSyncUrl() {
  try {
    const custom = localStorage.getItem("ev_wevo_sync_url");
    if (custom) return custom;
  } catch {}
  return "/api/wevo-sync";
}

function getWevoCreds() {
  try {
    return JSON.parse(localStorage.getItem("ev_wevo_creds") || "{}");
  } catch {
    return {};
  }
}

const WEVO_AUTH_INTENT_KEY = "ev_wevo_preauth";
const WEVO_AUTH_INTENT_EVENT = "ev-wevo-auth-intent";
function getWevoAuthIntent() {
  try {
    return normalizeWevoAuthIntent(JSON.parse(localStorage.getItem(WEVO_AUTH_INTENT_KEY) || "null"));
  } catch {
    return null;
  }
}
function setWevoAuthIntent(v) {
  try {
    const next = normalizeWevoAuthIntent(v);
    if (next) localStorage.setItem(WEVO_AUTH_INTENT_KEY, JSON.stringify(next));
    else localStorage.removeItem(WEVO_AUTH_INTENT_KEY);
    try {
      window.dispatchEvent(new CustomEvent(WEVO_AUTH_INTENT_EVENT, { detail: next }));
    } catch {}
  } catch {}
}

/** חימוש אישור מראש מלקוח בדשבורד (מחוץ לפאנל Wevo). */
function armWevoClientPreauth(clientId, opts = {}) {
  if (!clientId) return null;
  const next = normalizeWevoAuthIntent({
    clientId,
    mode: "first-auth",
    armedAt: Date.now(),
    queued: false,
    lastAttemptAt: null,
    lastError: null,
    attempts: 0
  });
  setWevoAuthIntent(next);
  if (!opts.silent) {
    appAlert("אישור מראש פעיל — כשיתחבר רכב נאשר חיבור ונשייך ללקוח", "ok", 5200);
  }
  return next;
}
function clearWevoClientPreauth(reason) {
  setWevoAuthIntent(null);
  if (reason) {
    try {
      pushWevoLog("preauth", reason, true);
    } catch {}
  }
}

async function wevoApi(action, extra = {}) {
  const creds = getWevoCreds();
  if (!creds.email || !creds.password) {
    const err = new Error("NO_CREDS");
    throw err;
  }
  const res = await fetch(wevoSyncUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
      action,
      ...extra
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `שגיאת שרת (${res.status})`);
  }
  return data;
}

let _liveStationSnap = null;
function rememberLiveStation(st) {
  _liveStationSnap = st && typeof st === "object" ? st : null;
  try {
    window.dispatchEvent(new CustomEvent("ev-live-station"));
  } catch {}
}
function readLiveStation() {
  return _liveStationSnap;
}

/** חותמת סיום רק כשהעמדה כבר לא בטעינה. chargingFullTime באמצע טעינה אינו סיום. */
function liveChargeEndStamp(st, existing, plugMs) {
  if (stationStillCharging(st)) return null;
  const fullMs = toMs(st && st.chargingFullTime);
  if (fullMs && (!plugMs || fullMs >= plugMs)) return toLocalDT(fullMs);
  if (existing && existing.chargeEndedAt && (!plugMs || toMs(existing.chargeEndedAt) >= plugMs)) {
    return existing.chargeEndedAt;
  }
  return null;
}

function clearFinishedIfStillCharging(payload, st) {
  if (!stationStillCharging(st)) return payload;
  return {
    ...payload,
    chargeEndedAt: null,
    endDate: null,
    plugOutAt: null,
    readyToComplete: false,
    wevoEnded: false
  };
}

/** אותה עסקה, גם אם סומנה בטעות כמוכנה לאישור בזמן שהעמדה עדיין טוענת. */
function findLiveTxnOpen(opens, st) {
  const txn = st && st.transactionId != null && String(st.transactionId) !== "" ? String(st.transactionId) : null;
  if (!txn) return findActiveWevoOpen(opens, st);
  const list = (opens || []).filter(o => wevoOpenTxnId(o) === txn);
  return list.find(o => !o.readyToComplete && !o.wevoEnded) || list[0] || null;
}

/** מי מטעין: אותה עסקה, גם אם סומנה בטעות כמוכנה, או הטעינה הפעילה היחידה. */
function openForLiveStation(opens, st, sessions) {
  if (st && stationStillCharging(st)) {
    const live = findChargeStillOnStation(opens, st, sessions);
    if (live) return live;
  }
  if (!st) return findActiveWevoOpen(opens, null);
  const hit = findActiveWevoOpen(opens, st);
  if (hit) return hit;
  if (!stationStillCharging(st) && String(st.state || "") !== "Finishing") return null;
  const active = (opens || []).filter(isActiveWevoOpen);
  return active.length === 1 ? active[0] : null;
}

function wevoStateLabel(state) {
  const map = {
    Available: "רכב לא מחובר",
    Preparing: "מחובר — ממתין לאישור",
    Charging: "בטעינה",
    SuspendedEV: "מושהה (רכב)",
    SuspendedEVSE: "מושהה (מטען)",
    Finishing: "מסיים טעינה",
    Occupied: "תפוס",
    Reserved: "שמור",
    Unavailable: "לא זמין",
    Faulted: "תקלה"
  };
  return map[state] || state || "לא ידוע";
}

/** הסבר קצר למצבים מבלבלים במטען חי */
function wevoStateHint(st) {
  if (!st) return "";
  const s = String(st.state || "");
  const kw = st.rateKw != null ? Number(st.rateKw) : null;
  if (st.isWaitingAllocation) {
    return "ממתין להקצאת הספק בבניין — המהירות עלולה להיות נמוכה.";
  }
  // delayCharge ב-Wevo = הגדרת תזמון/השהיה קיימת, לא בהכרח שהטעינה עצורה עכשיו
  if (st.delayCharge && (s === "SuspendedEVSE" || s === "Preparing") && (kw == null || kw < 0.3)) {
    return "הטעינה מושהית כרגע (תזמון/השהיה ב-Wevo).";
  }
  if (st.waitingAuthorize || s === "Preparing" || s === "Occupied") {
    return "רכב מחובר — ממתין לאישור טעינה במטען.";
  }
  if (s === "SuspendedEV") {
    return "מושהה מצד הרכב (סוללה מלאה / הגבלת רכב).";
  }
  if (s === "SuspendedEVSE") {
    return "מושהה מצד המטען — ניהול עומסים / תעריף / הגבלה.";
  }
  if (s === "Charging" && kw != null && kw > 0 && kw < 1.5) {
    return "מהירות נמוכה — הרכב, הקצאה או השהיה מגבילים הספק כרגע.";
  }
  if (s === "Finishing") {
    return "מסיים טעינה — עוד רגע אפשר לאשר ולשמור.";
  }
  if (s === "Faulted") {
    return "תקלה במטען — כדאי לבדוק גם באפליקציית Wevo.";
  }
  return "";
}

function txnIdFromNotes(notes) {
  const m = String(notes || "").match(/txn#(\d+)/i);
  return m ? m[1] : null;
}

/** מוצא טעינה פתוחה משויכת למטען חי — לא ממזג txn חדש לתוך טעינה ישנה */
function findActiveWevoOpen(opens, stOrTxn) {
  const txn = stOrTxn && typeof stOrTxn === "object"
    ? stOrTxn.transactionId != null ? String(stOrTxn.transactionId) : null
    : stOrTxn != null && stOrTxn !== "" ? String(stOrTxn) : null;
  return findMatchingWevoOpen(opens, txn);
}

/**
 * סוגר טעינות פעילות עם txn שונה מהחי — התראה בלי לחסום פתיחת חדשה.
 * מחזיר כמה נסגרו.
 */
function sealConflictingWevoOpens(opens, liveState, onUpsertOpen, clients, alertedSet, prevState) {
  if (!liveState || typeof onUpsertOpen !== "function") return 0;
  const liveTxn = liveState.transactionId != null ? String(liveState.transactionId) : null;
  let conflicts = listConflictingWevoOpens(opens, liveTxn);
  // חיבור חדש אחרי idle, לפני txn — כל open פעיל עם txn ישן נחשב סתור
  if (!conflicts.length && !liveTxn) {
    const nowFresh =
      !!(liveState.waitingAuthorize || liveState.connected) &&
      String(liveState.state || "") !== "Charging";
    const wasIdle =
      !prevState ||
      (!prevState.connected &&
        !prevState.charging &&
        !prevState.waitingAuthorize &&
        String(prevState.state || "") !== "Charging");
    if (nowFresh && wasIdle) {
      conflicts = (opens || []).filter(o => isActiveWevoOpen(o) && wevoOpenTxnId(o) != null);
    }
  }
  for (const old of conflicts) {
    const endedAt = old.chargeEndedAt || old.endDate || toLocalDT(new Date());
    onUpsertOpen({
      ...old,
      readyToComplete: true,
      wevoEnded: true,
      endDate: old.endDate || endedAt,
      chargeEndedAt: old.chargeEndedAt || endedAt
    }, {
      silent: true
    });
    if (alertedSet && old.id && !alertedSet.has(`seal:${old.id}`)) {
      alertedSet.add(`seal:${old.id}`);
      const cl = (clients || []).find(c => c.id === old.clientId);
      const name = cl && cl.name || "לקוח";
      pushWevoLog("ready", `${name}: טעינה ישנה לא נסגרה — סומנה לאישור (חיבור חדש)`, true);
      appAlert(`יש טעינה שלא נסגרה ל־${name} — אפשר לאשר מהבאנר. נפתחת טעינה חדשה.`, "info", 7000);
    }
  }
  return conflicts.map(o => o.id);
}

function txToEndFields(tx, fallback = {}) {
  const kwh = Number(tx && tx.totalEnergyKwh != null ? tx.totalEnergyKwh : fallback.liveKwh) || 0;
  const cost = tx && tx.totalCost != null
    ? Math.round(Number(tx.totalCost) * 100) / 100
    : fallback.liveWevoCost != null ? Number(fallback.liveWevoCost) : null;
  const elec = tx && tx.electricityCost != null
    ? Math.round(Number(tx.electricityCost) * 100) / 100
    : fallback.liveElecCost != null ? Number(fallback.liveElecCost) : null;
  const tl = resolveChargeTimeline(tx || {}, {
    plugInAt: fallback.startDate || fallback.plugInAt,
    plugOutAt: fallback.plugOutAt,
    chargeEndedAt: fallback.chargeEndedAt || fallback.endDate,
    chargeStartedAt: fallback.chargeStartedAt,
    chargingFullTime: fallback.chargingFullTime || (tx && tx.chargingFullTime),
    netDuration: tx && tx.netDuration != null ? tx.netDuration : fallback.netDuration
  });
  const maxWin = kwh > 0 ? pickMaxBillWindow(kwh, tl) : null;
  const start = maxWin && maxWin.start || tl.plugInAt || fallback.startDate || null;
  const plugOutEnd = tl.plugOutAt || null;
  const end = maxWin && maxWin.end || tl.chargeEndAt || fallback.endDate || plugOutEnd || toLocalDT(new Date());
  const durMins = maxWin && maxWin.mins || (start && end ? minsBetweenLocal(start, end) : tl.billMins) || 0;
  return {
    kwh,
    cost,
    elec,
    end,
    start,
    durMins,
    plugOutEnd,
    chargeEndAt: tl.chargeEndAt || end,
    chargeStartAt: tl.chargeStartAt,
    plugInAt: tl.plugInAt || start,
    plugOutAt: tl.plugOutAt,
    timeline: tl,
    billStartKey: maxWin && maxWin.startKey || "plugIn",
    billEndKey: maxWin && maxWin.endKey || "chargeEnd",
    netMins: tl.netMins,
    avgRateKW: tx && tx.avgRateKW != null ? Number(tx.avgRateKW) : fallback.avgRateKW != null ? Number(fallback.avgRateKW) : null,
    maxRateKW: tx && tx.maxRateKW != null ? Number(tx.maxRateKW) : fallback.maxRateKW != null ? Number(fallback.maxRateKW) : null,
    stopReason: tx && tx.stopReason || fallback.stopReason || null,
    origin: tx && (tx.originStr || tx.origin) || fallback.origin || null,
    didCompleteFull: !!(tx && tx.didCompleteFull),
    isBoost: !!(tx && tx.isBoost),
    chargingCost: tx && tx.chargingCost != null ? Math.round(Number(tx.chargingCost) * 100) / 100 : null
  };
}

/** אם כבר datetime-local — לא לעטוף ב-Date (מונע הזזת שעה) */
function asLocalDT(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    return v.slice(0, 16);
  }
  const d = new Date(typeof v === "number" ? v : v);
  if (isNaN(d.getTime())) return "";
  return toLocalDT(d);
}

/** מוצא עסקת Wevo שהסתיימה עבור טעינה פתוחה */
function matchFinishedWevoTx(transactions, open) {
  return pickFinishedWevoTx(transactions, open);
}

/** שולף מ-Wevo שעת סיום + קוט״ש סופי לטעינה פתוחה */
async function fetchWevoFinalForOpen(open, opts = {}) {
  const retries = opts.retries != null ? opts.retries : 3;
  const gapMs = opts.gapMs != null ? opts.gapMs : 1500;
  let lastFields = null;
  for (let i = 0; i < retries; i++) {
    try {
      const sync = await wevoApi("sync");
      const tx = matchFinishedWevoTx(sync.transactions || [], open);
      if (tx) {
        const fields = txToEndFields(tx, open);
        lastFields = {
          ...fields,
          wevoTxnId: tx.transactionId != null ? String(tx.transactionId) : open.wevoTxnId
        };
        if (fields.kwh > 0 && fields.end) return lastFields;
      }
    } catch (e) {
      if (i === retries - 1 && !lastFields) throw e;
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, gapMs));
  }
  return lastFields;
}

function isSelfClient(c) {
  if (!c) return false;
  if (c.self === true) return true;
  return /עדן/.test(c.name) && (/עצמי/.test(c.name) || /🔒/.test(c.name));
}

function selfClientIds(clients) {
  return new Set((clients || []).filter(isSelfClient).map(c => c.id));
}

/** טעינות לקוחות בלבד — בלי עדן/עצמי (לממוצעים והשוואת רווח עסקי) */
function isNeighborSession(s, selfIds) {
  if (!s) return false;
  if (s.selfPaid) return false;
  if (selfIds && selfIds.has(s.clientId)) return false;
  return true;
}

/** רווח מצטבר מתחילת החודש עד יום D (כולל), ללא טעינות עצמי */
function profitMonthToDay(sessions, clients, y, m, day) {
  const selfIds = selfClientIds(clients);
  return (sessions || []).reduce((a, s) => {
    if (!isNeighborSession(s, selfIds)) return a;
    const d = new Date(s.date);
    if (isNaN(d) || d.getFullYear() !== y || d.getMonth() !== m || d.getDate() > day) return a;
    return a + (Number(s.profit) || 0);
  }, 0);
}

/** עדן (עצמי): רק עלות בפועל, בלי ניפוח / פרימיום / תוספות — יורד באשראי */
function billingForClient(calc, client, {
  adjust = 0,
  actualCost
} = {}) {
  if (!calc) return null;
  if (isSelfClient(client)) {
    const cost = Math.round(Number(actualCost != null ? actualCost : calc.costToOwner) * 100) / 100;
    const kwhRaw = Number(calc.kwhRaw) || 0;
    return {
      ...calc,
      costToOwner: cost,
      kwhInflated: kwhRaw,
      amountBilled: cost,
      profit: 0,
      rate: kwhRaw > 0 ? Math.round(cost / kwhRaw * 1000) / 1000 : 0,
      rateLabel: "אשראי (עלות בפועל)",
      premiumRatio: 0,
      isMixed: false,
      selfPaid: true
    };
  }
  const adj = Number(adjust) || 0;
  const cost = actualCost != null && !isNaN(Number(actualCost))
    ? Math.round(Number(actualCost) * 100) / 100
    : calc.costToOwner;
  const billed = calc.amountBilled + adj;
  return {
    ...calc,
    costToOwner: cost,
    amountBilled: billed,
    profit: Math.round((billed - cost) * 100) / 100
  };
}

/** תצוגה מקדימה מעריכת טעינה — הערכים השמורים, בלי חישוב מחדש */
function previewFromSession(s) {
  if (!s) return null;
  return {
    kwhRaw: Number(s.kwhRaw) || 0,
    kwhInflated: Number(s.kwhInflated) || 0,
    premiumRatio: Number(s.premiumRatio) || 0,
    isMixed: !!s.isMixed,
    rate: Number(s.rate) || 0,
    amountBilled: Number(s.amountBilled) || 0,
    costToOwner: Number(s.costToOwner) || 0,
    profit: Number(s.profit) || 0,
    rateLabel: s.rateLabel || "",
    ownerRate: s.ownerRate,
    selfPaid: !!s.selfPaid
  };
}

function initialEditDuration(session) {
  if (!session) return "";
  if (Number(session.durMin) > 0) return formatDurMins(session.durMin);
  if (session.endDate && session.date) {
    const m = minsBetweenLocal(session.date, session.endDate);
    if (m > 0) return formatDurMins(m);
  }
  return "";
}

function repairSelfSessions(clients, sessions) {
  let changed = false;
  const out = (sessions || []).map(s => {
    const c = (clients || []).find(x => x.id === s.clientId);
    if (!isSelfClient(c)) return s;
    const cost = Math.round(Number(s.costToOwner) * 100) / 100;
    const billed = Math.round(Number(s.amountBilled) * 100) / 100;
    const kwhRaw = Number(s.kwhRaw) || 0;
    if (billed === cost && Number(s.profit) === 0 && s.selfPaid) return s;
    changed = true;
    return {
      ...s,
      kwhInflated: kwhRaw || s.kwhInflated,
      amountBilled: cost,
      profit: 0,
      rate: kwhRaw > 0 ? Math.round(cost / kwhRaw * 1000) / 1000 : s.rate,
      rateLabel: "אשראי (עלות בפועל)",
      premiumRatio: 0,
      isMixed: false,
      selfPaid: true
    };
  });
  return {
    sessions: out,
    changed
  };
}

function findEdenClient(clients) {
  return clients.find(c => isSelfClient(c)) || clients.find(c => /עדן/.test(c.name) && (/עצמי/.test(c.name) || /🔒/.test(c.name))) || clients.find(c => /עדן/.test(c.name));
}

/** פרטי רכב ידועים לשכנים — נמרחים בטעינת נתונים */
function applyKnownClientCars(clients) {
  let changed = false;
  const out = (clients || []).map(c => {
    if (!c || !c.name) return c;
    const patch = knownCarPatchForName(c.name, isSelfClient(c));
    if (!patch) return c;
    const next = {
      carBrand: patch.carBrand || c.carBrand || "",
      carModel: patch.carModel ? patch.carModel : c.carModel || "",
      carPlate: patch.carPlate ? patch.carPlate : c.carPlate || ""
    };
    if (c.carBrand === next.carBrand && (c.carPlate || "") === next.carPlate && (c.carModel || "") === next.carModel) {
      return c;
    }
    changed = true;
    return {
      ...c,
      ...next
    };
  });
  return {
    clients: out,
    changed
  };
}

/* clientBalance/hasDebt/hasCredit/waChargeMessage/waDebtPing: lib/ev-money via inject */

// לדיבוג/בדיקות E2E
try {
  if (typeof window !== "undefined") {
    window.__EV_WA__ = { waChargeMessage, waDebtPing, waLink, openWaDraft, hasDebt, hasCredit };
    window.__EV_MONEY__ = typeof __EV_MONEY__ !== "undefined" ? __EV_MONEY__ : null;
  }
} catch {}

function formatBalanceText(balance, {
  isSelf = false
} = {}) {
  if (isSelf) return "אשראי ✓";
  const bal = Number(balance) || 0;
  if (hasDebt(bal)) return `חוב: ${ils(bal)}`;
  if (hasCredit(bal)) return `יתרת זכות ${ils(Math.abs(bal))}`;
  return "מסולק ✓";
}
function balanceColor(balance, isSelf) {
  if (isSelf) return "#0ea5c6";
  if (hasDebt(balance)) return "#f59e0b";
  if (hasCredit(balance)) return "#059669";
  return "#10b981";
}
function balanceBadgeStyle(balance, isSelf) {
  if (isSelf) {
    return {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      padding: "3px 8px",
      background: "#e0f2fe",
      color: "#0369a1"
    };
  }
  if (hasCredit(balance)) {
    return {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      padding: "3px 8px",
      background: "#d1fae5",
      color: "#047857",
      border: "1px solid #6ee7b7"
    };
  }
  return S.balBadge(hasDebt(balance));
}
function balanceSumLabel(balance, isSelf) {
  if (isSelf) return "סטטוס";
  if (hasCredit(balance)) return "יתרת זכות";
  if (hasDebt(balance)) return "יתרת חוב";
  return "יתרה";
}
function balanceSumVal(balance, isSelf) {
  if (isSelf) return "אשראי ✓";
  if (hasCredit(balance)) return ils(Math.abs(balance));
  return ils(balance);
}

/** ארכיון לקוחות לא פעילים — ברירת מחדל חודש אחד */
const ARCHIVE_INACTIVE_MS = 30 * 24 * 60 * 60 * 1000;

function clientLastActivityMs(clientId, sessions, openSess) {
  let max = 0;
  (sessions || []).forEach(s => {
    if (s.clientId !== clientId) return;
    const t = new Date(s.date).getTime();
    if (t > max) max = t;
  });
  (openSess || []).forEach(o => {
    if (o.clientId !== clientId) return;
    const t = new Date(o.endDate || o.startDate || 0).getTime();
    if (t > max) max = t;
  });
  return max > 0 ? max : null;
}

function isClientArchived(c) {
  return !!(c && c.archived);
}

/** לא פעיל לפי תאריך טעינה אחרונה — עדן אף פעם לא נחשב לא פעיל */
function isClientInactive(c, lastActivityMs, nowMs = Date.now()) {
  if (!c || isSelfClient(c)) return false;
  if (!lastActivityMs) return false; // לקוח חדש בלי טעינות — נשאר ברשימה
  return nowMs - lastActivityMs > ARCHIVE_INACTIVE_MS;
}

/** מוסתר מדשבורד: בארכיון ידני, או לא פעיל אוטומטית — אלא אם שוחזר ידנית (archived: false) */
function hideClientFromDashboard(c, lastActivityMs) {
  if (!c || isSelfClient(c)) return false;
  if (c.archived === true) return true;
  if (c.archived === false) return false; // שוחזר מהארכיון — נשאר גלוי
  return isClientInactive(c, lastActivityMs);
}

function mergeWevoTransactions(clients, sessions, transactions, openSess = []) {
  let clientsOut = [...clients];
  let eden = findEdenClient(clientsOut);
  let edenCreated = false;
  if (!eden) {
    eden = {
      id: uid(),
      name: "עדן (עצמי) 🔒",
      phone: "",
      notes: "אשראי Wevo — ללא חוב",
      self: true
    };
    clientsOut.push(eden);
    edenCreated = true;
  }

  const linked = new Set();
  const wevoIds = new Set();
  const sameChargeWindowMs = 36 * 60 * 60 * 1000;
  sessions.forEach(s => {
    const id = chargeTxnId(s);
    if (!id) return;
    if (s.source === "wevo-sync") wevoIds.add(String(id));
    else linked.add(String(id));
  });

  let added = 0,
    skipped = 0,
    tagged = 0,
    pendingApprove = 0;
  const newSessions = [];
  const openByTxn = {};
  (openSess || []).forEach(o => {
    if (o.wevoTxnId != null) openByTxn[String(o.wevoTxnId)] = o;
    const fromNotes = txnIdFromNotes(o.notes);
    if (fromNotes) openByTxn[fromNotes] = o;
  });
  const closedOpenIds = new Set();
  const openUpdates = {};
  const addWevoRow = tx => {
    const tid = String(tx.transactionId);
    if (wevoIds.has(tid)) return false;
    const rowKwh = Number(tx.totalEnergyKwh) || 0;
    if (!(rowKwh > 0)) return false;
    const rowCost = Math.round(Number(tx.totalCost) * 100) / 100;
    const rowElec = Math.round(Number(tx.electricityCost) * 100) / 100;
    const rowOpen = openByTxn[tid];
    const rowWin = resolveChargeTimeline(tx, {
      chargeEndedAt: rowOpen && rowOpen.chargeEndedAt,
      chargeStartedAt: rowOpen && rowOpen.chargeStartedAt,
      chargingFullTime: rowOpen && rowOpen.chargingFullTime
    });
    const rowMax = rowKwh > 0 ? pickMaxBillWindow(rowKwh, rowWin) : null;
    const rowStart = rowMax && rowMax.start || rowWin.plugInAt || toLocalDT(new Date(tx.plugInTime));
    const rowEnd = rowMax && rowMax.end || rowWin.chargeEndAt || (tx.plugOutTime ? toLocalDT(new Date(tx.plugOutTime)) : rowStart);
    const rowDur = rowMax && rowMax.mins
      ? rowMax.mins
      : rowWin.billMins > 0
        ? rowWin.billMins
        : tx.netDuration > 0
          ? Math.round(Number(tx.netDuration) / 60)
          : tx.plugOutTime && tx.plugInTime
            ? Math.round((tx.plugOutTime - tx.plugInTime) / 60000)
            : 0;
    const rowCalc = calcSession(rowKwh, rowStart, rowEnd);
    newSessions.push({
      id: uid(),
      clientId: eden.id,
      date: rowStart,
      kwhRaw: rowKwh,
      kwhInflated: rowCalc.kwhInflated,
      premiumRatio: rowCalc.premiumRatio,
      isMixed: rowCalc.isMixed,
      rate: rowCalc.rate,
      amountBilled: rowCost,
      costToOwner: rowCost,
      profit: 0,
      rateLabel: rowCalc.rateLabel,
      source: "wevo-sync",
      notes: `txn#${tid}`,
      durMin: rowDur,
      electricityCost: rowElec,
      avgRateKW: tx.avgRateKW != null ? Number(tx.avgRateKW) : null,
      maxRateKW: tx.maxRateKW != null ? Number(tx.maxRateKW) : null,
      stopReason: tx.stopReason || null,
      wevoOrigin: tx.originStr || tx.origin || null,
      didCompleteFull: !!tx.didCompleteFull,
      isBoost: !!tx.isBoost,
      chargingCost: tx.chargingCost != null ? Math.round(Number(tx.chargingCost) * 100) / 100 : null
    });
    wevoIds.add(tid);
    added++;
    return true;
  };

  const sessionsOut = sessions.map(s => {
    if (chargeTxnId(s)) return s;
    const d = new Date(s.date);
    const kwh = Number(s.kwhRaw) || 0;
    const tx = (transactions || []).find(t => {
      if (!t || t.isOngoing || linked.has(String(t.transactionId))) return false;
      const plugIn = new Date(t.plugInTime);
      const dtMin = Math.abs(d - plugIn) / 60000;
      const dk = Math.abs((Number(t.totalEnergyKwh) || 0) - kwh);
      if (dtMin <= 20 && dk <= 0.15) return true;
      const cost = Math.round(Number(t.totalCost) * 100) / 100;
      const sc = Number(s.costToOwner);
      const dtMs = Math.abs(d - plugIn);
      return kwh > 0 && dk <= 0.05 && Number.isFinite(sc) && Math.abs(cost - sc) <= 0.05 && dtMs <= sameChargeWindowMs;
    });
    if (!tx) return s;
    linked.add(String(tx.transactionId));
    tagged++;
    const tag = `txn#${tx.transactionId}`;
    const notes = s.notes ? `${s.notes} | ${tag}` : tag;
    const cost = Math.round(Number(tx.totalCost) * 100) / 100;
    return {
      ...s,
      notes,
      wevoTxnId: String(tx.transactionId),
      costToOwner: cost || s.costToOwner,
      profit: Math.round((s.amountBilled - (cost || s.costToOwner)) * 100) / 100
    };
  });

  for (const tx of transactions || []) {
    if (!tx || tx.isOngoing) {
      skipped++;
      continue;
    }
    const tid = String(tx.transactionId);
    if (linked.has(tid)) {
      if (openByTxn[tid]) closedOpenIds.add(openByTxn[tid].id);
      if (!addWevoRow(tx)) skipped++;
      continue;
    }
    const openMatch = openByTxn[tid];
    const kwh = Number(tx.totalEnergyKwh) || 0;
    const cost = Math.round(Number(tx.totalCost) * 100) / 100;
    const elec = Math.round(Number(tx.electricityCost) * 100) / 100;
    const win = resolveChargeTimeline(tx, {
      chargeEndedAt: openMatch && openMatch.chargeEndedAt,
      chargeStartedAt: openMatch && openMatch.chargeStartedAt,
      chargingFullTime: openMatch && openMatch.chargingFullTime
    });
    const maxWin = kwh > 0 ? pickMaxBillWindow(kwh, win) : null;
    const start = maxWin && maxWin.start || win.plugInAt || toLocalDT(new Date(tx.plugInTime));
    const end = maxWin && maxWin.end || win.chargeEndAt || (tx.plugOutTime ? toLocalDT(new Date(tx.plugOutTime)) : start);
    const durMin = maxWin && maxWin.mins
      ? maxWin.mins
      : win.billMins > 0
        ? win.billMins
        : tx.netDuration > 0
          ? Math.round(Number(tx.netDuration) / 60)
          : tx.plugOutTime && tx.plugInTime
            ? Math.round((tx.plugOutTime - tx.plugInTime) / 60000)
            : 0;

    // טעינה ששויכה ללקוח — ממלאים סיום+קוט״ש וממתינים לאישור ידני (גם אם הקוט״ש עוד 0 זמנית)
    if (openMatch && openMatch.clientId) {
      const kwhUse = kwh > 0 ? kwh : Number(openMatch.liveKwh) || 0;
      const calc = maxWin && kwhUse > 0 ? maxWin.calc : calcSession(Math.max(kwhUse, 0.001), start, end);
      const cl = clientsOut.find(x => x.id === openMatch.clientId);
      const billedCalc = billingForClient(calc, cl, {
        actualCost: cost
      }) || calc;
      openUpdates[openMatch.id] = {
        liveKwh: kwhUse > 0 ? kwhUse : openMatch.liveKwh != null ? openMatch.liveKwh : kwh,
        liveWevoCost: cost || openMatch.liveWevoCost,
        liveElecCost: elec || openMatch.liveElecCost,
        endDate: end,
        startDate: openMatch.startDate || start,
        plugInAt: openMatch.plugInAt || win.plugInAt || start,
        chargeStartedAt: win.chargeStartAt || openMatch.chargeStartedAt || null,
        chargeEndedAt: win.chargeEndAt || end,
        plugOutAt: win.plugOutAt || openMatch.plugOutAt || null,
        billStartKey: maxWin && maxWin.startKey || "plugIn",
        billEndKey: maxWin && maxWin.endKey || (win.chargeEndAt ? "chargeEnd" : "plugOut"),
        netDuration: tx.netDuration != null ? Number(tx.netDuration) : openMatch.netDuration,
        wevoTxnId: tid,
        readyToComplete: true,
        wevoEnded: true,
        liveBilled: isSelfClient(cl) ? null : kwhUse > 0 ? billedCalc.amountBilled : openMatch.liveBilled,
        liveRate: kwhUse > 0 ? billedCalc.rate : openMatch.liveRate,
        liveRateLabel: kwhUse > 0 ? billedCalc.rateLabel : openMatch.liveRateLabel,
        liveProfit: isSelfClient(cl) ? 0 : kwhUse > 0 ? billedCalc.profit : openMatch.liveProfit,
        notes: openMatch.notes && String(openMatch.notes).includes(`txn#${tid}`)
          ? openMatch.notes
          : openMatch.notes
            ? `${openMatch.notes} | txn#${tid}`
            : `txn#${tid}`
      };
      linked.add(tid);
      pendingApprove++;
      addWevoRow(tx);
      continue;
    }

    if (kwh <= 0) {
      skipped++;
      continue;
    }
    const plugMs = Number(tx.plugInTime) || new Date(tx.plugInTime).getTime() || 0;
    const alreadySaved = sessionsOut.some(s => {
      if (s.source === "wevo-sync") return false;
      if (chargeTxnId(s) === tid) return true;
      if (!savedSessionMatchesCharge(s, {
        transactionId: tid,
        kwhRaw: kwh,
        costToOwner: cost,
        plugInTime: plugMs || null
      })) return false;
      const sessionMs = new Date(s.date).getTime();
      if (!Number.isFinite(sessionMs) || !plugMs) return true;
      return Math.abs(plugMs - sessionMs) <= sameChargeWindowMs;
    });
    if (alreadySaved) {
      linked.add(tid);
      if (openByTxn[tid]) closedOpenIds.add(openByTxn[tid].id);
      if (!addWevoRow(tx)) skipped++;
      continue;
    }
    if (!addWevoRow(tx)) skipped++;
  }

  const sessionsMerged = dedupeSessionsByTxn([...newSessions, ...sessionsOut]);
  const openOut = dropOpensAlreadySaved((openSess || []).map(o => openUpdates[o.id] ? {
    ...o,
    ...openUpdates[o.id]
  } : o).filter(o => !closedOpenIds.has(o.id)), sessionsMerged);

  return {
    clients: clientsOut,
    sessions: sessionsMerged,
    openSess: openOut,
    added,
    skipped,
    tagged,
    closedOpen: closedOpenIds.size,
    pendingApprove,
    edenCreated,
    fetched: (transactions || []).length
  };
}

