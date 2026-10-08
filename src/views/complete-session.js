/**
 * src/views/complete-session.js — סיום ואישור טעינה.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
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
  const [kwh, setKwh] = useState(() => openSession && openSession.liveKwh != null && Number(openSession.liveKwh) > 0 ? Number(openSession.liveKwh).toFixed(2) : "");
  const [fr, setFr] = useState("auto");
  const [customRate, setCustomRate] = useState("");
  const [prev, setPrev] = useState(null);
  const [adjust, setAdjust] = useState("");
  const [wevoFetch, setWevoFetch] = useState("");
  const [wevoFetchErr, setWevoFetchErr] = useState("");
  const [preferMaxBill, setPreferMaxBill] = useState(true);
  const [billStartKey, setBillStartKey] = useState(() => openSession && openSession.billStartKey || "plugIn");
  const [billEndKey, setBillEndKey] = useState(() => openSession && openSession.billEndKey || "chargeEnd");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [timelineOverride, setTimelineOverride] = useState(null);
  const [saving, setSaving] = useState(false);
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
  // ── בחירת שעת התחלה/סיום ידנית ──────────────────────────────────────────
  // התחלה: הכנסת כבל / התחלת טעינה / שעה ידנית · סיום: סיום טעינה / הוצאת כבל / שעה ידנית.
  // הבחירה נכנסת ל-startEdit/endDt ולכן גם לחישוב החיוב (calcSession).
  const startKeyOptions = () => {
    const pts = timelinePoints(sessionTimeline);
    const opts = [];
    const pIn = pts.find(p => p.key === "plugIn");
    const cStart = pts.find(p => p.key === "chargeStart");
    if (pIn) opts.push({ key: "plugIn", label: "הכנסת כבל", at: pIn.at });
    if (cStart) opts.push({ key: "chargeStart", label: "התחלת טעינה", at: cStart.at });
    opts.push({ key: "manual", label: "שעה ידנית", at: null });
    return opts;
  };
  const endKeyOptions = () => {
    const pts = timelinePoints(sessionTimeline);
    const opts = [];
    const cEnd = pts.find(p => p.key === "chargeEnd");
    const pOut = pts.find(p => p.key === "plugOut");
    if (cEnd) opts.push({ key: "chargeEnd", label: "סיום טעינה", at: cEnd.at });
    if (pOut) opts.push({ key: "plugOut", label: "הוצאת כבל", at: pOut.at });
    opts.push({ key: "manual", label: "שעה ידנית", at: null });
    return opts;
  };
  const onStartKeyChange = key => {
    setPreferMaxBill(false);
    setBillStartKey(key);
    if (key === "manual") return;
    const p = pointAt(sessionTimeline, key);
    if (p) onStartChange(asLocalDT(p));
  };
  const onEndKeyChange = key => {
    setPreferMaxBill(false);
    setBillEndKey(key);
    if (key === "manual") return;
    const p = pointAt(sessionTimeline, key);
    if (p) onEndChange(asLocalDT(p));
  };
  const onManualStartTime = val => {
    setManualStart(val);
    if (!parseManualTimeHHMM(val)) return;
    const dt = combineDateWithTime(effectiveStart || startDt, val) || combineDateWithTime(Date.now(), val);
    if (dt) onStartChange(dt);
  };
  const onManualEndTime = val => {
    setManualEnd(val);
    if (!parseManualTimeHHMM(val)) return;
    const dt = manualEndDateTime(effectiveStart || startDt, val);
    if (dt) onEndChange(dt);
  };
  const applyWevoFields = fields => {
    if (!fields) return;
    if (fields.kwh > 0) setKwh(Number(fields.kwh).toFixed(2));
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
      setWevoFetchErr("אין התחברות Wevo — היכנס תחילה ב״סנכרון Wevo״");
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
    if (openSession.liveKwh != null && Number(openSession.liveKwh) > 0) setKwh(Number(openSession.liveKwh).toFixed(2));
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
    style: filledOk ? S.pill(C.okSoft, C.okInk) : S.pill(C.bg, C.meta)
  }, filledOk && /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 12
  }), "השלמת טעינה פתוחה", filledOk ? " · מוכן לאישור" : ""))), (isWevoLinked || readyFromWevo) && /*#__PURE__*/React.createElement("div", {
    style: S.statusCard(filledOk ? C.ok : wevoFetch === "err" ? C.err : C.warn)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      lineHeight: 1.5,
      color: C.body
    }
  }, wevoFetch === "loading" ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ev-live-dot",
    style: {
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: C.warn,
      display: "inline-block"
    }
  }), /*#__PURE__*/React.createElement(Spinner, {
    s: 15
  }), "שולף מ-Wevo שעת סיום טעינה וקוט״ש סופי...") : filledOk ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      color: C.okInk,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 16
  }), timelineRelevant ? "הנתונים מולאו מ-Wevo — בחר נקודות לחיוב מתוך חלון הזמנים (מעבר בין יקרות לרגיל)." : "הנתונים מולאו מ-Wevo — אין מעבר בין שעות יקרות/רגילות, חיוב לפי חיבור→סיום.") : /*#__PURE__*/React.createElement(React.Fragment, null, wevoFetchErr ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.errInk,
      fontWeight: 700
    }
  }, wevoFetchErr) : /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plug",
    s: 16
  }), "מושך נתוני סיום מ-Wevo…"), openSession.wevoTxnId && /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.faint,
      fontSize: 11,
      marginRight: 6
    }
  }, "txn#", openSession.wevoTxnId)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ev-press",
    style: { ...S.btnS,
      marginTop: 8,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      minHeight: 40,
      fontSize: 13,
      flex: "0 0 auto"
    },
    disabled: wevoFetch === "loading",
    onClick: pullWevoFinal
  }, wevoFetch === "loading" ? /*#__PURE__*/React.createElement(Spinner, {
    s: 14
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "refresh",
    s: 14
  }), wevoFetch === "loading" ? " שולף..." : " רענן מ-Wevo"))), timelineRelevant && tlPoints.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ChargeTimelineBox, {
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
    onChange: e => onStartKeyChange(e.target.value),
    "data-testid": "bill-start-key"
  }, tlPoints.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.key,
    value: p.key
  }, p.label, " · ", formatTimelineClock(p.at))).concat([/*#__PURE__*/React.createElement("option", {
    key: "manual",
    value: "manual"
  }, "שעה ידנית")]))), /*#__PURE__*/React.createElement(FG, {
    lbl: "סיום חיוב"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: billEndKey,
    disabled: preferMaxBill,
    onChange: e => onEndKeyChange(e.target.value),
    "data-testid": "bill-end-key"
  }, tlPoints.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.key,
    value: p.key
  }, p.label, " · ", formatTimelineClock(p.at)))))), /*#__PURE__*/React.createElement(FG, {
    lbl: "שעת התחלה (לבחירה)"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: billStartKey,
    onChange: e => onStartKeyChange(e.target.value),
    "data-testid": "start-time-choice"
  }, startKeyOptions().map(o => /*#__PURE__*/React.createElement("option", {
    key: o.key,
    value: o.key
  }, o.label, o.at ? " · " + formatTimelineClock(o.at) : ""))), billStartKey === "manual" && /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginTop: 8
    },
    type: "text",
    inputMode: "text",
    placeholder: "שעה ידנית — למשל 22:30",
    value: manualStart,
    onChange: e => onManualStartTime(e.target.value),
    "data-testid": "manual-start-time"
  }), billStartKey === "manual" && manualStart && !parseManualTimeHHMM(manualStart) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.err,
      marginTop: 4,
      fontWeight: 600
    }
  }, "פורמט לא תקין — כתוב שעה:דקות, למשל 22:30")), /*#__PURE__*/React.createElement(FG, {
    lbl: "שעת סיום (לבחירה)"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: billEndKey,
    onChange: e => onEndKeyChange(e.target.value),
    "data-testid": "end-time-choice"
  }, endKeyOptions().map(o => /*#__PURE__*/React.createElement("option", {
    key: o.key,
    value: o.key
  }, o.label, o.at ? " · " + formatTimelineClock(o.at) : ""))), billEndKey === "manual" && /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginTop: 8
    },
    type: "text",
    inputMode: "text",
    placeholder: "שעה ידנית — למשל 23:45",
    value: manualEnd,
    onChange: e => onManualEndTime(e.target.value),
    "data-testid": "manual-end-time"
  }), billEndKey === "manual" && manualEnd && !parseManualTimeHHMM(manualEnd) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.err,
      marginTop: 4,
      fontWeight: 600
    }
  }, "פורמט לא תקין — כתוב שעה:דקות, למשל 23:45")), /*#__PURE__*/React.createElement(FG, {
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
    placeholder: "3:24 או 3h 24m",
    value: durInput,
    onChange: e => {
      setPreferMaxBill(false);
      onDurChange(e.target.value);
    },
    "data-testid": "complete-duration"
  }), durMins > 0 && /*#__PURE__*/React.createElement("span", {
    style: { ...S.chip(C.primarySoft, C.primaryInk),
      minHeight: 0,
      padding: "4px 10px",
      fontSize: 11,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "clock",
    s: 13
  }), "= ", Math.floor(durMins / 60), " שעות ו־", durMins % 60, " דק׳", edt ? ` · סיום ${edt.slice(11, 16)}` : ""))), !isWevoLinked && !readyFromWevo && /*#__PURE__*/React.createElement("div", {
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
    lbl: isWevoLinked ? 'קוט״ש בפועל (מהעמדה / Wevo)' : 'קוט״ש גולמי (מהעמדה)'
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "0.01",
    placeholder: openSession.liveKwh != null ? String(Number(openSession.liveKwh).toFixed(2)) : "35.41",
    inputMode: "decimal",
    value: kwh,
    onChange: e => setKwh(e.target.value),
    "data-testid": "complete-kwh"
  }), Number(openSession.liveKwh) > 0 && /*#__PURE__*/React.createElement("span", {
    style: { ...S.chip(C.primarySoft, C.primaryInk),
      minHeight: 0,
      padding: "4px 10px",
      fontSize: 11,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plug",
    s: 13
  }), "מ-Wevo: ", Number(openSession.liveKwh).toFixed(2), " קוט״ש")), isSelf ? /*#__PURE__*/React.createElement("div", {
    style: S.statusCard(C.primary)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "card",
    s: 20,
    style: {
      color: C.primaryStrong
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.primaryInk,
      lineHeight: 1.45
    }
  }, "טעינה עצמית — רק ", /*#__PURE__*/React.createElement("strong", null, "עלות בפועל"), " (בלי ניפוח / פרימיום / תוספות). יורד באשראי, בלי חוב.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FG, {
    lbl: "תעריף"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.rg
  }, [["auto", "אוטומטי", "cog"], ["regular", `רגיל ₪${getConfig().rateRegular}`, null], ["premium", `פרימיום ₪${getConfig().ratePremium}`, null], ["custom", "מותאם", "edit"]].map(([v, l, ic]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "cfr",
    value: v,
    checked: fr === v,
    onChange: () => setFr(v)
  }), ic && /*#__PURE__*/React.createElement(Icon, {
    n: ic,
    s: 15
  }), /*#__PURE__*/React.createElement("span", null, l)))), fr === "custom" && /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginTop: 8
    },
    type: "number",
    step: "0.01",
    inputMode: "decimal",
    placeholder: "מחיר לקוט\"ש",
    value: customRate,
    onChange: e => setCustomRate(e.target.value),
    "data-testid": "complete-custom-rate"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "תוספת / הנחה (₪) — אופציונלי"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    placeholder: "10 תוספת או -5 הנחה",
    value: adjust,
    onChange: e => setAdjust(e.target.value),
    "data-testid": "complete-adjust"
  }))), prev && /*#__PURE__*/React.createElement("div", {
    style: S.prev
  }, /*#__PURE__*/React.createElement("div", {
    style: S.prevTitle
  }, "תצוגה מקדימה"), (isSelf ? [[`קוט״ש`, String(prev.kwhRaw), null], ["חיוב אשראי (עלות בפועל)", ilsFull(prev.amountBilled), C.primary], ["סטטוס", /*#__PURE__*/React.createElement("span", {
    style: S.pill(C.primarySoft, C.primaryInk)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 12
  }), " אשראי · ללא חוב"), C.primary]] : [[`קוט״ש מנופח`, `${prev.kwhRaw} → ${prev.kwhInflated}`, null], ["תעריף", `₪${prev.rate} | ${prev.rateLabel}`, null], ["לחיוב (לפני תוספת)", ils(prev.amountBilled - adjVal), null], ...(adjVal !== 0 ? [["תוספת/הנחה", `${adjVal > 0 ? "+" : ""}${adjVal}₪`, adjVal > 0 ? C.warn : C.ok]] : []), ["סה״כ לחיוב", ils(prev.amountBilled), C.primaryStrong], ["עלות בפועל 🔒", `₪${(_prev$costToOwner2 = prev.costToOwner) === null || _prev$costToOwner2 === void 0 ? void 0 : _prev$costToOwner2.toFixed(2)}`, C.meta], ["רווח", ilsFull(prev.profit), C.okInk]]).map(([lbl, val, color]) => /*#__PURE__*/React.createElement("div", {
    key: lbl,
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.meta,
      fontSize: 13
    }
  }, lbl), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: lbl === "סה״כ לחיוב" ? "800" : color ? "700" : "400",
      fontSize: lbl === "סה״כ לחיוב" ? 18 : color ? 15 : 13,
      color: color || C.ink,
      fontVariantNumeric: "tabular-nums"
    }
  }, val))), prev && /*#__PURE__*/React.createElement("div", {
    style: { ...S.statusCard(C.primary),
      display: "block",
      textAlign: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 800,
      color: C.ink,
      fontVariantNumeric: "tabular-nums",
      lineHeight: 1.2
    }
  }, Number(prev.kwhInflated).toFixed(2), " קוט״ש"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: C.primaryStrong,
      marginTop: 2,
      fontVariantNumeric: "tabular-nums"
    }
  }, ils(prev.amountBilled), " לחיוב"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      justifyContent: "center",
      flexWrap: "wrap",
      marginTop: 8
    }
  }, !isSelf && (prev.isMixed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: S.pill(C.warnSoft, C.warnInk)
  }, (Number(prev.kwhInflated) * Number(prev.premiumRatio || 0)).toFixed(1), " קוט״ש שיא"), /*#__PURE__*/React.createElement("span", {
    style: S.pill(C.primarySoft, C.primaryInk)
  }, (Number(prev.kwhInflated) * (1 - Number(prev.premiumRatio || 0))).toFixed(1), " קוט״ש רגיל")) : /*#__PURE__*/React.createElement("span", {
    style: S.pill(Number(prev.premiumRatio) >= 1 ? C.warnSoft : C.primarySoft, Number(prev.premiumRatio) >= 1 ? C.warnInk : C.primaryInk)
  }, Number(prev.premiumRatio) >= 1 ? "תעריף שיא" : "תעריף רגיל")), prev.durMin > 0 && /*#__PURE__*/React.createElement("span", {
    style: S.pill(C.bg, C.meta)
  }, "משך: ", formatDurMins(prev.durMin))))), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: saving ? 0.7 : prev ? 1 : 0.5,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    disabled: !prev || !(Number(kwh) > 0) || saving,
    onClick: () => {
      setSaving(true);
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
  }, saving ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Spinner, {
    s: 16,
    style: {
      borderTopColor: "#fff",
      borderColor: "rgba(255,255,255,0.35)"
    }
  }), " שומר…") : !(Number(kwh) > 0) ? "אין קוט״ש — לא לשמור" : isSelf ? "שמור עלות אשראי" : filledOk ? "אשר ושמור טעינה" : "שמור טעינה"), !(Number(kwh) > 0) && onDelete && /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      color: C.err,
      borderColor: "#fecaca"
    },
    "data-testid": "complete-delete-empty",
    onClick: () => onDelete(openSession.id)
  }, "מחק טעינה ריקה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")));
}

