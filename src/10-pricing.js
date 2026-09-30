/**
 * src/10-pricing.js — תמחור: ברירות מחדל, ניתנות לשינוי בהגדרות.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── תמחור: ברירות מחדל — ניתנות לשינוי בהגדרות ⚙️ ──────────────────────────
const DEFAULT_CONFIG = {
  ratePremium: 2.98,
  // גבייה 16:00–23:00
  rateRegular: 1.47,
  // גבייה שאר הזמן
  ownerPeak: 2.08,
  // עלות בעלים 17:00–23:00
  ownerOff: 0.87,
  // עלות בעלים שאר הזמן + שישי/שבת
  inflation: 1.21 // ניפוח קוט״ש לגבייה (1.21 = +21%)
};
const PREM_S = 16,
  PREM_E = 23;
const OWNER_PS = 17,
  OWNER_PE = 23;
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
  try { localStorage.setItem("ev_config", JSON.stringify(_configCache)); } catch {}
}
async function loadConfigFromStorage() {
  try {
    const v = localStorage.getItem("ev_config");
    if (v) {
      _configCache = { ...DEFAULT_CONFIG, ...JSON.parse(v) };
      _configListeners.forEach(fn => fn(_configCache));
    }
  } catch {}
}
function calcSession(kwhRaw, startDt, endDt = null, forceReg = false, forcePrem = false, customRate = null) {
  const cfg = getConfig();
  const start = startDt instanceof Date ? startDt : new Date(startDt);
  const end = endDt ? endDt instanceof Date ? endDt : new Date(endDt) : start;
  const kwhInflated = Math.round(kwhRaw * getInflation());
  let rate,
    premiumRatio = 0,
    isMixed = false;
  if (customRate && customRate > 0) {
    rate = customRate;
  } else if (forceReg) {
    rate = cfg.rateRegular;
  } else if (forcePrem) {
    rate = cfg.ratePremium;
    premiumRatio = 1;
  } else {
    const sh = start.getHours() + start.getMinutes() / 60;
    const eh = end.getHours() + end.getMinutes() / 60;
    const totalMin = Math.max((end - start) / 60000, 1);
    // Handle midnight crossing
    let premH = 0;
    if (sh < eh) {
      premH = Math.max(0, Math.min(eh, PREM_E) - Math.max(sh, PREM_S));
    } else {
      const premBefore = Math.max(0, PREM_E - Math.max(sh, PREM_S));
      const premAfter = Math.max(0, Math.min(eh, PREM_E) - PREM_S);
      premH = premBefore + premAfter;
    }
    premiumRatio = Math.min(1, premH * 60 / totalMin);
    if (premiumRatio > 0 && premiumRatio < 1) {
      isMixed = true;
      rate = Math.round((cfg.ratePremium * premiumRatio + cfg.rateRegular * (1 - premiumRatio)) * 1000) / 1000;
    } else if (premiumRatio >= 1) {
      rate = cfg.ratePremium;
    } else {
      const h = start.getHours();
      if (h >= PREM_S && h < PREM_E) {
        rate = cfg.ratePremium;
        premiumRatio = 1;
      } else {
        rate = cfg.rateRegular;
      }
    }
  }
  const amountBilled = Math.ceil(kwhInflated * rate);

  // Owner cost: Friday/Saturday flat, else weighted with midnight crossing
  const day = start.getDay();
  const isWeekend = day === 5 || day === 6;
  const sh2 = start.getHours() + start.getMinutes() / 60;
  const eh2 = end.getHours() + end.getMinutes() / 60;
  const totalOwnerMin = Math.max((end - start) / 60000, 1);
  let ownerRate;
  if (isWeekend) {
    ownerRate = cfg.ownerOff;
  } else {
    let peakOwnerMin = 0;
    if (sh2 < eh2) {
      peakOwnerMin = Math.max(0, Math.min(eh2, OWNER_PE) - Math.max(sh2, OWNER_PS)) * 60;
    } else {
      const b = Math.max(0, OWNER_PE - Math.max(sh2, OWNER_PS)) * 60;
      const a = Math.max(0, Math.min(eh2, OWNER_PE) - OWNER_PS) * 60;
      peakOwnerMin = b + a;
    }
    const peakRatio = Math.min(1, peakOwnerMin / totalOwnerMin);
    ownerRate = cfg.ownerPeak * peakRatio + cfg.ownerOff * (1 - peakRatio);
  }
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

/** שעות יקרות Wevo (עלות בעלים) — ימי חול 17:00–23:00 */
function isOwnerPeakNow(d = new Date()) {
  const day = d.getDay();
  if (day === 5 || day === 6) return false;
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= OWNER_PS && h < OWNER_PE;
}

/** שעות פרימיום לגבייה מלקוחות — 16:00–23:00 */
function isBillingPeakNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= PREM_S && h < PREM_E;
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

