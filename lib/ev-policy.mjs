/**
 * ev-money/policy — מדיניות תעריף שיא וכוונת אישור Wevo:
 * שעות הפרימיום לגבייה, נרמול כוונת אישור, קצב ניסיונות וחלון הזול.
 */

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
    attempts: Math.max(0, Number(raw.attempts) || 0),
    premiumContinue: !!raw.premiumContinue
  };
}

/** מרווח בין ניסיונות — בלי עצירה קשיחה; אחרי הרבה ניסיונות מאטים. */
export function authRetryDelayMs(attempt) {
  const n = Math.max(1, Number(attempt) || 1);
  if (n <= 10) return 4000;
  if (n <= 30) return 15000;
  return 30000;
}

/** מספר ניסיונות מקסימלי לאישור אוטומטי — אחריו עוצרים עם הודעת כשל מפורשת. */
export const AUTH_MAX_ATTEMPTS = 20;

/**
 * האם המטען חסום ע"י תזמון Wevo (delayCharge מחוץ לחלון הזול)?
 * במצב כזה פקודת authorize לא מתחילה טעינה — צריך עקיפת פרימיום.
 */
export function isScheduleBlocked(st, nowMs) {
  if (!st || !st.delayCharge) return false;
  if (st.inWindow === true) return false;
  if (st.inWindow === false) return true;
  // אין inWindow — מחשבים מחלון ה-off-peak (שניות מחצות, עשוי לחצות חצות)
  const s = st.offPeakStartTime != null ? Number(st.offPeakStartTime) : null;
  const e = st.offPeakEndTime != null ? Number(st.offPeakEndTime) : null;
  if (s == null || e == null || Number.isNaN(s) || Number.isNaN(e)) return false;
  const d = new Date(nowMs || Date.now());
  const secNow = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  const inWin = s <= e ? secNow >= s && secNow < e : secNow >= s || secNow < e;
  return !inWin;
}

/** תווית שעת התחלת החלון הזול, או null */
export function offPeakWindowLabel(st) {
  if (!st || st.offPeakStartTime == null) return null;
  const s = Number(st.offPeakStartTime);
  if (Number.isNaN(s)) return null;
  const hh = String(Math.floor(s / 3600) % 24).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  return `${hh}:${mm}`;
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
