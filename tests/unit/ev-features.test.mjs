import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseManualTimeHHMM,
  combineDateWithTime,
  manualEndDateTime,
  wevoTxTimeMs,
  UNCATALOGUED_SINCE_MS,
  findUncataloguedCharges,
  wevoTxIsClosed,
  uncataloguedTxKey,
  wevoTxToOpenSession,
  findDuplicateSuspect,
  duplicateSuspectLabel,
  duplicateAssignDecision,
  waChargeMessage,
  waDebtPing,
  BILLING_PREMIUM_START_H,
  BILLING_PREMIUM_END_H
} from "../../lib/ev-money.mjs";

describe("שעות ידניות — פענוח HH:MM", () => {
  it("מפענח שעה תקינה", () => {
    assert.deepEqual(parseManualTimeHHMM("22:30"), { h: 22, m: 30 });
    assert.deepEqual(parseManualTimeHHMM("9:05"), { h: 9, m: 5 });
    assert.deepEqual(parseManualTimeHHMM("09:30"), { h: 9, m: 30 });
    assert.deepEqual(parseManualTimeHHMM(" 22:30 "), { h: 22, m: 30 });
  });
  it("דוחה פורמט לא תקין", () => {
    assert.equal(parseManualTimeHHMM("24:00"), null);
    assert.equal(parseManualTimeHHMM("22:60"), null);
    assert.equal(parseManualTimeHHMM("2230"), null);
    assert.equal(parseManualTimeHHMM(""), null);
    assert.equal(parseManualTimeHHMM("22-30"), null);
    assert.equal(parseManualTimeHHMM(null), null);
    assert.equal(parseManualTimeHHMM("22:3"), null);
  });
});

describe("שעות ידניות — שילוב תאריך ושעה", () => {
  it("משלב תאריך עם שעה ידנית", () => {
    assert.equal(combineDateWithTime("2026-09-28T10:00", "22:30"), "2026-09-28T22:30");
    assert.equal(combineDateWithTime("2026-09-28T10:00", "9:05"), "2026-09-28T09:05");
  });
  it("מחזיר ריק על קלט לא תקין", () => {
    assert.equal(combineDateWithTime("2026-09-28T10:00", "xx"), "");
    assert.equal(combineDateWithTime("", "22:30"), "");
    assert.equal(combineDateWithTime("2026-09-28T10:00", "25:00"), "");
  });
  it("שעת סיום ידנית באותו יום", () => {
    assert.equal(manualEndDateTime("2026-09-28T20:00", "23:30"), "2026-09-28T23:30");
  });
  it("שעת סיום ידנית גוללת ליממה הבאה כשהיא לפני ההתחלה", () => {
    assert.equal(manualEndDateTime("2026-09-28T22:00", "02:00"), "2026-09-29T02:00");
    assert.equal(manualEndDateTime("2026-09-28T22:00", "22:00"), "2026-09-29T22:00");
  });
  it("שעת סיום ידנית לא תקינה מחזירה ריק", () => {
    assert.equal(manualEndDateTime("2026-09-28T22:00", "bad"), "");
  });
});

describe("חלוקת חיוב יחסית פרימיום/רגיל", () => {
  it("חלון הפרימיום הוא 16:00–23:00", () => {
    assert.equal(BILLING_PREMIUM_START_H, 16);
    assert.equal(BILLING_PREMIUM_END_H, 23);
  });
});

