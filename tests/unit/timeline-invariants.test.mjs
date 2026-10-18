import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveChargeTimeline } from "../../lib/ev-money.mjs";

// א2 (18.10.2026) — מטריצת אינווריאנטים של ציר הזמן.
// כל שורה היא כלל שהקוד חייב לקיים תמיד, מנוסח מהתנהגות הקוד בפועל
// (resolveChargeTimeline) ומתקריות הייצור 12–17.10. שינוי ששובר שורה כאן
// הוא רגרסיה בהגדרה — לא "התנהגות חדשה".
// בסיס זמן: חיבור 10:00, התחלת זרם 10:45 (נטו 5:15), סיום זרם 16:00, הוצאה 16:40.
const TX = {
  plugInTime: new Date("2026-01-15T10:00").getTime(),
  plugOutTime: new Date("2026-01-15T16:40").getTime(),
  netDuration: 5 * 3600 + 15 * 60,
  didCompleteFull: true,
  stopReason: "EVDisconnected"
};

describe("אינווריאנטים — סדר וגבולות", () => {
  it("סיום הזרם לעולם לא אחרי הוצאת הכבל, גם עם רמז סיום מאוחר יותר", () => {
    const tl = resolveChargeTimeline(TX, { chargeEndedAt: "2026-01-15T18:30" });
    assert.ok(tl.chargeEndAt <= tl.plugOutAt, `${tl.chargeEndAt} <= ${tl.plugOutAt}`);
    assert.equal(tl.chargeEndAt, "2026-01-15T16:40"); // נחתך להוצאה
  });

  it("finalEndAt (סיום מאומת) תוחם את הסיום מלמעלה — מקרה 12.10", () => {
    const tl = resolveChargeTimeline(TX, {
      chargeEndedAt: "2026-01-15T18:30",
      finalEndAt: "2026-01-15T16:00"
    });
    assert.equal(tl.chargeEndAt, "2026-01-15T16:00");
  });

  it("זמן החיבור: רמז שמור גובר על זמן העסקה; chargeStartedAt לעולם לא מזיז חיבור", () => {
    // chargeStartedAt מאוחר (10:45) אסור שיזיז את החיבור קדימה
    const tl = resolveChargeTimeline(TX, { chargeStartedAt: "2026-01-15T10:45" });
    assert.equal(tl.plugInAt, "2026-01-15T10:00");
    // רמז חיבור שמור מקבל עדיפות על זמן החיבור של העסקה
    const tl2 = resolveChargeTimeline(TX, { plugInAt: "2026-01-15T09:58" });
    assert.equal(tl2.plugInAt, "2026-01-15T09:58");
  });

  it("פער חיבור־נטו ≥ 20 דקות נחשב המתנה לפני ההתחלה: הטעינה נגמרת בהוצאה", () => {
    // TX: חיבור 6:40, נטו 5:15 → פער 85 דקות (טעינה מתוזמנת/מושהית)
    const tl = resolveChargeTimeline(TX, {});
    assert.equal(tl.chargeEndAt, "2026-01-15T16:40");
    assert.equal(tl.chargeStartAt, "2026-01-15T11:25"); // plugOut − net
  });

  it("פער < 20 דקות נחשב המתנה בסוף: ההתחלה היא החיבור, הסיום חיבור+נטו", () => {
    const tx = { ...TX, plugOutTime: new Date("2026-01-15T15:20").getTime() }; // פער 5 דקות
    const tl = resolveChargeTimeline(tx, {});
    assert.equal(tl.chargeStartAt, "2026-01-15T10:00");
    assert.equal(tl.chargeEndAt, "2026-01-15T15:15");
  });

  it("נטו העסקה נשמר: סיום פחות התחלה שווה ל־netDuration של Wevo", () => {
    const tl = resolveChargeTimeline(TX, { chargingFullTime: "2026-01-15T16:00" });
    assert.equal(tl.netMins, 315);
    assert.equal(tl.chargeStartAt, "2026-01-15T10:45");
    assert.equal(tl.chargeEndAt, "2026-01-15T16:00");
  });
});

describe("אינווריאנטים — נפילות מבוקרות (fallbacks מתועדים)", () => {
  it("רק plugOut ידוע (בלי נטו ובלי full): כל חלון החיבור נחשב טעינה", () => {
    const bare = { plugInTime: TX.plugInTime, plugOutTime: TX.plugOutTime, stopReason: "EVDisconnected" };
    const tl = resolveChargeTimeline(bare, {});
    assert.equal(tl.chargeStartAt, "2026-01-15T10:00");
    assert.equal(tl.chargeEndAt, "2026-01-15T16:40");
  });

  it("endDate אינו קלט של ציר הזמן — ההמרה לחלון חיוב נעשית במעלה הזרם (txToEndFields)", () => {
    // resolveChargeTimeline מתעלם מ־endDate; בלי מקור סיום אחר חל כלל הפער:
    // פער 85 דקות → סיום בהוצאת הכבל. (באשף, endDate הופך ל־finalEndAt לפני הקריאה.)
    const tl = resolveChargeTimeline(TX, { endDate: "2026-01-15T15:00" });
    assert.equal(tl.plugInAt, "2026-01-15T10:00");
    assert.equal(tl.chargeEndAt, "2026-01-15T16:40");
  });

  it("עסקה בלי plugOutTime (עדיין מחובר): אין הוצאה ואין סיום מאולץ", () => {
    const live = { plugInTime: TX.plugInTime, plugOutTime: 0, netDuration: 0, stopReason: null };
    const tl = resolveChargeTimeline(live, {});
    assert.equal(tl.plugOutAt, null);
    assert.equal(tl.netMins, 0);
  });
});
