/**
 * src/views/wevo-sync-view.js — התחברות Wevo + ייבוא טעינות.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── WevoSyncView: התחברות + ייבוא טעינות מ-Wevo ─────────────────────────────
function WevoSyncView({
  clients,
  sessions,
  openSess = [],
  onMerged,
  onCancel
}) {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("ev_wevo_creds") || "{}");
    } catch {
      return {};
    }
  })();
  const [email, setEmail] = useState(saved.email || "");
  const [password, setPassword] = useState(saved.password || "");
  const [remember, setRemember] = useState(!!saved.password);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [inspectReport, setInspectReport] = useState(null);

  const runSync = async () => {
    setErr("");
    setInfo("");
    if (!email.trim() || !password) {
      setErr("יש להזין אימייל וסיסמה");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(wevoSyncUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          action: "sync"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `שגיאת שרת (${res.status})`);
      }
      try {
        if (remember) {
          localStorage.setItem("ev_wevo_creds", JSON.stringify({
            email: email.trim(),
            password
          }));
        } else {
          localStorage.setItem("ev_wevo_creds", JSON.stringify({
            email: email.trim()
          }));
        }
      } catch {}
      const result = mergeWevoTransactions(clients || [], sessions || [], data.transactions || [], openSess || []);
      setInfo(`נמשכו ${data.count} טעינות מ-Wevo`);
      onMerged(result);
    } catch (e) {
      const msg = e.message || String(e);
      if (/Failed to fetch|NetworkError|fetch/i.test(msg)) {
        setErr("לא מצליח להגיע לשרת הסנכרון. בדוק חיבור ל־Cloudflare.");
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const runInspect = async () => {
    setErr("");
    setInfo("");
    setInspectReport(null);
    if (!email.trim() || !password) {
      setErr("יש להזין אימייל וסיסמה");
      return;
    }
    setBusy(true);
    try {
      try {
        localStorage.setItem("ev_wevo_creds", JSON.stringify({
          email: email.trim(),
          password
        }));
      } catch {}
      const res = await fetch(wevoSyncUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          action: "inspect"
        })
      });
      const report = await res.json().catch(() => ({}));
      if (!res.ok || !report.ok) throw new Error(report.error || `שגיאה (${res.status})`);
      setInspectReport(report);
      try {
        localStorage.setItem("ev_wevo_identity_report", JSON.stringify({
          at: Date.now(),
          verdict: report.verdict,
          identityCandidatePaths: report.identityCandidatePaths,
          sampleFinishedKeys: report.sampleFinishedKeys,
          sampleStateKeys: report.sampleStateKeys,
          transactionCount: report.transactionCount
        }));
      } catch {}
      setInfo(
        report.verdict === "auto_link_ready"
          ? "יש כמה מזהי RFID/לוחיות שונים — אפשר לבנות מיפוי אוטומטי ללקוחות"
          : report.verdict === "rfid_field_exists_sparse"
            ? "יש שדה RFID ב-Wevo, אבל כמעט תמיד ריק (מעט טעינות עם כרטיס)"
            : report.verdict === "schema_supports_rfid_but_empty"
              ? "Wevo תומך ב-RFID/לוחית, אבל בכל ההיסטוריה אצלך השדות ריקים"
              : "לא נמצא מזהה רכב ברור בנתוני Wevo (רק מצב טעינה/קוט״ש/עלות)"
      );
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18,
      marginBottom: 8,
      color: "#0ea5c6"
    }
  }, "🔄 סנכרון מ-Wevo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 16,
      lineHeight: 1.5
    }
  }, "מתחבר לחשבון Wevo, מושך את היסטוריית הטעינות, וממזג ללא כפילויות. טעינות חדשות שלא משויכות נרשמות תחת ", /*#__PURE__*/React.createElement("b", null, "עדן (עצמי)"), " במחיר עלות."), /*#__PURE__*/React.createElement(FG, {
    lbl: "אימייל Wevo"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "email",
    dir: "ltr",
    value: email,
    onChange: e => setEmail(e.target.value),
    autoComplete: "username"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "סיסמה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "password",
    dir: "ltr",
    value: password,
    onChange: e => setPassword(e.target.value),
    autoComplete: "current-password"
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      color: "#374151",
      marginBottom: 14,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: remember,
    onChange: e => setRemember(e.target.checked)
  }), "זכור סיסמה במכשיר זה בלבד"), err && /*#__PURE__*/React.createElement("div", {
    style: S.errMsg
  }, err), info && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 10,
      padding: 10,
      fontSize: 13,
      color: "#065f46",
      marginBottom: 12
    }
  }, info), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: busy ? "#93c5fd" : "#0ea5c6",
      padding: "12px",
      opacity: busy ? 0.8 : 1
    },
    disabled: busy,
    onClick: runSync
  }, busy ? "⏳ מתחבר ומושך..." : "🔄 התחבר וסנכרן"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: busy ? "#cbd5e1" : "#0f766e",
      padding: "12px",
      marginTop: 8
    },
    disabled: busy,
    onClick: runInspect
  }, busy ? "⏳ בודק..." : "🔎 בדוק זיהוי רכב / RFID"), inspectReport && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: 12,
      fontSize: 12,
      color: "#334155",
      lineHeight: 1.5,
      direction: "ltr",
      textAlign: "left",
      maxHeight: 280,
      overflow: "auto",
      whiteSpace: "pre-wrap",
      fontFamily: "ui-monospace, Consolas, monospace"
    }
  }, JSON.stringify({
    verdict: inspectReport.verdict,
    transactionCount: inspectReport.transactionCount,
    rfid: inspectReport.rfid,
    licensePlate: inspectReport.licensePlate,
    identityCandidatePaths: (inspectReport.identityCandidatePaths || []).filter(p =>
      /rfid|license|driver|plate|vin|idTag|vehicle/i.test(p)
    ),
    sampleFinishedKeys: inspectReport.sampleFinishedKeys,
    sampleOngoingKeys: inspectReport.sampleOngoingKeys,
    sampleStateKeys: inspectReport.sampleStateKeys
  }, null, 2)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      marginTop: 8
    },
    onClick: onCancel,
    disabled: busy
  }, "ביטול"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: 11,
      color: "#9ca3af",
      lineHeight: 1.4
    }
  }, "הסיסמה נשלחת רק לפונקציית הסנכרון שלך ולא נשמרת בשרתי Wevo מעבר להתחברות.")));
}

