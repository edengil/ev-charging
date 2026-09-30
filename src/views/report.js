/**
 * src/views/report.js — דוח חודשי ללקוח + וואטסאפ.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── Report (חודשי ללקוח + וואטסאפ) ─────────────────────────────────────────
function Report({
  cid,
  clients,
  sessions,
  payments
}) {
  const c = clients.find(x => x.id === cid);
  const now = new Date();
  const [mo, setMo] = useState(now.getMonth());
  const [yr, setYr] = useState(now.getFullYear());
  const ss = sessions.filter(s => {
    const d = new Date(s.date);
    return s.clientId === cid && d.getMonth() === mo && d.getFullYear() === yr;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  const total = ss.reduce((a, s) => a + s.amountBilled, 0);
  const bal = clientBalance(c, sessions, payments);
  const minYr = Math.min(now.getFullYear(), ...sessions.map(s => new Date(s.date).getFullYear()).filter(y => !isNaN(y)));
  const yrs = [];
  for (let y = minYr; y <= now.getFullYear(); y++) yrs.push(y);
  const reportText = () => [`דוח טעינות – ${c === null || c === void 0 ? void 0 : c.name}`, `חודש: ${MONTHS[mo]} ${yr}`, "─────────────────", ...ss.map(s => `${fdate(s.date)} ${ftime(s.date)} | ${s.kwhInflated} קוט"ש | ${ils(s.amountBilled)}`), "─────────────────", `סה"כ לתשלום: ${ils(total)}`, `יתרה נוכחית: ${ils(bal)}`].join("\n");
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: mo,
    onChange: e => setMo(+e.target.value)
  }, MONTHS.map((m, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, m))), /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: yr,
    onChange: e => setYr(+e.target.value)
  }, yrs.map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y)))), /*#__PURE__*/React.createElement("div", {
    style: S.rep
  }, /*#__PURE__*/React.createElement("div", {
    style: S.repH
  }, /*#__PURE__*/React.createElement("span", null, "📄 ", c === null || c === void 0 ? void 0 : c.name), /*#__PURE__*/React.createElement("span", null, MONTHS[mo], " ", yr)), ss.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין טעינות בחודש זה"), ss.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: S.repRow
  }, /*#__PURE__*/React.createElement("span", null, fdate(s.date), " ", ftime(s.date)), /*#__PURE__*/React.createElement("span", null, s.kwhInflated, " קוט\"ש"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, ils(s.amountBilled)))), ss.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.repRow,
      borderTop: "2px solid #e5e7eb",
      fontWeight: 700,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "סהכ"), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#0e7490",
      fontSize: 17,
      fontVariantNumeric: "tabular-nums"
    }
  }, ils(total)))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.repRow,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "יתרה נוכחית"), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: bal > 0 ? "#b91c1c" : "#047857",
      fontSize: 15,
      fontVariantNumeric: "tabular-nums"
    }
  }, ils(bal))), ss.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#128c4b"
    },
    onClick: () => openWaDraft({
      phone: c === null || c === void 0 ? void 0 : c.phone,
      name: c === null || c === void 0 ? void 0 : c.name,
      text: reportText()
    })
  }, "💬 טיוטה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: () => navigator.clipboard.writeText(reportText())
  }, "📋 העתק")));
}

