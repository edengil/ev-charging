/**
 * ev-money/timeline — ציר הזמן של טעינה וסיום חי:
 * ארבע נקודות הזמן, חותמת סיום מדגימת עמדה, ומיזוג אירועי שומר־השרת.
 */
import { localDtMs, tlMs, tlLocal } from "./ev-money-core.mjs";
import { stationStillCharging } from "./ev-opens.mjs";

/**
 * חותמת סיום טעינה מדגימת מצב חיה (ms) — או null אם אין סיום תקף.
 * סיום שכבר נקבע על הרשומה קודם לחותמת חיה חדשה: Wevo מעדכנת את
 * chargingFullTime גם אחרי שהטעינה הסתיימה (למשל בזמן ניתוק הכבל בבוקר),
 * וחותמת מאוחרת כזו לא רשאית להזיז סיום שכבר אומת (תרחיש עידן 13.10:
 * סיום 23:20 נדרס ל־06:43 למחרת והאשף הציג שני סיומים סותרים).
 */
export function pickLiveChargeEndMs(st, existing, plugMs) {
  const existMs = existing ? localDtMs(existing.chargeEndedAt) : null;
  const savedValid = existMs != null && (plugMs == null || existMs >= plugMs) ? existMs : null;
  // רכב שהגיע לפול: חותמת ה־full של Wevo היא סיום הזרם, גם אם העמדה עדיין
  // מדווחת SuspendedEV (רכב מלא, כבל מחובר). בלי הלכידה הזו הסיום נלכד רק
  // במעבר המדויק ל־Finishing, ואם פוספס — נחתם כזמן הוצאת הכבל (מקרה 17.10:
  // סיום 20:20 נלכד כ־20:54). סיום שמור קודם גם כאן (הגנת 13.10).
  if (st && st.didCompleteFull) {
    if (savedValid != null) return savedValid;
    const fullMs0 = localDtMs(st.chargingFullTime);
    if (fullMs0 != null && (plugMs == null || fullMs0 >= plugMs)) return fullMs0;
  }
  if (stationStillCharging(st)) return null;
  if (savedValid != null) return savedValid;
  const fullMs = st ? localDtMs(st.chargingFullTime) : null;
  if (fullMs != null && (plugMs == null || fullMs >= plugMs)) return fullMs;
  return null;
}

/**
 * ארבע נקודות זמן לטעינה: חיבור כבל → התחלת זרם → סיום זרם → הוצאת כבל.
 * הועבר מהבאנדל (src/30-utils.js) ל־lib בשלב C של הפרדת הסנכרון — אותה לוגיקה
 * בדיוק, כדי שתהיה מכוסה בבדיקות יחידה. סדר העדיפויות לסיום: סיום סופי מאומת
 * (finalEndAt) > חותמת Wevo מהעסקה > התחלת זרם + משך נטו > היוריסטיקת חיבור/ניתוק.
 */
export function resolveChargeTimeline(tx = {}, hints = {}) {
  const plugInMs = tlMs(hints.plugInAt || hints.plugInTime || tx.plugInTime);
  const plugOutMs = tlMs(hints.plugOutAt || hints.plugOutTime || tx.plugOutTime);
  const netSec = Number(hints.netDuration != null ? hints.netDuration : tx.netDuration) || 0;
  const fullMs = tlMs(tx.chargingFullTime || hints.chargingFullTime || hints.chargeEndedAt);
  const liveStartMs = tlMs(hints.chargeStartedAt || tx.chargeStartedAt);
  const finalEndMs = tlMs(hints.finalEndAt);

  let chargeEndMs = null;
  if (finalEndMs && (!plugInMs || finalEndMs >= plugInMs)) {
    chargeEndMs = finalEndMs;
  } else if (fullMs && (!plugInMs || fullMs >= plugInMs)) {
    chargeEndMs = fullMs;
  } else if (hints.chargeEndedAt) {
    chargeEndMs = tlMs(hints.chargeEndedAt);
  } else if (liveStartMs && netSec > 0) {
    chargeEndMs = liveStartMs + netSec * 1000;
  } else if (plugInMs && plugOutMs && netSec > 0) {
    const connectedSec = Math.max(0, (plugOutMs - plugInMs) / 1000);
    const idleSec = Math.max(0, connectedSec - netSec);
    if (idleSec >= 20 * 60) chargeEndMs = plugOutMs;
    else chargeEndMs = plugInMs + netSec * 1000;
  } else if (plugInMs && netSec > 0) {
    chargeEndMs = plugInMs + netSec * 1000;
  } else if (plugOutMs) {
    chargeEndMs = plugOutMs;
  }

  let chargeStartMs = liveStartMs;
  if (!chargeStartMs && chargeEndMs && netSec > 0) {
    chargeStartMs = chargeEndMs - netSec * 1000;
  } else if (!chargeStartMs && plugInMs && plugOutMs && netSec > 0) {
    const connectedSec = Math.max(0, (plugOutMs - plugInMs) / 1000);
    const idleSec = Math.max(0, connectedSec - netSec);
    if (idleSec >= 20 * 60) chargeStartMs = plugOutMs - netSec * 1000;
    else chargeStartMs = plugInMs;
  } else if (!chargeStartMs && plugInMs) {
    chargeStartMs = plugInMs;
  }

  if (chargeStartMs && plugInMs && chargeStartMs < plugInMs) chargeStartMs = plugInMs;
  if (chargeEndMs && plugInMs && chargeEndMs < plugInMs) chargeEndMs = plugInMs;
  if (chargeStartMs && chargeEndMs && chargeStartMs > chargeEndMs) chargeStartMs = chargeEndMs;
  if (plugOutMs && chargeEndMs && chargeEndMs > plugOutMs) chargeEndMs = plugOutMs;
  if (plugOutMs && chargeStartMs && chargeStartMs > plugOutMs) chargeStartMs = plugOutMs;

  return {
    plugInAt: tlLocal(plugInMs),
    chargeStartAt: tlLocal(chargeStartMs),
    chargeEndAt: tlLocal(chargeEndMs),
    plugOutAt: tlLocal(plugOutMs),
    plugInMs,
    chargeStartMs,
    chargeEndMs,
    plugOutMs,
    netMins: netSec > 0 ? Math.round(netSec / 60) : 0,
    billMins: plugInMs && chargeEndMs ? Math.max(1, Math.round((chargeEndMs - plugInMs) / 60000)) : netSec > 0 ? Math.round(netSec / 60) : 0
  };
}

