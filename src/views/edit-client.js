/**
 * src/views/edit-client.js — עריכת לקוח.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── EditClient ─────────────────────────────────────────────────────────────
function EditClient({
  client,
  onSave,
  onCancel
}) {
  const [name, setName] = useState((client === null || client === void 0 ? void 0 : client.name) || "");
  const [phone, setPhone] = useState((client === null || client === void 0 ? void 0 : client.phone) || "");
  const [notes, setNotes] = useState((client === null || client === void 0 ? void 0 : client.notes) || "");
  const [carPlate, setCarPlate] = useState((client === null || client === void 0 ? void 0 : client.carPlate) || "");
  const [carBrand, setCarBrand] = useState(() => {
    const hit = findCarBrand(client && client.carBrand) || findCarBrand(client && client.carModel);
    return hit && hit.id || (client && client.carBrand) || "";
  });
  const [carModel, setCarModel] = useState((client === null || client === void 0 ? void 0 : client.carModel) || "");
  useEffect(() => {
    if (!client) return;
    setName(client.name || "");
    setPhone(client.phone || "");
    setNotes(client.notes || "");
    setCarPlate(client.carPlate || "");
    setCarModel(client.carModel || "");
    const hit = findCarBrand(client.carBrand) || findCarBrand(client.carModel);
    setCarBrand(hit && hit.id || client.carBrand || "");
  }, [client && client.id]);
  const inferred = findCarBrand(carBrand) || findCarBrand(carModel);
  const onModelChange = val => {
    setCarModel(val);
    const hit = findCarBrand(val);
    if (hit) setCarBrand(hit.id);
  };
  if (!client) return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.empty
  }, "הלקוח לא נמצא"));
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#1e40af",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(ClientAvatar, {
    client: {
      ...client,
      name,
      carBrand: carBrand || (inferred && inferred.id),
      carModel
    },
    size: 40,
    fontSize: 16
  }), "✏️ עריכת לקוח", isSelfClient(client) ? " · עצמי (אשראי)" : ""), /*#__PURE__*/React.createElement(FG, {
    lbl: "שם לקוח"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "שם מלא"
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "מספר טלפון"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: phone,
    onChange: e => setPhone(e.target.value),
    placeholder: "050-0000000",
    inputMode: "tel"
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
    value: findCarBrand(carBrand) ? findCarBrand(carBrand).id : carBrand,
    onChange: e => setCarBrand(e.target.value),
    "data-testid": "client-car-brand"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "— בחר יצרן —"), CAR_BRANDS.map(b => /*#__PURE__*/React.createElement("option", {
    key: b.id,
    value: b.id
  }, b.label)), carBrand && !findCarBrand(carBrand) && /*#__PURE__*/React.createElement("option", {
    value: carBrand
  }, carBrand))), /*#__PURE__*/React.createElement(FG, {
    lbl: "דגם רכב"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: carModel,
    onChange: e => onModelChange(e.target.value),
    placeholder: "לדוגמה: איוניק 5",
    "data-testid": "client-car-model"
  }), inferred && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 12,
      color: "#0f766e",
      fontWeight: 600
    }
  }, "סמל: ", inferred.label)), /*#__PURE__*/React.createElement(FG, {
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
      opacity: name.trim() ? 1 : 0.5
    },
    disabled: !name.trim(),
    onClick: () => onSave(client.id, {
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      carPlate: carPlate.trim(),
      carBrand: (findCarBrand(carBrand) || inferred || {}).id || carBrand.trim(),
      carModel: carModel.trim(),
      self: client.self === true || isSelfClient(client)
    })
  }, "שמור שינויים"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

