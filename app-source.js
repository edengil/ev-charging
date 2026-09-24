var useState=React.useState;var useEffect=React.useEffect;var useMemo=React.useMemo;var useCallback=React.useCallback;var useRef=React.useRef;

// ── Eden Gil Studio mark (personal brand — reuse in every app) ─────────────
// Mark = EG seal (product-agnostic). Subtitle = current app name.
function BrandMark({
  size = 40
}) {
  const uid = React.useId ? React.useId().replace(/:/g, "") : Math.random().toString(36).slice(2, 8);
  const ink = "egInk_" + uid;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-label": "Eden Gil",
    role: "img",
    style: {
      flexShrink: 0,
      display: "block",
      filter: "drop-shadow(0 2px 8px rgba(15, 118, 110, 0.28))"
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: ink,
    x1: "8",
    y1: "4",
    x2: "56",
    y2: "60",
    gradientUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("stop", {
    stopColor: "#0f766e"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "0.55",
    stopColor: "#115e59"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#134e4a"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "32",
    r: "30",
    fill: `url(#${ink})`
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "32",
    r: "26.5",
    stroke: "rgba(255,255,255,0.16)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#fff",
    d: "M15.5 20h14.2c.85 0 1.45.55 1.45 1.35v1.55c0 .8-.6 1.35-1.45 1.35H19.4v4.35h8.6c.8 0 1.35.5 1.35 1.25v1.4c0 .75-.55 1.25-1.35 1.25h-8.6v4.55h10.5c.85 0 1.45.55 1.45 1.35v1.55c0 .8-.6 1.35-1.45 1.35H15.5c-.85 0-1.45-.55-1.45-1.35V21.35c0-.8.6-1.35 1.45-1.35z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#fff",
    d: "M47.8 22.1c-2.2-2.55-5.55-4.05-9.3-4.05-7.35 0-12.85 5.35-12.85 13.05S31.15 44.1 38.5 44.1c3.55 0 6.75-1.3 9.05-3.55.55-.55.55-1.4.05-1.9l-1.45-1.4c-.5-.5-1.3-.5-1.8.05-1.55 1.5-3.55 2.3-5.85 2.3-4.55 0-7.7-3.2-7.7-7.95s3.15-7.95 7.7-7.95c2.2 0 4.1.75 5.55 2.1.45.4 1.15.4 1.6-.05l1.5-1.5c.5-.5.5-1.3 0-1.8z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#fff",
    d: "M48.2 31.2h-7.4c-.85 0-1.45.6-1.45 1.4v1.7c0 .8.6 1.4 1.45 1.4H45v3.35c0 .75.55 1.3 1.3 1.3h1.55c.75 0 1.3-.55 1.3-1.3V32.6c0-.8-.6-1.4-1.4-1.4z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50.5",
    cy: "47.5",
    r: "2.2",
    fill: "#f59e0b"
  }));
}

function BrandLogo({
  size = 40,
  subtitle = null,
  compact = false
}) {
  const titleSize = size >= 44 ? 20 : size >= 40 ? 18 : 15;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(BrandMark, {
    size: size
  }), !compact && /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      lineHeight: 1.05
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Outfit', 'Sora', sans-serif",
      fontWeight: 800,
      fontSize: titleSize,
      letterSpacing: "-0.04em",
      color: "#134e4a"
    }
  }, "Eden Gil"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Outfit', 'Heebo', sans-serif",
      fontWeight: 600,
      fontSize: size >= 40 ? 10.5 : 10,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#94a3b8",
      marginTop: 5,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, subtitle || "Studio")));
}

// ── תמחור: ברירות מחדל — ניתנות לשינוי בהגדרות ⚙️ ──────────────────────────
const DEFAULT_CONFIG = {
  ratePremium: 2.98,
  // גביה 16:00–23:00
  rateRegular: 1.47,
  // גביה שאר הזמן
  ownerPeak: 2.08,
  // עלות בעלים 17:00–23:00
  ownerOff: 0.87,
  // עלות בעלים שאר הזמן + שישי/שבת
  inflation: 1.21 // ניפוח קוט״ש לגביה (1.21 = +21%)
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

/** שעות פרימיום לגביה מלקוחות — 16:00–23:00 */
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

// ── Storage: localStorage + גיבוי ענן (PIN) ────────────────────────────────
const CLOUD_PIN_KEY = "ev_cloud_pin";
const CLOUD_UPDATED_KEY = "ev_cloud_updated";
const CLOUD_STATUS_KEY = "ev_cloud_status";
const WEVO_LOG_KEY = "ev_wevo_action_log";
let _cloudSaveTimer = null;
let _cloudSaveHook = null; // () => snapshot | null — נקבע מ-App
let _cloudStatusHook = null; // (status) => void — רענון UI
let _alertHook = null; // (msg, type?, ms?) => void
/** מצב אחרון שנכתב ל־localStorage — מקור אמת לשמירת ענן (לא React refs שיכולים להיות ישנים) */
let _cloudDataCache = {
  clients: null,
  sessions: null,
  payments: null,
  openSess: null,
  config: undefined
};
let _lastUploadedCounts = null;

function rememberCloudCache(partial = {}) {
  if (partial.clients != null) _cloudDataCache.clients = partial.clients;
  if (partial.sessions != null) _cloudDataCache.sessions = partial.sessions;
  if (partial.payments != null) _cloudDataCache.payments = partial.payments;
  if (partial.openSess != null) _cloudDataCache.openSess = partial.openSess;
  if (partial.config !== undefined) _cloudDataCache.config = partial.config;
}

/** מיזוג / נרמול / כפילויות / יתרה / עובר־ושב — מ־lib/ev-money (מוזרק לפני הקובץ) */

function buildCloudSnapFromCache() {
  const fromHook = typeof _cloudSaveHook === "function" ? _cloudSaveHook() : null;
  const cfgFallback = typeof _configCache !== "undefined" ? _configCache : null;
  return buildCloudSnapFromParts(_cloudDataCache, fromHook, cfgFallback);
}

/** עטיפה — מוסיפה את מונה ההעלאה האחרונה למניעת מחיקת ענן */
function cloudSnapWouldWipe(snap) {
  return isDangerousEmptyCloudSnap(snap, _lastUploadedCounts);
}

function appAlert(msg, t = "info", ms = 4500) {
  if (_alertHook) _alertHook(msg, t, ms);
}

const _notifySeen = new Map();
let _notifyClickHook = null;
let _queuedNotifyTag = null;
function notifyPhone(title, body, tag = "ev") {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const key = `${tag}|${title}|${body}`;
  const prev = _notifySeen.get(tag);
  const now = Date.now();
  if (prev && prev.key === key && now - prev.at < 10 * 60 * 1000) return;
  _notifySeen.set(tag, { key, at: now });
  const opts = { body, tag, lang: "he", dir: "rtl", renotify: true, data: { tag } };
  const fallback = () => {
    try {
      const n = new Notification(title, opts);
      n.onclick = () => {
        try { window.focus(); } catch {}
        if (typeof _notifyClickHook === "function") _notifyClickHook(tag);
      };
    } catch {}
  };
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg && reg.showNotification) reg.showNotification(title, opts).catch(fallback);
        else fallback();
      }).catch(fallback);
      return;
    }
  } catch {}
  fallback();
}

function ensureNotifyPermission() {
  if (typeof Notification === "undefined") return Promise.resolve("unsupported");
  if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

function installAppServiceWorker() {
  try {
    if (!navigator.serviceWorker) return;
    if (location.protocol === "file:") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  } catch {}
}

function dataSyncUrl() {
  try {
    const custom = localStorage.getItem("ev_data_sync_url");
    if (custom) return custom;
  } catch {}
  return "/api/data-sync";
}

async function cloudApi(action, extra = {}) {
  const res = await fetch(dataSyncUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `שגיאת גיבוי (${res.status})`);
  }
  return data;
}

function getCloudPin() {
  try {
    return localStorage.getItem(CLOUD_PIN_KEY) || "";
  } catch {
    return "";
  }
}

function setCloudPin(pin) {
  try {
    if (pin) localStorage.setItem(CLOUD_PIN_KEY, pin);
    else localStorage.removeItem(CLOUD_PIN_KEY);
  } catch {}
}

function getCloudStatus() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_STATUS_KEY) || "null") || {
      lastOk: null,
      lastErr: null,
      lastErrAt: null
    };
  } catch {
    return {
      lastOk: null,
      lastErr: null,
      lastErrAt: null
    };
  }
}

function setCloudStatus(patch) {
  try {
    const next = {
      ...getCloudStatus(),
      ...patch
    };
    localStorage.setItem(CLOUD_STATUS_KEY, JSON.stringify(next));
    if (_cloudStatusHook) _cloudStatusHook(next);
  } catch {}
}

function pushWevoLog(kind, msg, ok = true) {
  try {
    const list = JSON.parse(localStorage.getItem(WEVO_LOG_KEY) || "[]");
    const row = {
      kind: String(kind || "info"),
      msg: String(msg || ""),
      ok: !!ok,
      at: Date.now()
    };
    // לא לשכפל אותה הודעה ברצף (30 דקות) — מונע ספאם ביומן
    const dup = list.find(x => x && x.kind === row.kind && x.msg === row.msg && row.at - (x.at || 0) < 30 * 60 * 1000);
    if (dup) return;
    list.unshift(row);
    localStorage.setItem(WEVO_LOG_KEY, JSON.stringify(list.slice(0, 24)));
  } catch {}
}

function getWevoLog() {
  try {
    const list = JSON.parse(localStorage.getItem(WEVO_LOG_KEY) || "[]") || [];
    // ניקוי ספאם ישן של השהיה/מצבים שחוזרים על עצמם
    const noisy = /השהיית טעינה|ממתין להקצאה|מהירות נמוכה|Boost פעיל/;
    const cleaned = [];
    const seen = new Set();
    for (const row of list) {
      if (!row) continue;
      if (noisy.test(String(row.msg || ""))) {
        const key = `${row.kind}|${row.msg}`;
        if (seen.has(key)) continue;
        seen.add(key);
      }
      cleaned.push(row);
    }
    if (cleaned.length !== list.length) {
      try {
        localStorage.setItem(WEVO_LOG_KEY, JSON.stringify(cleaned.slice(0, 24)));
      } catch {}
    }
    return cleaned;
  } catch {
    return [];
  }
}

function secsToHm(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor(s % 3600 / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function wevoStopReasonHe(r) {
  const key = String(r || "");
  const map = {
    Remote: "עצירה מרחוק",
    EVDisconnected: "ניתוק רכב",
    Local: "עצירה מקומית",
    PowerLoss: "הפסקת חשמל",
    SoftReset: "איפוס רך",
    HardReset: "איפוס קשיח",
    EmergencyStop: "עצירת חירום",
    Other: "אחר"
  };
  return map[key] || key || "";
}

function wevoSolarHe(t) {
  const key = String(t || "");
  const map = {
    NOT_RESTRICTED: "בלי הגבלת שמש",
    SOLAR_ONLY: "רק משמש",
    SOLAR_PREFERRED: "עדיפות לשמש",
    GRID_ONLY: "רק מהרשת"
  };
  return map[key] || key || "";
}

function wevoOriginHe(o) {
  const key = String(o || "");
  if (/mobile/i.test(key)) return "אפליקציה";
  if (/rfid/i.test(key)) return "RFID";
  if (/remote/i.test(key)) return "מרחוק";
  return key || "";
}

function scheduleCloudSave() {
  if (!getCloudPin()) return;
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(async () => {
    try {
      const snap = buildCloudSnapFromCache();
      if (!snap) return;
      if (cloudSnapWouldWipe(snap)) {
        console.warn("cloud save skipped — empty snapshot would wipe data", {
          payments: (snap.payments || []).length,
          sessions: (snap.sessions || []).length,
          clients: (snap.clients || []).length,
          prev: _lastUploadedCounts
        });
        setCloudStatus({
          lastErr: "גיבוי נדחה — מניעת מחיקת נתונים",
          lastErrAt: Date.now()
        });
        return;
      }
      const r = await cloudApi("save", { pin: getCloudPin(), data: snap });
      const okAt = r.updatedAt || Date.now();
      try {
        localStorage.setItem(CLOUD_UPDATED_KEY, String(okAt));
      } catch {}
      _lastUploadedCounts = {
        payments: (snap.payments || []).length,
        sessions: (snap.sessions || []).length,
        clients: (snap.clients || []).length
      };
      setCloudStatus({
        lastOk: okAt,
        lastErr: null,
        lastErrAt: null
      });
    } catch (e) {
      console.warn("cloud save failed", e && e.message);
      setCloudStatus({
        lastErr: e && e.message || "שגיאת גיבוי",
        lastErrAt: Date.now()
      });
    }
  }, 1200);
}

const DB = {
  async get(k) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  async set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      try {
        if (typeof _alertHook === "function") {
          _alertHook("השמירה במכשיר נכשלה. הנתונים נשארים במסך ומגובים לענן אם יש PIN.", "err", 6000);
        }
      } catch {}
    }
    if (k === "ev_clients") rememberCloudCache({ clients: v });
    else if (k === "ev_sessions") rememberCloudCache({ sessions: v });
    else if (k === "ev_payments") rememberCloudCache({ payments: v });
    else if (k === "ev_open") rememberCloudCache({ openSess: v });
    scheduleCloudSave();
  }
};

// ── Utils ──────────────────────────────────────────────────────────────────
const ils = n => `₪${Number(n).toFixed(0)}`;
const ilsFull = n => `₪${Number(n).toFixed(2)}`;
const fdate = d => new Date(d).toLocaleDateString("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit"
});
const ftime = d => new Date(d).toLocaleTimeString("he-IL", {
  hour: "2-digit",
  minute: "2-digit"
});
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

/** יצרני רכב — סמלים מקבצים ב־/brand/cars (Simple Icons / Wikimedia) */
const CAR_BRANDS = [
  { id: "hyundai", label: "יונדאי", color: "#002C5F", aliases: ["hyundai", "יונדאי", "היונדאי", "ioniq", "איוניק", "איוניק5", "ioniq5", "ioniq 5", "kona", "קונה"] },
  { id: "kia", label: "קיה", color: "#05141F", aliases: ["kia", "קיה", "ev6", "ev9", "niro", "נירו", "soul"] },
  { id: "tesla", label: "טסלה", color: "#CC0000", aliases: ["tesla", "טסלה", "model 3", "model y", "model s", "model x", "מודל"] },
  { id: "byd", label: "BYD", color: "#D70C19", aliases: ["byd", "אטו", "atto", "seal", "dolphin", "דולפין", "han", "tang"] },
  { id: "mg", label: "MG", color: "#A21017", aliases: ["mg", "אם ג׳י", "zs ev", "mg4", "mg5"] },
  { id: "vw", label: "פולקסווגן", color: "#1A1F71", aliases: ["vw", "volkswagen", "פולקסווגן", "id.3", "id.4", "id.5", "id3", "id4"] },
  { id: "cupra", label: "קופרה", color: "#1A1A1A", aliases: ["cupra", "קופרה", "born"], logoId: "vw" },
  { id: "skoda", label: "סקודה", color: "#4BA82E", aliases: ["skoda", "škoda", "סקודה", "enyaq", "אניאק"] },
  { id: "bmw", label: "BMW", color: "#1C69D4", aliases: ["bmw", "במוו", "i4", "ix", "iX3"] },
  { id: "mercedes", label: "מרצדס", color: "#333333", aliases: ["mercedes", "מרצדס", "benz", "eqa", "eqb", "eqc", "eqe", "eqs"] },
  { id: "audi", label: "אאודי", color: "#000000", aliases: ["audi", "אאודי", "אודי", "e-tron", "etron", "q4"] },
  { id: "toyota", label: "טויוטה", color: "#EB0A1E", aliases: ["toyota", "טויוטה", "bz4x", "prius"] },
  { id: "peugeot", label: "פיג׳ו", color: "#000000", aliases: ["peugeot", "פיג׳ו", "פיג'ו", "e-208", "e-2008"] },
  { id: "renault", label: "רנו", color: "#FFCC33", aliases: ["renault", "רנו", "megane e-tech", "zoe", "זואי"] },
  { id: "volvo", label: "וולוו", color: "#003057", aliases: ["volvo", "וולוו", "xc40", "ex30", "ex90"] },
  { id: "polestar", label: "פולסטאר", color: "#000000", aliases: ["polestar", "פולסטאר", "polestar 2"] },
  { id: "nissan", label: "ניסאן", color: "#C3002F", aliases: ["nissan", "ניסאן", "leaf", "ליף", "ariya"] },
  { id: "ford", label: "פורד", color: "#003478", aliases: ["ford", "פורד", "mustang mach", "mach-e"] },
  { id: "chevrolet", label: "שברולט", color: "#D4A017", aliases: ["chevrolet", "chevy", "שברולט", "bolt"] },
  { id: "geely", label: "ג׳ילי", color: "#5A666E", aliases: ["geely", "גילי", "ג׳ילי", "ג'ילי", "zeekr", "זיקר"] },
  { id: "geometry", label: "גאומטרי", color: "#5A666E", aliases: ["geometry", "גאומטרי", "גאומטרי c", "geometry c"], logoId: "geely" }
];

function normalizeCarText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['׳’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findCarBrand(query) {
  const q = normalizeCarText(query);
  if (!q) return null;
  const compact = q.replace(/[\s\-_.]/g, "");
  for (const b of CAR_BRANDS) {
    if (b.id === q || normalizeCarText(b.label) === q) return b;
    for (const a of b.aliases) {
      const na = normalizeCarText(a);
      if (!na) continue;
      if (q.includes(na) || compact.includes(na.replace(/[\s\-_.]/g, "")) || na.includes(q)) return b;
    }
  }
  return null;
}

function resolveClientCarBrand(client) {
  if (!client) return null;
  return findCarBrand(client.carBrand) || findCarBrand(client.carModel) || findCarBrand([client.carBrand, client.carModel].filter(Boolean).join(" "));
}

function carBrandLogoCandidates(brand) {
  if (!brand) return [];
  const id = brand.logoId || brand.id;
  const list = [`/brand/cars/${id}.svg`, `/brand/cars/${brand.id}.svg`, `/brand/cars/${id}.png`, `/brand/cars/${brand.id}.png`];
  if (id === "geometry" || brand.id === "geometry") list.push("/brand/cars/geely.svg");
  return [...new Set(list)];
}

function formatClientCarLine(client) {
  if (!client) return "";
  const brand = resolveClientCarBrand(client);
  const parts = [];
  if (brand) parts.push(brand.label);
  else if (client.carBrand) parts.push(client.carBrand);
  if (client.carModel) parts.push(client.carModel);
  if (client.carPlate) parts.push(client.carPlate);
  return parts.join(" · ");
}

function ClientAvatar({
  client,
  size = 40,
  fontSize = 17
}) {
  const brand = resolveClientCarBrand(client);
  const candidates = carBrandLogoCandidates(brand);
  const [srcIdx, setSrcIdx] = useState(0);
  const letter = client && client.name ? String(client.name).trim().charAt(0) || "?" : "?";
  const logo = brand && srcIdx < candidates.length ? candidates[srcIdx] : null;
  useEffect(() => {
    setSrcIdx(0);
  }, [brand && brand.id, client && client.id]);
  if (logo) {
    const pad = Math.max(4, Math.round(size * 0.12));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        border: "1.5px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,.06)",
        padding: pad
      },
      title: brand ? brand.label : "",
      "data-testid": "client-avatar-brand"
    }, /*#__PURE__*/React.createElement("img", {
      src: logo,
      alt: brand.label,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block"
      },
      onError: () => setSrcIdx(i => i + 1)
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: S.ava(size, fontSize),
    "data-testid": "client-avatar-letter"
  }, letter);
}

/* METHODS / payments helpers: lib/ev-money via inject */
function addMinutes(dtStr, mins) {
  if (!dtStr || !mins) return dtStr;
  const [dp, tp] = dtStr.split("T");
  const [y, mo, d] = dp.split("-").map(Number);
  const [h, m] = tp.split(":").map(Number);
  const tot = h * 60 + m + Number(mins),
    days = Math.floor(tot / 1440),
    rem = tot % 1440;
  const nh = Math.floor(rem / 60),
    nm = rem % 60;
  const dt = new Date(y, mo - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
function toLocalDT(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

/** המרה ל-ms ממספר Wevo / ISO / datetime-local */
function toMs(v) {
  if (v == null || v === "" || v === 0) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
  const d = new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * ארבע נקודות זמן לטעינה:
 * חיבור כבל → התחלת זרם → סיום זרם → הוצאת כבל
 */
function resolveChargeTimeline(tx = {}, hints = {}) {
  const plugInMs = toMs(hints.plugInAt || hints.plugInTime || tx.plugInTime);
  const plugOutMs = toMs(hints.plugOutAt || hints.plugOutTime || tx.plugOutTime);
  const netSec = Number(hints.netDuration != null ? hints.netDuration : tx.netDuration) || 0;
  const fullMs = toMs(hints.chargingFullTime || tx.chargingFullTime || hints.chargeEndedAt);
  const liveStartMs = toMs(hints.chargeStartedAt || tx.chargeStartedAt);

  let chargeEndMs = null;
  if (fullMs && (!plugInMs || fullMs >= plugInMs)) {
    chargeEndMs = fullMs;
  } else if (hints.chargeEndedAt) {
    chargeEndMs = toMs(hints.chargeEndedAt);
  } else if (plugInMs && plugOutMs && netSec > 0) {
    const connectedSec = Math.max(0, (plugOutMs - plugInMs) / 1000);
    const idleSec = Math.max(0, connectedSec - netSec);
    // המתנה ארוכה לפני זרם → סיום קרוב לניתוק; כבל אחרי סיום → חיבור+נטו
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

  const toLocal = ms => ms != null ? toLocalDT(ms) : null;
  return {
    plugInAt: toLocal(plugInMs),
    chargeStartAt: toLocal(chargeStartMs),
    chargeEndAt: toLocal(chargeEndMs),
    plugOutAt: toLocal(plugOutMs),
    plugInMs,
    chargeStartMs,
    chargeEndMs,
    plugOutMs,
    netMins: netSec > 0 ? Math.round(netSec / 60) : 0,
    billMins: plugInMs && chargeEndMs ? Math.max(1, Math.round((chargeEndMs - plugInMs) / 60000)) : netSec > 0 ? Math.round(netSec / 60) : 0
  };
}

/** תאימות לאחור — חלון ברירת מחדל: חיבור → סיום טעינה */
function resolveBillingWindow(tx = {}, hints = {}) {
  const t = resolveChargeTimeline(tx, hints);
  return {
    plugInAt: t.plugInAt,
    chargeEndAt: t.chargeEndAt,
    plugOutAt: t.plugOutAt,
    billMins: t.billMins,
    netMins: t.netMins,
    plugInMs: t.plugInMs,
    chargeEndMs: t.chargeEndMs,
    plugOutMs: t.plugOutMs,
    chargeStartAt: t.chargeStartAt,
    chargeStartMs: t.chargeStartMs
  };
}

const TIMELINE_LABELS = {
  plugIn: "חיבור כבל",
  chargeStart: "התחלת טעינה בפועל",
  chargeEnd: "סיום טעינה בפועל",
  plugOut: "הוצאת כבל"
};

function timelinePoints(tl) {
  if (!tl) return [];
  return [
    { key: "plugIn", label: TIMELINE_LABELS.plugIn, at: tl.plugInAt },
    { key: "chargeStart", label: TIMELINE_LABELS.chargeStart, at: tl.chargeStartAt },
    { key: "chargeEnd", label: TIMELINE_LABELS.chargeEnd, at: tl.chargeEndAt },
    { key: "plugOut", label: TIMELINE_LABELS.plugOut, at: tl.plugOutAt }
  ].filter(p => !!p.at);
}

function pointAt(tl, key) {
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
    default: {
      const _exhaustive = key;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * בוחר צירוף התחלה/סיום עם הסכום הגבוה ביותר (פרימיום וכו').
 * startKeys / endKeys אופציונליים — ברירת מחדל כל הנקודות הזמינות.
 */
function pickMaxBillWindow(kwh, tl, opts = {}) {
  const points = timelinePoints(tl);
  if (!points.length || !(kwh > 0)) return null;
  const startKeys = opts.startKeys || points.map(p => p.key);
  const endKeys = opts.endKeys || points.map(p => p.key);
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
      const sm = toMs(start);
      const em = toMs(end);
      if (sm == null || em == null || em <= sm) continue;
      const calc = calcSession(kwh, new Date(sm), new Date(em), forceReg, forcePrem, customRate);
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

function formatTimelineClock(at) {
  if (!at) return "—";
  const local = asLocalDT(at) || String(at);
  try {
    return `${fdate(local)} ${ftime(local)}`;
  } catch {
    return formatClock(local);
  }
}

function formatClock(dtLocal) {
  if (!dtLocal) return "—";
  const s = asLocalDT(dtLocal) || String(dtLocal);
  return s.length >= 16 ? s.slice(11, 16) : s;
}
function waLink(phone, text) {
  let p = (phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "972" + p.slice(1);
  // api.whatsapp.com אמין יותר מ-wa.me למילוי טקסט מראש באייפון/PWA
  const q = new URLSearchParams();
  if (p) q.set("phone", p);
  q.set("text", text || "");
  return `https://api.whatsapp.com/send?${q.toString()}`;
}

function isStandalonePwa() {
  try {
    if (typeof navigator !== "undefined" && navigator.standalone === true) return true;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }
  } catch {}
  return false;
}

let _setWaDraft = null;

/** טיוטה בתוך האפליקציה. כלום לא נשלח עד שלוחצים במפורש. */
function openWaDraft({
  phone = "",
  text = "",
  name = ""
} = {}) {
  if (_setWaDraft) {
    _setWaDraft({
      phone: phone || "",
      text: text || "",
      name: name || ""
    });
  }
}

async function copyDraftText(text) {
  const value = text || "";
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}
  try {
    const el = document.querySelector("[data-testid=wa-draft-text]");
    if (el) {
      el.focus();
      el.select();
      return document.execCommand("copy");
    }
  } catch {}
  return false;
}

function WaDraftSheet() {
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    _setWaDraft = value => {
      setCopied(false);
      setDraft(value);
    };
    return () => {
      if (_setWaDraft) _setWaDraft = null;
    };
  }, []);
  if (!draft) return null;
  const hasPhone = !!(draft.phone && String(draft.phone).replace(/\D/g, ""));
  return /*#__PURE__*/React.createElement("div", {
    "data-testid": "wa-draft",
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 80,
      background: "rgba(15, 23, 42, 0.45)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      padding: 12
    },
    onClick: () => setDraft(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 480,
      background: "#fff",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 12px 40px rgba(15,23,42,0.2)"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontWeight: 800, fontSize: 16, marginBottom: 4 }
  }, "טיוטה", draft.name ? ` · ${draft.name}` : ""), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, color: "#64748b", lineHeight: 1.45, marginBottom: 10 }
  }, "כלום לא נשלח. אפשר לערוך, להעתיק, ורק אם מחליטים לפתוח וואטסאפ — השליחה נשארת אצלך."), /*#__PURE__*/React.createElement("textarea", {
    "data-testid": "wa-draft-text",
    value: draft.text,
    onChange: e => setDraft({ ...draft, text: e.target.value }),
    rows: 6,
    style: {
      width: "100%",
      boxSizing: "border-box",
      border: "1.5px solid #cbd5e1",
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      lineHeight: 1.45,
      fontFamily: "inherit",
      resize: "vertical"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 8, marginTop: 12 }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "wa-draft-copy",
    onClick: async () => {
      const ok = await copyDraftText(draft.text);
      setCopied(!!ok);
    },
    style: {
      flex: 1,
      background: copied ? "#d1fae5" : "#0f766e",
      color: copied ? "#047857" : "#fff",
      border: "none",
      borderRadius: 10,
      padding: "11px",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer"
    }
  }, copied ? "הועתק" : "העתק"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "wa-draft-open",
    disabled: !hasPhone,
    onClick: () => {
      if (!hasPhone) return;
      openWhatsApp(draft.phone, draft.text);
    },
    style: {
      flex: 1,
      background: hasPhone ? "#ecfdf5" : "#f1f5f9",
      color: hasPhone ? "#047857" : "#94a3b8",
      border: hasPhone ? "1.5px solid #6ee7b7" : "1.5px solid #e2e8f0",
      borderRadius: 10,
      padding: "11px",
      fontWeight: 800,
      fontSize: 14,
      cursor: hasPhone ? "pointer" : "not-allowed"
    }
  }, "פתח וואטסאפ")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "wa-draft-close",
    onClick: () => setDraft(null),
    style: {
      width: "100%",
      marginTop: 8,
      background: "#f8fafc",
      color: "#334155",
      border: "1.5px solid #e2e8f0",
      borderRadius: 10,
      padding: "10px",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer"
    }
  }, "סגור")));
}

/** פתיחת וואטסאפ בלי להרוג את ה-PWA באייפון (מסך לבן בחזרה) */
function openWhatsApp(phone, text) {
  const url = waLink(phone, text);
  try {
    localStorage.setItem("ev_ext_leave", String(Date.now()));
    sessionStorage.setItem("ev_ext_leave", String(Date.now()));
  } catch {}
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        a.remove();
      } catch {}
    }, 500);
  } catch {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = url;
    }
  }
}

/** אחרי חזרה מוואטסאפ/אפליקציה חיצונית — רענון אם ה-PWA נתקע על מסך לבן */
function installPwaReturnRecovery() {
  let reloading = false;
  const clearLeave = () => {
    try {
      localStorage.removeItem("ev_ext_leave");
      sessionStorage.removeItem("ev_ext_leave");
    } catch {}
  };
  const leftAt = () => {
    try {
      return Number(sessionStorage.getItem("ev_ext_leave") || localStorage.getItem("ev_ext_leave") || 0);
    } catch {
      return 0;
    }
  };
  const maybeReload = () => {
    if (reloading) return;
    const t = leftAt();
    if (!t) return;
    // רק תוך 30 דקות מהיציאה לוואטסאפ
    if (Date.now() - t > 30 * 60 * 1000) {
      clearLeave();
      return;
    }
    reloading = true;
    clearLeave();
    window.location.reload();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setTimeout(maybeReload, 80);
  });
  window.addEventListener("pageshow", () => setTimeout(maybeReload, 80));
  window.addEventListener("focus", () => setTimeout(maybeReload, 120));
}

