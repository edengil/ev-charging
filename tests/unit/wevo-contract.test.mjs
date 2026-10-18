import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveChargeTimeline,
  pickLiveChargeEndMs,
  pickFinishedWevoTx
} from "../../lib/ev-money.mjs";

// בדיקות חוזה מול צורת הנתונים האמיתית של Wevo (א3, 18.10.2026).
// ה־fixtures חולצו מדוח זהות אמיתי (16.08.2026) וצונזרו; מטריצת השדות
// אומתה מול המקור. אם Wevo תשנה סכמה — הבדיקות האלו אמורות לצפצף ראשונות.
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fx = name => JSON.parse(readFileSync(join(root, "tests/fixtures/wevo", name), "utf8"));
const wsState = fx("ws-state-sample.json");
const restOngoing = fx("rest-ongoing-tx.json");
const restFinished = fx("rest-finished-tx.json");
const txOf = sample => sample.transactionData || sample;

describe("Wevo contract — מטריצת שדות לפי ערוץ", () => {
  it("לעסקת REST גמורה אין chargingFullTime — הסיום חייב לבוא מרמזים", () => {
    assert.equal("chargingFullTime" in restFinished, false);
    assert.equal("plugInTime" in restFinished, true);
    assert.equal("plugOutTime" in restFinished, true);
    assert.equal("netDuration" in restFinished, true);
  });

  it("ל־WS transactionData אין plugInTime/plugOutTime/netDuration — אבל יש chargingFullTime", () => {
    const tx = txOf(wsState);
    assert.equal("plugInTime" in tx, false);
    assert.equal("plugOutTime" in tx, false);
    assert.equal("netDuration" in tx, false);
    assert.equal("chargingFullTime" in tx, true);
    assert.equal("didCompleteFull" in tx, true);
  });

  it("עסקה רצה: plugOutTime=0 ו־stopReason=null הם 'עדיין מחובר', לא epoch", () => {
    assert.equal(restOngoing.plugOutTime, 0);
    assert.equal(restOngoing.stopReason, null);
    const tl = resolveChargeTimeline(restOngoing, {});
    assert.equal(tl.plugOutAt, null);
  });

  it("didCompleteFull קיים בכל שלושת הערוצים", () => {
    assert.equal("didCompleteFull" in txOf(wsState), true);
    assert.equal("didCompleteFull" in restOngoing, true);
    assert.equal("didCompleteFull" in restFinished, true);
  });
});

describe("Wevo contract — התנהגות הקוד על צורות אמיתיות", () => {
  it("עסקת REST גמורה בלי רמזים: הסיום נופל להוצאת הכבל (הפער המבני המתועד)", () => {
    const tl = resolveChargeTimeline(restFinished, {});
    assert.equal(tl.plugOutAt, "2026-01-15T20:54");
    assert.equal(tl.chargeEndAt, "2026-01-15T20:54");
  });

  it("אותה עסקה עם רמז chargingFullTime מהרשומה: הסיום הוא חותמת ה־full", () => {
    const tl = resolveChargeTimeline(restFinished, { chargingFullTime: "2026-01-15T20:20" });
    assert.equal(tl.chargeEndAt, "2026-01-15T20:20");
    // netDuration בשניות (19260 = 5:21) — ההתחלה נגזרת ל־14:59
    assert.equal(tl.chargeStartAt, "2026-01-15T14:59");
    assert.equal(tl.netMins, 321);
  });

  it("דגימת WS עם didCompleteFull לוכדת סיום גם במצב SuspendedEV", () => {
    const tx = txOf(wsState);
    // ה־fixture הוא דגימת אמצע־טעינה (didCompleteFull=false); כאן מדמים את רגע
    // ה־full עם אותה חותמת בצורת epoch-ms כפי שהערוץ החי נושא אותה.
    const st = {
      state: "SuspendedEV",
      didCompleteFull: true,
      chargingFullTime: tx.chargingFullTime
    };
    const endMs = pickLiveChargeEndMs(st, {}, restFinished.plugInTime);
    assert.equal(endMs, tx.chargingFullTime);
  });

  it("pickFinishedWevoTx: עסקה גמורה מתקבלת לפי מזהה, רצה לא נסגרת כגמורה בלי סימני סיום", () => {
    const open = { wevoTxnId: String(restFinished.transactionId), plugInAt: "2026-01-15T14:14" };
    assert.equal(pickFinishedWevoTx([restFinished], open)?.transactionId, restFinished.transactionId);
    const openOngoing = { wevoTxnId: String(restOngoing.transactionId), plugInAt: "2026-01-15T14:14" };
    // לעסקה הרצה יש isOngoing ואין plugOutTime/stopReason — לא תיבחר כגמורה
    assert.equal(pickFinishedWevoTx([restOngoing], openOngoing), null);
  });
});

describe("ב2 — דגל סיום מקורב בשדות הסגירה (שומר מקור)", () => {
  it("txToEndFields מחזיר endApprox כשאין שום מקור סיום פיזי, ולא כשיש חותמת", () => {
    const src = readFileSync(join(root, "src/40-wevo-sync.js"), "utf8");
    assert.match(src, /endApprox: !\(fallback\.verifiedEndAt \|\| fallback\.chargeEndedAt/);
    const sync = readFileSync(join(root, "src/views/wevo-live-sync.js"), "utf8");
    assert.match(sync, /endApprox: !!fields\.endApprox/);
    assert.match(sync, /endApprox: !!fetched\.endApprox/);
  });

  it("באנר המוכנות מציג אזהרת סיום מקורב", () => {
    const src = readFileSync(join(root, "src/views/dashboard.js"), "utf8");
    assert.match(src, /o\.endApprox/);
    assert.match(src, /שעת הסיום מקורבת/);
  });
});
