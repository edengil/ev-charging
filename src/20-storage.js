/**
 * src/20-storage.js — אחסון: localStorage + גיבוי ענן (PIN).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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

const NOTIFY_ON_KEY = "ev_notify_on";

function notifyStoredOn() {
  try {
    return localStorage.getItem(NOTIFY_ON_KEY) === "1";
  } catch {
    return false;
  }
}

function markNotifyEnabled() {
  try {
    localStorage.setItem(NOTIFY_ON_KEY, "1");
  } catch {}
}

function windowNotifyPermission() {
  try {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

function installAppServiceWorker() {
  try {
    if (!navigator.serviceWorker) return;
    if (location.protocol === "file:") return;
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
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

