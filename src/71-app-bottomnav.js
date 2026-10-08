/**
 * 71-app-bottomnav.js — BottomNav — סרגל ניווט תחתון.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
function BottomNav({ view, go }) {
  const uncatCount = (() => {
    try {
      return Number(window.localStorage.getItem("ev_uncat_count")) || 0;
    } catch {
      return 0;
    }
  })();
  const prevCountRef = useRef(0);
  const [popKey, setPopKey] = useState(0);
  useEffect(() => {
    if (uncatCount > prevCountRef.current) setPopKey(k => k + 1);
    prevCountRef.current = uncatCount;
  }, [uncatCount]);
  const items = [{
    key: "home",
    label: "בית",
    icon: "home",
    views: ["dash"],
    onTap: () => go("dash")
  }, {
    key: "charge",
    label: "טעינה חדשה",
    icon: "zap",
    views: ["add-s"],
    onTap: () => go("add-s", null)
  }, {
    key: "report",
    label: "דוח חודשי",
    icon: "chart",
    views: ["stats"],
    onTap: () => go("stats")
  }, {
    key: "debts",
    label: "חובות",
    icon: "card",
    views: ["debts"],
    onTap: () => go("debts")
  }, {
    key: "uncatalogued",
    label: "טעינות יתומות",
    icon: "inbox",
    views: ["uncatalogued"],
    onTap: () => go("uncatalogued")
  }, {
    key: "client",
    label: "לקוח חדש",
    icon: "userPlus",
    views: ["add-c"],
    onTap: () => go("add-c")
  }, {
    key: "settings",
    label: "הגדרות",
    icon: "cog",
    views: ["settings"],
    onTap: () => go("settings")
  }];
  return /*#__PURE__*/React.createElement("nav", {
    "data-testid": "bottom-nav",
    style: {
      position: "fixed",
      bottom: 12,
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 24px)",
      maxWidth: 476,
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: "1px solid #e2e8f0",
      borderRadius: 22,
      boxShadow: "0 8px 28px rgba(15, 23, 42, 0.14)",
      zIndex: 60,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      direction: "rtl"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      width: "100%"
    }
  }, items.map(it => {
    const active = it.views.includes(view);
    let badge = null;
    if (it.key === "uncatalogued" && uncatCount > 0) {
      badge = uncatCount > 99 ? "99+" : String(uncatCount);
    }
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      type: "button",
      onClick: it.onTap,
      "data-testid": "bottomnav-" + it.key,
      style: {
        flex: 1,
        border: "none",
        background: "none",
        cursor: "pointer",
        padding: "8px 2px 9px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        color: active ? "#0e7490" : "#64748b",
        fontFamily: "'Heebo', sans-serif",
        fontSize: 11,
        fontWeight: active ? 800 : 600
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative",
        display: "inline-flex"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: it.icon,
      s: 22
    }), badge && /*#__PURE__*/React.createElement("span", {
      key: "badge-" + popKey,
      className: popKey > 0 ? "ev-badge-pop" : undefined,
      style: {
        position: "absolute",
        top: -7,
        insetInlineEnd: -11,
        minWidth: 18,
        height: 18,
        borderRadius: 999,
        background: C.err,
        color: "#fff",
        fontSize: 11,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        lineHeight: 1
      }
    }, badge)), /*#__PURE__*/React.createElement("span", {
      style: {
        whiteSpace: "nowrap",
        fontSize: 10
      }
    }, it.label), active && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 3,
        borderRadius: 2,
        background: "#0ea5c6",
        marginTop: 1
      }
    }));
  })));
}