describe("זיהוי טעינות לא מקוטלגות", () => {
  it("תחילת החלון היא 28.09.2026", () => {
    assert.equal(UNCATALOGUED_SINCE_MS, new Date(2026, 8, 28).getTime());
  });
  const sessions = [
    { id: "s1", wevoTxnId: "t1", date: "2026-09-29T10:05", kwhRaw: 20, costToOwner: 17.4, source: "manual" },
    { id: "s2", date: "2026-09-29T12:30", kwhRaw: 10.5, costToOwner: 9.14, source: "manual" },
    { id: "m1", wevoTxnId: "t6", date: "2026-09-29T15:00", kwhRaw: 8, costToOwner: 6.96, source: "wevo-sync" }
  ];
  const txs = [
    { transactionId: "t1", plugInTime: "2026-09-29T10:00", chargingFullTime: "2026-09-29T11:00", totalEnergyKwh: 20, totalCost: 17.4 },
    { transactionId: null, plugInTime: "2026-09-29T12:00", chargingFullTime: "2026-09-29T12:40", totalEnergyKwh: 10.5, totalCost: 9.14 },
    { transactionId: "t3", plugInTime: "2026-09-29T14:00", plugOutTime: "2026-09-29T15:30", totalEnergyKwh: 30, totalCost: 26.1 },
    { transactionId: "t4", plugInTime: "2026-09-20T10:00", chargingFullTime: "2026-09-20T11:00", totalEnergyKwh: 20, totalCost: 17.4 },
    { transactionId: "t5", plugInTime: "2026-09-29T10:00", totalEnergyKwh: 0, totalCost: 0 },
    { transactionId: "t6", plugInTime: "2026-09-29T15:05", chargeEndedAt: "2026-09-29T15:50", totalEnergyKwh: 8, totalCost: 6.96 }
  ];
  it("מחזיר רק טעינות לא מקוטלגות", () => {
    const out = findUncataloguedCharges(txs, sessions);
    const ids = out.map(t => t.transactionId);
    // t1 מותאם לפי txn · t2 מותאם לפי קוט״ש+סכום+זמן · t4 ישן מדי · t5 ריק · t6 רק מראה wevo-sync
    assert.deepEqual(ids, ["t3", "t6"]);
  });
  it("wevoTxIsClosed: סגורה רק עם חותמת סיום", () => {
    assert.equal(wevoTxIsClosed(null), false);
    assert.equal(wevoTxIsClosed({ transactionId: "x", plugInTime: "2026-09-29T10:00", totalEnergyKwh: 5 }), false);
    assert.equal(wevoTxIsClosed({ plugInTime: "2026-09-29T10:00", chargingFullTime: "2026-09-29T11:00" }), true);
    assert.equal(wevoTxIsClosed({ plugInTime: "2026-09-29T10:00", chargeEndedAt: "2026-09-29T11:00" }), true);
    assert.equal(wevoTxIsClosed({ plugInTime: "2026-09-29T10:00", plugOutTime: "2026-09-29T11:00" }), true);
  });
  it("uncataloguedTxKey: מפתח יציב לארכוב", () => {
    assert.equal(uncataloguedTxKey({ transactionId: 123 }), "123");
    assert.equal(uncataloguedTxKey({ transactionId: null, plugInTime: "2026-09-29T10:00" }), "tx-" + wevoTxTimeMs({ plugInTime: "2026-09-29T10:00" }));
    assert.equal(uncataloguedTxKey(null), "");
  });
  it("טעינה שעדיין מתקיימת (בלי חותמת סיום) לא מופיעה כלא מקוטלגת", () => {
    const open = [{ transactionId: "to", plugInTime: "2026-09-29T16:00", totalEnergyKwh: 12, totalCost: 10.4 }];
    const out = findUncataloguedCharges(open, sessions);
    assert.equal(out.length, 0);
  });
  it("עסקה רחוקה בזמן לא מותאמת גם עם קוט״ש וסכום זהים", () => {
    // 28.09 00:01 מול טעינה ב־29.09 12:30 = 36.5 שעות — מחוץ לחלון 36 השעות
    const far = [{ transactionId: "tf", plugInTime: "2026-09-28T00:01", chargingFullTime: "2026-09-28T01:00", totalEnergyKwh: 10.5, totalCost: 9.14 }];
    const out = findUncataloguedCharges(far, sessions);
    assert.equal(out.length, 1);
  });
});

describe("מיפוי עסקת Wevo לטעינה פתוחה", () => {
  it("ממפה את כל השדות לכרטיס הסיום", () => {
    const tx = {
      transactionId: 12345,
      plugInTime: "2026-09-29T20:00",
      chargingFullTime: "2026-09-29T22:30",
      totalEnergyKwh: 25.5,
      totalCost: 22.19,
      electricityCost: 15.1
    };
    const open = wevoTxToOpenSession(tx, "c1");
    assert.equal(open.clientId, "c1");
    assert.equal(open.source, "wevo-live");
    assert.equal(open.wevoTxnId, "12345");
    assert.equal(open.startDate, "2026-09-29T20:00");
    assert.equal(open.plugInAt, "2026-09-29T20:00");
    assert.equal(open.chargeEndedAt, "2026-09-29T22:30");
    assert.equal(open.endDate, "2026-09-29T22:30");
    assert.equal(open.liveKwh, 25.5);
    assert.equal(open.liveWevoCost, 22.19);
    assert.equal(open.liveElecCost, 15.1);
    assert.equal(open.readyToComplete, true);
    assert.equal(open.wevoEnded, true);
    assert.equal(open.notes, "txn#12345");
  });
  it("עסקה בלי מזהה לא נשברת", () => {
    const open = wevoTxToOpenSession({ plugInTime: "2026-09-29T20:00", totalEnergyKwh: 5, totalCost: 4.35 }, "c9");
    assert.equal(open.wevoTxnId, null);
    assert.equal(open.notes, "");
    assert.equal(open.clientId, "c9");
  });
});

describe("חותמת זמן של עסקת Wevo", () => {
  it("מעדיף חיבור כבל, נופל לסיום טעינה", () => {
    const plug = new Date(2026, 8, 29, 20, 0).getTime();
    assert.equal(wevoTxTimeMs({ plugInTime: plug, chargingFullTime: plug + 3600000 }), plug);
    assert.equal(wevoTxTimeMs({ chargingFullTime: plug }), plug);
    assert.equal(wevoTxTimeMs({}), 0);
    assert.equal(wevoTxTimeMs(null), 0);
  });
});

