/**
 * src/views/clients.js — תצוגת לקוח.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── ClientView ─────────────────────────────────────────────────────────────
function ClientView({
  cid,
  clients,
  stats,
  sessions,
  payments,
  go,
  onDelSession,
  onDelClient,
  onToggleArchive,
  openSess = [],
  onDelOpen,
  onComplete,
  onEditSession,
  onEditPayment
}) {
  const now = new Date();
  const [tab, setTab] = useState("s");
  const [selMo, setSelMo] = useState(now.getMonth());
  const [selYr, setSelYr] = useState(now.getFullYear());
  const [delS, setDelS] = useState(null);
  const [delC, setDelC] = useState(false);
  const c = clients.find(x => x.id === cid);
  const st = stats.find(x => x.id === cid);
  if (!c || !st) return null;
  const selfClient = isSelfClient(c);
  const billSessions = sessions.filter(s => s.source !== "wevo-sync");
  const allSS = [...billSessions.filter(s => s.clientId === cid)].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allPS = [...payments.filter(p => p.clientId === cid)].sort((a, b) => new Date(b.date) - new Date(a.date));
  const ledger = buildClientLedger(cid, billSessions, payments, {
    isSelf: selfClient
  });
  const ss = allSS.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === selMo && d.getFullYear() === selYr;
  });
  const monthKeys = new Set(allSS.map(s => {
    const d = new Date(s.date);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }));
  monthKeys.add(`${now.getFullYear()}-${now.getMonth()}`);
  const monthOpts = [...monthKeys].map(k => {
    const [y, m] = k.split("-").map(Number);
    return {
      y,
      m
    };
  }).sort((a, b) => b.y !== a.y ? b.y - a.y : b.m - a.m);
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.cHeader
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 52,
    fontSize: 22
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: S.cNameLg
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cPhone
  }, c.phone || "אין טלפון"), formatClientCarLine(c) && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cPhone,
      marginTop: 2,
      color: "#475569",
      fontWeight: 600
    }
  }, "🚗 ", formatClientCarLine(c))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("edit-c", cid),
    style: {
      background: "#eff6ff",
      border: "1.5px solid #bfdbfe",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 13,
      color: "#1d4ed8",
      fontWeight: 700
    }
  }, "✏️ ערוך"), !isSelfClient(c) && /*#__PURE__*/React.createElement("button", {
    onClick: () => onToggleArchive && onToggleArchive(cid, !(isClientArchived(c) || st.hidden)),
    style: {
      background: isClientArchived(c) || st.hidden ? "#ecfdf5" : "#f8fafc",
      border: isClientArchived(c) || st.hidden ? "1.5px solid #a7f3d0" : "1.5px solid #e2e8f0",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 12,
      color: isClientArchived(c) || st.hidden ? "#047857" : "#64748b",
      fontWeight: 700
    },
    "data-testid": "client-archive-toggle"
  }, isClientArchived(c) || st.hidden ? "שחזר מהארכיון" : "העבר לארכיון"), !delC ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelC(true),
    style: {
      background: "none",
      border: "1.5px solid #e5e7eb",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 13,
      color: "#9ca3af"
    },
    "data-testid": "client-delete"
  }, "🗑 מחק") : /*#__PURE__*/React.createElement("div", {
    style: S.confirmBar
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#991b1b",
      fontWeight: 700
    }
  }, "למחוק?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDelClient(cid),
    "data-testid": "client-delete-confirm",
    style: {
      background: "#ef4444",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      padding: "5px 12px",
      fontSize: 13,
      cursor: "pointer",
      fontWeight: 700
    }
  }, "כן"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelC(false),
    style: {
      background: "#f3f4f6",
      color: "#374151",
      border: "none",
      borderRadius: 6,
      padding: "5px 12px",
      fontSize: 13,
      cursor: "pointer"
    }
  }, "לא")))), /*#__PURE__*/React.createElement("div", {
    style: S.sumRow
  }, /*#__PURE__*/React.createElement(SumCard, {
    lbl: balanceSumLabel(st.balance, isSelfClient(c)),
    val: balanceSumVal(st.balance, isSelfClient(c)),
    color: balanceColor(st.balance, isSelfClient(c)),
    icon: hasCredit(st.balance) && !isSelfClient(c) ? "💚" : "💳"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח החודש",
    val: ilsFull(st.monthP),
    color: "#10b981",
    icon: "📈"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "עלות החודש",
    val: ils(st.monthCost),
    color: "#6b7280",
    icon: "🔒"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח כולל",
    val: ilsFull(st.totalP),
    color: "#6366f1",
    icon: "⚡"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.actRow
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.actBtn,
      flex: 2,
      background: "#059669",
      padding: "12px 8px"
    },
    onClick: () => go("add-s", cid),
    "data-testid": "client-add-session"
  }, "טעינה"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("add-open", cid),
    "data-testid": "client-add-open"
  }, "פתוח"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("add-p", cid),
    "data-testid": "client-add-payment"
  }, "תשלום"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("add-debt", cid),
    "data-testid": "client-add-debt"
  }, "חוב"), /*#__PURE__*/React.createElement("button", {
    style: S.quietBtn,
    onClick: () => go("report", cid),
    "data-testid": "client-report"
  }, "דוח")), /*#__PURE__*/React.createElement("div", {
    style: S.tabs
  }, /*#__PURE__*/React.createElement("button", {
    style: S.tab(tab === "s"),
    onClick: () => setTab("s"),
    "data-testid": "client-tab-sessions"
  }, "טעינות (", allSS.length, ")"), /*#__PURE__*/React.createElement("button", {
    style: S.tab(tab === "ledger"),
    onClick: () => setTab("ledger"),
    "data-testid": "client-tab-ledger"
  }, "עובר ושב (", ledger.length, ")"), /*#__PURE__*/React.createElement("button", {
    style: S.tab(tab === "p"),
    onClick: () => setTab("p"),
    "data-testid": "client-tab-payments"
  }, "תשלומים (", allPS.length, ")")), tab === "ledger" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 12,
      fontSize: 12,
      color: "#64748b",
      lineHeight: 1.45
    }
  }, "היסטוריה מלאה כמו עובר ושב: טעינות מגדילות חוב (+), הפקדות מקטינות (−). הימין — יתרה אחרי כל שורה."), ledger.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין תנועות עדיין") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    "data-testid": "client-ledger"
  }, ledger.map(e => {
    const isCredit = e.kind === "payment";
    const isCharge = e.kind === "session" || e.kind === "debt";
    const deltaColor = selfClient ? "#0ea5c6" : isCredit ? "#059669" : isCharge ? "#dc2626" : "#64748b";
    const bal = e.balanceAfter;
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      style: {
        ...S.row,
        alignItems: "stretch",
        padding: "12px 12px",
        cursor: e.kind === "session" || e.kind === "payment" || e.kind === "debt" ? "pointer" : "default"
      },
      onClick: () => {
        if (e.kind === "session" && onEditSession) onEditSession(e.refId);
        else if ((e.kind === "payment" || e.kind === "debt") && onEditPayment) onEditPayment(e.refId);
      },
      "data-testid": `ledger-row-${e.id}`
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: e.kind === "payment" ? "#047857" : e.kind === "debt" ? "#b91c1c" : "#0369a1",
        background: e.kind === "payment" ? "#ecfdf5" : e.kind === "debt" ? "#fef2f2" : "#f0f9ff",
        borderRadius: 6,
        padding: "2px 7px"
      }
    }, e.title), /*#__PURE__*/React.createElement("span", {
      style: S.rDate
    }, fdate(e.sortDate), " ", ftime(e.sortDate))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#64748b"
      }
    }, e.detail, e.notes ? ` · ${e.notes}` : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "left",
        flexShrink: 0,
        minWidth: 88
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: deltaColor,
        letterSpacing: -0.3
      }
    }, selfClient && e.kind === "session" ? ilsFull(e.showAmount) : `${e.delta > 0 ? "+" : e.delta < 0 ? "−" : ""}${ils(Math.abs(e.showAmount))}`), !selfClient && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        marginTop: 2,
        color: balanceColor(bal, false)
      }
    }, hasCredit(bal) ? `זכות ${ils(Math.abs(bal))}` : hasDebt(bal) ? `חוב ${ils(bal)}` : "מאופס")));
  }))), tab === "s" && /*#__PURE__*/React.createElement(React.Fragment, null, openSess.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#374151",
      marginBottom: 8
    }
  }, "טעינות פתוחות"), openSess.map(o => {
    const est = estimateFromOpen(o, c);
    const showBill = !isSelfClient(c) && (o.liveBilled != null || est.calc.amountBilled > 0);
    const stt = openChargeStatus(o, readLiveStation());
    const ended = stt.kind === "unplugged" || stt.kind === "cable";
    const liveNow = !ended;
    const liveKw = ended ? null : o.liveKw != null ? Number(o.liveKw) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        ...S.row,
        border: stt.kind === "unplugged" ? "2px solid #86efac" : stt.kind === "cable" ? "2px solid #93c5fd" : "2px solid #bae6fd",
        background: stt.kind === "unplugged" ? "#f0fdf4" : stt.kind === "cable" ? "#eff6ff" : "#f0f9ff",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-block",
        fontSize: 12,
        fontWeight: 800,
        color: stt.kind === "unplugged" ? "#166534" : stt.kind === "cable" ? "#1d4ed8" : "#92400e",
        background: stt.kind === "unplugged" ? "#dcfce7" : stt.kind === "cable" ? "#dbeafe" : "#fef3c7",
        borderRadius: 999,
        padding: "3px 8px",
        marginBottom: 6
      }
    }, stt.text), /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.rDate,
        marginTop: 4
      }
    }, "חיבור: ", fdate(o.startDate), " ", ftime(o.startDate), !liveNow && (o.chargeEndedAt || o.endDate) ? ` → סיום: ${fdate(o.chargeEndedAt || o.endDate)} ${ftime(o.chargeEndedAt || o.endDate)}` : ""), isChargeTimelineRelevant({
      isSelf: selfClient,
      ...timelineHintsFromOpenOrSession(o)
    }) && /*#__PURE__*/React.createElement(ChargeTimelineBox, {
      compact: true,
      timeline: resolveChargeTimeline({}, {
        plugInAt: o.plugInAt || o.startDate,
        chargeStartedAt: o.chargeStartedAt,
        chargeEndedAt: liveNow ? null : o.chargeEndedAt || o.endDate,
        plugOutAt: liveNow ? null : o.plugOutAt,
        chargingFullTime: liveNow ? null : o.chargingFullTime,
        netDuration: o.netDuration
      }),
      billStartKey: o.billStartKey || "plugIn",
      billEndKey: o.billEndKey || "chargeEnd"
    }), /*#__PURE__*/React.createElement("div", {
      style: S.rMeta
    }, o.liveKwh != null ? `${Number(o.liveKwh).toFixed(2)} קוט"ש` : "ממתין להשלמה...", liveKw != null ? ` · ${liveKw.toFixed(1)} kW` : "", o.liveWevoCost != null ? ` · עלות ₪${Number(o.liveWevoCost).toFixed(2)}` : "", showBill ? ` · לחיוב ${ils(o.liveBilled != null ? o.liveBilled : est.calc.amountBilled)} (${o.liveRateLabel || est.calc.rateLabel})` : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onComplete(o.id),
      style: {
        background: ended ? "#059669" : "#0369a1",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer"
      },
      "data-testid": `open-complete-${o.id}`
    }, ended && !(Number(o.liveKwh) > 0) ? "אין קוט״ש" : ended ? "✓ אשר ושמור" : "✓ השלם"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onDelOpen(o.id),
      style: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        padding: "4px 2px"
      },
      "data-testid": `open-delete-${o.id}`
    }, "מחק")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.inp,
      fontSize: 13
    },
    value: `${selYr}-${selMo}`,
    onChange: e => {
      const [y, m] = e.target.value.split("-").map(Number);
      setSelYr(y);
      setSelMo(m);
    }
  }, monthOpts.map(({
    y,
    m
  }) => /*#__PURE__*/React.createElement("option", {
    key: `${y}-${m}`,
    value: `${y}-${m}`
  }, MONTHS[m], " ", y)))), ss.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין טעינות ב", MONTHS[selMo], " ", selYr) : ss.map(s => {
    var _s$costToOwner;
    const selfRow = isSelfClient(c);
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      style: S.row
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: S.rDate
    }, fdate(s.date), " ", ftime(s.date), (s.chargeEndedAt || s.endDate) ? ` → ${fdate(s.chargeEndedAt || s.endDate) === fdate(s.date) ? ftime(s.chargeEndedAt || s.endDate) : fdate(s.chargeEndedAt || s.endDate) + " " + ftime(s.chargeEndedAt || s.endDate)}` : ""), (s.plugInAt || s.chargeStartedAt || s.chargeEndedAt || s.plugOutAt) && isChargeTimelineRelevant({
      isSelf: selfRow,
      ...timelineHintsFromOpenOrSession({
        ...s,
        startDate: s.date
      })
    }) && /*#__PURE__*/React.createElement(ChargeTimelineBox, {
      compact: true,
      timeline: resolveChargeTimeline({}, {
        plugInAt: s.plugInAt || s.date,
        chargeStartedAt: s.chargeStartedAt,
        chargeEndedAt: s.chargeEndedAt || s.endDate,
        plugOutAt: s.plugOutAt
      }),
      billStartKey: s.billStartKey || "plugIn",
      billEndKey: s.billEndKey || "chargeEnd"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        alignItems: "center",
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: S.rbadge(selfRow ? "#0ea5c6" : s.premiumRatio >= 1 ? "#f59e0b" : s.isMixed ? "#8b5cf6" : "#6b7280")
    }, selfRow ? "אשראי" : s.rateLabel === "מותאם" ? "מותאם" : s.isMixed ? "משולב" : s.premiumRatio >= 1 ? "פרימיום" : "רגיל"), /*#__PURE__*/React.createElement("span", {
      style: S.rMeta
    }, selfRow ? s.kwhRaw : s.kwhInflated, " קוט\"ש"), s.avgRateKW != null && /*#__PURE__*/React.createElement("span", {
      style: S.rMeta
    }, "· ממוצע ", Number(s.avgRateKW).toFixed(1), " kW"), s.stopReason && /*#__PURE__*/React.createElement("span", {
      style: S.rMeta
    }, "· ", wevoStopReasonHe(s.stopReason))), /*#__PURE__*/React.createElement("div", {
      style: S.rCost
    }, selfRow ? "יורד באשראי · ללא חוב" : /*#__PURE__*/React.createElement(React.Fragment, null, "עלות: ₪", (_s$costToOwner = s.costToOwner) === null || _s$costToOwner === void 0 ? void 0 : _s$costToOwner.toFixed(2), s.electricityCost != null ? ` · חשמל ₪${Number(s.electricityCost).toFixed(2)}` : "", " 🔒"))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "left",
        marginLeft: 6,
        marginRight: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: S.rAmt
    }, ilsFull(selfRow ? s.costToOwner || s.amountBilled : s.amountBilled)), /*#__PURE__*/React.createElement("div", {
      style: selfRow ? Object.assign({}, S.rPft, { color: "#0ea5c6" }) : S.rPft
    }, selfRow ? "אשראי ✓" : /*#__PURE__*/React.createElement(React.Fragment, null, "רווח: ", ilsFull(s.profit)))), delS === s.id ? /*#__PURE__*/React.createElement("div", {
      style: S.confirmOverlay
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#991b1b",
        fontWeight: 700,
        flex: 1
      }
    }, "למחוק?"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onDelSession(s.id);
        setDelS(null);
      },
      style: {
        background: "#ef4444",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: 12,
        cursor: "pointer",
        fontWeight: 700
      }
    }, "כן"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelS(null),
      style: {
        background: "#f3f4f6",
        color: "#374151",
        border: "none",
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: 12,
        cursor: "pointer"
      }
    }, "לא")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const bal = st ? st.balance : 0;
        const txt = waChargeMessage(s.amountBilled, bal, {
          isSelf: isSelfClient(c)
        });
        openWaDraft({
          phone: c && c.phone,
          name: c && c.name,
          text: txt
        });
      },
      style: {
        background: "none",
        border: "none",
        color: "#22c55e",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px"
      },
      title: "טיוטת הודעה",
      "data-testid": `wa-session-${s.id}`
    }, "💬"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditSession(s.id),
      style: {
        background: "none",
        border: "none",
        color: "#93c5fd",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px"
      },
      title: "ערוך",
      "data-testid": `session-edit-${s.id}`
    }, "✏️"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelS(s.id),
      style: {
        background: "none",
        border: "none",
        color: "#d1d5db",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px"
      }
    }, "🗑")));
  })), tab === "p" && (allPS.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "אין תשלומים") : allPS.map(p => {
    var _METHODS$p$method;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: S.row
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: S.rDate
    }, fdate(p.date), " ", ftime(p.date)), /*#__PURE__*/React.createElement("span", {
      style: S.mBadge
    }, (_METHODS$p$method = METHODS[p.method]) !== null && _METHODS$p$method !== void 0 ? _METHODS$p$method : p.method), p.notes ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...S.mBadge,
        marginRight: 4
      }
    }, p.notes) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.rAmt,
        color: p.method === "debt" ? "#ef4444" : "#10b981"
      }
    }, p.method === "debt" ? `+${ils(Math.abs(p.amount))} חוב` : `-${ils(Math.abs(p.amount))}`), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditPayment(p.id),
      style: {
        background: "none",
        border: "none",
        color: "#93c5fd",
        fontSize: 15,
        cursor: "pointer",
        padding: "2px",
        marginRight: 6,
        flexShrink: 0
      },
      title: "ערוך"
    }, "✏️"));
  })));
}

