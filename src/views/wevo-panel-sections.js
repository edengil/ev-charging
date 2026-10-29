/**
 * src/views/wevo-panel-sections.js — קטעי תצוגה טהורים שהופרדו מהפאנל החי.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── LiveMoneyBox: קופסת עלות חיה (קוט״ש, עלות Wevo, חיוב לקוח, רווח משוער) ────
function LiveMoneyBox({
  est,
  st,
  selectedClient
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #e2e8f0",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      marginBottom: 8,
      color: "#0f172a"
    }
  }, "חישוב חי", est.isSelf ? " · עלות בלבד" : ` · ${selectedClient ? selectedClient.name : ""}`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, ' קוט״ש'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16
    }
  }, est.kwh.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, "עלות Wevo 🔒"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#475569"
    }
  }, "₪", est.wevoCost.toFixed(2))), !est.isSelf && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.primarySoft,
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.primaryStrong,
      marginBottom: 2
    }
  }, "לחיוב לקוח"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18,
      color: C.primaryStrong,
      fontVariantNumeric: "tabular-nums"
    }
  }, ils(est.calc.amountBilled)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.meta,
      marginTop: 2
    }
  }, est.calc.kwhInflated, ' קוט״ש מנופח · ₪', est.calc.rate, " · ", est.calc.rateLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfdf5",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#059669",
      marginBottom: 2
    }
  }, "רווח משוער"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#047857"
    }
  }, ilsFull(est.calc.profit))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11,
      color: "#64748b",
      lineHeight: 1.45,
      display: "grid",
      gap: 2
    }
  }, est.elec != null && /*#__PURE__*/React.createElement("div", null, "חשמל Wevo: ₪", Number(est.elec).toFixed(2), est.wevoCost != null ? ` · סה״כ Wevo: ₪${Number(est.wevoCost).toFixed(2)}` : ""), st.avgRateKW != null && /*#__PURE__*/React.createElement("div", null, "מהירות ממוצעת: ", Number(st.avgRateKW).toFixed(1), " kW", st.maxRateKW != null ? ` · מקס׳ ${Number(st.maxRateKW).toFixed(1)} kW` : ""), st.origin && /*#__PURE__*/React.createElement("div", null, "מקור: ", wevoOriginHe(st.origin))));
}

