/**
 * ev-money/opens — מחזור־החיים של טעינות פתוחות ומעקב תחנה חיה:
 * התאמת open למצב חי, סגירת טעינות תקועות, ותיקון רשומות פתוחות.
 */
import { localDtMs, chargeKwh, chargeMoney, chargeTimesNear } from "./ev-money-core.mjs";

/** מזהה txn מטעינה פתוחה (שדה או הערות). */
export function wevoOpenTxnId(o) {
  if (!o) return null;
  if (o.wevoTxnId != null && String(o.wevoTxnId) !== "") return String(o.wevoTxnId);
  const m = String(o.notes || "").match(/txn#(\d+)/i);
  return m ? m[1] : null;
}

export function isActiveWevoOpen(o) {
  return !!(
    o &&
    !o.readyToComplete &&
    !o.wevoEnded &&
    (o.source === "wevo-live" || o.wevoTxnId != null || /wevo/i.test(String(o.notes || "")))
  );
}

/**
 * התאמת טעינה פתוחה למצב חי.
 * txn חי שונה מ־open פעיל = אין התאמה (לא ממשיכים טעינה ישנה).
 */
export function findMatchingWevoOpen(opens, liveTxn) {
  const list = (opens || []).filter(isActiveWevoOpen);
  const txn = liveTxn != null && liveTxn !== "" ? String(liveTxn) : null;
  if (txn) {
    const exact = list.find(o => wevoOpenTxnId(o) === txn);
    if (exact) return exact;
    // orphan בלי txn — אותו חיבור לפני שנרשם מזהה
    return list.find(o => wevoOpenTxnId(o) == null) || null;
  }
  const orphans = list.filter(o => wevoOpenTxnId(o) == null);
  if (orphans.length === 1) return orphans[0];
  if (list.length === 1 && wevoOpenTxnId(list[0]) == null) return list[0];
  return null;
}

/** סיום שקודם לחיבור הכבל הוא שאריות מעסקה קודמת — לא להציג ולא לשמור. */
export function validChargeEndMs(open) {
  if (!open) return null;
  const plug = localDtMs(open.plugInAt || open.startDate);
  const end = localDtMs(open.chargeEndedAt || open.endDate);
  if (!end) return null;
  if (plug && end < plug) return null;
  return end;
}

/** הטעינה נגמרה לפי חותמת סיום, גם אם readyToComplete לא עודכן. */
export function wevoOpenLooksFinished(open, nowMs = Date.now(), graceMs = 3 * 60 * 1000) {
  if (!open) return false;
  if (open.readyToComplete) return true;
  const end = validChargeEndMs(open);
  if (!end) return false;
  return nowMs - end >= graceMs;
}

/**
 * מטען כבר לא בטעינה הזו — לסגור כמוכן לאישור.
 * לא סוגר טעינה צעירה בלי שעת סיום (הבהוב קצר של מצב פנוי).
 */
export function shouldCloseStaleWevoOpen(open, opts = {}) {
  if (!open || open.readyToComplete) return false;
  const now = opts.nowMs != null ? opts.nowMs : Date.now();
  if (wevoOpenLooksFinished(open, now)) return true;
  if (!opts.nowIdle) return false;
  const start = localDtMs(open.plugInAt || open.startDate);
  return !!(start && now - start > 3 * 60 * 1000);
}

/**
 * כפתור הפעלת התראות. מי שכבר אישר, או שסומן כפעיל, לא רואה אותו.
 * הרשאה שנשמרה לפני העדכון (granted) מספיקה, בלי לחיצה נוספת.
 */
export function shouldShowNotifyEnable(permission, storedOn) {
  if (storedOn === true || storedOn === "1" || storedOn === 1) return false;
  return permission === "default";
}

/** לוג Wevo שחזר עם עסקה סגורה ואנרגיה. כשל טעינה או רשימה ריקה אינם סיום. */
export function finalWevoFetchCanClose(fetched) {
  if (!fetched || typeof fetched !== "object") return false;
  const kwh = Number(fetched.kwh);
  return kwh > 0 && !!(fetched.end || fetched.chargeEndAt);
}

/** העמדה עדיין מזרימה — לא Finishing ולא חותמת סיום ישנה. */
export function stationStillCharging(st) {
  if (!st) return false;
  const s = String(st.state || "");
  return s === "Charging" || s === "SuspendedEV" || s === "SuspendedEVSE";
}

const STATION_SAMPLE_STATES = ["Available", "Preparing", "Charging", "SuspendedEV", "SuspendedEVSE", "Finishing", "Occupied", "Reserved", "Unavailable", "Faulted"];

/** הודעת עמדה אמיתית. Unknown, ריק, או אישור בלי state אינם דגימה. */
export function isUsableStationSample(st) {
  if (!st || typeof st !== "object") return false;
  return STATION_SAMPLE_STATES.includes(String(st.state || ""));
}

/**
 * דגימה חסרה לא מוחקת טעינה שכבר על המסך.
 * Available, Finishing ושאר מצבי עמדה אמיתיים מחליפים את הקודם.
 */
export function holdLiveStation(prev, next) {
  if (isUsableStationSample(next)) return next;
  if (isUsableStationSample(prev)) return prev;
  return next || null;
}

function openTiedToLiveStation(open, liveState) {
  if (!open || !liveState) return false;
  const liveTxn = liveState.transactionId != null && String(liveState.transactionId) !== ""
    ? String(liveState.transactionId)
    : null;
  const openTxn = wevoOpenTxnId(open);
  return !!(liveTxn && openTxn && liveTxn === openTxn);
}

function plugTimesOverlap(a, b, windowMs = 30 * 60 * 1000) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= windowMs;
}