function formatDurMins(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}:${String(r).padStart(2, "0")}`;
}

function minsBetweenLocal(start, end) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 60000);
}

/** מיון לקוחות לפי כמה טעינות בחודש הנוכחי (תדירות) */
function clientsByMonthlyFrequency(clients, sessions) {
  const now = new Date();
  const mo = now.getMonth();
  const yr = now.getFullYear();
  const counts = {};
  (sessions || []).forEach(s => {
    if (!s || !s.clientId) return;
    const d = new Date(s.date);
    if (isNaN(d.getTime())) return;
    if (d.getMonth() === mo && d.getFullYear() === yr) {
      counts[s.clientId] = (counts[s.clientId] || 0) + 1;
    }
  });
  return [...(clients || [])].sort((a, b) => {
    const ca = counts[a.id] || 0;
    const cb = counts[b.id] || 0;
    if (cb !== ca) return cb - ca;
    return String(a.name || "").localeCompare(String(b.name || ""), "he");
  }).map(c => ({
    ...c,
    monthChargeCount: counts[c.id] || 0
  }));
}

// ── Wevo sync helpers ──────────────────────────────────────────────────────
function wevoSyncUrl() {
  try {
    const custom = localStorage.getItem("ev_wevo_sync_url");
    if (custom) return custom;
  } catch {}
  return "/api/wevo-sync";
}

function getWevoCreds() {
  try {
    return JSON.parse(localStorage.getItem("ev_wevo_creds") || "{}");
  } catch {
    return {};
  }
}

const WEVO_AUTH_INTENT_KEY = "ev_wevo_preauth";
const WEVO_AUTH_INTENT_EVENT = "ev-wevo-auth-intent";
function getWevoAuthIntent() {
  try {
    return normalizeWevoAuthIntent(JSON.parse(localStorage.getItem(WEVO_AUTH_INTENT_KEY) || "null"));
  } catch {
    return null;
  }
}
function setWevoAuthIntent(v) {
  try {
    const next = normalizeWevoAuthIntent(v);
    if (next) localStorage.setItem(WEVO_AUTH_INTENT_KEY, JSON.stringify(next));
    else localStorage.removeItem(WEVO_AUTH_INTENT_KEY);
    try {
      window.dispatchEvent(new CustomEvent(WEVO_AUTH_INTENT_EVENT, { detail: next }));
    } catch {}
  } catch {}
}

/** חימוש אישור מראש מלקוח בדשבורד (מחוץ לפאנל Wevo). */
function armWevoClientPreauth(clientId, opts = {}) {
  if (!clientId) return null;
  const next = normalizeWevoAuthIntent({
    clientId,
    mode: "first-auth",
    armedAt: Date.now(),
    queued: false,
    lastAttemptAt: null,
    lastError: null,
    attempts: 0
  });
  setWevoAuthIntent(next);
  if (!opts.silent) {
    appAlert("אישור מראש פעיל — כשיתחבר רכב נאשר חיבור ונשייך ללקוח", "ok", 5200);
  }
  return next;
}
function clearWevoClientPreauth(reason) {
  setWevoAuthIntent(null);
  if (reason) {
    try {
      pushWevoLog("preauth", reason, true);
    } catch {}
  }
}

async function wevoApi(action, extra = {}) {
  const creds = getWevoCreds();
  if (!creds.email || !creds.password) {
    const err = new Error("NO_CREDS");
    throw err;
  }
  const res = await fetch(wevoSyncUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
      action,
      ...extra
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `שגיאת שרת (${res.status})`);
  }
  return data;
}

let _liveStationSnap = null;
function rememberLiveStation(st) {
  _liveStationSnap = st && typeof st === "object" ? st : null;
}
function readLiveStation() {
  return _liveStationSnap;
}

/** חותמת סיום רק כשהעמדה כבר לא בטעינה. chargingFullTime באמצע טעינה אינו סיום. */
function liveChargeEndStamp(st, existing, plugMs) {
  if (stationStillCharging(st)) return null;
  const fullMs = toMs(st && st.chargingFullTime);
  if (fullMs && (!plugMs || fullMs >= plugMs)) return toLocalDT(fullMs);
  if (existing && existing.chargeEndedAt && (!plugMs || toMs(existing.chargeEndedAt) >= plugMs)) {
    return existing.chargeEndedAt;
  }
  return null;
}

function clearFinishedIfStillCharging(payload, st) {
  if (!stationStillCharging(st)) return payload;
  return {
    ...payload,
    chargeEndedAt: null,
    endDate: null,
    plugOutAt: null,
    readyToComplete: false,
    wevoEnded: false
  };
}

/** אותה עסקה, גם אם סומנה בטעות כמוכנה לאישור בזמן שהעמדה עדיין טוענת. */
function findLiveTxnOpen(opens, st) {
  const txn = st && st.transactionId != null && String(st.transactionId) !== "" ? String(st.transactionId) : null;
  if (!txn) return findActiveWevoOpen(opens, st);
  const list = (opens || []).filter(o => wevoOpenTxnId(o) === txn);
  return list.find(o => !o.readyToComplete && !o.wevoEnded) || list[0] || null;
}

function wevoStateLabel(state) {
  const map = {
    Available: "רכב לא מחובר",
    Preparing: "מחובר — ממתין לאישור",
    Charging: "בטעינה",
    SuspendedEV: "מושהה (רכב)",
    SuspendedEVSE: "מושהה (מטען)",
    Finishing: "מסיים טעינה",
    Occupied: "תפוס",
    Reserved: "שמור",
    Unavailable: "לא זמין",
    Faulted: "תקלה"
  };
  return map[state] || state || "לא ידוע";
}

/** הסבר קצר למצבים מבלבלים במטען חי */
function wevoStateHint(st) {
  if (!st) return "";
  const s = String(st.state || "");
  const kw = st.rateKw != null ? Number(st.rateKw) : null;
  if (st.isWaitingAllocation) {
    return "ממתין להקצאת הספק בבניין — המהירות עלולה להיות נמוכה.";
  }
  // delayCharge ב-Wevo = הגדרת תזמון/השהיה קיימת, לא בהכרח שהטעינה עצורה עכשיו
  if (st.delayCharge && (s === "SuspendedEVSE" || s === "Preparing") && (kw == null || kw < 0.3)) {
    return "הטעינה מושהית כרגע (תזמון/השהיה ב-Wevo).";
  }
  if (st.waitingAuthorize || s === "Preparing" || s === "Occupied") {
    return "רכב מחובר — ממתין לאישור טעינה במטען.";
  }
  if (s === "SuspendedEV") {
    return "מושהה מצד הרכב (סוללה מלאה / הגבלת רכב).";
  }
  if (s === "SuspendedEVSE") {
    return "מושהה מצד המטען — ניהול עומסים / תעריף / הגבלה.";
  }
  if (s === "Charging" && kw != null && kw > 0 && kw < 1.5) {
    return "מהירות נמוכה — הרכב, הקצאה או השהיה מגבילים הספק כרגע.";
  }
  if (s === "Finishing") {
    return "מסיים טעינה — עוד רגע אפשר לאשר ולשמור.";
  }
  if (s === "Faulted") {
    return "תקלה במטען — כדאי לבדוק גם באפליקציית Wevo.";
  }
  return "";
}

function txnIdFromNotes(notes) {
  const m = String(notes || "").match(/txn#(\d+)/i);
  return m ? m[1] : null;
}

/** מוצא טעינה פתוחה משויכת למטען חי — לא ממזג txn חדש לתוך טעינה ישנה */
function findActiveWevoOpen(opens, stOrTxn) {
  const txn = stOrTxn && typeof stOrTxn === "object"
    ? stOrTxn.transactionId != null ? String(stOrTxn.transactionId) : null
    : stOrTxn != null && stOrTxn !== "" ? String(stOrTxn) : null;
  return findMatchingWevoOpen(opens, txn);
}

/**
 * סוגר טעינות פעילות עם txn שונה מהחי — התראה בלי לחסום פתיחת חדשה.
 * מחזיר כמה נסגרו.
 */
function sealConflictingWevoOpens(opens, liveState, onUpsertOpen, clients, alertedSet, prevState) {
  if (!liveState || typeof onUpsertOpen !== "function") return 0;
  const liveTxn = liveState.transactionId != null ? String(liveState.transactionId) : null;
  let conflicts = listConflictingWevoOpens(opens, liveTxn);
  // חיבור חדש אחרי idle, לפני txn — כל open פעיל עם txn ישן נחשב סתור
  if (!conflicts.length && !liveTxn) {
    const nowFresh =
      !!(liveState.waitingAuthorize || liveState.connected) &&
      String(liveState.state || "") !== "Charging";
    const wasIdle =
      !prevState ||
      (!prevState.connected &&
        !prevState.charging &&
        !prevState.waitingAuthorize &&
        String(prevState.state || "") !== "Charging");
    if (nowFresh && wasIdle) {
      conflicts = (opens || []).filter(o => isActiveWevoOpen(o) && wevoOpenTxnId(o) != null);
    }
  }
  for (const old of conflicts) {
    const endedAt = old.chargeEndedAt || old.endDate || toLocalDT(new Date());
    onUpsertOpen({
      ...old,
      readyToComplete: true,
      wevoEnded: true,
      endDate: old.endDate || endedAt,
      chargeEndedAt: old.chargeEndedAt || endedAt
    }, {
      silent: true
    });
    if (alertedSet && old.id && !alertedSet.has(`seal:${old.id}`)) {
      alertedSet.add(`seal:${old.id}`);
      const cl = (clients || []).find(c => c.id === old.clientId);
      const name = cl && cl.name || "לקוח";
      pushWevoLog("ready", `${name}: טעינה ישנה לא נסגרה — סומנה לאישור (חיבור חדש)`, true);
      appAlert(`יש טעינה שלא נסגרה ל־${name} — אפשר לאשר מהבאנר. נפתחת טעינה חדשה.`, "info", 7000);
    }
  }
  return conflicts.map(o => o.id);
}

function txToEndFields(tx, fallback = {}) {
  const kwh = Number(tx && tx.totalEnergyKwh != null ? tx.totalEnergyKwh : fallback.liveKwh) || 0;
  const cost = tx && tx.totalCost != null
    ? Math.round(Number(tx.totalCost) * 100) / 100
    : fallback.liveWevoCost != null ? Number(fallback.liveWevoCost) : null;
  const elec = tx && tx.electricityCost != null
    ? Math.round(Number(tx.electricityCost) * 100) / 100
    : fallback.liveElecCost != null ? Number(fallback.liveElecCost) : null;
  const tl = resolveChargeTimeline(tx || {}, {
    plugInAt: fallback.startDate || fallback.plugInAt,
    plugOutAt: fallback.plugOutAt,
    chargeEndedAt: fallback.chargeEndedAt || fallback.endDate,
    chargeStartedAt: fallback.chargeStartedAt,
    chargingFullTime: fallback.chargingFullTime || (tx && tx.chargingFullTime),
    netDuration: tx && tx.netDuration != null ? tx.netDuration : fallback.netDuration
  });
  const maxWin = kwh > 0 ? pickMaxBillWindow(kwh, tl) : null;
  const start = maxWin && maxWin.start || tl.plugInAt || fallback.startDate || null;
  const plugOutEnd = tl.plugOutAt || null;
  const end = maxWin && maxWin.end || tl.chargeEndAt || fallback.endDate || plugOutEnd || toLocalDT(new Date());
  const durMins = maxWin && maxWin.mins || (start && end ? minsBetweenLocal(start, end) : tl.billMins) || 0;
  return {
    kwh,
    cost,
    elec,
    end,
    start,
    durMins,
    plugOutEnd,
    chargeEndAt: tl.chargeEndAt || end,
    chargeStartAt: tl.chargeStartAt,
    plugInAt: tl.plugInAt || start,
    plugOutAt: tl.plugOutAt,
    timeline: tl,
    billStartKey: maxWin && maxWin.startKey || "plugIn",
    billEndKey: maxWin && maxWin.endKey || "chargeEnd",
    netMins: tl.netMins,
    avgRateKW: tx && tx.avgRateKW != null ? Number(tx.avgRateKW) : fallback.avgRateKW != null ? Number(fallback.avgRateKW) : null,
    maxRateKW: tx && tx.maxRateKW != null ? Number(tx.maxRateKW) : fallback.maxRateKW != null ? Number(fallback.maxRateKW) : null,
    stopReason: tx && tx.stopReason || fallback.stopReason || null,
    origin: tx && (tx.originStr || tx.origin) || fallback.origin || null,
    didCompleteFull: !!(tx && tx.didCompleteFull),
    isBoost: !!(tx && tx.isBoost),
    chargingCost: tx && tx.chargingCost != null ? Math.round(Number(tx.chargingCost) * 100) / 100 : null
  };
}

/** אם כבר datetime-local — לא לעטוף ב-Date (מונע הזזת שעה) */
function asLocalDT(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    return v.slice(0, 16);
  }
  const d = new Date(typeof v === "number" ? v : v);
  if (isNaN(d.getTime())) return "";
  return toLocalDT(d);
}

/** מוצא עסקת Wevo שהסתיימה עבור טעינה פתוחה */
function matchFinishedWevoTx(transactions, open) {
  const list = (transactions || []).filter(t => t && !t.isOngoing);
  if (!list.length) return null;
  const tid = open && (open.wevoTxnId != null ? String(open.wevoTxnId) : txnIdFromNotes(open.notes));
  if (tid) {
    const exact = list.find(t => String(t.transactionId) === tid);
    if (exact) return exact;
  }
  const startMs = open && open.startDate ? new Date(open.startDate).getTime() : NaN;
  if (!isNaN(startMs)) {
    const near = list
      .map(t => ({
        t,
        dt: Math.abs((Number(t.plugInTime) || 0) - startMs)
      }))
      .filter(x => x.dt <= 30 * 60 * 1000)
      .sort((a, b) => a.dt - b.dt);
    if (near.length) return near[0].t;
  }
  // בלי txn ובלי חלון זמן — לא לייבא את העסקה האחרונה. היא עלולה להיות טעינה שכבר נשמרה.
  return null;
}

/** שולף מ-Wevo שעת סיום + קוט״ש סופי לטעינה פתוחה */
async function fetchWevoFinalForOpen(open, opts = {}) {
  const retries = opts.retries != null ? opts.retries : 3;
  const gapMs = opts.gapMs != null ? opts.gapMs : 1500;
  let lastFields = null;
  for (let i = 0; i < retries; i++) {
    try {
      const sync = await wevoApi("sync");
      const tx = matchFinishedWevoTx(sync.transactions || [], open);
      if (tx) {
        const fields = txToEndFields(tx, open);
        lastFields = {
          ...fields,
          wevoTxnId: tx.transactionId != null ? String(tx.transactionId) : open.wevoTxnId
        };
        if (fields.kwh > 0 && fields.end) return lastFields;
      }
    } catch (e) {
      if (i === retries - 1 && !lastFields) throw e;
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, gapMs));
  }
  return lastFields;
}

function isSelfClient(c) {
  if (!c) return false;
  if (c.self === true) return true;
  return /עדן/.test(c.name) && (/עצמי/.test(c.name) || /🔒/.test(c.name));
}

function selfClientIds(clients) {
  return new Set((clients || []).filter(isSelfClient).map(c => c.id));
}

/** טעינות לקוחות בלבד — בלי עדן/עצמי (לממוצעים והשוואת רווח עסקי) */
function isNeighborSession(s, selfIds) {
  if (!s) return false;
  if (s.selfPaid) return false;
  if (selfIds && selfIds.has(s.clientId)) return false;
  return true;
}

/** רווח מצטבר מתחילת החודש עד יום D (כולל), ללא טעינות עצמי */
function profitMonthToDay(sessions, clients, y, m, day) {
  const selfIds = selfClientIds(clients);
  return (sessions || []).reduce((a, s) => {
    if (!isNeighborSession(s, selfIds)) return a;
    const d = new Date(s.date);
    if (isNaN(d) || d.getFullYear() !== y || d.getMonth() !== m || d.getDate() > day) return a;
    return a + (Number(s.profit) || 0);
  }, 0);
}

/** עדן (עצמי): רק עלות בפועל, בלי ניפוח / פרימיום / תוספות — יורד באשראי */
function billingForClient(calc, client, {
  adjust = 0,
  actualCost
} = {}) {
  if (!calc) return null;
  if (isSelfClient(client)) {
    const cost = Math.round(Number(actualCost != null ? actualCost : calc.costToOwner) * 100) / 100;
    const kwhRaw = Number(calc.kwhRaw) || 0;
    return {
      ...calc,
      costToOwner: cost,
      kwhInflated: kwhRaw,
      amountBilled: cost,
      profit: 0,
      rate: kwhRaw > 0 ? Math.round(cost / kwhRaw * 1000) / 1000 : 0,
      rateLabel: "אשראי (עלות בפועל)",
      premiumRatio: 0,
      isMixed: false,
      selfPaid: true
    };
  }
  const adj = Number(adjust) || 0;
  const cost = actualCost != null && !isNaN(Number(actualCost))
    ? Math.round(Number(actualCost) * 100) / 100
    : calc.costToOwner;
  const billed = calc.amountBilled + adj;
  return {
    ...calc,
    costToOwner: cost,
    amountBilled: billed,
    profit: Math.round((billed - cost) * 100) / 100
  };
}

/** תצוגה מקדימה מעריכת טעינה — הערכים השמורים, בלי חישוב מחדש */
function previewFromSession(s) {
  if (!s) return null;
  return {
    kwhRaw: Number(s.kwhRaw) || 0,
    kwhInflated: Number(s.kwhInflated) || 0,
    premiumRatio: Number(s.premiumRatio) || 0,
    isMixed: !!s.isMixed,
    rate: Number(s.rate) || 0,
    amountBilled: Number(s.amountBilled) || 0,
    costToOwner: Number(s.costToOwner) || 0,
    profit: Number(s.profit) || 0,
    rateLabel: s.rateLabel || "",
    ownerRate: s.ownerRate,
    selfPaid: !!s.selfPaid
  };
}

function initialEditDuration(session) {
  if (!session) return "";
  if (Number(session.durMin) > 0) return formatDurMins(session.durMin);
  if (session.endDate && session.date) {
    const m = minsBetweenLocal(session.date, session.endDate);
    if (m > 0) return formatDurMins(m);
  }
  return "";
}

function repairSelfSessions(clients, sessions) {
  let changed = false;
  const out = (sessions || []).map(s => {
    const c = (clients || []).find(x => x.id === s.clientId);
    if (!isSelfClient(c)) return s;
    const cost = Math.round(Number(s.costToOwner) * 100) / 100;
    const billed = Math.round(Number(s.amountBilled) * 100) / 100;
    const kwhRaw = Number(s.kwhRaw) || 0;
    if (billed === cost && Number(s.profit) === 0 && s.selfPaid) return s;
    changed = true;
    return {
      ...s,
      kwhInflated: kwhRaw || s.kwhInflated,
      amountBilled: cost,
      profit: 0,
      rate: kwhRaw > 0 ? Math.round(cost / kwhRaw * 1000) / 1000 : s.rate,
      rateLabel: "אשראי (עלות בפועל)",
      premiumRatio: 0,
      isMixed: false,
      selfPaid: true
    };
  });
  return {
    sessions: out,
    changed
  };
}

function findEdenClient(clients) {
  return clients.find(c => isSelfClient(c)) || clients.find(c => /עדן/.test(c.name) && (/עצמי/.test(c.name) || /🔒/.test(c.name))) || clients.find(c => /עדן/.test(c.name));
}

/** פרטי רכב ידועים לשכנים — נמרחים בטעינת נתונים */
function applyKnownClientCars(clients) {
  let changed = false;
  const out = (clients || []).map(c => {
    if (!c || !c.name) return c;
    const patch = knownCarPatchForName(c.name, isSelfClient(c));
    if (!patch) return c;
    const next = {
      carBrand: patch.carBrand || c.carBrand || "",
      carModel: patch.carModel ? patch.carModel : c.carModel || "",
      carPlate: patch.carPlate ? patch.carPlate : c.carPlate || ""
    };
    if (c.carBrand === next.carBrand && (c.carPlate || "") === next.carPlate && (c.carModel || "") === next.carModel) {
      return c;
    }
    changed = true;
    return {
      ...c,
      ...next
    };
  });
  return {
    clients: out,
    changed
  };
}

/* clientBalance/hasDebt/hasCredit: lib/ev-money via inject */
/** הודעת וואטסאפ אחרי טעינה — לפי חוב / יתרת זכות / מסולק */
function waChargeMessage(amountBilled, balance, {
  isSelf = false
} = {}) {
  const charge = Math.round(Number(amountBilled) || 0);
  if (isSelf) {
    return `היי מה קורה?\nיצא לך ${charge}`;
  }
  const bal = Number(balance) || 0;
  if (hasDebt(bal)) {
    return `היי מה קורה?\nיצא בטעינה ${charge}\nאנחנו על ${Math.round(bal)}`;
  }
  if (hasCredit(bal)) {
    return `היי מה קורה?\nיצא לך ${charge}\nיש לך אצלי ${Math.round(Math.abs(bal))}`;
  }
  return `היי מה קורה?\nיצא לך ${charge}`;
}

/** תזכורת חוב בלי להיכנס לכרטיס — עם סכום הטעינה האחרונה אם יש */
function waDebtPing(balance, lastAmount) {
  const bal = Math.round(Number(balance) || 0);
  const charge = Math.round(Number(lastAmount) || 0);
  if (charge > 0) return waChargeMessage(charge, bal);
  return `היי מה קורה?\nאנחנו על ${bal}`;
}

// לדיבוג/בדיקות E2E
try {
  if (typeof window !== "undefined") {
    window.__EV_WA__ = { waChargeMessage, waDebtPing, waLink, openWaDraft, hasDebt, hasCredit };
    window.__EV_MONEY__ = typeof __EV_MONEY__ !== "undefined" ? __EV_MONEY__ : null;
  }
} catch {}

function formatBalanceText(balance, {
  isSelf = false
} = {}) {
  if (isSelf) return "אשראי ✓";
  const bal = Number(balance) || 0;
  if (hasDebt(bal)) return `חוב: ${ils(bal)}`;
  if (hasCredit(bal)) return `יתרת זכות ${ils(Math.abs(bal))}`;
  return "מסולק ✓";
}
function balanceColor(balance, isSelf) {
  if (isSelf) return "#0ea5c6";
  if (hasDebt(balance)) return "#f59e0b";
  if (hasCredit(balance)) return "#059669";
  return "#10b981";
}
function balanceBadgeStyle(balance, isSelf) {
  if (isSelf) {
    return {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      padding: "3px 8px",
      background: "#e0f2fe",
      color: "#0369a1"
    };
  }
  if (hasCredit(balance)) {
    return {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      padding: "3px 8px",
      background: "#d1fae5",
      color: "#047857",
      border: "1px solid #6ee7b7"
    };
  }
  return S.balBadge(hasDebt(balance));
}
function balanceSumLabel(balance, isSelf) {
  if (isSelf) return "סטטוס";
  if (hasCredit(balance)) return "יתרת זכות";
  if (hasDebt(balance)) return "יתרת חוב";
  return "יתרה";
}
function balanceSumVal(balance, isSelf) {
  if (isSelf) return "אשראי ✓";
  if (hasCredit(balance)) return ils(Math.abs(balance));
  return ils(balance);
}

/** ארכיון לקוחות לא פעילים — ברירת מחדל חודש אחד */
const ARCHIVE_INACTIVE_MS = 30 * 24 * 60 * 60 * 1000;

function clientLastActivityMs(clientId, sessions, openSess) {
  let max = 0;
  (sessions || []).forEach(s => {
    if (s.clientId !== clientId) return;
    const t = new Date(s.date).getTime();
    if (t > max) max = t;
  });
  (openSess || []).forEach(o => {
    if (o.clientId !== clientId) return;
    const t = new Date(o.endDate || o.startDate || 0).getTime();
    if (t > max) max = t;
  });
  return max > 0 ? max : null;
}

function isClientArchived(c) {
  return !!(c && c.archived);
}

/** לא פעיל לפי תאריך טעינה אחרונה — עדן אף פעם לא נחשב לא פעיל */
function isClientInactive(c, lastActivityMs, nowMs = Date.now()) {
  if (!c || isSelfClient(c)) return false;
  if (!lastActivityMs) return false; // לקוח חדש בלי טעינות — נשאר ברשימה
  return nowMs - lastActivityMs > ARCHIVE_INACTIVE_MS;
}

/** מוסתר מדשבורד: בארכיון ידני, או לא פעיל אוטומטית — אלא אם שוחזר ידנית (archived: false) */
function hideClientFromDashboard(c, lastActivityMs) {
  if (!c || isSelfClient(c)) return false;
  if (c.archived === true) return true;
  if (c.archived === false) return false; // שוחזר מהארכיון — נשאר גלוי
  return isClientInactive(c, lastActivityMs);
}

function mergeWevoTransactions(clients, sessions, transactions, openSess = []) {
  let clientsOut = [...clients];
  let eden = findEdenClient(clientsOut);
  let edenCreated = false;
  if (!eden) {
    eden = {
      id: uid(),
      name: "עדן (עצמי) 🔒",
      phone: "",
      notes: "אשראי Wevo — ללא חוב",
      self: true
    };
    clientsOut.push(eden);
    edenCreated = true;
  }

  const linked = new Set();
  const wevoIds = new Set();
  const sameChargeWindowMs = 36 * 60 * 60 * 1000;
  sessions.forEach(s => {
    const id = chargeTxnId(s);
    if (!id) return;
    if (s.source === "wevo-sync") wevoIds.add(String(id));
    else linked.add(String(id));
  });

  let added = 0,
    skipped = 0,
    tagged = 0,
    pendingApprove = 0;
  const newSessions = [];
  const openByTxn = {};
  (openSess || []).forEach(o => {
    if (o.wevoTxnId != null) openByTxn[String(o.wevoTxnId)] = o;
    const fromNotes = txnIdFromNotes(o.notes);
    if (fromNotes) openByTxn[fromNotes] = o;
  });
  const closedOpenIds = new Set();
  const openUpdates = {};
  const addWevoRow = tx => {
    const tid = String(tx.transactionId);
    if (wevoIds.has(tid)) return false;
    const rowKwh = Number(tx.totalEnergyKwh) || 0;
    if (!(rowKwh > 0)) return false;
    const rowCost = Math.round(Number(tx.totalCost) * 100) / 100;
    const rowElec = Math.round(Number(tx.electricityCost) * 100) / 100;
    const rowOpen = openByTxn[tid];
    const rowWin = resolveChargeTimeline(tx, {
      chargeEndedAt: rowOpen && rowOpen.chargeEndedAt,
      chargeStartedAt: rowOpen && rowOpen.chargeStartedAt,
      chargingFullTime: rowOpen && rowOpen.chargingFullTime
    });
    const rowMax = rowKwh > 0 ? pickMaxBillWindow(rowKwh, rowWin) : null;
    const rowStart = rowMax && rowMax.start || rowWin.plugInAt || toLocalDT(new Date(tx.plugInTime));
    const rowEnd = rowMax && rowMax.end || rowWin.chargeEndAt || (tx.plugOutTime ? toLocalDT(new Date(tx.plugOutTime)) : rowStart);
    const rowDur = rowMax && rowMax.mins
      ? rowMax.mins
      : rowWin.billMins > 0
        ? rowWin.billMins
        : tx.netDuration > 0
          ? Math.round(Number(tx.netDuration) / 60)
          : tx.plugOutTime && tx.plugInTime
            ? Math.round((tx.plugOutTime - tx.plugInTime) / 60000)
            : 0;
    const rowCalc = calcSession(rowKwh, rowStart, rowEnd);
    newSessions.push({
      id: uid(),
      clientId: eden.id,
      date: rowStart,
      kwhRaw: rowKwh,
      kwhInflated: rowCalc.kwhInflated,
      premiumRatio: rowCalc.premiumRatio,
      isMixed: rowCalc.isMixed,
      rate: rowCalc.rate,
      amountBilled: rowCost,
      costToOwner: rowCost,
      profit: 0,
      rateLabel: rowCalc.rateLabel,
      source: "wevo-sync",
      notes: `txn#${tid}`,
      durMin: rowDur,
      electricityCost: rowElec,
      avgRateKW: tx.avgRateKW != null ? Number(tx.avgRateKW) : null,
      maxRateKW: tx.maxRateKW != null ? Number(tx.maxRateKW) : null,
      stopReason: tx.stopReason || null,
      wevoOrigin: tx.originStr || tx.origin || null,
      didCompleteFull: !!tx.didCompleteFull,
      isBoost: !!tx.isBoost,
      chargingCost: tx.chargingCost != null ? Math.round(Number(tx.chargingCost) * 100) / 100 : null
    });
    wevoIds.add(tid);
    added++;
    return true;
  };

  const sessionsOut = sessions.map(s => {
    if (chargeTxnId(s)) return s;
    const d = new Date(s.date);
    const kwh = Number(s.kwhRaw) || 0;
    const tx = (transactions || []).find(t => {
      if (!t || t.isOngoing || linked.has(String(t.transactionId))) return false;
      const plugIn = new Date(t.plugInTime);
      const dtMin = Math.abs(d - plugIn) / 60000;
      const dk = Math.abs((Number(t.totalEnergyKwh) || 0) - kwh);
      if (dtMin <= 20 && dk <= 0.15) return true;
      const cost = Math.round(Number(t.totalCost) * 100) / 100;
      const sc = Number(s.costToOwner);
      const dtMs = Math.abs(d - plugIn);
      return kwh > 0 && dk <= 0.05 && Number.isFinite(sc) && Math.abs(cost - sc) <= 0.05 && dtMs <= sameChargeWindowMs;
    });
    if (!tx) return s;
    linked.add(String(tx.transactionId));
    tagged++;
    const tag = `txn#${tx.transactionId}`;
    const notes = s.notes ? `${s.notes} | ${tag}` : tag;
    const cost = Math.round(Number(tx.totalCost) * 100) / 100;
    return {
      ...s,
      notes,
      wevoTxnId: String(tx.transactionId),
      costToOwner: cost || s.costToOwner,
      profit: Math.round((s.amountBilled - (cost || s.costToOwner)) * 100) / 100
    };
  });

  for (const tx of transactions || []) {
    if (!tx || tx.isOngoing) {
      skipped++;
      continue;
    }
    const tid = String(tx.transactionId);
    if (linked.has(tid)) {
      if (openByTxn[tid]) closedOpenIds.add(openByTxn[tid].id);
      if (!addWevoRow(tx)) skipped++;
      continue;
    }
    const openMatch = openByTxn[tid];
    const kwh = Number(tx.totalEnergyKwh) || 0;
    const cost = Math.round(Number(tx.totalCost) * 100) / 100;
    const elec = Math.round(Number(tx.electricityCost) * 100) / 100;
    const win = resolveChargeTimeline(tx, {
      chargeEndedAt: openMatch && openMatch.chargeEndedAt,
      chargeStartedAt: openMatch && openMatch.chargeStartedAt,
      chargingFullTime: openMatch && openMatch.chargingFullTime
    });
    const maxWin = kwh > 0 ? pickMaxBillWindow(kwh, win) : null;
    const start = maxWin && maxWin.start || win.plugInAt || toLocalDT(new Date(tx.plugInTime));
    const end = maxWin && maxWin.end || win.chargeEndAt || (tx.plugOutTime ? toLocalDT(new Date(tx.plugOutTime)) : start);
    const durMin = maxWin && maxWin.mins
      ? maxWin.mins
      : win.billMins > 0
        ? win.billMins
        : tx.netDuration > 0
          ? Math.round(Number(tx.netDuration) / 60)
          : tx.plugOutTime && tx.plugInTime
            ? Math.round((tx.plugOutTime - tx.plugInTime) / 60000)
            : 0;

    // טעינה ששויכה ללקוח — ממלאים סיום+קוט״ש וממתינים לאישור ידני (גם אם הקוט״ש עוד 0 זמנית)
    if (openMatch && openMatch.clientId) {
      const kwhUse = kwh > 0 ? kwh : Number(openMatch.liveKwh) || 0;
      const calc = maxWin && kwhUse > 0 ? maxWin.calc : calcSession(Math.max(kwhUse, 0.001), start, end);
      const cl = clientsOut.find(x => x.id === openMatch.clientId);
      const billedCalc = billingForClient(calc, cl, {
        actualCost: cost
      }) || calc;
      openUpdates[openMatch.id] = {
        liveKwh: kwhUse > 0 ? kwhUse : openMatch.liveKwh != null ? openMatch.liveKwh : kwh,
        liveWevoCost: cost || openMatch.liveWevoCost,
        liveElecCost: elec || openMatch.liveElecCost,
        endDate: end,
        startDate: openMatch.startDate || start,
        plugInAt: openMatch.plugInAt || win.plugInAt || start,
        chargeStartedAt: win.chargeStartAt || openMatch.chargeStartedAt || null,
        chargeEndedAt: win.chargeEndAt || end,
        plugOutAt: win.plugOutAt || openMatch.plugOutAt || null,
        billStartKey: maxWin && maxWin.startKey || "plugIn",
        billEndKey: maxWin && maxWin.endKey || (win.chargeEndAt ? "chargeEnd" : "plugOut"),
        netDuration: tx.netDuration != null ? Number(tx.netDuration) : openMatch.netDuration,
        wevoTxnId: tid,
        readyToComplete: true,
        wevoEnded: true,
        liveBilled: isSelfClient(cl) ? null : kwhUse > 0 ? billedCalc.amountBilled : openMatch.liveBilled,
        liveRate: kwhUse > 0 ? billedCalc.rate : openMatch.liveRate,
        liveRateLabel: kwhUse > 0 ? billedCalc.rateLabel : openMatch.liveRateLabel,
        liveProfit: isSelfClient(cl) ? 0 : kwhUse > 0 ? billedCalc.profit : openMatch.liveProfit,
        notes: openMatch.notes && String(openMatch.notes).includes(`txn#${tid}`)
          ? openMatch.notes
          : openMatch.notes
            ? `${openMatch.notes} | txn#${tid}`
            : `txn#${tid}`
      };
      linked.add(tid);
      pendingApprove++;
      addWevoRow(tx);
      continue;
    }

    if (kwh <= 0) {
      skipped++;
      continue;
    }
    const plugMs = Number(tx.plugInTime) || new Date(tx.plugInTime).getTime() || 0;
    const alreadySaved = sessionsOut.some(s => {
      if (s.source === "wevo-sync") return false;
      if (chargeTxnId(s) === tid) return true;
      if (!savedSessionMatchesCharge(s, {
        transactionId: tid,
        kwhRaw: kwh,
        costToOwner: cost
      })) return false;
      const sessionMs = new Date(s.date).getTime();
      if (!Number.isFinite(sessionMs) || !plugMs) return true;
      return Math.abs(plugMs - sessionMs) <= sameChargeWindowMs;
    });
    if (alreadySaved) {
      linked.add(tid);
      if (openByTxn[tid]) closedOpenIds.add(openByTxn[tid].id);
      if (!addWevoRow(tx)) skipped++;
      continue;
    }
    if (!addWevoRow(tx)) skipped++;
  }

  const sessionsMerged = dedupeSessionsByTxn([...newSessions, ...sessionsOut]);
  const openOut = dropOpensAlreadySaved((openSess || []).map(o => openUpdates[o.id] ? {
    ...o,
    ...openUpdates[o.id]
  } : o).filter(o => !closedOpenIds.has(o.id)), sessionsMerged);

  return {
    clients: clientsOut,
    sessions: sessionsMerged,
    openSess: openOut,
    added,
    skipped,
    tagged,
    closedOpen: closedOpenIds.size,
    pendingApprove,
    edenCreated,
    fetched: (transactions || []).length
  };
}

