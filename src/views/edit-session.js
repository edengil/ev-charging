/**
 * src/views/edit-session.js — עריכת טעינה.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── EditSession: עריכת טעינה קיימת ─────────────────────────────────────────
function EditSession({
  session,
  clients,
  onSave,
  onCancel
}) {
  const initialDt = session ? toLocalDT(session.date) : toLocalDT(new Date());
  const initialDur = initialEditDuration(session);
  const initialKwh = session ? String(session.kwhRaw) : "";
  const initialRate = session && Number(session.rate) > 0 ? String(session.rate) : "";
  const [dt, setDt] = useState(initialDt);
  const [durInput, setDurInput] = useState(initialDur);
  const [kwh, setKwh] = useState(initialKwh);
  // שומרים את התעריף המקורי כמותאם — מונע קפיצה מתעריפי ברירת מחדל עדכניים
  const [fr, setFr] = useState(initialRate ? "custom" : "auto");
  const [customRate, setCustomRate] = useState(initialRate);
  const [notes, setNotes] = useState((session === null || session === void 0 ? void 0 : session.notes) || "");
  const [adjust, setAdjust] = useState("");
  const [prev, setPrev] = useState(() => previewFromSession(session));
  const adjustVal = parseFloat(adjust) || 0;
  const durMins = parseDurStr(durInput);
  const edt = dt && durMins > 0 ? addMinutes(dt, durMins) : "";
  const editCl = session ? clients.find(x => x.id === session.clientId) : null;
  const isSelfEdit = isSelfClient(editCl);
  const fieldsDirty = !session ? false
    : String(kwh) !== String(initialKwh)
      || String(dt) !== String(initialDt)
      || String(durInput) !== String(initialDur)
      || fr !== (initialRate ? "custom" : "auto")
      || (fr === "custom" && String(customRate) !== String(initialRate))
      || adjustVal !== 0;

  useEffect(() => {
    if (!session) {
      setPrev(null);
      return;
    }
    if (!kwh || isNaN(parseFloat(kwh))) {
      setPrev(null);
      return;
    }
    // בלי שינוי שדות חישוב — מציגים את הסכומים השמורים (בלי קפיצה)
    if (!fieldsDirty) {
      setPrev(previewFromSession(session));
      return;
    }
    const cr = fr === "custom" ? parseFloat(customRate) || null : null;
    const raw = calcSession(parseFloat(kwh), new Date(dt), edt ? new Date(edt) : null, fr === "regular", fr === "premium", cr);
    const kwhSame = Math.abs(parseFloat(kwh) - Number(session.kwhRaw)) < 0.0001;
    // אם הקוט״ש לא השתנה — שומרים ניפוח ועלות מקוריים כדי לא לקפוץ מתעריפי בעלים/אינפלציה חדשים
    const preserved = kwhSame ? {
      ...raw,
      kwhInflated: Number(session.kwhInflated) || raw.kwhInflated,
      amountBilled: cr != null && cr > 0
        ? Math.ceil((Number(session.kwhInflated) || raw.kwhInflated) * cr)
        : Math.ceil((Number(session.kwhInflated) || raw.kwhInflated) * raw.rate)
    } : raw;
    setPrev(billingForClient(preserved, editCl, {
      adjust: isSelfEdit ? 0 : adjustVal,
      actualCost: kwhSame ? session.costToOwner : undefined
    }));
  }, [kwh, dt, edt, fr, customRate, session, adjustVal, isSelfEdit, fieldsDirty, editCl]);

  if (!session) return null;
  const c = editCl;
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
    style: {
      fontSize: 12,
      color: C.primaryStrong,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, { n: "edit", s: 12, style: { display: "inline-block", verticalAlign: "-1px", marginInlineEnd: 4 } }), "עריכת טעינה"))), /*#__PURE__*/React.createElement("div", {
    style: { ...S.chip(fieldsDirty ? C.warnSoft : C.primarySoft, fieldsDirty ? C.warnInk : C.primaryInk), width: "100%", whiteSpace: "normal", borderRadius: 10, marginBottom: 14 }
  }, /*#__PURE__*/React.createElement(Icon, { n: fieldsDirty ? "alert" : "clock", s: 13 }), fieldsDirty
    ? "שינית שדות — החיוב מחושב מחדש. חיוב מקורי היה: "
    : "מוצגים הסכומים השמורים של הטעינה. שינוי קוט״ש/תעריף/זמן יחשב מחדש. חיוב שמור: ", ils(session.amountBilled)), /*#__PURE__*/React.createElement(SessionFormFields, {
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
    adjustVal: isSelfEdit ? 0 : adjustVal,
    durMins: durMins,
    edt: edt,
    isSelf: isSelfEdit
  }), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: prev ? 1 : 0.5
    },
    disabled: !prev,
    onClick: () => onSave(session.id, {
      date: dt,
      ...prev,
      notes,
      durMin: durMins > 0 ? durMins : session.durMin,
      endDate: edt || session.endDate || null
    }),
    "data-testid": "session-edit-save"
  }, isSelfEdit ? "עדכן עלות אשראי" : "עדכן טעינה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

