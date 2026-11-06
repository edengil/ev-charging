import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  tariffTimeToMinutes,
  extractTariffRanges,
  normalizeWevoTariff
} from "../../lib/ev-tariff.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("נרמול תעריף Wevo — המרת זמנים", () => {
  it("שניות־מיום כמו של Wevo (82800 = 23:00)", () => {
    assert.equal(tariffTimeToMinutes(82800), 23 * 60);
    assert.equal(tariffTimeToMinutes(61200), 17 * 60);
    assert.equal(tariffTimeToMinutes(0), 0);
  });
  it("דקות־מיום ומחרוזות HH:mm", () => {
    assert.equal(tariffTimeToMinutes(1020), 17 * 60);
    assert.equal(tariffTimeToMinutes("17:00"), 17 * 60);
    assert.equal(tariffTimeToMinutes("22:30"), 22 * 60 + 30);
    assert.equal(tariffTimeToMinutes("bad"), null);
    assert.equal(tariffTimeToMinutes(null), null);
  });
});

describe("נרמול תעריף Wevo — חלון הפיק", () => {
  it("חלון הפיק נגזר מהלוח: 17:00–22:00 בדקות", () => {
    const body = {
      tariff: {
        rateDetails: { status: 200, json: null },
        variableRanges: {
          status: 200,
          json: [
            { startTime: 0, endTime: 61200, rate: 0.8 },
            { startTime: 61200, endTime: 79200, rate: 0.86 },
            { startTime: 79200, endTime: 86400, rate: 0.8 }
          ]
        }
      }
    };
    const r = normalizeWevoTariff(body);
    assert.equal(r.ownerPeakStartMin, 17 * 60);
    assert.equal(r.ownerPeakEndMin, 22 * 60);
  });

  it("בלי לוח שעות (סקלרים בלבד) חלון הפיק הוא null", () => {
    const r = normalizeWevoTariff({
      tariff: {
        rateDetails: { status: 200, json: { premiumRate: 0.86, standardRate: 0.8 } },
        variableRanges: { status: 500, json: null }
      }
    });
    assert.equal(r.ok, true);
    assert.equal(r.ownerPeakStartMin, null);
    assert.equal(r.ownerPeakEndMin, null);
  });
});

describe("נרמול תעריף Wevo — טווחים", () => {
  it("טווחי שניות־מיום (צורת variable-cost-ranges)", () => {
    const body = {
      ok: true,
      action: "tariff",
      tariff: {
        rateDetails: { status: 200, json: null },
        variableRanges: {
          status: 200,
          json: [
            { startTime: 0, endTime: 61200, rate: 0.8 },
            { startTime: 61200, endTime: 79200, rate: 0.86 },
            { startTime: 79200, endTime: 86400, rate: 0.8 }
          ]
        }
      }
    };
    const r = normalizeWevoTariff(body);
    assert.equal(r.ok, true);
    assert.equal(r.source, "variable-cost-ranges");
    assert.equal(r.ownerPeak, 0.86);
    assert.equal(r.ownerOff, 0.8);
    assert.equal(r.ranges[1].startMin, 17 * 60);
    assert.equal(r.ranges[1].endMin, 22 * 60);
  });

  it("chargingRateRanges עם מחרוזות שעה (צורת rate-details)", () => {
    const body = {
      tariff: {
        rateDetails: {
          status: 200,
          json: {
            tariffName: "ביתי",
            currency: "ILS",
            chargingRateRanges: [
              { startTime: "00:00", endTime: "17:00", rate: 0.8 },
              { startTime: "17:00", endTime: "22:00", rate: 0.86 }
            ]
          }
        },
        variableRanges: { status: 404, json: null }
      }
    };
    const r = normalizeWevoTariff(body);
    assert.equal(r.ok, true);
    assert.equal(r.source, "rate-details");
    assert.equal(r.ownerPeak, 0.86);
    assert.equal(r.ownerOff, 0.8);
    assert.equal(r.ranges.length, 2);
  });

  it("טווח חוצה חצות מקבל סיום מעבר ל־1440", () => {
    const r = extractTariffRanges([
      { startTime: "22:00", endTime: "17:00", rate: 0.8 }
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0].startMin, 22 * 60);
    assert.equal(r[0].endMin, 17 * 60 + 1440);
  });

  it("תעריפים בודדים בלי טווחים (premiumRate/standardRate)", () => {
    const body = {
      tariff: {
        rateDetails: { status: 200, json: { premiumRate: 0.86, standardRate: 0.8, idleFee: 2.5 } },
        variableRanges: { status: 500, json: null }
      }
    };
    const r = normalizeWevoTariff(body);
    assert.equal(r.ok, true);
    assert.equal(r.ownerPeak, 0.86);
    assert.equal(r.ownerOff, 0.8);
  });

  it("תשובה ריקה או שגויה — ok:false, בלי ערכים", () => {
    const empty = normalizeWevoTariff({ tariff: { rateDetails: { status: 404, json: null }, variableRanges: { status: 404, json: null } } });
    assert.equal(empty.ok, false);
    assert.equal(empty.ownerPeak, null);
    assert.equal(empty.ownerOff, null);
    assert.equal(normalizeWevoTariff(null).ok, false);
    assert.equal(normalizeWevoTariff({}).ok, false);
  });

  it("ברירות מחדל של עלות הבעלים מיושרות לספר הרשמי (תעריף ביתי אחיד, 1.7.2026)", () => {
    // ספר חח״י מהדורת יולי 2026: ביתי אחיד 53.83 אג׳ לפני מע״מ = 0.6352 ₪
    // כולל מע״מ בכל שעה. בייצור לוח Wevo דורס בכל סנכרון; ברירת המחדל היא
    // רק גיבוי למצב שלפני סנכרון ראשון. מהדורת הספר הבאה: 1.1.2027.
    const src = readFileSync(join(root, "src/10-pricing.js"), "utf8");
    assert.match(src, /ownerPeak: 0\.6352,/);
    assert.match(src, /ownerOff: 0\.6352,/);
  });
});
