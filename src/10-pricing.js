/**
 * src/10-pricing.js — תמחור: ברירות מחדל, ניתנות לשינוי בהגדרות.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── תמחור: ברירות מחדל — ניתנות לשינוי בהגדרות ⚙️ ──────────────────────────
const DEFAULT_CONFIG = {
  // גבייה 16:00–23:00
  ratePremium: 2.98,
  // גבייה שאר הזמן
  rateRegular: 1.47,
  // עלות בעלים בשעות הפיק (החלון עצמו נמשך מ־Wevo, שדה ownerPeak*Min למטה)
  ownerPeak: 2.08,
  // עלות בעלים שאר הזמן + שישי/שבת
  ownerOff: 0.87,
  // חלון פיק ברירת מחדל 17:00–23:00 — מתעדכן אוטומטית מלוח Wevo בכל סנכרון
  ownerPeakStartMin: 17 * 60,
  ownerPeakEndMin: 23 * 60,
  inflation: 1.21 // ניפוח קוט״ש לגבייה (1.21 = +21%)
};
// M24 (ביקורת 30.10): חלון הגבייה נגזר מקבועי ה־lib — מקור אחד ל"מה מחויב"
// ול"מתי החלונות רלוונטיים". חלון פיק הבעלים שונה במכוון (17:00) מחלון
// הגבייה (16:00) — לא לאחד ביניהם.
const PREM_S = typeof BILLING_PREMIUM_START_H !== "undefined" ? BILLING_PREMIUM_START_H : 16,
  PREM_E = typeof BILLING_PREMIUM_END_H !== "undefined" ? BILLING_PREMIUM_END_H : 23;
// M25: חלון הבעלים נגזר מ־DEFAULT_CONFIG — מקור אחד. (ברירות המחדל של
// החלון עצמו חיות ב־lib/ev-pricing.mjs מאז H12.)
let _configCache = { ...DEFAULT_CONFIG };
let _configListeners = [];
function getConfig() {
  return _configCache;
}
function getInflation() {
  const v = Number(getConfig().inflation);
  return v > 0 ? v : DEFAULT_CONFIG.inflation;
}
function inflationPctLabel() {
  return `+${Math.round((getInflation() - 1) * 100)}%`;
}
function persistConfig(cfg) {
  _configCache = { ..._configCache, ...cfg };
  _configListeners.forEach(fn => fn(_configCache));
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(_configCache)); } catch {}
  // M12+M13 (ביקורת 30.10): שינוי תעריפים מגובה לענן כמו כל שינוי נתונים,
  // ומטמון הענן מתעדכן לאותו ערך — שלא ישמור config ישן על חדש.
  if (typeof rememberCloudCache === "function") rememberCloudCache({ config: _configCache });
  if (typeof scheduleCloudSave === "function") scheduleCloudSave();
}
async function loadConfigFromStorage() {
  try {
    const v = localStorage.getItem(CONFIG_KEY);
    if (v) {
      _configCache = { ...DEFAULT_CONFIG, ...JSON.parse(v) };
      _configListeners.forEach(fn => fn(_configCache));
      if (typeof rememberCloudCache === "function") rememberCloudCache({ config: _configCache });
    }
  } catch {}
}
/**
 * חלון הפיק של עלות הבעלים (דקות מיום) — Wevo היא הקובעת: החלון נשמר
 * מהלוח החי בכל סנכרון, וברירת המחדל 17:00–23:00 משמשת רק עד המשיכה הראשונה.
 * endMin יכול לעבור 1440 כשהחלון חוצה חצות.
 * H12 (ביקורת 30.10): המימוש הטהור חי ב־lib/ev-pricing.mjs
 * (ownerPeakWindowFor); כאן רק ברירת־המחדל של התצורה הנוכחית.
 */
function ownerPeakWindow(cfg = getConfig()) {
  return ownerPeakWindowFor(cfg);
}

/* peakOverlapMinutes עבר ל־lib/ev-pricing.mjs (H12) — נחשף כגלובל מהבאנדל. */

/**
 * H12 (ביקורת 30.10): חישוב הטעינה חי ב־lib/ev-pricing.mjs
 * (calcSessionWithConfig) עם בדיקות יחידה ישירות — כולל תיקון M1 (עלות
 * בעלים לפי כל יום בנפרד, לא לפי יום ההתחלה בלבד). כאן רק מתאם שמזריק
 * את תצורת התמחור הנוכחית; כל הקריאות הקיימות לא השתנו.
 */
function calcSession(kwhRaw, startDt, endDt = null, forceReg = false, forcePrem = false, customRate = null) {
  return calcSessionWithConfig(getConfig(), kwhRaw, startDt, endDt, forceReg, forcePrem, customRate);
}

/** שעות פיק Wevo (עלות בעלים) — החלון מלוח Wevo החי, ימי חול בלבד */
/** M31 (ביקורת 30.10): חלקי־זמן בשעון ישראל — חלונות המטען חיים ב־Asia/Jerusalem
 * (כמו השומר בשרת), גם כשהטלפון בחו״ל; בעבר הפאנל השתמש בשעון המכשיר
 * והחלונות זזו בנסיעות. */
function jerusalemParts(d = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(d);
    const get = t => (parts.find(p => p.type === t) || {}).value;
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: dayMap[get("weekday")],
      minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute"))
    };
  } catch {
    return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  }
}

function isOwnerPeakNow(d = new Date()) {
  const jp = jerusalemParts(d);
  if (jp.day === 5 || jp.day === 6) return false;
  const m = jp.minutes;
  const w = ownerPeakWindow();
  if (m >= w.startMin && m < Math.min(w.endMin, 1440)) return true;
  return w.endMin > 1440 && m < w.endMin - 1440;
}

function timelineHintsFromOpenOrSession(o = {}) {
  return {
    plugInAt: o.plugInAt || o.startDate,
    plugOutAt: o.plugOutAt,
    chargeEndAt: o.chargeEndedAt || o.endDate,
    startDate: o.startDate || o.date,
    endDate: o.endDate || o.chargeEndedAt
  };
}

function liveChargeEstimate(state, client) {
  const kwh = state && state.totalEnergyKwh != null ? Number(state.totalEnergyKwh) : 0;
  const start = state && state.plugInTime ? new Date(state.plugInTime) : new Date();
  const still = stationStillCharging(state);
  const fullMs = still ? null : toMs(state && state.chargingFullTime);
  const endedHint = still ? null : state && state.chargeEndedAt ? toMs(state.chargeEndedAt) : null;
  const isFinishing = !still && state && String(state.state || "") === "Finishing";
  const end = fullMs
    ? new Date(fullMs)
    : endedHint
      ? new Date(endedHint)
      : isFinishing
        ? new Date()
        : new Date();
  const calc = calcSession(Math.max(0, kwh), start, end);
  const wevoCost = state && state.totalCost != null ? Math.round(Number(state.totalCost) * 100) / 100 : calc.costToOwner;
  const elec = state && state.electricityCost != null ? Math.round(Number(state.electricityCost) * 100) / 100 : null;
  return {
    kwh,
    calc,
    wevoCost,
    elec,
    isSelf: isSelfClient(client),
    start,
    end
  };
}

function estimateFromOpen(o, client) {
  return liveChargeEstimate({
    totalEnergyKwh: o.liveKwh,
    plugInTime: o.startDate,
    totalCost: o.liveWevoCost,
    electricityCost: o.liveElecCost,
    chargingFullTime: o.chargingFullTime,
    chargeEndedAt: o.chargeEndedAt || o.endDate,
    state: o.readyToComplete || o.wevoEnded ? "Finishing" : "Charging"
  }, client);
}

