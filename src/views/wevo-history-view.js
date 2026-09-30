/**
 * src/views/wevo-history-view.js — מסך היסטוריית Wevo.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── WevoHistoryView: שיבוט ויזואלי מדויק של מסך היסטוריית Wevo ───────────────
const WEVO = {
  blue: "#4EC4E8",
  blueDeep: "#3DB8E0",
  blueSoft: "#E8F7FC",
  orange: "#F5A623",
  orangeSoft: "#FFF3E0",
  text: "#1A1A1A",
  muted: "#8E8E93",
  line: "#E8E8EA",
  cardBg: "#FFFFFF",
  bg: "#FFFFFF"
};
const DAY_HE = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'", "יום ו'", "שבת"];
const MONTH_SHORT = ["ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יונ'", "יול'", "אוג'", "ספט'", "אוק'", "נוב'", "דצמ'"];

function ownerPremRatio(s) {
  // Wevo "פרימיום" = חלק האנרגיה בשיא בעלים 17:00–23:00 (לא בסופ״ש)
  const start = new Date(s.date);
  if (isNaN(start)) return 0;
  const durMin = Number(s.durMin) > 0 ? Number(s.durMin) : 60;
  const end = new Date(start.getTime() + durMin * 60000);
  const day = start.getDay();
  if (day === 5 || day === 6) return 0;
  const sh = start.getHours() + start.getMinutes() / 60;
  const eh = end.getHours() + end.getMinutes() / 60;
  const totalOwnerMin = Math.max((end - start) / 60000, 1);
  let peakOwnerMin = 0;
  if (sh < eh) {
    peakOwnerMin = Math.max(0, Math.min(eh, OWNER_PE) - Math.max(sh, OWNER_PS)) * 60;
  } else {
    const b = Math.max(0, OWNER_PE - Math.max(sh, OWNER_PS)) * 60;
    const a = Math.max(0, Math.min(eh, OWNER_PE) - OWNER_PS) * 60;
    peakOwnerMin = b + a;
  }
  return Math.max(0, Math.min(1, peakOwnerMin / totalOwnerMin));
}

function fmtWevoTime(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  let h = dt.getHours();
  const m = dt.getMinutes();
  const ap = h < 12 ? 'לפנה"צ' : 'אחה"צ';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

function fmtWevoDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((startToday - startThat) / 86400000);
  const t = fmtWevoTime(dt);
  if (diffDays === 0) return `היום ${t}`;
  if (diffDays === 1) return `אתמול ${t}`;
  return `${DAY_HE[dt.getDay()]} ${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]}, ${t}`;
}

function fmtDuration(s) {
  const notes = s.notes || "";
  const m1 = notes.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (m1) return `${m1[1]}h ${m1[2]}m`;
  const m2 = notes.match(/(\d+)\s*:\s*(\d+)\s*h/i);
  if (m2) return `${m2[1]}h ${m2[2]}m`;
  if (s.durMin > 0) {
    const mins = Math.round(Number(s.durMin));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  return "";
}

function sessionTypeLabel(ratio) {
  if (ratio >= 0.85) return "טעינה פרימיום";
  if (ratio <= 0.15) return "טעינה רגילה";
  return "טעינה משולבת";
}

function WevoBoltIcon({
  color = "#fff",
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: color,
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 2L4.5 13.5H11L10 22l9.5-13H13L13 2z"
  }));
}

function WevoSessionMark({
  premium
}) {
  const c = premium ? WEVO.orange : WEVO.blue;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 3,
      flexShrink: 0,
      width: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: c,
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: c,
      display: "block"
    }
  })), /*#__PURE__*/React.createElement(WevoBoltIcon, {
    size: 18,
    color: c
  }));
}

function WevoCalIcon() {
  return /*#__PURE__*/React.createElement("svg", {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: WEVO.blueDeep,
    strokeWidth: 1.8,
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: 3,
    y: 5,
    width: 18,
    height: 16,
    rx: 3
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18M8 3v4M16 3v4"
  }));
}

function WevoLogoMark() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "left",
      direction: "ltr",
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Outfit', 'Heebo', sans-serif",
      fontWeight: 800,
      fontSize: 28,
      color: WEVO.blue,
      letterSpacing: "-0.045em"
    }
  }, "wevo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Heebo', sans-serif",
      fontSize: 11,
      fontWeight: 400,
      color: "#222",
      marginTop: 1,
      letterSpacing: "0.01em"
    }
  }, "by SolarEdge"));
}

