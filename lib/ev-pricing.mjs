/**
 * lib/ev-pricing.mjs — ליבת התמחור והחיוב (H12, ביקורת 30.10).
 *
 * calcSession, pickMaxBillWindow ו־timelinePoints חיו בעבר רק בקבצי src של
 * הבאנדל בלי שום בדיקת יחידה ישירה. כאן הן פונקציות טהורות עם config מפורש,
 * כדי שאפשר יהיה לבדוק אותן ישירות; קבצי ה־src שומרים מתאמים דקים שמזריקים
 * את getConfig() הנוכחי.
 */
import { BILLING_PREMIUM_START_H, BILLING_PREMIUM_END_H } from "./ev-policy.mjs";

/** ברירות מחדל זהות ל־DEFAULT_CONFIG שב־src/10-pricing.js (מקור התצורה החיה). */
export const PRICING_DEFAULT_INFLATION = 1.21;
export const PRICING_DEFAULT_OWNER_PEAK_START_MIN = 17 * 60;
export const PRICING_DEFAULT_OWNER_PEAK_END_MIN = 23 * 60;

function inflationOf(cfg) {
  const v = Number(cfg && cfg.inflation);
  return v > 0 ? v : PRICING_DEFAULT_INFLATION;
}

/** דקות החפיפה בין [start, end] לבין חלון הפיק היומי (עובד גם מעבר לחצות). */
export function peakOverlapMinutes(start, end, startMin, endMin) {
  if (!(end > start)) return 0;
  let total = 0;
  const days = Math.min(8, Math.ceil((end - start) / 86400000) + 1);
  for (let i = 0; i < days; i++) {
    const mid = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const ps = mid.getTime() + startMin * 60000;
    const pe = mid.getTime() + endMin * 60000;
    const o = Math.min(end.getTime(), pe) - Math.max(start.getTime(), ps);
    if (o > 0) total += o / 60000;
  }
  return total;
}

/**
 * כמו peakOverlapMinutes אבל רק לימי חול — חלון פיק הבעלים לא חל בשישי/שבת.
 * M1 (ביקורת 30.10): calcSession הישן החליט "סופ״ש" לפי יום ההתחלה בלבד, כך
 * שטעינת חמישי→שבת חויבה בעלות שיא גם על דקות שישי/שבת, וטעינת שבת→ראשון
 * החמיצה את שיא ראשון. כאן כל יום נבחן בפני עצמו.
 */
export function ownerPeakOverlapMinutes(start, end, startMin, endMin) {
  if (!(end > start)) return 0;
  let total = 0;
  const days = Math.min(8, Math.ceil((end - start) / 86400000) + 1);
  for (let i = 0; i < days; i++) {
    const mid = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const day = mid.getDay();
    if (day === 5 || day === 6) continue;
    const ps = mid.getTime() + startMin * 60000;
    const pe = mid.getTime() + endMin * 60000;
    const o = Math.min(end.getTime(), pe) - Math.max(start.getTime(), ps);
    if (o > 0) total += o / 60000;
  }
  return total;
}

/**
 * חלון הפיק של עלות הבעלים (דקות מיום) מתוך cfg — טהור.
 * endMin יכול לעבור 1440 כשהחלון חוצה חצות.
 */
export function ownerPeakWindowFor(cfg) {
  const s = Number(cfg && cfg.ownerPeakStartMin);
  const e = Number(cfg && cfg.ownerPeakEndMin);
  if (Number.isFinite(s) && Number.isFinite(e) && s >= 0 && s < 1440 && e > s && e <= 2880) {
    return { startMin: s, endMin: e };
  }
  return { startMin: PRICING_DEFAULT_OWNER_PEAK_START_MIN, endMin: PRICING_DEFAULT_OWNER_PEAK_END_MIN };
}

/**
 * חישוב טעינה מלא: תעריף לקוח (פרימיום/רגיל לפי חפיפה אמיתית), ניפוח,
 * עלות בעלים (פיק ימי־חול בלבד, M1) ורווח. cfg = צורת DEFAULT_CONFIG.
 */
