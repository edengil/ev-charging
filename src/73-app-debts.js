/**
 * 73-app-debts.js — DebtsSendView — מסך שליחת תזכורות חוב.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
function DebtsSendView({
  stats = [],
  go
}) {
  const list = stats
    .filter(c => !c.isSelf && !c.hidden && hasDebt(c.balance))
    .sort((a, b) => b.balance - a.balance);
  const totalDebt = list.reduce((a, c) => a + c.balance, 0);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, list.length ? /*#__PURE__*/React.createElement("div", {
    style: S.hero
  }, /*#__PURE__*/React.createElement("div", {
    style: { ...S.num, ...S.heroNum }
  }, ils(totalDebt)), /*#__PURE__*/React.createElement("div", {
    style: S.heroLabel
  }, `סך חובות פתוחים · ${list.length} חייבים`)) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "check",
    tone: "ok",
    title: "כל החובות שולמו",
    sub: "אין חובות פתוחים כרגע. אפשר לנשום."
  }), list.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.meta,
      marginBottom: 12,
      lineHeight: 1.45
    }
  }, "כל כפתור פותח טיוטה. כלום לא נשלח עד שאתה מחליט."), list.map(c => {
    const lastAmt = c.last ? c.last.amountBilled : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      style: {
        background: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        boxShadow: C.shadowCard,
        display: "flex",
        alignItems: "center",
        gap: 12
      },
      "data-testid": `debt-row-${c.id}`
    }, /*#__PURE__*/React.createElement("div", {
      style: S.ava(40, 16)
    }, String(c.name || "?").trim().charAt(0) || "?"), /*#__PURE__*/React.createElement("div", {
      style: { flex: 1, minWidth: 0 }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => go("client", c.id),
      style: { fontSize: 15, fontWeight: 800, color: C.primaryStrong, cursor: "pointer" }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: { ...S.num, fontSize: 22, fontWeight: 800, color: c.balance > 0 ? C.err : C.ok, marginTop: 2 }
    }, ils(c.balance)), c.phone ? null : /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 12, color: "#94a3b8", marginTop: 2 }
    }, "אין טלפון בכרטיס")), /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", flexDirection: "column", gap: 6 }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": `debt-pay-${c.id}`,
      onClick: () => go("add-p", c.id),
      style: S.btnXS(C.primaryStrong, "#fff")
    }, "רשום תשלום"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": `debt-send-${c.id}`,
      onClick: () => {
        openWaDraft({
          phone: c.phone,
          name: c.name,
          text: waDebtPing(c.balance, lastAmt)
        });
      },
      style: { ...S.btnXS("#fff", C.body), border: "1px solid #e2e8f0" }
    }, "תזכורת")));
  }));
}