/**
 * הרשומה הזו היא הטעינה שהעמדה עדיין מריצה.
 * txn זהה, או אותו חיבור כשהקוט״ש החי כבר עבר את המספר שהוקפא בסגירה כוזבת.
 */
export function openFollowsLiveCharge(open, liveState) {
  if (!open || !stationStillCharging(liveState) || open.source === "wevo-sync") return false;
  if (openTiedToLiveStation(open, liveState)) return true;
  const liveTxn = liveState.transactionId != null && String(liveState.transactionId) !== ""
    ? String(liveState.transactionId)
    : null;
  const openTxn = wevoOpenTxnId(open);
  const plugMs = localDtMs(liveState.plugInTime);
  const openPlug = localDtMs(open.plugInAt || open.startDate);
  const liveKwh = Number(liveState.totalEnergyKwh);
  const frozen = Number(open.liveKwh);
  const grew = Number.isFinite(liveKwh) && Number.isFinite(frozen) && liveKwh > frozen + 0.2;
  if (liveTxn && openTxn && liveTxn !== openTxn) {
    return !!(plugTimesOverlap(plugMs, openPlug) && grew);
  }
  if (plugMs && openPlug && plugTimesOverlap(plugMs, openPlug)) return true;
  if (!openTxn) return !(open.readyToComplete || open.wevoEnded);
  return false;
}

/**
 * מצב תצוגה: טעינה פעילה, נגמרה והכבל עוד מחובר, או שהכבל נותק.
 * אם יש מצב עמדה חי לאותה עסקה — הוא הקובע, לא חותמת סיום שנשמרה באמצע טעינה.
 */
export function openChargeStatus(open, liveState) {
  if (!open) return { kind: "idle", text: "" };
  const tied = openFollowsLiveCharge(open, liveState);
  if (tied && stationStillCharging(liveState)) {
    const kw = liveState.rateKw != null ? Number(liveState.rateKw) : open.liveKw != null ? Number(open.liveKw) : null;
    if (kw != null && kw > 0 && kw < 1.5) {
      return { kind: "slow", text: "⏳ בטעינה · מהירות נמוכה · הכבל מחובר" };
    }
    return { kind: "live", text: "⏳ בטעינה פעילה · הכבל מחובר" };
  }
  const stationFinished = openTiedToLiveStation(open, liveState) && String(liveState && liveState.state || "") === "Finishing";
  const end = validChargeEndMs(open);
  const plugOut = localDtMs(open.plugOutAt);
  const ended = stationFinished || !!(end || open.readyToComplete || open.wevoEnded);
  const unplugged = !!(plugOut && (!end || plugOut + 60 * 1000 >= end));
  if (ended && unplugged) return { kind: "unplugged", text: "✓ הכבל נותק — מוכן לאישור" };
  if (ended) return { kind: "cable", text: "⏹ הטעינה נגמרה · הכבל עדיין מחובר" };
  const kw = open.liveKw != null ? Number(open.liveKw) : null;
  if (kw != null && kw > 0 && kw < 1.5) {
    return { kind: "slow", text: "⏳ בטעינה · מהירות נמוכה · הכבל מחובר" };
  }
  return { kind: "live", text: "⏳ בטעינה פעילה · הכבל מחובר" };
}

/** מתקן סיום לפני חיבור, ומסמן טעינה שנגמרה כמוכנה לאישור.
 * אם העמדה עדיין טוענת את אותה טעינה — מוחקים סיום כוזב.
 * אין דגימת עמדה חיה (האפליקציה נטענה לפני הסקר הראשון) — לא סוגרים טעינה
 * על סמך חותמת סיום ספקולטיבית (למשל הבהוב Finishing באמצע טעינה).
 * הסקר החי יסגור אותה עם נתוני Wevo אמיתיים אם באמת נגמרה.
 */
