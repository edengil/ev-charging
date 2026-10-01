/**
 * lib/ev-tariff.mjs — לוגיקה טהורה (unit-testable):
 * נרמול לוח התעריפים של Wevo (פרטי עלות / תעריף משתנה מהמטען הפרטי)
 * לטווחי שעות אחידים, וחילוץ עלויות בעלים (פיק/רגיל) מהלוח.
 *
 * מבנה התשובה המדויק של Wevo אינו מתועד פומבית, ולכן הנרמול הגנתי:
 * מחפש טווחים תחת מגוון מפתחות, ומקבל זמנים כדקות־מיום, שניות־מיום
 * (Wevo משתמשת ב־82800 = 23:00), מחרוזות "HH:mm" או חותמות זמן.
 */

/**
 * זמן → דקות־מיום (0–1439), או null אם לא ניתן לפענח.
 * מספרים: עד 1440 = דקות־מיום; מעל = שניות־מיום; גדול מאוד = חותמת זמן (ms).
 */
export function tariffTimeToMinutes(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) return (Number(m[1]) % 24) * 60 + Number(m[2]);
    const n = Number(v);
    if (!Number.isFinite(n)) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return d.getHours() * 60 + d.getMinutes();
    }
    v = n;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v >= 1e11) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return d.getHours() * 60 + d.getMinutes();
    }
    if (v > 1440) return Math.round((v % 86400) / 60); // שניות־מיום
    return Math.round(v); // דקות־מיום
  }
  return null;
}

const RATE_KEYS = ["rate", "chargingRate", "cost", "price", "amount", "value", "perKwh", "kwhRate", "energyRate", "tariffRate"];
const START_KEYS = ["startTime", "start", "from", "fromTime", "begin", "startAt"];
const END_KEYS = ["endTime", "end", "to", "toTime", "finish", "endAt"];

// עלות/תשלום הגיוניים לקוט״ש בשקלים. מסנן עמלות, סכומים כוללים ורעש.
function saneRate(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0 || v > 50) return null;
  return Math.round(v * 100) / 100;
}

function pickRate(item) {
  if (!item || typeof item !== "object") return null;
  for (const k of RATE_KEYS) {
    const r = saneRate(item[k]);
    if (r != null) return r;
  }
  return null;
}

function pickTime(item, keys) {
  for (const k of keys) {
    if (item[k] == null) continue;
    const t = tariffTimeToMinutes(item[k]);
    if (t != null) return t;
  }
  // נפילה: שעת התחלה/סיום כמספר שעה
  for (const k of keys.map(x => x + "Hour")) {
    const n = Number(item[k]);
    if (Number.isFinite(n)) return Math.min(23, Math.max(0, n)) * 60;
  }
  return null;
}

/** פריט בודד → { startMin, endMin, rate }, או null אם חסר תעריף/התחלה. */
export function normalizeTariffRange(item) {
  if (!item || typeof item !== "object") return null;
  const rate = pickRate(item);
  if (rate == null) return null;
  const startMin = pickTime(item, START_KEYS);
  const endMin = pickTime(item, END_KEYS);
  if (startMin == null) return null;
  // סיום מוקדם מההתחלה = טווח שחוצה חצות (למשל 22:00 → 17:00 למחרת)
  const end = endMin == null ? null : endMin <= startMin ? endMin + 1440 : endMin;
  return { startMin, endMin: end, rate };
}

function collectArrays(node, acc, depth) {
  if (node == null || depth > 5) return;
  if (Array.isArray(node)) {
    acc.push(node);
    for (const v of node) collectArrays(v, acc, depth + 1);
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node)) collectArrays(v, acc, depth + 1);
  }
}

/** מחלץ רשימת טווחים מנורמלים מהתשובה הגולמית של Wevo. */
export function extractTariffRanges(payload) {
  if (payload == null) return [];
  const arrays = [];
  collectArrays(payload, arrays, 0);
  for (const arr of arrays) {
    const ranges = arr.map(normalizeTariffRange).filter(Boolean);
    if (ranges.length) return ranges;
  }
  return [];
}

const RATE_KEY_RE = /rate|price|perkwh|kwhprice|cost/i; // eslint-disable-line

/** תעריפים בודדים בלי טווחים (למשל premiumRate / standardRate) — בלי עמלות. */
export function collectScalarRates(payload) {
  const out = [];
  const walk = (node, parentKey, depth) => {
    if (node == null || depth > 6) return;
    if (Array.isArray(node)) {
      if (/fee/i.test(parentKey || "")) return;
      if (RATE_KEY_RE.test(parentKey || "")) {
        for (const v of node) {
          const r = saneRate(v);
          if (r != null) out.push(r);
        }
      }
      for (const v of node) walk(v, parentKey, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (/fee/i.test(k)) continue;
      if (typeof v === "number") {
        const r = saneRate(v);
        if (r != null && RATE_KEY_RE.test(k)) out.push(r);
      } else {
        walk(v, k, depth + 1);
      }
    }
  };
  walk(payload, "", 0);
  return out;
}

/**
 * מנרמל את תשובת פעולת "tariff" של השרת (או payload בודד) למבנה אחיד:
 * { ok, source, ranges: [{startMin, endMin, rate}], ownerPeak, ownerOff }
 * ownerPeak = התעריף הגבוה בלוח; ownerOff = הנמוך.
 * כשאין מספיק נתונים — ok:false ואין דריסה של כלום בצד הלקוח.
 */
export function normalizeWevoTariff(body) {
  const t = body && typeof body === "object" ? body.tariff || body : {};
  const pick = (w) => {
    if (!w || typeof w !== "object") return w != null ? w : null;
    if ("json" in w) return Number(w.status) >= 400 ? null : w.json;
    return w;
  };
  const rdPayload = pick(t.rateDetails);
  const vrPayload = pick(t.variableRanges);

  let source = null;
  let ranges = extractTariffRanges(vrPayload);
  if (ranges.length) source = "variable-cost-ranges";
  if (!ranges.length) {
    ranges = extractTariffRanges(rdPayload);
    if (ranges.length) source = "rate-details";
  }
  if (!ranges.length && body && typeof body === "object") {
    ranges = extractTariffRanges(body);
    if (ranges.length) source = "combined";
  }

  const prices = ranges.map(r => r.rate);
  if (!prices.length) {
    const scalar = vrPayload != null ? collectScalarRates(vrPayload) : [];
    if (!scalar.length && rdPayload != null) scalar.push(...collectScalarRates(rdPayload));
    if (scalar.length) {
      prices.push(...scalar);
      if (!source) source = "scalars";
    }
  }

  if (!prices.length) {
    return { ok: false, source, ranges: [], ownerPeak: null, ownerOff: null };
  }

  const distinct = [...new Set(prices.map(p => Math.round(p * 100) / 100))];
  const seen = new Set();
  const cleanRanges = ranges
    .filter(r => {
      const key = `${r.startMin}|${r.endMin}|${r.rate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startMin - b.startMin);

  return {
    ok: true,
    source,
    ranges: cleanRanges,
    ownerPeak: Math.max(...distinct),
    ownerOff: Math.min(...distinct)
  };
}
