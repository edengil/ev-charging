/**
 * src/views/add-debt.js — הוספת חוב.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── AddDebt ────────────────────────────────────────────────────────────────
function AddDebt({
  cid,
  clients,
  onSave,
  onCancel
}) {
  const c = clients.find(x => x.id === cid);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.heroErr
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 48,
    fontSize: 20
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800
    }
  }, c === null || c === void 0 ? void 0 : c.name), /*#__PURE__*/React.createElement("div", {
    style: S.heroLabel
  }, "הוספת חוב ידני")))), /*#__PURE__*/React.createElement("div", {
    style: { ...S.chip(C.errSoft, C.errInk), marginBottom: 14 }
  }, /*#__PURE__*/React.createElement(Icon, { n: "alert", s: 13 }), "מוסיף לסכום שהלקוח חייב (לא תשלום)"), /*#__PURE__*/React.createElement(FG, {
    lbl: "סכום החוב (₪)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    placeholder: "0",
    value: amount,
    onChange: e => setAmount(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "סיבה / הערה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "חוב ישן, הסכם מיוחד..."
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: C.err,
      opacity: !amount || parseFloat(amount) <= 0 ? 0.5 : 1
    },
    disabled: !amount || parseFloat(amount) <= 0,
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      amount: parseFloat(amount),
      method: "debt",
      date: new Date().toISOString(),
      notes
    })
  }, "הוסף חוב"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

