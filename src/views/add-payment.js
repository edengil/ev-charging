/**
 * src/views/add-payment.js — הוספת תשלום.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── AddPayment ─────────────────────────────────────────────────────────────
function AddPayment({
  cid,
  clients,
  stats,
  onSave,
  onCancel
}) {
  var _st$balance;
  const c = clients.find(x => x.id === cid),
    st = stats.find(x => x.id === cid);
  const bal = (_st$balance = st === null || st === void 0 ? void 0 : st.balance) !== null && _st$balance !== void 0 ? _st$balance : 0;
  const [amt, setAmt] = useState(String(Math.max(0, Math.round(bal))));
  const [method, setMethod] = useState(DEFAULT_PAYMENT_METHOD);
  const [notes, setNotes] = useState("");
  const afterBal = bal - parseFloat(amt || 0);
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
      color: balanceColor(bal, false),
      fontWeight: 700
    }
  }, formatBalanceText(bal))))), /*#__PURE__*/React.createElement(FG, {
    lbl: "סכום ששולם"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    value: amt,
    onChange: e => setAmt(e.target.value),
    "data-testid": "payment-amount"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "שיטת תשלום"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.rg
  }, PAYMENT_METHOD_OPTIONS.map(([v, l]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "pm",
    value: v,
    checked: method === v,
    onChange: () => setMethod(v)
  }), " ", l)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: bal <= 0.01 ? "למשל: שולם מראש / מזומן מראש" : "אופציונלי"
  })), amt ? /*#__PURE__*/React.createElement("div", {
    style: S.prev,
    "data-testid": "payment-preview"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280",
      fontSize: 13
    }
  }, hasCredit(afterBal) ? "יתרת זכות לאחר תשלום" : hasDebt(afterBal) ? "חוב לאחר תשלום" : "יתרה לאחר תשלום"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: balanceColor(afterBal, false),
      fontSize: 15
    }
  }, hasCredit(afterBal) ? ils(Math.abs(afterBal)) : ils(afterBal))), hasCredit(afterBal) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#047857",
      marginTop: 6,
      fontWeight: 600
    }
  }, "שולם מראש — הטעינות הבאות ינוכו מיתרת הזכות")) : null, /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: !amt || !(parseFloat(amt) > 0) ? 0.5 : 1
    },
    disabled: !amt || !(parseFloat(amt) > 0),
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      amount: parseFloat(amt),
      method,
      date: new Date().toISOString(),
      notes
    }),
    "data-testid": "payment-save"
  }, "אשר תשלום"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")));
}

