/**
 * ev-money/core — פרטיים משותפים לכל תחומי lib/ev-money:
 * המרות זמן מקומיות, חילוץ קוט״ש/סכום משורה, וחלונות זמן להשוואת טעינות.
 * כל שאר החלקים מייבאים מכאן; הקובץ הזה לא מייבא מאף חלק.
 */

export function localDtMs(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

export function tlMs(v) {
  const m = localDtMs(v);
  return m == null || m === 0 ? null : m;
}

export function tlLocal(ms) {
  if (ms == null) return null;
  const dt = new Date(ms);
  const pad = n => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function chargeKwh(row) {
  if (!row) return null;
  const v = row.liveKwh != null ? row.liveKwh : row.kwhRaw != null ? row.kwhRaw : row.totalEnergyKwh;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function chargeMoney(row) {
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

const SAME_CHARGE_WINDOW_MS = 36 * 60 * 60 * 1000;
/** חלון מקסימלי לחשד כפילות: תאריכים במרווח של מעל יומיים אינם כפילות. */
export const DUP_SUSPECT_WINDOW_MS = 48 * 60 * 60 * 1000;

export function chargeTimes(row, keys) {
  return keys.map(k => localDtMs(row[k])).filter(t => t != null);
}

export function chargeTimesNearWindow(session, charge, windowMs) {
  const st = chargeTimes(session, ["date", "startDate", "plugInAt", "chargeEndedAt", "endDate"]);
  if (!st.length) return false;
  let ct = chargeTimes(charge, ["plugInAt", "startDate", "chargeEndedAt", "endDate", "plugInTime", "date"]);
  if (!ct.length) ct = [Date.now()];
  return st.some(a => ct.some(b => Math.abs(a - b) <= windowMs));
}

/**
 * התעריף קבוע, אז קוט״ש וסכום לבד תואמים כמעט תמיד טעינה ישנה כלשהי מההיסטוריה.
 * בלי txn — רק טעינה שנשמרה בחלון הזמן של אותה טעינה. בלי שעה בשמורה אין התאמה.
 */
export function chargeTimesNear(session, charge) {
  return chargeTimesNearWindow(session, charge, SAME_CHARGE_WINDOW_MS);
}
