/**
 * src/60-styles.js — עיצוב (S) + טוקני עיצוב (C).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 *
 * עקרונות (שדרוג עיצוב 30.09.2026):
 * - צבע ראשי אחד: ציאן (משפחת #0ea5c6) — זהה למותג/כותרת/תפריט.
 * - ניגודיות WCAG AA (4.5:1) לטקסט: primaryStrong/warn/err כהים על לבן.
 * - סקאלת טיפוגרפיה: 11/12/13/14/16/18/22. מטא מינימום 11px.
 * - רדיוסים: 8 (קלט/צ׳יפ) / 12 (כרטיס) / 16 (טופס) / 22 (צף) / 999 (pill).
 * - מטרות מגע מינימום 44px לכפתורים.
 * - מספרים: fontVariantNumeric tabular-nums (S.num).
 */
// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  primary: "#0ea5c6",       // ציאן — אקצנטים, ניווט פעיל, מילוי גדול
  primaryStrong: "#0e7490", // ציאן כהה — כפתורים עם טקסט לבן (4.83:1), קישורים
  primaryInk: "#164e63",    // טקסט על רקע בהיר
  primarySoft: "#ecfeff",   // רקע בהיר
  ink: "#0f172a",           // כותרות
  body: "#334155",          // גוף
  meta: "#64748b",          // טקסט משני (4.76:1 על לבן)
  faint: "#94a3b8",         // דקורטיבי בלבד
  line: "#e2e8f0",          // גבולות
  bg: "#f4f8fb",            // רקע אפליקציה
  card: "#ffffff",
  ok: "#047857", okSoft: "#d1fae5", okInk: "#065f46",
  warn: "#b45309", warnSoft: "#fef3c7", warnInk: "#92400e",
  err: "#b91c1c", errSoft: "#fee2e2", errInk: "#991b1b",
  wa: "#128c4b", waSoft: "#e8f7ee", waInk: "#0d6b38",
  shadowCard: "0 1px 3px rgba(15,23,42,0.07)",
  shadowPop: "0 8px 24px rgba(15,23,42,0.13)"
};

