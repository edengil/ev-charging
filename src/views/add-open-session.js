/**
 * src/views/add-open-session.js — פתיחת טעינה.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── AddOpenSession ─────────────────────────────────────────────────────────
function AddOpenSession({
  clients,
  defaultCid,
  onSave,
  onCancel
}) {
  var _ref2, _clients$2;
  const [cid, setCid] = useState((_ref2 = defaultCid !== null && defaultCid !== void 0 ? defaultCid : (_clients$2 = clients[0]) === null || _clients$2 === void 0 ? void 0 : _clients$2.id) !== null && _ref2 !== void 0 ? _ref2 : "");
  const [dt, setDt] = useState(toLocalDT(new Date()));
  const [notes, setNotes] = useState("");
  return /*#__PURE__*/React.createElement("main", {
    style: S.main
  }, /*#__PURE__*/React.createElement("div", {
    style: S.form
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#e0f2fe",
      border: "1px solid #bae6fd",
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 14,
      fontSize: 13,
      color: "#0369a1",
      fontWeight: 600
    }
  }, "⏳ טעינה פתוחה — תשלים את הנתונים בסיום"), /*#__PURE__*/React.createElement(FG, {
    lbl: "לקוח"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.inp,
    value: cid,
    onChange: e => setCid(e.target.value)
  }, clients.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), /*#__PURE__*/React.createElement(FG, {
    lbl: "שעת תחילת טעינה"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    type: "datetime-local",
    value: dt,
    onChange: e => setDt(e.target.value)
  })), /*#__PURE__*/React.createElement(FG, {
    lbl: "הערות (אופציונלי)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.inp,
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "הערה..."
  })), /*#__PURE__*/React.createElement("div", {
    style: S.acts
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btnP,
      background: "#0ea5e9"
    },
    onClick: () => onSave({
      id: uid(),
      clientId: cid,
      startDate: dt,
      notes
    }),
    "data-testid": "open-start"
  }, "⏳ התחל טעינה"), /*#__PURE__*/React.createElement("button", {
    style: S.btnS,
    onClick: onCancel
  }, "ביטול"))));
}