// ── OCR Text Parser ────────────────────────────────────────────────────────
function parseChargeText(raw) {
  let s = raw.trim();
  if (!s) return {
    error: ""
  };
  let durMin = 0;
  const lines0 = s.split(/[\n\r]+/);
  for (const ln of lines0) {
    const hmsuf = ln.match(/(\d+):(\d+)\s*(?:h|שעות?)/i);
    const hm = !hmsuf && ln.match(/(\d+)\s*(?:h|שעות?)\s*(\d+)\s*(?:m|דק)?/i);
    const honly = !hmsuf && !hm && ln.match(/(\d+\.?\d*)\s*(?:h|שעות?)/i);
    if (hmsuf) {
      durMin = parseInt(hmsuf[1]) * 60 + parseInt(hmsuf[2]);
      s = s.replace(hmsuf[0], " ");
      break;
    }
    if (hm) {
      durMin = parseInt(hm[1]) * 60 + parseInt(hm[2]);
      s = s.replace(hm[0], " ");
      break;
    }
    if (honly) {
      durMin = Math.round(parseFloat(honly[1]) * 60);
      s = s.replace(honly[0], " ");
      break;
    }
  }
  let kwhVal = null;
  for (const ln of s.split(/[\n\r]+/)) {
    if (/קו[טו]|kwh/i.test(ln)) {
      const m = ln.match(/(\d+\.?\d*)/);
      if (m) {
        kwhVal = parseFloat(m[1]);
        break;
      }
    }
    const inline = ln.match(/(\d+\.?\d*)\s*(?:קו[טו]|kwh)/i);
    if (inline) {
      kwhVal = parseFloat(inline[1]);
      break;
    }
  }
  if (kwhVal === null) return {
    error: 'לא נמצא קוט"ש — ודא שהטקסט מכיל מספר + קוטש'
  };
  const tm = s.match(/(\d{1,2}):(\d{2})\s*(אחה["״צ]?|בערב|בלילה|pm)/i) || s.match(/(\d{1,2}):(\d{2})\s*(בצהריים)/i) || s.match(/(\d{1,2}):(\d{2})/);
  let timeStr = "00:00";
  if (tm) {
    let h = parseInt(tm[1]),
      m = parseInt(tm[2]);
    const suf = (tm[3] || "").toLowerCase();
    if (/אחה|בערב|בלילה|pm/.test(suf) && h < 12) h += 12;
    timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const now = new Date();
  const base = new Date();
  let ds = null;
  for (let mi = 0; mi < MONTHS.length; mi++) {
    const mo = raw.match(new RegExp("(\\d{1,2})\\s*" + MONTHS[mi]));
    if (mo) {
      ds = `${now.getFullYear()}-${String(mi + 1).padStart(2, "0")}-${String(parseInt(mo[1])).padStart(2, "0")}`;
      break;
    }
  }
  if (!ds) {
    if (/שלשום/i.test(raw)) {
      base.setDate(base.getDate() - 2);
    } else if (/אתמול|yesterday/i.test(raw)) {
      base.setDate(base.getDate() - 1);
    } else {
      const exp = raw.match(/(?<!\d:)(?<![:\d])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\d)/);
      if (exp) {
        const dd = parseInt(exp[1]),
          mm = parseInt(exp[2]) - 1;
        const yy = exp[3] ? parseInt(exp[3].length === 2 ? "20" + exp[3] : exp[3]) : now.getFullYear();
        const ed = new Date(yy, mm, dd);
        ds = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, "0")}-${String(ed.getDate()).padStart(2, "0")}`;
      }
    }
    if (!ds) ds = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  }
  const amtM = raw.match(/[₪]\s*(\d+\.?\d*)/) || raw.match(/(\d+\.\d+)\s*[₪]/);
  const appAmt = amtM ? parseFloat(amtM[1]) : null;
  return {
    kwh: kwhVal,
    startDt: `${ds}T${timeStr}`,
    durMin,
    appAmt
  };
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#f8faff",
    fontFamily: "'Heebo', sans-serif",
    direction: "rtl",
    maxWidth: 500,
    margin: "0 auto"
  },
  header: {
    background: "linear-gradient(180deg, #ffffff 0%, #f0fafc 100%)",
    borderBottom: "1px solid #d9eef5",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 12px rgba(14,165,198,0.08)"
  },
  hInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    gap: 10
  },
  hTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a"
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#0ea5c6",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    padding: "4px 10px",
    borderRadius: 8,
    fontFamily: "inherit"
  },
  main: {
    padding: "16px 16px 48px"
  },
  sumRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  sumCard: {
    flex: 1,
    background: "#fff",
    borderRadius: 14,
    padding: "12px 8px",
    display: "flex",
    alignItems: "center",
    gap: 7,
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)"
  },
  sumIcon: {
    fontSize: 18
  },
  sumVal: {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: -0.5
  },
  sumLbl: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2
  },
  actRow: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap"
  },
  actBtn: {
    flex: 1,
    minWidth: 60,
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    padding: "11px 4px",
    cursor: "pointer"
  },
  quietBtn: {
    flex: "1 1 108px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    color: "#334155",
    fontWeight: 600,
    fontSize: 13,
    padding: "10px 8px",
    cursor: "pointer",
    fontFamily: "inherit"
  },
  secTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 10
  },
  cGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  cCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    cursor: "pointer"
  },
  cTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  ava(sz = 38, fs = 16) {
    return {
      width: sz,
      height: sz,
      borderRadius: "50%",
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: fs,
      flexShrink: 0
    };
  },
  cName: {
    fontWeight: 700,
    fontSize: 15
  },
  cMeta: {
    fontSize: 11,
    color: "#9ca3af"
  },
  balBadge(d) {
    return {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      padding: "3px 8px",
      background: d ? "#fef3c7" : "#d1fae5",
      color: d ? "#b45309" : "#065f46"
    };
  },
  miniStats: {
    display: "flex",
    flexWrap: "wrap"
  },
  mStat: {
    flex: "0 0 33.33%",
    textAlign: "center",
    padding: "3px 0"
  },
  mLbl: {
    display: "block",
    fontSize: 9,
    color: "#9ca3af",
    marginBottom: 1
  },
  mVal: {
    fontSize: 11,
    fontWeight: 700,
    color: "#374151"
  },
  cHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16
  },
  cNameLg: {
    fontSize: 20,
    fontWeight: 800,
    margin: 0
  },
  cPhone: {
    fontSize: 12,
    color: "#9ca3af"
  },
  tabs: {
    display: "flex",
    marginBottom: 12,
    borderBottom: "2px solid #e5e7eb"
  },
  tab(a) {
    return {
      flex: 1,
      background: "none",
      border: "none",
      padding: "10px 0",
      fontSize: 13,
      color: a ? "#6366f1" : "#9ca3af",
      cursor: "pointer",
      fontWeight: a ? 700 : 500,
      borderBottom: a ? "2px solid #6366f1" : "none",
      marginBottom: a ? -2 : 0
    };
  },
  row: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 14px",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    position: "relative",
    overflow: "hidden"
  },
  rDate: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151"
  },
  rMeta: {
    fontSize: 11,
    color: "#9ca3af"
  },
  rCost: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2
  },
  rAmt: {
    fontSize: 15,
    fontWeight: 800
  },
  rPft: {
    fontSize: 11,
    fontWeight: 600,
    color: "#10b981"
  },
  rbadge(c) {
    return {
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 6px",
      borderRadius: 6,
      background: c + "22",
      color: c
    };
  },
  mBadge: {
    fontSize: 11,
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "2px 7px",
    borderRadius: 6,
    marginTop: 3,
    display: "inline-block"
  },
  empty: {
    textAlign: "center",
    color: "#64748b",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "22px 16px",
    fontSize: 14,
    lineHeight: 1.45
  },
  form: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    marginBottom: 16
  },
  fg: {
    marginBottom: 14
  },
  lbl: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 5
  },
  inp: {
    width: "100%",
    boxSizing: "border-box",
    border: "1.5px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    color: "#111827",
    background: "#fafafa",
    outline: "none"
  },
  rg: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap"
  },
  rlbl: {
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer"
  },
  errMsg: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 6
  },
  prev: {
    background: "#f9fafb",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 14
  },
  prevTitle: {
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
    marginBottom: 8
  },
  pRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  acts: {
    display: "flex",
    gap: 10,
    marginTop: 4
  },
  btnP: {
    flex: 1,
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer"
  },
  btnS: {
    flex: 1,
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer"
  },
  toast(t) {
    return {
      position: "fixed",
      bottom: 20,
      left: "50%",
      transform: "translateX(-50%)",
      color: "#fff",
      fontWeight: 700,
      fontSize: 14,
      padding: "12px 24px",
      borderRadius: 12,
      background: t === "ok" ? "#10b981" : t === "info" ? "#f59e0b" : "#ef4444",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      zIndex: 9999,
      whiteSpace: "normal",
      maxWidth: "92vw",
      textAlign: "center",
      lineHeight: 1.35
    };
  },
  rep: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    marginBottom: 16
  },
  repH: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 10,
    marginBottom: 10
  },
  repRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    padding: "6px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  confirmBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fef2f2",
    border: "1.5px solid #ef4444",
    borderRadius: 10,
    padding: "8px 12px"
  },
  confirmOverlay: {
    position: "absolute",
    inset: 0,
    background: "#fff",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    border: "1.5px solid #ef4444",
    zIndex: 10
  },
  statBox: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    marginBottom: 14
  },
  statTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 10
  }
};

// ── APP ────────────────────────────────────────────────────────────────────
function App() {
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [openSess, setOpenSess] = useState([]);
  const [ready, setReady] = useState(false);
  const [, bump] = useState(0);
  useEffect(() => {
    _configListeners.push(() => bump(v => v + 1));
    (async () => {
      installAppServiceWorker();
      const [c, s, p, o] = await Promise.all([
        DB.get("ev_clients"),
        DB.get("ev_sessions"),
        DB.get("ev_payments"),
        DB.get("ev_open")
      ]);
      const mappedLocal = (c || []).map(cl => isSelfClient(cl) ? {
        ...cl,
        self: true
      } : cl);
      const carFix = applyKnownClientCars(mappedLocal);
      const repaired = repairSelfSessions(carFix.clients, s || []);
      const localClients = carFix.clients;
      const localSessions = dedupeSessionsByTxn(repaired.sessions);
      const payFix = normalizePayments(p || []);
      const deduped = dedupeDuplicatePayments(payFix.payments);
      const localPayments = deduped.payments;
      const localOpen = dropOpensAlreadySaved((o || []).map(item => repairWevoOpenRecord(item)), localSessions);
      // מקור אמת לענן — לפני כל setState / שמירה (מונע מחיקת תשלומים מ־refs ריקים)
      rememberCloudCache({
        clients: localClients,
        sessions: localSessions,
        payments: localPayments,
        openSess: localOpen
      });
      _lastUploadedCounts = {
        clients: localClients.length,
        sessions: localSessions.length,
        payments: localPayments.length
      };
      setClients(localClients);
      setSessions(localSessions);
      if (repaired.changed || localSessions.length !== (repaired.sessions || []).length) DB.set("ev_sessions", localSessions);
      if (carFix.changed) DB.set("ev_clients", localClients);
      setPayments(localPayments);
      if (payFix.changed || deduped.removed > 0) DB.set("ev_payments", localPayments);
      setOpenSess(localOpen);
      if ((o || []).some((item, i) => item !== localOpen[i])) DB.set("ev_open", localOpen);
      if (deduped.removed > 0) {
        try {
          setTimeout(() => appAlert(`הוסרו ${deduped.removed} תשלומים כפולים ✓`, "ok", 4500), 800);
        } catch {}
      }
      await loadConfigFromStorage();
      const localEmpty = !(c && c.length) && !(s && s.length) && !(p && p.length);
      const savedPin = getCloudPin();
      const skippedCloud = (() => {
        try {
          return localStorage.getItem("ev_cloud_skip") === "1";
        } catch {
          return false;
        }
      })();
      try {
        const st = await cloudApi("status");
        if (!st.configured) {
          if (!skippedCloud) setCloudNeedSetup(true);
        } else if (savedPin) {
          try {
            const r = await cloudApi("load", {
              pin: savedPin
            });
            if (r.data && (localEmpty || r.updatedAt && Number(r.updatedAt) > Number(localStorage.getItem(CLOUD_UPDATED_KEY) || 0))) {
              const mappedCloud = (r.data.clients || []).map(cl => isSelfClient(cl) ? {
                ...cl,
                self: true
              } : cl);
              const carFixCloud = applyKnownClientCars(mergeByIdPreferNewer(localClients, mappedCloud));
              // מיזוג — תשלום שנשמר מקומית לא נמחק גם אם הענן "חדש" יותר בלי אותו תשלום
              const mergedSessions = mergeByIdPreferNewer(localSessions, r.data.sessions || []);
              const mergedPayRaw = normalizePayments(mergeByIdPreferNewer(localPayments, r.data.payments || [])).payments;
              const mergedPayFix = dedupeDuplicatePayments(mergedPayRaw);
              const mergedPayments = mergedPayFix.payments;
              const repairedCloud = repairSelfSessions(carFixCloud.clients, mergedSessions);
              const cloudSessions = dedupeSessionsByTxn(repairedCloud.sessions);
              const mergedOpen = dropOpensAlreadySaved(mergeByIdPreferNewer(localOpen, r.data.openSess || []).map(item => repairWevoOpenRecord(item)), cloudSessions);
              const recoveredPayments = mergedPayments.length > (r.data.payments || []).length || mergedPayFix.removed > 0;
              setClients(carFixCloud.clients);
              setSessions(cloudSessions);
              setPayments(mergedPayments);
              setOpenSess(mergedOpen);
              rememberCloudCache({
                clients: carFixCloud.clients,
                sessions: cloudSessions,
                payments: mergedPayments,
                openSess: mergedOpen
              });
              await DB.set("ev_clients", carFixCloud.clients);
              await DB.set("ev_sessions", cloudSessions);
              await DB.set("ev_payments", mergedPayments);
              await DB.set("ev_open", mergedOpen);
              if (r.data.config) {
                try {
                  localStorage.setItem("ev_config", JSON.stringify(r.data.config));
                  await loadConfigFromStorage();
                } catch {}
              }
              if (r.updatedAt) localStorage.setItem(CLOUD_UPDATED_KEY, String(r.updatedAt));
              if (recoveredPayments) {
                // דוחף חזרה לענן את התשלומים ששוחזרו מהמכשיר
                scheduleCloudSave();
                try {
                  appAlert("שוחזרו תשלומים מקומיים שלא היו בענן ✓", "ok", 5000);
                } catch {}
              }
            }
          } catch {
            if (localEmpty) setCloudNeedLogin(true);
          }
        } else if (localEmpty) {
          setCloudNeedLogin(true);
        }
      } catch {
        /* offline / function missing — ממשיכים מקומית */
      }
      setReady(true);
    })();
  }, []);
  const [view, setView] = useState("dash");
  const [cid, setCid] = useState(null);
  const [editId, setEditId] = useState(null); // open session being completed
  const [sid, setSid] = useState(null); // session being edited
  const [pid, setPid] = useState(null); // payment being edited
  const [toast, setToast] = useState(null);
  const toast$ = (msg, t = "ok", ms = 3200) => {
    setToast({
      msg,
      t
    });
    setTimeout(() => setToast(null), ms);
  };
  const [cloudStatus, setCloudStatusUi] = useState(() => getCloudStatus());
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const paymentsRef = useRef(payments);
  paymentsRef.current = payments;
  const openSessRef = useRef(openSess);
  openSessRef.current = openSess;
  const [cloudNeedSetup, setCloudNeedSetup] = useState(false);
  const [cloudNeedLogin, setCloudNeedLogin] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudErr, setCloudErr] = useState("");
  useEffect(() => {
    _cloudSaveHook = () => ({
      clients: clientsRef.current,
      sessions: sessionsRef.current,
      payments: paymentsRef.current,
      openSess: openSessRef.current,
      config: typeof _configCache !== "undefined" ? _configCache : null
    });
    _cloudStatusHook = st => setCloudStatusUi(st || getCloudStatus());
    return () => {
      _cloudSaveHook = null;
      _cloudStatusHook = null;
      _alertHook = null;
    };
  }, []);
  _alertHook = (msg, t, ms) => toast$(msg, t || "info", ms || 4500);
  const applyCloudData = async data => {
    if (!data) return;
    const mapped = (data.clients || []).map(cl => isSelfClient(cl) ? {
      ...cl,
      self: true
    } : cl);
    const localClientsNow = _cloudDataCache.clients || clientsRef.current || [];
    const carFix = applyKnownClientCars(mergeByIdPreferNewer(localClientsNow, mapped));
    const mergedSessions = mergeByIdPreferNewer(_cloudDataCache.sessions || sessionsRef.current || [], data.sessions || []);
    const mergedPayments = dedupeDuplicatePayments(normalizePayments(mergeByIdPreferNewer(_cloudDataCache.payments || paymentsRef.current || [], data.payments || [])).payments).payments;
    const repaired = repairSelfSessions(carFix.clients, mergedSessions);
    const cloudSessions = dedupeSessionsByTxn(repaired.sessions);
    const mergedOpen = dropOpensAlreadySaved(mergeByIdPreferNewer(_cloudDataCache.openSess || openSessRef.current || [], data.openSess || []).map(item => repairWevoOpenRecord(item)), cloudSessions);
    setClients(carFix.clients);
    setSessions(cloudSessions);
    setPayments(mergedPayments);
    setOpenSess(mergedOpen);
    rememberCloudCache({
      clients: carFix.clients,
      sessions: cloudSessions,
      payments: mergedPayments,
      openSess: mergedOpen
    });
    await DB.set("ev_clients", carFix.clients);
    await DB.set("ev_sessions", cloudSessions);
    await DB.set("ev_payments", mergedPayments);
    await DB.set("ev_open", mergedOpen);
    if (data.config) {
      try {
        localStorage.setItem("ev_config", JSON.stringify(data.config));
        await loadConfigFromStorage();
      } catch {}
    }
  };
  const cloudLogin = async pin => {
    setCloudBusy(true);
    setCloudErr("");
    try {
      const r = await cloudApi("load", {
        pin
      });
      setCloudPin(pin);
      if (r.data) await applyCloudData(r.data);
      if (r.updatedAt) {
        try {
          localStorage.setItem(CLOUD_UPDATED_KEY, String(r.updatedAt));
        } catch {}
      }
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudNeedLogin(false);
      setCloudNeedSetup(false);
      setCloudStatus({
        lastOk: r.updatedAt || Date.now(),
        lastErr: null,
        lastErrAt: null
      });
      toast$("הנתונים שוחזרו מהענן ✓");
      scheduleCloudSave();
    } catch (e) {
      setCloudErr(e.message || "התחברות נכשלה");
      setCloudStatus({
        lastErr: e.message || "התחברות נכשלה",
        lastErrAt: Date.now()
      });
    } finally {
      setCloudBusy(false);
    }
  };
  const cloudSetup = async pin => {
    setCloudBusy(true);
    setCloudErr("");
    try {
      rememberCloudCache({
        clients: clientsRef.current,
        sessions: sessionsRef.current,
        payments: paymentsRef.current,
        openSess: openSessRef.current,
        config: typeof _configCache !== "undefined" ? _configCache : null
      });
      const snap = buildCloudSnapFromCache();
      try {
        await cloudApi("setup", {
          pin,
          data: snap
        });
      } catch (e) {
        if (/כבר הוגדר|PIN/.test(String(e.message || ""))) {
          await cloudApi("save", {
            pin,
            data: snap
          });
        } else {
          throw e;
        }
      }
      setCloudPin(pin);
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudNeedSetup(false);
      setCloudNeedLogin(false);
      setCloudStatus({
        lastOk: Date.now(),
        lastErr: null,
        lastErrAt: null
      });
      toast$("גיבוי ענן הוגדר ✓");
      scheduleCloudSave();
    } catch (e) {
      setCloudErr(e.message || "הגדרה נכשלה");
      setCloudStatus({
        lastErr: e.message || "הגדרה נכשלה",
        lastErrAt: Date.now()
      });
    } finally {
      setCloudBusy(false);
    }
  };
  const go = (v, id = undefined) => {
    setView(v);
    if (id !== undefined) setCid(id);
  };
  const applyNotifyRoute = tag => {
    const route = routeNotifyClick(tag, openSessRef.current, sessionsRef.current);
    if (!route) return;
    if (route.view === "complete" && route.openId) {
      setEditId(route.openId);
      setCid(route.clientId);
      setView("complete");
      return;
    }
    if (route.view === "dash") setView("dash");
  };
  useEffect(() => {
    _notifyClickHook = tag => {
      if (!ready) {
        _queuedNotifyTag = tag;
        return;
      }
      applyNotifyRoute(tag);
    };
    const onMsg = ev => {
      const data = ev && ev.data;
      if (!data || data.type !== "ev-notify") return;
      _notifyClickHook(data.tag);
    };
    window.addEventListener("message", onMsg);
    let sw;
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener("message", onMsg);
        sw = navigator.serviceWorker;
      }
    } catch {}
    if (ready) {
      let pending = _queuedNotifyTag;
      _queuedNotifyTag = null;
      try {
        const url = new URL(location.href);
        const fromUrl = url.searchParams.get("notify");
        if (fromUrl) {
          pending = fromUrl;
          url.searchParams.delete("notify");
          history.replaceState(null, "", url.pathname + url.search + url.hash);
        }
      } catch {}
      if (pending) applyNotifyRoute(pending);
    }
    return () => {
      window.removeEventListener("message", onMsg);
      if (sw) sw.removeEventListener("message", onMsg);
    };
  }, [ready]);
  const saveSession = s => {
    const cl = clients.find(x => x.id === s.clientId);
    const fixed = isSelfClient(cl) ? billingForClient(s, cl, {
      actualCost: s.costToOwner
    }) || s : s;
    const n = [fixed, ...sessions];
    sessionsRef.current = n;
    setSessions(n);
    DB.set("ev_sessions", n);
    toast$(isSelfClient(cl) ? "טעינה נשמרה — עלות בפועל (אשראי) ✓" : "טעינה נשמרה ✓");
  };
  const savePayment = p => {
    const check = canSaveNewPayment(payments, p);
    if (!check.ok) {
      if (check.reason === "double_click") {
        toast$("נלחץ פעמיים — התשלום כבר נרשם לפני רגע", "err", 4200);
      } else if (check.reason === "missing_client") {
        toast$("לא ניתן לשמור תשלום — חסר לקוח", "err");
      } else {
        toast$("לא ניתן לשמור תשלום — הזן סכום גדול מ־0", "err");
      }
      return false;
    }
    const fixed = check.payment;
    const n = [fixed, ...payments];
    paymentsRef.current = n;
    rememberCloudCache({
      payments: n
    });
    setPayments(n);
    DB.set("ev_payments", n);
    const cl = clients.find(c => c.id === fixed.clientId);
    const bal = clientBalance(cl, sessions, n);
    if (cl && !isSelfClient(cl) && hasCredit(bal)) {
      toast$(`תשלום נרשם — יתרת זכות ${ils(Math.abs(bal))} ✓`, "ok", 4200);
    } else {
      toast$("תשלום נרשם ✓");
    }
    return true;
  };
  const saveClient = c => {
    const name = String(c && c.name || "").trim();
    if (!name) {
      toast$("לא ניתן לשמור לקוח בלי שם", "err");
      return false;
    }
    const row = {
      ...c,
      name,
      updatedAt: new Date().toISOString()
    };
    const n = [...clients, row];
    clientsRef.current = n;
    setClients(n);
    DB.set("ev_clients", n);
    toast$("לקוח נוסף ✓");
    return true;
  };
  const updateClient = (id, data) => {
    const name = data && data.name != null ? String(data.name).trim() : null;
    if (name === "") {
      toast$("לא ניתן לשמור לקוח בלי שם", "err");
      return false;
    }
    const n = clients.map(c => c.id === id ? {
      ...c,
      ...data,
      ...(name != null ? { name } : {}),
      id: c.id,
      self: data.self != null ? data.self : c.self,
      updatedAt: new Date().toISOString()
    } : c);
    setClients(n);
    DB.set("ev_clients", n);
    toast$("לקוח עודכן ✓");
    return true;
  };
  const saveOpen = o => {
    const n = [o, ...openSess];
    setOpenSess(n);
    DB.set("ev_open", n);
    toast$("טעינה פתוחה נרשמה ✓");
  };
  const upsertWevoOpen = (o, opts = {}) => {
    const silent = !!(opts && opts.silent);
    setOpenSess(prev => {
      const sessionsNow = sessionsRef.current || [];
      if (shouldDiscardOpen(o, sessionsNow)) {
        const txnDrop = o.wevoTxnId != null ? String(o.wevoTxnId) : chargeTxnId(o);
        const n = (prev || []).filter(x => {
          if (o.id && x.id === o.id) return false;
          if (txnDrop && wevoOpenTxnId(x) === txnDrop) return false;
          return !shouldDiscardOpen(x, sessionsNow);
        });
        if (n.length !== (prev || []).length) {
          DB.set("ev_open", n);
          openSessRef.current = n;
          return n;
        }
        return prev;
      }
      const txn = o.wevoTxnId != null ? String(o.wevoTxnId) : null;
      let existing = null;
      if (o.id) existing = prev.find(x => x.id === o.id) || null;
      if (!existing && txn) {
        existing = prev.find(x => wevoOpenTxnId(x) === txn && !x.readyToComplete && !x.wevoEnded) || null;
      }
      if (!existing && !o.readyToComplete) {
        const orphan = findMatchingWevoOpen(prev, txn);
        if (orphan && !orphan.readyToComplete) {
          const orphanTxn = wevoOpenTxnId(orphan);
          // לא למזג txn חדש לתוך open עם txn אחר
          if (!txn || !orphanTxn || orphanTxn === txn) existing = orphan;
        }
      }
      let n;
      if (existing) {
        const sameSession = !txn || !wevoOpenTxnId(existing) || wevoOpenTxnId(existing) === txn || !!o.readyToComplete;
        if (!sameSession) {
          // txn שונה — פותחים רשומה חדשה במקום לדרוס ישנה
          n = [{
            ...o,
            id: o.id || uid()
          }, ...prev];
          if (!silent) setTimeout(() => toast$("טעינה פתוחה נפתחה ✓"), 0);
        } else {
          n = prev.map(x => x.id === existing.id ? {
            ...existing,
            ...o,
            id: existing.id,
            clientId: o.clientId || existing.clientId,
            startDate: o.startDate || existing.startDate,
            plugInAt: o.plugInAt || existing.plugInAt || existing.startDate,
            wevoTxnId: o.wevoTxnId != null ? o.wevoTxnId : existing.wevoTxnId
          } : x);
          if (!silent) setTimeout(() => toast$("שיוך טעינה עודכן ✓"), 0);
        }
      } else {
        n = [{
          ...o,
          id: o.id || uid()
        }, ...prev];
        if (!silent) setTimeout(() => toast$("טעינה פתוחה נפתחה ✓"), 0);
      }
      DB.set("ev_open", n);
      openSessRef.current = n;
      return n;
    });
  };
  const completeOpen = (id, sd) => {
    const kwh = Number(sd && sd.kwhRaw);
    if (!(kwh > 0)) {
      toast$("לא נשמר — אין קוט״ש בטעינה", "err", 5000);
      return;
    }
    saveSession(sd);
    const n = openSess.filter(o => o.id !== id);
    openSessRef.current = n;
    setOpenSess(n);
    DB.set("ev_open", n);
  };
  const delOpen = id => {
    const n = openSess.filter(o => o.id !== id);
    setOpenSess(n);
    DB.set("ev_open", n);
    toast$("טעינה פתוחה נמחקה");
  };
  const delSession = id => {
    const n = sessions.filter(s => s.id !== id);
    setSessions(n);
    DB.set("ev_sessions", n);
    toast$("טעינה נמחקה");
  };
  const updatePayment = (id, data) => {
    const n = payments.map(p => {
      if (p.id !== id) return p;
      const next = {
        ...p,
        ...data
      };
      if (data.amount != null) next.amount = Number(data.amount) || 0;
      return next;
    });
    paymentsRef.current = n;
    setPayments(n);
    DB.set("ev_payments", n);
    toast$("תשלום עודכן ✓");
  };
  const delPayment = id => {
    const n = payments.filter(p => p.id !== id);
    paymentsRef.current = n;
    setPayments(n);
    DB.set("ev_payments", n);
    toast$("תשלום נמחק");
  };
  const updateSession = (id, data) => {
    const n = sessions.map(s => {
      if (s.id !== id) return s;
      const merged = {
        ...s,
        ...data
      };
      const cl = clients.find(x => x.id === merged.clientId);
      return isSelfClient(cl) ? billingForClient(merged, cl, {
        actualCost: merged.costToOwner
      }) || merged : merged;
    });
    setSessions(n);
    DB.set("ev_sessions", n);
    toast$("טעינה עודכנה ✓");
  };
  const delClient = id => {
    const nc = clients.filter(c => c.id !== id),
      ns = sessions.filter(s => s.clientId !== id),
      np = payments.filter(p => p.clientId !== id);
    setClients(nc);
    setSessions(ns);
    setPayments(np);
    DB.set("ev_clients", nc);
    DB.set("ev_sessions", ns);
    DB.set("ev_payments", np);
    toast$("לקוח נמחק");
    go("dash");
  };
  const exportData = () => {
    const data = {
      clients,
      sessions,
      payments,
      openSess,
      config: getConfig(),
      exportedAt: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => toast$("נתונים הועתקו ✓"), () => toast$("שגיאה בהעתקה", "err"));
  };
  const downloadData = () => {
    try {
      const data = {
        clients,
        sessions,
        payments,
        openSess,
        config: getConfig(),
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const pad = n => String(n).padStart(2, "0");
      a.href = url;
      a.download = `ev-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast$("קובץ גיבוי ירד ✓");
    } catch (e) {
      toast$("שגיאה בהורדה: " + e.message, "err");
    }
  };
  const importData = json => {
    try {
      const d = JSON.parse(json);
      let nextSessions = sessionsRef.current || [];
      if (d.clients) {
        const carFix = applyKnownClientCars(d.clients);
        setClients(carFix.clients);
        DB.set("ev_clients", carFix.clients);
        rememberCloudCache({ clients: carFix.clients });
      }
      if (d.sessions) {
        nextSessions = dedupeSessionsByTxn(d.sessions);
        sessionsRef.current = nextSessions;
        setSessions(nextSessions);
        DB.set("ev_sessions", nextSessions);
        rememberCloudCache({ sessions: nextSessions });
      }
      if (d.payments) {
        setPayments(d.payments);
        DB.set("ev_payments", d.payments);
        rememberCloudCache({ payments: d.payments });
      }
      if (d.openSess) {
        const opens = dropOpensAlreadySaved((d.openSess || []).map(item => repairWevoOpenRecord(item)), nextSessions);
        openSessRef.current = opens;
        setOpenSess(opens);
        DB.set("ev_open", opens);
        rememberCloudCache({ openSess: opens });
      }
      if (d.config) {
        persistConfig(d.config);
      }
      toast$("נתונים יובאו בהצלחה ✓");
    } catch (e) {
      toast$("שגיאה בייבוא: " + e.message, "err");
    }
  };
  const stats = useMemo(() => {
    const now = new Date(),
      mo = now.getMonth(),
      yr = now.getFullYear();
    return clients.map(c => {
      const ss = sessions.filter(s => s.clientId === c.id && s.source !== "wevo-sync");
      const balance = clientBalance(c, sessions, payments);
      const monthSs = ss.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === mo && d.getFullYear() === yr;
      });
      const monthP = monthSs.reduce((a, s) => a + s.profit, 0);
      const monthCost = monthSs.reduce((a, s) => a + (Number(s.costToOwner) || 0), 0);
      const totalP = ss.reduce((a, s) => a + s.profit, 0);
      const totalCost = ss.reduce((a, s) => a + s.costToOwner, 0);
      const last = [...ss].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const lastActivityMs = clientLastActivityMs(c.id, sessions, openSess);
      const archived = isClientArchived(c);
      const inactive = isClientInactive(c, lastActivityMs);
      return {
        ...c,
        balance,
        monthP,
        monthCost,
        totalP,
        totalCost,
        count: ss.length,
        last,
        lastActivityMs,
        archived,
        inactive,
        hidden: hideClientFromDashboard(c, lastActivityMs),
        isSelf: isSelfClient(c)
      };
    });
  }, [clients, sessions, payments, openSess]);
  const setClientArchived = (id, archived) => {
    const n = clients.map(c => c.id === id ? {
      ...c,
      archived: !!archived
    } : c);
    setClients(n);
    DB.set("ev_clients", n);
    toast$(archived ? "הועבר לארכיון ✓" : "שוחזר מהארכיון ✓");
  };
  if (!ready) {
    return /*#__PURE__*/React.createElement("div", {
      style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3fafc", fontFamily: "'Heebo', sans-serif", color: "#0ea5c6", fontWeight: 700, fontSize: 15 }
    }, /*#__PURE__*/React.createElement(BrandLogo, {
      size: 44,
      subtitle: "טוען..."
    }));
  }
  const pageSubtitle = view === "wevo-sync" ? "Wevo Sync" : view === "archive" ? "ארכיון" : view === "debts" ? "חובות" : view === "dash" ? "EV Charge" : null;
  const hideAppChrome = view === "wevo" || view === "wevo-bill";
  return /*#__PURE__*/React.createElement("div", {
    style: hideAppChrome ? {
      ...S.app,
      background: "#fff",
      padding: 0,
      maxWidth: "100%"
    } : S.app
  }, /*#__PURE__*/React.createElement(WevoOpenLiveSync, {
    openSess: openSess,
    clients: clients,
    sessions: sessions,
    onUpsertOpen: upsertWevoOpen
  }), (cloudNeedSetup || cloudNeedLogin) && /*#__PURE__*/React.createElement(CloudGate, {
    mode: cloudNeedSetup ? "setup" : "login",
    busy: cloudBusy,
    err: cloudErr,
    onSetup: cloudSetup,
    onLogin: cloudLogin,
    onSkip: () => {
      try {
        localStorage.setItem("ev_cloud_skip", "1");
      } catch {}
      setCloudNeedSetup(false);
      setCloudNeedLogin(false);
    },
    allowSkip: !cloudNeedLogin || clients.length > 0 || sessions.length > 0
  }), !hideAppChrome && /*#__PURE__*/React.createElement("header", {
    style: S.header
  }, /*#__PURE__*/React.createElement("div", {
    style: S.hInner
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    size: 40,
    subtitle: pageSubtitle
  }), view !== "dash" && /*#__PURE__*/React.createElement("button", {
    style: S.backBtn,
    onClick: () => go("dash", null),
    "data-testid": "nav-dash"
  }, "← דשבורד"))), /*#__PURE__*/React.createElement(WaDraftSheet, null), toast && /*#__PURE__*/React.createElement("div", {
    style: S.toast(toast.t),
    "data-testid": "app-toast"
  }, toast.msg), view === "dash" && /*#__PURE__*/React.createElement(Dashboard, {
    stats: stats,
    go: go,
    openSess: openSess,
    clients: clients,
    sessions: sessions,
    onDelOpen: delOpen,
    onUpsertOpen: upsertWevoOpen,
    onComplete: (id, c) => {
      setEditId(id);
      setCid(c);
      go("complete", c);
    },
    onToggleArchive: setClientArchived
  }), view === "debts" && /*#__PURE__*/React.createElement(DebtsSendView, {
    stats: stats,
    go: go
  }), view === "archive" && /*#__PURE__*/React.createElement(ArchiveView, {
    stats: stats,
    go: go,
    onToggleArchive: setClientArchived
  }), view === "stats" && /*#__PURE__*/React.createElement(StatsView, {
    sessions: sessions,
    clients: clients
  }), view === "wevo" && /*#__PURE__*/React.createElement(WevoHistoryView, {
    sessions: sessions,
    clients: clients,
    mode: "owner",
    onBack: () => go("dash")
  }), view === "wevo-bill" && /*#__PURE__*/React.createElement(WevoHistoryView, {
    sessions: sessions,
    clients: clients,
    mode: "billing",
    onBack: () => go("dash")
  }), view === "settings" && /*#__PURE__*/React.createElement(SettingsView, {
    onSaved: () => {
      toast$("תעריפים נשמרו ✓");
      go("dash");
    },
    onCancel: () => go("dash")
  }), view === "client" && /*#__PURE__*/React.createElement(ClientView, {
    cid: cid,
    clients: clients,
    stats: stats,
    sessions: sessions,
    payments: payments,
    go: go,
    onDelSession: delSession,
    onDelClient: delClient,
    onToggleArchive: setClientArchived,
    openSess: openSess.filter(o => o.clientId === cid),
    onDelOpen: delOpen,
    onComplete: id => {
      setEditId(id);
      go("complete", cid);
    },
    onEditSession: id => {
      setSid(id);
      go("edit-s", cid);
    },
    onEditPayment: id => {
      setPid(id);
      go("edit-p", cid);
    }
  }), view === "add-s" && /*#__PURE__*/React.createElement(AddSession, {
    clients: clients,
    defaultCid: cid,
    onSave: s => {
      saveSession(s);
      go(cid ? "client" : "dash", cid);
    },
    onCancel: () => go(cid ? "client" : "dash", cid)
  }), view === "edit-s" && /*#__PURE__*/React.createElement(EditSession, {
    session: sessions.find(s => s.id === sid),
    clients: clients,
    onSave: (id, d) => {
      updateSession(id, d);
      go("client", cid);
    },
    onCancel: () => go("client", cid)
  }), view === "add-open" && /*#__PURE__*/React.createElement(AddOpenSession, {
    clients: clients,
    defaultCid: cid,
    onSave: o => {
      saveOpen(o);
      go(cid ? "client" : "dash", cid);
    },
    onCancel: () => go(cid ? "client" : "dash", cid)
  }), view === "complete" && /*#__PURE__*/React.createElement(CompleteSession, {
    openSession: openSess.find(o => o.id === editId),
    clients: clients,
    onUpsertOpen: upsertWevoOpen,
    onSave: (id, s) => {
      completeOpen(id, s);
      if (!(Number(s && s.kwhRaw) > 0)) return;
      go(cid ? "client" : "dash", cid);
    },
    onDelete: id => {
      delOpen(id);
      go("dash");
    },
    onCancel: () => go(cid ? "client" : "dash", cid)
  }), view === "add-p" && /*#__PURE__*/React.createElement(AddPayment, {
    cid: cid,
    clients: clients,
    stats: stats,
    onSave: p => {
      if (savePayment(p)) go("client", cid);
    },
    onCancel: () => go("client", cid)
  }), view === "add-debt" && /*#__PURE__*/React.createElement(AddDebt, {
    cid: cid,
    clients: clients,
    onSave: d => {
      if (savePayment({
        ...d,
        amount: -Math.abs(d.amount)
      })) go("client", cid);
    },
    onCancel: () => go("client", cid)
  }), view === "add-c" && /*#__PURE__*/React.createElement(AddClient, {
    onSave: c => {
      if (!saveClient(c)) return;
      go("dash");
    },
    onCancel: () => go("dash")
  }), view === "edit-c" && /*#__PURE__*/React.createElement(EditClient, {
    client: clients.find(c => c.id === cid),
    onSave: (id, d) => {
      if (!updateClient(id, d)) return;
      go("client", cid);
    },
    onCancel: () => go("client", cid)
  }), view === "report" && /*#__PURE__*/React.createElement(Report, {
    cid: cid,
    clients: clients,
    sessions: sessions
  }), view === "edit-p" && /*#__PURE__*/React.createElement(EditPayment, {
    payment: payments.find(p => p.id === pid),
    clients: clients,
    onSave: (id, d) => {
      updatePayment(id, d);
      go("client", cid);
    },
    onDelete: id => {
      delPayment(id);
      go("client", cid);
    },
    onCancel: () => go("client", cid)
  }), view === "import" && /*#__PURE__*/React.createElement(ImportData, {
    onImport: j => {
      importData(j);
      go("dash");
    },
    onExport: exportData,
    onDownload: downloadData,
    cloudConfigured: !!getCloudPin(),
    cloudStatus: cloudStatus,
    onCloudSetup: () => {
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudErr("");
      setCloudNeedSetup(true);
    },
    onCloudLogin: () => {
      try {
        localStorage.removeItem("ev_cloud_skip");
      } catch {}
      setCloudErr("");
      setCloudNeedLogin(true);
    },
    onCancel: () => go("dash")
  }), view === "wevo-sync" && /*#__PURE__*/React.createElement(WevoSyncView, {
    clients: clients,
    sessions: sessions,
    openSess: openSess,
    onCancel: () => go("dash"),
    onMerged: result => {
      setClients(result.clients);
      setSessions(result.sessions);
      if (result.openSess) {
        setOpenSess(result.openSess);
        DB.set("ev_open", result.openSess);
      }
      DB.set("ev_clients", result.clients);
      DB.set("ev_sessions", result.sessions);
      const closed = result.closedOpen ? `, ${result.closedOpen} פתוחות נסגרו` : "";
      const pending = result.pendingApprove ? `, ${result.pendingApprove} ממתינות לאישור` : "";
      toast$(`Wevo: +${result.added} חדשות, ${result.tagged} תויגו, ${result.skipped} דולגו${closed}${pending} (מתוך ${result.fetched})`);
      go(result.pendingApprove ? "dash" : "wevo");
    }
  }));
}

function NotifyEnableButton() {
  const supported = typeof Notification !== "undefined";
  const [perm, setPerm] = useState(() => supported ? Notification.permission : "unsupported");
  const label = perm === "granted"
    ? "התראות פעילות"
    : perm === "denied"
      ? "התראות חסומות"
      : perm === "unsupported"
        ? "אין התראות בדפדפן"
        : "הפעל התראות";
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "notify-enable",
    disabled: perm === "granted" || perm === "denied" || perm === "unsupported",
    onClick: async () => {
      const next = await ensureNotifyPermission();
      setPerm(next);
      if (next === "granted") {
        notifyPhone("התראות פעילות", "תקבל עדכון כשרכב מתחבר, כשהטעינה נגמרת, ואם אישור מראש נכשל", "ev-notify-on");
      }
    },
    style: {
      flex: 1,
      background: perm === "granted" ? "#ecfdf5" : "#f8fafc",
      border: perm === "granted" ? "1.5px solid #6ee7b7" : "1.5px solid #cbd5e1",
      borderRadius: 10,
      padding: "11px",
      fontSize: 13,
      color: perm === "granted" ? "#047857" : "#334155",
      cursor: perm === "granted" || perm === "denied" ? "default" : "pointer",
      fontWeight: 700
    }
  }, label);
}

