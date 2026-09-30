/**
 * src/views/session-form.js — לוגיקת טופס טעינה משותפת (הוספה + עריכה).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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