function WevoPill({
  label,
  value,
  tone
}) {
  const soft = tone === "orange" ? WEVO.orangeSoft : WEVO.blueSoft;
  const color = tone === "orange" ? WEVO.orange : WEVO.blueDeep;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: soft,
      color,
      borderRadius: 999,
      padding: "8px 14px",
      fontSize: 14,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: color,
      display: "inline-block",
      flexShrink: 0
    }
  }), `${label} (${value})`);
}

function WevoHistoryView({
  sessions,
  clients = [],
  onBack,
  mode = "owner" // "owner" = עלות Wevo | "billing" = סכומים שנגבים מהלקוחות
}) {
  const h = React.createElement;
  const isBilling = mode === "billing";
  const now = new Date();
  const [selMo, setSelMo] = useState(now.getMonth());
  const [selYr, setSelYr] = useState(now.getFullYear());
  const [showRates, setShowRates] = useState(false);
  const cfg = getConfig();

  const historySessions = useMemo(() => {
    const all = (sessions || []).filter(Boolean);
    const wevoRows = all.filter(s => s.source === "wevo-sync");
    if (isBilling) return all.filter(s => s.source !== "wevo-sync");
    const wevoTxns = new Set(wevoRows.map(s => chargeTxnId(s)).filter(Boolean));
    const fallback = all.filter(s => {
      if (s.source === "wevo-sync") return false;
      const tid = chargeTxnId(s);
      if (tid && wevoTxns.has(tid)) return false;
      return Number(s.kwhRaw) > 0 || Number(s.costToOwner) > 0;
    });
    return [...wevoRows, ...fallback];
  }, [sessions, isBilling]);
  const enriched = useMemo(() => {
    const wevoByTxn = new Map();
    (sessions || []).forEach(row => {
      if (!row || row.source !== "wevo-sync") return;
      const tid = chargeTxnId(row);
      if (!tid) return;
      const amt = row.costToOwner != null ? Number(row.costToOwner) : Number(row.amountBilled);
      if (Number.isFinite(amt)) wevoByTxn.set(tid, amt);
    });
    return historySessions.map(s => {
      const ratio = isBilling
        ? Math.max(0, Math.min(1, Number(s.premiumRatio) || 0))
        : ownerPremRatio(s);
      const kwh = isBilling
        ? Number(s.kwhInflated) || Math.round((Number(s.kwhRaw) || 0) * getInflation()) || 0
        : Number(s.kwhRaw) || 0;
      let cost = Number(s.costToOwner) || 0;
      if (isBilling) {
        const cl = (clients || []).find(c => c.id === s.clientId);
        const ownCar = isSelfClient(cl) || s.selfPaid === true;
        if (ownCar) {
          const tid = chargeTxnId(s);
          const official = tid && wevoByTxn.has(tid) ? wevoByTxn.get(tid) : Number(s.costToOwner);
          cost = fictionalBilledDisplay(s.amountBilled, official);
        } else {
          cost = Number(s.amountBilled) || 0;
        }
      }
      return {
        ...s,
        ratio,
        kwh,
        premKwh: kwh * ratio,
        regKwh: kwh * (1 - ratio),
        cost
      };
    });
  }, [historySessions, isBilling, sessions, clients]);

  const allTime = useMemo(() => {
    const totalKwh = enriched.reduce((a, s) => a + s.kwh, 0);
    const totalCost = enriched.reduce((a, s) => a + s.cost, 0);
    const regKwh = enriched.reduce((a, s) => a + s.regKwh, 0);
    const premKwh = enriched.reduce((a, s) => a + s.premKwh, 0);
    const dates = enriched.map(s => new Date(s.date)).filter(d => !isNaN(d)).sort((a, b) => a - b);
    return {
      totalKwh,
      totalCost,
      regKwh,
      premKwh,
      from: dates[0] || null,
      to: dates[dates.length - 1] || null
    };
  }, [enriched]);

  const monthKeys = useMemo(() => {
    const ks = new Set(enriched.map(s => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }));
    if (!ks.size) ks.add(`${now.getFullYear()}-${now.getMonth()}`);
    return [...ks].map(k => {
      const [y, m] = k.split("-").map(Number);
      return {
        y,
        m
      };
    }).sort((a, b) => b.y !== a.y ? b.y - a.y : b.m - a.m);
  }, [enriched]);

  const shiftMonth = dir => {
    const idx = monthKeys.findIndex(k => k.y === selYr && k.m === selMo);
    const next = monthKeys[idx < 0 ? 0 : idx - dir];
    if (next) {
      setSelYr(next.y);
      setSelMo(next.m);
    }
  };

  const monthSessions = useMemo(() => enriched.filter(s => {
    const d = new Date(s.date);
    return d.getFullYear() === selYr && d.getMonth() === selMo;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)), [enriched, selYr, selMo]);

  const monthStats = useMemo(() => {
    const totalKwh = monthSessions.reduce((a, s) => a + s.kwh, 0);
    const totalCost = monthSessions.reduce((a, s) => a + s.cost, 0);
    const avg = monthSessions.length ? totalKwh / monthSessions.length : 0;
    return {
      totalKwh,
      totalCost,
      avg,
      count: monthSessions.length
    };
  }, [monthSessions]);

  const dayBars = useMemo(() => {
    const daysInMonth = new Date(selYr, selMo + 1, 0).getDate();
    const days = Array.from({
      length: daysInMonth
    }, (_, i) => ({
      day: i + 1,
      reg: 0,
      prem: 0
    }));
    monthSessions.forEach(s => {
      const d = new Date(s.date).getDate();
      if (days[d - 1]) {
        days[d - 1].reg += s.regKwh;
        days[d - 1].prem += s.premKwh;
      }
    });
    const max = Math.max(...days.map(d => d.reg + d.prem), 1);
    return {
      days,
      max
    };
  }, [monthSessions, selYr, selMo]);

  const rangeLabel = (() => {
    if (!allTime.from || !allTime.to) return "";
    const a = allTime.from,
      b = allTime.to;
    return `${a.getDate()} ${MONTHS[a.getMonth()]}, ${a.getFullYear()} – ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}, ${b.getFullYear()}`;
  })();

  const premPct = allTime.totalKwh > 0 ? allTime.premKwh / allTime.totalKwh * 100 : 0;
  const chartH = 148;
  const yTicks = (() => {
    const m = dayBars.max;
    if (m <= 50) return [0, 25, 50];
    if (m <= 100) return [0, 50, 100];
    if (m <= 200) return [0, 100, 200];
    const top = Math.ceil(m / 100) * 100;
    return [0, top / 2, top];
  })();
  const yMax = yTicks[yTicks.length - 1] || dayBars.max;
  const xLabels = [1, 5, 9, 13, 17, 21, 25, 29].filter(d => d <= dayBars.days.length);

  const circleBtn = (label, onClick) => h("button", {
    onClick,
    "aria-label": label,
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      border: `1.5px solid #D8D8DC`,
      background: "#fff",
      color: "#A0A0A5",
      fontSize: 22,
      cursor: "pointer",
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0
    }
  }, label);

  const navIcon = (type, active) => {
    const c = active ? WEVO.blueDeep : "#A8A8AD";
    if (type === "home") return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.7
    }, h("path", {
      d: "M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
    }));
    if (type === "map") return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.7
    }, h("path", {
      d: "M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2-6-2z"
    }), h("path", {
      d: "M9 4v14M15 6v14"
    }));
    if (type === "hist") return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.8
    }, h("path", {
      d: "M12 7v5l3 2"
    }), h("path", {
      d: "M4.5 12a7.5 7.5 0 1 0 2.1-5.2"
    }), h("path", {
      d: "M4 7.5V12h4.5"
    }));
    return h("svg", {
      width: 22,
      height: 22,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: c,
      strokeWidth: 1.7
    }, h("circle", {
      cx: 12,
      cy: 8,
      r: 3.2
    }), h("path", {
      d: "M5.5 19c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8"
    }));
  };
  const navItem = (label, type, active, onClick) => h("button", {
    type: "button",
    onClick: typeof onClick === "function" ? e => {
      e.preventDefault();
      onClick();
    } : undefined,
    style: {
      flex: 1,
      border: "none",
      background: "none",
      padding: "10px 2px 8px",
      color: active ? WEVO.blueDeep : "#A8A8AD",
      cursor: typeof onClick === "function" ? "pointer" : "default",
      fontFamily: "'Heebo', sans-serif"
    }
  }, h("div", {
    style: {
      marginBottom: 3,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, navIcon(type, active)), h("div", {
    style: {
      fontSize: 11,
      fontWeight: active ? 700 : 500
    }
  }, label));

  const rateRows = (() => {
    if (isBilling) {
      const off = Number(cfg.rateRegular) || 1.47;
      const peak = Number(cfg.ratePremium) || 2.98;
      return [["עכשיו - 16:00", off], ["16:00 - 23:00", peak], ["23:00 - 16:00 (+1)", off]];
    }
    const off = Number(cfg.ownerOff) || 0.87;
    const peak = Number(cfg.ownerPeak) || 2.08;
    return [["עכשיו - 17:00", off], ["17:00 - 23:00", peak], ["23:00 - 17:00 (+1)", off]];
  })();
  const pageTitle = isBilling ? "היסטוריית חיוב" : "היסטוריית טעינה";
  const totalLabel = isBilling ? "Total billed · all time" : "Total charged · all time";
  const ratesTitle = isBilling ? "תעריפי גביה" : "תעריף משתנה";
  const ratesSub = isBilling ? "תעריפים שנגבים מהלקוחות:" : "תעריפים ל-24 השעות הקרובות:";

  return h("div", {
    style: {
      background: WEVO.bg,
      minHeight: "100vh",
      maxWidth: 430,
      margin: "0 auto",
      fontFamily: "'Heebo', -apple-system, BlinkMacSystemFont, sans-serif",
      color: WEVO.text,
      paddingBottom: 92,
      direction: "rtl",
      position: "relative"
    }
  },
  // Back bar (explicit — bottom Wevo nav also returns to dash)
  h("div", {
    style: {
      padding: "10px 16px 0",
      direction: "rtl"
    }
  }, h("button", {
    type: "button",
    onClick: typeof onBack === "function" ? onBack : undefined,
    style: {
      border: `1px solid ${WEVO.line}`,
      background: WEVO.blueSoft,
      color: WEVO.blueDeep,
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "'Heebo', sans-serif"
    }
  }, "← חזרה")),

  // Header: logo left, title right (LTR row)
  h("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "10px 20px 6px",
      direction: "ltr"
    }
  }, h(WevoLogoMark, null), h("div", {
    style: {
      fontWeight: 800,
      fontSize: 22,
      color: WEVO.text,
      direction: "rtl",
      textAlign: "right",
      paddingTop: 4,
      letterSpacing: "-0.01em"
    }
  }, pageTitle)),

  // Pills — under title (right side in RTL = flex-start)
  h("div", {
    style: {
      display: "flex",
      gap: 8,
      padding: "8px 20px 16px",
      justifyContent: "flex-start",
      flexWrap: "wrap"
    }
  }, h(WevoPill, {
    label: "רגילה",
    value: Math.round(allTime.regKwh),
    tone: "blue"
  }), h(WevoPill, {
    label: "פרימיום",
    value: Math.round(allTime.premKwh),
    tone: "orange"
  })),

  // All-time summary card
  h("div", {
    style: {
      margin: "0 16px 18px",
      background: WEVO.cardBg,
      border: `1px solid ${WEVO.line}`,
      borderRadius: 16,
      padding: "14px 16px 0",
      overflow: "hidden"
    }
  }, h("div", {
    style: {
      fontSize: 12.5,
      color: WEVO.muted,
      marginBottom: 12,
      textAlign: "right",
      lineHeight: 1.35
    }
  }, totalLabel, rangeLabel ? ` (${rangeLabel})` : ""), h("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 10
    }
  },
  // RTL: first = right → bolt, then kWh (bolt at far right like Wevo)
  h("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, h("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 11,
      background: WEVO.blue,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, h(WevoBoltIcon, {
    size: 20,
    color: "#fff"
  })), h("div", {
    style: {
      fontSize: 34,
      fontWeight: 800,
      color: WEVO.text,
      letterSpacing: "-0.03em",
      lineHeight: 1,
      direction: "rtl",
      whiteSpace: "nowrap"
    }
  }, Math.round(allTime.totalKwh), " ", h("span", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, 'קוט״ש'))), h("div", {
    style: {
      textAlign: "left",
      direction: "ltr",
      paddingTop: 10,
      fontSize: 20,
      fontWeight: 700,
      color: "#6B6B70"
    }
  }, "₪", allTime.totalCost.toFixed(2))),
  // Progress: orange (premium) on the LEFT visually
  h("div", {
    style: {
      height: 4,
      background: WEVO.blue,
      display: "flex",
      direction: "ltr",
      margin: "4px -16px 0"
    }
  }, h("div", {
    style: {
      width: Math.max(premPct, premPct > 0 ? 1.5 : 0) + "%",
      background: WEVO.orange,
      height: "100%"
    }
  }))),

  // Month nav
  h("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginBottom: 14,
      direction: "ltr"
    }
  }, circleBtn("‹", () => shiftMonth(1)), h("button", {
    onClick: () => setShowRates(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "#fff",
      border: `1.5px solid ${WEVO.line}`,
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 700,
      fontSize: 15,
      color: WEVO.text,
      minWidth: 168,
      justifyContent: "center",
      direction: "rtl",
      cursor: "default",
      fontFamily: "'Heebo', sans-serif"
    }
  }, h(WevoCalIcon, null), h("span", null, MONTHS[selMo], " ", selYr), h("span", {
    style: {
      color: "#B0B0B5",
      fontSize: 12,
      marginRight: 2
    }
  }, "▾")), circleBtn("›", () => shiftMonth(-1))),

  // Month stats + chart card
  h("div", {
    style: {
      margin: "0 16px 8px",
      background: "#fff",
      border: `1px solid ${WEVO.line}`,
      borderRadius: 16,
      padding: "14px 12px 12px"
    }
  }, h("div", {
    style: {
      textAlign: "center",
      fontSize: 13,
      color: "#6B6B70",
      marginBottom: 14,
      display: "flex",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap"
    }
  }, h("span", null, "סה״כ ", h("b", {
    style: {
      color: WEVO.text,
      fontWeight: 800
    }
  }, monthStats.totalKwh.toFixed(1), " קוט״ש")), h("span", null, "ממוצע ", h("b", {
    style: {
      color: WEVO.text,
      fontWeight: 800
    }
  }, monthStats.avg.toFixed(1), " קוט״ש")), h("span", null, isBilling ? "חיוב " : "עלות ", h("b", {
    style: {
      color: WEVO.text,
      fontWeight: 800
    }
  }, "₪", monthStats.totalCost.toFixed(2)))), h("div", {
    style: {
      display: "flex",
      gap: 4,
      height: chartH,
      direction: "ltr",
      alignItems: "stretch"
    }
  }, h("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      fontSize: 11,
      color: "#B0B0B5",
      width: 28,
      textAlign: "right",
      paddingBottom: 2
    }
  }, [...yTicks].reverse().map(t => h("span", {
    key: t
  }, t))), h("div", {
    style: {
      flex: 1,
      position: "relative",
      height: chartH,
      borderBottom: `1px solid ${WEVO.line}`
    }
  },
  // grid lines
  yTicks.slice(1).map(t => h("div", {
    key: "g" + t,
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: t / yMax * (chartH - 1),
      borderTop: "1px solid #F0F0F2",
      pointerEvents: "none"
    }
  })), h("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "flex-end",
      gap: 2,
      paddingLeft: 2
    }
  }, dayBars.days.map(d => {
    const total = d.reg + d.prem;
    const hPx = total / yMax * (chartH - 4);
    const premH = total > 0 ? d.prem / total * hPx : 0;
    const regH = Math.max(0, hPx - premH);
    return h("div", {
      key: d.day,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        height: "100%",
        minWidth: 0
      }
    }, h("div", {
      style: {
        height: premH,
        background: WEVO.orange,
        borderRadius: "2px 2px 0 0"
      }
    }), h("div", {
      style: {
        height: regH,
        background: WEVO.blue,
        borderRadius: premH > 0 ? 0 : "2px 2px 0 0"
      }
    }));
  })))), h("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginLeft: 32,
      marginTop: 6,
      fontSize: 11,
      color: "#B0B0B5",
      direction: "ltr",
      paddingRight: 2
    }
  }, xLabels.map(d => h("span", {
    key: d
  }, d)))),

  // Sessions header
  h("div", {
    style: {
      padding: "16px 20px 4px"
    }
  }, h("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 6
    }
  }, h("div", {
    style: {
      fontWeight: 800,
      fontSize: 17,
      color: WEVO.text
    }
  }, "Sessions · ", MONTHS[selMo], " ", selYr), h("div", {
    style: {
      background: "#F0F0F2",
      borderRadius: 10,
      minWidth: 28,
      textAlign: "center",
      padding: "2px 9px",
      fontWeight: 700,
      fontSize: 13,
      color: "#6B6B70"
    }
  }, monthStats.count)), h("button", {
    onClick: () => setShowRates(true),
    style: {
      border: "none",
      background: "none",
      padding: 0,
      color: WEVO.blueDeep,
      fontWeight: 600,
      fontSize: 13,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      fontFamily: "'Heebo', sans-serif",
      marginBottom: 4
    }
  }, h("span", {
    style: {
      fontSize: 15
    }
  }, h(Icon, {
    n: "chart",
    s: 15
  })), "הצג היסטוריית תשלומים", h("span", {
    style: {
      fontSize: 14
    }
  }, "‹"))),

  // Session rows
  monthSessions.length === 0 ? h("div", {
    style: {
      textAlign: "center",
      color: WEVO.muted,
      padding: 40,
      fontSize: 14
    }
  }, "אין טעינות בחודש זה") : monthSessions.map(s => {
    const isPrem = s.ratio >= 0.5;
    const dur = fmtDuration(s);
    return h("div", {
      key: s.id,
      style: {
        display: "flex",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: `1px solid ${WEVO.line}`,
        gap: 10
      }
    },
    // RTL first = right: session mark
    h(WevoSessionMark, {
      premium: isPrem
    }), h("div", {
      style: {
        flex: 1,
        textAlign: "right",
        minWidth: 0
      }
    }, h("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: WEVO.text
      }
    }, fmtWevoDate(s.date)), h("div", {
      style: {
        fontSize: 12.5,
        color: WEVO.muted,
        marginTop: 3
      }
    }, "בית | ", sessionTypeLabel(s.ratio))), h("div", {
      style: {
        textAlign: "left",
        flexShrink: 0
      }
    }, h("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: WEVO.blueDeep,
        direction: "ltr",
        textAlign: "left"
      }
    }, "₪", s.cost.toFixed(2)), h("div", {
      style: {
        fontSize: 12,
        color: "#6B6B70",
        marginTop: 3,
        whiteSpace: "nowrap",
        direction: "rtl",
        textAlign: "left"
      }
    }, s.kwh.toFixed(2), ' קוט״ש', dur ? `  ${dur}` : "")));
  }),

  // Bottom nav — RTL: first item = rightmost = המטען שלי
  h("div", {
    style: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      background: "#fff",
      borderTop: `1px solid ${WEVO.line}`,
      display: "flex",
      direction: "rtl",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      zIndex: 50,
      boxShadow: "0 -1px 0 rgba(0,0,0,0.02)"
    }
  }, navItem("המטען שלי", "home", false, onBack), navItem("מפה", "map", false, onBack), navItem("היסטוריה", "hist", true, null), navItem("הגדרות", "user", false, onBack)),

  // Rates bottom sheet (matches Wevo "תעריף משתנה")
  showRates && h("div", {
    onClick: () => setShowRates(false),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      zIndex: 80,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    }
  }, h("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: 430,
      background: "#fff",
      borderRadius: "20px 20px 0 0",
      padding: "10px 20px 28px",
      direction: "rtl"
    }
  }, h("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 4,
      background: "#D8D8DC",
      margin: "4px auto 16px"
    }
  }), h("div", {
    style: {
      textAlign: "center",
      fontWeight: 800,
      fontSize: 22,
      marginBottom: 6
    }
  }, ratesTitle), h("div", {
    style: {
      textAlign: "center",
      color: WEVO.muted,
      fontSize: 14,
      marginBottom: 16
    }
  }, ratesSub), h("div", {
    style: {
      border: `1px solid ${WEVO.line}`,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 14
    }
  }, rateRows.map(([lbl, rate], i) => h("div", {
    key: lbl,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "14px 16px",
      borderTop: i ? `1px solid ${WEVO.line}` : "none",
      fontWeight: 700,
      fontSize: 15
    }
  }, h("span", null, lbl), h("span", {
    style: {
      direction: "ltr"
    }
  }, "₪", Number(rate).toFixed(2), '/קוט״ש')))), h("div", {
    style: {
      textAlign: "right",
      color: WEVO.muted,
      fontSize: 13
    }
  }, "פרטי עלות:"), h("button", {
    onClick: () => setShowRates(false),
    style: {
      marginTop: 16,
      width: "100%",
      border: "none",
      background: WEVO.blueSoft,
      color: WEVO.blueDeep,
      borderRadius: 12,
      padding: "12px",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      fontFamily: "'Heebo', sans-serif"
    }
  }, "סגור"))));
}