function DebtsSendView({
  stats = [],
  go
}) {
  const list = stats
    .filter(c => !c.isSelf && !c.hidden && hasDebt(c.balance))
    .sort((a, b) => b.balance - a.balance);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("p", {
    style: S.secTitle
  }, "מי חייב"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#64748b",
      marginBottom: 12,
      lineHeight: 1.45
    }
  }, list.length ? `${list.length} לקוחות עם חוב. כל כפתור פותח טיוטה. כלום לא נשלח עד שאתה מחליט.` : "אין חובות פתוחים."), list.map(c => {
    const lastAmt = c.last ? c.last.amountBilled : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      style: {
        ...S.row,
        marginBottom: 8,
        border: "1.5px solid #fde68a",
        background: "#fffbeb"
      },
      "data-testid": `debt-row-${c.id}`
    }, /*#__PURE__*/React.createElement("div", {
      style: { flex: 1, minWidth: 140 }
    }, /*#__PURE__*/React.createElement("div", {
      style: { fontWeight: 800, fontSize: 15 }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 13, color: "#b45309", fontWeight: 700, marginTop: 2 }
    }, formatBalanceText(c.balance)), c.phone ? null : /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 12, color: "#94a3b8", marginTop: 2 }
    }, "אין טלפון בכרטיס")), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": `debt-send-${c.id}`,
      onClick: () => {
        openWaDraft({
          phone: c.phone,
          name: c.name,
          text: waDebtPing(c.balance, lastAmt)
        });
      },
      style: {
        background: "#fff",
        color: "#0f766e",
        border: "1.5px solid #99f6e4",
        borderRadius: 10,
        padding: "10px 12px",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer"
      }
    }, "טיוטה"));
  }));
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({
  stats,
  go,
  openSess = [],
  clients = [],
  sessions = [],
  onDelOpen,
  onUpsertOpen,
  onComplete,
  onToggleArchive
}) {
  const [sortBy, setSortBy] = useState("debt");
  const [preAuthIntent, setPreAuthIntent] = useState(() => getWevoAuthIntent());
  useEffect(() => {
    const sync = ev => {
      setPreAuthIntent(ev && ev.detail !== undefined ? ev.detail : getWevoAuthIntent());
    };
    window.addEventListener(WEVO_AUTH_INTENT_EVENT, sync);
    return () => window.removeEventListener(WEVO_AUTH_INTENT_EVENT, sync);
  }, []);
  useEffect(() => {
    const ready = (openSess || []).filter(o => o.readyToComplete && !o._alertedUnclosed);
    if (!ready.length) return;
    const first = ready[0];
    const cl = clients.find(c => c.id === first.clientId);
    const name = cl && cl.name || "לקוח";
    appAlert(`יש טעינה שלא נסגרה ל־${name} — אפשר לאשר מהבאנר למעלה. לא חוסם טעינה חדשה.`, "info", 6500);
  }, []);
  // רק חובות חיוביים — יתרות זכות לא מקזזות את סיכום החובות הפתוחים
  const totBal = stats.reduce((a, c) => a + (c.isSelf ? 0 : Math.max(0, c.balance)), 0);
  const totCredit = stats.reduce((a, c) => a + (c.isSelf || !hasCredit(c.balance) ? 0 : Math.abs(c.balance)), 0);
  const totMoP = stats.reduce((a, c) => a + (c.isSelf ? 0 : c.monthP), 0);
  const totAllP = stats.reduce((a, c) => a + (c.isSelf ? 0 : c.totalP), 0);
  const archivedCount = stats.filter(c => !c.isSelf && c.hidden).length;
  const now = new Date();
  const paceDay = now.getDate();
  const profitMTD = profitMonthToDay(sessions, clients, now.getFullYear(), now.getMonth(), paceDay);
  const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const profitPrevMTD = profitMonthToDay(sessions, clients, prevM.getFullYear(), prevM.getMonth(), paceDay);
  const paceDelta = (() => {
    if (profitPrevMTD === 0) return profitMTD === 0 ? null : 100;
    return Math.round((profitMTD - profitPrevMTD) / Math.abs(profitPrevMTD) * 100);
  })();
  const sorted = useMemo(() => {
    const arr = stats.filter(c => !c.hidden);
    if (sortBy === "debt") arr.sort((a, b) => b.balance - a.balance);
    if (sortBy === "profit") arr.sort((a, b) => b.monthP - a.monthP);
    if (sortBy === "total") arr.sort((a, b) => b.totalP - a.totalP);
    if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "he"));
    if (sortBy === "last") arr.sort((a, b) => (b.last ? new Date(b.last.date) : 0) - (a.last ? new Date(a.last.date) : 0));
    return arr;
  }, [stats, sortBy]);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement(WevoLivePanel, {
    clients: clients,
    sessions: sessions,
    openSess: openSess,
    onUpsertOpen: onUpsertOpen,
    go: go
  }), /*#__PURE__*/React.createElement("div", {
    style: S.sumRow
  }, /*#__PURE__*/React.createElement(SumCard, {
    lbl: "חובות פתוחים",
    val: ils(totBal),
    color: "#f59e0b",
    icon: "💰"
  }), totCredit > 0.01 && /*#__PURE__*/React.createElement(SumCard, {
    lbl: "יתרות זכות",
    val: ils(totCredit),
    color: "#059669",
    icon: "💚"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח החודש",
    val: ilsFull(totMoP),
    color: "#10b981",
    icon: "📈"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח כולל",
    val: ilsFull(totAllP),
    color: "#6366f1",
    icon: "⚡"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: paceDelta == null ? "#f8fafc" : paceDelta >= 0 ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${paceDelta == null ? "#e2e8f0" : paceDelta >= 0 ? "#bbf7d0" : "#fecaca"}`,
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      lineHeight: 1.45,
      color: "#334155"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      marginBottom: 4,
      color: paceDelta == null ? "#475569" : paceDelta >= 0 ? "#065f46" : "#991b1b"
    }
  }, "קצב רווח עד היום (לקוחות)"), /*#__PURE__*/React.createElement("div", null, ilsFull(profitMTD), " עד יום ", paceDay, " · חודש שעבר עד אותו יום: ", ilsFull(profitPrevMTD), paceDelta != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      marginRight: 6,
      color: paceDelta >= 0 ? "#059669" : "#dc2626"
    }
  }, paceDelta >= 0 ? "▲" : "▼", Math.abs(paceDelta), "%") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94a3b8",
      marginTop: 4
    }
  }, paceDelta == null ? "אין מספיק נתונים להשוואה" : paceDelta >= 0 ? "בקצב טוב לעומת התקופה המקבילה בחודש שעבר" : "מאחורי החודש שעבר — שווה להציע ליותר אנשים להטעין")), /*#__PURE__*/React.createElement(WevoMiniLog, null), /*#__PURE__*/React.createElement("div", {
    style: S.actRow
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.actBtn,
      flex: 2,
      background: "#059669",
      padding: "13px 8px",
      fontSize: 15
    },
    onClick: () => go("add-s", null),
    "data-testid": "nav-add-session"
  }, "טעינה חדשה"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("add-c"),
    "data-testid": "nav-add-client"
  }, "לקוח חדש")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("stats"),
    "data-testid": "nav-stats"
  }, "דוח חודשי"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("settings"),
    "data-testid": "nav-settings"
  }, "תעריפים"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("import"),
    "data-testid": "nav-backup"
  }, "גיבוי"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("wevo"),
    "data-testid": "nav-wevo-history"
  }, "היסטוריית Wevo"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("wevo-bill"),
    "data-testid": "nav-wevo-bill"
  }, "היסטוריית חיוב"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("wevo-sync"),
    "data-testid": "nav-wevo-sync"
  }, "סנכרון Wevo"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: S.quietBtn,
    onClick: () => go("debts"),
    "data-testid": "nav-debts"
  }, "חובות"), /*#__PURE__*/React.createElement(NotifyEnableButton, null)), openSess.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      ...S.secTitle,
      color: "#374151"
    }
  }, "טעינות פתוחות (", openSess.length, ")"), openSess.map(o => {
    const cl = clients.find(c => c.id === o.clientId);
    const est = estimateFromOpen(o, cl);
    const showBill = cl && !isSelfClient(cl) && (o.liveBilled != null || est.calc.amountBilled > 0);
    const stt = openChargeStatus(o, readLiveStation());
    const liveNow = stt.kind === "live" || stt.kind === "slow";
    const endOk = !liveNow && validChargeEndMs(o);
    const liveKw = stt.kind === "live" || stt.kind === "slow" ? o.liveKw != null ? Number(o.liveKw) : null : null;
    const statusLine = stt.text;
    const tone = stt.kind === "unplugged" ? "done" : stt.kind === "cable" ? "cable" : "live";
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        ...S.row,
        border: tone === "done" ? "2px solid #86efac" : tone === "cable" ? "2px solid #93c5fd" : "2px solid #fde68a",
        background: tone === "done" ? "#f0fdf4" : tone === "cable" ? "#eff6ff" : "#fffbeb",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 140
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: tone === "done" ? "#166534" : tone === "cable" ? "#1d4ed8" : "#92400e"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        marginLeft: 8,
        marginBottom: 4,
        background: tone === "done" ? "#dcfce7" : tone === "cable" ? "#dbeafe" : "#fef3c7",
        color: tone === "done" ? "#166534" : tone === "cable" ? "#1d4ed8" : "#92400e",
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 12,
        fontWeight: 800
      }
    }, statusLine), /*#__PURE__*/React.createElement("span", {
      style: { fontSize: 15 }
    }, (cl === null || cl === void 0 ? void 0 : cl.name) || "בלי לקוח")), /*#__PURE__*/React.createElement("div", {
      style: S.rDate
    }, "התחיל (חיבור): ", fdate(o.startDate), " ", ftime(o.startDate), endOk ? ` → סיום טעינה: ${fdate(o.chargeEndedAt || o.endDate)} ${ftime(o.chargeEndedAt || o.endDate)}` : "", o.plugOutAt && endOk && o.plugOutAt !== (o.chargeEndedAt || o.endDate) ? ` · ניתוק: ${ftime(o.plugOutAt)}` : ""), isChargeTimelineRelevant({
      isSelf: isSelfClient(cl),
      ...timelineHintsFromOpenOrSession(o)
    }) && /*#__PURE__*/React.createElement(ChargeTimelineBox, {
      compact: true,
      timeline: resolveChargeTimeline({}, {
        plugInAt: o.plugInAt || o.startDate,
        chargeStartedAt: o.chargeStartedAt,
        chargeEndedAt: liveNow ? null : o.chargeEndedAt || o.endDate,
        plugOutAt: liveNow ? null : o.plugOutAt,
        chargingFullTime: liveNow ? null : o.chargingFullTime,
        netDuration: o.netDuration
      }),
      billStartKey: o.billStartKey || "plugIn",
      billEndKey: o.billEndKey || "chargeEnd"
    }), (o.liveKwh != null || o.wevoTxnId || liveKw != null) && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: tone === "done" ? "#14532d" : tone === "cable" ? "#1e3a8a" : "#78350f",
        marginTop: 6,
        lineHeight: 1.5,
        fontWeight: 700,
        fontSize: 14
      }
    }, o.liveKwh != null && /*#__PURE__*/React.createElement("span", null, Number(o.liveKwh).toFixed(2), ' קוט"ש'), liveKw != null && /*#__PURE__*/React.createElement("span", null, " · ", liveKw.toFixed(1), " kW"), o.liveWevoCost != null && /*#__PURE__*/React.createElement("span", null, " · עלות ₪", Number(o.liveWevoCost).toFixed(2)), showBill && /*#__PURE__*/React.createElement("span", null, " · לחיוב ", ils(o.liveBilled != null ? o.liveBilled : est.calc.amountBilled), " (", o.liveRateLabel || est.calc.rateLabel, ")"), o.wevoTxnId && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#a8a29e"
      }
    }, " · txn#", o.wevoTxnId))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onComplete(o.id, o.clientId),
      style: {
        background: tone === "done" ? "#059669" : tone === "cable" ? "#2563eb" : "#d97706",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer"
      },
      "data-testid": `open-complete-${o.id}`
    }, (tone === "done" || tone === "cable") && !(Number(o.liveKwh) > 0) ? "אין קוט״ש" : tone === "done" || tone === "cable" ? "✓ אשר ושמור" : "✓ השלם"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onDelOpen(o.id),
      style: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        padding: "4px 2px"
      },
      "data-testid": `open-delete-${o.id}`
    }, "מחק")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      ...S.secTitle,
      marginBottom: 0
    }
  }, "לקוחות"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("archive"),
    style: {
      border: "1.5px solid #e5e7eb",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      background: archivedCount ? "#f8fafc" : "#fff",
      color: "#64748b",
      cursor: "pointer",
      fontWeight: 600
    },
    "data-testid": "nav-archive"
  }, "📦 ארכיון", archivedCount ? ` (${archivedCount})` : ""), /*#__PURE__*/React.createElement("select", {
    style: {
      border: "1.5px solid #e5e7eb",
      borderRadius: 8,
      padding: "5px 8px",
      fontSize: 12,
      background: "#fff",
      color: "#6b7280"
    },
    value: sortBy,
    onChange: e => setSortBy(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "debt"
  }, "מיון: חוב"), /*#__PURE__*/React.createElement("option", {
    value: "profit"
  }, "מיון: רווח החודש"), /*#__PURE__*/React.createElement("option", {
    value: "total"
  }, "מיון: רווח כולל"), /*#__PURE__*/React.createElement("option", {
    value: "name"
  }, "מיון: שם"), /*#__PURE__*/React.createElement("option", {
    value: "last"
  }, "מיון: טעינה אחרונה")))), /*#__PURE__*/React.createElement("div", {
    style: S.cGrid
  }, sorted.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, archivedCount > 0 ? "כל הלא פעילים בארכיון — לחץ «ארכיון» למעלה" : "אין לקוחות — הוסף לקוח חדש"), sorted.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: S.cCard,
    onClick: () => go("client", c.id),
    "data-testid": `client-card-${c.id}`
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cTop
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 40,
    fontSize: 17
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cName,
    "data-testid": `client-name-${c.id}`
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cMeta
  }, c.count, " טעינות", formatClientCarLine(c) ? ` · ${formatClientCarLine(c)}` : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginRight: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: balanceBadgeStyle(c.balance, c.isSelf),
    "data-testid": `client-balance-${c.id}`
  }, formatBalanceText(c.balance, {
    isSelf: c.isSelf
  })))), /*#__PURE__*/React.createElement("div", {
    style: S.miniStats
  }, /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "רווח החודש"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.mVal,
      color: "#10b981"
    }
  }, ilsFull(c.monthP))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "עלות החודש 🔒"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.mVal,
      color: "#6b7280"
    }
  }, ils(c.monthCost))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "רווח כולל"), /*#__PURE__*/React.createElement("span", {
    style: S.mVal
  }, ilsFull(c.totalP))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "עלות כולל 🔒"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.mVal,
      color: "#6b7280"
    }
  }, ils(c.totalCost))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "טעינה אחרונה"), /*#__PURE__*/React.createElement("span", {
    style: S.mVal
  }, c.last ? fdate(c.last.date) : "—"))), !c.isSelf && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": `client-preauth-${c.id}`,
    onClick: e => {
      e.stopPropagation();
      e.preventDefault();
      const armed = preAuthIntent && preAuthIntent.clientId === c.id;
      if (armed) {
        clearWevoClientPreauth("בוטל מדשבורד");
        setPreAuthIntent(null);
      } else {
        const next = armWevoClientPreauth(c.id);
        setPreAuthIntent(next);
      }
    },
    style: {
      width: "100%",
      marginTop: 8,
      padding: "9px 10px",
      borderRadius: 10,
      border: preAuthIntent && preAuthIntent.clientId === c.id ? "1.5px solid #6ee7b7" : "1.5px solid #bae6fd",
      background: preAuthIntent && preAuthIntent.clientId === c.id ? "#ecfdf5" : "#f0f9ff",
      color: preAuthIntent && preAuthIntent.clientId === c.id ? "#047857" : "#0369a1",
      fontWeight: 700,
      fontSize: 12,
      cursor: "pointer"
    }
  }, preAuthIntent && preAuthIntent.clientId === c.id ? "✓ ממתין לחיבור · בטל אישור מראש" : "🌙 אישור מראש · כשיתחבר"))), archivedCount > 0 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("archive"),
    style: {
      width: "100%",
      marginTop: 8,
      marginBottom: 8,
      background: "#f8fafc",
      border: "1.5px dashed #cbd5e1",
      borderRadius: 10,
      padding: "10px",
      fontSize: 13,
      color: "#64748b",
      cursor: "pointer",
      fontWeight: 600
    }
  }, "📦 יש ", archivedCount, " בארכיון (לא פעילים / הועברו) — לחץ לפתיחה"), /*#__PURE__*/React.createElement("footer", {
    style: {
      marginTop: 28,
      paddingTop: 20,
      paddingBottom: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      borderTop: "1px solid #e2e8f0"
    },
    "aria-label": "סימן מסחרי Eden Gil"
  }, /*#__PURE__*/React.createElement(BrandMark, {
    size: 52
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Outfit', 'Sora', sans-serif",
      fontWeight: 800,
      fontSize: 14,
      letterSpacing: "-0.03em",
      color: "#134e4a"
    }
  }, "Eden Gil"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94a3b8",
      fontWeight: 500,
      letterSpacing: "0.04em"
    }
  }, "® סימן מסחרי"))));
}

function ArchiveView({
  stats,
  go,
  onToggleArchive
}) {
  const list = useMemo(() => {
    return [...stats].filter(c => !c.isSelf && c.hidden).sort((a, b) => {
      const ta = a.lastActivityMs || 0;
      const tb = b.lastActivityMs || 0;
      return ta - tb;
    });
  }, [stats]);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      border: "1.5px solid #e2e8f0",
      borderRadius: 12,
      padding: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#334155",
      marginBottom: 6
    }
  }, "📦 ארכיון לקוחות"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#64748b",
      lineHeight: 1.45
    }
  }, "לקוחות שלא טענו מעל חודש מוסתרים אוטומטית מהדשבורד. אפשר גם להעביר ידנית ולהחזיר בכל רגע.")), list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "הארכיון ריק — אין לקוחות מוסתרים") : list.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      ...S.cCard,
      opacity: 0.95
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cTop,
      cursor: "pointer"
    },
    onClick: () => go("client", c.id)
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 40,
    fontSize: 17
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cName
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cMeta
  }, c.archived ? "הועבר ידנית לארכיון" : "לא פעיל (מעל חודש)", " · ", c.last ? `טעינה אחרונה ${fdate(c.last.date)}` : "בלי טעינות", formatClientCarLine(c) ? ` · ${formatClientCarLine(c)}` : "")), /*#__PURE__*/React.createElement("div", {
    style: balanceBadgeStyle(c.balance, false)
  }, formatBalanceText(c.balance))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("client", c.id),
    style: {
      ...S.btnS,
      padding: "8px",
      fontSize: 13
    }
  }, "פתח"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      onToggleArchive && onToggleArchive(c.id, false);
    },
    style: {
      ...S.btnP,
      background: "#0ea5e9",
      padding: "8px",
      fontSize: 13,
      flex: 1.2
    },
    "data-testid": `archive-restore-${c.id}`
  }, "שחזר מהארכיון"))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("dash"),
    style: {
      ...S.btnS,
      marginTop: 12,
      width: "100%"
    },
    "data-testid": "nav-dash"
  }, "← חזרה לדשבורד")));
}


function WevoMiniLog() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 4000);
    return () => clearInterval(t);
  }, []);
  const log = getWevoLog().slice(0, 5);
  void tick;
  if (!log.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 12,
      color: "#9a3412",
      marginBottom: 6
    }
  }, "יומן מטען Wevo"), log.map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: `${row.at}-${i}`,
    style: {
      fontSize: 11,
      color: row.ok ? "#57534e" : "#b91c1c",
      padding: "3px 0",
      borderBottom: i < log.length - 1 ? "1px solid #ffedd5" : "none",
      display: "flex",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, row.ok ? "●" : "!", " ", row.msg), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a8a29e",
      flexShrink: 0
    }
  }, ftime(new Date(row.at))))));
}

function SumCard({
  lbl,
  val,
  color,
  icon
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.sumCard,
      borderTop: `3px solid ${color}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: S.sumIcon
  }, icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.sumVal,
      color
    }
  }, val), /*#__PURE__*/React.createElement("div", {
    style: S.sumLbl
  }, lbl)));
}

// ── StatsView: דוח חודשי כללי ──────────────────────────────────────────────
function StatsView({
  sessions,
  clients
}) {
  const now = new Date();
  const [selMo, setSelMo] = useState(now.getMonth());
  const [selYr, setSelYr] = useState(now.getFullYear());
  const selfIds = useMemo(() => selfClientIds(clients), [clients]);

  const monthKeys = useMemo(() => {
    const ks = new Set(sessions.map(s => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    ks.add(`${now.getFullYear()}-${now.getMonth()}`);
    return [...ks].map(k => {
      const [y, m] = k.split("-").map(Number);
      return { y, m };
    }).sort((a, b) => b.y !== a.y ? b.y - a.y : b.m - a.m);
  }, [sessions]);

  const calcMonth = (y, m) => {
    const ssAll = sessions.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const ssBiz = ssAll.filter(s => isNeighborSession(s, selfIds));
    const income = ssBiz.reduce((a, s) => a + s.amountBilled, 0);
    const expense = ssBiz.reduce((a, s) => a + s.costToOwner, 0);
    const profit = ssBiz.reduce((a, s) => a + s.profit, 0);
    const kwh = ssBiz.reduce((a, s) => a + s.kwhInflated, 0);
    return {
      income,
      expense,
      profit,
      kwh,
      count: ssBiz.length,
      selfCount: ssAll.length - ssBiz.length,
      sessions: ssAll
    };
  };

  const cur = calcMonth(selYr, selMo);
  const prevDate = new Date(selYr, selMo - 1, 1);
  const prev = calcMonth(prevDate.getFullYear(), prevDate.getMonth());
  const isCurMonth = selYr === now.getFullYear() && selMo === now.getMonth();
  const paceDay = isCurMonth ? now.getDate() : new Date(selYr, selMo + 1, 0).getDate();
  const profitMTD = profitMonthToDay(sessions, clients, selYr, selMo, paceDay);
  const prevPaceDate = new Date(selYr, selMo - 1, 1);
  const profitPrevMTD = profitMonthToDay(sessions, clients, prevPaceDate.getFullYear(), prevPaceDate.getMonth(), paceDay);

  const bizAll = sessions.filter(s => isNeighborSession(s, selfIds));
  const allIncome = bizAll.reduce((a, s) => a + s.amountBilled, 0);
  const allExpense = bizAll.reduce((a, s) => a + s.costToOwner, 0);
  const allProfit = bizAll.reduce((a, s) => a + s.profit, 0);

  const graphMonths = useMemo(() => {
    const ms = [...monthKeys].sort((a, b) => a.y !== b.y ? a.y - b.y : a.m - b.m).slice(-8);
    const data = ms.map(({ y, m }) => ({ y, m, ...calcMonth(y, m) }));
    const maxP = Math.max(...data.map(d => Math.abs(d.profit)), 1);
    return data.map(d => ({ ...d, pct: Math.round(Math.abs(d.profit) / maxP * 100) }));
  }, [sessions, monthKeys, selfIds]);

  const delta = (a, b) => {
    if (b === 0) return a === 0 ? null : 100;
    return Math.round((a - b) / Math.abs(b) * 100);
  };
  const profitDelta = delta(cur.profit, prev.profit);
  const paceDelta = delta(profitMTD, profitPrevMTD);

  const byClient = useMemo(() => {
    const map = {};
    cur.sessions.forEach(s => {
      if (!map[s.clientId]) map[s.clientId] = { billed: 0, profit: 0, count: 0 };
      map[s.clientId].billed += s.amountBilled;
      map[s.clientId].profit += s.profit;
      map[s.clientId].count += 1;
    });
    return Object.entries(map).map(([id, v]) => {
      const cl = clients.find(c => c.id === id);
      return { id, name: (cl && cl.name) || "?", isSelf: selfIds.has(id), ...v };
    }).sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? 1 : -1;
      return b.billed - a.billed;
    });
  }, [cur.sessions, clients, selfIds]);

  const h = React.createElement;
  return h("main", { style: S.main },
    h("div", { style: { marginBottom: 14 } },
      h("select", {
        style: { ...S.inp, fontSize: 14, fontWeight: 700 },
        value: `${selYr}-${selMo}`,
        onChange: e => {
          const [y, m] = e.target.value.split("-").map(Number);
          setSelYr(y);
          setSelMo(m);
        }
      }, monthKeys.map(({ y, m }) => h("option", { key: `${y}-${m}`, value: `${y}-${m}` }, MONTHS[m], " ", y)))
    ),
    h("div", { style: S.statBox },
      h("div", { style: S.statTitle }, "📊 ", MONTHS[selMo], " ", selYr, h("span", {
        style: { fontWeight: 500, fontSize: 11, color: "#9ca3af", marginRight: 8 }
      }, "· לקוחות בלבד")),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הכנסות"), h("span", { style: { fontWeight: 700, color: "#6366f1" } }, ils(cur.income))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הוצאות (עלות חשמל) 🔒"), h("span", { style: { fontWeight: 700, color: "#ef4444" } }, ilsFull(cur.expense))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "רווח"), h("span", { style: { fontWeight: 800, color: "#10b981", fontSize: 16 } },
        ilsFull(cur.profit),
        profitDelta !== null && h("span", { style: { fontSize: 11, marginRight: 6, color: profitDelta >= 0 ? "#10b981" : "#ef4444" } },
          profitDelta >= 0 ? "▲" : "▼", " ", Math.abs(profitDelta), "% מחודש קודם (מלא)")
      )),
      h("div", { style: { ...S.pRow, background: "#f0fdf4", margin: "6px -4px", padding: "8px 10px", borderRadius: 10, alignItems: "flex-start" } },
        h("span", { style: { color: "#065f46", fontSize: 13, fontWeight: 600, lineHeight: 1.35 } },
          isCurMonth ? `קצב עד היום (יום ${paceDay})` : `קצב עד יום ${paceDay}`),
        h("span", { style: { fontWeight: 800, color: "#059669", fontSize: 14, textAlign: "left", lineHeight: 1.35 } },
          ilsFull(profitMTD),
          h("div", { style: { fontSize: 11, fontWeight: 600, color: paceDelta == null ? "#6b7280" : paceDelta >= 0 ? "#10b981" : "#ef4444" } },
            profitPrevMTD === 0 && profitMTD === 0
              ? "אין נתונים להשוואה"
              : `חודש שעבר עד יום ${paceDay}: ${ilsFull(profitPrevMTD)}${paceDelta != null ? ` · ${paceDelta >= 0 ? "▲" : "▼"}${Math.abs(paceDelta)}%` : ""}`
          )
        )
      ),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "טעינות לקוחות"), h("span", { style: { fontWeight: 700 } },
        cur.count,
        cur.selfCount > 0 ? h("span", { style: { color: "#9ca3af", fontSize: 11, fontWeight: 500, marginRight: 6 } }, "+ ", cur.selfCount, " עצמי") : null
      )),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "סה״כ קוט\"ש (לקוחות)"), h("span", { style: { fontWeight: 700 } }, cur.kwh)),
      cur.count > 0 && h(React.Fragment, null,
        h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "ממוצע קוט\"ש לטעינה"), h("span", null, Math.round(cur.kwh / cur.count))),
        h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "ממוצע רווח לטעינה"), h("span", { style: { color: "#10b981" } }, ilsFull(cur.profit / cur.count)))
      )
    ),
    byClient.length > 0 && h("div", { style: S.statBox },
      h("div", { style: S.statTitle }, "👥 פירוט לפי לקוח"),
      byClient.map(c => h("div", { key: c.id, style: S.pRow },
        h("span", { style: { fontSize: 13, color: c.isSelf ? "#0ea5c6" : undefined } },
          c.name, c.isSelf ? " · עצמי" : "", " ",
          h("span", { style: { color: "#9ca3af", fontSize: 11 } }, "(", c.count, ")")
        ),
        h("span", { style: { fontSize: 13 } },
          h("span", { style: { fontWeight: 700, color: c.isSelf ? "#0ea5c6" : "#6366f1" } },
            c.isSelf ? `${ilsFull(c.billed)} עלות` : ils(c.billed)
          ),
          !c.isSelf && h("span", { style: { color: "#10b981", fontSize: 11, marginRight: 6 } }, "רווח ", ilsFull(c.profit))
        )
      ))
    ),
    h("div", { style: S.statBox },
      h("div", { style: S.statTitle }, "📈 רווח לפי חודש (לקוחות)"),
      graphMonths.map(gm => h("div", {
        key: `${gm.y}-${gm.m}`,
        style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }
      },
        h("span", {
          style: {
            width: 64, fontSize: 11,
            color: gm.y === selYr && gm.m === selMo ? "#6366f1" : "#6b7280",
            fontWeight: gm.y === selYr && gm.m === selMo ? 700 : 400
          }
        }, MONTHS[gm.m].slice(0, 4), " ", String(gm.y).slice(2)),
        h("div", { style: { flex: 1, background: "#f3f4f6", borderRadius: 6, height: 18 } },
          h("div", {
            style: {
              width: `${gm.pct}%`,
              background: gm.profit >= 0 ? "#10b981" : "#ef4444",
              height: "100%", borderRadius: 6,
              minWidth: gm.profit !== 0 ? 4 : 0
            }
          })
        ),
        h("span", { style: { width: 72, fontSize: 11, fontWeight: 700, textAlign: "left", color: "#374151" } }, ilsFull(gm.profit))
      ))
    ),
    h("div", { style: { ...S.statBox, borderTop: "3px solid #6366f1" } },
      h("div", { style: S.statTitle }, "🏆 סך הכל (לקוחות, כל הזמנים)"),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הכנסות"), h("span", { style: { fontWeight: 700, color: "#6366f1" } }, ils(allIncome))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "הוצאות 🔒"), h("span", { style: { fontWeight: 700, color: "#ef4444" } }, ilsFull(allExpense))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "רווח כולל"), h("span", { style: { fontWeight: 800, color: "#10b981", fontSize: 16 } }, ilsFull(allProfit))),
      h("div", { style: S.pRow }, h("span", { style: { color: "#6b7280", fontSize: 13 } }, "טעינות לקוחות"), h("span", { style: { fontWeight: 700 } }, bizAll.length))
    )
  );
}

// ── CloudGate: התחברות ראשונית / שחזור גיבוי ענן ─────────────────────────
function CloudGate({
  mode = "login",
  busy,
  err,
  onSetup,
  onLogin,
  onSkip,
  allowSkip = true
}) {
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const isSetup = mode === "setup";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 2000,
      background: "rgba(15, 23, 42, 0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 22,
      width: "100%",
      maxWidth: 380,
      boxShadow: "0 20px 50px rgba(15,23,42,0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18,
      color: "#134e4a",
      marginBottom: 8
    }
  }, isSetup ? "הגדרת גיבוי ענן" : "שחזור נתונים"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#64748b",
      lineHeight: 1.5,
      marginBottom: 14
    }
  }, isSetup
    ? "בחר PIN אישי (4+ ספרות). הנתונים יישמרו בענן — גם אחרי התקנה מחדש בטלפון."
    : "הזן את ה-PIN שלך כדי לשחזר לקוחות, טעינות ותשלומים."), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginBottom: 10,
      letterSpacing: "0.2em",
      textAlign: "center",
      fontSize: 20,
      fontWeight: 700
    },
    type: "password",
    inputMode: "numeric",
    placeholder: "PIN",
    value: pin,
    onChange: e => setPin(e.target.value.replace(/\s/g, ""))
  }), isSetup && /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginBottom: 10,
      letterSpacing: "0.2em",
      textAlign: "center",
      fontSize: 20,
      fontWeight: 700
    },
    type: "password",
    inputMode: "numeric",
    placeholder: "אימות PIN",
    value: pin2,
    onChange: e => setPin2(e.target.value.replace(/\s/g, ""))
  }), err && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.errMsg,
      marginBottom: 10
    }
  }, err), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#0f766e",
      width: "100%",
      marginBottom: 8,
      opacity: busy ? 0.7 : 1
    },
    disabled: busy || pin.length < 4 || isSetup && pin !== pin2,
    onClick: () => isSetup ? onSetup(pin) : onLogin(pin)
  }, busy ? "⏳ רגע..." : isSetup ? "שמור והפעל גיבוי" : "שחזר מהענן"), allowSkip && /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      width: "100%"
    },
    disabled: busy,
    onClick: onSkip,
    "data-testid": "cloud-skip"
  }, "המשך בלי גיבוי (מקומי בלבד)")));
}

