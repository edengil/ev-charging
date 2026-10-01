/**
 * lib/ev-idle.mjs — לוגיקה טהורה (unit-testable):
 * תזכורת "סיים לטעון אבל לא ניתק" — כל 30 דקות עד ניתוק הכבל.
 */

export const IDLE_REMINDER_INTERVAL_MS = 30 * 60 * 1000;

/** ms של סיום הטעינה מתוך רשומת open, או null אם לא הסתיימה */
export function idleEndMs(open) {
  if (!open) return null;
  const v = open.chargingFullTime || open.chargeEndedAt || open.endDate;
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * האם לשלוח תזכורת "עדיין מחובר" עכשיו?
 * @param {object} p — { endMs, plugOutAt, lastReminderMs, nowMs }
 * @returns {{due:boolean, idleMinutes:number}}
 */
export function shouldSendIdleReminder({ endMs, plugOutAt, lastReminderMs, nowMs }) {
  if (!endMs) return { due: false, idleMinutes: 0 };
  if (plugOutAt) return { due: false, idleMinutes: 0 };
  const now = nowMs || Date.now();
  const base = Math.max(endMs, lastReminderMs || 0);
  if (now - base < IDLE_REMINDER_INTERVAL_MS) return { due: false, idleMinutes: 0 };
  return { due: true, idleMinutes: Math.max(1, Math.round((now - endMs) / 60000)) };
}

export function idleReminderText(name, idleMinutes) {
  return `הרכב של ${name} סיים לטעון לפני ${idleMinutes} דקות ועדיין מחובר לעמדה`;
}

export function idleWaDraftText(name, idleMinutes) {
  return `היי ${name}, הרכב סיים לטעון לפני כ-${idleMinutes} דקות ועדיין מחובר לעמדה. תוכל בבקשה לנתק כדי לפנות אותה? תודה!`;
}
