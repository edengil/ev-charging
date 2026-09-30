const fs = require("fs");
const p = "C:/Users/edeng/Downloads/ev-charge-manager/app-source.js";
let t = fs.readFileSync(p, "utf8");
const marker = "// ── ImportData";
const start = t.indexOf(marker);
if (start < 0) throw new Error("ImportData marker missing");
const sig = t.indexOf("function ImportData({", start);
const bodyOpen = t.indexOf("}) {", sig) + 3; // points at `{` of body
let bal = 0;
let end = bodyOpen;
for (let j = bodyOpen; j < t.length; j++) {
  if (t[j] === "{") bal++;
  else if (t[j] === "}") {
    bal--;
    if (bal === 0) {
      end = j + 1;
      break;
    }
  }
}
const newFn = `// ── ImportData ─────────────────────────────────────────────────────────────
function ImportData({
  onImport,
  onExport,
  onDownload,
  onCancel,
  onCloudSetup,
  onCloudLogin,
  cloudConfigured
}) {
  const [json, setJson] = useState("");
  const [err, setErr] = useState("");
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ecfdf5",
      border: "1.5px solid #99f6e4",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#0f766e",
      marginBottom: 6
    }
  }, "☁️ גיבוי ענן (מומלץ לטלפון)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#374151",
      marginBottom: 10,
      lineHeight: 1.45
    }
  }, cloudConfigured
    ? "הגיבוי פעיל במכשיר הזה. אחרי התקנה מחדש — שחזר עם אותו PIN."
    : "שמור את הנתונים בענן עם PIN אישי, כדי שלא יימחקו כשמוחקים את האפליקציה מהטלפון."), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#0f766e",
      padding: "11px",
      width: "100%",
      marginBottom: 8
    },
    onClick: onCloudSetup
  }, "🔐 הגדר / עדכן גיבוי ענן"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      padding: "11px",
      width: "100%"
    },
    onClick: onCloudLogin
  }, "📥 שחזר מהענן עם PIN")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#065f46",
      marginBottom: 6
    }
  }, "📤 גיבוי / ייצוא"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#374151",
      marginBottom: 10
    }
  }, "מעתיק את כל הנתונים (כולל תעריפים) ללוח — שמור בפתקים / iCloud כגיבוי."), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#10b981",
      padding: "11px"
    },
    onClick: onExport
  }, "📋 העתק נתונים ללוח"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      padding: "11px",
      marginTop: 8
    },
    onClick: onDownload
  }, "💾 הורד קובץ גיבוי")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f9ff",
      border: "1px solid #bae6fd",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#0369a1",
      marginBottom: 6
    }
  }, "📥 שחזור / ייבוא"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#374151",
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
  }, "📂 בחר קובץ JSON", /*#__PURE__*/React.createElement("input", {
    type: "file",
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
      color: "#065f46",
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 8,
      fontWeight: 600
    }
  }, "✓ נטענו " + (json.length / 1024).toFixed(0) + "KB — לחץ \\"ייבא נתונים\\" לאישור"), /*#__PURE__*/React.createElement("textarea", {
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
    style: {
      ...S.btnP,
      padding: "11px",
      opacity: json.trim() ? 1 : 0.5
    },
    disabled: !json.trim(),
    onClick: () => {
      try {
        JSON.parse(json);
        onImport(json);
      } catch {
        setErr("JSON לא תקין");
      }
    }
  }, "📥 ייבא נתונים")), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      marginTop: 8,
      width: "100%"
    },
    onClick: onCancel
  }, "ביטול")));
}`;
const out = t.slice(0, start) + newFn + t.slice(end);
fs.writeFileSync(p, out);
console.log("replaced ImportData", end - start, "->", newFn.length);
