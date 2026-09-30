/**
 * src/views/settings.js — עדכון תעריפים.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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
      marginBottom: 4,
      color: C.ink
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "cog",
    s: 19,
    style: {
      color: C.primaryStrong
    }
  }), "תעריפים")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.meta,
      marginBottom: 16
    }
  }, "מתעדכן כל רבעון — שינוי משפיע על טעינות חדשות בלבד"), /*#__PURE__*/React.createElement("div", {
    style: { ...S.statusCard(C.primary),
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "card",
    s: 18,
    style: {
      color: C.primaryStrong
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: C.primaryInk
    }
  }, "גבייה מלקוחות")), /*#__PURE__*/React.createElement(FG, {
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
      color: C.meta,
      marginTop: -8,
      marginBottom: 14
    }
  }, "לדוגמה: 1.21 = ניפוח של 21% על הקוט״ש לפני חיוב. משפיע על טעינות חדשות בלבד."), /*#__PURE__*/React.createElement("div", {
    style: { ...S.statusCard(C.warn),
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "zap",
    s: 18,
    style: {
      color: C.warnInk
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: C.warnInk
    }
  }, "עלות בעלים (מה שאתה משלם)")), /*#__PURE__*/React.createElement(FG, {
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