// CSS גלובלי זעיר: חיווי פוקוס למקלדת + אנימציית פעימה לנקודת "חי".
// מוזרק בזמן ריצה כדי לשרוד את תהליך ה־inject.
(function () {
  if (typeof document === "undefined" || document.getElementById("ev-ds-css")) return;
  const el = document.createElement("style");
  el.id = "ev-ds-css";
  el.textContent =
    "button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{" +
    "outline:2px solid #0ea5c6;outline-offset:2px;border-radius:8px}" +
    "@keyframes evPulse{0%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.55}100%{transform:scale(1);opacity:1}}" +
    ".ev-live-dot{animation:evPulse 1.6s ease-in-out infinite}";
  document.head.appendChild(el);
})();

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Heebo', sans-serif",
    direction: "rtl",
    maxWidth: 500,
    margin: "0 auto"
  },
  header: {
    background: "linear-gradient(180deg, #ffffff 0%, #f0fafc 100%)",
    borderBottom: "1px solid #d9eef5",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 12px rgba(14,165,198,0.08)"
  },
  hInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    gap: 10
  },
  hTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: C.ink
  },
  backBtn: {
    background: "none",
    border: "none",
    color: C.primaryStrong,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    padding: "10px 14px",
    minHeight: 44,
    borderRadius: 8,
    fontFamily: "inherit"
  },
  main: {
    padding: "16px 16px 48px"
  },
  // מספרים טבולריים — סכומים לא "רוקדים" כשהם מתעדכנים
  num: {
    fontVariantNumeric: "tabular-nums"
  },
  sumRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  sumCard: {
    flex: 1,
    background: C.card,
    borderRadius: 12,
    padding: "12px 8px",
    display: "flex",
    alignItems: "center",
    gap: 7,
    boxShadow: C.shadowCard
  },
  sumIcon: {
    fontSize: 18
  },
  sumVal: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: -0.5
  },
  sumLbl: {
    fontSize: 12,
    color: C.meta,
    marginTop: 2
  },
  actRow: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap"
  },
  actBtn: {
    flex: 1,
    minWidth: 60,
    minHeight: 44,
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    padding: "11px 4px",
    cursor: "pointer"
  },
  quietBtn: {
    flex: "1 1 108px",
    minHeight: 44,
    background: C.card,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    color: C.body,
    fontWeight: 600,
    fontSize: 14,
    padding: "10px 8px",
    cursor: "pointer",
    fontFamily: "inherit"
  },
  // כפתור קטן לפעולות שורה (ערוך/ארכיון/מחק) — 44px גובה
  btnXS(bg, color) {
    return {
      background: bg,
      color: color,
      border: "1px solid transparent",
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 13,
      padding: "0 14px",
      minHeight: 44,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    };
  },
  secTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: C.body,
    marginBottom: 10
  },
  cGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  cCard: {
    background: C.card,
    borderRadius: 12,
    padding: 14,
    boxShadow: C.shadowCard,
    cursor: "pointer"
  },
  cTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  ava(sz = 38, fs = 16) {
    return {
      width: sz,
      height: sz,
      borderRadius: "50%",
      background: "linear-gradient(135deg,#0ea5c6,#0e7490)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: fs,
      flexShrink: 0
    };
  },
  cName: {
    fontWeight: 700,
    fontSize: 15
  },
  cMeta: {
    fontSize: 12,
    color: C.meta
  },
  balBadge(d) {
    return {
      fontSize: 12,
      fontWeight: 700,
      borderRadius: 8,
      padding: "4px 10px",
      background: d ? C.warnSoft : C.okSoft,
      color: d ? C.warnInk : C.okInk
    };
  },
  miniStats: {
    display: "flex",
    flexWrap: "wrap"
  },
  mStat: {
    flex: "0 0 33.33%",
    textAlign: "center",
    padding: "3px 0"
  },
  mLbl: {
    display: "block",
    fontSize: 11,
    color: C.meta,
    marginBottom: 1
  },
  mVal: {
    fontSize: 12,
    fontWeight: 700,
    color: C.body
  },
  cHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16
  },
  cNameLg: {
    fontSize: 20,
    fontWeight: 800,
    margin: 0
  },
  cPhone: {
    fontSize: 12,
    color: C.meta
  },
  tabs: {
    display: "flex",
    marginBottom: 12,
    borderBottom: "2px solid #e5e7eb"
  },
  tab(a) {
    return {
      flex: 1,
      background: "none",
      border: "none",
      padding: "12px 0",
      minHeight: 44,
      fontSize: 14,
      color: a ? C.primaryStrong : C.meta,
      cursor: "pointer",
      fontWeight: a ? 700 : 500,
      borderBottom: a ? "2px solid #0ea5c6" : "none",
      marginBottom: a ? -2 : 0,
      fontFamily: "inherit"
    };
  },
  row: {
    background: C.card,
    borderRadius: 12,
    padding: "14px 14px",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: C.shadowCard,
    position: "relative",
    overflow: "hidden"
  },
  rDate: {
    fontSize: 13,
    fontWeight: 600,
    color: C.body
  },
  rMeta: {
    fontSize: 12,
    color: C.meta
  },
  rCost: {
    fontSize: 11,
    color: C.meta,
    marginTop: 2
  },
  rAmt: {
    fontSize: 16,
    fontWeight: 800
  },
  rPft: {
    fontSize: 12,
    fontWeight: 600,
    color: C.ok
  },
  rbadge(c) {
    return {
      fontSize: 11,
      fontWeight: 700,
      padding: "3px 8px",
      borderRadius: 8,
      background: c + "22",
      color: c
    };
  },
  mBadge: {
    fontSize: 11,
    background: "#f3f4f6",
    color: "#475569",
    padding: "3px 8px",
    borderRadius: 8,
    marginTop: 3,
    display: "inline-block"
  },
  empty: {
    textAlign: "center",
    color: C.meta,
    background: C.card,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "24px 16px",
    fontSize: 14,
    lineHeight: 1.5
  },
  form: {
    background: C.card,
    borderRadius: 16,
    padding: 16,
    boxShadow: C.shadowCard,
    marginBottom: 16
  },
  fg: {
    marginBottom: 14
  },
  lbl: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: C.body,
    marginBottom: 5
  },
  inp: {
    width: "100%",
    boxSizing: "border-box",
    border: "1.5px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 16,
    color: "#111827",
    background: "#fafafa",
    outline: "none",
    fontFamily: "inherit"
  },
  rg: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap"
  },
  rlbl: {
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer"
  },
  errMsg: {
    color: C.err,
    fontSize: 12,
    marginTop: 6
  },
  prev: {
    background: "#f9fafb",
    border: "1.5px solid #e5e7eb",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 14
  },
  prevTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: C.body,
    marginBottom: 8
  },
  pRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  acts: {
    display: "flex",
    gap: 10,
    marginTop: 4
  },
  btnP: {
    flex: 1,
    minHeight: 48,
    background: C.primaryStrong,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    fontFamily: "inherit"
  },
  btnS: {
    flex: 1,
    minHeight: 48,
    background: "#f3f4f6",
    color: C.body,
    border: "none",
    borderRadius: 12,
    padding: "13px",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
    fontFamily: "inherit"
  },
  toast(t) {
    return {
      position: "fixed",
      top: 14,
      left: "50%",
      transform: "translateX(-50%)",
      color: "#fff",
      fontWeight: 700,
      fontSize: 14,
      padding: "13px 22px",
      borderRadius: 14,
      background: t === "ok" ? C.ok : t === "info" ? C.warn : C.err,
      boxShadow: "0 8px 28px rgba(15,23,42,0.28)",
      zIndex: 9999,
      whiteSpace: "normal",
      maxWidth: "92vw",
      textAlign: "center",
      lineHeight: 1.4
    };
  },
  rep: {
    background: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadowCard,
    marginBottom: 16
  },
  repH: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: 14,
    color: C.body,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 10,
    marginBottom: 10
  },
  repRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    padding: "6px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  confirmBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: C.errSoft,
    border: "1.5px solid #ef4444",
    borderRadius: 12,
    padding: "8px 12px"
  },
  confirmOverlay: {
    position: "absolute",
    inset: 0,
    background: C.card,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    border: "1.5px solid #ef4444",
    zIndex: 10
  },
  statBox: {
    background: C.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: C.shadowCard,
    marginBottom: 14
  },
  statTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: C.body,
    marginBottom: 10
  }
};
