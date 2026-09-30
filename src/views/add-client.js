/**
 * src/views/add-client.js — הוספת לקוח.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── AddClient ──────────────────────────────────────────────────────────────
function AddClient({
  clients,
  onSave,
  onCancel
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const nameTrim = String(name || "").trim();
  const dupName = nameTrim && (clients || []).some(c => String(c.name || "").trim() === nameTrim);
  const inferred = findCarBrand(carBrand) || findCarBrand(carModel);
  const onModelChange = val => {
    setCarModel(val);
    const hit = findCarBrand(val);
    if (hit && !carBrand) setCarBrand(hit.id);
  };
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: S.hero
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "userPlus",
    s: 26
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800
    }
  }, "לקוח חדש"), /*#__PURE__*/React.createElement("div", {
    style: S.heroLabel
  }, "הוספת לקוח למערכת")))), /*#__PURE__*/React.createElement(FG, {
    lbl: "שם לקוח"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "ישראל ישראלי",
    "data-testid": "client-name"
  })), dupName && /*#__PURE__*/React.createElement("div", {
    style: { ...S.chip(C.warnSoft, C.warnInk), width: "100%", marginTop: -8, marginBottom: 14 },
    "data-testid": "client-dup-warn"
  }, /*#__PURE__*/React.createElement(Icon, { n: "alert", s: 13 }), "לקוח בשם זה כבר קיים — בדוק שלא מדובר בכפילות"), /*#__PURE__*/React.createElement(FG, {
    lbl: "טלפון"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "050-0000000",
    inputMode: "tel",
    "data-testid": "client-phone"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "מספר רכב"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: carPlate,
    onChange: e => setCarPlate(e.target.value),
    placeholder: "12-345-67",
    "data-testid": "client-car-plate"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "יצרן / סוג רכב"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: carBrand,
    onChange: e => setCarBrand(e.target.value),
    "data-testid": "client-car-brand"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "— בחר יצרן —"), CAR_BRANDS.map(b => /*#__PURE__*/React.createElement("option", {
    key: b.id,
    value: b.id
  }, b.label)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "דגם רכב"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: carModel,
    onChange: e => onModelChange(e.target.value),
    placeholder: "לדוגמה: איוניק 5",
    "data-testid": "client-car-model"
  }), inferred && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 12,
      color: C.meta
    }
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: {
      name: name || "ר",
      carBrand: carBrand || inferred.id,
      carModel
    },
    size: 36,
    fontSize: 14
  }), "סמל שיוצג: ", inferred.label)), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "אופציונלי"
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      opacity: name ? 1 : 0.5
    },
    disabled: !String(name || "").trim(),
    onClick: () => onSave({
      id: uid(),
      name,
      phone,
      notes,
      carPlate: carPlate.trim(),
      carBrand: (findCarBrand(carBrand) || inferred || {}).id || carBrand.trim(),
      carModel: carModel.trim()
    }),
    "data-testid": "client-save"
  }, dupName ? "שמור בכל זאת" : "הוסף לקוח"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

