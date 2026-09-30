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
      background: C.bg,
      border: `1px solid ${C.line}`,
      borderRadius: 10,
      padding: compact ? "8px 10px" : "10px 12px",
      marginBottom: compact ? 6 : 12,
      fontSize: compact ? 12 : 13,
      lineHeight: 1.55,
      color: C.body
    },
    "data-testid": "charge-timeline"
  }, !compact && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: C.ink,
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
        color: C.body
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, p.label, isBillStart && /*#__PURE__*/React.createElement("span", {
      style: S.pill(C.primarySoft, C.primaryInk)
    }, "התחלת חיוב"), isBillEnd && /*#__PURE__*/React.createElement("span", {
      style: S.pill(C.warnSoft, C.warnInk)
    }, "סיום חיוב")), /*#__PURE__*/React.createElement("span", {
      style: {
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums"
      }
    }, formatTimelineClock(p.at)));
  }));
}