/**
 * מגן שמירה (F3, ‏19.10): לכידה חיה של הרשומה הפתוחה (חיבור כבל / התחלת זרם)
 * גוברת על נקודת ציר־זמן שסותרת אותה ביותר מ־30 דקות. חותמות Wevo לעסקאות
 * קטעים אינן אמת פיזית (6290638: חיבור נרשם בשעת הסיום) — הלכידה החיה כן.
 * מחזיר עותק מתוקן; ציר הזמן המקורי לא משתנה.
 */
export function preferLiveStamps(timeline, open, maxDiffMin = 30) {
  if (!timeline || !open) return timeline;
  const out = { ...timeline };
  let changed = false;
  const fix = (base, live) => {
    const liveMs = tlMs(live);
    if (liveMs == null) return;
    const curMs = out[base + "Ms"] != null ? out[base + "Ms"] : tlMs(out[base + "At"]);
    if (curMs == null || Math.abs(curMs - liveMs) > maxDiffMin * 60000) {
      out[base + "At"] = tlLocal(liveMs);
      out[base + "Ms"] = liveMs;
      changed = true;
    }
  };
  fix("plugIn", open.plugInAt || open.startDate);
  fix("chargeStart", open.chargeStartedAt);
  return changed ? out : timeline;
}

/**
 * מיזוג אירועי שומר־שרת (watch:events) לתוך רשומה פתוחה — מילוי שדות ריקים בלבד (ב3).
 * חותמת ה־full מהשרת נלכדה מהערוץ החי בזמן אמת, ולכן ממנה מונפק verifiedEndAt
 * בדיוק כמו בלכידה חיה מקומית — פרט לאירוע שסומן endApprox בשרת (H8, ביקורת
 * 30.10): סיום מקורב ממלא חותמות ומסמן endApprox על הרשומה, אבל לעולם לא
 * מנפיק verifiedEndAt. ערכים שהאפליקציה כבר לכדה לעולם לא נדרסים.
 * מחזיר patch ליישום, או null כשאין מה למלא.
 */
export function mergeWatchEvents(open, ev) {
  if (!open || !ev) return null;
  const loc = (ms) => (ms != null && Number(ms) > 0 ? tlLocal(Number(ms)) : null);
  const patch = {};
  const plugIn = loc(ev.plugInAt);
  if (plugIn && !open.plugInAt) patch.plugInAt = plugIn;
  const started = loc(ev.chargeStartedAt);
  if (started && !open.chargeStartedAt) {
    patch.chargeStartedAt = started;
    // חותמת התחלה מזמן־צפייה של טיק השרת — מסומנת כמקורבת על הרשומה (B9)
    if (ev.chargeStartApprox) patch.chargeStartApprox = true;
  }
  const fullLocal = loc(ev.chargingFullTime || ev.chargeEndedAt);
  if (fullLocal) {
    if (!open.chargeEndedAt) patch.chargeEndedAt = fullLocal;
    if (ev.endApprox) {
      // H8: סיום מקורב — בלי chargingFullTime (זו חותמת Wevo שלא הייתה; מילוי
      // שלה היה הופך את הקירוב ל"מאומת" בנתיבי סגירה אחרים) ובלי verifiedEndAt
      if (!open.verifiedEndAt && !open.endApprox) patch.endApprox = true;
    } else {
      if (!open.chargingFullTime) patch.chargingFullTime = fullLocal;
      if (!open.verifiedEndAt) patch.verifiedEndAt = fullLocal;
    }
  }
  const plugOut = loc(ev.plugOutAt);
  if (plugOut && !open.plugOutAt) patch.plugOutAt = plugOut;
  return Object.keys(patch).length ? patch : null;
}