// ── WevoOpenLiveSync: מעדכן טעינות פתוחות גם מחוץ לדשבורד ─────────────────
function WevoOpenLiveSync({
  openSess,
  clients,
  sessions,
  onUpsertOpen
}) {
  const openRef = useRef(openSess);
  openRef.current = openSess;
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const sessionsRefLive = useRef(sessions);
  sessionsRefLive.current = sessions;
  const prevStateRef = useRef(null);
  const alertedReadyRef = useRef(new Set());

  const isActuallyCharging = st => {
    if (!st) return false;
    const s = String(st.state || "");
    return s === "Charging" || s === "SuspendedEV" || s === "SuspendedEVSE";
  };
  const isWaitingForAuthorize = st => {
    if (!st || isActuallyCharging(st)) return false;
    if (!chargerReportsVehicle(st, sessionsRefLive.current)) return false;
    const s = String(st.state || "");
    if (s === "Finishing") return false;
    return s === "Preparing" || s === "Occupied" || s === "Reserved" || !!st.waitingAuthorize;
  };

  const notifyReady = (existing, kwh) => {
    if (!existing || !existing.id) return;
    if (alertedReadyRef.current.has(existing.id)) return;
    alertedReadyRef.current.add(existing.id);
    const cl = (clientsRef.current || []).find(c => c.id === existing.clientId);
    const name = cl && cl.name ? cl.name : "לקוח";
    const kwhTxt = kwh != null ? ` · ${Number(kwh).toFixed(2)} קוט"ש` : "";
    pushWevoLog("ready", `${name}: טעינה מוכנה לאישור${kwhTxt}`, true);
    appAlert(`✓ טעינה הסתיימה — מוכן לאישור (${name})${kwhTxt}`, "ok", 6000);
    notifyPhone("הטעינה נגמרה", `${name}${kwhTxt}`, `ev-end-${existing.id}`);
  };

  const buildPayload = (st, clientId, existing) => {
    const list = clientsRef.current || [];
    const plugIn = st && st.plugInTime ? toLocalDT(new Date(st.plugInTime)) : toLocalDT(new Date());
    const txn = st && st.transactionId ? String(st.transactionId) : null;
    const est = liveChargeEstimate(st || {}, list.find(c => c.id === clientId));
    const fullMs = toMs(st && st.chargingFullTime);
    const plugMs = toMs(existing && (existing.plugInAt || existing.startDate) || plugIn);
    const chargeEndedAt = liveChargeEndStamp(st, existing, plugMs);
    return clearFinishedIfStillCharging({
      id: existing ? existing.id : uid(),
      clientId,
      startDate: existing && existing.startDate ? existing.startDate : plugIn,
      plugInAt: existing && existing.plugInAt ? existing.plugInAt : plugIn,
      chargeStartedAt: existing && existing.chargeStartedAt || null,
      chargeEndedAt,
      chargingFullTime: fullMs || existing && existing.chargingFullTime || null,
      notes: txn ? `txn#${txn} | Wevo live` : existing && existing.notes || "Wevo live",
      wevoTxnId: txn || existing && existing.wevoTxnId || null,
      source: "wevo-live",
      liveKwh: est.kwh,
      liveKw: st && st.rateKw != null ? Number(st.rateKw) : null,
      liveWevoCost: est.wevoCost,
      liveElecCost: est.elec,
      liveBilled: est.isSelf ? null : est.calc.amountBilled,
      liveRate: est.isSelf ? null : est.calc.rate,
      liveRateLabel: est.isSelf ? null : est.calc.rateLabel,
      liveProfit: est.isSelf ? null : est.calc.profit
    }, st);
  };

  const markEnded = async (existing, snap, txn) => {
    let fields = {
      kwh: snap.totalEnergyKwh != null ? Number(snap.totalEnergyKwh) : Number(existing.liveKwh) || 0,
      cost: snap.totalCost != null ? Number(snap.totalCost) : existing.liveWevoCost,
      elec: snap.electricityCost != null ? Number(snap.electricityCost) : existing.liveElecCost,
      end: toLocalDT(new Date()),
      start: existing.startDate,
      wevoTxnId: txn != null ? String(txn) : existing.wevoTxnId
    };
    try {
      const fetched = await fetchWevoFinalForOpen({
        ...existing,
        wevoTxnId: txn != null ? txn : existing.wevoTxnId
      }, {
        retries: 4,
        gapMs: 1200
      });
      if (fetched) fields = fetched;
    } catch {}
    const payload = buildPayload({
      totalEnergyKwh: fields.kwh,
      totalCost: fields.cost,
      electricityCost: fields.elec,
      plugInTime: snap.plugInTime || existing.startDate,
      transactionId: fields.wevoTxnId || txn
    }, existing.clientId, existing);
    onUpsertOpen({
      ...payload,
      liveKwh: fields.kwh,
      liveWevoCost: fields.cost,
      liveElecCost: fields.elec,
      endDate: fields.end,
      startDate: fields.start || payload.startDate,
      plugInAt: fields.start || payload.plugInAt || payload.startDate,
      chargeStartedAt: fields.chargeStartAt || existing.chargeStartedAt || null,
      chargeEndedAt: fields.chargeEndAt || fields.end,
      plugOutAt: fields.plugOutEnd || fields.plugOutAt || null,
      wevoTxnId: fields.wevoTxnId || payload.wevoTxnId,
      readyToComplete: true,
      wevoEnded: true
    }, {
      silent: true
    });
    notifyReady(existing, fields.kwh);
  };

  useEffect(() => {
    const creds = getWevoCreds();
    if (!(creds.email && creds.password)) return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const opens = openRef.current || [];
      const pendingWevo = opens.filter(o =>
        (o.source === "wevo-live" || o.wevoTxnId != null || /wevo/i.test(String(o.notes || ""))) &&
        o.clientId &&
        (!o.readyToComplete || !(Number(o.liveKwh) > 0) || !o.endDate)
      );
      try {
        const data = await wevoApi("state");
        if (cancelled) return;
        const st = data.state || null;
        rememberLiveStation(st);
        const prev = prevStateRef.current;
        const hasActive = pendingWevo.some(o => !o.readyToComplete);
        if (st && chargerReportsVehicle(st, sessionsRefLive.current)) {
          const sealedIds = sealConflictingWevoOpens(opens, st, onUpsertOpen, clientsRef.current, alertedReadyRef.current, prev);
          if (sealedIds && sealedIds.length) {
            const sealed = new Set(sealedIds);
            openRef.current = (openRef.current || []).map(o => sealed.has(o.id) ? {
              ...o,
              readyToComplete: true,
              wevoEnded: true
            } : o);
          }
        }
        const opensNow = openRef.current || [];
        if (st && chargerReportsVehicle(st, sessionsRefLive.current) && (isActuallyCharging(st) || isWaitingForAuthorize(st) || hasActive)) {
          const existing = isActuallyCharging(st) ? findLiveTxnOpen(opensNow, st) : findActiveWevoOpen(opensNow, st);
          const stillThisCharge = existing && isActuallyCharging(st) && !shouldDiscardOpen(existing, sessionsRefLive.current);
          if (existing && existing.clientId && (stillThisCharge || !existing.readyToComplete)) {
            onUpsertOpen(buildPayload(st, existing.clientId, existing), {
              silent: true
            });
          } else if (!existing) {
            // חיבור חדש בלי open תואם — אם יש אישור מראש ללקוח, נפתח open חדש
            const intent = getWevoAuthIntent();
            if (intent && intent.clientId && (isActuallyCharging(st) || isWaitingForAuthorize(st))) {
              onUpsertOpen(buildPayload(st, intent.clientId, null), {
                silent: true
              });
            }
          }
        }
        const wasWaiting = prev && !isActuallyCharging(prev);
        const nowCharging = st && isActuallyCharging(st);
        if (wasWaiting && nowCharging) {
          const existing = findActiveWevoOpen(opens, st);
          if (existing && existing.clientId && !existing.chargeStartedAt) {
            onUpsertOpen({
              ...buildPayload(st, existing.clientId, existing),
              chargeStartedAt: toLocalDT(new Date())
            }, {
              silent: true
            });
          }
        }
        const wasCharging = prev && isActuallyCharging(prev);
        const nowFinishing = st && String(st.state || "") === "Finishing";
        if (wasCharging && nowFinishing) {
          const existing = findActiveWevoOpen(opens, st);
          if (existing && existing.clientId && !existing.readyToComplete && !existing.chargeEndedAt) {
            const fullMs = toMs(st.chargingFullTime);
            const plugMs = toMs(existing.plugInAt || existing.startDate || st.plugInTime);
            const endedAt = fullMs && (!plugMs || fullMs >= plugMs) ? toLocalDT(fullMs) : toLocalDT(new Date());
            onUpsertOpen({
              ...buildPayload(st, existing.clientId, existing),
              chargeEndedAt: endedAt,
              endDate: endedAt,
              chargingFullTime: toMs(st.chargingFullTime) || Date.now()
            }, {
              silent: true
            });
          }
        }
        const wasActive = prev && (isActuallyCharging(prev) || isWaitingForAuthorize(prev));
        const nowIdle = st && !isActuallyCharging(st) && !isWaitingForAuthorize(st) && !chargerReportsVehicle(st, sessionsRefLive.current);
        if (wasActive && nowIdle) {
          const txn = prev.transactionId || st && st.transactionId;
          const existing = findActiveWevoOpen(openRef.current, txn || prev);
          if (existing && existing.clientId && !existing.readyToComplete) {
            await markEnded(existing, {
              totalEnergyKwh: prev.totalEnergyKwh != null ? prev.totalEnergyKwh : existing.liveKwh,
              totalCost: prev.totalCost != null ? prev.totalCost : existing.liveWevoCost,
              electricityCost: prev.electricityCost != null ? prev.electricityCost : existing.liveElecCost,
              plugInTime: prev.plugInTime || existing.startDate,
              chargingFullTime: prev.chargingFullTime || st && st.chargingFullTime,
              transactionId: txn
            }, txn);
          }
        } else if (nowIdle || !st || !chargerReportsVehicle(st, sessionsRefLive.current) && !isActuallyCharging(st)) {
          // שחזור: טעינה פתוחה קיימת אבל פספסנו את רגע הניתוק (טלפון סגור וכו')
          for (const o of pendingWevo) {
            if (cancelled) break;
            try {
              const fetched = await fetchWevoFinalForOpen(o, {
                retries: 2,
                gapMs: 800
              });
              if (!fetched || !(fetched.kwh > 0)) {
                if (shouldCloseStaleWevoOpen(o, { nowIdle: true })) {
                  onUpsertOpen({
                    ...repairWevoOpenRecord(o),
                    readyToComplete: true,
                    wevoEnded: true,
                    liveKw: 0
                  }, {
                    silent: true
                  });
                  notifyReady(o, o.liveKwh);
                }
                continue;
              }
              onUpsertOpen({
                ...o,
                liveKwh: fetched.kwh,
                liveWevoCost: fetched.cost != null ? fetched.cost : o.liveWevoCost,
                liveElecCost: fetched.elec != null ? fetched.elec : o.liveElecCost,
                endDate: fetched.end || o.endDate,
                startDate: fetched.start || o.startDate,
                plugInAt: fetched.start || o.plugInAt || o.startDate,
                chargeStartedAt: fetched.chargeStartAt || o.chargeStartedAt || null,
                chargeEndedAt: fetched.chargeEndAt || fetched.end || o.chargeEndedAt,
                plugOutAt: fetched.plugOutEnd || fetched.plugOutAt || o.plugOutAt || null,
                wevoTxnId: fetched.wevoTxnId || o.wevoTxnId,
                readyToComplete: true,
                wevoEnded: true,
                source: o.source || "wevo-live"
              }, {
                silent: true
              });
              notifyReady(o, fetched.kwh);
            } catch {}
          }
        }
        prevStateRef.current = st;
      } catch (e) {
        pushWevoLog("sync", e && e.message || "שגיאת סנכרון מצב", false);
      }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return null;
}

// ── WevoLivePanel: מצב מטען חי + אישור + שיוך + עלות חיה ───────────────────
function WevoLivePanel({
  clients = [],
  sessions = [],
  openSess = [],
  onUpsertOpen,
  go
}) {
  const creds = getWevoCreds();
  const hasCreds = !!(creds.email && creds.password);
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  // ריק כברירת מחדל — בלי בחירה חייבים לאשר ידנית
  const [cid, setCid] = useState("");
  const [lastAt, setLastAt] = useState(null);
  const [authIntent, setAuthIntentUi] = useState(() => getWevoAuthIntent());
  const [authAttemptsUi, setAuthAttemptsUi] = useState(() => {
    const i = getWevoAuthIntent();
    return i && i.attempts || 0;
  });
  const openRef = useRef(openSess);
  openRef.current = openSess;
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const sortedClients = useMemo(
    () => clientsByMonthlyFrequency(clients, sessions),
    [clients, sessions]
  );
  const authBusyRef = useRef(false);
  const cidRef = useRef(cid);
  cidRef.current = cid;
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevStateRef = useRef(null);
  const authIntentRef = useRef(authIntent);
  authIntentRef.current = authIntent;
  const autoAttemptsRef = useRef((authIntent && authIntent.attempts) || 0);
  const preAuthQueuedRef = useRef(!!(authIntent && authIntent.queued));
  const peakWasRef = useRef(isOwnerPeakNow());
  const tryAuthKickRef = useRef(null);
  const alertedReadyRef = useRef(new Set());
  const lastPhaseRef = useRef("");
  const lastFailAlertAtRef = useRef(0);
  const wakeLockRef = useRef(null);

  const linkedOpen = state
    ? findActiveWevoOpen(openSess, state)
    : findActiveWevoOpen(openSess, null);
  const selectedClient = clients.find(c => c.id === cid) || null;
  const isSelfSelected = !!(selectedClient && isSelfClient(selectedClient));
  const intentArmed = !!(authIntent && isWevoAuthIntentMode(authIntent.mode) && authIntent.clientId);
  const intentActive = !!(intentArmed && cid && authIntent.clientId === cid && !isSelfSelected);
  const isOffPeakIntent = !!(intentActive && authIntent.mode === "offpeak-preauth");
  const isFullIntent = !!(intentActive && authIntent.mode === "full-now");
  const isFirstAuthIntent = !!(intentActive && authIntent.mode === "first-auth");
  const noPremiumIntent = isOffPeakIntent || isFirstAuthIntent;

  const persistIntent = (next) => {
    const norm = normalizeWevoAuthIntent(next);
    setWevoAuthIntent(norm);
    setAuthIntentUi(norm);
    authIntentRef.current = norm;
    if (norm) {
      autoAttemptsRef.current = norm.attempts || 0;
      preAuthQueuedRef.current = !!norm.queued;
      setAuthAttemptsUi(norm.attempts || 0);
    } else {
      autoAttemptsRef.current = 0;
      preAuthQueuedRef.current = false;
      setAuthAttemptsUi(0);
    }
    return norm;
  };

  const clearAuthIntent = (reason) => {
    persistIntent(null);
    if (reason) pushWevoLog("preauth", reason, true);
  };

  const armAuthIntent = (mode, clientIdOverride = null, opts = {}) => {
    const targetId = clientIdOverride || cid;
    const picked = (clientsRef.current || []).find(c => c.id === targetId) || null;
    if (!targetId || (picked && isSelfClient(picked))) {
      setErr("בחר לקוח (לא עדן) לפני אישור");
      return;
    }
    if (!isWevoAuthIntentMode(mode)) return;
    const silent = !!opts.silent;
    const next = {
      clientId: targetId,
      mode,
      armedAt: Date.now(),
      queued: false,
      lastAttemptAt: null,
      lastError: null,
      attempts: 0
    };
    persistIntent(next);
    const name = (picked && picked.name) || targetId;
    const label = mode === "offpeak-preauth"
      ? `אישור מראש לזול · ${name}`
      : mode === "first-auth"
        ? `אישור ראשון (חיבור) · ${name}`
        : `אשר עכשיו כולל יקר · ${name}`;
    pushWevoLog("preauth", label, true);
    if (!silent) {
      appAlert(
        mode === "offpeak-preauth"
          ? "אישור מראש פעיל — יאושר בלי תעריף יקר, יתחיל כשהזול מתחיל"
          : mode === "first-auth"
            ? "מאשר חיבור אוטומטית — בלי תעריף יקר"
            : "מאשר עכשיו כולל תעריף יקר — ממשיך לנסות עד שהטעינה רצה",
        "ok",
        5200
      );
    }
    if (tryAuthKickRef.current) tryAuthKickRef.current();
  };

  const buildOpenPayload = (st, clientId, existing) => {
    const list = clientsRef.current || [];
    const plugIn = st && st.plugInTime ? toLocalDT(new Date(st.plugInTime)) : toLocalDT(new Date());
    const txn = st && st.transactionId ? String(st.transactionId) : null;
    const est = liveChargeEstimate(st || {}, list.find(c => c.id === clientId));
    const fullMs = toMs(st && st.chargingFullTime);
    const plugMs = toMs(existing && (existing.plugInAt || existing.startDate) || plugIn);
    const chargeEndedAt = liveChargeEndStamp(st, existing, plugMs);
    return clearFinishedIfStillCharging({
      id: existing ? existing.id : uid(),
      clientId,
      startDate: existing && existing.startDate ? existing.startDate : plugIn,
      plugInAt: existing && existing.plugInAt ? existing.plugInAt : plugIn,
      chargeStartedAt: existing && existing.chargeStartedAt || null,
      chargeEndedAt,
      chargingFullTime: fullMs || existing && existing.chargingFullTime || null,
      notes: txn ? `txn#${txn} | Wevo live` : existing && existing.notes || "Wevo live",
      wevoTxnId: txn || existing && existing.wevoTxnId || null,
      source: "wevo-live",
      liveKwh: est.kwh,
      liveKw: st && st.rateKw != null ? Number(st.rateKw) : null,
      liveWevoCost: est.wevoCost,
      liveElecCost: est.elec,
      liveBilled: est.isSelf ? null : est.calc.amountBilled,
      liveRate: est.isSelf ? null : est.calc.rate,
      liveRateLabel: est.isSelf ? null : est.calc.rateLabel,
      liveProfit: est.isSelf ? null : est.calc.profit,
      avgRateKW: st && st.avgRateKW != null ? Number(st.avgRateKW) : existing && existing.avgRateKW,
      maxRateKW: st && st.maxRateKW != null ? Number(st.maxRateKW) : existing && existing.maxRateKW,
      wevoFlags: {
        delayCharge: !!(st && st.delayCharge),
        manageCharge: !!(st && st.manageCharge),
        isWaitingAllocation: !!(st && st.isWaitingAllocation),
        isBoost: !!(st && st.isBoost),
        inWindow: st && st.inWindow,
        solarChargingType: st && st.solarChargingType || null
      }
    }, st);
  };

  const isActuallyCharging = st => {
    if (!st) return false;
    const s = String(st.state || "");
    // רק מצב מטען אמיתי — לא דגל charging ישן / עסקה פתוחה לפני אישור
    return s === "Charging" || s === "SuspendedEV" || s === "SuspendedEVSE";
  };

  const isWaitingForAuthorize = st => {
    if (!st || isActuallyCharging(st)) return false;
    if (!chargerReportsVehicle(st, sessions)) return false;
    const s = String(st.state || "");
    if (s === "Finishing") return false;
    return s === "Preparing" || s === "Occupied" || s === "Reserved" || !!st.waitingAuthorize;
  };

  const refresh = async () => {
    if (!hasCreds) return;
    setBusy(true);
    setErr("");
    try {
      const data = await wevoApi("state");
      const st = data.state || null;
      const prev = prevStateRef.current;
      rememberLiveStation(st);
      setState(st);
      setLastAt(new Date());

      // חיבור/עסקה חדשה מול open ישן עם txn אחר — סוגרים ישן כמוכן, בלי לחסום חדש
      if (st && chargerReportsVehicle(st, sessions)) {
        const sealedIds = sealConflictingWevoOpens(openRef.current, st, onUpsertOpen, clientsRef.current, alertedReadyRef.current, prev);
        if (sealedIds && sealedIds.length) {
          const sealed = new Set(sealedIds);
          openRef.current = (openRef.current || []).map(o => sealed.has(o.id) ? {
            ...o,
            readyToComplete: true,
            wevoEnded: true
          } : o);
        }
      }

      // התראות על מעברי מצב חשובים
      const phase = !st ? "none"
        : isActuallyCharging(st) ? "charging"
        : isWaitingForAuthorize(st) ? "wait-auth"
        : chargerReportsVehicle(st, sessions) ? "connected"
        : "idle";
      if (phase !== lastPhaseRef.current) {
        if (phase === "wait-auth" || phase === "connected" && lastPhaseRef.current === "idle") {
          pushWevoLog("connect", "רכב מחובר — ממתין לאישור", true);
          appAlert("🔌 רכב מחובר — ממתין לאישור טעינה", "info", 5000);
          notifyPhone("רכב התחבר", "ממתין לאישור טעינה", st && st.transactionId ? `ev-connect-${st.transactionId}` : "ev-connect");
        } else if (phase === "charging" && (lastPhaseRef.current === "wait-auth" || lastPhaseRef.current === "connected")) {
          pushWevoLog("charge", "טעינה התחילה", true);
          appAlert("⚡ הטעינה התחילה", "ok", 4000);
        }
        lastPhaseRef.current = phase;
      }
      // לוג רק במעברים חשובים — לא בכל רענון (delayCharge נשאר true גם בזמן טעינה רגילה)

      // מעבר לטעינה פעילה: שומרים התחלת זרם בפועל
      const wasWaitingLive = prev && !isActuallyCharging(prev);
      const nowChargingLive = st && isActuallyCharging(st);
      if (wasWaitingLive && nowChargingLive) {
        const existing = findActiveWevoOpen(openRef.current, st);
        if (existing && existing.clientId && !existing.chargeStartedAt) {
          onUpsertOpen({
            ...buildOpenPayload(st, existing.clientId, existing),
            chargeStartedAt: toLocalDT(new Date())
          }, {
            silent: true
          });
        }
      }
      // מעבר ל-Finishing: שומרים סיום טעינה (לפני ניתוק כבל)
      const wasCharging = prev && isActuallyCharging(prev);
      const nowFinishing = st && String(st.state || "") === "Finishing";
      if (wasCharging && nowFinishing) {
        const existing = findActiveWevoOpen(openRef.current, st);
        if (existing && existing.clientId && !existing.chargeEndedAt) {
          const fullMs = toMs(st.chargingFullTime);
          const plugMs = toMs(existing.plugInAt || existing.startDate || st.plugInTime);
          const endedAt = fullMs && (!plugMs || fullMs >= plugMs) ? toLocalDT(fullMs) : toLocalDT(new Date());
          onUpsertOpen({
            ...buildOpenPayload(st, existing.clientId, existing),
            chargeEndedAt: endedAt,
            endDate: endedAt,
            chargingFullTime: toMs(st.chargingFullTime) || Date.now()
          }, {
            silent: true
          });
        }
      }

      if (st && chargerReportsVehicle(st, sessions) && (isActuallyCharging(st) || isWaitingForAuthorize(st))) {
        const existing = isActuallyCharging(st) ? findLiveTxnOpen(openRef.current, st) : findActiveWevoOpen(openRef.current, st);
        const stillThisCharge = existing && isActuallyCharging(st) && !shouldDiscardOpen(existing, sessions);
        if (existing && existing.clientId && (stillThisCharge || !existing.readyToComplete)) {
          onUpsertOpen(buildOpenPayload(st, existing.clientId, existing), {
            silent: true
          });
        } else if (!existing && cidRef.current) {
          // יש בחירת לקוח ורכב בעמדה — יוצרים טעינה פתוחה לשיוך
          onUpsertOpen(buildOpenPayload(st, cidRef.current, null), {
            silent: true
          });
        }
      }
      // ניתוק / סיום טעינה — ממלאים סיום+קוט״ש מ-Wevo וממתינים לאישור
      const wasActive = prev && (isActuallyCharging(prev) || isWaitingForAuthorize(prev));
      const nowIdle = st && !isActuallyCharging(st) && !isWaitingForAuthorize(st) && !chargerReportsVehicle(st, sessions);
      if (wasActive && nowIdle) {
        const txn = prev.transactionId || st && st.transactionId;
        const existing = findActiveWevoOpen(openRef.current, txn || prev);
        if (existing && existing.clientId && !existing.readyToComplete) {
          let fields = {
            kwh: prev.totalEnergyKwh != null ? Number(prev.totalEnergyKwh) : Number(existing.liveKwh) || 0,
            cost: prev.totalCost != null ? Number(prev.totalCost) : existing.liveWevoCost,
            elec: prev.electricityCost != null ? Number(prev.electricityCost) : existing.liveElecCost,
            end: existing.chargeEndedAt || toLocalDT(new Date()),
            start: existing.startDate,
            wevoTxnId: txn != null ? String(txn) : existing.wevoTxnId
          };
          try {
            const fetched = await fetchWevoFinalForOpen({
              ...existing,
              wevoTxnId: txn != null ? txn : existing.wevoTxnId,
              chargeEndedAt: existing.chargeEndedAt,
              chargingFullTime: existing.chargingFullTime || prev.chargingFullTime
            }, {
              retries: 4,
              gapMs: 1200
            });
            if (fetched) fields = fetched;
          } catch {}
          const snap = {
            totalEnergyKwh: fields.kwh,
            totalCost: fields.cost,
            electricityCost: fields.elec,
            plugInTime: prev.plugInTime || existing.startDate,
            chargingFullTime: prev.chargingFullTime || existing.chargingFullTime,
            transactionId: fields.wevoTxnId || txn
          };
          const payload = buildOpenPayload(snap, existing.clientId, existing);
          onUpsertOpen({
            ...payload,
            liveKwh: fields.kwh,
            liveWevoCost: fields.cost,
            liveElecCost: fields.elec,
            endDate: fields.end,
            startDate: fields.start || payload.startDate,
            plugInAt: fields.start || payload.plugInAt || payload.startDate,
            chargeStartedAt: fields.chargeStartAt || existing.chargeStartedAt || null,
            chargeEndedAt: fields.chargeEndAt || fields.end || existing.chargeEndedAt,
            plugOutAt: fields.plugOutEnd || fields.plugOutAt || null,
            wevoTxnId: fields.wevoTxnId || payload.wevoTxnId,
            readyToComplete: true,
            wevoEnded: true
          }, {
            silent: true
          });
          if (!alertedReadyRef.current.has(existing.id)) {
            alertedReadyRef.current.add(existing.id);
            const cl = (clientsRef.current || []).find(c => c.id === existing.clientId);
            pushWevoLog("ready", `${cl && cl.name || "לקוח"}: מוכן לאישור`, true);
            appAlert(`✓ טעינה הסתיימה — מוכן לאישור (${cl && cl.name || "לקוח"})`, "ok", 6000);
            notifyPhone("הטעינה נגמרה", cl && cl.name || "לקוח", `ev-end-${existing.id}`);
          }
        }
      }
      prevStateRef.current = st;
    } catch (e) {
      if (e.message === "NO_CREDS") setErr("NO_CREDS");
      else setErr(e.message || "שגיאה");
      pushWevoLog("state", e.message || "שגיאת מצב", false);
    } finally {
      setBusy(false);
    }
  };

  const doAuthorize = async (opts = {}) => {
    if (authBusyRef.current) return false;
    authBusyRef.current = true;
    setAuthBusy(true);
    setErr("");
    const intent = authIntentRef.current;
    const mode = opts.mode != null
      ? opts.mode
      : intent && intent.mode || "full-now";
    const offPeakMode = mode === "offpeak-preauth";
    const firstAuthMode = mode === "first-auth";
    const noPremium = !authorizeShouldConfirmPremium(mode);
    const confirmPremium = !noPremium;
    try {
      const data = await wevoApi("authorize", {
        confirmPremium
      });
      const st = data.state || null;
      if (st) setState(st);
      else await refresh();
      const finalState = st || stateRef.current;
      const clientId = cidRef.current;
      if (clientId && chargerReportsVehicle(finalState, sessions)) {
        const existing = findActiveWevoOpen(openRef.current, finalState);
        onUpsertOpen(buildOpenPayload(finalState || {}, clientId, existing));
      }
      if (finalState && isActuallyCharging(finalState)) {
        if (intentActive || offPeakMode || firstAuthMode || mode === "full-now") {
          clearAuthIntent("טעינה התחילה · אישור הושלם");
        }
        pushWevoLog("authorize", confirmPremium ? "אישור Wevo הצליח (כולל פרימיום)" : "אישור Wevo הצליח (בלי תעריף יקר)", true);
        return true;
      }
      // אישור ראשון בשיא: חיבור אושר, עדיין ממתין — מסיימים את האוטומטי הראשון; יקר / המתנה לזול בלחיצה
      if (firstAuthMode && isOffPeakPreauthQueuedOk(finalState, isOwnerPeakNow())) {
        clearAuthIntent("אישור ראשון הושלם · ממתין להוראה ליקר או לזול");
        setErr("");
        pushWevoLog("authorize", "אישור ראשון (חיבור) הושלם — בלי תעריף יקר", true);
        appAlert("✓ חיבור אושר — לאישור תעריף יקר או המתנה לזול לחץ על הכפתור", "ok", 6000);
        return "first-done";
      }
      if (offPeakMode && isOffPeakPreauthQueuedOk(finalState, isOwnerPeakNow())) {
        preAuthQueuedRef.current = true;
        const cur = authIntentRef.current;
        if (cur && cur.mode === "offpeak-preauth") {
          persistIntent({
            ...cur,
            queued: true,
            lastAttemptAt: Date.now(),
            lastError: null
          });
        }
        setErr("");
        pushWevoLog("authorize", "אושר מראש — ממתין לסיום תעריף יקר", true);
        appAlert("⏳ אושר לתור זול — יתחיל כשהתעריף היקר ייגמר", "ok", 5500);
        return "queued";
      }
      if (finalState && isWaitingForAuthorize(finalState)) {
        if ((offPeakMode || firstAuthMode) && !isOwnerPeakNow()) {
          setErr(firstAuthMode ? "ממתין שהמטען יתחיל — מנסה שוב…" : "ממתין שהמטען יתחיל בזול — מנסה שוב…");
          pushWevoLog("authorize", firstAuthMode ? "ממתין להתחלת טעינה אחרי אישור ראשון" : "ממתין להתחלת טעינה בזול", false);
          return false;
        }
        if (!noPremium) {
          setErr(isOwnerPeakNow() ? "Wevo עדיין ממתין לאישור פרימיום — מנסה שוב..." : "Wevo עדיין ממתין לאישור — מנסה שוב...");
          pushWevoLog("authorize", "עדיין ממתין לאישור אחרי authorize", false);
          return false;
        }
      }
      pushWevoLog("authorize", "אישור Wevo הצליח", true);
      return true;
    } catch (e) {
      const msg = e.message || "אישור נכשל";
      setErr(msg);
      pushWevoLog("authorize", msg, false);
      const cur = authIntentRef.current;
      if (cur) {
        persistIntent({
          ...cur,
          lastAttemptAt: Date.now(),
          lastError: msg
        });
      }
      return false;
    } finally {
      authBusyRef.current = false;
      setAuthBusy(false);
    }
  };

  const requestAuthorize = () => {
    // עדן / לחיצה ידנית חד־פעמית — בלי כוונה שמורה
    doAuthorize({
      mode: "full-now"
    });
  };

  const assignOpen = (clientId = cid) => {
    if (!clientId) return;
    const existing = findActiveWevoOpen(openRef.current, state) || linkedOpen;
    onUpsertOpen(buildOpenPayload(state || {}, clientId, existing));
  };

  const onPickClient = e => {
    const id = e.target.value;
    setCid(id);
    if (!id) return;
    const picked = (clientsRef.current || []).find(c => c.id === id);
    // שיוך מיידי כשיש רכב/עסקה
    if (state && (state.connected || state.charging || state.waitingAuthorize || state.transactionId || isWaitingForAuthorize(state) || isActuallyCharging(state))) {
      const existing = findActiveWevoOpen(openRef.current, state);
      onUpsertOpen(buildOpenPayload(state, id, existing));
    }
    // רכב מחובר / ממתין — אישור ראשון אוטומטי (בלי תעריף יקר); כפתורי יקר/זול נשארים
    if (picked && !isSelfClient(picked) && state && isWaitingForAuthorize(state)) {
      const cur = authIntentRef.current;
      const keepStrong = cur && cur.clientId === id && (cur.mode === "full-now" || cur.mode === "offpeak-preauth");
      if (!keepStrong) {
        armAuthIntent("first-auth", id, { silent: true });
      }
    }
  };

  useEffect(() => {
    if (!hasCreds) return undefined;
    refresh();
    const t = setInterval(refresh, 12000);
    return () => clearInterval(t);
  }, [hasCreds]);

  useEffect(() => {
    const intent = authIntentRef.current;
    if (intent && intent.clientId && (!linkedOpen || linkedOpen.clientId !== intent.clientId)) return;
    if (linkedOpen && linkedOpen.clientId) setCid(linkedOpen.clientId);
  }, [linkedOpen && linkedOpen.id, linkedOpen && linkedOpen.clientId]);

  useEffect(() => {
    if (state && !isWaitingForAuthorize(state) && !isActuallyCharging(state) && !state.connected) {
      autoAttemptsRef.current = 0;
    }
  }, [state && state.state, state && state.connected, state && state.charging]);

  // אחרי לחיצה ייעודית בלבד — ממשיכים לנסות עד הצלחה / ביטול
  useEffect(() => {
    if (!hasCreds || !intentActive) {
      tryAuthKickRef.current = null;
      return undefined;
    }
    let cancelled = false;
    let timer = null;

    const schedule = ms => {
      if (cancelled) return;
      clearTimeout(timer);
      timer = setTimeout(runOnce, ms);
    };

    const runOnce = async () => {
      if (cancelled || authBusyRef.current) {
        schedule(1500);
        return;
      }
      const st = stateRef.current;
      const intent = authIntentRef.current;
      if (!intent || !isWevoAuthIntentMode(intent.mode)) return;

      if (!st || !isWaitingForAuthorize(st)) {
        if (st && isActuallyCharging(st)) clearAuthIntent("טעינה התחילה");
        schedule(authRetryDelayMs(Math.max(1, autoAttemptsRef.current || 1)));
        return;
      }

      const peakNowLive = isOwnerPeakNow();
      if (intent.mode === "offpeak-preauth" && (intent.queued || preAuthQueuedRef.current) && peakNowLive) {
        // כבר בתור לזול — לא לוחצים שוב על תעריף יקר
        schedule(12000);
        return;
      }

      autoAttemptsRef.current += 1;
      const attempt = autoAttemptsRef.current;
      setAuthAttemptsUi(attempt);
      persistIntent({
        ...intent,
        attempts: attempt,
        lastAttemptAt: Date.now()
      });

      const ok = await doAuthorize({
        mode: intent.mode
      });
      if (cancelled) return;
      await refresh();

      if (ok === "first-done") {
        return;
      }
      if (ok === "queued") {
        preAuthQueuedRef.current = true;
        schedule(12000);
        return;
      }
      if (ok && stateRef.current && isActuallyCharging(stateRef.current)) {
        autoAttemptsRef.current = 0;
        clearAuthIntent("טעינה התחילה");
        return;
      }
      if (!ok) {
        const now = Date.now();
        if (attempt >= 5 && now - lastFailAlertAtRef.current > 60000) {
          lastFailAlertAtRef.current = now;
          appAlert("עדיין מנסה לאשר ב-Wevo — לא ויתרתי", "info", 4500);
          notifyPhone("אישור מראש נכשל בינתיים", "האפליקציה ממשיכה לנסות. כדאי לפתוח ולבדוק.", "ev-preauth-fail");
        }
      }
      schedule(authRetryDelayMs(attempt));
    };

    tryAuthKickRef.current = () => {
      autoAttemptsRef.current = Math.max(0, autoAttemptsRef.current - 1);
      schedule(120);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      autoAttemptsRef.current = Math.max(0, autoAttemptsRef.current);
      schedule(200);
      refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("focus", onVisible);

    schedule(300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      tryAuthKickRef.current = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [hasCreds, intentActive, cid, authIntent && authIntent.mode]);

  // מעבר שיא → זול: לאישור מראש — ניסיון מיידי
  useEffect(() => {
    const peak = isOwnerPeakNow();
    const was = peakWasRef.current;
    peakWasRef.current = peak;
    if (was && !peak && isOffPeakIntent && (preAuthQueuedRef.current || authIntent && authIntent.queued)) {
      preAuthQueuedRef.current = false;
      const cur = authIntentRef.current;
      if (cur) {
        persistIntent({
          ...cur,
          queued: false
        });
      }
      if (tryAuthKickRef.current) tryAuthKickRef.current();
    }
  }, [isOffPeakIntent, state && state.state, lastAt]);

  // המסך נשאר דלוק בזמן חיבור או אישור מראש, כדי שהסנכרון ימשיך
  useEffect(() => {
    const live = !!(state && (state.connected || state.charging || state.waitingAuthorize || isWaitingForAuthorize(state) || isActuallyCharging(state)));
    if (!intentArmed && !live) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return undefined;
    }
    let released = false;
    (async () => {
      try {
        if (!navigator.wakeLock || !navigator.wakeLock.request) return;
        const lock = await navigator.wakeLock.request("screen");
        if (released) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
      } catch {}
    })();
    return () => {
      released = true;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [intentArmed, state && state.state, state && state.waitingAuthorize, state && state.connected, state && state.charging]);

  // שחזור כוונה שמורה: בוחר שוב את הלקוח
  useEffect(() => {
    if (!intentArmed || !authIntent.clientId) return;
    if (!clients.some(c => c.id === authIntent.clientId)) {
      clearAuthIntent("לקוח האישור לא נמצא");
      return;
    }
    if (!cid) setCid(authIntent.clientId);
  }, [intentArmed, authIntent && authIntent.clientId, clients]);

  // סנכרון כוונה מחוץ לפאנל (כפתור בדשבורד)
  useEffect(() => {
    const onIntent = ev => {
      const next = ev && ev.detail !== undefined ? normalizeWevoAuthIntent(ev.detail) : getWevoAuthIntent();
      setAuthIntentUi(next);
      authIntentRef.current = next;
      if (next && next.clientId) {
        setCid(next.clientId);
        autoAttemptsRef.current = 0;
        if (tryAuthKickRef.current) tryAuthKickRef.current();
      }
    };
    window.addEventListener(WEVO_AUTH_INTENT_EVENT, onIntent);
    return () => window.removeEventListener(WEVO_AUTH_INTENT_EVENT, onIntent);
  }, []);

  // כשיש כוונה ורכב ממתין — פותחים open חדש ללקוח אם אין התאמה
  useEffect(() => {
    if (!intentArmed || !authIntent || !authIntent.clientId || !state) return;
    if (!isWaitingForAuthorize(state) && !isActuallyCharging(state)) return;
    const existing = findActiveWevoOpen(openRef.current, state);
    if (!existing) {
      onUpsertOpen(buildOpenPayload(state, authIntent.clientId, null), {
        silent: true
      });
    } else if (!existing.clientId) {
      onUpsertOpen(buildOpenPayload(state, authIntent.clientId, existing), {
        silent: true
      });
    }
  }, [intentArmed, authIntent && authIntent.clientId, state && state.state, state && state.transactionId, state && state.waitingAuthorize]);

  if (!hasCreds) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0f9ff",
        border: "1.5px solid #bae6fd",
        borderRadius: 14,
        padding: 14,
        marginBottom: 16
      },
      "data-testid": "wevo-panel"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: "#0369a1",
        marginBottom: 6
      }
    }, "🔌 מטען Wevo — מצב חי"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#374151",
        marginBottom: 10
      }
    }, "כדי לראות חיבור בזמן אמת ולאשר טעינה — התחבר פעם אחת עם סיסמה שמורה."), /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btnP,
        background: "#0ea5c6",
        padding: "10px"
      },
      onClick: () => go("wevo-sync"),
      "data-testid": "wevo-connect"
    }, "🔄 התחבר ל-Wevo"));
  }

  const st = state || {};
  const chargingNow = isActuallyCharging(st);
  const waitingAuth = isWaitingForAuthorize(st);
  const vehicleNow = chargerReportsVehicle(st, sessions);
  const savedEcho = !vehicleNow && (sessions || []).some(s => savedSessionMatchesCharge(s, {
    wevoTxnId: st.transactionId,
    transactionId: st.transactionId,
    liveKwh: st.totalEnergyKwh,
    liveWevoCost: st.totalCost
  }));
  const color = chargingNow ? "#065f46" : waitingAuth ? "#b45309" : "#334155";
  const bg = chargingNow ? "#ecfdf5" : waitingAuth ? "#fffbeb" : "#f8fafc";
  const border = chargingNow ? "#6ee7b7" : waitingAuth ? "#fcd34d" : "#cbd5e1";
  const est = liveChargeEstimate(st, selectedClient);
  const showLiveMoney = vehicleNow && (chargingNow || waitingAuth) && est.kwh >= 0;
  const peakNow = isOwnerPeakNow();
  const hint = vehicleNow ? wevoStateHint(st) : "";
  const powerKw = st.rateKw != null ? Number(st.rateKw) : 0;
  const phase = chargingNow
    ? "charging"
    : waitingAuth
      ? "preparing"
      : String(st.state || "").toLowerCase().includes("suspend")
        ? "suspended"
        : String(st.state || "").toLowerCase() === "finishing"
          ? "finishing"
          : "idle";
  const assignName = linkedOpen
    ? (clients.find(c => c.id === linkedOpen.clientId) || {}).name
    : selectedClient && selectedClient.name;
  // רק כשבאמת בטעינה — לא כשמחכים לאישור (Preparing)
  const alreadyAuthorized = chargingNow;
  const approveNowPrimary = vehicleNow;
  const authBtnLabel = authBusy
    ? peakNow ? "⏳ מאשר פרימיום ב-Wevo..." : "⏳ מאשר..."
    : peakNow
      ? "✅ אשר טעינת פרימיום ⚡"
      : "✅ אשר טעינה (Wevo)";

  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      border: `1.5px solid ${border}`,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      position: "relative"
    },
    "data-testid": "wevo-panel"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 15,
      color
    },
    "data-testid": "wevo-panel-state"
  }, vehicleNow ? "🔌 מטען — " + wevoStateLabel(st.state) + (peakNow ? " · ⚡ שיא" : "") : "אין רכב בעמדה"), /*#__PURE__*/React.createElement("button", {
    onClick: refresh,
    disabled: busy,
    "data-testid": "wevo-refresh",
    style: {
      background: "none",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      cursor: "pointer",
      color: "#475569",
      fontWeight: 600
    }
  }, busy ? "..." : "רענן")), err && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.errMsg,
      marginBottom: 8
    }
  }, err), hint && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: waitingAuth ? "#92400e" : chargingNow ? "#065f46" : "#475569",
      background: waitingAuth ? "#fef3c7" : chargingNow ? "#d1fae5" : "#f1f5f9",
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 8,
      lineHeight: 1.4
    }
  }, hint), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#334155",
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, vehicleNow ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 6
    }
  }, st.totalEnergyKwh != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 800
    }
  }, Number(st.totalEnergyKwh).toFixed(2), ' קוט"ש'), st.rateKw != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 700,
      color: Number(st.rateKw) < 1.5 ? "#b45309" : "#0f172a"
    }
  }, Number(st.rateKw).toFixed(1), " kW"), st.avgRateKW != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 600,
      fontSize: 12,
      color: "#475569"
    }
  }, "ממוצע ", Number(st.avgRateKW).toFixed(1), " kW"), st.maxRateKW != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 600,
      fontSize: 12,
      color: "#475569"
    }
  }, "מקס׳ ", Number(st.maxRateKW).toFixed(1), " kW"), assignName && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      borderRadius: 8,
      padding: "4px 8px",
      fontWeight: 700,
      color: "#4338ca"
    }
  }, "לקוח: ", assignName)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 6
    }
  }, st.inWindow === true && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#ecfdf5",
      border: "1px solid #a7f3d0",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#047857"
    }
  }, "בחלון תעריף"), st.inWindow === false && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#c2410c"
    }
  }, "מחוץ לחלון"), st.offPeakStartTime != null && st.offPeakEndTime != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 600,
      color: "#64748b"
    }
  }, "Off-peak ", secsToHm(st.offPeakStartTime), "–", secsToHm(st.offPeakEndTime)), st.delayCharge && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fef3c7",
      border: "1px solid #fde68a",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#92400e"
    }
  }, st.delayCharge ? powerKw < 0.2 && (phase === "suspended" || phase === "preparing" || phase === "finishing") ? "מושהה כרגע" : "תזמון Wevo" : null), st.manageCharge && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#1d4ed8"
    }
  }, "ניהול טעינה"), st.isWaitingAllocation && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#b91c1c"
    }
  }, "ממתין להקצאה"), st.isBoost && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#faf5ff",
      border: "1px solid #e9d5ff",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#7e22ce"
    }
  }, "Boost"), st.solarChargingType && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 600,
      color: "#166534"
    }
  }, wevoSolarHe(st.solarChargingType)), st.didCompleteFull && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#ecfeff",
      border: "1px solid #a5f3fc",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#0e7490"
    }
  }, "טעינה מלאה")), (st.plugInTime || linkedOpen) && isChargeTimelineRelevant({
    isSelf: isSelfSelected || isSelfClient(clients.find(c => linkedOpen && c.id === linkedOpen.clientId)),
    plugInAt: linkedOpen && linkedOpen.plugInAt || st.plugInTime,
    chargeEndAt: chargingNow ? null : linkedOpen && linkedOpen.chargeEndedAt || st.chargingFullTime,
    plugOutAt: chargingNow ? null : linkedOpen && linkedOpen.plugOutAt,
    startDate: st.plugInTime,
    endDate: chargingNow ? null : st.chargingFullTime
  }) && /*#__PURE__*/React.createElement(ChargeTimelineBox, {
    compact: true,
    timeline: resolveChargeTimeline({
      plugInTime: st.plugInTime,
      plugOutTime: null,
      netDuration: chargingNow ? null : st.netDuration,
      chargingFullTime: chargingNow ? null : st.chargingFullTime
    }, {
      plugInAt: linkedOpen && linkedOpen.plugInAt,
      chargeStartedAt: linkedOpen && linkedOpen.chargeStartedAt,
      chargeEndedAt: chargingNow ? null : linkedOpen && linkedOpen.chargeEndedAt || st.chargingFullTime,
      plugOutAt: chargingNow ? null : linkedOpen && linkedOpen.plugOutAt
    }),
    billStartKey: linkedOpen && linkedOpen.billStartKey || "plugIn",
    billEndKey: linkedOpen && linkedOpen.billEndKey || "chargeEnd"
  }), st.transactionId && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      fontSize: 11
    }
  }, "txn#", st.transactionId)) : /*#__PURE__*/React.createElement("div", {
    style: {
      color: savedEcho ? "#047857" : "#334155",
      background: savedEcho ? "#ecfdf5" : "#fff",
      border: savedEcho ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.45
    }
  }, savedEcho ? "הטעינה האחרונה כבר אושרה ונשמרה. אין רכב חדש בעמדה." : "אין רכב בעמדה. התחברות עם המשתמש לא מסמנת רכב מחובר.")),

  // בחירת לקוח לפני אישור
  /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #e2e8f0",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      marginBottom: 8,
      color: "#0f172a"
    }
  }, linkedOpen ? "טעינה פתוחה משויכת. אפשר להחליף לקוח." : vehicleNow ? "למי שייכת הטעינה?" : "לקוח לטעינה הבאה"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.inp,
      marginBottom: 0
    },
    value: cid,
    onChange: onPickClient,
    "data-testid": "wevo-client-select"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "— בחר מי מטעין —"), sortedClients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name, c.monthChargeCount > 0 ? ` · ${c.monthChargeCount} החודש` : "", isSelfClient(c) ? " (עצמי · ידני)" : ""))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b",
      marginTop: 8,
      lineHeight: 1.4
    }
  }, isOffPeakIntent ? "אישור מראש פעיל — ממשיך לנסות בלי תעריף יקר; הטעינה תתחיל כשהזול נכנס." : isFullIntent ? "מאשר עכשיו כולל תעריף יקר — ממשיך לנסות עד שהטעינה רצה." : isFirstAuthIntent ? "מאשר חיבור אוטומטית (אישור ראשון, בלי יקר). ליקר או המתנה לזול — הכפתורים למטה." : isSelfSelected ? "עדן — אשר טעינה רק כשיש רכב בעמדה." : cid && !isSelfSelected ? (vehicleNow ? "רכב בעמדה — אישור ראשון אוטומטי. ליקר או המתנה לזול — הכפתורים למטה." : "הלקוח נבחר. אישור ראשון יקרה רק כשיהיה רכב בעמדה.") : "בחר לקוח. רכב בעמדה יופיע למעלה לפני אישור.")), !isSelfSelected && cid && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 10
    }
  }, isOffPeakIntent || isFullIntent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 200px",
      background: isOffPeakIntent ? "#ecfdf5" : "#fff7ed",
      border: isOffPeakIntent ? "1.5px solid #6ee7b7" : "1.5px solid #fdba74",
      borderRadius: 12,
      padding: "10px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: isOffPeakIntent ? "#047857" : "#c2410c"
    },
    "data-testid": isOffPeakIntent ? "wevo-preauth-active" : "wevo-fullauth-active"
  }, isOffPeakIntent ? "✓ אישור מראש פעיל · " : "✓ מאשר עכשיו (כולל יקר) · ", selectedClient && selectedClient.name, isOffPeakIntent && (preAuthQueuedRef.current || authIntent && authIntent.queued || peakNow) ? " · ממתין לזול" : "", authAttemptsUi > 0 ? ` · ניסיון ${authAttemptsUi}` : ""), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "10px 12px"
    },
    onClick: () => {
      if (tryAuthKickRef.current) tryAuthKickRef.current();
    },
    "data-testid": "wevo-auth-retry-now"
  }, "נסה עכשיו"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "10px 12px"
    },
    onClick: () => clearAuthIntent("בוטל ידנית"),
    "data-testid": "wevo-preauth-cancel"
  }, "בטל אישור")) : /*#__PURE__*/React.createElement(React.Fragment, null, isFirstAuthIntent && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 100%",
      background: "#e0f2fe",
      border: "1.5px solid #7dd3fc",
      borderRadius: 12,
      padding: "10px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: "#0369a1"
    },
    "data-testid": "wevo-firstauth-active"
  }, "✓ מאשר חיבור אוטומטית · ", selectedClient && selectedClient.name, authAttemptsUi > 0 ? ` · ניסיון ${authAttemptsUi}` : ""), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...(approveNowPrimary ? S.quietBtn : S.btnP),
      background: approveNowPrimary ? "#fff" : "#059669",
      color: approveNowPrimary ? "#334155" : "#fff",
      padding: "11px 12px",
      flex: "1 1 180px"
    },
    onClick: () => armAuthIntent("offpeak-preauth"),
    "data-testid": "wevo-preauth-arm"
  }, "אישור מראש · המתנה לזול"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...(approveNowPrimary ? S.btnP : S.quietBtn),
      background: approveNowPrimary ? "#ea580c" : "#fff",
      color: approveNowPrimary ? "#fff" : "#334155",
      padding: "11px 12px",
      flex: "1 1 180px"
    },
    onClick: () => armAuthIntent("full-now"),
    "data-testid": "wevo-fullauth-arm"
  }, "אשר עכשיו · כולל תעריף יקר"))),

  // עלות חיה
  showLiveMoney && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #e2e8f0",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      marginBottom: 8,
      color: "#0f172a"
    }
  }, "חישוב חי", est.isSelf ? " · עלות בלבד" : ` · ${selectedClient ? selectedClient.name : ""}`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, 'קוט"ש'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16
    }
  }, est.kwh.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, "עלות Wevo 🔒"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#475569"
    }
  }, "₪", est.wevoCost.toFixed(2))), !est.isSelf && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#eef2ff",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#6366f1",
      marginBottom: 2
    }
  }, "לחיוב לקוח"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#4338ca"
    }
  }, ils(est.calc.amountBilled)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b",
      marginTop: 2
    }
  }, est.calc.kwhInflated, ' קוט"ש מנופח · ₪', est.calc.rate, " · ", est.calc.rateLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfdf5",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#059669",
      marginBottom: 2
    }
  }, "רווח משוער"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#047857"
    }
  }, ilsFull(est.calc.profit))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11,
      color: "#64748b",
      lineHeight: 1.45,
      display: "grid",
      gap: 2
    }
  }, est.elec != null && /*#__PURE__*/React.createElement("div", null, "חשמל Wevo: ₪", Number(est.elec).toFixed(2), est.wevoCost != null ? ` · סה״כ Wevo: ₪${Number(est.wevoCost).toFixed(2)}` : ""), st.avgRateKW != null && /*#__PURE__*/React.createElement("div", null, "מהירות ממוצעת: ", Number(st.avgRateKW).toFixed(1), " kW", st.maxRateKW != null ? ` · מקס׳ ${Number(st.maxRateKW).toFixed(1)} kW` : ""), st.origin && /*#__PURE__*/React.createElement("div", null, "מקור: ", wevoOriginHe(st.origin)))),

  /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, alreadyAuthorized ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px",
      background: "#ecfdf5",
      border: "1.5px solid #a7f3d0",
      borderRadius: 12,
      padding: "11px 12px",
      fontWeight: 800,
      fontSize: 14,
      color: "#047857",
      textAlign: "center"
    }
  }, "✓ בטעינה — מאושר") : intentActive && waitingAuth ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px",
      background: isOffPeakIntent || isFirstAuthIntent ? "#ecfdf5" : "#fff7ed",
      border: isOffPeakIntent || isFirstAuthIntent ? "1.5px solid #6ee7b7" : "1.5px solid #fdba74",
      borderRadius: 12,
      padding: "11px 12px",
      fontWeight: 800,
      fontSize: 14,
      color: isOffPeakIntent || isFirstAuthIntent ? "#047857" : "#c2410c",
      textAlign: "center"
    },
    "data-testid": "wevo-auto-auth-status"
  }, authBusy
    ? noPremiumIntent ? "⏳ מאשר חיבור (בלי תעריף יקר)..." : peakNow ? "⏳ לוחץ אישור פרימיום ב-Wevo..." : "⏳ מאשר ב-Wevo..."
    : isFirstAuthIntent
      ? `מאשר חיבור אוטומטית${authAttemptsUi ? ` · ${authAttemptsUi}` : ""}`
      : isOffPeakIntent
        ? (authIntent && authIntent.queued || preAuthQueuedRef.current) && peakNow
          ? "🌙 ממתין לזול — אושר בלי תעריף יקר"
          : `ממשיך לנסות לזול${authAttemptsUi ? ` · ${authAttemptsUi}` : ""}`
        : `ממשיך לנסות כולל יקר${authAttemptsUi ? ` · ${authAttemptsUi}` : ""}`) : isSelfSelected || !cid ? /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: authBusy ? "#93c5fd" : peakNow ? "#ea580c" : "#0ea5c6",
      padding: "11px 12px",
      flex: "1 1 160px"
    },
    disabled: authBusy || busy || !cid && isSelfSelected,
    onClick: requestAuthorize,
    "data-testid": "wevo-authorize-manual"
  }, authBtnLabel) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 160px",
      background: "#f8fafc",
      border: "1.5px dashed #cbd5e1",
      borderRadius: 12,
      padding: "11px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: "#64748b",
      textAlign: "center"
    },
    "data-testid": "wevo-auth-awaiting-click"
  }, waitingAuth ? "ממתין ללחיצה על כפתור אישור למעלה" : "בחר אישור מראש או אשר עכשיו"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#f59e0b",
      padding: "11px 12px",
      flex: "1 1 140px",
      opacity: st.connected || st.charging || st.transactionId ? 1 : 0.5
    },
    disabled: !(st.connected || st.charging || st.transactionId) || !cid,
    onClick: () => assignOpen()
  }, linkedOpen ? "💾 עדכן שיוך" : "⏳ פתח טעינה פתוחה"), lastAt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94a3b8",
      alignSelf: "center",
      width: "100%"
    }
  }, "עודכן ", ftime(lastAt), alreadyAuthorized ? " · הטעינה פעילה" : waitingAuth ? " · ממתין לאישור במטען" : "")));
}

