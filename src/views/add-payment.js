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
  payments,
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
  const [dupWarn, setDupWarn] = useState(null);
  const afterBal = bal - parseFloat(amt || 0);
  const clearDup = () => setDupWarn(null);
  const trySave = force => {
    const amount = parseFloat(amt);
    if (!amt || !(amount > 0)) return;
    const candidate = {
      id: uid(),
      clientId: cid,
      amount: amount,
      method: method,
      date: new Date().toISOString(),
      notes: notes
    };
    if (!force) {
      const suspect = findSameDayDuplicatePayment(payments || [], candidate);
      if (suspect) {
        setDupWarn(suspect);
        return;
      }
    }
    setDupWarn(null);
    onSave(candidate);
  };
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.hero
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
  }, hasDebt(bal) ? "יתרת חוב" : hasCredit(bal) ? "יתרת זכות" : "יתרה"))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.heroNum,
      fontSize: 22,
      marginTop: 8
    }
  }, formatBalanceText(bal)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "סכום ששולם"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "number",
    step: "1",
    value: amt,
    onChange: e => {
      setAmt(e.target.value);
      clearDup();
    },
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
    onChange: () => {
      setMethod(v);
      clearDup();
    }
  }), " ", l)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: bal <= 0.01 ? "למשל: שולם מראש / מזומן מראש" : "אופציונלי"
  })), amt ? /*#__PURE__*/React.createElement("div", {
    style: S.statusCard(C.primary),
    "data-testid": "payment-preview"
  }, /*#__PURE__*/React.createElement("div", {
    style: { flex: 1 }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.pRow
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.meta,
      fontSize: 13
    }
  }, hasCredit(afterBal) ? "יתרת זכות לאחר תשלום" : hasDebt(afterBal) ? "חוב לאחר תשלום" : "יתרה לאחר תשלום"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: balanceColor(afterBal, false),
      fontSize: 15
    }
  }, hasCredit(afterBal) ? ils(Math.abs(afterBal)) : ils(afterBal))), hasCredit(afterBal) && /*#__PURE__*/React.createElement("div", {
    style: { ...S.chip(C.okSoft, C.okInk), marginTop: 6 }
  }, /*#__PURE__*/React.createElement(Icon, { n: "check", s: 13 }), "שולם מראש — הטעינות הבאות ינוכו מיתרת הזכות"))) : null, dupWarn && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fffbeb",
        border: `1.5px solid ${C.warn}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginTop: 10,
        fontSize: 13,
        color: "#92400e",
        lineHeight: 1.5
      },
      "data-testid": "payment-dupwarn"
    }, /*#__PURE__*/React.createElement("div", {
      style: { ...S.chip(C.warnSoft, C.warnInk), marginBottom: 8 }
    }, /*#__PURE__*/React.createElement(Icon, { n: "alert", s: 13 }), "נראה שכבר נרשם היום תשלום דומה: ", ils(Number(dupWarn.amount) || 0), " (", METHODS[dupWarn.method] || dupWarn.method || "", ", ", new Date(dupWarn.date).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit"
    }), "). זו כפילות?"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btnP,
        fontSize: 13,
        padding: "8px 12px"
      },
      onClick: () => trySave(true),
      "data-testid": "payment-dupwarn-force"
    }, "שמור בכל זאת"), /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btnS,
        fontSize: 13,
        padding: "8px 12px"
      },
      onClick: clearDup,
      "data-testid": "payment-dupwarn-cancel"
    }, "לא, זו טעות"))), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: !amt || !(parseFloat(amt) > 0) ? 0.5 : 1
    },
    disabled: !amt || !(parseFloat(amt) > 0),
    onClick: () => trySave(false),
    "data-testid": "payment-save"
  }, "אשר תשלום"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול")));
}

