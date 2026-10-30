/**
 * src/views/wevo-panel-sections.js — קטעי תצוגה טהורים שהופרדו מהפאנל החי.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── LiveMoneyBox: קופסת עלות חיה (קוט״ש, עלות Wevo, חיוב לקוח, רווח משוער) ────
function LiveMoneyBox({
  est,
  st,
  selectedClient
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #e2e8f0",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 13,
      marginBottom: 8,
      color: "#0f172a"
    }
  }, "חישוב חי", est.isSelf ? " · עלות בלבד" : ` · ${selectedClient ? selectedClient.name : ""}`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, ' קוט״ש'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16
    }
  }, est.kwh.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#94a3b8",
      marginBottom: 2
    }
  }, "עלות Wevo 🔒"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#475569"
    }
  }, "₪", est.wevoCost.toFixed(2))), !est.isSelf && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.primarySoft,
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.primaryStrong,
      marginBottom: 2
    }
  }, "לחיוב לקוח"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18,
      color: C.primaryStrong,
      fontVariantNumeric: "tabular-nums"
    }
  }, ils(est.calc.amountBilled)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.meta,
      marginTop: 2
    }
  }, est.calc.kwhInflated, ' קוט״ש מנופח · ₪', est.calc.rate, " · ", est.calc.rateLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfdf5",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#059669",
      marginBottom: 2
    }
  }, "רווח משוער"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16,
      color: "#047857"
    }
  }, ilsFull(est.calc.profit))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 11,
      color: "#64748b",
      lineHeight: 1.45,
      display: "grid",
      gap: 2
    }
  }, est.elec != null && /*#__PURE__*/React.createElement("div", null, "חשמל Wevo: ₪", Number(est.elec).toFixed(2), est.wevoCost != null ? ` · סה״כ Wevo: ₪${Number(est.wevoCost).toFixed(2)}` : ""), st.avgRateKW != null && /*#__PURE__*/React.createElement("div", null, "מהירות ממוצעת: ", Number(st.avgRateKW).toFixed(1), " kW", st.maxRateKW != null ? ` · מקס׳ ${Number(st.maxRateKW).toFixed(1)} kW` : ""), st.origin && /*#__PURE__*/React.createElement("div", null, "מקור: ", wevoOriginHe(st.origin))));
}

// ── WatchBanner: באנרי שומר שרת (באנר פעיל + כפתורי הפעלת שומר) ────
function WatchBanner({
  watchInfo,
  hasCreds,
  cid,
  onWatchOff,
  onArmGuard,
  onArmNotifyWatch
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, watchInfo && watchInfo.armed && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: 10,
      background: "#fef3c7",
      border: "1.5px solid #f59e0b",
      borderRadius: 12,
      padding: "10px 12px"
    },
    "data-testid": "wevo-watch-active"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 200px",
      fontWeight: 700,
      fontSize: 13,
      color: "#92400e"
    }
  }, "🛰️ שומר שרת פעיל · ", watchInfo.clientName || "", watchInfo.status && watchInfo.status.lastAction ? ` · פעל לאחרונה: ${watchInfo.status.lastAction.detail}` : watchInfo.notifyOnly ? " · שומר התראות — מתריע על סיום, עצירת פרימיום וניתוק, גם כשהאפליקציה סגורה (בלי אישורי פרימיום)" : watchInfo.persistent ? ` · שומר קבוע — מתריע על חיבור/סיום/ניתוק ומאשר חיבורים אוטומטית (לא בפרימיום)${watchInfo.premiumContinue ? " · כולל המשך פרימיום חמוש" : ""}` : " · יאשר המשך אוטומטית במעבר לפרימיום, גם כשהאפליקציה סגורה"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "8px 10px"
    },
    onClick: onWatchOff,
    "data-testid": "wevo-watch-off"
  }, "כבה שומר")),
  !watchInfo && hasCreds && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "8px 12px"
    },
    onClick: onArmGuard,
    "data-testid": "wevo-watch-guard-arm"
  }, "🛰️ הפעל שומר קבוע"), cid && /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "8px 12px"
    },
    onClick: onArmNotifyWatch,
    "data-testid": "wevo-watch-notify-arm"
  }, "🔔 שומר התראות ללקוח זה"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748b",
      lineHeight: 1.4,
      flex: "1 1 200px"
    }
  }, "שומר קבוע: התראה על כל חיבור + אישור ראשון אוטומטי בתעריף רגיל (בשעות פרימיום — אתה מחליט), בלי פקיעת 24 שעות. שומר התראות: התראות בלבד ללקוח הנבחר.")));
}