// ── WevoSyncView: התחברות + ייבוא טעינות מ-Wevo ─────────────────────────────
function WevoSyncView({
  clients,
  sessions,
  openSess = [],
  onMerged,
  onCancel
}) {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("ev_wevo_creds") || "{}");
    } catch {
      return {};
    }
  })();
  const [email, setEmail] = useState(saved.email || "");
  const [password, setPassword] = useState(saved.password || "");
  const [remember, setRemember] = useState(!!saved.password);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [inspectReport, setInspectReport] = useState(null);

  const runSync = async () => {
    setErr("");
    setInfo("");
    if (!email.trim() || !password) {
      setErr("יש להזין אימייל וסיסמה");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(wevoSyncUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          action: "sync"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `שגיאת שרת (${res.status})`);
      }
      try {
        if (remember) {
          localStorage.setItem("ev_wevo_creds", JSON.stringify({
            email: email.trim(),
            password
          }));
        } else {
          localStorage.setItem("ev_wevo_creds", JSON.stringify({
            email: email.trim()
          }));
        }
      } catch {}
      const result = mergeWevoTransactions(clients || [], sessions || [], data.transactions || [], openSess || []);
      setInfo(`נמשכו ${data.count} טעינות מ-Wevo`);
      onMerged(result);
    } catch (e) {
      const msg = e.message || String(e);
      if (/Failed to fetch|NetworkError|fetch/i.test(msg)) {
        setErr("לא מצליח להגיע לשרת הסנכרון. בדוק חיבור ל־Cloudflare.");
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const runInspect = async () => {
    setErr("");
    setInfo("");
    setInspectReport(null);
    if (!email.trim() || !password) {
      setErr("יש להזין אימייל וסיסמה");
      return;
    }
    setBusy(true);
    try {
      try {
        localStorage.setItem("ev_wevo_creds", JSON.stringify({
          email: email.trim(),
          password
        }));
      } catch {}
      const res = await fetch(wevoSyncUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          action: "inspect"
        })
      });
      const report = await res.json().catch(() => ({}));
      if (!res.ok || !report.ok) throw new Error(report.error || `שגיאה (${res.status})`);
      setInspectReport(report);
      try {
        localStorage.setItem("ev_wevo_identity_report", JSON.stringify({
          at: Date.now(),
          verdict: report.verdict,
          identityCandidatePaths: report.identityCandidatePaths,
          sampleFinishedKeys: report.sampleFinishedKeys,
          sampleStateKeys: report.sampleStateKeys,
          transactionCount: report.transactionCount
        }));
      } catch {}
      setInfo(
        report.verdict === "auto_link_ready"
          ? "יש כמה מזהי RFID/לוחיות שונים — אפשר לבנות מיפוי אוטומטי ללקוחות"
          : report.verdict === "rfid_field_exists_sparse"
            ? "יש שדה RFID ב-Wevo, אבל כמעט תמיד ריק (מעט טעינות עם כרטיס)"
            : report.verdict === "schema_supports_rfid_but_empty"
              ? "Wevo תומך ב-RFID/לוחית, אבל בכל ההיסטוריה אצלך השדות ריקים"
              : "לא נמצא מזהה רכב ברור בנתוני Wevo (רק מצב טעינה/קוט״ש/עלות)"
      );
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18,
      marginBottom: 8,
      color: "#0ea5c6"
    }
  }, "🔄 סנכרון מ-Wevo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 16,
      lineHeight: 1.5
    }
  }, "מתחבר לחשבון Wevo, מושך את היסטוריית הטעינות, וממזג ללא כפילויות. טעינות חדשות שלא משויכות נרשמות תחת ", /*#__PURE__*/React.createElement("b", null, "עדן (עצמי)"), " במחיר עלות."), /*#__PURE__*/React.createElement(FG, {
    lbl: "אימייל Wevo"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "email",
    dir: "ltr",
    value: email,
    onChange: e => setEmail(e.target.value),
    autoComplete: "username"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "סיסמה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "password",
    dir: "ltr",
    value: password,
    onChange: e => setPassword(e.target.value),
    autoComplete: "current-password"
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      color: "#374151",
      marginBottom: 14,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: remember,
    onChange: e => setRemember(e.target.checked)
  }), "זכור סיסמה במכשיר זה בלבד"), err && /*#__PURE__*/React.createElement("div", {
    style: S.errMsg
  }, err), info && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 10,
      padding: 10,
      fontSize: 13,
      color: "#065f46",
      marginBottom: 12
    }
  }, info), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: busy ? "#93c5fd" : "#0ea5c6",
      padding: "12px",
      opacity: busy ? 0.8 : 1
    },
    disabled: busy,
    onClick: runSync
  }, busy ? "⏳ מתחבר ומושך..." : "🔄 התחבר וסנכרן"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: busy ? "#cbd5e1" : "#0f766e",
      padding: "12px",
      marginTop: 8
    },
    disabled: busy,
    onClick: runInspect
  }, busy ? "⏳ בודק..." : "🔎 בדוק זיהוי רכב / RFID"), inspectReport && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: 12,
      fontSize: 12,
      color: "#334155",
      lineHeight: 1.5,
      direction: "ltr",
      textAlign: "left",
      maxHeight: 280,
      overflow: "auto",
      whiteSpace: "pre-wrap",
      fontFamily: "ui-monospace, Consolas, monospace"
    }
  }, JSON.stringify({
    verdict: inspectReport.verdict,
    transactionCount: inspectReport.transactionCount,
    rfid: inspectReport.rfid,
    licensePlate: inspectReport.licensePlate,
    identityCandidatePaths: (inspectReport.identityCandidatePaths || []).filter(p =>
      /rfid|license|driver|plate|vin|idTag|vehicle/i.test(p)
    ),
    sampleFinishedKeys: inspectReport.sampleFinishedKeys,
    sampleOngoingKeys: inspectReport.sampleOngoingKeys,
    sampleStateKeys: inspectReport.sampleStateKeys
  }, null, 2)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      marginTop: 8
    },
    onClick: onCancel,
    disabled: busy
  }, "ביטול"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: 11,
      color: "#9ca3af",
      lineHeight: 1.4
    }
  }, "הסיסמה נשלחת רק לפונקציית הסנכרון שלך ולא נשמרת בשרתי Wevo מעבר להתחברות.")));
}

// ── WevoHistoryView: שיבוט ויזואלי מדויק של מסך היסטוריית Wevo ───────────────
const WEVO = {
  blue: "#4EC4E8",
  blueDeep: "#3DB8E0",
  blueSoft: "#E8F7FC",
  orange: "#F5A623",
  orangeSoft: "#FFF3E0",
  text: "#1A1A1A",
  muted: "#8E8E93",
  line: "#E8E8EA",
  cardBg: "#FFFFFF",
  bg: "#FFFFFF"
};
const DAY_HE = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'", "יום ו'", "שבת"];
const MONTH_SHORT = ["ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יונ'", "יול'", "אוג'", "ספט'", "אוק'", "נוב'", "דצמ'"];

function ownerPremRatio(s) {
  // Wevo "פרימיום" = חלק האנרגיה בשיא בעלים 17:00–23:00 (לא בסופ״ש)
  const start = new Date(s.date);
  if (isNaN(start)) return 0;
  const durMin = Number(s.durMin) > 0 ? Number(s.durMin) : 60;
  const end = new Date(start.getTime() + durMin * 60000);
  const day = start.getDay();
  if (day === 5 || day === 6) return 0;
  const sh = start.getHours() + start.getMinutes() / 60;
  const eh = end.getHours() + end.getMinutes() / 60;
  const totalOwnerMin = Math.max((end - start) / 60000, 1);
  let peakOwnerMin = 0;
  if (sh < eh) {
    peakOwnerMin = Math.max(0, Math.min(eh, OWNER_PE) - Math.max(sh, OWNER_PS)) * 60;
  } else {
    const b = Math.max(0, OWNER_PE - Math.max(sh, OWNER_PS)) * 60;
    const a = Math.max(0, Math.min(eh, OWNER_PE) - OWNER_PS) * 60;
    peakOwnerMin = b + a;
  }
  return Math.max(0, Math.min(1, peakOwnerMin / totalOwnerMin));
}

function fmtWevoTime(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  let h = dt.getHours();
  const m = dt.getMinutes();
  const ap = h < 12 ? 'לפנה"צ' : 'אחה"צ';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

function fmtWevoDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((startToday - startThat) / 86400000);
  const t = fmtWevoTime(dt);
  if (diffDays === 0) return `היום ${t}`;
  if (diffDays === 1) return `אתמול ${t}`;
  return `${DAY_HE[dt.getDay()]} ${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]}, ${t}`;
}

function fmtDuration(s) {
  const notes = s.notes || "";
  const m1 = notes.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (m1) return `${m1[1]}h ${m1[2]}m`;
  const m2 = notes.match(/(\d+)\s*:\s*(\d+)\s*h/i);
  if (m2) return `${m2[1]}h ${m2[2]}m`;
  if (s.durMin > 0) {
    const mins = Math.round(Number(s.durMin));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  return "";
}

function sessionTypeLabel(ratio) {
  if (ratio >= 0.85) return "טעינה פרימיום";
  if (ratio <= 0.15) return "טעינה רגילה";
  return "טעינה משולבת";
}

function WevoBoltIcon({
  color = "#fff",
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: color,
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 2L4.5 13.5H11L10 22l9.5-13H13L13 2z"
  }));
}

function WevoSessionMark({
  premium
}) {
  const c = premium ? WEVO.orange : WEVO.blue;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 3,
      flexShrink: 0,
      width: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: c,
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: c,
      display: "block"
    }
  })), /*#__PURE__*/React.createElement(WevoBoltIcon, {
    size: 18,
    color: c
  }));
}

function WevoCalIcon() {
  return /*#__PURE__*/React.createElement("svg", {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: WEVO.blueDeep,
    strokeWidth: 1.8,
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: 3,
    y: 5,
    width: 18,
    height: 16,
    rx: 3
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18M8 3v4M16 3v4"
  }));
}

function WevoLogoMark() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "left",
      direction: "ltr",
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Outfit', 'Heebo', sans-serif",
      fontWeight: 800,
      fontSize: 28,
      color: WEVO.blue,
      letterSpacing: "-0.045em"
    }
  }, "wevo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Heebo', sans-serif",
      fontSize: 11,
      fontWeight: 400,
      color: "#222",
      marginTop: 1,
      letterSpacing: "0.01em"
    }
  }, "by SolarEdge"));
}

function WevoPill({
  label,
  value,
  tone
}) {
  const soft = tone === "orange" ? WEVO.orangeSoft : WEVO.blueSoft;
  const color = tone === "orange" ? WEVO.orange : WEVO.blueDeep;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: soft,
      color,
      borderRadius: 999,
      padding: "8px 14px",
      fontSize: 14,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: color,
      display: "inline-block",
      flexShrink: 0
    }
  }), `${label} (${value})`);
}

function WevoHistoryView({
  sessions,
  clients = [],
  onBack,
  mode = "owner" // "owner" = עלות Wevo | "billing" = סכומים שנגבים מהלקוחות
}) {
  const h = React.createElement;
  const isBilling = mode === "billing";
  const now = new Date();
  const [selMo, setSelMo] = useState(now.getMonth());
  const [selYr, setSelYr] = useState(now.getFullYear());
  const [showRates, setShowRates] = useState(false);
  const cfg = getConfig();

  const historySessions = useMemo(() => {
    const all = (sessions || []).filter(Boolean);
    const wevoRows = all.filter(s => s.source === "wevo-sync");
    if (isBilling) return all.filter(s => s.source !== "wevo-sync");
    const wevoTxns = new Set(wevoRows.map(s => chargeTxnId(s)).filter(Boolean));
    const fallback = all.filter(s => {
      if (s.source === "wevo-sync") return false;
      const tid = chargeTxnId(s);
      if (tid && wevoTxns.has(tid)) return false;
      return Number(s.kwhRaw) > 0 || Number(s.costToOwner) > 0;
    });
    return [...wevoRows, ...fallback];
  }, [sessions, isBilling]);
  const enriched = useMemo(() => {
    const wevoByTxn = new Map();
    (sessions || []).forEach(row => {
      if (!row || row.source !== "wevo-sync") return;
      const tid = chargeTxnId(row);
      if (!tid) return;
      const amt = row.costToOwner != null ? Number(row.costToOwner) : Number(row.amountBilled);
      if (Number.isFinite(amt)) wevoByTxn.set(tid, amt);
    });
    return historySessions.map(s => {
      const ratio = isBilling
        ? Math.max(0, Math.min(1, Number(s.premiumRatio) || 0))
        : ownerPremRatio(s);
      const kwh = isBilling
        ? Number(s.kwhInflated) || Math.round((Number(s.kwhRaw) || 0) * getInflation()) || 0
        : Number(s.kwhRaw) || 0;
      let cost = Number(s.costToOwner) || 0;
      if (isBilling) {
        const cl = (clients || []).find(c => c.id === s.clientId);
        const ownCar = isSelfClient(cl) || s.selfPaid === true;
        if (ownCar) {
          const tid = chargeTxnId(s);
          const official = tid && wevoByTxn.has(tid) ? wevoByTxn.get(tid) : Number(s.costToOwner);
          cost = fictionalBilledDisplay(s.amountBilled, official);
        } else {
          cost = Number(s.amountBilled) || 0;
        }
      }
      return {
        ...s,
        ratio,
        kwh,
        premKwh: kwh * ratio,
        regKwh: kwh * (1 - ratio),
        cost
      };
    });
  }, [historySessions, isBilling, sessions, clients]);

  const allTime = useMemo(() => {
    const totalKwh = enriched.reduce((a, s) => a + s.kwh, 0);
    const totalCost = enriched.reduce((a, s) => a + s.cost, 0);
    const regKwh = enriched.reduce((a, s) => a + s.regKwh, 0);
    const premKwh = enriched.reduce((a, s) => a + s.premKwh, 0);
    const dates = enriched.map(s => new Date(s.date)).filter(d => !isNaN(d)).sort((a, b) => a - b);
    return {
      totalKwh,
      totalCost,
      regKwh,
      premKwh,
      from: dates[0] || null,
      to: dates[dates.length - 1] || null
    };
  }, [enriched]);

  const monthKeys = useMemo(() => {
    const ks = new Set(enriched.map(s => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    if (!ks.size) ks.add(`${now.getFullYear()}-${now.getMonth()}`);
    return [...ks].map(k => {
      const [y, m] = k.split("-").map(Number);
      return {
        y,
        m
      };
    }).sort((a, b) => b.y !== a.y ? b.y - a.y : b.m - a.m);
  }, [enriched]);

  const shiftMonth = dir => {
    const idx = monthKeys.findIndex(k => k.y === selYr && k.m === selMo);
    const next = monthKeys[idx < 0 ? 0 : idx - dir];
    if (next) {
      setSelYr(next.y);
      setSelMo(next.m);
    }
  };

  const monthSessions = useMemo(() => enriched.filter(s => {
    const d = new Date(s.date);
    return d.getFullYear() === selYr && d.getMonth() === selMo;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)), [enriched, selYr, selMo]);

  const monthStats = useMemo(() => {
    const totalKwh = monthSessions.reduce((a, s) => a + s.kwh, 0);
    const totalCost = monthSessions.reduce((a, s) => a + s.cost, 0);
    const avg = monthSessions.length ? totalKwh / monthSessions.length : 0;
    return {
      totalKwh,
      totalCost,
      avg,
      count: monthSessions.length
    };
  }, [monthSessions]);

  const dayBars = useMemo(() => {
    const daysInMonth = new Date(selYr, selMo + 1, 0).getDate();
    const days = Array.from({
      length: daysInMonth
    }, (_, i) => ({
      day: i + 1,
      reg: 0,
      prem: 0
    }));
    monthSessions.forEach(s => {
      const d = new Date(s.date).getDate();
      if (days[d - 1]) {
        days[d - 1].reg += s.regKwh;
        days[d - 1].prem += s.premKwh;
      }
    });
    const max = Math.max(...days.map(d => d.reg + d.prem), 1);
    return {
      days,
      max
    };
  }, [monthSessions, selYr, selMo]);

  const rangeLabel = (() => {
    if (!allTime.from || !allTime.to) return "";
    const a = allTime.from,
      b = allTime.to;
    return `${a.getDate()} ${MONTHS[a.getMonth()]}, ${a.getFullYear()} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}, ${b.getFullYear()}`;
  })();

  const premPct = allTime.totalKwh > 0 ? allTime.premKwh / allTime.totalKwh * 100 : 0;
  const chartH = 148;
  const yTicks = (() => {
    const m = dayBars.max;
    if (m <= 50) return [0, 25, 50];
    if (m <= 100) return [0, 50, 100];
    if (m <= 200) return [0, 100, 200];
    const top = Math.ceil(m / 100) * 100;
    return [0, top / 2, top];
  })();
  const yMax = yTicks[yTicks.length - 1] || dayBars.max;
  const xLabels = [1, 5, 9, 13, 17, 21, 25, 29].filter(d => d <= dayBars.days.length);

  const circleBtn = (label, onClick) => h("button", {
    onClick,
    "aria-label": label,
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      border: `1.5px solid #D8D8DC`,
      background: "#fff",
      color: "#A0A0A5",
      fontSize: 22,
      cursor: "pointer",
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0
    }
  }, label);

  const navIcon = (type, active) => {
    const c = active ? WEVO.blueDeep : "#A8A8AD";
    if (type === "home") return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.7
    }, h("path", {
      d: "M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
    }));
    if (type === "map") return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.7
    }, h("path", {
      d: "M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2-6-2z"
    }), h("path", {
      d: "M9 4v14M15 6v14"
    }));
    if (type === "hist") return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.8
    }, h("path", {
      d: "M12 7v5l3 2"
    }), h("path", {
      d: "M4.5 12a7.5 7.5 0 1 0 2.1-5.2"
    }), h("path", {
      d: "M4 7.5V12h4.5"
    }));
    return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.7
    }, h("circle", {
      cx: 12,
      cy: 8,
      r: 3.2
    }), h("path", {
      d: "M5.5 19c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8"
    }));
  };
  const navItem = (label, type, active, onClick) => h("button", {
    type: "button",
    onClick: typeof onClick === "function" ? e => {
      e.preventDefault();
      onClick();
    } : undefined,
    style: {
      flex: 1,
      border: "none",
      background: "none",
      padding: "10px 2px 8px",
      color: active ? WEVO.blueDeep : "#A8A8AD",
      cursor: typeof onClick === "function" ? "pointer" : "default",
      fontFamily: "'Heebo', sans-serif"
    }
  }, h("div", {
    style: {
      marginBottom: 3,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, navIcon(type, active)), h("div", {
    style: {
      fontSize: 11,
      fontWeight: active ? 700 : 500
    }
  }, label));

  const rateRows = (() => {
    if (isBilling) {
      const off = Number(cfg.rateRegular) || 1.47;
      const peak = Number(cfg.ratePremium) || 2.98;
      return [["עכשיו - 16:00", off], ["16:00 - 23:00", peak], ["23:00 - 16:00 (+1)", off]];
    }
    const off = Number(cfg.ownerOff) || 0.87;
    const peak = Number(cfg.ownerPeak) || 2.08;
    return [["עכשיו - 17:00", off], ["17:00 - 23:00", peak], ["23:00 - 17:00 (+1)", off]];
  })();
  const pageTitle = isBilling ? "היסטוריית חיוב" : "היסטוריית טעינה";
  const totalLabel = isBilling ? "Total billed · all time" : "Total charged · all time";
  const ratesTitle = isBilling ? "תעריפי גביה" : "תעריף משתנה";
  const ratesSub = isBilling ? "תעריפים שנגבים מהלקוחות:" : "תעריפים ל-24 השעות הקרובות:";

  return h("div", {
    style: {
      background: WEVO.bg,
      minHeight: "100vh",
      maxWidth: 430,
      margin: "0 auto",
      fontFamily: "'Heebo', -apple-system, BlinkMacSystemFont, sans-serif",
      color: WEVO.text,
      paddingBottom: 92,
      direction: "rtl",
      position: "relative"
    }
  },
  // Back bar (explicit — bottom Wevo nav also returns to dash)
  h("div", {
    style: {
      padding: "10px 16px 0",
      direction: "rtl"
    }
  }, h("button", {
    type: "button",
    onClick: typeof onBack === "function" ? onBack : undefined,
    style: {
      border: `1px solid ${WEVO.line}`,
      background: WEVO.blueSoft,
      color: WEVO.blueDeep,
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "'Heebo', sans-serif"
    }
  }, "← חזרה לדשבורד")),

  // Header: logo left, title right (LTR row)
  h("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "10px 20px 6px",
      direction: "ltr"
    }
  }, h(WevoLogoMark, null), h("div", {
    style: {
      fontWeight: 800,
      fontSize: 22,
      color: WEVO.text,
      direction: "rtl",
      textAlign: "right",
      paddingTop: 4,
      letterSpacing: "-0.01em"
    }
  }, pageTitle)),

  // Pills — under title (right side in RTL = flex-start)
  h("div", {
    style: {
      display: "flex",
      gap: 8,
      padding: "8px 20px 16px",
      justifyContent: "flex-start",
      flexWrap: "wrap"
    }
  }, h(WevoPill, {
    label: "רגילה",
    value: Math.round(allTime.regKwh),
    tone: "blue"
  }), h(WevoPill, {
    label: "פרימיום",
    value: Math.round(allTime.premKwh),
    tone: "orange"
  })),

  // All-time summary card
  h("div", {
    style: {
      margin: "0 16px 18px",
      background: WEVO.cardBg,
      border: `1px solid ${WEVO.line}`,
      borderRadius: 16,
      padding: "14px 16px 0",
      overflow: "hidden"
    }
  }, h("div", {
    style: {
      fontSize: 12.5,
      color: WEVO.muted,
      marginBottom: 12,
      textAlign: "right",
      lineHeight: 1.35
    }
  }, totalLabel, rangeLabel ? ` (${rangeLabel})` : ""), h("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 10
    }
  },
  // RTL: first = right → bolt, then kWh (bolt at far right like Wevo)
  h("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, h("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 11,
      background: WEVO.blue,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, h(WevoBoltIcon, {
    size: 20,
    color: "#fff"
  })), h("div", {
    style: {
      fontSize: 34,
      fontWeight: 800,
      color: WEVO.text,
      letterSpacing: "-0.03em",
      lineHeight: 1,
      direction: "rtl",
      whiteSpace: "nowrap"
    }
  }, Math.round(allTime.totalKwh), " ", h("span", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, 'קוט"ש'))), h("div", {
    style: {
      textAlign: "left",
      direction: "ltr",
      paddingTop: 10,
      fontSize: 20,
      fontWeight: 700,
      color: "#6B6B70"
    }
  }, "₪", allTime.totalCost.toFixed(2))),
  // Progress: orange (premium) on the LEFT visually
  h("div", {
    style: {
      height: 4,
      background: WEVO.blue,
      display: "flex",
      direction: "ltr",
      margin: "4px -16px 0"
    }
  }, h("div", {
    style: {
      width: Math.max(premPct, premPct > 0 ? 1.5 : 0) + "%",
      background: WEVO.orange,
      height: "100%"
    }
  }))),

  // Month nav
  h("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginBottom: 14,
      direction: "ltr"
    }
  }, circleBtn("‹", () => shiftMonth(1)), h("button", {
    onClick: () => setShowRates(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#fff",
      border: `1.5px solid ${WEVO.line}`,
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 700,
      fontSize: 15,
      color: WEVO.text,
      minWidth: 168,
      justifyContent: "center",
      direction: "rtl",
      cursor: "default",
      fontFamily: "'Heebo', sans-serif"
    }
  }, h(WevoCalIcon, null), h("span", null, MONTHS[selMo], " ", selYr), h("span", {
    style: {
      color: "#B0B0B5",
      fontSize: 12,
      marginRight: 2
    }
  }, "▾")), circleBtn("›", () => shiftMonth(-1))),

  // Month stats + chart card
  h("div", {
    style: {
      margin: "0 16px 8px",
      background: "#fff",
      border: `1px solid ${WEVO.line}`,
      borderRadius: 16,
      padding: "14px 12px 12px"
    }
  }, h("div", {
    style: {
      textAlign: "center",
      fontSize: 13,
      color: "#6B6B70",
      marginBottom: 14,
      display: "flex",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap"
    }
  }, h("span", null, "Total ", h("b", {
    style: {
      color: WEVO.text,
      fontWeight: 800
    }
  }, monthStats.totalKwh.toFixed(1), ' קוט"ש')), h("span", null, "Avg ", h("b", {
    style: {
      color: WEVO.text,
      fontWeight: 800
    }
  }, monthStats.avg.toFixed(1), ' קוט"ש')), h("span", null, isBilling ? "חיוב " : "עלות ", h("b", {
    style: {
      color: WEVO.text,
      fontWeight: 800
    }
  }, "₪", monthStats.totalCost.toFixed(2)))), h("div", {
    style: {
      display: "flex",
      gap: 4,
      height: chartH,
      direction: "ltr",
      alignItems: "stretch"
    }
  }, h("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      fontSize: 11,
      color: "#B0B0B5",
      width: 28,
      textAlign: "right",
      paddingBottom: 2
    }
  }, [...yTicks].reverse().map(t => h("span", {
    key: t
  }, t))), h("div", {
    style: {
      flex: 1,
      position: "relative",
      height: chartH,
      borderBottom: `1px solid ${WEVO.line}`
    }
  },
  // grid lines
  yTicks.slice(1).map(t => h("div", {
    key: "g" + t,
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: t / yMax * (chartH - 1),
      borderTop: "1px solid #F0F0F2",
      pointerEvents: "none"
    }
  })), h("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "flex-end",
      gap: 2,
      paddingLeft: 2
    }
  }, dayBars.days.map(d => {
    const total = d.reg + d.prem;
    const hPx = total / yMax * (chartH - 4);
    const premH = total > 0 ? d.prem / total * hPx : 0;
    const regH = Math.max(0, hPx - premH);
    return h("div", {
      key: d.day,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        height: "100%",
        minWidth: 0
      }
    }, h("div", {
      style: {
        height: premH,
        background: WEVO.orange,
        borderRadius: "2px 2px 0 0"
      }
    }), h("div", {
      style: {
        height: regH,
        background: WEVO.blue,
        borderRadius: premH > 0 ? 0 : "2px 2px 0 0"
      }
    }));
  })))), h("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginLeft: 32,
      marginTop: 6,
      fontSize: 11,
      color: "#B0B0B5",
      direction: "ltr",
      paddingRight: 2
    }
  }, xLabels.map(d => h("span", {
    key: d
  }, d)))),

  // Sessions header
  h("div", {
    style: {
      padding: "16px 20px 4px"
    }
  }, h("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 6
    }
  }, h("div", {
    style: {
      fontWeight: 800,
      fontSize: 17,
      color: WEVO.text
    }
  }, "Sessions · ", MONTHS[selMo], " ", selYr), h("div", {
    style: {
      background: "#F0F0F2",
      borderRadius: 10,
      minWidth: 28,
      textAlign: "center",
      padding: "2px 9px",
      fontWeight: 700,
      fontSize: 13,
      color: "#6B6B70"
    }
  }, monthStats.count)), h("button", {
    onClick: () => setShowRates(true),
    style: {
      border: "none",
      background: "none",
      padding: 0,
      color: WEVO.blueDeep,
      fontWeight: 600,
      fontSize: 13,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      fontFamily: "'Heebo', sans-serif",
      marginBottom: 4
    }
  }, h("span", {
    style: {
      fontSize: 15
    }
  }, "📄"), "View payments history", h("span", {
    style: {
      fontSize: 14
    }
  }, "‹"))),

  // Session rows
  monthSessions.length === 0 ? h("div", {
    style: {
      textAlign: "center",
      color: WEVO.muted,
      padding: 40,
      fontSize: 14
    }
  }, "אין טעינות בחודש זה") : monthSessions.map(s => {
    const isPrem = s.ratio >= 0.5;
    const dur = fmtDuration(s);
    return h("div", {
      key: s.id,
      style: {
        display: "flex",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: `1px solid ${WEVO.line}`,
        gap: 10
      }
    },
    // RTL first = right: session mark
    h(WevoSessionMark, {
      premium: isPrem
    }), h("div", {
      style: {
        flex: 1,
        textAlign: "right",
        minWidth: 0
      }
    }, h("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: WEVO.text
      }
    }, fmtWevoDate(s.date)), h("div", {
      style: {
        fontSize: 12.5,
        color: WEVO.muted,
        marginTop: 3
      }
    }, "בית | ", sessionTypeLabel(s.ratio))), h("div", {
      style: {
        textAlign: "left",
        flexShrink: 0
      }
    }, h("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: WEVO.blueDeep,
        direction: "ltr",
        textAlign: "left"
      }
    }, "₪", s.cost.toFixed(2)), h("div", {
      style: {
        fontSize: 12,
        color: "#6B6B70",
        marginTop: 3,
        whiteSpace: "nowrap",
        direction: "rtl",
        textAlign: "left"
      }
    }, s.kwh.toFixed(2), ' קוט"ש', dur ? `  ${dur}` : "")));
  }),

  // Bottom nav — RTL: first item = rightmost = המטען שלי
  h("div", {
    style: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      background: "#fff",
      borderTop: `1px solid ${WEVO.line}`,
      display: "flex",
      direction: "rtl",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      zIndex: 50,
      boxShadow: "0 -1px 0 rgba(0,0,0,0.02)"
    }
  }, navItem("המטען שלי", "home", false, onBack), navItem("מפה", "map", false, onBack), navItem("היסטוריה", "hist", true, null), navItem("הגדרות", "user", false, onBack)),

  // Rates bottom sheet (matches Wevo "תעריף משתנה")
  showRates && h("div", {
    onClick: () => setShowRates(false),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      zIndex: 80,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    }
  }, h("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: 430,
      background: "#fff",
      borderRadius: "20px 20px 0 0",
      padding: "10px 20px 28px",
      direction: "rtl"
    }
  }, h("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 4,
      background: "#D8D8DC",
      margin: "4px auto 16px"
    }
  }), h("div", {
    style: {
      textAlign: "center",
      fontWeight: 800,
      fontSize: 22,
      marginBottom: 6
    }
  }, ratesTitle), h("div", {
    style: {
      textAlign: "center",
      color: WEVO.muted,
      fontSize: 14,
      marginBottom: 16
    }
  }, ratesSub), h("div", {
    style: {
      border: `1px solid ${WEVO.line}`,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 14
    }
  }, rateRows.map(([lbl, rate], i) => h("div", {
    key: lbl,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "14px 16px",
      borderTop: i ? `1px solid ${WEVO.line}` : "none",
      fontWeight: 700,
      fontSize: 15
    }
  }, h("span", null, lbl), h("span", {
    style: {
      direction: "ltr"
    }
  }, "₪", Number(rate).toFixed(2), '/קוט"ש')))), h("div", {
    style: {
      textAlign: "right",
      color: WEVO.muted,
      fontSize: 13
    }
  }, "פרטי עלות:"), h("button", {
    onClick: () => setShowRates(false),
    style: {
      marginTop: 16,
      width: "100%",
      border: "none",
      background: WEVO.blueSoft,
      color: WEVO.blueDeep,
      borderRadius: 12,
      padding: "12px",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      fontFamily: "'Heebo', sans-serif"
    }
  }, "סגור"))));
}

