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
  const [delO, setDelO] = useState(null);
  const c = clients.find(x => x.id === cid);
  const st = stats.find(x => x.id === cid);
  if (!c || !st) return null;
  const selfClient = isSelfClient(c);
  const billSessions = sessions.filter(s => s.source !== "wevo-sync");
  const allSS = [...billSessions.filter(s => s.clientId === cid)].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allPS = [...payments.filter(p => p.clientId === cid)].sort((a, b) => new Date(b.date) - new Date(a.date));
  const balPill = selfClient ? {
    bg: C.primarySoft,
    ink: C.primaryInk,
    text: "אשראי"
  } : hasDebt(st.balance) ? {
    bg: C.warnSoft,
    ink: C.warnInk,
    text: `חוב ${ils(st.balance)}`
  } : hasCredit(st.balance) ? {
    bg: C.okSoft,
    ink: C.okInk,
    text: `זכות ${ils(Math.abs(st.balance))}`
  } : {
    bg: C.okSoft,
    ink: C.okInk,
    text: "מסולק"
  };
  const totalPaid = allPS.filter(x => x.method !== "debt").reduce((a, x) => a + Math.abs(Number(x.amount) || 0), 0);
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
    style: {
      background: `linear-gradient(180deg,${C.card} 0%,${C.primarySoft} 100%)`,
      border: `1px solid ${C.line}`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      boxShadow: C.shadowCard
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: c,
    size: 56,
    fontSize: 24
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      ...S.cNameLg,
      fontSize: 22
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: S.cPhone
  }, c.phone || "אין טלפון"), formatClientCarLine(c) && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cPhone,
      marginTop: 2,
      color: C.meta,
      fontWeight: 600
    }
  }, formatClientCarLine(c))), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.pill(balPill.bg, balPill.ink),
      fontSize: 13,
      padding: "8px 14px",
      flexShrink: 0
    }
  }, balPill.text)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      borderTop: `1px solid ${C.line}`,
      paddingTop: 10,
      marginBottom: 12
    }
  }, [["טעינות החודש", String(ss.length)], ["סה״כ טעינות", String(st.count)], ["שולם", ils(totalPaid)]].map(function (kv) {
    return /*#__PURE__*/React.createElement("div", {
      key: kv[0],
      style: {
        flex: 1,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.num,
        fontSize: 15,
        fontWeight: 800,
        color: C.ink
      }
    }, kv[1]), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.meta,
        marginTop: 1
      }
    }, kv[0]));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("edit-c", cid),
    style: {
      ...S.btnXS(C.primarySoft, C.primaryInk),
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "edit",
    s: 15
  }), "ערוך"), !isSelfClient(c) && /*#__PURE__*/React.createElement("button", {
    onClick: () => onToggleArchive && onToggleArchive(cid, !(isClientArchived(c) || st.hidden)),
    style: {
      ...(isClientArchived(c) || st.hidden ? S.btnXS(C.okSoft, C.okInk) : {
        ...S.btnXS(C.card, C.meta),
        border: `1px solid ${C.line}`
      }),
      flex: 1
    },
    "data-testid": "client-archive-toggle"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "archive",
    s: 15
  }), isClientArchived(c) || st.hidden ? "שחזר מהארכיון" : "העבר לארכיון"), !delC ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelC(true),
    style: {
      ...S.btnXS(C.card, C.meta),
      border: `1px solid ${C.line}`,
      flex: 1
    },
    "data-testid": "client-delete"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "trash",
    s: 15
  }), "מחק") : /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.confirmBar,
      border: `1.5px solid ${C.err}`,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.errInk,
      fontWeight: 700
    }
  }, "למחוק?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDelClient(cid),
    "data-testid": "client-delete-confirm",
    style: {
      ...S.pill(C.err, "#fff"),
      minHeight: 44,
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
      padding: "0 16px",
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "trash",
    s: 14
  }), "כן"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelC(false),
    style: {
      ...S.pill(C.errSoft, C.errInk),
      minHeight: 44,
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
      padding: "0 16px",
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "x",
    s: 14
  }), "לא")))), /*#__PURE__*/React.createElement("div", {
    style: S.sumRow
  }, /*#__PURE__*/React.createElement(SumCard, {
    lbl: balanceSumLabel(st.balance, isSelfClient(c)),
    val: balanceSumVal(st.balance, isSelfClient(c)),
    color: balanceColor(st.balance, isSelfClient(c)),
    icon: "card"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח החודש",
    val: ilsFull(st.monthP),
    color: C.ok,
    icon: "chart"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "עלות החודש",
    val: ils(st.monthCost),
    color: C.meta,
    icon: "plug"
  }), /*#__PURE__*/React.createElement(SumCard, {
    lbl: "רווח כולל",
    val: ilsFull(st.totalP),
    color: C.primaryStrong,
    icon: "zap"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.actRow
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.actBtn,
      flex: 2,
      background: C.ok,
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
      background: C.card,
      border: `1px solid ${C.line}`,
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 12,
      fontSize: 12,
      color: C.meta,
      lineHeight: 1.45
    }
  }, "היסטוריה מלאה כמו עובר ושב: טעינות מגדילות חוב (+), הפקדות מקטינות (−). הימין — יתרה אחרי כל שורה."), ledger.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "clock",
    title: "אין תנועות עדיין",
    sub: "טעינות ותשלומים יופיעו כאן אוטומטית"
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    "data-testid": "client-ledger"
  }, ledger.map(e => {
    const isCredit = e.kind === "payment";
    const isCharge = e.kind === "session" || e.kind === "debt";
    const deltaColor = selfClient ? C.primary : isCredit ? C.ok : isCharge ? C.err : C.meta;
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
      style: e.kind === "payment" ? S.pill(C.okSoft, C.okInk) : e.kind === "debt" ? S.pill(C.errSoft, C.errInk) : S.pill(C.primarySoft, C.primaryInk)
    }, e.title), /*#__PURE__*/React.createElement("span", {
      style: S.rDate
    }, fdate(e.sortDate), " ", ftime(e.sortDate))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: C.meta
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
      color: C.body,
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
        background: C.card,
        borderInlineStart: `4px solid ${C.primary}`,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 6
      }
    }, liveNow && /*#__PURE__*/React.createElement("span", {
      className: "ev-live-dot",
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: C.ok,
        display: "inline-block",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: stt.kind === "unplugged" ? S.pill(C.okSoft, C.okInk) : stt.kind === "cable" ? S.pill(C.primarySoft, C.primaryInk) : S.pill(C.warnSoft, C.warnInk)
    }, stt.text)), /*#__PURE__*/React.createElement("div", {
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
    }, o.liveKwh != null ? `${Number(o.liveKwh).toFixed(2)} קוט״ש` : "ממתין להשלמה...", liveKw != null ? ` · ${liveKw.toFixed(1)} kW` : "", o.liveWevoCost != null ? ` · עלות ₪${Number(o.liveWevoCost).toFixed(2)}` : "", showBill ? ` · לחיוב ${ils(o.liveBilled != null ? o.liveBilled : est.calc.amountBilled)} (${o.liveRateLabel || est.calc.rateLabel})` : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onComplete(o.id),
      style: {
        background: ended ? C.ok : C.primaryStrong,
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer"
      },
      "data-testid": `open-complete-${o.id}`
    }, ended && !(Number(o.liveKwh) > 0) ? "בדוק ואשר" : ended ? "✓ אשר ושמור" : "✓ השלם"), delO !== o.id ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelO(o.id),
      style: {
        ...S.btnXS(C.card, C.meta),
        border: `1px solid ${C.line}`,
        minHeight: 44,
        padding: "0 14px"
      },
      "data-testid": `open-delete-${o.id}`
    }, "מחק") : /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.confirmBar,
        border: `1.5px solid ${C.err}`
      },
      "data-testid": `open-delete-confirm-${o.id}`
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: C.errInk,
        fontWeight: 700,
        flex: 1
      }
    }, "למחוק טעינה פתוחה?"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onDelOpen(o.id);
        setDelO(null);
      },
      style: {
        ...S.pill(C.err, "#fff"),
        minHeight: 44,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        padding: "0 16px",
        borderRadius: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "trash",
      s: 14
    }), "מחק"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelO(null),
      style: {
        ...S.pill(C.errSoft, C.errInk),
        minHeight: 44,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        padding: "0 16px",
        borderRadius: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "x",
      s: 14
    }), "ביטול"))));
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
  }, MONTHS[m], " ", y)))), ss.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "zap",
    title: `אין טעינות ב${MONTHS[selMo]} ${selYr}`
  }) : ss.map(s => {
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
      style: selfRow || s.rateLabel === "מותאם" ? S.pill(C.primarySoft, C.primaryInk) : s.isMixed || s.premiumRatio >= 1 ? S.pill(C.warnSoft, C.warnInk) : S.pill(C.okSoft, C.okInk)
    }, selfRow ? "אשראי" : s.rateLabel === "מותאם" ? "מותאם" : s.isMixed ? "משולב" : s.premiumRatio >= 1 ? "פרימיום" : "רגיל"), /*#__PURE__*/React.createElement("span", {
      style: S.rMeta
    }, selfRow ? s.kwhRaw : s.kwhInflated, " קוט״ש"), s.avgRateKW != null && /*#__PURE__*/React.createElement("span", {
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
      style: selfRow ? Object.assign({}, S.rPft, { color: C.primary }) : S.rPft
    }, selfRow ? "אשראי ✓" : /*#__PURE__*/React.createElement(React.Fragment, null, "רווח: ", ilsFull(s.profit)))), delS === s.id ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.confirmBar,
        border: `1.5px solid ${C.err}`
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: C.errInk,
        fontWeight: 700,
        flex: 1
      }
    }, "למחוק?"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        onDelSession(s.id);
        setDelS(null);
      },
      style: {
        ...S.pill(C.err, "#fff"),
        minHeight: 44,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        padding: "0 16px",
        borderRadius: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "trash",
      s: 14
    }), "כן"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelS(null),
      style: {
        ...S.pill(C.errSoft, C.errInk),
        minHeight: 44,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        padding: "0 16px",
        borderRadius: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "x",
      s: 14
    }), "לא")) : /*#__PURE__*/React.createElement("div", {
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
        ...S.btnXS(C.waSoft, C.waInk),
        minWidth: 44,
        padding: 0
      },
      title: "טיוטת הודעה",
      "data-testid": `wa-session-${s.id}`
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "send",
      s: 16
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditSession(s.id),
      style: {
        ...S.btnXS(C.primarySoft, C.primaryInk),
        minWidth: 44,
        padding: 0
      },
      title: "ערוך",
      "data-testid": `session-edit-${s.id}`
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "edit",
      s: 16
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setDelS(s.id),
      style: {
        ...S.btnXS(C.errSoft, C.errInk),
        minWidth: 44,
        padding: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "trash",
      s: 16
    }))));
  })), tab === "p" && (allPS.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "card",
    title: "אין תשלומים"
  }) : allPS.map(p => {
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
        color: p.method === "debt" ? C.err : C.ok
      }
    }, p.method === "debt" ? `+${ils(Math.abs(p.amount))} חוב` : `-${ils(Math.abs(p.amount))}`), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditPayment(p.id),
      style: {
        ...S.btnXS(C.primarySoft, C.primaryInk),
        minWidth: 44,
        padding: 0,
        marginRight: 6,
        flexShrink: 0
      },
      title: "ערוך"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "edit",
      s: 16
    })));
  })));
}

