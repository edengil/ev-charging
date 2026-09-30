/**
 * src/views/edit-payment.js — עריכת תשלום.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── EditPayment ────────────────────────────────────────────────────────────
function EditPayment({
  payment,
  clients,
  onSave,
  onDelete,
  onCancel
}) {
  const p = payment;
  if (!p) return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement(EmptyState, {
    icon: "alert",
    title: "התשלום לא נמצא"
  }));
  const cl = clients.find(x => x.id === p.clientId);
  const isDebt = p.method === "debt";
  const [amt, setAmt] = useState(String(Math.abs(p.amount)));
  const [method, setMethod] = useState(p.method);
  const [notes, setNotes] = useState(p.notes || "");
  const [confirmDel, setConfirmDel] = useState(false);
  const num = parseFloat(amt || 0) || 0;
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: cl,
    size: 48,
    fontSize: 20
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cNameLg
  }, cl === null || cl === void 0 ? void 0 : cl.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.meta,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, { n: "edit", s: 12, style: { display: "inline-block", verticalAlign: "-1px", marginInlineEnd: 4 } }), "עריכת ", isDebt ? "חוב" : "תשלום", " · ", fdate(p.date)))), /*#__PURE__*/React.createElement(FG, {
    lbl: isDebt ? "סכום החוב" : "סכום ששולם"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    value: amt,
    onChange: e => setAmt(e.target.value)
  })), !isDebt && /*#__PURE__*/React.createElement(FG, {
    lbl: "שיטת תשלום"
  }, /*#__PURE__*/React.createElement("div", {
    style: S.rg
  }, PAYMENT_METHOD_OPTIONS.map(([v, l]) => /*#__PURE__*/React.createElement("label", {
    key: v,
    style: S.rlbl
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "epm",
    value: v,
    checked: method === v,
    onChange: () => setMethod(v)
  }), " ", l)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "אופציונלי"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.prev
  }, /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.meta,
      fontSize: 13
    }
  }, "סכום קודם"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: C.meta,
      fontSize: 15
    }
  }, ils(Math.abs(p.amount)))), /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.meta,
      fontSize: 13
    }
  }, "סכום חדש"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: C.primaryStrong,
      fontSize: 15
    }
  }, ils(num)))), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: S.btnP,
    onClick: () => onSave(p.id, {
      amount: isDebt ? -Math.abs(num) : num,
      method,
      notes
    })
  }, "שמור שינויים"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")), confirmDel ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#374151",
      marginBottom: 8,
      fontWeight: 600
    }
  }, "למחוק את הרישום הזה?"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: C.errInk,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "8px 18px",
      fontWeight: 700,
      cursor: "pointer",
      marginLeft: 8
    },
    onClick: () => onDelete(p.id)
  }, "כן, מחק"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: C.errSoft,
      color: C.errInk,
      border: "none",
      borderRadius: 8,
      padding: "8px 18px",
      cursor: "pointer"
    },
    onClick: () => setConfirmDel(false)
  }, "ביטול")) : /*#__PURE__*/React.createElement("button", {
    style: {
      background: "none",
      border: "none",
      color: C.err,
      fontSize: 13,
      cursor: "pointer",
      marginTop: 14,
      width: "100%",
      fontWeight: 600
    },
    onClick: () => setConfirmDel(true)
  }, /*#__PURE__*/React.createElement(Icon, { n: "trash", s: 13, style: { display: "inline-block", verticalAlign: "-2px", marginInlineEnd: 5 } }), "מחק רישום")));
}

