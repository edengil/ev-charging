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
  opens,
  archivedKeys,
  onAssign,
  onArchive,
  onBack
}) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientPick, setClientPick] = useState({});
  const [dupWarn, setDupWarn] = useState({});
  const [dupOk, setDupOk] = useState({});
  const [assignBusy, setAssignBusy] = useState({});
  const [showHint, setShowHint] = useState(() => {
    try {
      return !localStorage.getItem("ev_uncat_hint");
    } catch (e) {
      return true;
    }
  });
  const dismissHint = () => {
    try {
      localStorage.setItem("ev_uncat_hint", "1");
    } catch (e) {}
    setShowHint(false);
  };
  const clearDup = tid => {
    setDupWarn(prev => {
      const n = { ...prev };
      delete n[tid];
      return n;
    });
    setDupOk(prev => {
      const n = { ...prev };
      delete n[tid];
      return n;
    });
  };
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
  const archivedSet = useMemo(() => new Set(archivedKeys || []), [archivedKeys]);
  const list = useMemo(() => {
    try {
      return findUncataloguedCharges(txs, sessions, undefined, opens).filter(tx => !archivedSet.has(uncataloguedTxKey(tx)));
    } catch (e) {
      return [];
    }
  }, [txs, sessions, opens, archivedSet]);
  useEffect(() => {
    try {
      localStorage.setItem("ev_uncat_count", String(list.length));
      localStorage.setItem("ev_uncat_ts", String(Date.now()));
    } catch (e) {}
  }, [list]);
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
  const showEmpty = !error && !loading && list.length === 0;
  const lastCheckSub = (() => {
    try {
      const ts = Number(localStorage.getItem("ev_uncat_ts"));
      if (!ts) return "נבדק מול Wevo";
      const m = Math.round((Date.now() - ts) / 60000);
      if (m < 1) return "נבדק מול Wevo ממש עכשיו";
      return `נבדק מול Wevo לפני ${m} דקות`;
    } catch (e) {
      return "נבדק מול Wevo";
    }
  })();
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, !showEmpty && /*#__PURE__*/React.createElement("div", {
    style: { ...S.hero,
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.heroNum
  }, loading ? "…" : String(list.length)), /*#__PURE__*/React.createElement("div", {
    style: S.heroLabel
  }, "טעינות ממתינות לשיוך"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: 0.85,
      marginTop: 6
    }
  }, "השוואת היסטוריית Wevo מול האפליקציה · החל מ־", sinceLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: { ...S.btnS,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    },
    onClick: load,
    disabled: loading,
    "data-testid": "uncatalogued-refresh"
  }, loading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Spinner, {
    s: 14
  }), " שולף מ-Wevo…") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
    n: "refresh",
    s: 15
  }), " רענן מ-Wevo")), onBack && /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: S.btnS,
    onClick: onBack
  }, "→ חזרה")), showHint && /*#__PURE__*/React.createElement("div", {
    style: { ...S.statusCard(C.primary),
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "inbox",
    s: 20,
    style: {
      color: C.primaryStrong
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      color: C.body,
      lineHeight: 1.5
    }
  }, "כאן מופיעות טעינות מ-Wevo שעוד לא שויכו לאף לקוח. בחר לקוח לכל טעינה — החיוב נוצר אוטומטית."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: dismissHint,
    "aria-label": "סגור",
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: C.meta,
      fontSize: 18,
      lineHeight: 1,
      padding: 4,
      minWidth: 32,
      minHeight: 32
    }
  }, "×")), error && /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.errSoft,
      border: "1.5px solid #fecaca",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: C.errInk,
      lineHeight: 1.45
    }
  }, error), showEmpty && /*#__PURE__*/React.createElement(EmptyState, {
    icon: "check",
    tone: "ok",
    title: "כל הטעינות מקוטלגות — אין מה להשלים",
    sub: lastCheckSub,
    testid: "uncatalogued-empty"
  }), loading && [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: "skel-" + i,
    className: "ev-skel",
    style: {
      height: 92,
      marginBottom: 10
    }
  })), list.map((tx, i) => {
    const tid = uncataloguedTxKey(tx);
    const pick = clientPick[tid] || "";
    const kwh = Number(tx.totalEnergyKwh);
    const cost = tx.totalCost != null ? Number(tx.totalCost) : null;
    const warn = dupWarn[tid] || null;
    const tryAssign = () => {
      if (!onAssign || !pick) return;
      const suspect = findDuplicateSuspect(sessions, pick, tx);
      if (suspect && !dupOk[tid]) {
        setDupWarn(prev => ({ ...prev,
          [tid]: suspect
        }));
        return;
      }
      clearDup(tid);
      setAssignBusy(prev => ({ ...prev,
        [tid]: true
      }));
      onAssign(tx, pick);
    };
    return /*#__PURE__*/React.createElement("div", {
      key: tid,
      className: "ev-stagger",
      style: { ...S.row,
        display: "block",
        padding: "12px 14px",
        animationDelay: Math.min(i * 45, 360) + "ms"
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
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontWeight: 700,
        fontSize: 14,
        color: C.ink
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "plug",
      s: 16,
      style: {
        color: C.primaryStrong
      }
    }), fmtTxTime(tx)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: C.body,
        fontWeight: 600,
        whiteSpace: "nowrap"
      }
    }, Number.isFinite(kwh) ? kwh.toFixed(2) + " קוט״ש" : "", cost != null && Number.isFinite(cost) ? " · ₪" + cost.toFixed(2) : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("select", {
      style: { ...S.inp,
        flex: 1
      },
      value: pick,
      onChange: e => {
        clearDup(tid);
        setClientPick(prev => ({ ...prev,
          [tid]: e.target.value
        }));
      },
      "data-testid": "uncatalogued-client-" + tid
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "בחר לקוח…"), (clients || []).map(c => /*#__PURE__*/React.createElement("option", {
      key: c.id,
      value: c.id
    }, c.name))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "ev-press",
      style: { ...S.btnP,
        whiteSpace: "nowrap",
        opacity: assignBusy[tid] ? 0.7 : pick ? 1 : 0.5,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6
      },
      disabled: !pick || !!assignBusy[tid],
      onClick: tryAssign,
      "data-testid": "uncatalogued-assign-" + tid
    }, assignBusy[tid] ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Spinner, {
      s: 14,
      style: {
        borderTopColor: "#fff",
        borderColor: "rgba(255,255,255,0.35)"
      }
    }), " שומר…") : "שייך וחייב"), onArchive && /*#__PURE__*/React.createElement("button", {
      type: "button",
      style: { ...S.btnS,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6
      },
      onClick: () => onArchive(tx),
      "data-testid": "uncatalogued-archive-" + tid
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "archive",
      s: 15
    }), " העבר לארכיון")), warn && /*#__PURE__*/React.createElement("div", {
      style: {
        background: C.warnSoft,
        border: "1.5px solid #fcd34d",
        borderRadius: 10,
        padding: "10px 12px",
        marginTop: 8,
        fontSize: 13,
        color: C.warnInk,
        lineHeight: 1.5
      },
      "data-testid": "uncatalogued-dupwarn-" + tid
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "alert",
      s: 15
    }), "נראה ככפילות של טעינה קיימת: ", duplicateSuspectLabel(warn)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      style: { ...S.btnP,
        background: C.warn,
        whiteSpace: "nowrap"
      },
      onClick: () => {
        setDupOk(prev => ({ ...prev,
          [tid]: true
        }));
        setDupWarn(prev => {
          const n = { ...prev };
          delete n[tid];
          return n;
        });
        setAssignBusy(prev => ({ ...prev,
          [tid]: true
        }));
        if (onAssign) onAssign(tx, pick);
      },
      "data-testid": "uncatalogued-dupconfirm-" + tid
    }, "שייך בכל זאת"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      style: S.btnS,
      onClick: () => clearDup(tid),
      "data-testid": "uncatalogued-dupcancel-" + tid
    }, "בטל"))))
  })));
}
