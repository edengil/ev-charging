/**
 * src/views/settings.js — עדכון תעריפים.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── SettingsView: עדכון תעריפים ─────────────────────────────────────────────
function tariffMh(min) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function SettingsView({
  onSaved,
  onCancel
}) {
  const cfg = getConfig();
  const [rp, setRp] = useState(String(cfg.ratePremium));
  const [rr, setRr] = useState(String(cfg.rateRegular));
  const [op, setOp] = useState(String(cfg.ownerPeak));
  const [oo, setOo] = useState(String(cfg.ownerOff));
  // תעריף Wevo חי — לוח שעות ישירות מ־Wevo; עלות הבעלים מתעדכנת אוטומטית
  const [live, setLive] = useState(null);
  const [liveErr, setLiveErr] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const pullTariff = async (force) => {
    setLiveBusy(true);
    setLiveErr("");
    try {
      const r = await refreshOwnerCostsFromWevo(force);
      if (r && r.ok && r.norm) {
        setLive(r.norm);
        const c = getConfig();
        setOp(String(c.ownerPeak));
        setOo(String(c.ownerOff));
      } else if (r && r.error === "NO_CREDS") {
        setLiveErr("התחבר תחילה בסנכרון Wevo כדי למשוך את התעריף");
      } else if (r && r.error === "PARSE") {
        setLiveErr("לא הצלחתי לקרוא את לוח התעריפים מ־Wevo — אפשר לנסות שוב");
      } else if (r && r.error) {
        setLiveErr(r.error);
      }
    } finally {
      setLiveBusy(false);
    }
  };
  useEffect(() => {
    if (getWevoCreds().email) void pullTariff(false);
  }, []);
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
    style: { ...S.statusCard("#1d4ed8"),
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: live ? 8 : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#1d4ed8"
    }
  }, "תעריף Wevo חי (לוח שעות)"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: { ...S.btnS,
      opacity: liveBusy ? 0.6 : 1
    },
    onClick: () => void pullTariff(true),
    disabled: liveBusy,
    "data-testid": "settings-wevo-tariff-refresh"
  }, liveBusy ? "מושך…" : "משוך ועדכן עכשיו")), live && live.ranges.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "#1d4ed8",
      lineHeight: 1.6
    }
  }, live.ranges.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, `${tariffMh(r.startMin)}–${r.endMin != null ? tariffMh(r.endMin) : "…"}`), /*#__PURE__*/React.createElement("span", null, `₪${r.rate.toFixed(2)}/קוט״ש`)))), live && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: "#1d4ed8"
    },
    "data-testid": "settings-wevo-tariff-summary"
  }, `עלות בעלים כעת: פיק ₪${Number(live.ownerPeak).toFixed(2)} · רגיל ₪${Number(live.ownerOff).toFixed(2)}`), liveErr && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#b91c1c",
      marginTop: 4
    }
  }, liveErr), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: C.meta,
      marginTop: live ? 4 : 0
    }
  }, "עלות הבעלים מתעדכנת אוטומטית מ־Wevo בכל סנכרון. תעריפי הגבייה מלקוחות נקבעים ידנית בלבד ולא מתעדכנים אוטומטית.")), /*#__PURE__*/React.createElement("div", {
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

