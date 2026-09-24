/**
 * לוגיקת כסף / תשלומים / סנכרון — מקור אמת לבדיקות ול־runtime (מוזרק לפני app-source).
 * מונע רגרסיות: מחיקת תשלומים בענן, חסימת הפקדות לגיטימיות, יתרה שגויה.
 */

export const METHODS = {
  cash: "מזומן",
  paybox: "פייבוקס",
  bit: "ביט",
  transfer: "העברה",
  debt: "חוב"
};

/** סדר בחירה בהפקדת כסף: מזומן → פייבוקס → ביט → העברה */
export const PAYMENT_METHOD_OPTIONS = [
  ["cash", "מזומן"],
  ["paybox", "פייבוקס"],
  ["bit", "ביט"],
  ["transfer", "העברה"]
];

export const DEFAULT_PAYMENT_METHOD = "cash";

/** חלון מניעת לחיצה כפולה בשמירת תשלום (לא ימים!) */
export const DUPLICATE_SAVE_WINDOW_MS = 90 * 1000;

/** חלון ניקוי כפילויות משחזור ענן בטעינה (רק דקות, לא שבוע) */
export const DUPLICATE_DEDUP_WINDOW_MS = 15 * 60 * 1000;

export function hasDebt(balance) {
  return Number(balance) > 0.01;
}

export function hasCredit(balance) {
  return Number(balance) < -0.01;
}

export function isSelfClient(c) {
  if (!c) return false;
  if (c.self === true) return true;
  const name = String(c.name || "");
  return /עדן/.test(name) && (/עצמי/.test(name) || /🔒/.test(name));
}

/**
 * שיוך רכב שסוכם בשיחה (15.9.2026). לא דורס דגם/לוחית אם לא צוינו כאן.
 * «שלו» הוא מילה שלמה — לא חלק מ«שלום».
 */
