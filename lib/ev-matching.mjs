/**
 * ev-money/matching — התאמת סשנים שמורים לעסקאות Wevo וחשד לכפילות:
 * עסקה סגורה לטעינה פתוחה, ניקוי כפילויות לפי txn, וחשד כפילות בשיוך.
 */
import { localDtMs, tlLocal, chargeKwh, chargeMoney, chargeTimes, chargeTimesNearWindow, DUP_SUSPECT_WINDOW_MS } from "./ev-money-core.mjs";
import { wevoOpenTxnId, chargeTxnId } from "./ev-opens.mjs";

/**
 * עסקה סגורה בלוג Wevo עבור טעינה פתוחה.
 * אם יש txn והוא לא ברשימה הסגורה — הוא עדיין רץ. לא לוקחים עסקה אחרת מהחלון.
 */
export function pickFinishedWevoTx(transactions, open) {
  // עסקה עם plugOutTime/stopReason הסתיימה בפועל — גם אם Wevo עדיין מסמנת isOngoing (דגל תקוע ידוע)
  const list = (transactions || []).filter(t => t && (!t.isOngoing || t.plugOutTime || t.stopReason));
  if (!list.length || !open) return null;
  const tid = wevoOpenTxnId(open);
  if (tid) return list.find(t => String(t.transactionId) === tid) || null;
  const startMs = localDtMs(open.plugInAt || open.startDate);
  if (startMs == null) return null;
  const near = list
    .map(t => ({ t, dt: Math.abs((Number(t.plugInTime) || 0) - startMs) }))
    .filter(x => x.dt <= 30 * 60 * 1000)
    .sort((a, b) => a.dt - b.dt);
  if (near.length) return near[0].t;
  // גיבוי (19.10): חותמות החיבור של Wevo לעסקאות קטעים עלולות לסטות בשעות מהמציאות
  // (6290638 נרשמה בחיבור 16:42 כשהרכב חובר 14:44) — משייכים לפי אנרגיה ואותו יום,
  // כשהאנרגיה החיה של הרשומה ידועה. חלון החיבור הצר נשאר העדיפות הראשונה.
  const openKwh = Number(open.liveKwh) || 0;
  if (openKwh <= 0) return null;
  const openDay = tlLocal(startMs).slice(0, 10);
  const byEnergy = list
    .map(t => ({ t, dk: Math.abs((Number(t.totalEnergyKwh) || 0) - openKwh), plugMs: Number(t.plugInTime) || 0 }))
    .filter(x => x.dk <= 0.2 && x.plugMs > 0 && x.plugMs >= startMs - 2 * 60 * 60000 && tlLocal(x.plugMs).slice(0, 10) === openDay)
    .sort((a, b) => a.dk - b.dk || Math.abs(a.plugMs - startMs) - Math.abs(b.plugMs - startMs));
  return byEnergy.length ? byEnergy[0].t : null;
}

function sessionHistoryRole(s) {
  return s && s.source === "wevo-sync" ? "wevo" : "bill";
}

function sessionKeepRank(s) {
  const t = new Date(s && (s.updatedAt || s.date) || 0).getTime() || 0;
  return t;
}

/** כפילות בתוך אותה רשימה בלבד. חיוב וויבו וחיוב ללקוח עם אותו txn נשארים שניהם. */
export function dedupeSessionsByTxn(sessions) {
  const kept = [];
  const indexByTxn = new Map();
  for (const s of sessions || []) {
    if (!s) continue;
    const tid = chargeTxnId(s);
    if (!tid) {
      kept.push(s);
      continue;
    }
    const key = sessionHistoryRole(s) + ":" + tid;
    const prevAt = indexByTxn.get(key);
    if (prevAt == null) {
      indexByTxn.set(key, kept.length);
      kept.push(s);
      continue;
    }
    if (sessionKeepRank(s) > sessionKeepRank(kept[prevAt])) kept[prevAt] = s;
  }
  return kept;
}

/**
 * חשד לכפילות בשיוך טעינה לא מקוטלגת: טעינה שמורה של אותו לקוח בתוך חלון
 * היומיים, עם סימן דמיון ממשי — חפיפת זמן הדוקה (עד שעה), קוט״ש קרוב או
 * סכום קרוב. קרבת זמן רחבה לבדה אינה כפילות: מי שמטעין מדי יום יראה כמעט
 * תמיד טעינה ישנה במרחק של עד 36 שעות, גם עם קוט״ש שונה לגמרי (73.09 מול
 * 29.00) — זו בדיוק ההתראה השגויה שראינו. שורות מראה wevo-sync אינן קיטלוג
 * אמיתי ולכן לא נבדקות. מחזיר את הטעינה החשודה או null.
 */
export function findDuplicateSuspect(sessions, clientId, tx) {
  if (!tx || clientId == null || String(clientId) === "") return null;
  const mine = (sessions || []).filter(s => s && String(s.clientId) === String(clientId) && s.source !== "wevo-sync");
  if (!mine.length) return null;
  const tk = chargeKwh(tx);
  const tcRaw = tx.totalCost != null ? Number(tx.totalCost) : null;
  const tc = tcRaw != null && Number.isFinite(tcRaw) ? tcRaw : null;
  for (const s of mine) {
    if (!chargeTimesNearWindow(s, tx, DUP_SUSPECT_WINDOW_MS)) continue;
    // חפיפת זמן הדוקה (עד שעה) כשלעצמה מספיקה — אותה טעינה פיזית גם אם הערכים נערכו.
    // קרבת זמן רחבה יותר אינה כפילות: נדרש גם קוט״ש קרוב או סכום קרוב.
    if (chargeTimesNearWindow(s, tx, 60 * 60 * 1000)) return s;
    const sk = chargeKwh(s);
    if (sk != null && tk != null && sk > 0 && tk > 0) {
      const kTol = Math.max(0.5, tk * 0.05);
      if (Math.abs(sk - tk) <= kTol) return s;
    }
    if (tc != null) {
      const cTol = Math.max(0.5, tc * 0.05);
      const sc = chargeMoney(s);
      if (sc != null && Math.abs(sc - tc) <= cTol) return s;
      const ab = s.amountBilled != null ? Number(s.amountBilled) : null;
      if (ab != null && Number.isFinite(ab) && Math.abs(ab - tc) <= cTol) return s;
    }
  }
  return null;
}

/** תווית תצוגה לחשד כפילות: תאריך + קוט"ש של הטעינה הקיימת. */
export function duplicateSuspectLabel(s) {
  const times = chargeTimes(s, ["date", "startDate", "plugInAt", "chargeEndedAt", "endDate"]);
  const ms = times.length ? times[0] : 0;
  let d = "—";
  try {
    if (ms) d = new Date(ms).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {}
  const kwh = chargeKwh(s);
  return `${d}${kwh != null ? ` · ${kwh} קוט"ש` : ""}`;
}

/**
 * החלטת שיוך מול חשד כפילות: עם חשד וללא אישור מפורש — "warn" (אין חיוב);
 * אחרת — "assign".
 */
export function duplicateAssignDecision(suspect, confirmed) {
  return suspect && !confirmed ? "warn" : "assign";
}