// ── SettingsView: עדכון תעריפים ─────────────────────────────────────────────
function SettingsView({
  onSaved,
  onCancel
}) {
  const cfg = getConfig();
  const [rp, setRp] = useState(String(cfg.ratePremium));
  const [rr, setRr] = useState(String(cfg.rateRegular));
  const [op, setOp] = useState(String(cfg.ownerPeak));
  const [oo, setOo] = useState(String(cfg.ownerOff));
  const [inf, setInf] = useState(String(cfg.inflation != null ? cfg.inflation : 1.21));
  const valid = [rp, rr, op, oo, inf].every(v => v !== "" && !isNaN(parseFloat(v)) && parseFloat(v) > 0);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 17,
      marginBottom: 4
    }
  }, "⚙️ תעריפים"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#9ca3af",
      marginBottom: 16
    }
  }, "מתעדכן כל רבעון — שינוי משפיע על טעינות חדשות בלבד"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#eef2ff",
      border: "1px solid #c7d2fe",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 12,
      color: "#3730a3",
      fontWeight: 600
    }
  }, "💰 גביה מלקוחות"), /*#__PURE__*/React.createElement(FG, {
    lbl: "תעריף פרימיום (16:00–23:00) ₪/קוט״ש"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    value: rp,
    onChange: e => setRp(e.target.value),
    "data-testid": "settings-rate-premium"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "תעריף רגיל (שאר הזמן) ₪/קוט״ש"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    value: rr,
    onChange: e => setRr(e.target.value),
    "data-testid": "settings-rate-regular"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: `מקדם ניפוח קוט״ש (אינפלציה) — כרגע ${inf !== "" && !isNaN(parseFloat(inf)) ? `+${Math.round((parseFloat(inf) - 1) * 100)}%` : ""}`
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    min: "1",
    inputMode: "decimal",
    value: inf,
    onChange: e => setInf(e.target.value),
    placeholder: "1.21"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#9ca3af",
      marginTop: -8,
      marginBottom: 14
    }
  }, "לדוגמה: 1.21 = ניפוח של 21% על הקוט״ש לפני חיוב. משפיע על טעינות חדשות בלבד."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef9c3",
      border: "1px solid #fde68a",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 12,
      color: "#854d0e",
      fontWeight: 600
    }
  }, "🔒 עלות בעלים (מה שאתה משלם)"), /*#__PURE__*/React.createElement(FG, {
    lbl: "עלות פיק (17:00–23:00, ימי חול) ₪/קוט״ש"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    value: op,
    onChange: e => setOp(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "עלות רגילה (שאר הזמן + שישי/שבת) ₪/קוט״ש"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    value: oo,
    onChange: e => setOo(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: valid ? 1 : 0.5
    },
    disabled: !valid,
    onClick: () => {
      persistConfig({
        ratePremium: parseFloat(rp),
        rateRegular: parseFloat(rr),
        ownerPeak: parseFloat(op),
        ownerOff: parseFloat(oo),
        inflation: parseFloat(inf)
      });
      onSaved();
    },
    "data-testid": "settings-save"
  }, "שמור תעריפים"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

// ── ClientView ─────────────────────────────────────────────────────────────
function ClientView({
  cid,
  clients,
  stats,
  sessions,
  payments,
  go,
  onDelSession,
  onDelClient,
  onToggleArchive,
  openSess = [],
  onDelOpen,
  onComplete,
  onEditSession,
  onEditPayment
}) {
  const now = new Date();
  const [tab, setTab] = useState("s");
  const [selMo, setSelMo] = useState(now.getMonth());
  const [selYr, setSelYr] = useState(now.getFullYear());
  const [delS, setDelS] = useState(null);
  const [delC, setDelC] = useState(false);
  const c = clients.find(x => x.id === cid);
  const st = stats.find(x => x.id === cid);
  if (!c || !st) return null;
  const selfClient = isSelfClient(c);
  const billSessions = sessions.filter(s => s.source !== "wevo-sync");
  const allSS = [...billSessions.filter(s => s.clientId === cid)].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allPS = [...payments.filter(p => p.clientId === cid)].sort((a, b) => new Date(b.date) - new Date(a.date));
  const ledger = buildClientLedger(cid, billSessions, payments, {
    isSelf: selfClient
  });
  const ss = allSS.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === selMo && d.getFullYear() === selYr;
  });
  const monthKeys = new Set(allSS.map(s => {
    const d = new Date(s.date);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }));
  monthKeys.add(`${now.getFullYear()}-${now.getMonth()}`);
  const monthOpts = [...monthKeys].map(k => {
    const [y, m] = k.split("-").map(Number);
    return {
      y,
      m
    };
  }).sort((a, b) => b.y !== a.y ? b.y - a.y : b.m - a.m);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 52,
    fontSize: 22
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: S.cNameLg
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cPhone
  }, c.phone || "אין טלפון"), formatClientCarLine(c) && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cPhone,
      marginTop: 2,
      color: "#475569",
      fontWeight: 600
    }
  }, "🚗 ", formatClientCarLine(c))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("edit-c", cid),
    style: {
      background: "#eff6ff",
      border: "1.5px solid #bfdbfe",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 13,
      color: "#1d4ed8",
      fontWeight: 700
    }
  }, "✏️ ערוך"), !isSelfClient(c) && /*#__PURE__*/React.createElement("button", {
    onClick: () => onToggleArchive && onToggleArchive(cid, !(isClientArchived(c) || st.hidden)),
    style: {
      background: isClientArchived(c) || st.hidden ? "#ecfdf5" : "#f8fafc",
      border: isClientArchived(c) || st.hidden ? "1.5px solid #a7f3d0" : "1.5px solid #e2e8f0",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 12,
      color: isClientArchived(c) || st.hidden ? "#047857" : "#64748b",
      fontWeight: 700
    },
    "data-testid": "client-archive-toggle"
  }, isClientArchived(c) || st.hidden ? "שחזר מהארכיון" : "העבר לארכיון"), !delC ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelC(true),
    style: {
      background: "none",
      border: "1.5px solid #e5e7eb",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 13,
      color: "#9ca3af"
    },
    "data-testid": "client-delete"
  }, "🗑 מחק") : /*#__PURE__*/React.createElement("div", {
    style: S.confirmBar
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#991b1b",
      fontWeight: 700
    }
  }, "למחוק?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDelClient(cid),
    "data-testid": "client-delete-confirm",
    style: {
      background: "#ef4444",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      padding: "5px 12px",
      fontSize: 13,
      cursor: "pointer",
      fontWeight: 700
    }
  }, "כן"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelC(false),
    style: {
      background: "#f3f4f6",
      color: "#374151",
      border: "none",
      borderRadius: 6,
      padding: "5px 12px",
      fontSize: 13,
      cursor: "pointer"
    }
  }, "לא")))), /*#__PURE__*/React.createElement("div", {
    style: S.sumRow
  }, /*#__PURE__*/React.createElement(SumCard, {
    lbl: balanceSumLabel(st.balance, isSelfClient(c)),
    val: balanceSumVal(st.balance, isSelfClient(c)),
    color: balanceColor(st.balance, isSelfClient(c)),
    icon: hasCredit(st.balance) && !isSelfClient(c) ? "💚" : "💳"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח החודש",
    val: ilsFull(st.monthP),
    color: "#10b981",
    icon: "📈"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "עלות החודש",
    val: ils(st.monthCost),
    color: "#6b7280",
    icon: "🔒"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח כולל",
    val: ilsFull(st.totalP),
    color: "#6366f1",
    icon: "⚡"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.actRow
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.actBtn,
      flex: 2,
      background: "#059669",
      padding: "12px 8px"
    },
    onClick: () => go("add-s", cid),
    "data-testid": "client-add-session"
  }, "טעינה"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("add-open", cid),
    "data-testid": "client-add-open"
  }, "פתוח"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("add-p", cid),
    "data-testid": "client-add-payment"
  }, "תשלום"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("add-debt", cid),
    "data-testid": "client-add-debt"
  }, "חוב"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("report", cid),
    "data-testid": "client-report"
  }, "דוח")), /*#__PURE__*/React.createElement("div", {
    style: S.tabs
  }, /*#__PURE__*/React.createElement("button", {
    style: S.tab(tab === "s"),
    onClick: () => setTab("s"),
    "data-testid": "client-tab-sessions"
  }, "טעינות (", allSS.length, ")"), /*#__PURE__*/React.createElement("button", {
    style: S.tab(tab === "ledger"),
    onClick: () => setTab("ledger"),
    "data-testid": "client-tab-ledger"
  }, "עובר ושב (", ledger.length, ")"), /*#__PURE__*/React.createElement("button", {
    style: S.tab(tab === "p"),
    onClick: () => setTab("p"),
    "data-testid": "client-tab-payments"
  }, "תשלומים (", allPS.length, ")")), tab === "ledger" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 12,
      fontSize: 12,
      color: "#64748b",
      lineHeight: 1.45
    }
  }, "היסטוריה מלאה כמו עובר ושב: טעינות מגדילות חוב (+), הפקדות מקטינות (−). הימין — יתרה אחרי כל שורה."), ledger.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין תנועות עדיין") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    "data-testid": "client-ledger"
  }, ledger.map(e => {
    const isCredit = e.kind === "payment";
    const isCharge = e.kind === "session" || e.kind === "debt";
    const deltaColor = selfClient ? "#0ea5c6" : isCredit ? "#059669" : isCharge ? "#dc2626" : "#64748b";
    const bal = e.balanceAfter;
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      style: {
        ...S.row,
        alignItems: "stretch",
        padding: "12px 12px",
        cursor: e.kind === "session" || e.kind === "payment" || e.kind === "debt" ? "pointer" : "default"
      },
      onClick: () => {
        if (e.kind === "session" && onEditSession) onEditSession(e.refId);
        else if ((e.kind === "payment" || e.kind === "debt") && onEditPayment) onEditPayment(e.refId);
      },
      "data-testid": `ledger-row-${e.id}`
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: e.kind === "payment" ? "#047857" : e.kind === "debt" ? "#b91c1c" : "#0369a1",
        background: e.kind === "payment" ? "#ecfdf5" : e.kind === "debt" ? "#fef2f2" : "#f0f9ff",
        borderRadius: 6,
        padding: "2px 7px"
      }
    }, e.title), /*#__PURE__*/React.createElement("span", {
      style: S.rDate
    }, fdate(e.sortDate), " ", ftime(e.sortDate))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#64748b"
      }
    }, e.detail, e.notes ? ` · ${e.notes}` : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "left",
        flexShrink: 0,
        minWidth: 88
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: deltaColor,
        letterSpacing: -0.3
      }
    }, selfClient && e.kind === "session" ? ilsFull(e.showAmount) : `${e.delta > 0 ? "+" : e.delta < 0 ? "−" : ""}${ils(Math.abs(e.showAmount))}`), !selfClient && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        marginTop: 2,
        color: balanceColor(bal, false)
      }
    }, hasCredit(bal) ? `זכות ${ils(Math.abs(bal))}` : hasDebt(bal) ? `חוב ${ils(bal)}` : "מאופס")));
  }))), tab === "s" && /*#__PURE__*/React.createElement(React.Fragment, null, openSess.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#374151",
      marginBottom: 8
    }
  }, "טעינות פתוחות"), openSess.map(o => {
    const est = estimateFromOpen(o, c);
    const showBill = !isSelfClient(c) && (o.liveBilled != null || est.calc.amountBilled > 0);
    const stt = openChargeStatus(o, readLiveStation());
    const ended = stt.kind === "unplugged" || stt.kind === "cable";
    const liveNow = !ended;
    const liveKw = ended ? null : o.liveKw != null ? Number(o.liveKw) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        ...S.row,
        border: stt.kind === "unplugged" ? "2px solid #86efac" : stt.kind === "cable" ? "2px solid #93c5fd" : "2px solid #bae6fd",
        background: stt.kind === "unplugged" ? "#f0fdf4" : stt.kind === "cable" ? "#eff6ff" : "#f0f9ff",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-block",
        fontSize: 12,
        fontWeight: 800,
        color: stt.kind === "unplugged" ? "#166534" : stt.kind === "cable" ? "#1d4ed8" : "#92400e",
        background: stt.kind === "unplugged" ? "#dcfce7" : stt.kind === "cable" ? "#dbeafe" : "#fef3c7",
        borderRadius: 999,
        padding: "3px 8px",
        marginBottom: 6
      }
    }, stt.text), /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.rDate,
        marginTop: 4
      }
    }, "חיבור: ", fdate(o.startDate), " ", ftime(o.startDate), !liveNow && (o.chargeEndedAt || o.endDate) ? ` → סיום: ${fdate(o.chargeEndedAt || o.endDate)} ${ftime(o.chargeEndedAt || o.endDate)}` : ""), isChargeTimelineRelevant({
      isSelf: selfClient,
      ...timelineHintsFromOpenOrSession(o)
    }) && /*#__PURE__*/React.createElement(ChargeTimelineBox, {
      compact: true,
      timeline: resolveChargeTimeline({}, {
        plugInAt: o.plugInAt || o.startDate,
        chargeStartedAt: o.chargeStartedAt,
        chargeEndedAt: liveNow ? null : o.chargeEndedAt || o.endDate,
        plugOutAt: liveNow ? null : o.plugOutAt,
        chargingFullTime: liveNow ? null : o.chargingFullTime,
        netDuration: o.netDuration
      }),
      billStartKey: o.billStartKey || "plugIn",
      billEndKey: o.billEndKey || "chargeEnd"
    }), /*#__PURE__*/React.createElement("div", {
      style: S.rMeta
    }, o.liveKwh != null ? `${Number(o.liveKwh).toFixed(2)} קוט"ש` : "ממתין להשלמה...", liveKw != null ? ` · ${liveKw.toFixed(1)} kW` : "", o.liveWevoCost != null ? ` · עלות ₪${Number(o.liveWevoCost).toFixed(2)}` : "", showBill ? ` · לחיוב ${ils(o.liveBilled != null ? o.liveBilled : est.calc.amountBilled)} (${o.liveRateLabel || est.calc.rateLabel})` : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onComplete(o.id),
      style: {
        background: ended ? "#059669" : "#0369a1",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer"
      },
      "data-testid": `open-complete-${o.id}`
    }, ended && !(Number(o.liveKwh) > 0) ? "אין קוט״ש" : ended ? "✓ אשר ושמור" : "✓ השלם"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onDelOpen(o.id),
      style: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        padding: "4px 2px"
      },
      "data-testid": `open-delete-${o.id}`
    }, "מחק")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.inp,
      fontSize: 13
    },
    value: `${selYr}-${selMo}`,
    onChange: e => {
      const [y, m] = e.target.value.split("-").map(Number);
      setSelYr(y);
      setSelMo(m);
    }
  }, monthOpts.map(({
    y,
    m
  }) => /*#__PURE__*/React.createElement("option", {
    key: `${y}-${m}`,
    value: `${y}-${m}`
  }, MONTHS[m], " ", y)))), ss.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין טעינות ב", MONTHS[selMo], " ", selYr) : ss.map(s => {
    var _s$costToOwner;
    const selfRow = isSelfClient(c);
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      style: S.row
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: S.rDate
    }, fdate(s.date), " ", ftime(s.date), (s.chargeEndedAt || s.endDate) ? ` → ${fdate(s.chargeEndedAt || s.endDate) === fdate(s.date) ? ftime(s.chargeEndedAt || s.endDate) : fdate(s.chargeEndedAt || s.endDate) + " " + ftime(s.chargeEndedAt || s.endDate)}` : ""), (s.plugInAt || s.chargeStartedAt || s.chargeEndedAt || s.plugOutAt) && isChargeTimelineRelevant({
      isSelf: selfRow,
      ...timelineHintsFromOpenOrSession({
        ...s,
        startDate: s.date
      })
    }) && /*#__PURE__*/React.createElement(ChargeTimelineBox, {
      compact: true,
      timeline: resolveChargeTimeline({}, {
        plugInAt: s.plugInAt || s.date,
        chargeStartedAt: s.chargeStartedAt,
        chargeEndedAt: s.chargeEndedAt || s.endDate,
        plugOutAt: s.plugOutAt
      }),
      billStartKey: s.billStartKey || "plugIn",
      billEndKey: s.billEndKey || "chargeEnd"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        alignItems: "center",
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: S.rbadge(selfRow ? "#0ea5c6" : s.premiumRatio >= 1 ? "#f59e0b" : s.isMixed ? "#8b5cf6" : "#6b7280")
    }, selfRow ? "אשראי" : s.rateLabel === "מותאם" ? "מותאם" : s.isMixed ? "משולב" : s.premiumRatio >= 1 ? "פרימיום" : "רגיל"), /*#__PURE__*/React.createElement("span", {
      style: S.rMeta
    }, selfRow ? s.kwhRaw : s.kwhInflated, " קוט\"ש"), s.avgRateKW != null && /*#__PURE__*/React.createElement("span", {
      style: S.rMeta
    }, "· ממוצע ", Number(s.avgRateKW).toFixed(1), " kW"), s.stopReason && /*#__PURE__*/React.createElement("span", {
      style: S.rMeta
    }, "· ", wevoStopReasonHe(s.stopReason))), /*#__PURE__*/React.createElement("div", {
      style: S.rCost
    }, selfRow ? "יורד באשראי · ללא חוב" : /*#__PURE__*/React.createElement(React.Fragment, null, "עלות: ₪", (_s$costToOwner = s.costToOwner) === null || _s$costToOwner === void 0 ? void 0 : _s$costToOwner.toFixed(2), s.electricityCost != null ? ` · חשמל ₪${Number(s.electricityCost).toFixed(2)}` : "", " 🔒"))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "left",
        marginLeft: 6,
        marginRight: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: S.rAmt
    }, ilsFull(selfRow ? s.costToOwner || s.amountBilled : s.amountBilled)), /*#__PURE__*/React.createElement("div", {
      style: selfRow ? Object.assign({}, S.rPft, { color: "#0ea5c6" }) : S.rPft
    }, selfRow ? "אשראי ✓" : /*#__PURE__*/React.createElement(React.Fragment, null, "רווח: ", ilsFull(s.profit)))), delS === s.id ? /*#__PURE__*/React.createElement("div", {
      style: S.confirmOverlay
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#991b1b",
        fontWeight: 700,
        flex: 1
      }
    }, "למחוק?"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onDelSession(s.id);
        setDelS(null);
      },
      style: {
        background: "#ef4444",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: 12,
        cursor: "pointer",
        fontWeight: 700
      }
    }, "כן"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelS(null),
      style: {
        background: "#f3f4f6",
        color: "#374151",
        border: "none",
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: 12,
        cursor: "pointer"
      }
    }, "לא")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const bal = st ? st.balance : 0;
        const txt = waChargeMessage(s.amountBilled, bal, {
          isSelf: isSelfClient(c)
        });
        openWaDraft({
          phone: c && c.phone,
          name: c && c.name,
          text: txt
        });
      },
      style: {
        background: "none",
        border: "none",
        color: "#22c55e",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px"
      },
      title: "טיוטת הודעה",
      "data-testid": `wa-session-${s.id}`
    }, "💬"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditSession(s.id),
      style: {
        background: "none",
        border: "none",
        color: "#93c5fd",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px"
      },
      title: "ערוך",
      "data-testid": `session-edit-${s.id}`
    }, "✏️"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelS(s.id),
      style: {
        background: "none",
        border: "none",
        color: "#d1d5db",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px"
      }
    }, "🗑")));
  })), tab === "p" && (allPS.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין תשלומים") : allPS.map(p => {
    var _METHODS$p$method;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: S.row
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: S.rDate
    }, fdate(p.date), " ", ftime(p.date)), /*#__PURE__*/React.createElement("span", {
      style: S.mBadge
    }, (_METHODS$p$method = METHODS[p.method]) !== null && _METHODS$p$method !== void 0 ? _METHODS$p$method : p.method), p.notes ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...S.mBadge,
        marginRight: 4
      }
    }, p.notes) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.rAmt,
        color: p.method === "debt" ? "#ef4444" : "#10b981"
      }
    }, p.method === "debt" ? `+${ils(Math.abs(p.amount))} חוב` : `-${ils(Math.abs(p.amount))}`), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditPayment(p.id),
      style: {
        background: "none",
        border: "none",
        color: "#93c5fd",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px",
        marginRight: 6,
        flexShrink: 0
      },
      title: "ערוך"
    }, "✏️"));
  })));
}

// ── SessionForm: shared form logic (Add + Edit) ────────────────────────────
function SessionFormFields({
  dt,
  setDt,
  durInput,
  setDurInput,
  kwh,
  setKwh,
  fr,
  setFr,
  customRate,
  setCustomRate,
  notes,
  setNotes,
  adjust,
  setAdjust,
  prev,
  adjustVal,
  durMins,
  edt,
  isSelf = false
}) {
  var _prev$costToOwner;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FG, {
    lbl: "תאריך ושעת תחילת טעינה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "datetime-local",
    value: dt,
    onChange: e => setDt(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "משך טעינה (לטעינות משולבות — אופציונלי)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "text",
    placeholder: "3:24 או 3h 24m או 204",
    value: durInput,
    onChange: e => setDurInput(e.target.value)
  }), durMins > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      marginTop: 3
    }
  }, "= ", Math.floor(durMins / 60), "h ", durMins % 60, "m", edt ? ` | סיום: ${edt.slice(11, 16)}` : "")), /*#__PURE__*/React.createElement(FG, {
    lbl: "קוט\"ש גולמי (מהעמדה)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    placeholder: "35.41",
    inputMode: "decimal",
    value: kwh,
    onChange: e => setKwh(e.target.value),
    "data-testid": "session-kwh"
  })), isSelf ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfeff",
      border: "1.5px solid #a5f3fc",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#0e7490"
    }
  }, "💳 עצמי — רק עלות בפועל באשראי, בלי ניפוח / תוספות") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FG, {
    lbl: "תעריף"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.rg
  }, [["auto", "אוטומטי 🤖"], ["regular", `רגיל ₪${getConfig().rateRegular}`], ["premium", `פרימיום ₪${getConfig().ratePremium}`], ["custom", "מותאם ✍️"]].map(([v, l]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "fr",
    value: v,
    checked: fr === v,
    onChange: () => setFr(v)
  }), " ", l))), fr === "custom" && /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginTop: 8
    },
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    placeholder: "מחיר לקוט\"ש, למשל 2.5",
    value: customRate,
    onChange: e => setCustomRate(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "תוספת / הנחה (₪) — אופציונלי"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    placeholder: "למשל: 10 תוספת או -5 הנחה",
    value: adjust,
    onChange: e => setAdjust(e.target.value)
  }), adjust && parseFloat(adjust) !== 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: parseFloat(adjust) > 0 ? "#f59e0b" : "#10b981",
      marginTop: 3
    }
  }, parseFloat(adjust) > 0 ? `➕ תוספת ₪${parseFloat(adjust)}` : `➖ הנחה ₪${Math.abs(parseFloat(adjust))}`))), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "אופציונלי"
  })), prev && /*#__PURE__*/React.createElement("div", {
    style: S.prev,
    "data-testid": "session-preview"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.prevTitle
  }, "תצוגה מקדימה"), (isSelf ? [[`קוט"ש`, String(prev.kwhRaw), null], ["חיוב אשראי", ilsFull(prev.amountBilled), "#0ea5c6"], ["סטטוס", "אשראי ✓ · ללא חוב", "#0ea5c6"]] : [[`קוט"ש מנופח (${inflationPctLabel()})`, `${prev.kwhRaw} → ${prev.kwhInflated}`, null], ["תעריף", `₪${prev.rate} | ${prev.rateLabel}`, null], ["לחיוב (לפני תוספת)", ils(prev.amountBilled - (adjustVal || 0)), null], ...(adjustVal !== 0 ? [["תוספת/הנחה", `${adjustVal > 0 ? "+" : ""}${adjustVal}₪`, adjustVal > 0 ? "#f59e0b" : "#10b981"]] : []), ["סהכ לחיוב", ils(prev.amountBilled), "#6366f1"], ["עלות בפועל 🔒", `₪${(_prev$costToOwner = prev.costToOwner) === null || _prev$costToOwner === void 0 ? void 0 : _prev$costToOwner.toFixed(2)}`, "#9ca3af"], ["רווח", ilsFull(prev.profit), "#10b981"]]).map(([lbl, val, color]) => /*#__PURE__*/React.createElement("div", {
    key: lbl,
    style: S.pRow,
    "data-testid": lbl === "סהכ לחיוב" ? "session-preview-billed" : lbl === "עלות בפועל 🔒" ? "session-preview-cost" : undefined
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, lbl), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: color ? "700" : "400",
      fontSize: color ? 15 : 13,
      color: color || "#111827"
    }
  }, val)))));
}
function parseDurStr(s) {
  if (!s) return 0;
  s = s.trim();
  if (/^\d+:\d+$/.test(s)) {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  }
  const hm = s.match(/(\d+)h\s*(\d+)m?/i);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
  const h = s.match(/^(\d+)h$/i);
  if (h) return parseInt(h[1]) * 60;
  if (/^\d+$/.test(s)) return parseInt(s);
  return 0;
}

// ── AddSession (ידנית / הדבק / מהיר) ───────────────────────────────────────
function AddSession({
  clients,
  defaultCid,
  onSave,
  onCancel
}) {
  var _ref, _clients$, _ocrParsed$startDt;
  const [mode, setMode] = useState("manual");
  const [cid, setCid] = useState((_ref = defaultCid !== null && defaultCid !== void 0 ? defaultCid : (_clients$ = clients[0]) === null || _clients$ === void 0 ? void 0 : _clients$.id) !== null && _ref !== void 0 ? _ref : "");
  const [dt, setDt] = useState(toLocalDT(new Date()));
  const [durInput, setDurInput] = useState("");
  const [kwh, setKwh] = useState("");
  const [fr, setFr] = useState("auto");
  const [customRate, setCustomRate] = useState("");
  const [notes, setNotes] = useState("");
  const [prev, setPrev] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrParsed, setOcrParsed] = useState(null);
  const [ocrErr, setOcrErr] = useState("");
  const [adjust, setAdjust] = useState("");
  // Quick mode
  const [qKwh, setQKwh] = useState("");
  const [qRate, setQRate] = useState("");
  const adjustVal = parseFloat(adjust) || 0;
  const durMins = parseDurStr(durInput);
  const edt = dt && durMins > 0 ? addMinutes(dt, durMins) : "";
  const selectedCl = clients.find(x => x.id === cid);
  const isSelfAdd = isSelfClient(selectedCl);
  useEffect(() => {
    if (!kwh || isNaN(parseFloat(kwh))) {
      setPrev(null);
      return;
    }
    const cr = fr === "custom" ? parseFloat(customRate) || null : null;
    const raw = calcSession(parseFloat(kwh), new Date(dt), edt ? new Date(edt) : null, fr === "regular", fr === "premium", cr);
    setPrev(billingForClient(raw, selectedCl, {
      adjust: isSelfAdd ? 0 : adjustVal
    }));
  }, [kwh, dt, edt, fr, customRate, adjustVal, cid, isSelfAdd]);
  const qPrev = useMemo(() => {
    if (!qKwh || isNaN(parseFloat(qKwh))) return null;
    const cr = qRate && !isNaN(parseFloat(qRate)) ? parseFloat(qRate) : null;
    const raw = calcSession(parseFloat(qKwh), new Date(), null, false, false, cr);
    return billingForClient(raw, selectedCl, {});
  }, [qKwh, qRate, cid]);
  function handleOcrChange(text) {
    setOcrText(text);
    const result = parseChargeText(text);
    if (result.error !== undefined) {
      setOcrErr(result.error);
      setOcrParsed(null);
    } else {
      setOcrParsed(result);
      setOcrErr("");
    }
  }
  function applyOcr() {
    if (!ocrParsed) return;
    setKwh(String(ocrParsed.kwh));
    setDt(ocrParsed.startDt);
    if (ocrParsed.durMin) setDurInput(String(ocrParsed.durMin));
    setMode("manual");
    setOcrText("");
    setOcrParsed(null);
  }
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.tabs
  }, /*#__PURE__*/React.createElement("button", {
    style: S.tab(mode === "manual"),
    onClick: () => setMode("manual")
  }, "✍️ ידנית"), /*#__PURE__*/React.createElement("button", {
    style: S.tab(mode === "quick"),
    onClick: () => setMode("quick")
  }, "⚡ מהיר"), /*#__PURE__*/React.createElement("button", {
    style: S.tab(mode === "paste"),
    onClick: () => setMode("paste")
  }, "📋 הדבק")), /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement(FG, {
    lbl: "לקוח"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: cid,
    onChange: e => setCid(e.target.value),
    "data-testid": "session-client"
  }, clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), mode === "quick" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FG, {
    lbl: "קוט\"ש גולמי"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    placeholder: "35.41",
    value: qKwh,
    onChange: e => setQKwh(e.target.value),
    autoFocus: true,
    "data-testid": "session-kwh-quick"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "מחיר לקוט\"ש (ריק = אוטומטי לפי השעה)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    placeholder: `למשל ${getConfig().rateRegular}`,
    value: qRate,
    onChange: e => setQRate(e.target.value)
  })), qPrev && /*#__PURE__*/React.createElement("div", {
    style: S.prev
  }, /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "לחיוב"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "#6366f1",
      fontSize: 15
    }
  }, ils(qPrev.amountBilled))), /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "רווח"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#10b981",
      fontWeight: 600
    }
  }, ilsFull(qPrev.profit)))), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: qPrev ? 1 : 0.5
    },
    disabled: !qPrev,
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      date: toLocalDT(new Date()),
      ...qPrev,
      source: "quick",
      notes: ""
    })
  }, "⚡ שמור מהיר"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))), mode === "paste" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FG, {
    lbl: "הדבק טקסט מאפליקציית Wevo"
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...S.inp,
      height: 100,
      resize: "vertical",
      fontFamily: "monospace",
      fontSize: 13
    },
    placeholder: "לדוגמה:\nיום ה' 28 מאי, 5:52 אחה\"צ\n35.41 קוט\"ש  3h 24m  ₪30.47",
    value: ocrText,
    onChange: e => handleOcrChange(e.target.value)
  })), ocrErr && /*#__PURE__*/React.createElement("div", {
    style: S.errMsg
  }, ocrErr), ocrParsed && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.prev,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.prevTitle
  }, "✅ זוהה"), /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "שעת התחלה"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, (_ocrParsed$startDt = ocrParsed.startDt) === null || _ocrParsed$startDt === void 0 ? void 0 : _ocrParsed$startDt.replace("T", " "))), /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "משך"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, ocrParsed.durMin ? `${Math.floor(ocrParsed.durMin / 60)}h ${ocrParsed.durMin % 60}m` : "לא זוהה")), /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "קוט\"ש"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13
    }
  }, ocrParsed.kwh)), ocrParsed.appAmt != null && /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "סכום אפליקציה"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, "₪", ocrParsed.appAmt)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      marginTop: 8,
      padding: "10px"
    },
    onClick: applyOcr
  }, "✓ אשר ועבור להזנה"))), mode === "manual" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SessionFormFields, {
    dt: dt,
    setDt: setDt,
    durInput: durInput,
    setDurInput: setDurInput,
    kwh: kwh,
    setKwh: setKwh,
    fr: fr,
    setFr: setFr,
    customRate: customRate,
    setCustomRate: setCustomRate,
    notes: notes,
    setNotes: setNotes,
    adjust: adjust,
    setAdjust: setAdjust,
    prev: prev,
    adjustVal: isSelfAdd ? 0 : adjustVal,
    durMins: durMins,
    edt: edt,
    isSelf: isSelfAdd
  }), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: prev ? 1 : 0.5
    },
    disabled: !prev,
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      date: dt,
      ...prev,
      source: "manual",
      notes
    }),
    "data-testid": "session-save"
  }, prev ? isSelfAdd ? "שמור עלות אשראי" : "שמור טעינה" : !kwh ? `⚠️ הכנס קוט"ש` : "מחשב..."), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")))));
}

// ── EditSession: עריכת טעינה קיימת ─────────────────────────────────────────
function EditSession({
  session,
  clients,
  onSave,
  onCancel
}) {
  const initialDt = session ? toLocalDT(session.date) : toLocalDT(new Date());
  const initialDur = initialEditDuration(session);
  const initialKwh = session ? String(session.kwhRaw) : "";
  const initialRate = session && Number(session.rate) > 0 ? String(session.rate) : "";
  const [dt, setDt] = useState(initialDt);
  const [durInput, setDurInput] = useState(initialDur);
  const [kwh, setKwh] = useState(initialKwh);
  // שומרים את התעריף המקורי כמותאם — מונע קפיצה מתעריפי ברירת מחדל עדכניים
  const [fr, setFr] = useState(initialRate ? "custom" : "auto");
  const [customRate, setCustomRate] = useState(initialRate);
  const [notes, setNotes] = useState((session === null || session === void 0 ? void 0 : session.notes) || "");
  const [adjust, setAdjust] = useState("");
  const [prev, setPrev] = useState(() => previewFromSession(session));
  const adjustVal = parseFloat(adjust) || 0;
  const durMins = parseDurStr(durInput);
  const edt = dt && durMins > 0 ? addMinutes(dt, durMins) : "";
  const editCl = session ? clients.find(x => x.id === session.clientId) : null;
  const isSelfEdit = isSelfClient(editCl);
  const fieldsDirty = !session ? false
    : String(kwh) !== String(initialKwh)
      || String(dt) !== String(initialDt)
      || String(durInput) !== String(initialDur)
      || fr !== (initialRate ? "custom" : "auto")
      || (fr === "custom" && String(customRate) !== String(initialRate))
      || adjustVal !== 0;

  useEffect(() => {
    if (!session) {
      setPrev(null);
      return;
    }
    if (!kwh || isNaN(parseFloat(kwh))) {
      setPrev(null);
      return;
    }
    // בלי שינוי שדות חישוב — מציגים את הסכומים השמורים (בלי קפיצה)
    if (!fieldsDirty) {
      setPrev(previewFromSession(session));
      return;
    }
    const cr = fr === "custom" ? parseFloat(customRate) || null : null;
    const raw = calcSession(parseFloat(kwh), new Date(dt), edt ? new Date(edt) : null, fr === "regular", fr === "premium", cr);
    const kwhSame = Math.abs(parseFloat(kwh) - Number(session.kwhRaw)) < 0.0001;
    // אם הקוט״ש לא השתנה — שומרים ניפוח ועלות מקוריים כדי לא לקפוץ מתעריפי בעלים/אינפלציה חדשים
    const preserved = kwhSame ? {
      ...raw,
      kwhInflated: Number(session.kwhInflated) || raw.kwhInflated,
      amountBilled: cr != null && cr > 0
        ? Math.ceil((Number(session.kwhInflated) || raw.kwhInflated) * cr)
        : Math.ceil((Number(session.kwhInflated) || raw.kwhInflated) * raw.rate)
    } : raw;
    setPrev(billingForClient(preserved, editCl, {
      adjust: isSelfEdit ? 0 : adjustVal,
      actualCost: kwhSame ? session.costToOwner : undefined
    }));
  }, [kwh, dt, edt, fr, customRate, session, adjustVal, isSelfEdit, fieldsDirty, editCl]);

  if (!session) return null;
  const c = editCl;
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 48,
    fontSize: 20
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cNameLg
  }, c === null || c === void 0 ? void 0 : c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#3b82f6",
      fontWeight: 600
    }
  }, "✏️ עריכת טעינה"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: fieldsDirty ? "#fff7ed" : "#eff6ff",
      border: fieldsDirty ? "1px solid #fed7aa" : "1px solid #bfdbfe",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 12,
      color: fieldsDirty ? "#9a3412" : "#1e40af"
    }
  }, fieldsDirty
    ? "שינית שדות — החיוב מחושב מחדש. חיוב מקורי היה: "
    : "מוצגים הסכומים השמורים של הטעינה. שינוי קוט״ש/תעריף/זמן יחשב מחדש. חיוב שמור: ", ils(session.amountBilled)), /*#__PURE__*/React.createElement(SessionFormFields, {
    dt: dt,
    setDt: setDt,
    durInput: durInput,
    setDurInput: setDurInput,
    kwh: kwh,
    setKwh: setKwh,
    fr: fr,
    setFr: setFr,
    customRate: customRate,
    setCustomRate: setCustomRate,
    notes: notes,
    setNotes: setNotes,
    adjust: adjust,
    setAdjust: setAdjust,
    prev: prev,
    adjustVal: isSelfEdit ? 0 : adjustVal,
    durMins: durMins,
    edt: edt,
    isSelf: isSelfEdit
  }), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: prev ? 1 : 0.5
    },
    disabled: !prev,
    onClick: () => onSave(session.id, {
      date: dt,
      ...prev,
      notes,
      durMin: durMins > 0 ? durMins : session.durMin,
      endDate: edt || session.endDate || null
    }),
    "data-testid": "session-edit-save"
  }, isSelfEdit ? "עדכן עלות אשראי" : "עדכן טעינה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

// ── AddOpenSession ─────────────────────────────────────────────────────────
function AddOpenSession({
  clients,
  defaultCid,
  onSave,
  onCancel
}) {
  var _ref2, _clients$2;
  const [cid, setCid] = useState((_ref2 = defaultCid !== null && defaultCid !== void 0 ? defaultCid : (_clients$2 = clients[0]) === null || _clients$2 === void 0 ? void 0 : _clients$2.id) !== null && _ref2 !== void 0 ? _ref2 : "");
  const [dt, setDt] = useState(toLocalDT(new Date()));
  const [notes, setNotes] = useState("");
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#e0f2fe",
      border: "1px solid #bae6fd",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#0369a1",
      fontWeight: 600
    }
  }, "⏳ טעינה פתוחה — תשלים את הנתונים בסיום"), /*#__PURE__*/React.createElement(FG, {
    lbl: "לקוח"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: cid,
    onChange: e => setCid(e.target.value)
  }, clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "שעת תחילת טעינה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "datetime-local",
    value: dt,
    onChange: e => setDt(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות (אופציונלי)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "הערה..."
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#0ea5e9"
    },
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      startDate: dt,
      notes
    }),
    "data-testid": "open-start"
  }, "⏳ התחל טעינה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

// ── חלון זמני טעינה (4 נקודות) ─────────────────────────────────────────────
function ChargeTimelineBox({
  timeline,
  billStartKey,
  billEndKey,
  compact = false
}) {
  const pts = timelinePoints(timeline);
  if (!pts.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: compact ? "8px 10px" : "10px 12px",
      marginBottom: compact ? 6 : 12,
      fontSize: compact ? 12 : 13,
      lineHeight: 1.55,
      color: "#334155"
    },
    "data-testid": "charge-timeline"
  }, !compact && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#0f172a",
      marginBottom: 6
    }
  }, "חלון זמנים"), pts.map(p => {
    const isBillStart = billStartKey === p.key;
    const isBillEnd = billEndKey === p.key;
    return /*#__PURE__*/React.createElement("div", {
      key: p.key,
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        padding: "2px 0",
        fontWeight: isBillStart || isBillEnd ? 700 : 400,
        color: isBillStart ? "#0369a1" : isBillEnd ? "#b45309" : "#334155"
      }
    }, /*#__PURE__*/React.createElement("span", null, p.label, isBillStart ? " · התחלת חיוב" : "", isBillEnd ? " · סיום חיוב" : ""), /*#__PURE__*/React.createElement("span", {
      style: {
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums"
      }
    }, formatTimelineClock(p.at)));
  }));
}

