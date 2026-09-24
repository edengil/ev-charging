function CompleteSession({
  openSession,
  clients,
  onSave,
  onCancel,
  onUpsertOpen
}) {
  var _openSession$startDat, _prev$costToOwner2;
  const isWevoLinked = !!(openSession && (openSession.source === "wevo-live" || openSession.wevoTxnId || /wevo|txn#/i.test(String(openSession.notes || ""))));
  const selfClient = openSession ? clients.find(x => x.id === openSession.clientId) : null;
  const isSelf = isSelfClient(selfClient);
  const readyFromWevo = !!(openSession && openSession.readyToComplete);
  const [durInput, setDurInput] = useState("");
  const [endDt, setEndDt] = useState(() => openSession && openSession.endDate ? asLocalDT(openSession.endDate) : "");
  const [useEnd, setUseEnd] = useState(!!(isWevoLinked || readyFromWevo || (openSession && openSession.endDate)));
  const [kwh, setKwh] = useState(() => openSession && openSession.liveKwh != null && Number(openSession.liveKwh) > 0 ? String(Number(openSession.liveKwh)) : "");
  const [fr, setFr] = useState("auto");
  const [customRate, setCustomRate] = useState("");
  const [prev, setPrev] = useState(null);
  const [adjust, setAdjust] = useState("");
  const [wevoFetch, setWevoFetch] = useState("");
  const [wevoFetchErr, setWevoFetchErr] = useState("");
  const adjVal = isSelf ? 0 : parseFloat(adjust) || 0;
  const startDt = (_openSession$startDat = openSession === null || openSession === void 0 ? void 0 : openSession.startDate) !== null && _openSession$startDat !== void 0 ? _openSession$startDat : "";
  const [startEdit, setStartEdit] = useState(startDt);
  const durMins = parseDurStr(durInput);
  const effectiveStart = startEdit || startDt;
  const edt = useEnd ? endDt : durMins > 0 ? addMinutes(effectiveStart, durMins) : "";
  const applyWevoFields = fields => {
    if (!fields) return;
    if (fields.kwh > 0) setKwh(String(Number(fields.kwh)));
    if (fields.end) {
      setEndDt(asLocalDT(fields.end));
      setUseEnd(true);
    }
    if (fields.start) setStartEdit(asLocalDT(fields.start));
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
      const fields = await fetchWevoFinalForOpen(openSession, {
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
          wevoTxnId: fields.wevoTxnId || openSession.wevoTxnId,
          readyToComplete: true,
          wevoEnded: true,
          source: openSession.source || "wevo-live"
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
    if (openSession.startDate) setStartEdit(asLocalDT(openSession.startDate) || openSession.startDate);
    if (openSession.endDate) {
      setEndDt(asLocalDT(openSession.endDate));
      setUseEnd(true);
    }
    if (openSession.readyToComplete || isWevoLinked) setUseEnd(true);
  }, [openSession && openSession.id, openSession && openSession.readyToComplete, openSession && openSession.endDate, openSession && openSession.liveKwh]);
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
  const filledOk = Number(kwh) > 0 && !!endDt;
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement("div", {
    style: S.ava(48, 20)
  }, c === null || c === void 0 ? void 0 : c.name[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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
  }, wevoFetch === "loading" ? "⏳ שולף מ-Wevo שעת סיום וקוט״ש סופי..." : filledOk ? /*#__PURE__*/React.createElement(React.Fragment, null, "✅ הנתונים מולאו מ-Wevo — בדוק ואשר בלבד.") : /*#__PURE__*/React.createElement(React.Fragment, null, wevoFetchErr || "🔌 מושך נתוני סיום מ-Wevo…", openSession.wevoTxnId && /*#__PURE__*/React.createElement("span", null, " txn#", openSession.wevoTxnId)), /*#__PURE__*/React.createElement("button", {
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
  }, wevoFetch === "loading" ? "שולף..." : "🔄 רענן מ-Wevo")), /*#__PURE__*/React.createElement(FG, {
    lbl: "שעת התחלה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "datetime-local",
    value: startEdit,
    onChange: e => setStartEdit(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: isWevoLinked ? "שעת סיום בפועל (מתי נגמרה הטעינה)" : "כיצד להזין את זמן הסיום?"
  }, !isWevoLinked && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.rg,
      marginBottom: 8
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
  }), " לפי שעת סיום")), isWevoLinked || readyFromWevo || useEnd ? /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "datetime-local",
    value: endDt,
    onChange: e => {
      setUseEnd(true);
      setEndDt(e.target.value);
    }
  }) : null), !isWevoLinked && !useEnd && /*#__PURE__*/React.createElement(FG, {
    lbl: "משך טעינה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "text",
    placeholder: "3:24 או 3h 24m או 204",
    value: durInput,
    onChange: e => setDurInput(e.target.value)
  }), durMins > 0 && edt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      marginTop: 3
    }
  }, "סיום: ", edt.slice(11, 16))), /*#__PURE__*/React.createElement(FG, {
    lbl: isWevoLinked ? 'קוט"ש בפועל (מהעמדה / Wevo)' : 'קוט"ש גולמי (מהעמדה)'
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    placeholder: openSession.liveKwh != null ? String(Number(openSession.liveKwh).toFixed(2)) : "35.41",
    inputMode: "decimal",
    value: kwh,
    onChange: e => setKwh(e.target.value)
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
    disabled: !prev,
    onClick: () => onSave(openSession.id, {
      id: uid(),
      clientId: openSession.clientId,
      date: effectiveStart,
      endDate: edt || null,
      ...prev,
      source: isWevoLinked ? "wevo-live" : "manual",
      notes: openSession.notes || (openSession.wevoTxnId ? `txn#${openSession.wevoTxnId}` : "")
    })
  }, isSelf ? "שמור עלות אשראי" : filledOk ? "אשר ושמור טעינה" : "שמור טעינה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}
