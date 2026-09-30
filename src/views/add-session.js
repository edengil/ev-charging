/**
 * src/views/add-session.js — הוספת טעינה (ידנית / הדבק / מהיר).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── AddSession (ידנית / הדבק / מהיר) ───────────────────────────────────────
function AddSession({
  clients,
  defaultCid,
  onSave,
  onCancel
}) {
  var _ref, _clients$, _ocrParsed$startDt;
  const [mode, setMode] = useState("manual");
  const [cid, setCid] = useState(defaultCid != null ? defaultCid : "");
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
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "בחר לקוח\u2026"), clients.map(c => /*#__PURE__*/React.createElement("option", {
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
      opacity: prev && cid ? 1 : 0.5
    },
    disabled: !prev || !cid,
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      date: dt,
      ...prev,
      source: "manual",
      notes
    }),
    "data-testid": "session-save"
  }, prev && cid ? isSelfAdd ? "שמור עלות אשראי" : "שמור טעינה" : !cid ? "בחר לקוח לשמירה" : !kwh ? `⚠️ הכנס קוט"ש` : "מחשב..."), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")))));
}