export function knownCarPatchForName(name, isSelf = false) {
  const n = String(name || "");
  if (isSelf || (/עדן/.test(n) && (/עצמי/.test(n) || /🔒/.test(n)))) {
    return { carBrand: "tesla", carPlate: "31075503" };
  }
  if (/ג['׳'`]?וי|joy|גוי/i.test(n)) {
    return { carBrand: "geometry", carModel: "Geometry C" };
  }
  if (/קווין|בתי/.test(n) || /ליאור|מנעולן/.test(n)) {
    return { carBrand: "byd" };
  }
  if (/יאיר/.test(n) || /(?:^|[\s\-_/])שלו(?:$|[\s\-_/])/.test(n)) {
    return { carBrand: "tesla", carModel: "Model Y" };
  }
  if ((/נועה/.test(n) || /(^|[\s\-_/])אור([\s\-_/]|$)/.test(n) || /אור\s*ו/.test(n)) && !/אורן/.test(n)) {
    return { carBrand: "byd" };
  }
  return null;
}

/** מיזוג רשומות לפי id — לא מאבדים תשלום/טעינה שקיימים רק בצד אחד */
export function mergeByIdPreferNewer(a, b) {
  const map = new Map();
  const put = x => {
    if (!x || x.id == null) return;
    const id = String(x.id);
    const prev = map.get(id);
    if (!prev) {
      map.set(id, x);
      return;
    }
    const pt = new Date(prev.updatedAt || prev.date || 0).getTime() || 0;
    const xt = new Date(x.updatedAt || x.date || 0).getTime() || 0;
    if (xt >= pt) map.set(id, x);
  };
  (a || []).forEach(put);
  (b || []).forEach(put);
  return Array.from(map.values());
}

/** מבטיח שסכומי תשלום הם מספרים (מונע שרשור מחרוזות בחישוב יתרה) */
export function normalizePayments(list) {
  let changed = false;
  const payments = (list || []).map(p => {
    if (!p) return p;
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || p.amount !== amount) {
      changed = true;
      return {
        ...p,
        amount: Number.isFinite(amount) ? amount : 0
      };
    }
    return p;
  });
  return {
    payments,
    changed
  };
}

/**
 * מסיר תשלומים כפולים בטעות (לחיצה כפולה / שחזור ענן) — רק בחלון קצר.
 * לא מוחק הפקדות לגיטימיות באותו סכום בימים שונים.
 */
export function dedupeDuplicatePayments(list, windowMs = DUPLICATE_DEDUP_WINDOW_MS) {
  const payments = [...(list || [])];
  const byClient = new Map();
  for (const p of payments) {
    if (!p || !p.clientId || p.method === "debt") continue;
    const arr = byClient.get(p.clientId) || [];
    arr.push(p);
    byClient.set(p.clientId, arr);
  }
  const removeIds = new Set();
  for (const arr of byClient.values()) {
    const sorted = [...arr].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 0; i < sorted.length; i++) {
      if (removeIds.has(sorted[i].id)) continue;
      for (let j = i + 1; j < sorted.length; j++) {
        if (removeIds.has(sorted[j].id)) continue;
        const a = sorted[i];
        const b = sorted[j];
        const dt = Math.abs(new Date(b.date) - new Date(a.date));
        if (dt > windowMs) break;
        const sameAmt = Math.abs((Number(a.amount) || 0) - (Number(b.amount) || 0)) < 0.02;
        const sameMethod = (a.method || "") === (b.method || "");
        if (sameAmt && sameMethod) {
          removeIds.add(a.id);
          break;
        }
      }
    }
  }
  if (!removeIds.size) {
    return {
      payments,
      removed: 0
    };
  }
  return {
    payments: payments.filter(p => !p || !removeIds.has(p.id)),
    removed: removeIds.size
  };
}

/** מניעת לחיצה כפולה בלבד */
export function findRecentDuplicatePayment(payments, candidate, windowMs = DUPLICATE_SAVE_WINDOW_MS) {
  if (!candidate || !candidate.clientId || candidate.method === "debt") return null;
  const amt = Number(candidate.amount) || 0;
  const t = new Date(candidate.date || Date.now()).getTime();
  return (
    (payments || []).find(p => {
      if (!p || p.id === candidate.id || p.clientId !== candidate.clientId || p.method === "debt") return false;
      if ((p.method || "") !== (candidate.method || "")) return false;
      if (Math.abs((Number(p.amount) || 0) - amt) >= 0.02) return false;
      return Math.abs(new Date(p.date).getTime() - t) <= windowMs;
    }) || null
  );
}

export function validatePaymentInput(p) {
  if (!p || !p.clientId) {
    return {
      ok: false,
      error: "missing_client"
    };
  }
  const amount = Number(p.amount);
  if (!Number.isFinite(amount)) {
    return {
      ok: false,
      error: "invalid_amount"
    };
  }
  if (amount === 0 && p.method !== "debt") {
    return {
      ok: false,
      error: "zero_amount"
    };
  }
  return {
    ok: true,
    amount
  };
}

/** האם מותר לשמור תשלום חדש (בלי כפילות לחיצה כפולה) */
export function canSaveNewPayment(existingPayments, candidate, nowMs = Date.now()) {
  const v = validatePaymentInput(candidate);
  if (!v.ok) return {
    ok: false,
    reason: v.error
  };
  const fixed = {
    ...candidate,
    amount: v.amount,
    date: candidate.date || new Date(nowMs).toISOString()
  };
  const dup = findRecentDuplicatePayment(existingPayments, fixed);
  if (dup) {
    return {
      ok: false,
      reason: "double_click",
      duplicateId: dup.id
    };
  }
  return {
    ok: true,
    payment: fixed
  };
}

export function clientBalance(c, sessions, payments) {
  if (isSelfClient(c)) return 0;
  if (!c || !c.id) return 0;
  const ss = (sessions || []).filter(s => s.clientId === c.id);
  const ps = (payments || []).filter(p => p.clientId === c.id);
  const billed = ss.reduce((a, s) => a + (Number(s.amountBilled) || 0), 0);
  const paid = ps.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  return Math.round((billed - paid) * 100) / 100;
}

/**
 * עובר ושב: טעינות + תשלומים עם יתרה רצה.
 * יתרה חיובית = חוב; שלילית = זכות.
 */
export function buildClientLedger(clientId, sessions, payments, { isSelf = false } = {}) {
  const entries = [];
  for (const s of sessions || []) {
    if (!s || s.clientId !== clientId) continue;
    const billed = Number(s.amountBilled) || 0;
    const selfAmt = Number(s.costToOwner != null ? s.costToOwner : s.amountBilled) || 0;
    entries.push({
      id: `s:${s.id}`,
      sortDate: s.date,
      kind: "session",
      refId: s.id,
      title: isSelf ? "טעינה (אשראי)" : "טעינה",
      detail: `${isSelf ? Number(s.kwhRaw) || 0 : Number(s.kwhInflated) || Number(s.kwhRaw) || 0} קוט"ש${s.rateLabel ? ` · ${s.rateLabel}` : ""}`,
      delta: isSelf ? 0 : billed,
      showAmount: isSelf ? selfAmt : billed,
      method: null,
      notes: s.notes || "",
      ref: s
    });
  }
  for (const p of payments || []) {
    if (!p || p.clientId !== clientId) continue;
    const amt = Number(p.amount) || 0;
    const isDebt = p.method === "debt";
    entries.push({
      id: `p:${p.id}`,
      sortDate: p.date,
      kind: isDebt ? "debt" : "payment",
      refId: p.id,
      title: isDebt ? "תוספת חוב" : "הפקדה",
      detail: METHODS[p.method] || p.method || "",
      delta: isSelf ? 0 : isDebt ? Math.abs(amt) : -Math.abs(amt),
      showAmount: Math.abs(amt),
      method: p.method,
      notes: p.notes || "",
      ref: p
    });
  }
  entries.sort((a, b) => {
    const ta = new Date(a.sortDate).getTime() || 0;
    const tb = new Date(b.sortDate).getTime() || 0;
    if (ta !== tb) return ta - tb;
    const rank = k => (k === "session" || k === "debt" ? 0 : 1);
    return rank(a.kind) - rank(b.kind);
  });
  let bal = 0;
  for (const e of entries) {
    bal = Math.round((bal + e.delta) * 100) / 100;
    e.balanceAfter = bal;
  }
  return entries.slice().reverse();
}

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

