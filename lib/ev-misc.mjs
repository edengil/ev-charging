/**
 * ev-money/misc — כל השאר: ניתוב לחיצות עדכון, זיהוי רכב בעמדה,
 * סנאפשוט ענן, שעות ידניות, טעינות לא מקוטלגות והודעות וואטסאפ.
 */
import { localDtMs } from "./ev-money-core.mjs";
import { dropOpensAlreadySaved, shouldDiscardOpen, savedSessionMatchesCharge, stationStillCharging } from "./ev-opens.mjs";
import { hasDebt, hasCredit } from "./ev-payments.mjs";

/**
 * מונע העלאת סנאפשוט ריק שמוחק נתונים קיימים (מרוץ refs / טעינה חלקית).
 * lastUploadedCounts: { payments, sessions, clients } מהעלאה מוצלחת אחרונה.
 */
export function isDangerousEmptyCloudSnap(snap, lastUploadedCounts) {
  if (!lastUploadedCounts) return false;
  const pc = (snap && snap.payments || []).length;
  const sc = (snap && snap.sessions || []).length;
  const cc = (snap && snap.clients || []).length;
  if (lastUploadedCounts.payments > 0 && pc === 0) return true;
  if (lastUploadedCounts.sessions > 0 && sc === 0) return true;
  if (lastUploadedCounts.clients > 0 && cc === 0) return true;
  return false;
}

/** מצבי עמדה שבהם באמת יש רכב — לא התחברות משתמש ולא עסקה ישנה. */
const VEHICLE_PRESENT_STATES = ["Preparing", "Charging", "SuspendedEV", "SuspendedEVSE", "Finishing", "Occupied", "Reserved"];

