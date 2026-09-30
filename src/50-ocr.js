/**
 * src/50-ocr.js — מפענח טקסט OCR.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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

