/**
 * src/views/dashboard-cards.js — כרטיסי הדשבורד: טעינות פעילות, hero חודשי, שורת תובנות וכרטיסי סיכום.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
function ActiveChargeCards({ openCards, clients, onComplete, onDelOpen }) {
  if (!openCards || !openCards.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: { marginBottom: 14 }
  }, /*#__PURE__*/React.createElement("p", {
    style: { ...S.secTitle, color: "#374151" }
  }, "טעינות פתוחות (", openCards.length, ")"), openCards.map(o => {
    const cl = clients.find(c => c.id === o.clientId);
    const startMs = new Date(o.startDate).getTime();
    const elapsed = isNaN(startMs) ? "—" : fmtElapsed(Date.now() - startMs);
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        background: "#fff",
        borderInlineStart: "4px solid #0ea5c6",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        boxShadow: C.shadowCard
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: { display: "flex", alignItems: "center", gap: 8 }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ev-live-dot",
      style: { width: 10, height: 10, borderRadius: "50%", background: "#0ea5c6", display: "inline-block" }
    }), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 16, fontWeight: 800, color: C.ink }
    }, (cl && cl.name) || "בלי לקוח"), /*#__PURE__*/React.createElement("div", {
      style: { ...S.num, fontSize: 13, color: C.meta, marginRight: "auto", display: "flex", alignItems: "center", gap: 4 }
    }, /*#__PURE__*/React.createElement(Icon, { n: "clock", s: 14 }), elapsed)), o.liveKwh != null && /*#__PURE__*/React.createElement("div", {
      style: { ...S.num, fontSize: 13, color: C.body, marginTop: 6, fontWeight: 700 }
    }, Number(o.liveKwh).toFixed(2), ' קוט״ש'), /*#__PURE__*/React.createElement("button", {
      onClick: () => onComplete(o.id, o.clientId),
      style: { ...S.btnP, marginTop: 10 },
      "data-testid": `open-complete-${o.id}`
    }, "השלם טעינה"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onDelOpen(o.id),
      style: {
        background: "none", border: "none", color: "#94a3b8",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        padding: "8px 2px", marginTop: 2, minHeight: 44
      },
      "data-testid": `open-delete-${o.id}`
    }, "מחק"));
  }));
}

// ── hero "החודש הזה" ──
function MonthHero({ moKwh, moRev, weekKwh, maxWeekKwh }) {
  const labels = ["לפני 3", "לפני 2", "שבוע שעבר", "השבוע"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg,#0e7490,#0ea5c6)",
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      boxShadow: C.shadowPop,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, color: "rgba(255,255,255,.88)", fontWeight: 700, marginBottom: 8, textShadow: "0 1px 2px rgba(0,0,0,.25)" }
  }, "החודש הזה"), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 22, marginBottom: 14 }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: { ...S.num, fontSize: 22, fontWeight: 800 }
  }, Number(moKwh).toFixed(1)), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, color: "rgba(255,255,255,.88)", textShadow: "0 1px 2px rgba(0,0,0,.25)" }
  }, 'קוט״ש')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: { ...S.num, fontSize: 22, fontWeight: 800 }
  }, ils(moRev)), /*#__PURE__*/React.createElement("div", {
    style: { fontSize: 12, color: "rgba(255,255,255,.88)", textShadow: "0 1px 2px rgba(0,0,0,.25)" }
  }, "הכנסות"))), /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", alignItems: "flex-end", height: 56, gap: 6 }
  }, weekKwh.map((w, i) => {
    const h = Math.max(4, Math.round(w / maxWeekKwh * 40));
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "70%",
        margin: "0 auto",
        height: h,
        borderRadius: 6,
        background: i === 3 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 11, color: "rgba(255,255,255,.88)", marginTop: 4, textShadow: "0 1px 2px rgba(0,0,0,.25)" }
    }, labels[i]));
  })));
}

// ── שורת תובנות ──
function InsightsStrip({ debtCount, uncatCount, openCount, recordKwh, go }) {
  const chips = [];
  if (recordKwh > 0) chips.push({ icon: "zap", text: `שיא חודשי: ${Math.round(recordKwh)} קוט״ש`, onClick: null });
  if (debtCount > 0) chips.push({ icon: "alert", text: `${debtCount} לקוחות עם חוב`, onClick: () => go("debts") });
  if (uncatCount > 0) chips.push({ icon: "alert", text: `${uncatCount} טעינות לא מקוטלגות`, onClick: () => go("uncatalogued") });
  if (openCount > 0) chips.push({ icon: "clock", text: `${openCount} טעינות פתוחות`, onClick: null });
  if (!chips.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: { display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }
  }, chips.map((ch, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: ch.onClick || undefined,
    style: {
      ...S.num,
      background: C.primarySoft,
      color: C.primaryInk,
      border: "none",
      borderRadius: 999,
      padding: "8px 12px",
      fontSize: 12,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap",
      cursor: ch.onClick ? "pointer" : "default",
      fontFamily: "inherit",
      minHeight: 44
    }
  }, /*#__PURE__*/React.createElement(Icon, { n: ch.icon, s: 15 }), ch.text)));
}

function SumCard({
  lbl,
  val,
  color,
  icon
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.sumCard,
      borderTop: `3px solid ${color}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: { ...S.sumIcon, color: color, display: "inline-flex" }
  }, /*#__PURE__*/React.createElement(Icon, { n: icon, s: 20 })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.sumVal,
      color
    }
  }, val), /*#__PURE__*/React.createElement("div", {
    style: S.sumLbl
  }, lbl)));
}

