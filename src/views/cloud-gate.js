/**
 * src/views/cloud-gate.js — התחברות ראשונית / שחזור גיבוי ענן.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── CloudGate: התחברות ראשונית / שחזור גיבוי ענן ─────────────────────────
function CloudGate({
  mode = "login",
  busy,
  err,
  onSetup,
  onLogin,
  onSkip,
  allowSkip = true
}) {
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const isSetup = mode === "setup";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 2000,
      background: "rgba(15, 23, 42, 0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 22,
      width: "100%",
      maxWidth: 380,
      boxShadow: "0 20px 50px rgba(15,23,42,0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 18,
      color: "#134e4a",
      marginBottom: 8
    }
  }, isSetup ? "הגדרת גיבוי ענן" : "שחזור נתונים"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#64748b",
      lineHeight: 1.5,
      marginBottom: 14
    }
  }, isSetup
    ? "בחר PIN אישי (4+ ספרות). הנתונים יישמרו בענן — גם אחרי התקנה מחדש בטלפון."
    : "הזן את ה-PIN שלך כדי לשחזר לקוחות, טעינות ותשלומים."), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginBottom: 10,
      letterSpacing: "0.2em",
      textAlign: "center",
      fontSize: 20,
      fontWeight: 700
    },
    type: "password",
    inputMode: "numeric",
    placeholder: "PIN",
    value: pin,
    onChange: e => setPin(e.target.value.replace(/\s/g, ""))
  }), isSetup && /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.inp,
      marginBottom: 10,
      letterSpacing: "0.2em",
      textAlign: "center",
      fontSize: 20,
      fontWeight: 700
    },
    type: "password",
    inputMode: "numeric",
    placeholder: "אימות PIN",
    value: pin2,
    onChange: e => setPin2(e.target.value.replace(/\s/g, ""))
  }), err && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.errMsg,
      marginBottom: 10
    }
  }, err), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#0f766e",
      width: "100%",
      marginBottom: 8,
      opacity: busy ? 0.7 : 1
    },
    disabled: busy || pin.length < 4 || isSetup && pin !== pin2,
    onClick: () => isSetup ? onSetup(pin) : onLogin(pin)
  }, busy ? "⏳ רגע..." : isSetup ? "שמור והפעל גיבוי" : "שחזר מהענן"), allowSkip && /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnS,
      width: "100%"
    },
    disabled: busy,
    onClick: onSkip,
    "data-testid": "cloud-skip"
  }, "המשך בלי גיבוי (מקומי בלבד)")));
}

