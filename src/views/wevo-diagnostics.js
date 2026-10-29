/**
 * src/views/wevo-diagnostics.js — כפתורי אבחון Wevo ותוצאותיהם (רכיבי תצוגה טהורים שהופרדו מהפאנל החי).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── WevoDiagnostics: כפתורי אבחון (פרימיום/מחיר) + הצגת תוצאותיהם ──────────
function WevoDiagnosticsButtons({
  probeBusy,
  tariffProbeBusy,
  onRunProbe,
  onRunTariffProbe
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: onRunProbe,
    disabled: probeBusy,
    "data-testid": "wevo-probe-commands",
    title: "אבחון: בודק איזו פקודת פרימיום Wevo מקבלת",
    style: {
      background: "none",
      border: "1px dashed #9ca3af",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      cursor: "pointer",
      color: "#6b7280",
      fontWeight: 600
    }
  }, probeBusy ? "מאבחן…" : "🔍 אבחון פרימיום"), /*#__PURE__*/React.createElement("button", {
    onClick: onRunTariffProbe,
    disabled: tariffProbeBusy,
    "data-testid": "wevo-probe-tariff",
    title: "אבחון: בודק אם אפשר לעדכן מחיר בשרת Wevo (בלי לשנות כלום)",
    style: {
      background: "none",
      border: "1px dashed #9ca3af",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      cursor: "pointer",
      color: "#6b7280",
      fontWeight: 600
    }
  }, tariffProbeBusy ? "בודק…" : "💰 אבחון מחיר"));
}

function WevoDiagnosticsResults({
  probeResults,
  tariffProbeResults
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, tariffProbeResults && tariffProbeResults.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: "tp" + i,
    style: {
      background: "#fffbeb",
      border: "1px solid #fcd34d",
      borderRadius: 8,
      padding: "6px 10px",
      marginBottom: 6,
      fontSize: 12,
      direction: "ltr",
      textAlign: "left"
    },
    "data-testid": "wevo-tariff-probe-results"
  }, /*#__PURE__*/React.createElement("code", { style: { fontWeight: 700 } }, r.path), " → ", r.error ? "❌ " + String(r.error).slice(0, 80) : "סטטוס " + r.status)), probeResults && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      border: "1.5px solid #cbd5e1",
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 10,
      fontSize: 12,
      direction: "ltr",
      textAlign: "left"
    },
    "data-testid": "wevo-probe-results"
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontWeight: 700, marginBottom: 6, direction: "rtl", textAlign: "right" }
  }, "🔍 תוצאות אבחון פקודות (", probeResults.length, "):"), probeResults.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "4px 0",
      borderBottom: i < probeResults.length - 1 ? "1px solid #e2e8f0" : "none",
      color: r.status === "responded" ? "#047857" : "#92400e"
    }
  }, /*#__PURE__*/React.createElement("code", {
    style: { fontWeight: 700 }
  }, r.command), " → ", r.status === "responded" ? "✅ הגיב" : "❌ נכשל", r.response ? /*#__PURE__*/React.createElement("div", {
    style: { color: "#475569", fontSize: 11, wordBreak: "break-all", marginTop: 2 }
  }, r.response.slice(0, 200)) : null, r.error ? /*#__PURE__*/React.createElement("div", {
    style: { color: "#92400e", fontSize: 11 }
  }, r.error.slice(0, 150)) : null))));
}