/** שעות פרימיום לגביה מלקוחות — 16:00–23:00 */
export const BILLING_PREMIUM_START_H = 16;
export const BILLING_PREMIUM_END_H = 23;

export function isBillingPremiumAt(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= BILLING_PREMIUM_START_H && h < BILLING_PREMIUM_END_H;
}

/**
 * חלון 4 נקודות רלוונטי רק במעבר בין יקרות לרגיל (או הפוך).
 * יקרות→יקרות / רגיל→רגיל / עצמי: לא רלוונטי.
 */
export function isChargeTimelineRelevant({
  isSelf = false,
  plugInAt,
  plugOutAt,
  chargeEndAt,
  startDate,
  endDate
} = {}) {
  if (isSelf) return false;
  const start = plugInAt || startDate;
  const end = plugOutAt || chargeEndAt || endDate;
  if (!start || !end) return false;
  return isBillingPremiumAt(start) !== isBillingPremiumAt(end);
}

/**
 * אישור בלי לחיצת «תעריף יקר».
 * mode: "full" | "full-now" | "offpeak-preauth" | "first-auth"
 */
export function authorizeShouldConfirmPremium(mode) {
  return mode !== "offpeak-preauth" && mode !== "first-auth";
}

export function isWevoAuthIntentMode(mode) {
  return mode === "offpeak-preauth" || mode === "full-now" || mode === "first-auth";
}

/** נרמול כוונת אישור שמורה. */
export function normalizeWevoAuthIntent(raw) {
  if (!raw || raw.clientId == null || raw.clientId === "") return null;
  if (!isWevoAuthIntentMode(raw.mode)) return null;
  return {
    clientId: String(raw.clientId),
    mode: raw.mode,
    armedAt: Number(raw.armedAt) || Date.now(),
    queued: !!raw.queued,
    lastAttemptAt: raw.lastAttemptAt != null ? Number(raw.lastAttemptAt) : null,
    lastError: raw.lastError != null ? String(raw.lastError) : null,
    attempts: Math.max(0, Number(raw.attempts) || 0)
  };
}

/** מרווח בין ניסיונות — בלי עצירה קשיחה; אחרי הרבה ניסיונות מאטים. */
export function authRetryDelayMs(attempt) {
  const n = Math.max(1, Number(attempt) || 1);
  if (n <= 10) return 4000;
  if (n <= 30) return 15000;
  return 30000;
}

/**
 * אחרי אישור בודד בשיא — מצב ממתין/השהיה הוא הצלחה (תור לזול), לא כישלון.
 */
