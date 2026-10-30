import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  peakOverlapMinutes,
  ownerPeakOverlapMinutes,
  ownerPeakWindowFor,
  calcSessionWithConfig,
  timelinePoints,
  pointAt,
  pickMaxBillWindowWithConfig
} from "../../lib/ev-pricing.mjs";

// תצורת בדיקה מפורשת — החלונות: גבייה 16:00–23:00 (קבועי lib),
// פיק בעלים 17:00–23:00 (מהתצורה).
const CFG = {
  ratePremium: 3,
  rateRegular: 1.5,
  ownerPeak: 2,
  ownerOff: 1,
  ownerPeakStartMin: 17 * 60,
  ownerPeakEndMin: 23 * 60,
  inflation: 1.2
};

// 2026-10-28 ד׳, 29 ה׳, 30 ו׳, 31 שבת, 2026-11-01 א׳ (אומת מול לוח השנה)
const d = (day, h, m = 0) => new Date(2026, 9, day, h, m); // אוקטובר 2026
const dNov = (day, h, m = 0) => new Date(2026, 10, day, h, m); // נובמבר 2026

describe("peakOverlapMinutes", () => {
  it("חפיפה חלקית באותו יום", () => {
    assert.equal(peakOverlapMinutes(d(28, 15), d(28, 18), 16 * 60, 23 * 60), 120);
  });
  it("חלון חוצה חצות (endMin מעל 1440)", () => {
    assert.equal(peakOverlapMinutes(d(28, 21), d(29, 3), 22 * 60, 26 * 60), 240);
  });
  it("סוף לפני התחלה → 0", () => {
    assert.equal(peakOverlapMinutes(d(28, 18), d(28, 15), 16 * 60, 23 * 60), 0);
  });
  it("חפיפת פרימיום ביום הראשון נשמרת בחציית חצות (H3)", () => {
    // ד׳ 15:00 → ה׳ 17:30: פרימיום ד׳ 16:00–23:00 (420) + ה׳ 16:00–17:30 (90)
    assert.equal(peakOverlapMinutes(d(28, 15), d(29, 17, 30), 16 * 60, 23 * 60), 510);
  });
});

describe("ownerPeakOverlapMinutes (M1)", () => {
  it("מדלג על שישי ושבת — רק חמישי נספר", () => {
    // ה׳ 16:00 → שבת 16:00: רק ה׳ 17:00–23:00 = 360
    assert.equal(ownerPeakOverlapMinutes(d(29, 16), d(31, 16), 17 * 60, 23 * 60), 360);
    // לעומת החפיפה הגולמית שסופרת גם את שישי (שבת 17:00 כבר אחרי הסיום)
    assert.equal(peakOverlapMinutes(d(29, 16), d(31, 16), 17 * 60, 23 * 60), 720);
  });
  it("שבת בלבד → 0", () => {
    assert.equal(ownerPeakOverlapMinutes(d(31, 10), d(31, 20), 17 * 60, 23 * 60), 0);
  });
  it("ראשון נספר כרגיל", () => {
    assert.equal(ownerPeakOverlapMinutes(dNov(1, 16), dNov(1, 20), 17 * 60, 23 * 60), 180);
  });
});

describe("ownerPeakWindowFor", () => {
  it("תצורה תקינה עוברת כמו שהיא", () => {
    assert.deepEqual(ownerPeakWindowFor(CFG), { startMin: 1020, endMin: 1380 });
  });
  it("תצורה פגומה או חסרה → ברירת מחדל 17:00–23:00", () => {
    assert.deepEqual(ownerPeakWindowFor(null), { startMin: 1020, endMin: 1380 });
    assert.deepEqual(ownerPeakWindowFor({ ownerPeakStartMin: 500, ownerPeakEndMin: 400 }), { startMin: 1020, endMin: 1380 });
  });
});

