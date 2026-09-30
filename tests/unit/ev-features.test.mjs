import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseManualTimeHHMM,
  combineDateWithTime,
  manualEndDateTime,
  wevoTxTimeMs,
  UNCATALOGUED_SINCE_MS,
  findUncataloguedCharges,
  wevoTxToOpenSession,
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
    { transactionId: "t1", plugInTime: "2026-09-29T10:00", totalEnergyKwh: 20, totalCost: 17.4 },
    { transactionId: null, plugInTime: "2026-09-29T12:00", totalEnergyKwh: 10.5, totalCost: 9.14 },
    { transactionId: "t3", plugInTime: "2026-09-29T14:00", totalEnergyKwh: 30, totalCost: 26.1 },
    { transactionId: "t4", plugInTime: "2026-09-20T10:00", totalEnergyKwh: 20, totalCost: 17.4 },
    { transactionId: "t5", plugInTime: "2026-09-29T10:00", totalEnergyKwh: 0, totalCost: 0 },
    { transactionId: "t6", plugInTime: "2026-09-29T15:05", totalEnergyKwh: 8, totalCost: 6.96 }
  ];
  it("מחזיר רק טעינות לא מקוטלגות", () => {
    const out = findUncataloguedCharges(txs, sessions);
    const ids = out.map(t => t.transactionId);
    // t1 מותאם לפי txn · t2 מותאם לפי קוט״ש+סכום+זמן · t4 ישן מדי · t5 ריק · t6 רק מראה wevo-sync
    assert.deepEqual(ids, ["t3", "t6"]);
  });
  it("עסקה רחוקה בזמן לא מותאמת גם עם קוט״ש וסכום זהים", () => {
    // 28.09 00:01 מול טעינה ב־29.09 12:30 = 36.5 שעות — מחוץ לחלון 36 השעות
    const far = [{ transactionId: "tf", plugInTime: "2026-09-28T00:01", totalEnergyKwh: 10.5, totalCost: 9.14 }];
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
