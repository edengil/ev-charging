function ArchiveView({
  stats,
  go,
  onToggleArchive
}) {
  const list = useMemo(() => {
    return [...stats].filter(c => !c.isSelf && c.hidden).sort((a, b) => {
      const ta = a.lastActivityMs || 0;
      const tb = b.lastActivityMs || 0;
      return ta - tb;
    });
  }, [stats]);
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
      marginBottom: 6
    }
  }, "📦 ארכיון לקוחות"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#64748b",
      lineHeight: 1.45
    }
  }, "לקוחות שלא טענו כ־3 חודשים מוסתרים אוטומטית מהדשבורד. אפשר גם להעביר ידנית ולהחזיר בכל רגע.")), list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "הארכיון ריק — אין לקוחות מוסתרים") : list.map(c => /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement("div", {
    style: S.ava(40, 17)
  }, c.name[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cName
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cMeta
  }, c.archived ? "הועבר ידנית לארכיון" : "לא פעיל (3+ חודשים)", " · ", c.last ? `טעינה אחרונה ${fdate(c.last.date)}` : "בלי טעינות")), /*#__PURE__*/React.createElement("div", {
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
    }
  }, "שחזר מהארכיון"))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => go("dash"),
    style: {
      ...S.btnS,
      marginTop: 12,
      width: "100%"
    }
  }, "← חזרה לדשבורד"));
}