function openReadyStamp(o) {
  const t = new Date(o && (o.chargeEndedAt || o.endDate || o.updatedAt || o.startDate) || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * לאן לחיצה על עדכון צריכה לפתוח.
 * טעינה שנגמרה: כרטיס האישור אם הוא עדיין פתוח.
 * אם נסגר: כרטיס אישור אחר שעדיין פתוח, או כלום. לא כרטיס ישן שכבר נשמר.
 */
export function routeNotifyClick(tag, opens, sessions) {
  const t = String(tag || "");
  const fresh = dropOpensAlreadySaved(opens, sessions);
  if (t.startsWith("ev-end-")) {
    const id = t.slice("ev-end-".length);
    const ready = fresh.filter(o => o && (o.readyToComplete || o.wevoEnded));
    const tagged = ready.find(o => String(o.id) === id);
    const latest = ready.slice().sort((a, b) => openReadyStamp(b) - openReadyStamp(a))[0];
    const pick = tagged || latest;
    if (!pick) return null;
    return { view: "complete", openId: pick.id, clientId: pick.clientId || null };
  }
  if (t === "ev-connect" || t.startsWith("ev-connect-") || t === "ev-preauth-fail") {
    return { view: "dash", openId: null, clientId: null };
  }
  return null;
}

/**
 * תצוגה להיסטוריית החיוב המצוירת בלבד.
 * השקלים השלמים של החיוב ללקוח, והאגורות של חיוב וויבו הרשמי.
 * לא משנה סכום שמור, חוב, או היסטוריית וויבו.
 */
export function fictionalBilledDisplay(billed, wevo) {
  const billedN = Number(billed);
  const roundedBilled = Number.isFinite(billedN) ? Math.round(billedN * 100) / 100 : 0;
  const whole = Math.trunc(roundedBilled);
  const wevoN = Number(wevo);
  const fracCents = Number.isFinite(wevoN) ? Math.round(Math.abs(wevoN) * 100) % 100 : 0;
  const sign = whole < 0 ? -1 : 1;
  return Math.round((whole + sign * (fracCents / 100)) * 100) / 100;
}

/**
 * יש רכב פיזית בעמדה.
 * התחברות לחשבון, או עסקה שכבר נשמרה ועדיין מסומנת כפתוחה ב-Wevo, אינם רכב.
 */
/**
 * ממתין לאישור: יש רכב בעמדה, לא טוען כרגע, לא מסיים — Preparing/Occupied/
 * Reserved או דגל waitingAuthorize.
 * M15 (ביקורת 30.10): מקור אחד — בעבר היו עותקים זהים בפאנל וב־wevo-live-sync.
 */
export function isWaitingForAuthorize(st, sessions) {
  if (!st || stationStillCharging(st)) return false;
  if (!chargerReportsVehicle(st, sessions)) return false;
  const s = String(st.state || "");
  if (s === "Finishing") return false;
  return s === "Preparing" || s === "Occupied" || s === "Reserved" || !!st.waitingAuthorize;
}

export function chargerReportsVehicle(st, sessions) {
  if (!st) return false;
  const s = String(st.state || "");
  if (!VEHICLE_PRESENT_STATES.includes(s)) return false;
  const kw = st.rateKw != null ? Number(st.rateKw) : 0;
  const charging = stationStillCharging(st);
  if (charging && kw > 0.5) return true;
  if (sessions && sessions.length) {
    const echo = {
      wevoTxnId: st.transactionId != null ? String(st.transactionId) : null,
      transactionId: st.transactionId,
      liveKwh: st.totalEnergyKwh,
      liveWevoCost: st.totalCost,
      plugInTime: st.plugInTime
    };
    if (shouldDiscardOpen({ ...echo, readyToComplete: true, liveKw: kw }, sessions)) return false;
  }
  return true;
}

/** בניית סנאפשוט ענן ממטמון כתיבות — לא מ־React refs ישנים */
export function buildCloudSnapFromParts(cache = {}, fromHook = null, configFallback = null) {
  const cfg =
    cache.config !== undefined
      ? cache.config
      : fromHook && fromHook.config != null
        ? fromHook.config
        : configFallback;
  return {
    clients: cache.clients != null ? cache.clients : (fromHook && fromHook.clients) || [],
    sessions: cache.sessions != null ? cache.sessions : (fromHook && fromHook.sessions) || [],
    payments: cache.payments != null ? cache.payments : (fromHook && fromHook.payments) || [],
    openSess: cache.openSess != null ? cache.openSess : (fromHook && fromHook.openSess) || [],
    archivedUncat: cache.archivedUncat != null ? cache.archivedUncat : (fromHook && fromHook.archivedUncat) || [],
    config: cfg
  };
}

/* ── שעות ידניות וטעינות לא מקוטלגות ─────────────────────────────── */

/**
 * פענוח שעה ידנית בפורמט HH:MM (כולל ":" מהמקלדת).
 * מחזיר {h, m} או null כשהפורמט לא תקין.
 */
export function parseManualTimeHHMM(str) {
  if (str == null) return null;
  const m = String(str).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/**
 * שילוב תאריך (datetime-local / Date / ms) עם שעה ידנית HH:MM.
 * מחזיר "YYYY-MM-DDTHH:MM" מקומי, או "" כשאין תאריך/שעה תקינים.
 */
export function combineDateWithTime(dateStr, hhmm) {
  const parsed = parseManualTimeHHMM(hhmm);
  if (!parsed) return "";
  const ms = localDtMs(dateStr);
  if (ms == null) return "";
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(parsed.h)}:${pad(parsed.m)}`;
}

/**
 * שעת סיום ידנית: תאריך מתוך שעת ההתחלה + HH:MM.
 * אם הסיום יוצא לפני/בזמן ההתחלה — גולל קדימה ביממות (טעינת לילה).
 * מחזיר "YYYY-MM-DDTHH:MM" מקומי, או "" כשאין קלט תקין.
 */
export function manualEndDateTime(startDtStr, hhmm) {
  const parsed = parseManualTimeHHMM(hhmm);
  if (!parsed) return "";
  let dt = combineDateWithTime(startDtStr, hhmm) || combineDateWithTime(Date.now(), hhmm);
  if (!dt) return "";
  const startMs = localDtMs(startDtStr);
  let endMs = localDtMs(dt);
  if (startMs != null && endMs != null) {
    let guard = 0;
    while (endMs <= startMs && guard++ < 3) endMs += 24 * 60 * 60 * 1000;
  }
  const d = new Date(endMs);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** חותמת הזמן של עסקת Wevo — חיבור הכבל, ואם אין אז סיום הטעינה. */
export function wevoTxTimeMs(tx) {
  if (!tx) return 0;
  return localDtMs(tx.plugInTime) || localDtMs(tx.chargingFullTime) || 0;
}

/** מפתח יציב לשורת טעינה לא מקוטלגת — לארכוב ולזיהוי בשחזור. */
export function uncataloguedTxKey(tx) {
  if (!tx) return "";
  return tx.transactionId != null && String(tx.transactionId) !== ""
    ? String(tx.transactionId)
    : "tx-" + wevoTxTimeMs(tx);
}

/** תחילת חלון "טעינות לא מקוטלגו" — 28.09.2026 בחצות מקומית. */
export const UNCATALOGUED_SINCE_MS = new Date(2026, 8, 28).getTime();

/**
 * עסקת Wevo סגורה/סופית — יש חותמת סיום טעינה או ניתוק כבל.
 * טעינה שעדיין מתקיימת (אין שום חותמת סיום) אינה סופית ולא מופיעה
 * ברשימת "טעינות לא מקוטלגות".
 */
export function wevoTxIsClosed(tx) {
  if (!tx) return false;
  return !!(tx.chargingFullTime || tx.chargeEndedAt || tx.plugOutTime);
}

/**
 * טעינות Wevo שעוד לא קוטלגו ללקוח: מההיסטוריה, החל מ-sinceMs,
 * כל עסקה שאין לה טעינה אמיתית תואמת באפליקציה (שורות מראה wevo-sync לא נחשבות קיטלוג).
 * התאמה = אותו txn, או קוט"ש דומה (±0.05) + סכום דומה (±0.05) + חפיפת זמנים (36 שעות).
 * מוצגות רק עסקאות סגורות — טעינה שעדיין מתקיימת אינה סופית.
 * עסקה שיש לה טעינה פתוחה תואמת מוסתרת מהשיוך עד שהפתוחה נסגרת או נמחקת.
 */
export function findUncataloguedCharges(transactions, sessions, sinceMs = UNCATALOGUED_SINCE_MS, opens = []) {
  const real = (sessions || []).filter(s => s && s.source !== "wevo-sync");
  const openList = opens || [];
  return (transactions || []).filter(tx => {
    if (!tx) return false;
    if (!(wevoTxTimeMs(tx) >= sinceMs)) return false;
    if (!(Number(tx.totalEnergyKwh) > 0)) return false;
    if (!wevoTxIsClosed(tx)) return false;
    if (real.some(s => savedSessionMatchesCharge(s, tx))) return false;
    if (openList.some(o => o && savedSessionMatchesCharge(o, tx))) return false;
    return true;
  });
}

/**
 * רשומת ארכיון לטעינה ששויכה מ-Wevo ללקוח: נשמרת בארכיון בנוסף
 * לטעינה עצמה שנשמרת בכרטיס הלקוח. רשומת מעקב בלבד — לא ניתנת לשיוך חוזר.
 */
export function assignedChargeArchiveEntry(tx, clientId, clientName) {
  const tid = tx && tx.transactionId != null && String(tx.transactionId) !== "" ? String(tx.transactionId) : null;
  return {
    key: `assigned:${tid || "no-txn"}:${Date.now()}`,
    transactionId: tid,
    plugInTime: (tx && (tx.plugInTime || tx.plugInAt || tx.startDate)) || null,
    kwh: tx && tx.totalEnergyKwh != null ? Number(tx.totalEnergyKwh) : null,
    cost: tx && tx.totalCost != null ? Number(tx.totalCost) : null,
    archivedAt: new Date().toISOString(),
    assignedTo: clientId != null ? String(clientId) : null,
    assignedName: clientName || null
  };
}

/**
 * ממפה עסקת Wevo לרשומת "טעינה פתוחה" כדי לפתוח אותה בכרטיס הסיום
 * עם כל אפשרויות השעה והחיוב המלא. המזהה (id) נקבע בחוץ.
 */
export function wevoTxToOpenSession(tx, clientId) {
  const tid = tx && tx.transactionId != null && String(tx.transactionId) !== "" ? String(tx.transactionId) : null;
  const end = tx
    ? tx.chargingFullTime != null
      ? tx.chargingFullTime
      : tx.chargeEndedAt != null
        ? tx.chargeEndedAt
        : null
    : null;
  return {
    clientId: clientId || null,
    source: "wevo-live",
    wevoTxnId: tid,
    startDate: tx ? tx.plugInTime : null,
    plugInAt: tx ? tx.plugInTime : null,
    chargeStartedAt: null,
    chargeEndedAt: end,
    endDate: end,
    plugOutAt: tx && tx.plugOutTime != null ? tx.plugOutTime : null,
    liveKwh: tx && tx.totalEnergyKwh != null ? Number(tx.totalEnergyKwh) : null,
    liveWevoCost: tx && tx.totalCost != null ? Math.round(Number(tx.totalCost) * 100) / 100 : null,
    liveElecCost: tx && tx.electricityCost != null ? Math.round(Number(tx.electricityCost) * 100) / 100 : null,
    readyToComplete: true,
    wevoEnded: true,
    notes: tid ? "txn#" + tid : ""
  };
}

/**
 * הודעת וואטסאפ אחרי טעינה — לפי חוב / יתרת זכות / מסולק.
 * כשהיתרה כולה היא הטעינה הנוכחית (אין חוב קודם — למשל טעינה ראשונה),
 * לא חוזרים על הסכום פעמיים.
 */
export function waChargeMessage(amountBilled, balance, { isSelf = false } = {}) {
  const charge = Math.round(Number(amountBilled) || 0);
  if (isSelf) return `היי מה קורה?\nיצא לך ${charge}`;
  const bal = Number(balance) || 0;
  if (hasDebt(bal) && Math.round(bal) !== charge) {
    return `היי מה קורה?\nיצא בטעינה ${charge}\nאנחנו על ${Math.round(bal)}`;
  }
  if (hasCredit(bal)) {
    return `היי מה קורה?\nיצא לך ${charge}\nיש לך אצלי ${Math.round(Math.abs(bal))}`;
  }
  return `היי מה קורה?\nיצא לך ${charge}`;
}

/** תזכורת חוב בלי להיכנס לכרטיס — עם סכום הטעינה האחרונה אם יש */
export function waDebtPing(balance, lastAmount) {
  const bal = Math.round(Number(balance) || 0);
  const charge = Math.round(Number(lastAmount) || 0);
  if (charge > 0) return waChargeMessage(charge, bal);
  return `היי מה קורה?\nאנחנו על ${bal}`;
}