describe("calcSessionWithConfig", () => {
  it("רגיל בלבד", () => {
    const r = calcSessionWithConfig(CFG, 10, d(28, 10), d(28, 12));
    assert.equal(r.kwhInflated, 12);
    assert.equal(r.rate, 1.5);
    assert.equal(r.amountBilled, 18);
    assert.equal(r.costToOwner, 10);
    assert.equal(r.profit, 8);
    assert.equal(r.premiumRatio, 0);
    assert.equal(r.rateLabel, "רגיל");
  });
  it("פרימיום בלבד — לקוח ובעלים", () => {
    const r = calcSessionWithConfig(CFG, 10, d(28, 18), d(28, 20));
    assert.equal(r.rate, 3);
    assert.equal(r.amountBilled, 36);
    assert.equal(r.costToOwner, 20);
    assert.equal(r.profit, 16);
    assert.equal(r.premiumRatio, 1);
    assert.equal(r.rateLabel, "פרימיום");
  });
  it("משולב — יחס פרימיום לפי חפיפה אמיתית", () => {
    const r = calcSessionWithConfig(CFG, 10, d(28, 15), d(28, 18));
    assert.equal(r.premiumRatio, 0.67);
    assert.equal(r.isMixed, true);
    assert.equal(r.rate, 2.5);
    assert.equal(r.amountBilled, 30);
    assert.equal(r.costToOwner, 13.33);
    assert.equal(r.profit, 16.67);
  });
  it("חציית חצות — פרימיום של היום הראשון לא הולך לאיבוד (H3)", () => {
    const r = calcSessionWithConfig(CFG, 20, d(28, 22), d(29, 2));
    assert.equal(r.premiumRatio, 0.25);
    assert.equal(r.rate, 1.875);
    assert.equal(r.amountBilled, 45);
    assert.equal(r.costToOwner, 25);
  });
  it("forceReg גובר על שעות פרימיום (עלות הבעלים לא משתנה)", () => {
    const r = calcSessionWithConfig(CFG, 10, d(28, 18), d(28, 20), true);
    assert.equal(r.rate, 1.5);
    assert.equal(r.amountBilled, 18);
    assert.equal(r.costToOwner, 20);
  });
  it("forcePrem גובר על שעות רגילות", () => {
    const r = calcSessionWithConfig(CFG, 10, d(28, 10), d(28, 12), false, true);
    assert.equal(r.rate, 3);
    assert.equal(r.premiumRatio, 1);
    assert.equal(r.amountBilled, 36);
    assert.equal(r.costToOwner, 10);
  });
  it("תעריף מותאם", () => {
    const r = calcSessionWithConfig(CFG, 10, d(28, 10), d(28, 12), false, false, 2.2);
    assert.equal(r.rate, 2.2);
    assert.equal(r.rateLabel, "מותאם");
    assert.equal(r.amountBilled, 27);
  });
  it("משך אפס — סיווג היסטורי לפי שעת ההתחלה", () => {
    const prem = calcSessionWithConfig(CFG, 10, d(28, 18), d(28, 18));
    assert.equal(prem.rate, 3);
    const reg = calcSessionWithConfig(CFG, 10, d(28, 10), d(28, 10));
    assert.equal(reg.rate, 1.5);
  });
  it("אינפלציה חסרה בתצורה → ברירת מחדל 1.21", () => {
    const noInf = { ...CFG };
    delete noInf.inflation;
    const r = calcSessionWithConfig(noInf, 100, d(28, 10), d(28, 12));
    assert.equal(r.kwhInflated, 121);
  });
  it("M1: חמישי→שבת — עלות בעלים רק על פיק חמישי", () => {
    const r = calcSessionWithConfig(CFG, 48, d(29, 16), d(31, 16));
    assert.equal(r.ownerRate, 1.125);
    assert.equal(r.costToOwner, 54);
  });
  it("M1: שבת→ראשון — פיק ראשון כן נספר", () => {
    const r = calcSessionWithConfig(CFG, 28, d(31, 16), dNov(1, 20));
    assert.equal(r.ownerRate, 1.107);
    assert.equal(r.costToOwner, 31);
  });
  it("סופ״ש בלבד — עלות בעלים שטוחה, גביית פרימיום רגילה", () => {
    const r = calcSessionWithConfig(CFG, 10, d(30, 18), d(30, 21));
    assert.equal(r.rate, 3);
    assert.equal(r.costToOwner, 10);
  });
});