// ── PreauthControls: בקרי אישור־מראש (באנר פעיל/נסה־עכשיו/בטל + טוגלי פרימיום והמשך־פרימיום + כפתור חימוש) ────
function PreauthControls({
  isOffPeakIntent,
  isFullIntent,
  isFirstAuthIntent,
  selectedClient,
  peakNow,
  authAttemptsUi,
  preAuthQueued,
  authIntentQueued,
  preAuthPremium,
  premiumContinue,
  onRetryNow,
  onCancelIntent,
  onArmAuthIntent,
  onPreAuthPremiumChange,
  onPremiumContinueChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 10
    }
  }, isOffPeakIntent || isFullIntent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 200px",
      background: isOffPeakIntent ? "#ecfdf5" : "#fff7ed",
      border: isOffPeakIntent ? "1.5px solid #6ee7b7" : "1.5px solid #fdba74",
      borderRadius: 12,
      padding: "10px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: isOffPeakIntent ? "#047857" : "#c2410c"
    },
    "data-testid": isOffPeakIntent ? "wevo-preauth-active" : "wevo-fullauth-active"
  }, isOffPeakIntent ? "✓ אישור מראש פעיל · " : "✓ מאשר עכשיו (כולל פרימיום) · ", selectedClient && selectedClient.name, isOffPeakIntent && (preAuthQueued || authIntentQueued || peakNow) ? " · ממתין לרגיל" : "", authAttemptsUi > 0 ? ` · ניסיון ${authAttemptsUi}` : ""), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "10px 12px"
    },
    onClick: onRetryNow,
    "data-testid": "wevo-auth-retry-now"
  }, "נסה עכשיו"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnS,
      padding: "10px 12px"
    },
    onClick: onCancelIntent,
    "data-testid": "wevo-preauth-cancel"
  }, "בטל אישור")) : /*#__PURE__*/React.createElement(React.Fragment, null, isFirstAuthIntent && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 100%",
      background: "#e0f2fe",
      border: "1.5px solid #7dd3fc",
      borderRadius: 12,
      padding: "10px 12px",
      fontWeight: 700,
      fontSize: 13,
      color: "#0369a1"
    },
    "data-testid": "wevo-firstauth-active"
  }, "✓ מאשר חיבור אוטומטית · ", selectedClient && selectedClient.name, authAttemptsUi > 0 ? ` · ניסיון ${authAttemptsUi}` : ""), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "10px 12px",
      background: preAuthPremium ? "#fff7ed" : "#f8fafc",
      border: preAuthPremium ? "1.5px solid #fdba74" : "1.5px solid #e2e8f0",
      borderRadius: 12,
      fontWeight: 700,
      fontSize: 13,
      color: preAuthPremium ? "#c2410c" : "#475569",
      cursor: "pointer",
      flex: "1 1 180px",
      userSelect: "none"
    },
    "data-testid": "wevo-preauth-premium-toggle"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: preAuthPremium,
    onChange: onPreAuthPremiumChange,
    style: { width: 17, height: 17, accentColor: "#ea580c" }
  }), `כולל פרימיום (₪${Number((getConfig() || {}).ratePremium || 0).toFixed(2)}/קוט״ש)`), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "10px 12px",
      background: premiumContinue ? "#fef3c7" : "#f8fafc",
      border: premiumContinue ? "1.5px solid #f59e0b" : "1.5px solid #e2e8f0",
      borderRadius: 12,
      fontWeight: 700,
      fontSize: 13,
      color: premiumContinue ? "#92400e" : "#475569",
      cursor: "pointer",
      flex: "1 1 180px",
      userSelect: "none"
    },
    "data-testid": "wevo-premium-continue-toggle",
    title: "אם הטעינה תיעצר כשהתעריף יעבור לפרימיום — האפליקציה תאשר אוטומטית המשך בפרימיום"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: premiumContinue,
    onChange: onPremiumContinueChange,
    style: { width: 17, height: 17, accentColor: "#f59e0b" }
  }), "המשך אוטומטי בפרימיום"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...S.btnP,
      background: preAuthPremium ? "#ea580c" : "#059669",
      color: "#fff",
      padding: "11px 12px",
      flex: "1 1 180px"
    },
    onClick: () => onArmAuthIntent(preAuthPremium ? "full-now" : "offpeak-preauth", null, { premiumContinue }),
    "data-testid": "wevo-preauth-arm"
  }, preAuthPremium ? "אשר מראש · כולל פרימיום" : "אשר מראש")));
}