// ── CompleteSession ────────────────────────────────────────────────────────
function CompleteSession({
  openSession,
  clients,
  onSave,
  onCancel,
  onDelete,
  onUpsertOpen
}) {
  var _openSession$startDat, _prev$costToOwner2;
  const isWevoLinked = !!(openSession && (openSession.source === "wevo-live" || openSession.wevoTxnId || /wevo|txn#/i.test(String(openSession.notes || ""))));
  const selfClient = openSession ? clients.find(x => x.id === openSession.clientId) : null;
  const isSelf = isSelfClient(selfClient);
  const readyFromWevo = !!(openSession && openSession.readyToComplete);
  const [durInput, setDurInput] = useState("");
  const [endDt, setEndDt] = useState(() => {
    const src = openSession && (openSession.chargeEndedAt || openSession.endDate);
    return src ? asLocalDT(src) : "";
  });
  const [useEnd, setUseEnd] = useState(!!(isWevoLinked || readyFromWevo || (openSession && (openSession.chargeEndedAt || openSession.endDate))));
  const [kwh, setKwh] = useState(() => openSession && openSession.liveKwh != null && Number(openSession.liveKwh) > 0 ? String(Number(openSession.liveKwh)) : "");
  const [fr, setFr] = useState("auto");
  const [customRate, setCustomRate] = useState("");
  const [prev, setPrev] = useState(null);
  const [adjust, setAdjust] = useState("");
  const [wevoFetch, setWevoFetch] = useState("");
  const [wevoFetchErr, setWevoFetchErr] = useState("");
  const [preferMaxBill, setPreferMaxBill] = useState(true);
  const [billStartKey, setBillStartKey] = useState(() => openSession && openSession.billStartKey || "plugIn");
  const [billEndKey, setBillEndKey] = useState(() => openSession && openSession.billEndKey || "chargeEnd");
  const [timelineOverride, setTimelineOverride] = useState(null);
  const adjVal = isSelf ? 0 : parseFloat(adjust) || 0;
  const startDt = (_openSession$startDat = openSession === null || openSession === void 0 ? void 0 : openSession.startDate) !== null && _openSession$startDat !== void 0 ? _openSession$startDat : "";
  const [startEdit, setStartEdit] = useState(startDt);
  const durMins = parseDurStr(durInput);
  const effectiveStart = startEdit || startDt;
  // שעת סיום לחישוב: עדיפות לשדה סיום; אם יש משך בלבד — מחושב מההתחלה
  const edt = endDt || (durMins > 0 && effectiveStart ? addMinutes(effectiveStart, durMins) : "");
  const sessionTimeline = timelineOverride || resolveChargeTimeline({}, {
    plugInAt: openSession && (openSession.plugInAt || openSession.startDate),
    chargeStartedAt: openSession && openSession.chargeStartedAt,
    chargeEndedAt: openSession && (openSession.chargeEndedAt || openSession.endDate),
    plugOutAt: openSession && openSession.plugOutAt,
    chargingFullTime: openSession && openSession.chargingFullTime,
    netDuration: openSession && openSession.netDuration
  });
  const tlPoints = timelinePoints(sessionTimeline);
  const timelineRelevant = isChargeTimelineRelevant({
    isSelf,
    plugInAt: sessionTimeline.plugInAt || openSession && (openSession.plugInAt || openSession.startDate),
    chargeEndAt: sessionTimeline.chargeEndAt || openSession && (openSession.chargeEndedAt || openSession.endDate),
    plugOutAt: sessionTimeline.plugOutAt || openSession && openSession.plugOutAt,
    startDate: openSession && openSession.startDate,
    endDate: openSession && (openSession.plugOutAt || openSession.chargeEndedAt || openSession.endDate)
  });
  const preferMaxEffective = timelineRelevant && preferMaxBill;
  const applyWindowKeys = (startKey, endKey, tl = sessionTimeline) => {
    const s = pointAt(tl, startKey);
    const e = pointAt(tl, endKey);
    if (s) {
      setStartEdit(asLocalDT(s));
      setBillStartKey(startKey);
    }
    if (e) {
      setEndDt(asLocalDT(e));
      setUseEnd(true);
      setBillEndKey(endKey);
    }
    if (s && e) {
      const mins = minsBetweenLocal(asLocalDT(s), asLocalDT(e));
      if (mins > 0) setDurInput(formatDurMins(mins));
    }
  };
  const applyMaxBill = (tl = sessionTimeline, kwhVal = parseFloat(kwh)) => {
    if (!(kwhVal > 0) || !tl) return null;
    const cr = fr === "custom" ? parseFloat(customRate) || null : null;
    const best = pickMaxBillWindow(kwhVal, tl, {
      forceReg: fr === "regular",
      forcePrem: fr === "premium",
      customRate: cr
    });
    if (best) applyWindowKeys(best.startKey, best.endKey, tl);
    return best;
  };
  const applyWevoFields = fields => {
    if (!fields) return;
    if (fields.kwh > 0) setKwh(String(Number(fields.kwh)));
    const tl = fields.timeline || resolveChargeTimeline({}, {
      plugInAt: fields.plugInAt || fields.start,
      chargeStartedAt: fields.chargeStartAt,
      chargeEndedAt: fields.chargeEndAt || fields.end,
      plugOutAt: fields.plugOutEnd || fields.plugOutAt,
      netDuration: fields.netMins != null ? fields.netMins * 60 : null
    });
    setTimelineOverride(tl);
    if (preferMaxEffective && fields.kwh > 0) {
      applyMaxBill(tl, fields.kwh);
    } else {
      const sk = fields.billStartKey || billStartKey || "plugIn";
      const ek = fields.billEndKey || billEndKey || "chargeEnd";
      applyWindowKeys(sk, ek, tl);
    }
  };
  const pullWevoFinal = async () => {
    if (!openSession || !isWevoLinked) return;
    const creds = getWevoCreds();
    if (!(creds.email && creds.password)) {
      setWevoFetch("err");
      setWevoFetchErr("אין התחברות Wevo — היכנס ב־סנכרן Wevo");
      return;
    }
    setWevoFetch("loading");
    setWevoFetchErr("");
    try {
      const fields = await fetchWevoFinalForOpen({
        ...openSession,
        chargeStartedAt: openSession.chargeStartedAt,
        chargeEndedAt: openSession.chargeEndedAt,
        plugOutAt: openSession.plugOutAt
      }, {
        retries: 4,
        gapMs: 1200
      });
      if (!fields || !(fields.kwh > 0)) {
        setWevoFetch("err");
        setWevoFetchErr("Wevo עדיין לא מחזיר קוט״ש סופי — נסה שוב בעוד רגע");
        return;
      }
      applyWevoFields(fields);
      if (typeof onUpsertOpen === "function") {
        onUpsertOpen({
          ...openSession,
          liveKwh: fields.kwh,
          liveWevoCost: fields.cost != null ? fields.cost : openSession.liveWevoCost,
          liveElecCost: fields.elec != null ? fields.elec : openSession.liveElecCost,
          endDate: fields.end,
          startDate: fields.start || openSession.startDate,
          plugInAt: fields.plugInAt || fields.start || openSession.plugInAt || openSession.startDate,
          chargeStartedAt: fields.chargeStartAt || openSession.chargeStartedAt || null,
          chargeEndedAt: fields.chargeEndAt || fields.end,
          plugOutAt: fields.plugOutAt || fields.plugOutEnd || openSession.plugOutAt || null,
          billStartKey: fields.billStartKey || billStartKey,
          billEndKey: fields.billEndKey || billEndKey,
          wevoTxnId: fields.wevoTxnId || openSession.wevoTxnId,
          readyToComplete: true,
          wevoEnded: true,
          source: openSession.source || "wevo-live",
          avgRateKW: fields.avgRateKW,
          maxRateKW: fields.maxRateKW,
          stopReason: fields.stopReason,
          wevoOrigin: fields.origin,
          didCompleteFull: fields.didCompleteFull,
          wevoFlags: {
            ...(openSession.wevoFlags || {}),
            isBoost: !!fields.isBoost
          }
        }, {
          silent: true
        });
      }
      setWevoFetch("ok");
    } catch (e) {
      setWevoFetch("err");
      setWevoFetchErr(e.message || "שגיאה בשליפה מ-Wevo");
    }
  };
  useEffect(() => {
    if (!openSession) return;
    if (openSession.liveKwh != null && Number(openSession.liveKwh) > 0) setKwh(String(Number(openSession.liveKwh)));
    const tl = resolveChargeTimeline({}, {
      plugInAt: openSession.plugInAt || openSession.startDate,
      chargeStartedAt: openSession.chargeStartedAt,
      chargeEndedAt: openSession.chargeEndedAt || openSession.endDate,
      plugOutAt: openSession.plugOutAt,
      chargingFullTime: openSession.chargingFullTime,
      netDuration: openSession.netDuration
    });
    if (timelinePoints(tl).length) setTimelineOverride(tl);
    if (openSession.readyToComplete || isWevoLinked) setUseEnd(true);
    const kwhVal = Number(openSession.liveKwh) || parseFloat(kwh) || 0;
    if (preferMaxEffective && kwhVal > 0 && timelinePoints(tl).length >= 2) {
      const best = pickMaxBillWindow(kwhVal, tl);
      if (best) applyWindowKeys(best.startKey, best.endKey, tl);
    } else {
      const endSrc = openSession.chargeEndedAt || openSession.endDate;
      if (openSession.startDate) setStartEdit(asLocalDT(openSession.startDate) || openSession.startDate);
      if (endSrc) {
        const endLocal = asLocalDT(endSrc);
        setEndDt(endLocal);
        setUseEnd(true);
        const startLocal = asLocalDT(openSession.startDate || startEdit);
        if (startLocal && endLocal) {
          const mins = minsBetweenLocal(startLocal, endLocal);
          if (mins > 0) setDurInput(formatDurMins(mins));
        }
      }
    }
  }, [openSession && openSession.id, openSession && openSession.readyToComplete, openSession && openSession.endDate, openSession && openSession.chargeEndedAt, openSession && openSession.plugOutAt, openSession && openSession.chargeStartedAt, openSession && openSession.liveKwh]);
  useEffect(() => {
    if (!preferMaxEffective) return;
    const kwhVal = parseFloat(kwh);
    if (!(kwhVal > 0) || timelinePoints(sessionTimeline).length < 2) return;
    const cr = fr === "custom" ? parseFloat(customRate) || null : null;
    const best = pickMaxBillWindow(kwhVal, sessionTimeline, {
      forceReg: fr === "regular",
      forcePrem: fr === "premium",
      customRate: cr
    });
    if (!best) return;
    if (best.startKey === billStartKey && best.endKey === billEndKey && asLocalDT(best.start) === asLocalDT(startEdit) && asLocalDT(best.end) === asLocalDT(endDt)) {
      return;
    }
    applyWindowKeys(best.startKey, best.endKey, sessionTimeline);
  }, [preferMaxEffective, kwh, fr, customRate, sessionTimeline && sessionTimeline.plugInAt, sessionTimeline && sessionTimeline.chargeEndAt, sessionTimeline && sessionTimeline.plugOutAt, sessionTimeline && sessionTimeline.chargeStartAt]);
  useEffect(() => {
    if (!openSession || !isWevoLinked) return undefined;
    let cancelled = false;
    (async () => {
      await pullWevoFinal();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [openSession && openSession.id]);
  useEffect(() => {
    if (!openSession || !kwh || isNaN(parseFloat(kwh)) || !edt || !effectiveStart) {
      setPrev(null);
      return;
    }
    const cr = fr === "custom" ? parseFloat(customRate) || null : null;
    const raw = calcSession(parseFloat(kwh), new Date(effectiveStart), new Date(edt), fr === "regular", fr === "premium", cr);
    const cl = clients.find(x => x.id === openSession.clientId);
    const actual = openSession.liveWevoCost != null ? Number(openSession.liveWevoCost) : raw.costToOwner;
    setPrev(billingForClient(raw, cl, {
      adjust: adjVal,
      actualCost: actual
    }));
  }, [kwh, edt, fr, customRate, effectiveStart, openSession, adjVal, clients]);
  if (!openSession) return null;
  const c = clients.find(x => x.id === openSession.clientId);
  const filledOk = Number(kwh) > 0 && !!edt;
  const onDurChange = val => {
    setDurInput(val);
    const mins = parseDurStr(val);
    if (mins > 0 && effectiveStart) {
      setUseEnd(true);
      setEndDt(addMinutes(effectiveStart, mins));
    }
  };
  const onEndChange = val => {
    setUseEnd(true);
    setEndDt(val);
    if (effectiveStart && val) {
      const mins = minsBetweenLocal(effectiveStart, val);
      if (mins > 0) setDurInput(formatDurMins(mins));
    }
  };
  const onStartChange = val => {
    setStartEdit(val);
    const mins = parseDurStr(durInput);
    if (mins > 0 && val) {
      setUseEnd(true);
      setEndDt(addMinutes(val, mins));
    } else if (val && endDt) {
      const m = minsBetweenLocal(val, endDt);
      if (m > 0) setDurInput(formatDurMins(m));
    }
  };
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 48,
    fontSize: 20
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cNameLg
  }, c === null || c === void 0 ? void 0 : c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#0ea5e9",
      fontWeight: 600
    }
  }, "השלמת טעינה פתוחה", filledOk ? " · מוכן לאישור" : ""))), (isWevoLinked || readyFromWevo) && /*#__PURE__*/React.createElement("div", {
    style: {
      background: filledOk ? "#f0fdf4" : wevoFetch === "err" ? "#fef2f2" : "#fff7ed",
      border: filledOk ? "1.5px solid #86efac" : wevoFetch === "err" ? "1.5px solid #fecaca" : "1.5px solid #fdba74",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: filledOk ? "#166534" : wevoFetch === "err" ? "#991b1b" : "#9a3412",
      lineHeight: 1.45
    }
  }, wevoFetch === "loading" ? "⏳ שולף מ-Wevo שעת סיום טעינה וקוט״ש סופי..." : filledOk ? /*#__PURE__*/React.createElement(React.Fragment, null, timelineRelevant ? "✅ הנתונים מולאו מ-Wevo — בחר נקודות לחיוב מתוך חלון הזמנים (מעבר בין יקרות לרגיל)." : "✅ הנתונים מולאו מ-Wevo — אין מעבר בין שעות יקרות/רגילות, חיוב לפי חיבור→סיום.") : /*#__PURE__*/React.createElement(React.Fragment, null, wevoFetchErr || "🔌 מושך נתוני סיום מ-Wevo…", openSession.wevoTxnId && /*#__PURE__*/React.createElement("span", null, " txn#", openSession.wevoTxnId)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      marginTop: 8,
      background: "#fff",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      color: "#0f766e"
    },
    disabled: wevoFetch === "loading",
    onClick: pullWevoFinal
  }, wevoFetch === "loading" ? "שולף..." : "🔄 רענן מ-Wevo")), timelineRelevant && tlPoints.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ChargeTimelineBox, {
    timeline: sessionTimeline,
    billStartKey: billStartKey,
    billEndKey: billEndKey
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      fontSize: 13,
      fontWeight: 600,
      color: "#0f172a",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: preferMaxBill,
    onChange: e => setPreferMaxBill(e.target.checked),
    "data-testid": "prefer-max-bill"
  }), "תמיד הסכום הגבוה יותר (בחירה אוטומטית)"), /*#__PURE__*/React.createElement(FG, {
    lbl: "התחלת חיוב"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: billStartKey,
    disabled: preferMaxBill,
    onChange: e => {
      setPreferMaxBill(false);
      applyWindowKeys(e.target.value, billEndKey);
    },
    "data-testid": "bill-start-key"
  }, tlPoints.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.key,
    value: p.key
  }, p.label, " · ", formatTimelineClock(p.at))))), /*#__PURE__*/React.createElement(FG, {
    lbl: "סיום חיוב"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: billEndKey,
    disabled: preferMaxBill,
    onChange: e => {
      setPreferMaxBill(false);
      applyWindowKeys(billStartKey, e.target.value);
    },
    "data-testid": "bill-end-key"
  }, tlPoints.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.key,
    value: p.key
  }, p.label, " · ", formatTimelineClock(p.at)))))), /*#__PURE__*/React.createElement(FG, {
    lbl: "חיבור כבל / התחלת חלון (ניתן לעריכה)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "datetime-local",
    value: startEdit,
    onChange: e => {
      setPreferMaxBill(false);
      onStartChange(e.target.value);
    }
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: isWevoLinked || readyFromWevo
      ? "משך חלון חיוב"
      : "משך טעינה"
  }, (isWevoLinked || readyFromWevo || !useEnd) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "text",
    inputMode: "decimal",
    placeholder: "3:24 או 3h 24m",
    value: durInput,
    onChange: e => {
      setPreferMaxBill(false);
      onDurChange(e.target.value);
    },
    "data-testid": "complete-duration"
  }), durMins > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#0f766e",
      marginTop: 4,
      fontWeight: 600
    }
  }, "= ", Math.floor(durMins / 60), " שעות ו־", durMins % 60, " דק׳", edt ? ` · סיום ${edt.slice(11, 16)}` : ""))), !isWevoLinked && !readyFromWevo && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.rg,
      marginBottom: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: !useEnd,
    onChange: () => setUseEnd(false)
  }), " לפי משך"), /*#__PURE__*/React.createElement("label", {
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: useEnd,
    onChange: () => setUseEnd(true)
  }), " לפי שעת סיום"))), /*#__PURE__*/React.createElement(FG, {
    lbl: isWevoLinked || readyFromWevo ? "סיום חיוב (ניתן לעריכה)" : "שעת סיום"
  }, (isWevoLinked || readyFromWevo || useEnd) && /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "datetime-local",
    value: endDt || edt || "",
    onChange: e => {
      setPreferMaxBill(false);
      onEndChange(e.target.value);
    }
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: isWevoLinked ? 'קוט"ש בפועל (מהעמדה / Wevo)' : 'קוט"ש גולמי (מהעמדה)'
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    placeholder: openSession.liveKwh != null ? String(Number(openSession.liveKwh).toFixed(2)) : "35.41",
    inputMode: "decimal",
    value: kwh,
    onChange: e => setKwh(e.target.value),
    "data-testid": "complete-kwh"
  }), Number(openSession.liveKwh) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#0f766e",
      marginTop: 4,
      fontWeight: 600
    }
  }, "מ-Wevo: ", Number(openSession.liveKwh).toFixed(2), ' קוט"ש')), isSelf ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfeff",
      border: "1.5px solid #a5f3fc",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#0e7490",
      lineHeight: 1.45
    }
  }, "💳 טעינה עצמית — רק ", /*#__PURE__*/React.createElement("strong", null, "עלות בפועל"), " (בלי ניפוח / פרימיום / תוספות). יורד באשראי, בלי חוב.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FG, {
    lbl: "תעריף"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.rg
  }, [["auto", "אוטומטי 🤖"], ["regular", `רגיל ₪${getConfig().rateRegular}`], ["premium", `פרימיום ₪${getConfig().ratePremium}`], ["custom", "מותאם ✏️"]].map(([v, l]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "cfr",
    value: v,
    checked: fr === v,
    onChange: () => setFr(v)
  }), " ", l))), fr === "custom" && /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginTop: 8
    },
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    placeholder: "מחיר לקוט\"ש",
    value: customRate,
    onChange: e => setCustomRate(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "תוספת / הנחה (₪) — אופציונלי"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    placeholder: "10 תוספת או -5 הנחה",
    value: adjust,
    onChange: e => setAdjust(e.target.value)
  }))), prev && /*#__PURE__*/React.createElement("div", {
    style: S.prev
  }, /*#__PURE__*/React.createElement("div", {
    style: S.prevTitle
  }, "תצוגה מקדימה"), (isSelf ? [[`קוט"ש`, String(prev.kwhRaw), null], ["חיוב אשראי (עלות בפועל)", ilsFull(prev.amountBilled), "#0ea5c6"], ["סטטוס", "אשראי ✓ · ללא חוב", "#0ea5c6"]] : [[`קוט"ש מנופח`, `${prev.kwhRaw} → ${prev.kwhInflated}`, null], ["תעריף", `₪${prev.rate} | ${prev.rateLabel}`, null], ["לחיוב (לפני תוספת)", ils(prev.amountBilled - adjVal), null], ...(adjVal !== 0 ? [["תוספת/הנחה", `${adjVal > 0 ? "+" : ""}${adjVal}₪`, adjVal > 0 ? "#f59e0b" : "#10b981"]] : []), ["סהכ לחיוב", ils(prev.amountBilled), "#6366f1"], ["עלות בפועל 🔒", `₪${(_prev$costToOwner2 = prev.costToOwner) === null || _prev$costToOwner2 === void 0 ? void 0 : _prev$costToOwner2.toFixed(2)}`, "#9ca3af"], ["רווח", ilsFull(prev.profit), "#10b981"]]).map(([lbl, val, color]) => /*#__PURE__*/React.createElement("div", {
    key: lbl,
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, lbl), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: color ? "700" : "400",
      fontSize: color ? 15 : 13,
      color: color || "#111827"
    }
  }, val)))), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: prev ? 1 : 0.5
    },
    disabled: !prev || !(Number(kwh) > 0),
    onClick: () => {
      if (!(Number(kwh) > 0)) {
        appAlert("אין קוט״ש — לא נשמר חיוב. אפשר למחוק את הטעינה הריקה.", "err", 6500);
        return;
      }
      onSave(openSession.id, {
      id: uid(),
      clientId: openSession.clientId,
      date: effectiveStart,
      endDate: edt || null,
      plugInAt: sessionTimeline.plugInAt || openSession.plugInAt || effectiveStart,
      chargeStartedAt: sessionTimeline.chargeStartAt || openSession.chargeStartedAt || null,
      chargeEndedAt: sessionTimeline.chargeEndAt || openSession.chargeEndedAt || edt || null,
      plugOutAt: sessionTimeline.plugOutAt || openSession.plugOutAt || null,
      billStartKey,
      billEndKey,
      preferMaxBill,
      ...prev,
      source: isWevoLinked ? "wevo-live" : "manual",
      wevoTxnId: openSession.wevoTxnId != null ? String(openSession.wevoTxnId) : null,
      notes: (() => {
        const base = String(openSession.notes || "");
        const tid = openSession.wevoTxnId != null ? String(openSession.wevoTxnId) : "";
        if (!tid || base.includes("txn#" + tid)) return base;
        return base ? base + " | txn#" + tid : "txn#" + tid;
      })(),
      durMin: durMins > 0 ? durMins : prev.durMin,
      electricityCost: openSession.liveElecCost != null ? Number(openSession.liveElecCost) : prev.electricityCost,
      avgRateKW: openSession.avgRateKW != null ? Number(openSession.avgRateKW) : null,
      maxRateKW: openSession.maxRateKW != null ? Number(openSession.maxRateKW) : null,
      stopReason: openSession.stopReason || null,
      wevoOrigin: openSession.wevoOrigin || null,
      didCompleteFull: !!openSession.didCompleteFull,
      isBoost: !!(openSession.wevoFlags && openSession.wevoFlags.isBoost)
    });
    },
    "data-testid": "complete-save"
  }, !(Number(kwh) > 0) ? "אין קוט״ש — לא לשמור" : isSelf ? "שמור עלות אשראי" : filledOk ? "אשר ושמור טעינה" : "שמור טעינה"), !(Number(kwh) > 0) && onDelete && /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      color: "#b91c1c",
      borderColor: "#fecaca"
    },
    "data-testid": "complete-delete-empty",
    onClick: () => onDelete(openSession.id)
  }, "מחק טעינה ריקה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")));
}

// ── EditPayment ────────────────────────────────────────────────────────────
function EditPayment({
  payment,
  clients,
  onSave,
  onDelete,
  onCancel
}) {
  const p = payment;
  if (!p) return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "התשלום לא נמצא"));
  const cl = clients.find(x => x.id === p.clientId);
  const isDebt = p.method === "debt";
  const [amt, setAmt] = useState(String(Math.abs(p.amount)));
  const [method, setMethod] = useState(p.method);
  const [notes, setNotes] = useState(p.notes || "");
  const [confirmDel, setConfirmDel] = useState(false);
  const num = parseFloat(amt || 0) || 0;
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: cl,
    size: 48,
    fontSize: 20
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cNameLg
  }, cl === null || cl === void 0 ? void 0 : cl.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#6b7280",
      fontSize: 12
    }
  }, "✏️ עריכת ", isDebt ? "חוב" : "תשלום", " · ", fdate(p.date)))), /*#__PURE__*/React.createElement(FG, {
    lbl: isDebt ? "סכום החוב" : "סכום ששולם"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    value: amt,
    onChange: e => setAmt(e.target.value)
  })), !isDebt && /*#__PURE__*/React.createElement(FG, {
    lbl: "שיטת תשלום"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.rg
  }, PAYMENT_METHOD_OPTIONS.map(([v, l]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "epm",
    value: v,
    checked: method === v,
    onChange: () => setMethod(v)
  }), " ", l)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "אופציונלי"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.prev
  }, /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "סכום קודם"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "#9ca3af",
      fontSize: 15
    }
  }, ils(Math.abs(p.amount)))), /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, "סכום חדש"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "#6366f1",
      fontSize: 15
    }
  }, ils(num)))), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: S.btnP,
    onClick: () => onSave(p.id, {
      amount: isDebt ? -Math.abs(num) : num,
      method,
      notes
    })
  }, "שמור שינויים"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")), confirmDel ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#374151",
      marginBottom: 8,
      fontWeight: 600
    }
  }, "למחוק את הרישום הזה?"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "#ef4444",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "8px 18px",
      fontWeight: 700,
      cursor: "pointer",
      marginLeft: 8
    },
    onClick: () => onDelete(p.id)
  }, "כן, מחק"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "#f3f4f6",
      color: "#374151",
      border: "none",
      borderRadius: 8,
      padding: "8px 18px",
      cursor: "pointer"
    },
    onClick: () => setConfirmDel(false)
  }, "ביטול")) : /*#__PURE__*/React.createElement("button", {
    style: {
      background: "none",
      border: "none",
      color: "#ef4444",
      fontSize: 13,
      cursor: "pointer",
      marginTop: 14,
      width: "100%",
      fontWeight: 600
    },
    onClick: () => setConfirmDel(true)
  }, "🗑 מחק רישום")));
}

// ── AddPayment ─────────────────────────────────────────────────────────────
function AddPayment({
  cid,
  clients,
  stats,
  onSave,
  onCancel
}) {
  var _st$balance;
  const c = clients.find(x => x.id === cid),
    st = stats.find(x => x.id === cid);
  const bal = (_st$balance = st === null || st === void 0 ? void 0 : st.balance) !== null && _st$balance !== void 0 ? _st$balance : 0;
  const [amt, setAmt] = useState(String(Math.max(0, Math.round(bal))));
  const [method, setMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [notes, setNotes] = useState("");
  const afterBal = bal - parseFloat(amt || 0);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 48,
    fontSize: 20
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cNameLg
  }, c === null || c === void 0 ? void 0 : c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: balanceColor(bal, false),
      fontWeight: 700
    }
  }, formatBalanceText(bal))))), /*#__PURE__*/React.createElement(FG, {
    lbl: "סכום ששולם"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    value: amt,
    onChange: e => setAmt(e.target.value),
    "data-testid": "payment-amount"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "שיטת תשלום"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.rg
  }, PAYMENT_METHOD_OPTIONS.map(([v, l]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "pm",
    value: v,
    checked: method === v,
    onChange: () => setMethod(v)
  }), " ", l)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: bal <= 0.01 ? "למשל: שולם מראש / מזומן מראש" : "אופציונלי"
  })), amt ? /*#__PURE__*/React.createElement("div", {
    style: S.prev,
    "data-testid": "payment-preview"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, hasCredit(afterBal) ? "יתרת זכות לאחר תשלום" : hasDebt(afterBal) ? "חוב לאחר תשלום" : "יתרה לאחר תשלום"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: balanceColor(afterBal, false),
      fontSize: 15
    }
  }, hasCredit(afterBal) ? ils(Math.abs(afterBal)) : ils(afterBal))), hasCredit(afterBal) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#047857",
      marginTop: 6,
      fontWeight: 600
    }
  }, "שולם מראש — הטעינות הבאות ינוכו מיתרת הזכות")) : null, /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: !amt || !(parseFloat(amt) > 0) ? 0.5 : 1
    },
    disabled: !amt || !(parseFloat(amt) > 0),
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      amount: parseFloat(amt),
      method,
      date: new Date().toISOString(),
      notes
    }),
    "data-testid": "payment-save"
  }, "אשר תשלום"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")));
}

// ── AddDebt ────────────────────────────────────────────────────────────────
function AddDebt({
  cid,
  clients,
  onSave,
  onCancel
}) {
  const c = clients.find(x => x.id === cid);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 48,
    fontSize: 20
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cNameLg
  }, c === null || c === void 0 ? void 0 : c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#dc2626",
      fontSize: 13,
      fontWeight: 600
    }
  }, "הוספת חוב ידני"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#991b1b"
    }
  }, "💡 מוסיף לסכום שהלקוח חייב (לא תשלום)"), /*#__PURE__*/React.createElement(FG, {
    lbl: "סכום החוב (₪)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    placeholder: "0",
    value: amount,
    onChange: e => setAmount(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "סיבה / הערה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "חוב ישן, הסכם מיוחד..."
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#dc2626",
      opacity: !amount || parseFloat(amount) <= 0 ? 0.5 : 1
    },
    disabled: !amount || parseFloat(amount) <= 0,
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      amount: parseFloat(amount),
      method: "debt",
      date: new Date().toISOString(),
      notes
    })
  }, "הוסף חוב"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

// ── AddClient ──────────────────────────────────────────────────────────────
function AddClient({
  onSave,
  onCancel
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const inferred = findCarBrand(carBrand) || findCarBrand(carModel);
  const onModelChange = val => {
    setCarModel(val);
    const hit = findCarBrand(val);
    if (hit && !carBrand) setCarBrand(hit.id);
  };
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement(FG, {
    lbl: "שם לקוח"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "ישראל ישראלי",
    "data-testid": "client-name"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "טלפון"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "050-0000000",
    inputMode: "tel",
    "data-testid": "client-phone"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "מספר רכב"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: carPlate,
    onChange: e => setCarPlate(e.target.value),
    placeholder: "12-345-67",
    "data-testid": "client-car-plate"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "יצרן / סוג רכב"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: carBrand,
    onChange: e => setCarBrand(e.target.value),
    "data-testid": "client-car-brand"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "— בחר יצרן —"), CAR_BRANDS.map(b => /*#__PURE__*/React.createElement("option", {
    key: b.id,
    value: b.id
  }, b.label)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "דגם רכב"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: carModel,
    onChange: e => onModelChange(e.target.value),
    placeholder: "לדוגמה: איוניק 5",
    "data-testid": "client-car-model"
  }), inferred && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 12,
      color: "#475569"
    }
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: {
      name: name || "ר",
      carBrand: carBrand || inferred.id,
      carModel
    },
    size: 36,
    fontSize: 14
  }), "סמל שיוצג: ", inferred.label)), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "אופציונלי"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: name ? 1 : 0.5
    },
    disabled: !String(name || "").trim(),
    onClick: () => onSave({
      id: uid(),
      name,
      phone,
      notes,
      carPlate: carPlate.trim(),
      carBrand: (findCarBrand(carBrand) || inferred || {}).id || carBrand.trim(),
      carModel: carModel.trim()
    }),
    "data-testid": "client-save"
  }, "הוסף לקוח"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

// ── EditClient ─────────────────────────────────────────────────────────────
function EditClient({
  client,
  onSave,
  onCancel
}) {
  const [name, setName] = useState((client === null || client === void 0 ? void 0 : client.name) || "");
  const [phone, setPhone] = useState((client === null || client === void 0 ? void 0 : client.phone) || "");
  const [notes, setNotes] = useState((client === null || client === void 0 ? void 0 : client.notes) || "");
  const [carPlate, setCarPlate] = useState((client === null || client === void 0 ? void 0 : client.carPlate) || "");
  const [carBrand, setCarBrand] = useState(() => {
    const hit = findCarBrand(client && client.carBrand) || findCarBrand(client && client.carModel);
    return hit && hit.id || (client && client.carBrand) || "";
  });
  const [carModel, setCarModel] = useState((client === null || client === void 0 ? void 0 : client.carModel) || "");
  useEffect(() => {
    if (!client) return;
    setName(client.name || "");
    setPhone(client.phone || "");
    setNotes(client.notes || "");
    setCarPlate(client.carPlate || "");
    setCarModel(client.carModel || "");
    const hit = findCarBrand(client.carBrand) || findCarBrand(client.carModel);
    setCarBrand(hit && hit.id || client.carBrand || "");
  }, [client && client.id]);
  const inferred = findCarBrand(carBrand) || findCarBrand(carModel);
  const onModelChange = val => {
    setCarModel(val);
    const hit = findCarBrand(val);
    if (hit) setCarBrand(hit.id);
  };
  if (!client) return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "הלקוח לא נמצא"));
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#1e40af",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: {
      ...client,
      name,
      carBrand: carBrand || (inferred && inferred.id),
      carModel
    },
    size: 40,
    fontSize: 16
  }), "✏️ עריכת לקוח", isSelfClient(client) ? " · עצמי (אשראי)" : ""), /*#__PURE__*/React.createElement(FG, {
    lbl: "שם לקוח"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "שם מלא"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "מספר טלפון"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "050-0000000",
    inputMode: "tel"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "מספר רכב"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: carPlate,
    onChange: e => setCarPlate(e.target.value),
    placeholder: "12-345-67",
    "data-testid": "client-car-plate"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "יצרן / סוג רכב"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: findCarBrand(carBrand) ? findCarBrand(carBrand).id : carBrand,
    onChange: e => setCarBrand(e.target.value),
    "data-testid": "client-car-brand"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "— בחר יצרן —"), CAR_BRANDS.map(b => /*#__PURE__*/React.createElement("option", {
    key: b.id,
    value: b.id
  }, b.label)), carBrand && !findCarBrand(carBrand) && /*#__PURE__*/React.createElement("option", {
    value: carBrand
  }, carBrand))), /*#__PURE__*/React.createElement(FG, {
    lbl: "דגם רכב"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: carModel,
    onChange: e => onModelChange(e.target.value),
    placeholder: "לדוגמה: איוניק 5",
    "data-testid": "client-car-model"
  }), inferred && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 12,
      color: "#0f766e",
      fontWeight: 600
    }
  }, "סמל: ", inferred.label)), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "אופציונלי"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: name.trim() ? 1 : 0.5
    },
    disabled: !name.trim(),
    onClick: () => onSave(client.id, {
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      carPlate: carPlate.trim(),
      carBrand: (findCarBrand(carBrand) || inferred || {}).id || carBrand.trim(),
      carModel: carModel.trim(),
      self: client.self === true || isSelfClient(client)
    })
  }, "שמור שינויים"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

// ── Report (חודשי ללקוח + וואטסאפ) ─────────────────────────────────────────
function Report({
  cid,
  clients,
  sessions
}) {
  const c = clients.find(x => x.id === cid);
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth());
  const [yr, setYr] = useState(now.getFullYear());
  const ss = sessions.filter(s => {
    const d = new Date(s.date);
    return s.clientId === cid && d.getMonth() === mo && d.getFullYear() === yr;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  const total = ss.reduce((a, s) => a + s.amountBilled, 0);
  const reportText = () => [`דוח טעינות – ${c === null || c === void 0 ? void 0 : c.name}`, `חודש: ${MONTHS[mo]} ${yr}`, "─────────────────", ...ss.map(s => `${fdate(s.date)} ${ftime(s.date)} | ${s.kwhInflated} קוט"ש | ${ils(s.amountBilled)}`), "─────────────────", `סה"כ לתשלום: ${ils(total)}`].join("\n");
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: mo,
    onChange: e => setMo(+e.target.value)
  }, MONTHS.map((m, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, m))), /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: yr,
    onChange: e => setYr(+e.target.value)
  }, [2024, 2025, 2026, 2027].map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y)))), /*#__PURE__*/React.createElement("div", {
    style: S.rep
  }, /*#__PURE__*/React.createElement("div", {
    style: S.repH
  }, /*#__PURE__*/React.createElement("span", null, "📄 ", c === null || c === void 0 ? void 0 : c.name), /*#__PURE__*/React.createElement("span", null, MONTHS[mo], " ", yr)), ss.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין טעינות בחודש זה"), ss.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: S.repRow
  }, /*#__PURE__*/React.createElement("span", null, fdate(s.date), " ", ftime(s.date)), /*#__PURE__*/React.createElement("span", null, s.kwhInflated, " קוט\"ש"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, ils(s.amountBilled)))), ss.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.repRow,
      borderTop: "2px solid #e5e7eb",
      fontWeight: 700,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "סהכ"), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6366f1",
      fontSize: 17
    }
  }, ils(total)))), ss.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#25d366"
    },
    onClick: () => openWaDraft({
      phone: c === null || c === void 0 ? void 0 : c.phone,
      name: c === null || c === void 0 ? void 0 : c.name,
      text: reportText()
    })
  }, "💬 טיוטה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: () => navigator.clipboard.writeText(reportText())
  }, "📋 העתק")));
}

// ── ImportData ─────────────────────────────────────────────────────────────
function ImportData({
  onImport,
  onExport,
  onDownload,
  onCancel,
  onCloudSetup,
  onCloudLogin,
  cloudConfigured,
  cloudStatus
}) {
  const [json, setJson] = useState("");
  const [err, setErr] = useState("");
  const [wevoLog, setWevoLog] = useState(() => getWevoLog());
  const status = cloudStatus || getCloudStatus();
  const fmtCloudTime = ts => {
    if (!ts) return null;
    try {
      const d = new Date(Number(ts));
      if (Number.isNaN(d.getTime())) return null;
      return `${fdate(d.toISOString())} ${ftime(d.toISOString())}`;
    } catch {
      return null;
    }
  };
  const lastOkTxt = fmtCloudTime(status.lastOk || (() => {
    try {
      return localStorage.getItem(CLOUD_UPDATED_KEY);
    } catch {
      return null;
    }
  })());
  const lastErrAtTxt = fmtCloudTime(status.lastErrAt);
  const lastErrTxt = status.lastErr ? `${status.lastErr}${lastErrAtTxt ? ` · ${lastErrAtTxt}` : ""}` : null;
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfdf5",
      border: "1.5px solid #99f6e4",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#0f766e",
      marginBottom: 6
    }
  }, "☁️ גיבוי ענן (מומלץ לטלפון)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#374151",
      marginBottom: 8,
      lineHeight: 1.45
    }
  }, cloudConfigured
    ? "הגיבוי פעיל במכשיר הזה. אחרי התקנה מחדש — שחזר עם אותו PIN."
    : "שמור את הנתונים בענן עם PIN אישי, כדי שלא יימחקו כשמוחקים את האפליקציה מהטלפון."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      background: lastErrTxt ? "#fef2f2" : "#f0fdf4",
      border: `1px solid ${lastErrTxt ? "#fecaca" : "#bbf7d0"}`,
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 10,
      color: lastErrTxt ? "#991b1b" : "#065f46",
      lineHeight: 1.45
    }
  }, !cloudConfigured && /*#__PURE__*/React.createElement("div", null, "סטטוס: לא מוגדר PIN במכשיר הזה"), cloudConfigured && lastOkTxt && /*#__PURE__*/React.createElement("div", null, "✓ נשמר לאחרונה: ", lastOkTxt), cloudConfigured && !lastOkTxt && !lastErrTxt && /*#__PURE__*/React.createElement("div", null, "ממתין לשמירה ראשונה..."), lastErrTxt && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: lastOkTxt ? 4 : 0
    }
  }, "⚠ שגיאה אחרונה: ", lastErrTxt)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#0f766e",
      padding: "11px",
      width: "100%",
      marginBottom: 8
    },
    onClick: onCloudSetup
  }, "🔐 הגדר / עדכן גיבוי ענן"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      padding: "11px",
      width: "100%"
    },
    onClick: onCloudLogin
  }, "📥 שחזר מהענן עם PIN")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#065f46",
      marginBottom: 6
    }
  }, "📤 גיבוי / ייצוא"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#374151",
      marginBottom: 10
    }
  }, "הורדה מהירה לקובץ JSON — הכי בטוח לגיבוי ידני. אפשר גם להעתיק ללוח."), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#10b981",
      padding: "11px"
    },
    onClick: onDownload,
    "data-testid": "backup-download"
  }, "💾 הורד קובץ גיבוי (JSON)"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      padding: "11px",
      marginTop: 8
    },
    onClick: onExport,
    "data-testid": "backup-copy"
  }, "📋 העתק נתונים ללוח")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#c2410c"
    }
  }, "🔌 יומן Wevo (קצר)"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "none",
      border: "1px solid #fdba74",
      borderRadius: 8,
      padding: "4px 8px",
      fontSize: 11,
      cursor: "pointer",
      color: "#9a3412",
      fontWeight: 600
    },
    onClick: () => setWevoLog(getWevoLog())
  }, "רענן")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#9a3412",
      marginBottom: 8
    }
  }, "פעולות אחרונות (אישור / סנכרון / שגיאות) — עוזר כשנתקעים"), wevoLog.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#78716c"
    }
  }, "עדיין אין רשומות") : wevoLog.slice(0, 8).map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 12,
      padding: "6px 0",
      borderBottom: i < Math.min(wevoLog.length, 8) - 1 ? "1px solid #ffedd5" : "none",
      color: row.ok ? "#374151" : "#991b1b",
      lineHeight: 1.35
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a8a29e",
      marginLeft: 6
    }
  }, row.at ? ftime(new Date(row.at).toISOString()) : ""), " ", row.ok ? "✓" : "⚠", " ", row.msg))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f9ff",
      border: "1px solid #bae6fd",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#0369a1",
      marginBottom: 6
    }
  }, "📥 שחזור / ייבוא"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#374151",
      marginBottom: 8
    }
  }, "בחר קובץ גיבוי מהמכשיר (מומלץ) או הדבק ידנית למטה"), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      background: "#0369a1",
      color: "#fff",
      textAlign: "center",
      padding: "12px",
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 15,
      marginBottom: 10,
      cursor: "pointer"
    }
  }, "📂 בחר קובץ JSON", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".json,application/json,text/plain",
    style: { display: "none" },
    onChange: e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const txt = String(r.result || "");
        try {
          JSON.parse(txt);
          setJson(txt);
          setErr("");
        } catch {
          setErr("הקובץ אינו JSON תקין");
        }
      };
      r.onerror = () => setErr("שגיאה בקריאת הקובץ");
      r.readAsText(f);
    }
  })), json.trim() && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#065f46",
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 8,
      fontWeight: 600
    }
  }, "✓ נטענו " + (json.length / 1024).toFixed(0) + "KB — לחץ \"ייבא נתונים\" לאישור"), /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...S.inp,
      height: 120,
      fontFamily: "monospace",
      fontSize: 11,
      resize: "vertical",
      marginBottom: 8
    },
    placeholder: "הדבק JSON מגיבוי...",
    value: json,
    onChange: e => {
      setJson(e.target.value);
      setErr("");
    }
  }), err && /*#__PURE__*/React.createElement("div", {
    style: S.errMsg
  }, err), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      padding: "11px",
      opacity: json.trim() ? 1 : 0.5
    },
    disabled: !json.trim(),
    onClick: () => {
      try {
        JSON.parse(json);
        onImport(json);
      } catch {
        setErr("JSON לא תקין");
      }
    }
  }, "📥 ייבא נתונים")), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      marginTop: 8,
      width: "100%"
    },
    onClick: onCancel
  }, "ביטול")));
}
function FG({
  lbl,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: S.fg
  }, /*#__PURE__*/React.createElement("label", {
    style: S.lbl
  }, lbl), children);
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
installPwaReturnRecovery();
