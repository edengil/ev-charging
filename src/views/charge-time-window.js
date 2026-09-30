/**
 * src/views/charge-time-window.js — חלון זמני טעינה (4 נקודות).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── חלון זמני טעינה (4 נקודות) ─────────────────────────────────────────────
function ChargeTimelineBox({
  timeline,
  billStartKey,
  billEndKey,
  compact = false
}) {
  const pts = timelinePoints(timeline);
  if (!pts.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: compact ? "8px 10px" : "10px 12px",
      marginBottom: compact ? 6 : 12,
      fontSize: compact ? 12 : 13,
      lineHeight: 1.55,
      color: "#334155"
    },
    "data-testid": "charge-timeline"
  }, !compact && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#0f172a",
      marginBottom: 6
    }
  }, "חלון זמנים"), pts.map(p => {
    const isBillStart = billStartKey === p.key;
    const isBillEnd = billEndKey === p.key;
    return /*#__PURE__*/React.createElement("div", {
      key: p.key,
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        padding: "2px 0",
        fontWeight: isBillStart || isBillEnd ? 700 : 400,
        color: isBillStart ? "#0369a1" : isBillEnd ? "#b45309" : "#334155"
      }
    }, /*#__PURE__*/React.createElement("span", null, p.label, isBillStart ? " · התחלת חיוב" : "", isBillEnd ? " · סיום חיוב" : ""), /*#__PURE__*/React.createElement("span", {
      style: {
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums"
      }
    }, formatTimelineClock(p.at)));
  }));
}

