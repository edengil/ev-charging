/**
 * src/views/import-data.js — ייבוא נתונים.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── ImportData ─────────────────────────────────────────────────────────────
function ImportData({
  onImport,
  onExport,
  onDownload,
  onCancel,
  onCloudSetup,
  onCloudLogin,
  cloudConfigured,
  cloudStatus
}) {
  const [json, setJson] = useState("");
  const [err, setErr] = useState("");
  const [wevoLog, setWevoLog] = useState(() => getWevoLog());
  const [importing, setImporting] = useState(false);
  const chipStyle = (bg, ink) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 10,
    background: bg,
    color: ink,
    flexShrink: 0
  });
  const status = cloudStatus || getCloudStatus();
  const fmtCloudTime = ts => {
    if (!ts) return null;
    try {
      const d = new Date(Number(ts));
      if (Number.isNaN(d.getTime())) return null;
      return `${fdate(d.toISOString())} ${ftime(d.toISOString())}`;
    } catch {
      return null;
    }
  };
  const lastOkTxt = fmtCloudTime(status.lastOk || (() => {
    try {
      return localStorage.getItem(CLOUD_UPDATED_KEY);
    } catch {
      return null;
    }
  })());
  const lastErrAtTxt = fmtCloudTime(status.lastErrAt);
  const lastErrTxt = status.lastErr ? `${status.lastErr}${lastErrAtTxt ? ` · ${lastErrAtTxt}` : ""}` : null;
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: { ...S.row,
      display: "block",
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: chipStyle(C.okSoft, C.okInk)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "send",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: C.ink
    }
  }, "גיבוי ענן (מומלץ לטלפון)")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.body,
      marginBottom: 8,
      lineHeight: 1.45
    }
  }, cloudConfigured
    ? "הגיבוי פעיל במכשיר הזה. אחרי התקנה מחדש — שחזר עם אותו PIN."
    : "שמור את הנתונים בענן עם PIN אישי, כדי שלא יימחקו כשמוחקים את האפליקציה מהטלפון."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      background: lastErrTxt ? C.errSoft : C.okSoft,
      border: `1px solid ${lastErrTxt ? "#fecaca" : "#bbf7d0"}`,
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 10,
      color: lastErrTxt ? C.errInk : C.okInk,
      lineHeight: 1.45
    }
  }, !cloudConfigured && /*#__PURE__*/React.createElement("div", null, "סטטוס: לא מוגדר PIN במכשיר הזה"), cloudConfigured && lastOkTxt && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14,
    style: {
      color: C.okInk
    }
  }), "נשמר לאחרונה: ", lastOkTxt), cloudConfigured && !lastOkTxt && !lastErrTxt && /*#__PURE__*/React.createElement("div", null, "ממתין לשמירה ראשונה..."), lastErrTxt && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: lastOkTxt ? 4 : 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "alert",
    s: 14,
    style: {
      display: "inline-block",
      verticalAlign: "-2px",
      color: C.errInk
    }
  }), " שגיאה אחרונה: ", lastErrTxt)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#0f766e",
      padding: "11px",
      width: "100%",
      marginBottom: 8,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    },
    onClick: onCloudSetup
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "cog",
    s: 16
  }), " הגדר / עדכן גיבוי ענן"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      padding: "11px",
      width: "100%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    },
    onClick: onCloudLogin
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "inbox",
    s: 16
  }), " שחזר מהענן עם PIN")), /*#__PURE__*/React.createElement("div", {
    style: { ...S.row,
      display: "block",
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: chipStyle(C.primarySoft, C.primaryInk)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "archive",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: C.ink
    }
  }, "גיבוי / ייצוא")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.body,
      marginBottom: 10
    }
  }, "הורדה מהירה לקובץ JSON — הכי בטוח לגיבוי ידני. אפשר גם להעתיק ללוח."), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#10b981",
      padding: "11px"
    },
    onClick: onDownload,
    "data-testid": "backup-download"
  }, "הורד קובץ גיבוי (JSON)"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      padding: "11px",
      marginTop: 8
    },
    onClick: onExport,
    "data-testid": "backup-copy"
  }, "העתק נתונים ללוח")), /*#__PURE__*/React.createElement("div", {
    style: { ...S.row,
      display: "block",
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: chipStyle(C.warnSoft, C.warnInk)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "plug",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: C.ink
    }
  }, "יומן Wevo (קצר)")), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "none",
      border: "1px solid #fdba74",
      borderRadius: 8,
      padding: "4px 8px",
      fontSize: 11,
      cursor: "pointer",
      color: C.warnInk,
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    },
    onClick: () => setWevoLog(getWevoLog())
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "refresh",
    s: 13
  }), "רענן")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.body,
      marginBottom: 8
    }
  }, "פעולות אחרונות (אישור / סנכרון / שגיאות) — עוזר כשנתקעים"), wevoLog.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#78716c"
    }
  }, "עדיין אין רשומות") : wevoLog.slice(0, 8).map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 12,
      padding: "6px 0",
      borderBottom: i < Math.min(wevoLog.length, 8) - 1 ? "1px solid #ffedd5" : "none",
      color: row.ok ? C.body : C.errInk,
      lineHeight: 1.35
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.meta,
      marginLeft: 6
    }
  }, row.at ? ftime(new Date(row.at).toISOString()) : ""), " ", row.ok ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 13,
    style: {
      display: "inline-block",
      verticalAlign: "-2px",
      color: C.okInk
    }
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "alert",
    s: 13,
    style: {
      display: "inline-block",
      verticalAlign: "-2px",
      color: C.errInk
    }
  }), " ", row.msg))), /*#__PURE__*/React.createElement("div", {
    style: { ...S.row,
      display: "block",
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: chipStyle(C.primarySoft, C.primaryInk)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "inbox",
    s: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: C.ink
    }
  }, "שחזור / ייבוא")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.body,
      marginBottom: 8
    }
  }, "בחר קובץ גיבוי מהמכשיר (מומלץ) או הדבק ידנית למטה"), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      background: "#0369a1",
      color: "#fff",
      textAlign: "center",
      padding: "12px",
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 15,
      marginBottom: 10,
      cursor: "pointer"
    }
  }, "בחר קובץ JSON", /*#__PURE__*/React.createElement("input", {
    type: "file",
    "data-testid": "restore-file",
    accept: ".json,application/json,text/plain",
    style: { display: "none" },
    onChange: e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const txt = String(r.result || "");
        try {
          JSON.parse(txt);
          setJson(txt);
          setErr("");
        } catch {
          setErr("הקובץ אינו JSON תקין");
        }
      };
      r.onerror = () => setErr("שגיאה בקריאת הקובץ");
      r.readAsText(f);
    }
  })), json.trim() && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.okInk,
      background: C.okSoft,
      border: "1px solid #bbf7d0",
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 8,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  }), "נטענו " + (json.length / 1024).toFixed(0) + "KB — לחץ \"ייבא נתונים\" לאישור"), /*#__PURE__*/React.createElement("textarea", {
    "data-testid": "restore-textarea",
    style: {
      ...S.inp,
      height: 120,
      fontFamily: "monospace",
      fontSize: 11,
      resize: "vertical",
      marginBottom: 8
    },
    placeholder: "הדבק JSON מגיבוי...",
    value: json,
    onChange: e => {
      setJson(e.target.value);
      setErr("");
    }
  }), err && /*#__PURE__*/React.createElement("div", {
    style: S.errMsg
  }, err), /*#__PURE__*/React.createElement("button", {
    "data-testid": "restore-import",
    style: {
      ...S.btnP,
      padding: "11px",
      opacity: importing ? 0.7 : json.trim() ? 1 : 0.5,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    },
    disabled: !json.trim() || importing,
    onClick: () => {
      setImporting(true);
      try {
        JSON.parse(json);
        onImport(json);
      } catch {
        setErr("JSON לא תקין");
        setImporting(false);
      }
    }
  }, importing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Spinner, {
    s: 16,
    style: {
      borderTopColor: "#fff",
      borderColor: "rgba(255,255,255,0.35)"
    }
  }), " מייבא…") : "ייבא נתונים")), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      marginTop: 8,
      width: "100%"
    },
    onClick: onCancel
  }, "ביטול")));
}
function FG({
  lbl,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: S.fg
  }, /*#__PURE__*/React.createElement("label", {
    style: S.lbl
  }, lbl), children);
}
