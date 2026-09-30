/**
 * src/views/uncatalogued.js — טעינות Wevo שעוד לא קוטלגו ללקוח.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 *
 * בכל פתיחת הדף נמשכת היסטוריית Wevo טרייה (wevoApi("sync")) ומושווית מול
 * הטעינות השמורות באפליקציה החל מ־28.09.2026. מה שלא מותאם (לפי txn, או
 * קוט״ש דומה + סכום דומה + חפיפת זמנים) מוצג כלא מקוטלג, ובחירת לקוח
 * פותחת את כרטיס הסיום עם חיוב מלא ואפשרויות השעה.
 */
// ── UncataloguedView ─────────────────────────────────────────────────────
function UncataloguedView({
  sessions,
  clients,
  onAssign,
  onBack
}) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientPick, setClientPick] = useState({});
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await wevoApi("sync");
      setTxs(data && data.transactions ? data.transactions : []);
    } catch (e) {
      const msg = e && e.message === "NO_CREDS" ? "אין התחברות Wevo — היכנס תחילה ב״סנכרון Wevo״" : e && e.message || "שגיאה בשליפת היסטוריית Wevo";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const list = useMemo(() => {
    try {
      return findUncataloguedCharges(txs, sessions);
    } catch (e) {
      return [];
    }
  }, [txs, sessions]);
  const fmtTxTime = tx => {
    const ms = wevoTxTimeMs(tx);
    if (!ms) return "—";
    try {
      return new Date(ms).toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  };
  const sinceLabel = (() => {
    try {
      return new Date(UNCATALOGUED_SINCE_MS).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return "";
    }
  })();
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.cNameLg
  }, "טעינות לא מקוטלגות"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#64748b",
      fontWeight: 600
    }
  }, "השוואת היסטוריית Wevo מול האפליקציה · החל מ־", sinceLabel))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: S.btnS,
    onClick: load,
    disabled: loading,
    "data-testid": "uncatalogued-refresh"
  }, loading ? "שולף מ-Wevo…" : "🔄 רענן מ-Wevo"), onBack && /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: S.btnS,
    onClick: onBack
  }, "← חזרה")), error && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef2f2",
      border: "1.5px solid #fecaca",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#991b1b",
      lineHeight: 1.45
    }
  }, error), !error && !loading && list.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1.5px solid #86efac",
      borderRadius: 10,
      padding: "12px",
      fontSize: 14,
      color: "#166534",
      fontWeight: 600,
      textAlign: "center"
    },
    "data-testid": "uncatalogued-empty"
  }, "✅ כל הטעינות מקוטלגות — אין מה להשלים"), list.map(tx => {
    const tid = tx.transactionId != null ? String(tx.transactionId) : "tx-" + wevoTxTimeMs(tx);
    const pick = clientPick[tid] || "";
    const kwh = Number(tx.totalEnergyKwh);
    const cost = tx.totalCost != null ? Number(tx.totalCost) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: tid,
      style: {
        background: "#fff",
        border: "1.5px solid #e2e8f0",
        borderRadius: 12,
        padding: "12px",
        marginBottom: 10
      },
      "data-testid": "uncatalogued-row-" + tid
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#0f172a"
      }
    }, "🔌 ", fmtTxTime(tx)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#475569",
        fontWeight: 600,
        whiteSpace: "nowrap"
      }
    }, Number.isFinite(kwh) ? kwh.toFixed(2) + ' קוט"ש' : "", cost != null && Number.isFinite(cost) ? " · ₪" + cost.toFixed(2) : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("select", {
      style: { ...S.inp,
        flex: 1
      },
      value: pick,
      onChange: e => setClientPick(prev => ({ ...prev,
        [tid]: e.target.value
      })),
      "data-testid": "uncatalogued-client-" + tid
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "בחר לקוח…"), (clients || []).map(c => /*#__PURE__*/React.createElement("option", {
      key: c.id,
      value: c.id
    }, c.name))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      style: { ...S.btnP,
        whiteSpace: "nowrap",
        opacity: pick ? 1 : 0.5
      },
      disabled: !pick,
      onClick: () => onAssign && onAssign(tx, pick),
      "data-testid": "uncatalogued-assign-" + tid
    }, "שייך וחייב")));
  })));
}
