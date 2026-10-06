import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  IDLE_REMINDER_INTERVAL_MS,
  idleEndMs,
  shouldSendIdleReminder,
  idleReminderText,
  idleWaDraftText,
  idleOpenMatchesStation
} from "../../lib/ev-idle.mjs";

const MIN = 60 * 1000;

describe("תזכורת idle — זיהוי סיום", () => {
  it("מחזיר null כשאין סיום", () => {
    assert.equal(idleEndMs({ id: "a" }), null);
    assert.equal(idleEndMs(null), null);
  });
  it("לוקח chargingFullTime בעדיפות", () => {
    const ms = Date.now() - 40 * MIN;
    assert.equal(idleEndMs({ chargingFullTime: ms }), ms);
  });
  it("נופל ל-chargeEndedAt / endDate", () => {
    const iso = new Date(Date.now() - 50 * MIN).toISOString();
    assert.equal(idleEndMs({ chargeEndedAt: iso }), new Date(iso).getTime());
  });
});

describe("תזכורת idle — קצב 30 דקות", () => {
  const now = Date.now();
  it("לא שולח לפני 30 דקות מסיום", () => {
    const r = shouldSendIdleReminder({ endMs: now - 20 * MIN, plugOutAt: null, lastReminderMs: 0, nowMs: now });
    assert.equal(r.due, false);
  });
  it("שולח אחרי 30 דקות", () => {
    const r = shouldSendIdleReminder({ endMs: now - 35 * MIN, plugOutAt: null, lastReminderMs: 0, nowMs: now });
    assert.equal(r.due, true);
    assert.equal(r.idleMinutes, 35);
  });
  it("לא שולח פעמיים בתוך 30 דקות", () => {
    const r = shouldSendIdleReminder({ endMs: now - 90 * MIN, plugOutAt: null, lastReminderMs: now - 10 * MIN, nowMs: now });
    assert.equal(r.due, false);
  });
  it("שולח שוב אחרי 30 דקות מהתזכורת האחרונה", () => {
    const r = shouldSendIdleReminder({ endMs: now - 90 * MIN, plugOutAt: null, lastReminderMs: now - 31 * MIN, nowMs: now });
    assert.equal(r.due, true);
    assert.equal(r.idleMinutes, 90);
  });
  it("עוצר כשיש plugOutAt", () => {
    const r = shouldSendIdleReminder({ endMs: now - 120 * MIN, plugOutAt: now - 60 * MIN, lastReminderMs: 0, nowMs: now });
    assert.equal(r.due, false);
  });
  it("עוצר כשאין endMs", () => {
    const r = shouldSendIdleReminder({ endMs: null, plugOutAt: null, lastReminderMs: 0, nowMs: now });
    assert.equal(r.due, false);
  });
});

describe("תזכורת idle — טקסטים", () => {
  it("טקסט התראה בעברית", () => {
    const t = idleReminderText("יוסי", 45);
    assert.ok(t.includes("יוסי") && t.includes("45") && t.includes("עדיין מחובר"));
  });
  it("טיוטת וואטסאפ מנומסת", () => {
    const t = idleWaDraftText("יוסי", 60);
    assert.ok(t.includes("יוסי") && t.includes("60") && t.includes("תודה"));
  });
});

describe("קבוע קצב", () => {
  it("30 דקות במילישניות", () => {
    assert.equal(IDLE_REMINDER_INTERVAL_MS, 1800000);
  });
});

describe("התאמת open לחיבור הנוכחי — מניעת תזכורת שגויה אחרי ניתוק וחיבור מחדש", () => {
  const now = Date.now();
  const iso = ms => new Date(ms).toISOString();
  it("אותו txn — מתאים", () => {
    assert.equal(idleOpenMatchesStation({ wevoTxnId: "123" }, { transactionId: 123, plugInTime: iso(now) }), true);
  });
  it("txn שונה — לא מתאים (התזכורת לא תישלח על הטעינה הישנה)", () => {
    assert.equal(idleOpenMatchesStation({ wevoTxnId: "111" }, { transactionId: 222, plugInTime: iso(now) }), false);
  });
  it("חיבור חדש בהפרש גדול בלי txn — לא מתאים", () => {
    const open = { plugInAt: iso(now - 15 * 60 * MIN) };
    const st = { plugInTime: iso(now) };
    assert.equal(idleOpenMatchesStation(open, st), false);
  });
  it("אותו חיבור בלי txn — מתאים", () => {
    const open = { plugInAt: iso(now - 5 * MIN) };
    const st = { plugInTime: iso(now - 4 * MIN) };
    assert.equal(idleOpenMatchesStation(open, st), true);
  });
  it("אין מידע — לא חוסם (התנהגות קודמת)", () => {
    assert.equal(idleOpenMatchesStation({ id: "a" }, {}), true);
  });
  it("null — לא מתאים", () => {
    assert.equal(idleOpenMatchesStation(null, {}), false);
    assert.equal(idleOpenMatchesStation({ id: "a" }, null), false);
  });
});
