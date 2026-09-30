/**
 * src/60-styles.js — עיצוב (S).
 * חלק מחבילת הדפדפן של EV Charge Manager.
 * מחובר בסדר קבוע ע״י scripts/inject-app.mjs (ראה src/manifest.json).
 * אין import/export — שמות ברמה העליונה משותפים לכל הבאנדל (ארכיטקטורת סקריפט יחיד).
 */
// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#f8faff",
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
    color: "#0f172a"
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#0ea5c6",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    padding: "4px 10px",
    borderRadius: 8,
    fontFamily: "inherit"
  },
  main: {
    padding: "16px 16px 48px"
  },
  sumRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  sumCard: {
    flex: 1,
    background: "#fff",
    borderRadius: 14,
    padding: "12px 8px",
    display: "flex",
    alignItems: "center",
    gap: 7,
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)"
  },
  sumIcon: {
    fontSize: 18
  },
  sumVal: {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: -0.5
  },
  sumLbl: {
    fontSize: 11,
    color: "#64748b",
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
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    padding: "11px 4px",
    cursor: "pointer"
  },
  quietBtn: {
    flex: "1 1 108px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    color: "#334155",
    fontWeight: 600,
    fontSize: 13,
    padding: "10px 8px",
    cursor: "pointer",
    fontFamily: "inherit"
  },
  secTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 10
  },
  cGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  cCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
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
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
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
    fontSize: 11,
    color: "#9ca3af"
  },
  balBadge(d) {
    return {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 8,
      padding: "3px 8px",
      background: d ? "#fef3c7" : "#d1fae5",
      color: d ? "#b45309" : "#065f46"
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
    fontSize: 9,
    color: "#9ca3af",
    marginBottom: 1
  },
  mVal: {
    fontSize: 11,
    fontWeight: 700,
    color: "#374151"
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
    color: "#9ca3af"
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
      padding: "10px 0",
      fontSize: 13,
      color: a ? "#6366f1" : "#9ca3af",
      cursor: "pointer",
      fontWeight: a ? 700 : 500,
      borderBottom: a ? "2px solid #6366f1" : "none",
      marginBottom: a ? -2 : 0
    };
  },
  row: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 14px",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    position: "relative",
    overflow: "hidden"
  },
  rDate: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151"
  },
  rMeta: {
    fontSize: 11,
    color: "#9ca3af"
  },
  rCost: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2
  },
  rAmt: {
    fontSize: 15,
    fontWeight: 800
  },
  rPft: {
    fontSize: 11,
    fontWeight: 600,
    color: "#10b981"
  },
  rbadge(c) {
    return {
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 6px",
      borderRadius: 6,
      background: c + "22",
      color: c
    };
  },
  mBadge: {
    fontSize: 11,
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "2px 7px",
    borderRadius: 6,
    marginTop: 3,
    display: "inline-block"
  },
  empty: {
    textAlign: "center",
    color: "#64748b",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "22px 16px",
    fontSize: 14,
    lineHeight: 1.45
  },
  form: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    marginBottom: 16
  },
  fg: {
    marginBottom: 14
  },
  lbl: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 5
  },
  inp: {
    width: "100%",
    boxSizing: "border-box",
    border: "1.5px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    color: "#111827",
    background: "#fafafa",
    outline: "none"
  },
  rg: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap"
  },
  rlbl: {
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer"
  },
  errMsg: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 6
  },
  prev: {
    background: "#f9fafb",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 14
  },
  prevTitle: {
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
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
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer"
  },
  btnS: {
    flex: 1,
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer"
  },
  toast(t) {
    return {
      position: "fixed",
      bottom: 20,
      left: "50%",
      transform: "translateX(-50%)",
      color: "#fff",
      fontWeight: 700,
      fontSize: 14,
      padding: "12px 24px",
      borderRadius: 12,
      background: t === "ok" ? "#10b981" : t === "info" ? "#f59e0b" : "#ef4444",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      zIndex: 9999,
      whiteSpace: "normal",
      maxWidth: "92vw",
      textAlign: "center",
      lineHeight: 1.35
    };
  },
  rep: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    marginBottom: 16
  },
  repH: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: 13,
    color: "#374151",
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
    background: "#fef2f2",
    border: "1.5px solid #ef4444",
    borderRadius: 10,
    padding: "8px 12px"
  },
  confirmOverlay: {
    position: "absolute",
    inset: 0,
    background: "#fff",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    border: "1.5px solid #ef4444",
    zIndex: 10
  },
  statBox: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    marginBottom: 14
  },
  statTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 10
  }
};