export function isOffPeakPreauthQueuedOk(state, peakNow) {
  if (!state || !peakNow) return false;
  const st = String(state.state || "");
  const kw = Number(state.rateKw);
  if (st === "Charging" && Number.isFinite(kw) && kw > 0.5) return false;
  if (state.waitingAuthorize) return true;
  if (state.delayCharge) return true;
  return st === "Preparing" || st === "SuspendedEVSE" || st === "Occupied" || st === "SuspendedEV";
}

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

function localDtMs(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
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
 * מצב תצוגה: טעינה פעילה, נגמרה והכבל עוד מחובר, או שהכבל נותק.
 */
export function openChargeStatus(open) {
  if (!open) return { kind: "idle", text: "" };
  const end = validChargeEndMs(open);
  const plugOut = localDtMs(open.plugOutAt);
  const ended = !!(end || open.readyToComplete || open.wevoEnded);
  const unplugged = !!(plugOut && (!end || plugOut + 60 * 1000 >= end));
  if (ended && unplugged) return { kind: "unplugged", text: "✓ הכבל נותק — מוכן לאישור" };
  if (ended) return { kind: "cable", text: "⏹ הטעינה נגמרה · הכבל עדיין מחובר" };
  const kw = open.liveKw != null ? Number(open.liveKw) : null;
  if (kw != null && kw > 0 && kw < 1.5) {
    return { kind: "slow", text: "⏳ בטעינה · מהירות נמוכה · הכבל מחובר" };
  }
  return { kind: "live", text: "⏳ בטעינה פעילה · הכבל מחובר" };
}

/** מתקן סיום לפני חיבור, ומסמן טעינה שנגמרה כמוכנה לאישור. */
export function repairWevoOpenRecord(open, nowMs = Date.now()) {
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
  const shouldReady = !base.readyToComplete && wevoOpenLooksFinished(base, nowMs);
  if (!dropEnd && !dropEndDate && !shouldReady) return open;
  return {
    ...base,
    readyToComplete: shouldReady ? true : !!base.readyToComplete,
    wevoEnded: shouldReady ? true : !!base.wevoEnded,
    liveKw: shouldReady ? 0 : base.liveKw
  };
}

/** מצבי עמדה שבהם באמת יש רכב — לא התחברות משתמש ולא עסקה ישנה. */
const VEHICLE_PRESENT_STATES = ["Preparing", "Charging", "SuspendedEV", "SuspendedEVSE", "Finishing", "Occupied", "Reserved"];

export function chargeTxnId(row) {
  if (!row) return null;
  const fromOpen = wevoOpenTxnId(row);
  if (fromOpen) return fromOpen;
  if (row.transactionId != null && String(row.transactionId) !== "") return String(row.transactionId);
  return null;
}

function chargeKwh(row) {
  if (!row) return null;
  const v = row.liveKwh != null ? row.liveKwh : row.kwhRaw != null ? row.kwhRaw : row.totalEnergyKwh;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function chargeMoney(row) {
  if (!row) return null;
  const v = row.liveWevoCost != null
    ? row.liveWevoCost
    : row.costToOwner != null
      ? row.costToOwner
      : row.totalCost != null
        ? row.totalCost
        : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * אותה טעינה: אותו txn, או אותו קוט״ש ואותו סכום גם אם השעון זז (אזור זמן / ייבוא מחדש).
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
  return Math.abs(sk - ck) <= 0.05 && Math.abs(sc - cc) <= 0.05;
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
export function chargerReportsVehicle(st, sessions) {
  if (!st) return false;
  const s = String(st.state || "");
  if (!VEHICLE_PRESENT_STATES.includes(s)) return false;
  const kw = st.rateKw != null ? Number(st.rateKw) : 0;
  const charging = s === "Charging" || s === "SuspendedEV" || s === "SuspendedEVSE";
  if (charging && kw > 0.5) return true;
  if (sessions && sessions.length) {
    const echo = {
      wevoTxnId: st.transactionId != null ? String(st.transactionId) : null,
      transactionId: st.transactionId,
      liveKwh: st.totalEnergyKwh,
      liveWevoCost: st.totalCost
    };
    if (shouldDiscardOpen({ ...echo, readyToComplete: true, liveKw: kw }, sessions)) return false;
  }
  return true;
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
    config: cfg
  };
}