export function repairWevoOpenRecord(open, nowMs = Date.now(), liveState = null) {
  if (!open) return open;
  const plug = localDtMs(open.plugInAt || open.startDate);
  const dropEnd = !!(plug && localDtMs(open.chargeEndedAt) != null && localDtMs(open.chargeEndedAt) < plug);
  const dropEndDate = !!(plug && localDtMs(open.endDate) != null && localDtMs(open.endDate) < plug);
  const base = dropEnd || dropEndDate
    ? {
      ...open,
      chargeEndedAt: dropEnd ? null : open.chargeEndedAt,
      endDate: dropEndDate ? null : open.endDate
    }
    : open;
  if (openFollowsLiveCharge(base, liveState)) {
    return {
      ...base,
      chargeEndedAt: null,
      endDate: null,
      plugOutAt: null,
      readyToComplete: false,
      wevoEnded: false
    };
  }
  const stationKnown = liveState != null && typeof liveState === "object";
  const shouldReady = !base.readyToComplete && stationKnown && wevoOpenLooksFinished(base, nowMs);
  if (!dropEnd && !dropEndDate && !shouldReady) return open;
  return {
    ...base,
    readyToComplete: shouldReady ? true : !!base.readyToComplete,
    wevoEnded: shouldReady ? true : !!base.wevoEnded,
    liveKw: shouldReady ? 0 : base.liveKw
  };
}

export function chargeTxnId(row) {
  if (!row) return null;
  const fromOpen = wevoOpenTxnId(row);
  if (fromOpen) return fromOpen;
  if (row.transactionId != null && String(row.transactionId) !== "") return String(row.transactionId);
  return null;
}

/**
 * אותה טעינה: אותו txn, או אותו קוט״ש ואותו סכום בחלון זמן קרוב (אזור זמן / ייבוא מחדש).
 */
export function savedSessionMatchesCharge(session, charge) {
  if (!session || !charge) return false;
  const a = chargeTxnId(session);
  const b = chargeTxnId(charge);
  if (a && b) return a === b;
  const sk = chargeKwh(session);
  const ck = chargeKwh(charge);
  const sc = chargeMoney(session);
  const cc = chargeMoney(charge);
  if (sk == null || ck == null || sc == null || cc == null) return false;
  if (sk <= 0 || ck <= 0) return false;
  if (Math.abs(sk - ck) > 0.05 || Math.abs(sc - cc) > 0.05) return false;
  return chargeTimesNear(session, charge);
}

export function openIsFinishedPending(open) {
  if (!open) return false;
  if (open.readyToComplete || open.wevoEnded) return true;
  const kw = open.liveKw != null ? Number(open.liveKw) : 0;
  const ended = !!(open.chargeEndedAt || open.endDate || open.plugOutAt);
  return ended && !(kw > 0.5);
}

/** טעינה שכבר נשמרה לא חוזרת כממתינה לאישור. טעינה חיה עם הספק לא נזרקת בלי txn זהה. */
export function shouldDiscardOpen(open, sessions) {
  if (!open) return false;
  const matches = (sessions || []).filter(s => s && s.source !== "wevo-sync" && savedSessionMatchesCharge(s, open));
  if (!matches.length) return false;
  const txn = chargeTxnId(open);
  if (txn && matches.some(s => chargeTxnId(s) === txn)) return true;
  if (openIsFinishedPending(open)) return true;
  const kw = open.liveKw != null ? Number(open.liveKw) : 0;
  return !(kw > 0.5);
}

export function dropOpensAlreadySaved(opens, sessions) {
  return (opens || []).filter(o => o && !shouldDiscardOpen(o, sessions));
}

function isWevoLiveOpen(o) {
  return !!(o && (o.source === "wevo-live" || o.wevoTxnId != null || /wevo/i.test(String(o.notes || ""))));
}

/**
 * הטעינה שהעמדה מריצה עכשיו, גם אם סומנה בטעות כמוכנה לאישור.
 * טעינה שכבר נשמרה לא חוזרת. txn אחר בלי אותו חיבור אינו אותה טעינה.
 */
export function findChargeStillOnStation(opens, liveState, sessions) {
  if (!stationStillCharging(liveState)) return null;
  const candidates = (opens || []).filter(o => {
    if (!isWevoLiveOpen(o) || o.source === "wevo-sync") return false;
    if (shouldDiscardOpen(o, sessions)) return false;
    return openFollowsLiveCharge(o, liveState);
  });
  if (!candidates.length) return null;
  const liveTxn = liveState.transactionId != null && String(liveState.transactionId) !== ""
    ? String(liveState.transactionId)
    : null;
  if (liveTxn) {
    const exact = candidates.find(o => wevoOpenTxnId(o) === liveTxn);
    if (exact) return exact;
  }
  const active = candidates.find(o => !o.readyToComplete && !o.wevoEnded);
  return active || candidates[0];
}

/** טעינות פעילות עם txn שונה מהחי — צריך לסגור כמוכן לאישור. */
export function listConflictingWevoOpens(opens, liveTxn) {
  const txn = liveTxn != null && liveTxn !== "" ? String(liveTxn) : null;
  if (!txn) return [];
  return (opens || []).filter(o => {
    if (!isActiveWevoOpen(o)) return false;
    const ot = wevoOpenTxnId(o);
    return ot != null && ot !== txn;
  });
}
