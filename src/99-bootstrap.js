/**
 * src/99-bootstrap.js — אתחול: render של App.
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
installPwaReturnRecovery();