export function calcSessionWithConfig(cfg, kwhRaw, startDt, endDt = null, forceReg = false, forcePrem = false, customRate = null) {
  const c = cfg || {};
  const start = startDt instanceof Date ? startDt : new Date(startDt);
  const end = endDt ? endDt instanceof Date ? endDt : new Date(endDt) : start;
  const kwhInflated = Math.round(kwhRaw * inflationOf(c));
  let rate,
    premiumRatio = 0,
    isMixed = false;
  if (customRate && customRate > 0) {
    rate = customRate;
  } else if (forceReg) {
    rate = c.rateRegular;
  } else if (forcePrem) {
    rate = c.ratePremium;
    premiumRatio = 1;
  } else {
    const totalMin = Math.max((end - start) / 60000, 1);
    // H3 (ביקורת 30.10): חפיפת פרימיום אמיתית על פני כל הימים — כמו צד עלות
    // הבעלים. הלוגיקה הקודמת עבדה על שעות־יום בלבד ומחקה את שעות הפיק של
    // היום הראשון בכל טעינה שחצתה חצות והסתיימה בשעה מאוחרת מההתחלה.
    const premMin = peakOverlapMinutes(start, end, BILLING_PREMIUM_START_H * 60, BILLING_PREMIUM_END_H * 60);
    premiumRatio = Math.min(1, premMin / totalMin);
    if (premiumRatio > 0 && premiumRatio < 1) {
      isMixed = true;
      rate = Math.round((c.ratePremium * premiumRatio + c.rateRegular * (1 - premiumRatio)) * 1000) / 1000;
    } else if (premiumRatio >= 1) {
      rate = c.ratePremium;
    } else if (end > start) {
      rate = c.rateRegular;
    } else {
      // משך אפס/שלילי — סיווג לפי שעת ההתחלה (ההתנהגות ההיסטורית למקרה הקצה)
      const h = start.getHours();
      if (h >= BILLING_PREMIUM_START_H && h < BILLING_PREMIUM_END_H) {
        rate = c.ratePremium;
        premiumRatio = 1;
      } else {
        rate = c.rateRegular;
      }
    }
  }
  const amountBilled = Math.ceil(kwhInflated * rate);

  // עלות בעלים: דקות פיק נספרות רק בימי חול (M1) — כל השאר בתעריף הרגיל.
  const totalOwnerMin = Math.max((end - start) / 60000, 1);
  const w = ownerPeakWindowFor(c);
  const peakOwnerMin = ownerPeakOverlapMinutes(start, end, w.startMin, w.endMin);
  const peakRatio = Math.min(1, peakOwnerMin / totalOwnerMin);
  const ownerRate = c.ownerPeak * peakRatio + c.ownerOff * (1 - peakRatio);
  const costToOwner = Math.round(kwhRaw * ownerRate * 100) / 100;
  const profit = Math.round((amountBilled - costToOwner) * 100) / 100;
  const rateLabel = customRate ? "מותאם" : isMixed ? `משולב (${Math.round(premiumRatio * 100)}% פרימיום)` : premiumRatio >= 1 ? "פרימיום" : "רגיל";
  return {
    kwhRaw,
    kwhInflated,
    premiumRatio: Math.round(premiumRatio * 100) / 100,
    isMixed,
    rate,
    amountBilled,
    costToOwner,
    profit,
    rateLabel,
    ownerRate: Math.round(ownerRate * 1000) / 1000
  };
}

export const TIMELINE_LABELS = {
  plugIn: "חיבור כבל",
  chargeStart: "התחלת טעינה בפועל",
  chargeEnd: "סיום טעינה בפועל",
  plugOut: "הוצאת כבל"
};

export function timelinePoints(tl) {
  if (!tl) return [];
  return [
    { key: "plugIn", label: TIMELINE_LABELS.plugIn, at: tl.plugInAt },
    { key: "chargeStart", label: TIMELINE_LABELS.chargeStart, at: tl.chargeStartAt },
    { key: "chargeEnd", label: TIMELINE_LABELS.chargeEnd, at: tl.chargeEndAt },
    { key: "plugOut", label: TIMELINE_LABELS.plugOut, at: tl.plugOutAt }
  ].filter(p => !!p.at);
}

export function pointAt(tl, key) {
  if (!tl || !key) return null;
  switch (key) {
    case "plugIn":
      return tl.plugInAt;
    case "chargeStart":
      return tl.chargeStartAt;
    case "chargeEnd":
      return tl.chargeEndAt;
    case "plugOut":
      return tl.plugOutAt;
    default:
      return null;
  }
}

/** המרה ל-ms באותה סמנטיקה כמו toMs שב־src/30-utils.js (שניות קטנות מ־1e12). */
function toMsValue(v) {
  if (v == null || v === "" || v === 0) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
  const d = new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * בוחר צירוף התחלה/סיום עם הסכום הגבוה ביותר (פרימיום וכו').
 * H2 (ביקורת 30.10): ברירת המחדל היא ארבעת חלונות החיוב הקנוניים בלבד —
 * התחלה ∈ {plugIn, chargeStart} × סיום ∈ {chargeEnd, plugOut} — אותם חלונות
 * שמוצגים למשתמש מתומחרים באשף. startKeys / endKeys אופציונליים לחריגה מפורשת.
 */
export function pickMaxBillWindowWithConfig(cfg, kwh, tl, opts = {}) {
  const points = timelinePoints(tl);
  if (!points.length || !(kwh > 0)) return null;
  const startKeys = opts.startKeys || ["plugIn", "chargeStart"];
  const endKeys = opts.endKeys || ["chargeEnd", "plugOut"];
  const forceReg = !!opts.forceReg;
  const forcePrem = !!opts.forcePrem;
  const customRate = opts.customRate || null;
  let best = null;
  for (const sk of startKeys) {
    const start = pointAt(tl, sk);
    if (!start) continue;
    for (const ek of endKeys) {
      const end = pointAt(tl, ek);
      if (!end) continue;
      const sm = toMsValue(start);
      const em = toMsValue(end);
      if (sm == null || em == null || em <= sm) continue;
      const calc = calcSessionWithConfig(cfg, kwh, new Date(sm), new Date(em), forceReg, forcePrem, customRate);
      if (!best || calc.amountBilled > best.calc.amountBilled) {
        best = {
          startKey: sk,
          endKey: ek,
          start,
          end,
          calc,
          mins: Math.max(1, Math.round((em - sm) / 60000))
        };
      }
    }
  }
  return best;
}