describe("timelinePoints + pointAt", () => {
  const tl = {
    plugInAt: "2026-10-28T15:00:00",
    chargeStartAt: "2026-10-28T15:30:00",
    chargeEndAt: "2026-10-28T18:00:00",
    plugOutAt: "2026-10-28T23:30:00"
  };
  it("ארבע נקודות בסדר עם תוויות", () => {
    const pts = timelinePoints(tl);
    assert.deepEqual(pts.map(p => p.key), ["plugIn", "chargeStart", "chargeEnd", "plugOut"]);
    assert.equal(pts[0].label, "חיבור כבל");
  });
  it("נקודות חסרות מסוננות; null → []", () => {
    assert.deepEqual(timelinePoints({ plugInAt: tl.plugInAt }).map(p => p.key), ["plugIn"]);
    assert.deepEqual(timelinePoints(null), []);
  });
  it("pointAt מחזיר לפי מפתח; לא מוכר → null", () => {
    assert.equal(pointAt(tl, "chargeEnd"), tl.chargeEndAt);
    assert.equal(pointAt(tl, "bogus"), null);
    assert.equal(pointAt(null, "plugIn"), null);
  });
});

describe("pickMaxBillWindowWithConfig", () => {
  it("בוחר את החלון הרווחי ביותר מבין הארבעה הקנוניים", () => {
    const tl = {
      plugInAt: d(28, 15).getTime(),
      chargeStartAt: d(28, 15, 30).getTime(),
      chargeEndAt: d(28, 18).getTime(),
      plugOutAt: d(28, 23, 30).getTime()
    };
    const best = pickMaxBillWindowWithConfig(CFG, 10, tl);
    assert.equal(best.startKey, "chargeStart");
    assert.equal(best.endKey, "plugOut");
    assert.equal(best.calc.amountBilled, 34);
  });
  it("H2: חלון לא־קנוני (התחלה ב־chargeEnd) לא נשקל גם אם היה רווחי יותר", () => {
    const tl = {
      plugInAt: d(28, 10).getTime(),
      chargeStartAt: d(28, 10, 30).getTime(),
      chargeEndAt: d(28, 22).getTime(),
      plugOutAt: d(28, 23).getTime()
    };
    const best = pickMaxBillWindowWithConfig(CFG, 10, tl);
    assert.equal(best.startKey, "chargeStart");
    assert.equal(best.endKey, "plugOut");
    assert.equal(best.calc.amountBilled, 29);
  });
  it("נקודות חסרות מדולגות; אין זוג תקין → null", () => {
    const tl = { plugInAt: d(28, 15).getTime(), plugOutAt: d(28, 23, 30).getTime() };
    const best = pickMaxBillWindowWithConfig(CFG, 10, tl);
    assert.equal(best.startKey, "plugIn");
    assert.equal(best.endKey, "plugOut");
    assert.equal(pickMaxBillWindowWithConfig(CFG, 10, { plugInAt: d(28, 15).getTime() }), null);
    assert.equal(pickMaxBillWindowWithConfig(CFG, 0, tl), null);
    assert.equal(pickMaxBillWindowWithConfig(CFG, 10, null), null);
  });
  it("חריגה מפורשת ב־opts מכובדת (startKeys/endKeys)", () => {
    const tl = {
      plugInAt: d(28, 15).getTime(),
      chargeEndAt: d(28, 18).getTime()
    };
    const best = pickMaxBillWindowWithConfig(CFG, 10, tl, { startKeys: ["plugIn"], endKeys: ["chargeEnd"] });
    assert.equal(best.startKey, "plugIn");
    assert.equal(best.endKey, "chargeEnd");
    assert.equal(best.calc.amountBilled, 30);
  });
});