describe("הגנה מפני כפילות בשיוך טעינה לא מקוטלגת", () => {
  const tx = (over = {}) => ({
    transactionId: "tx-1",
    plugInTime: "2026-09-28T10:00",
    totalEnergyKwh: 20,
    totalCost: 50,
    ...over
  });
  const sess = (over = {}) => ({
    id: "s1",
    clientId: "c1",
    date: "2026-09-28T10:05",
    kwhRaw: 20,
    amountBilled: 50,
    source: "manual",
    ...over
  });

  it("(א) מזהה חשד כפילות לפי חפיפת זמן — גם אחרי עריכת ערכי הטעינה", () => {
    // המשתמש ערך קוט"ש/סכום (20→22, 50→55): ההתאמה המלאה נשברה, אבל הזמן חופף
    const s = findDuplicateSuspect([sess({ kwhRaw: 22, amountBilled: 55 })], "c1", tx());
    assert.ok(s, "ציפינו לחשד כפילות");
    assert.equal(s.id, "s1");
  });

  it("(א2) אין חשד כפילות כשהתאריכים במרווח של מעל יומיים — גם עם קוט״ש דומה", () => {
    const s = findDuplicateSuspect(
      [sess({ date: "2026-09-20T10:00", kwhRaw: 20.02, amountBilled: 99 })],
      "c1",
      tx()
    );
    assert.equal(s, null);
  });

  it("(א2ב) מזהה חשד לפי קוט״ש דומה כשהתאריכים בתוך יומיים", () => {
    const s = findDuplicateSuspect(
      [sess({ date: "2026-09-27T10:00", kwhRaw: 20.02, amountBilled: 99 })],
      "c1",
      tx()
    );
    assert.ok(s, "ציפינו לחשד כפילות לפי קוט״ש דומה");
  });

  it("(א3) שורות מראה wevo-sync אינן חשודות", () => {
    const s = findDuplicateSuspect([sess({ source: "wevo-sync" })], "c1", tx());
    assert.equal(s, null);
  });

  it("(ב) אין אזהרה כשאין חפיפה ואין ערכים דומים", () => {
    const s = findDuplicateSuspect(
      [sess({ date: "2026-09-20T10:00", kwhRaw: 5, amountBilled: 12 })],
      "c1",
      tx()
    );
    assert.equal(s, null);
  });

  it("(ב2) טעינות של לקוח אחר לא נבדקות", () => {
    const s = findDuplicateSuspect([sess()], "c2", tx());
    assert.equal(s, null);
  });

  it("(ג) החיוב נוצר רק אחרי אישור מפורש", () => {
    assert.equal(duplicateAssignDecision({ id: "s1" }, false), "warn");
    assert.equal(duplicateAssignDecision({ id: "s1" }, true), "assign");
    assert.equal(duplicateAssignDecision(null, false), "assign");
    assert.equal(duplicateAssignDecision(null, true), "assign");
  });

  it("תווית החשד מכילה תאריך וקוט\"ש", () => {
    const label = duplicateSuspectLabel(sess());
    assert.ok(label.includes("28.09") || label.includes("28/09"), `התווית חסרת תאריך: ${label}`);
    assert.ok(label.includes("20"), `התווית חסרת קוט"ש: ${label}`);
  });
});

describe("הודעת וואטסאפ — בלי כפילות סכום ללקוח חדש", () => {
  it("טעינה ראשונה (אין חוב קודם): הסכום מופיע פעם אחת בלבד", () => {
    const msg = waChargeMessage(50, 50);
    assert.equal(msg, "היי מה קורה?\nיצא לך 50");
    assert.equal((msg.match(/50/g) || []).length, 1, `כפילות בהודעה: ${msg}`);
  });

  it("חוב קודם מעבר לטעינה: שתי שורות עם סכומים שונים", () => {
    assert.equal(waChargeMessage(50, 80), "היי מה קורה?\nיצא בטעינה 50\nאנחנו על 80");
  });

  it("יתרת זכות: שורת זכות", () => {
    assert.equal(waChargeMessage(50, -20), "היי מה קורה?\nיצא לך 50\nיש לך אצלי 20");
  });

  it("מסולק: שורה אחת", () => {
    assert.equal(waChargeMessage(50, 0), "היי מה קורה?\nיצא לך 50");
  });

  it("לקוח עצמי: שורה אחת", () => {
    assert.equal(waChargeMessage(50, 999, { isSelf: true }), "היי מה קורה?\nיצא לך 50");
  });

  it("waDebtPing עם טעינה אחרונה ששווה ליתרה — בלי כפילות", () => {
    const msg = waDebtPing(50, 50);
    assert.equal(msg, "היי מה קורה?\nיצא לך 50");
    assert.equal((msg.match(/50/g) || []).length, 1, `כפילות בהודעה: ${msg}`);
  });

  it("waDebtPing בלי טעינה אחרונה — תזכורת חוב", () => {
    assert.equal(waDebtPing(80, 0), "היי מה קורה?\nאנחנו על 80");
  });
});
