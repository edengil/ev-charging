/**
 * src/views/dashboard.js — דשבורד.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({
  stats,
  go,
  openSess = [],
  clients = [],
  sessions = [],
  onDelOpen,
  onUpsertOpen,
  onComplete,
  onToggleArchive
}) {
  const [sortBy, setSortBy] = useState("debt");
  const [liveStation, setLiveStation] = useState(() => readLiveStation());
  useEffect(() => {
    const sync = () => setLiveStation(readLiveStation());
    window.addEventListener("ev-live-station", sync);
    return () => window.removeEventListener("ev-live-station", sync);
  }, []);
  useEffect(() => {
    const sync = ev => {
      setPreAuthIntent(ev && ev.detail !== undefined ? ev.detail : getWevoAuthIntent());
    };
    window.addEventListener(WEVO_AUTH_INTENT_EVENT, sync);
    return () => window.removeEventListener(WEVO_AUTH_INTENT_EVENT, sync);
  }, []);
  useEffect(() => {
    const liveNow = findChargeStillOnStation(openSess, readLiveStation(), sessions);
    const ready = (openSess || []).filter(o => o.readyToComplete && !o._alertedUnclosed && (!liveNow || o.id !== liveNow.id));
    if (!ready.length) return;
    const first = ready[0];
    const cl = clients.find(c => c.id === first.clientId);
    const name = cl && cl.name || "לקוח";
    appAlert(`טעינה של ${name} ממתינה לאישור — לוחצים ״השלם טעינה״ בכרטיס למעלה. לא חוסם טעינה חדשה.`, "info", 6500);
  }, []);
  // רק חובות חיוביים — יתרות זכות לא מקזזות את סיכום החובות הפתוחים
  const totBal = stats.reduce((a, c) => a + (c.isSelf ? 0 : Math.max(0, c.balance)), 0);
  const totCredit = stats.reduce((a, c) => a + (c.isSelf || !hasCredit(c.balance) ? 0 : Math.abs(c.balance)), 0);
  const totMoP = stats.reduce((a, c) => a + (c.isSelf ? 0 : c.monthP), 0);
  const totAllP = stats.reduce((a, c) => a + (c.isSelf ? 0 : c.totalP), 0);
  const archivedCount = stats.filter(c => !c.isSelf && c.hidden).length;
  const now = new Date();
  const paceDay = now.getDate();
  const profitMTD = profitMonthToDay(sessions, clients, now.getFullYear(), now.getMonth(), paceDay);
  const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const profitPrevMTD = profitMonthToDay(sessions, clients, prevM.getFullYear(), prevM.getMonth(), paceDay);
  const paceDelta = (() => {
    if (profitPrevMTD === 0) return profitMTD === 0 ? null : 100;
    return Math.round((profitMTD - profitPrevMTD) / Math.abs(profitPrevMTD) * 100);
  })();
  // ── hero "החודש הזה": קוט״ש + הכנסות החודש, ו־4 שבועות אחרונים ──
  const selfIdsHero = selfClientIds(clients);
  const moSess = sessions.filter(s => {
    const d = new Date(s.date);
    return isNeighborSession(s, selfIdsHero) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const moKwh = moSess.reduce((a, s) => a + (Number(s.kwhInflated) || 0), 0);
  const moRev = moSess.reduce((a, s) => a + (Number(s.amountBilled) || 0), 0);
  const weekKwh = [3, 2, 1, 0].map(w => {
    const end = new Date(now);
    end.setDate(now.getDate() - w * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return sessions.reduce((a, s) => {
      if (!isNeighborSession(s, selfIdsHero)) return a;
      const d = new Date(s.date);
      return d >= start && d <= end ? a + (Number(s.kwhInflated) || 0) : a;
    }, 0);
  });
  const maxWeekKwh = Math.max(1, ...weekKwh);
  // ── שיא חודשי: האם החודש הנוכחי הוא שיא הקוט״ש בכל הזמנים ──
  const kwhByMonth = {};
  sessions.forEach(s => {
    if (!isNeighborSession(s, selfIdsHero)) return;
    const d = new Date(s.date);
    const k = d.getFullYear() + "-" + d.getMonth();
    kwhByMonth[k] = (kwhByMonth[k] || 0) + (Number(s.kwhInflated) || 0);
  });
  const curMonthKey = now.getFullYear() + "-" + now.getMonth();
  const isRecordKwh = moKwh > 0 && Object.keys(kwhByMonth).every(k => k === curMonthKey || kwhByMonth[k] <= moKwh);
  // ── insights strip ──
  const debtCount = stats.filter(c => !c.isSelf && !c.hidden && hasDebt(c.balance)).length;
  const uncatCount = (() => {
    try {
      return Number(localStorage.getItem("ev_uncat_count")) || 0;
    } catch (e) {
      return 0;
    }
  })();
  const sorted = useMemo(() => {
    const arr = stats.filter(c => !c.hidden);
    if (sortBy === "debt") arr.sort((a, b) => b.balance - a.balance);
    if (sortBy === "profit") arr.sort((a, b) => b.monthP - a.monthP);
    if (sortBy === "total") arr.sort((a, b) => b.totalP - a.totalP);
    if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "he"));
    if (sortBy === "last") arr.sort((a, b) => (b.last ? new Date(b.last.date) : 0) - (a.last ? new Date(a.last.date) : 0));
    return arr;
  }, [stats, sortBy]);
  // מוסתרת מהרשימה רק כשהפאנל החי באמת מציג רכב — אחרת הטעינה נעלמת משני המקומות
  const liveOpen = chargerReportsVehicle(liveStation, sessions) ? findChargeStillOnStation(openSess, liveStation, sessions) : null;
  const openCards = dropOpensAlreadySaved(openSess, sessions).filter(o => !liveOpen || o.id !== liveOpen.id);
  const readyCards = (openSess || []).filter(o => o.readyToComplete && !sessions.some(s => s.id === o.id));
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement(WevoLivePanel, {
    clients: clients,
    sessions: sessions,
    openSess: openSess,
    onUpsertOpen: onUpsertOpen,
    go: go
  }), /*#__PURE__*/React.createElement(ReadyToCompleteBanner, {
    readyCards: readyCards,
    clients: clients,
    onComplete: onComplete
  }), /*#__PURE__*/React.createElement(ActiveChargeCards, {
    openCards: openCards,
    clients: clients,
    onComplete: onComplete,
    onDelOpen: onDelOpen
  }), /*#__PURE__*/React.createElement(MonthHero, {
    moKwh: moKwh,
    moRev: moRev,
    weekKwh: weekKwh,
    maxWeekKwh: maxWeekKwh
  }), /*#__PURE__*/React.createElement(InsightsStrip, {
    debtCount: debtCount,
    uncatCount: uncatCount,
    openCount: openCards.length,
    recordKwh: isRecordKwh ? moKwh : 0,
    go: go
  }), /*#__PURE__*/React.createElement("div", {
    style: S.sumRow
  }, /*#__PURE__*/React.createElement(SumCard, {
    lbl: "חובות פתוחים",
    val: ils(totBal),
    color: C.warn,
    icon: "card"
  }), totCredit > 0.01 && /*#__PURE__*/React.createElement(SumCard, {
    lbl: "יתרות זכות",
    val: ils(totCredit),
    color: C.ok,
    icon: "check"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח החודש",
    val: ilsFull(totMoP),
    color: C.ok,
    icon: "chart"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח כולל",
    val: ilsFull(totAllP),
    color: C.primaryStrong,
    icon: "zap"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: paceDelta == null ? "#f8fafc" : paceDelta >= 0 ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${paceDelta == null ? "#e2e8f0" : paceDelta >= 0 ? "#bbf7d0" : "#fecaca"}`,
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      lineHeight: 1.45,
      color: "#334155"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      marginBottom: 4,
      color: paceDelta == null ? "#475569" : paceDelta >= 0 ? "#065f46" : "#991b1b"
    }
  }, "קצב רווח עד היום (לקוחות)"), /*#__PURE__*/React.createElement("div", null, ilsFull(profitMTD), " עד יום ", paceDay, " · חודש שעבר עד אותו יום: ", ilsFull(profitPrevMTD), paceDelta != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      marginRight: 6,
      color: paceDelta >= 0 ? "#059669" : "#dc2626"
    }
  }, paceDelta >= 0 ? "▲" : "▼", Math.abs(paceDelta), "%") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94a3b8",
      marginTop: 4
    }
  }, paceDelta == null ? "אין מספיק נתונים להשוואה" : paceDelta >= 0 ? "בקצב טוב לעומת התקופה המקבילה בחודש שעבר" : "מאחורי החודש שעבר — שווה להציע ליותר אנשים להטעין")), /*#__PURE__*/React.createElement(WevoMiniLog, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("import"),
    "data-testid": "nav-backup"
  }, "גיבוי"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("wevo"),
    "data-testid": "nav-wevo-history"
  }, "היסטוריית Wevo"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("wevo-bill"),
    "data-testid": "nav-wevo-bill"
  }, "היסטוריית חיוב"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("wevo-sync"),
    "data-testid": "nav-wevo-sync"
  }, "סנכרון Wevo"), /*#__PURE__*/React.createElement("button", {
    style: { ...S.quietBtn, position: "relative" },
    onClick: () => go("uncatalogued"),
    "data-testid": "nav-uncatalogued"
  }, "טעינות לא מקוטלגות", uncatCount > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: -8,
      insetInlineStart: -8,
      minWidth: 22,
      height: 22,
      borderRadius: 999,
      background: C.err,
      color: "#fff",
      fontSize: 11,
      fontWeight: 800,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 6px",
      boxShadow: C.shadowPop
    }
  }, uncatCount)), /*#__PURE__*/React.createElement(NotifyEnableButton, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      ...S.secTitle,
      marginBottom: 0
    }
  }, "לקוחות"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("archive"),
    style: {
      border: "1.5px solid " + C.line,
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      background: archivedCount ? C.bg : "#fff",
      color: C.meta,
      cursor: "pointer",
      fontWeight: 600,
      minHeight: 44,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "inherit"
    },
    "data-testid": "nav-archive"
  }, /*#__PURE__*/React.createElement(Icon, { n: "archive", s: 16 }), "ארכיון", archivedCount ? ` (${archivedCount})` : ""), /*#__PURE__*/React.createElement("select", {
    style: {
      border: "1.5px solid " + C.line,
      borderRadius: 8,
      padding: "8px 10px",
      fontSize: 12,
      background: "#fff",
      color: C.meta,
      minHeight: 44,
      fontFamily: "inherit"
    },
    value: sortBy,
    onChange: e => setSortBy(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "debt"
  }, "מיון: חוב"), /*#__PURE__*/React.createElement("option", {
    value: "profit"
  }, "מיון: רווח החודש"), /*#__PURE__*/React.createElement("option", {
    value: "total"
  }, "מיון: רווח כולל"), /*#__PURE__*/React.createElement("option", {
    value: "name"
  }, "מיון: שם"), /*#__PURE__*/React.createElement("option", {
    value: "last"
  }, "מיון: טעינה אחרונה")))), /*#__PURE__*/React.createElement("div", {
    style: S.cGrid
  }, sorted.length === 0 && (archivedCount > 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "archive",
    title: "כל הלקוחות בארכיון",
    sub: "לחץ «ארכיון» למעלה כדי לצפות בהם או לשחזר.",
    actionLabel: "פתח ארכיון",
    onAction: () => go("archive")
  }) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "userPlus",
    title: "עוד לא הוספת לקוחות",
    sub: "הוסף את השכנים שמטעינים בעמדה — כל טעינה תירשם אוטומטית בכרטיס שלהם.",
    actionLabel: "הוסף לקוח ראשון",
    onAction: () => go("add-c")
  })), sorted.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "ev-stagger",
    style: { ...S.cCard, animationDelay: Math.min(i * 40, 400) + "ms" },
    onClick: () => go("client", c.id),
    "data-testid": `client-card-${c.id}`
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cTop
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 40,
    fontSize: 17
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cName,
    "data-testid": `client-name-${c.id}`
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cMeta
  }, c.count, " טעינות", formatClientCarLine(c) ? ` · ${formatClientCarLine(c)}` : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginRight: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: balanceBadgeStyle(c.balance, c.isSelf),
    "data-testid": `client-balance-${c.id}`
  }, formatBalanceText(c.balance, {
    isSelf: c.isSelf
  })))), /*#__PURE__*/React.createElement("div", {
    style: S.miniStats
  }, /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "רווח החודש"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.mVal,
      color: "#10b981"
    }
  }, ilsFull(c.monthP))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "עלות החודש 🔒"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.mVal,
      color: "#6b7280"
    }
  }, ils(c.monthCost))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "רווח כולל"), /*#__PURE__*/React.createElement("span", {
    style: S.mVal
  }, ilsFull(c.totalP))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "עלות כולל 🔒"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.mVal,
      color: "#6b7280"
    }
  }, ils(c.totalCost))), /*#__PURE__*/React.createElement("div", {
    style: S.mStat
  }, /*#__PURE__*/React.createElement("span", {
    style: S.mLbl
  }, "טעינה אחרונה"), /*#__PURE__*/React.createElement("span", {
    style: S.mVal
  }, c.last ? fdateDay(c.last.date) : "—"))))), archivedCount > 0 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("archive"),
    style: {
      width: "100%",
      marginTop: 8,
      marginBottom: 8,
      background: "#f8fafc",
      border: "1.5px dashed #cbd5e1",
      borderRadius: 10,
      padding: "10px",
      fontSize: 13,
      color: "#64748b",
      cursor: "pointer",
      fontWeight: 600,
      minHeight: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement(Icon, { n: "archive", s: 16 }), "יש ", archivedCount, " בארכיון (לא פעילים / הועברו) — לחץ לפתיחה"), /*#__PURE__*/React.createElement("footer", {
    style: {
      marginTop: 28,
      paddingTop: 20,
      paddingBottom: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      borderTop: "1px solid #e2e8f0"
    },
    "aria-label": "סימן מסחרי Eden Gil"
  }, /*#__PURE__*/React.createElement(BrandMark, {
    size: 52
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Outfit', 'Sora', sans-serif",
      fontWeight: 800,
      fontSize: 14,
      letterSpacing: "-0.03em",
      color: "#134e4a"
    }
  }, "Eden Gil"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94a3b8",
      fontWeight: 500,
      letterSpacing: "0.04em"
    }
  }, "® סימן מסחרי"))));
}

function ArchiveView({
  stats,
  go,
  onBack,
  onToggleArchive,
  archivedUncat,
  onUnarchiveUncat
}) {
  const list = useMemo(() => {
    return [...stats].filter(c => !c.isSelf && c.hidden).sort((a, b) => {
      const ta = a.lastActivityMs || 0;
      const tb = b.lastActivityMs || 0;
      return ta - tb;
    });
  }, [stats]);
  const uncatAssigned = useMemo(() => (archivedUncat || []).filter(e => e && e.assignedTo), [archivedUncat]);
  const uncatPlain = useMemo(() => (archivedUncat || []).filter(e => e && !e.assignedTo), [archivedUncat]);
  const uncatSectionStyle = {
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    marginTop: 4
  };
  const uncatTitleStyle = {
    fontWeight: 800,
    fontSize: 16,
    color: "#334155",
    marginBottom: 6
  };
  const uncatDescStyle = {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.45,
    marginBottom: 10
  };
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      border: "1.5px solid #e2e8f0",
      borderRadius: 12,
      padding: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#334155",
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, { n: "archive", s: 20 }), "ארכיון לקוחות"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#64748b",
      lineHeight: 1.45
    }
  }, "לקוחות שלא טענו מעל חודש מוסתרים אוטומטית מהדשבורד. אפשר גם להעביר ידנית ולהחזיר בכל רגע.")), list.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "archive",
    title: "הארכיון ריק",
    sub: "לקוחות שלא טענו מעל חודש יועברו לכאן אוטומטית."
  }) : list.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      ...S.cCard,
      opacity: 0.95
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cTop,
      cursor: "pointer"
    },
    onClick: () => go("client", c.id)
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 40,
    fontSize: 17
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cName
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cMeta
  }, c.archived ? "הועבר ידנית לארכיון" : "לא פעיל (מעל חודש)", " · ", c.last ? `טעינה אחרונה ${fdateDay(c.last.date)}` : "בלי טעינות", formatClientCarLine(c) ? ` · ${formatClientCarLine(c)}` : "")), /*#__PURE__*/React.createElement("div", {
    style: balanceBadgeStyle(c.balance, false)
  }, formatBalanceText(c.balance))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("client", c.id),
    style: {
      ...S.btnS,
      padding: "8px",
      fontSize: 13
    }
  }, "פתח"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      onToggleArchive && onToggleArchive(c.id, false);
    },
    style: {
      ...S.btnP,
      background: "#0ea5e9",
      padding: "8px",
      fontSize: 13,
      flex: 1.2
    },
    "data-testid": `archive-restore-${c.id}`
  }, "שחזר מהארכיון"))), uncatAssigned.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: uncatSectionStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: uncatTitleStyle
  }, "טעינות משויכות"), /*#__PURE__*/React.createElement("div", {
    style: uncatDescStyle
  }, "טעינות Wevo ששויכו ללקוח — נשמרו גם בכרטיס הלקוח. רשומת מעקב בלבד."), uncatAssigned.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.key,
    style: {
      ...S.cCard,
      opacity: 0.95,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cTop
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cName
  }, e.plugInTime ? fdateDay(e.plugInTime) : "—"), /*#__PURE__*/React.createElement("div", {
    style: S.cMeta
  }, e.kwh != null ? Number(e.kwh).toFixed(2) + ' קוט״ש' : "", e.cost != null ? " · ₪" + Number(e.cost).toFixed(2) : "", e.transactionId ? " · txn#" + e.transactionId : "")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("client", e.assignedTo),
    style: {
      ...S.btnS,
      padding: "8px",
      fontSize: 13,
      fontWeight: 700,
      color: C.primaryStrong
    },
    "data-testid": "archive-assigned-client-" + e.key
  }, "שויכה ל־" + (e.assignedName || "לקוח")))))), uncatPlain.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: uncatSectionStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: { ...uncatTitleStyle, display: "flex", alignItems: "center", gap: 7 }
  }, /*#__PURE__*/React.createElement(Icon, { n: "plug", s: 17, style: { color: C.primaryStrong, flexShrink: 0 } }), "טעינות שהועברו לארכיון (לא שויכו)"), /*#__PURE__*/React.createElement("div", {
    style: uncatDescStyle
  }, "טעינות שהועברו לארכיון מהרשימה הלא־מקוטלגת בלי שיוך ללקוח. לא נוצר חיוב. אפשר לשחזר בכל רגע."), uncatPlain.map(e => /*#__PURE__*/React.createElement("div", {
    key: e.key,
    style: {
      ...S.cCard,
      opacity: 0.95,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cTop
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cName
  }, e.plugInTime ? fdateDay(e.plugInTime) : "—"), /*#__PURE__*/React.createElement("div", {
    style: S.cMeta
  }, e.kwh != null ? Number(e.kwh).toFixed(2) + ' קוט״ש' : "", e.cost != null ? " · ₪" + Number(e.cost).toFixed(2) : "", e.transactionId ? " · txn#" + e.transactionId : ""))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onUnarchiveUncat && onUnarchiveUncat(e.key),
    style: {
      ...S.btnS,
      padding: "8px",
      fontSize: 13
    },
    "data-testid": "archive-uncat-restore-" + e.key
  }, "שחזר לרשימה"))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => (typeof onBack === "function" ? onBack() : go("dash")),
    style: {
      ...S.btnS,
      marginTop: 12,
      width: "100%"
    },
    "data-testid": "nav-dash"
  }, "→ חזרה")));
}


function WevoMiniLog() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 4000);
    return () => clearInterval(t);
  }, []);
  const log = getWevoLog().slice(0, 5);
  void tick;
  if (!log.length) return null;
  // כשהכול תקין — pill שקט במקום קופסת לוג
  if (log.every(row => row.ok)) {
    const ago = fmtElapsed(Date.now() - new Date(log[0].at).getTime());
    return /*#__PURE__*/React.createElement("div", {
      style: { marginBottom: 14 }
    }, /*#__PURE__*/React.createElement("span", {
      style: S.pill(C.okSoft, C.okInk)
    }, /*#__PURE__*/React.createElement(Icon, { n: "check", s: 14 }), `Wevo תקין · סונכרן לפני ${ago}`));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 12,
      color: "#9a3412",
      marginBottom: 6
    }
  }, "יומן מטען Wevo"), log.map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: `${row.at}-${i}`,
    style: {
      fontSize: 11,
      color: row.ok ? "#57534e" : "#b91c1c",
      padding: "3px 0",
      borderBottom: i < log.length - 1 ? "1px solid #ffedd5" : "none",
      display: "flex",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, row.ok ? "●" : "!", " ", row.msg), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#a8a29e",
      flexShrink: 0
    }
  }, ftime(new Date(row.at))))));
}

function fmtElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} שע׳ ${m % 60} דק׳` : `${m} דק׳`;
}

// ── כרטיסי טעינה פתוחה (hero) ──
// ── באנר "מוכן לחיוב" בראש הדשבורד ─────────────────────────────────────────
// טעינה שהסתיימה (readyToComplete) מקבלת קריאה לפעולה בולטת — בלי להיכנס
// לכרטיס הלקוח. לחיצה אחת פותחת את אשף ההשלמה ישירות.
function ReadyToCompleteBanner({ readyCards, clients, onComplete }) {
  if (!readyCards || !readyCards.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
      border: "2px solid #10b981",
      borderRadius: 14,
      padding: "12px 14px",
      marginBottom: 12
    },
    "data-testid": "ready-complete-banner"
  }, readyCards.map(o => {
    const cl = clients.find(c => c.id === o.clientId);
    const kwh = o.liveKwh != null && Number(o.liveKwh) > 0 ? Number(o.liveKwh).toFixed(1) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 24,
      style: {
        color: "#059669",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: "#065f46"
      }
    }, "הטעינה של ", (cl && cl.name) || "לקוח", " הסתיימה"), kwh && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#047857"
      }
    }, kwh, " קוט״ש — מוכן לחיוב")), /*#__PURE__*/React.createElement("button", {
      onClick: () => onComplete(o.id, o.clientId),
      style: {
        ...S.btnP,
        background: "#059669",
        minHeight: 48,
        padding: "0 20px",
        fontSize: 15,
        flexShrink: 0
      },
      "data-testid": `ready-complete-${o.id}`
    }, "השלם טעינה"));
  }));
}

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

