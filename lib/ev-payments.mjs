/**
 * לוגיקת כסף / תשלומים / סנכרון — מקור אמת לבדיקות ול־runtime (מוזרק לפני src/).
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

/**
 * כפילות תשלום באותו יום קלנדרי (מעבר לחלון 90 השניות של לחיצה כפולה).
 * מחזיר את התשלום החשוד או null. לא חוסם — רק אזהרה עם "שמור בכל זאת",
 * כי תשלום כפול לגיטימי באותו יום אפשרי (בוקר + ערב).
 */
export function findSameDayDuplicatePayment(payments, candidate) {
  if (!candidate || !candidate.clientId || candidate.method === "debt") return null;
  const amt = Number(candidate.amount) || 0;
  if (!(amt > 0)) return null;
  const d = new Date(candidate.date || Date.now());
  if (isNaN(d.getTime())) return null;
  const dayKey = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const sameDay = dt => {
    if (isNaN(dt.getTime())) return false;
    return dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate() === dayKey;
  };
  return (
    (payments || []).find(p => {
      if (!p || p.id === candidate.id || p.clientId !== candidate.clientId || p.method === "debt") return false;
      if ((p.method || "") !== (candidate.method || "")) return false;
      if (Math.abs((Number(p.amount) || 0) - amt) >= 0.02) return false;
      return sameDay(new Date(p.date));
    }) || null
  );
}

function validatePaymentInput(p) {
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
 * סיכום גבייה לחודש נתון: כמה חויב בטעינות שכנים מול כמה נגבה בפועל (תשלומים).
 * pct מוגבל ל־100 (תשלום על חודשים קודמים לא מנפח את האחוז).
 */
export function monthlyCollection(sessions, payments, selfIds, year, month) {
  const self = new Set(selfIds || []);
  const inMonth = (v) => {
    const d = new Date(v);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
  };
  let billed = 0;
  for (const s of sessions || []) {
    if (!s || self.has(s.clientId) || !inMonth(s.date)) continue;
    billed += Number(s.amountBilled) || 0;
  }
  let collected = 0;
  for (const p of payments || []) {
    if (!p || self.has(p.clientId) || !inMonth(p.date)) continue;
    const amt = Number(p.amount) || 0;
    if (amt > 0) collected += amt;
  }
  const pct = billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : null;
  return { billed, collected, pct };
}
