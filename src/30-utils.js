/**
 * src/30-utils.js — פונקציות עזר כלליות.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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
      backdropFilter: "blur(3px)",
      WebkitBackdropFilter: "blur(3px)",
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
    style: {
      width: 40,
      height: 4,
      borderRadius: 999,
      background: C.line,
      margin: "0 auto 10px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: { fontWeight: 800, fontSize: 16, marginBottom: 4, color: C.ink }
  }, "טיוטה", draft.name ? ` · ${draft.name}` : ""), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 13, color: C.meta, lineHeight: 1.45, marginBottom: 10 }
  }, "כלום לא נשלח. אפשר לערוך, להעתיק, ורק אם מחליטים לפתוח וואטסאפ — השליחה נשארת אצלך."), /*#__PURE__*/React.createElement("textarea", {
    "data-testid": "wa-draft-text",
    value: draft.text,
    onChange: e => setDraft({ ...draft, text: e.target.value }),
    rows: 6,
    style: {
      width: "100%",
      boxSizing: "border-box",
      border: "1.5px solid " + C.line,
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
      background: copied ? C.okSoft : "#0f766e",
      color: copied ? C.okInk : "#fff",
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
      background: hasPhone ? C.okSoft : C.bg,
      color: hasPhone ? C.okInk : C.meta,
      border: hasPhone ? "1.5px solid #6ee7b7" : "1.5px solid " + C.line,
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
      background: C.bg,
      color: C.body,
      border: "1.5px solid " + C.line,
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

