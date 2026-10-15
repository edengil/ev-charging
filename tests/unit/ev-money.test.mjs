import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METHODS,
  PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  DUPLICATE_SAVE_WINDOW_MS,
  DUPLICATE_DEDUP_WINDOW_MS,
  mergeByIdPreferNewer,
  knownCarPatchForName,
  normalizePayments,
  dedupeDuplicatePayments,
  findRecentDuplicatePayment,
  findSameDayDuplicatePayment,
  canSaveNewPayment,
  clientBalance,
  buildClientLedger,
  isDangerousEmptyCloudSnap,
  buildCloudSnapFromParts,
  hasDebt,
  hasCredit,
  isChargeTimelineRelevant,
  isBillingPremiumAt,
  authorizeShouldConfirmPremium,
  isOffPeakPreauthQueuedOk,
  isWevoAuthIntentMode,
  normalizeWevoAuthIntent,
  authRetryDelayMs,
  AUTH_MAX_ATTEMPTS,
  isScheduleBlocked,
  offPeakWindowLabel,
  findMatchingWevoOpen,
  listConflictingWevoOpens,
  wevoOpenTxnId,
  isActiveWevoOpen,
  validChargeEndMs,
  wevoOpenLooksFinished,
  shouldCloseStaleWevoOpen,
  openChargeStatus,
  stationStillCharging,
  pickLiveChargeEndMs,
  monthlyCollection,
  resolveChargeTimeline,
  isUsableStationSample,
  holdLiveStation,
  shouldShowNotifyEnable,
  finalWevoFetchCanClose,
  findChargeStillOnStation,
  pickFinishedWevoTx,
  repairWevoOpenRecord,
  savedSessionMatchesCharge,
  shouldDiscardOpen,
  dropOpensAlreadySaved,
  chargerReportsVehicle,
  dedupeSessionsByTxn,
  routeNotifyClick,
  fictionalBilledDisplay,
  findDuplicateSuspect,
  findUncataloguedCharges,
  assignedChargeArchiveEntry
} from "../../lib/ev-money.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** חבילת הדפדפן כפי שהיא נבנית: src/* בסדר src/manifest.json (ללא ההערות). */
function readAppBundle() {
  const manifest = JSON.parse(
    readFileSync(join(root, "src/manifest.json"), "utf8")
  );
  return manifest.order
    .map(rel => {
      const lines = readFileSync(join(root, rel), "utf8").split("\n");
      return lines.slice(6, -1).join("\n");
    })
    .join("\n");
}

describe("payment method order", () => {
  it("ברירת מחדל מזומן ואז פייבוקס → ביט → העברה", () => {
    assert.equal(DEFAULT_PAYMENT_METHOD, "cash");
    assert.deepEqual(
      PAYMENT_METHOD_OPTIONS.map(([k]) => k),
      ["cash", "paybox", "bit", "transfer"]
    );
    assert.equal(METHODS.cash, "מזומן");
  });
});

describe("normalizePayments + clientBalance", () => {
  it("ממיר מחרוזות למספרים כדי לא לשרשר יתרה", () => {
    const { payments, changed } = normalizePayments([
      { id: "1", clientId: "c1", amount: "100", method: "cash", date: "2026-01-01" },
      { id: "2", clientId: "c1", amount: "50", method: "bit", date: "2026-01-02" }
    ]);
    assert.equal(changed, true);
    assert.equal(payments[0].amount, 100);
    assert.equal(typeof payments[0].amount, "number");
    const bal = clientBalance({ id: "c1", name: "עידן" }, [{ clientId: "c1", amountBilled: 200 }], payments);
    assert.equal(bal, 50);
  });

  it("לא מחשב חוב לעצמי", () => {
    assert.equal(clientBalance({ id: "me", self: true, name: "עדן" }, [{ clientId: "me", amountBilled: 999 }], []), 0);
  });
});

describe("duplicate payment guards", () => {
  it("חלון שמירה הוא שניות (~90) לא ימים — לא חוסם הפקדה לגיטימית למחרת", () => {
    assert.ok(DUPLICATE_SAVE_WINDOW_MS <= 2 * 60 * 1000, "save window must be <= 2 minutes");
    assert.ok(DUPLICATE_DEDUP_WINDOW_MS <= 30 * 60 * 1000, "dedupe window must be <= 30 minutes");
    assert.ok(DUPLICATE_SAVE_WINDOW_MS < 60 * 60 * 1000);
    assert.ok(DUPLICATE_DEDUP_WINDOW_MS < 24 * 60 * 60 * 1000);
  });

  it("מאפשר אותו סכום אחרי יותר מ־90 שניות", () => {
    const existing = [
      {
        id: "p1",
        clientId: "c1",
        amount: 600,
        method: "cash",
        date: new Date("2026-09-17T08:00:00Z").toISOString()
      }
    ];
    const candidate = {
      id: "p2",
      clientId: "c1",
      amount: 600,
      method: "cash",
      date: new Date("2026-09-17T10:00:00Z").toISOString()
    };
    assert.equal(findRecentDuplicatePayment(existing, candidate), null);
    const ok = canSaveNewPayment(existing, candidate);
    assert.equal(ok.ok, true);
  });

  it("חוסם לחיצה כפולה בתוך 90 שניות", () => {
    const t0 = Date.parse("2026-09-17T08:00:00Z");
    const existing = [
      {
        id: "p1",
        clientId: "c1",
        amount: 600,
        method: "cash",
        date: new Date(t0).toISOString()
      }
    ];
    const candidate = {
      id: "p2",
      clientId: "c1",
      amount: 600,
      method: "cash",
      date: new Date(t0 + 30_000).toISOString()
    };
    assert.ok(findRecentDuplicatePayment(existing, candidate));
    assert.equal(canSaveNewPayment(existing, candidate).ok, false);
    assert.equal(canSaveNewPayment(existing, candidate).reason, "double_click");
  });

  it("findSameDayDuplicatePayment: מזהה תשלום כפול באותו יום (באג עידן 600₪)", () => {
    const day = "2026-09-30T10:00:00+03:00";
    const existing = [
      { id: "p1", clientId: "c1", amount: 600, method: "cash", date: new Date(day).toISOString() }
    ];
    const candidate = {
      id: "p2", clientId: "c1", amount: 600, method: "cash",
      date: new Date("2026-09-30T18:30:00+03:00").toISOString()
    };
    const dup = findSameDayDuplicatePayment(existing, candidate);
    assert.ok(dup, "אמור לזהות כפילות באותו יום");
    assert.equal(dup.id, "p1");
  });

  it("findSameDayDuplicatePayment: לא מתריע על תשלום ביום אחר", () => {
    const existing = [
      { id: "p1", clientId: "c1", amount: 600, method: "cash", date: new Date("2026-09-29T10:00:00+03:00").toISOString() }
    ];
    const candidate = {
      id: "p2", clientId: "c1", amount: 600, method: "cash",
      date: new Date("2026-09-30T10:00:00+03:00").toISOString()
    };
    assert.equal(findSameDayDuplicatePayment(existing, candidate), null);
  });

  it("findSameDayDuplicatePayment: לא מתריע על סכום/שיטה/לקוח שונים", () => {
    const existing = [
      { id: "p1", clientId: "c1", amount: 600, method: "cash", date: new Date("2026-09-30T10:00:00+03:00").toISOString() }
    ];
    const base = { id: "p2", clientId: "c1", amount: 600, method: "cash", date: new Date("2026-09-30T12:00:00+03:00").toISOString() };
    assert.equal(findSameDayDuplicatePayment(existing, { ...base, amount: 500 }), null);
    assert.equal(findSameDayDuplicatePayment(existing, { ...base, method: "bit" }), null);
    assert.equal(findSameDayDuplicatePayment(existing, { ...base, clientId: "c2" }), null);
    assert.equal(findSameDayDuplicatePayment(existing, { ...base, method: "debt" }), null);
  });

  it("dedupe מוחק כפילות בתוך רבע שעה אבל שומר הפקדות ביום אחר", () => {
    const base = Date.parse("2026-09-17T08:00:00Z");
    const list = [
      { id: "a", clientId: "c1", amount: 600, method: "cash", date: new Date(base).toISOString() },
      { id: "b", clientId: "c1", amount: 600, method: "cash", date: new Date(base + 5 * 60 * 1000).toISOString() },
      { id: "c", clientId: "c1", amount: 600, method: "cash", date: new Date(base + 2 * 24 * 60 * 60 * 1000).toISOString() }
    ];
    const { payments, removed } = dedupeDuplicatePayments(list);
    assert.equal(removed, 1);
    assert.equal(payments.length, 2);
    assert.ok(payments.some(p => p.id === "b"));
    assert.ok(payments.some(p => p.id === "c"));
    assert.ok(!payments.some(p => p.id === "a"));
  });
});

describe("cloud merge + wipe guard", () => {
  it("שלו לבד הוא טסלה מודל Y, ושלום לא", () => {
    assert.equal(knownCarPatchForName("שלו שכן 1401").carBrand, "tesla");
    assert.equal(knownCarPatchForName("שלו שכן 1401").carModel, "Model Y");
    assert.equal(knownCarPatchForName("שלום"), null);
    assert.equal(knownCarPatchForName("קווין ובתי ברדה").carBrand, "byd");
    assert.equal(knownCarPatchForName("יאיר ברדה").carModel, "Model Y");
  });

  it("מיזוג לקוחות שומר לקוח מקומי שחסר בענן", () => {
    const local = [{ id: "local-c", name: "שלו שכן 1401" }];
    const cloud = [{ id: "cloud-c", name: "מתן" }];
    const merged = mergeByIdPreferNewer(local, cloud);
    assert.equal(merged.length, 2);
    assert.ok(merged.some(c => c.id === "local-c"));
  });

  it("מיזוג שומר תשלום מקומי שחסר בענן", () => {
    const local = [{ id: "pay-local", clientId: "c1", amount: 600, date: "2026-09-16T10:00:00Z" }];
    const cloud = [{ id: "pay-cloud", clientId: "c1", amount: 100, date: "2026-09-15T10:00:00Z" }];
    const merged = mergeByIdPreferNewer(local, cloud);
    assert.equal(merged.length, 2);
    assert.ok(merged.some(p => p.id === "pay-local"));
    assert.ok(merged.some(p => p.id === "pay-cloud"));
  });

  it("חוסם העלאת סנאפשוט ריק אחרי שהיו תשלומים", () => {
    assert.equal(
      isDangerousEmptyCloudSnap({ payments: [], sessions: [{ id: 1 }], clients: [{ id: 1 }] }, { payments: 3, sessions: 1, clients: 1 }),
      true
    );
    assert.equal(
      isDangerousEmptyCloudSnap({ payments: [{ id: "p" }], sessions: [{ id: 1 }], clients: [{ id: 1 }] }, { payments: 3, sessions: 1, clients: 1 }),
      false
    );
  });

  it("בונה סנאפשוט מהמטמון ולא מ־refs ריקים", () => {
    const snap = buildCloudSnapFromParts(
      { payments: [{ id: "p1" }], clients: [{ id: "c1" }], sessions: [], openSess: [] },
      { payments: [], clients: [], sessions: [], openSess: [] },
      null
    );
    assert.equal(snap.payments.length, 1);
    assert.equal(snap.clients.length, 1);
  });
});

describe("charge timeline relevance", () => {
  it("לא רלוונטי לעצמי", () => {
    assert.equal(
      isChargeTimelineRelevant({
        isSelf: true,
        plugInAt: "2026-09-17T15:00:00",
        plugOutAt: "2026-09-17T18:00:00"
      }),
      false
    );
  });

  it("יקרות→יקרות לא רלוונטי; רגיל→רגיל לא רלוונטי; מעבר כן", () => {
    assert.equal(isBillingPremiumAt("2026-09-17T17:00:00"), true);
    assert.equal(isBillingPremiumAt("2026-09-17T10:00:00"), false);
    assert.equal(
      isChargeTimelineRelevant({
        plugInAt: "2026-09-17T17:00:00",
        plugOutAt: "2026-09-17T20:00:00"
      }),
      false
    );
    assert.equal(
      isChargeTimelineRelevant({
        plugInAt: "2026-09-17T10:00:00",
        plugOutAt: "2026-09-17T12:00:00"
      }),
      false
    );
    assert.equal(
      isChargeTimelineRelevant({
        plugInAt: "2026-09-17T15:00:00",
        plugOutAt: "2026-09-17T18:00:00"
      }),
      true
    );
    assert.equal(
      isChargeTimelineRelevant({
        plugInAt: "2026-09-17T22:00:00",
        plugOutAt: "2026-09-17T23:30:00"
      }),
      true
    );
  });
});

describe("client ledger (עובר ושב)", () => {
  it("מחשב יתרה רצה: טעינה מגדילה חוב, הפקדה מקטינה", () => {
    const sessions = [
      { id: "s1", clientId: "c1", date: "2026-09-01T10:00:00Z", amountBilled: 200, kwhInflated: 10 }
    ];
    const payments = [
      { id: "p1", clientId: "c1", date: "2026-09-02T10:00:00Z", amount: 150, method: "cash" }
    ];
    const ledger = buildClientLedger("c1", sessions, payments);
    assert.equal(ledger.length, 2);
    // חדש למעלה — הפקדה אחרונה
    assert.equal(ledger[0].kind, "payment");
    assert.equal(ledger[0].balanceAfter, 50);
    assert.equal(ledger[1].kind, "session");
    assert.equal(ledger[1].balanceAfter, 200);
    assert.equal(hasDebt(50), true);
    assert.equal(hasCredit(-10), true);
  });
});

describe("Wevo אישור מראש לזול", () => {
  it("offpeak/first-auth לא מאשרים תעריף יקר; full/full-now כן", () => {
    assert.equal(authorizeShouldConfirmPremium("offpeak-preauth"), false);
    assert.equal(authorizeShouldConfirmPremium("first-auth"), false);
    assert.equal(authorizeShouldConfirmPremium("full"), true);
    assert.equal(authorizeShouldConfirmPremium("full-now"), true);
    assert.equal(authorizeShouldConfirmPremium(undefined), true);
  });

  it("normalizes intent modes and rejects junk", () => {
    assert.equal(isWevoAuthIntentMode("offpeak-preauth"), true);
    assert.equal(isWevoAuthIntentMode("full-now"), true);
    assert.equal(isWevoAuthIntentMode("first-auth"), true);
    assert.equal(isWevoAuthIntentMode("full"), false);
    assert.equal(normalizeWevoAuthIntent(null), null);
    assert.equal(normalizeWevoAuthIntent({ clientId: "c1", mode: "full" }), null);
    const n = normalizeWevoAuthIntent({
      clientId: "c1",
      mode: "first-auth",
      queued: 0,
      attempts: "2"
    });
    assert.equal(n.clientId, "c1");
    assert.equal(n.mode, "first-auth");
    assert.equal(n.queued, false);
    assert.equal(n.attempts, 2);
  });

  it("authRetryDelayMs מאט אחרי הרבה ניסיונות ולא נעצר", () => {
    assert.equal(authRetryDelayMs(1), 4000);
    assert.equal(authRetryDelayMs(10), 4000);
    assert.equal(authRetryDelayMs(11), 15000);
    assert.equal(authRetryDelayMs(31), 30000);
    assert.equal(authRetryDelayMs(100), 30000);
  });

  it("AUTH_MAX_ATTEMPTS הוא מספר סביר (עוצר לולאה אינסופית)", () => {
    assert.ok(Number.isInteger(AUTH_MAX_ATTEMPTS));
    assert.ok(AUTH_MAX_ATTEMPTS >= 10 && AUTH_MAX_ATTEMPTS <= 50);
  });

  it("isScheduleBlocked: delayCharge מחוץ לחלון (inWindow=false) → חסום", () => {
    assert.equal(
      isScheduleBlocked({ delayCharge: true, inWindow: false, state: "Preparing" }),
      true
    );
  });

  it("isScheduleBlocked: delayCharge בתוך חלון (inWindow=true) → לא חסום", () => {
    assert.equal(
      isScheduleBlocked({ delayCharge: true, inWindow: true, state: "Preparing" }),
      false
    );
  });

  it("isScheduleBlocked: בלי delayCharge → לא חסום", () => {
    assert.equal(isScheduleBlocked({ delayCharge: false, inWindow: false }), false);
    assert.equal(isScheduleBlocked({ inWindow: false }), false);
    assert.equal(isScheduleBlocked(null), false);
  });

  it("isScheduleBlocked: בלי inWindow — מחשב מחלון off-peak (כולל חציית חצות)", () => {
    // חלון 22:00–00:00; השעה 19:30 → מחוץ לחלון → חסום
    const evening = new Date(2026, 9, 7, 19, 30, 0).getTime();
    assert.equal(
      isScheduleBlocked({ delayCharge: true, offPeakStartTime: 79200, offPeakEndTime: 0 }, evening),
      true
    );
    // השעה 23:15 → בתוך החלון → לא חסום
    const night = new Date(2026, 9, 7, 23, 15, 0).getTime();
    assert.equal(
      isScheduleBlocked({ delayCharge: true, offPeakStartTime: 79200, offPeakEndTime: 0 }, night),
      false
    );
    // חלון רגיל 23:00–06:00; 02:00 → בתוך החלון
    const wee = new Date(2026, 9, 8, 2, 0, 0).getTime();
    assert.equal(
      isScheduleBlocked({ delayCharge: true, offPeakStartTime: 82800, offPeakEndTime: 21600 }, wee),
      false
    );
    // בלי נתוני חלון → לא חסום (לא מנחשים)
    assert.equal(isScheduleBlocked({ delayCharge: true }, evening), false);
  });

  it("offPeakWindowLabel: מחזיר HH:MM או null", () => {
    assert.equal(offPeakWindowLabel({ offPeakStartTime: 79200 }), "22:00");
    assert.equal(offPeakWindowLabel({ offPeakStartTime: 82800 }), "23:00");
    assert.equal(offPeakWindowLabel({}), null);
    assert.equal(offPeakWindowLabel(null), null);
  });

  it("בתור לזול — waitingAuthorize/delayCharge בשיא נחשב הצלחה", () => {
    assert.equal(
      isOffPeakPreauthQueuedOk({ waitingAuthorize: true, state: "Preparing", rateKw: 0 }, true),
      true
    );
    assert.equal(
      isOffPeakPreauthQueuedOk({ delayCharge: true, state: "SuspendedEVSE", rateKw: 0 }, true),
      true
    );
    assert.equal(
      isOffPeakPreauthQueuedOk({ waitingAuthorize: true, state: "Preparing" }, false),
      false
    );
    assert.equal(
      isOffPeakPreauthQueuedOk({ state: "Charging", rateKw: 7.2, waitingAuthorize: false }, true),
      false
    );
  });
});

describe("Wevo open session match", () => {
  it("לא מחזיר open ישן כשה־txn החי שונה", () => {
    const opens = [
      { id: "old", source: "wevo-live", wevoTxnId: "111", clientId: "c1" }
    ];
    assert.equal(findMatchingWevoOpen(opens, "222"), null);
    assert.equal(listConflictingWevoOpens(opens, "222").length, 1);
    assert.equal(wevoOpenTxnId(opens[0]), "111");
    assert.equal(isActiveWevoOpen(opens[0]), true);
  });

  it("מתאים txn מדויק ומאפשר orphan בלי txn", () => {
    const opens = [
      { id: "a", source: "wevo-live", wevoTxnId: "111", clientId: "c1" },
      { id: "b", source: "wevo-live", wevoTxnId: null, clientId: "c2" }
    ];
    assert.equal(findMatchingWevoOpen(opens, "111").id, "a");
    assert.equal(findMatchingWevoOpen(opens, "999").id, "b");
  });

  it("סיום לפני חיבור נזרק, וטעינה שנגמרה מסומנת לאישור", () => {
    const bad = {
      id: "y",
      source: "wevo-live",
      plugInAt: "2026-09-22T23:00",
      startDate: "2026-09-22T23:00",
      chargeEndedAt: "2026-09-22T17:26",
      endDate: "2026-09-22T17:26",
      readyToComplete: true,
      liveKwh: 0
    };
    assert.equal(validChargeEndMs(bad), null);
    const fixed = repairWevoOpenRecord(bad);
    assert.equal(fixed.chargeEndedAt, null);
    assert.equal(fixed.endDate, null);
    assert.equal(fixed.readyToComplete, true);

    const stale = {
      id: "t",
      source: "wevo-live",
      plugInAt: "2026-09-23T15:32",
      startDate: "2026-09-23T15:32",
      chargeEndedAt: "2026-09-23T15:34",
      readyToComplete: false,
      liveKw: 10.6,
      liveKwh: 0.184
    };
    const now = new Date("2026-09-23T16:30:00").getTime();
    assert.equal(wevoOpenLooksFinished(stale, now), true);
    const repaired = repairWevoOpenRecord(stale, now, { state: "Available" });
    assert.equal(repaired.readyToComplete, true);
    assert.equal(repaired.liveKw, 0);
    assert.equal(shouldCloseStaleWevoOpen(stale, { nowMs: now, nowIdle: false }), true);
    assert.equal(repairWevoOpenRecord(repaired, now, { state: "Available" }), repaired);
  });

  it("מבדיל בין כבל מחובר לכבל שנותק", () => {
    const cable = {
      plugInAt: "2026-09-23T15:32",
      chargeEndedAt: "2026-09-23T15:34",
      readyToComplete: true
    };
    assert.equal(openChargeStatus(cable).kind, "cable");
    const out = { ...cable, plugOutAt: "2026-09-23T15:40" };
    assert.equal(openChargeStatus(out).kind, "unplugged");
    assert.equal(openChargeStatus({ liveKw: 7, source: "wevo-live" }).kind, "live");
  });

  it("כפתור התראות נסתר אם כבר אושרו או סומנו כפעילות", () => {
    assert.equal(shouldShowNotifyEnable("granted", null), false);
    assert.equal(shouldShowNotifyEnable("granted", "1"), false);
    assert.equal(shouldShowNotifyEnable("default", "1"), false);
    assert.equal(shouldShowNotifyEnable("default", true), false);
    assert.equal(shouldShowNotifyEnable("denied", null), false);
    assert.equal(shouldShowNotifyEnable("default", null), true);
    assert.equal(shouldShowNotifyEnable("default", "0"), true);
  });

  it("דגימה חסרה לא מוחקת טעינה חיה", () => {
    const charging = { state: "Charging", transactionId: "42", rateKw: 7.2, connected: true };
    assert.equal(isUsableStationSample(charging), true);
    assert.equal(isUsableStationSample({ state: "Unknown", connected: true }), false);
    assert.equal(isUsableStationSample(null), false);
    assert.equal(holdLiveStation(charging, { state: "Unknown" }), charging);
    assert.equal(holdLiveStation(charging, null), charging);
    assert.equal(holdLiveStation(charging, { state: "Available" }).state, "Available");
    assert.equal(holdLiveStation(charging, { state: "Finishing" }).state, "Finishing");
    assert.equal(holdLiveStation(null, { state: "Unknown", connected: true }).state, "Unknown");
    assert.equal(chargerReportsVehicle(holdLiveStation(null, { state: "Unknown", connected: true }), []), false);
    assert.equal(stationStillCharging(charging), true);
    const src = readAppBundle();
    assert.match(src, /holdLiveStation/);
    assert.match(src, /isUsableStationSample\(incoming\)/);
  });

  it("מצב עמדה חי גובר על חותמת סיום באותה עסקה", () => {
    const open = {
      wevoTxnId: "42",
      plugInAt: "2026-09-25T00:10",
      chargeEndedAt: "2026-09-25T00:40",
      readyToComplete: true,
      wevoEnded: true,
      liveKw: 0
    };
    const charging = { state: "Charging", transactionId: "42", rateKw: 7.2 };
    assert.equal(openChargeStatus(open, charging).kind, "live");
    assert.equal(openChargeStatus(open, { state: "Charging", transactionId: "99", rateKw: 7.2 }).kind, "cable");
    const falseEnd = {
      source: "wevo-live",
      wevoTxnId: "77",
      plugInAt: "2026-09-26T00:42",
      startDate: "2026-09-26T00:42",
      chargeEndedAt: "2026-09-26T00:45",
      endDate: "2026-09-26T00:45",
      readyToComplete: true,
      wevoEnded: true,
      liveKwh: 0.55,
      liveWevoCost: 0.48,
      liveKw: 0
    };
    const still = {
      state: "Charging",
      transactionId: "88",
      plugInTime: "2026-09-26T00:42",
      totalEnergyKwh: 6.59,
      rateKw: 10.8
    };
    assert.equal(openChargeStatus(falseEnd, still).kind, "live");
    assert.equal(findChargeStillOnStation([{ ...falseEnd, id: "live" }], still, []).id, "live");
    const savedSmall = { wevoTxnId: "77", kwhRaw: 0.55, costToOwner: 0.48, source: "manual" };
    assert.equal(findChargeStillOnStation([{ ...falseEnd, id: "saved" }], still, [savedSmall]), null);
    assert.equal(findChargeStillOnStation([{ ...falseEnd, id: "other", plugInAt: "2026-09-20T10:00", startDate: "2026-09-20T10:00" }], still, []), null);
    assert.equal(finalWevoFetchCanClose(null), false);
    assert.equal(finalWevoFetchCanClose({ kwh: 0, end: "2026-09-26T00:45" }), false);
    assert.equal(finalWevoFetchCanClose({ kwh: 0.55, end: "2026-09-26T00:45" }), true);
    const older = { transactionId: "1", isOngoing: false, plugInTime: Date.parse("2026-09-26T00:42"), totalEnergyKwh: 0.55 };
    assert.equal(pickFinishedWevoTx([older], { wevoTxnId: "88", plugInAt: "2026-09-26T00:42" }), null);
    assert.equal(pickFinishedWevoTx([older], { wevoTxnId: "1" }), older);
    // עסקה שהסתיימה בפועל אך Wevo עוד מסמנת isOngoing (דגל תקוע) — נחשבת סגורה כשיש plugOutTime/stopReason
    const stuck = { transactionId: "7", isOngoing: true, plugInTime: Date.parse("2026-10-11T15:27"), plugOutTime: Date.parse("2026-10-12T08:58"), totalEnergyKwh: 76.38 };
    assert.equal(pickFinishedWevoTx([stuck], { wevoTxnId: "7" }), stuck);
    const stuckStop = { transactionId: "8", isOngoing: true, plugInTime: Date.parse("2026-10-11T15:27"), stopReason: "EVDisconnected", totalEnergyKwh: 12 };
    assert.equal(pickFinishedWevoTx([stuckStop], { wevoTxnId: "8" }), stuckStop);
    // עסקה פעילה באמת (בלי סימני סיום) לא נבחרת כסגורה
    const reallyOngoing = { transactionId: "9", isOngoing: true, plugInTime: Date.parse("2026-10-11T15:27"), totalEnergyKwh: 3 };
    assert.equal(pickFinishedWevoTx([reallyOngoing], { wevoTxnId: "9" }), null);
    assert.equal(openChargeStatus({ wevoTxnId: "42", liveKw: 6 }, { state: "Finishing", transactionId: "42" }).kind, "cable");
    assert.match(readAppBundle(), /liveChargeEndStamp/);
    assert.match(readAppBundle(), /clearFinishedIfStillCharging/);
    // שלמות נתונים (מקרה עידן 11.10): לוגיקת ציר הזמן עברה ל־lib (שלב C) ומכוסה שם
    // בבדיקות התנהגות; כאן מוודאים שהבאנדל לא מגדיר אותה שוב ושה־lib חושף אותה.
    assert.doesNotMatch(readAppBundle(), /function resolveChargeTimeline/);
    assert.match(readFileSync(join(root, "lib/ev-money.mjs"), "utf8"), /export function resolveChargeTimeline/);
    assert.match(readAppBundle(), /Math\.max\(est\.kwh \|\| 0, Number\(existing && existing\.liveKwh\) \|\| 0\)/);
  });

  it("טעינה שנשמרה לא חוזרת כממתינה גם כשהשעון שונה", () => {
    const saved = {
      id: "s1",
      clientId: "eden",
      date: "2026-09-23T15:34",
      chargeEndedAt: "2026-09-23T15:32",
      kwhRaw: 21.77,
      costToOwner: 18.99,
      amountBilled: 18.99,
      notes: "Wevo live"
    };
    const pending = {
      id: "o1",
      source: "wevo-live",
      clientId: "eden",
      startDate: "2026-09-23T15:32",
      chargeEndedAt: "2026-09-24T08:06",
      endDate: "2026-09-24T08:06",
      plugOutAt: "2026-09-24T08:06",
      liveKwh: 21.77,
      liveWevoCost: 18.99,
      readyToComplete: true,
      wevoEnded: true
    };
    assert.equal(savedSessionMatchesCharge(saved, pending), true);
    assert.equal(shouldDiscardOpen(pending, [saved]), true);
    assert.equal(dropOpensAlreadySaved([pending], [saved]).length, 0);
    assert.equal(shouldDiscardOpen(pending, [{
      source: "wevo-sync",
      wevoTxnId: "42",
      kwhRaw: 21.77,
      costToOwner: 18.99
    }]), false);
    assert.equal(shouldDiscardOpen({
      ...pending,
      liveKwh: 4,
      liveWevoCost: 3,
      wevoTxnId: "999"
    }, [saved]), false);
  });

  it("txn שונה אינו אותה טעינה גם אם קוט״ש וסכום זהים", () => {
    const saved = { wevoTxnId: "42", kwhRaw: 21.77, costToOwner: 18.99 };
    const other = {
      wevoTxnId: "77",
      liveKwh: 21.77,
      liveWevoCost: 18.99,
      readyToComplete: true
    };
    assert.equal(savedSessionMatchesCharge(saved, other), false);
    assert.equal(shouldDiscardOpen(other, [saved]), false);
  });

  it("תצוגת אגורות וויבו היא לחישוב הרכב האישי בלבד", () => {
    assert.equal(fictionalBilledDisplay(25, 9.34), 25.34);
    assert.equal(fictionalBilledDisplay(18.99, 9.34), 18.34);
    assert.equal(fictionalBilledDisplay(25, 9), 25);
    assert.equal(fictionalBilledDisplay(25, 9).toFixed(2), "25.00");
    assert.equal(clientBalance({ id: "c1", name: "שכן" }, [{ clientId: "c1", amountBilled: 18.99 }], []), 18.99);
    const src = readAppBundle();
    assert.match(src, /ownCar[\s\S]{0,400}fictionalBilledDisplay/);
    assert.match(src, /Math\.ceil\(kwhInflated \* rate\)/);
  });

  it("dedupeSessionsByTxn שומר חיוב וויבו וחיוב ללקוח בנפרד", () => {
    const manual = { id: "m", source: "manual", wevoTxnId: "42", date: "2026-09-23T15:34", kwhRaw: 21.77, amountBilled: 40 };
    const imported = { id: "w", source: "wevo-sync", notes: "txn#42", date: "2026-09-24T08:06", kwhRaw: 21.77, costToOwner: 18.99 };
    const out = dedupeSessionsByTxn([imported, manual]);
    assert.equal(out.length, 2);
    assert.equal(out.some(s => s.id === "m"), true);
    assert.equal(out.some(s => s.id === "w"), true);
    const dupWevo = dedupeSessionsByTxn([
      imported,
      { ...imported, id: "w2", date: "2026-09-24T09:00" }
    ]);
    assert.equal(dupWevo.length, 1);
    assert.equal(dupWevo[0].id, "w2");
    const bare = dedupeSessionsByTxn([
      { id: "a", kwhRaw: 1, costToOwner: 1 },
      { id: "b", kwhRaw: 1, costToOwner: 1 }
    ]);
    assert.equal(bare.length, 2);
  });

  it("לחיצה על עדכון טעינה שנגמרה פותחת את כרטיס האישור", () => {
    const open = {
      id: "o1",
      clientId: "c1",
      readyToComplete: true,
      wevoEnded: true,
      chargeEndedAt: "2026-09-24T08:06",
      liveKwh: 21.77,
      liveWevoCost: 18.99
    };
    const route = routeNotifyClick("ev-end-o1", [open], []);
    assert.deepEqual(route, { view: "complete", openId: "o1", clientId: "c1" });
  });

  it("אחרי שהטעינה נסגרה הלחיצה לא פותחת כרטיס ישן", () => {
    const stale = {
      id: "o1",
      clientId: "c1",
      readyToComplete: true,
      liveKwh: 21.77,
      liveWevoCost: 18.99,
      wevoTxnId: "42"
    };
    const saved = { wevoTxnId: "42", kwhRaw: 21.77, costToOwner: 18.99 };
    assert.equal(routeNotifyClick("ev-end-o1", [stale], [saved]), null);
    const other = {
      id: "o2",
      clientId: "c2",
      readyToComplete: true,
      chargeEndedAt: "2026-09-24T10:00",
      liveKwh: 4,
      liveWevoCost: 3
    };
    const next = routeNotifyClick("ev-end-o1", [other], [saved]);
    assert.equal(next.openId, "o2");
    assert.equal(next.view, "complete");
    assert.equal(routeNotifyClick("ev-notify-on", [other], []), null);
    assert.equal(routeNotifyClick("ev-connect-9", [], []).view, "dash");
    assert.equal(routeNotifyClick("ev-preauth-fail", [], []).view, "dash");
  });

  it("התחברות לחשבון ועסקה שכבר נשמרה אינן רכב בעמדה", () => {
    const saved = [{ kwhRaw: 21.77, costToOwner: 18.99, notes: "txn#42", wevoTxnId: "42" }];
    assert.equal(chargerReportsVehicle({ state: "Available", connected: true, transactionId: 42, totalEnergyKwh: 21.77, totalCost: 18.99 }, saved), false);
    assert.equal(chargerReportsVehicle({ state: "Unknown", connected: true, waitingAuthorize: true }, saved), false);
    assert.equal(chargerReportsVehicle({ state: "Preparing", transactionId: 42, totalEnergyKwh: 21.77, totalCost: 18.99, rateKw: 0 }, saved), false);
    assert.equal(chargerReportsVehicle({ state: "Preparing", totalEnergyKwh: 0, rateKw: 0 }, saved), true);
    assert.equal(chargerReportsVehicle({ state: "Charging", rateKw: 9.2, totalEnergyKwh: 21.77, totalCost: 18.99 }, saved), true);
  });

  it("טעינה מושהית עם קוט״ש כמו טעינה ישנה מההיסטוריה נשארת רכב בעמדה", () => {
    const old = [
      { date: "2026-07-14T13:00", kwhRaw: 3.191, costToOwner: 2.77, source: "wevo-import" }
    ];
    const plug = Date.parse("2026-09-26T17:00:00Z");
    const paused = { state: "SuspendedEVSE", rateKw: 0, totalEnergyKwh: 3.2, totalCost: 2.78, transactionId: null, plugInTime: plug };
    assert.equal(chargerReportsVehicle(paused, old), true);
    assert.equal(chargerReportsVehicle({ ...paused, plugInTime: null }, old), true);
    const liveOpen = {
      id: "o-live",
      source: "wevo-live",
      clientId: "c1",
      startDate: "2026-09-26T20:00",
      plugInAt: "2026-09-26T20:00",
      liveKwh: 3.2,
      liveWevoCost: 2.78,
      liveKw: 0
    };
    assert.equal(shouldDiscardOpen(liveOpen, old), false);
    assert.equal(dropOpensAlreadySaved([liveOpen], old).length, 1);
    const justSaved = [{ date: "2026-09-26T20:40", kwhRaw: 3.2, costToOwner: 2.78, source: "wevo-live" }];
    assert.equal(chargerReportsVehicle(paused, justSaved), false);
    assert.equal(shouldDiscardOpen(liveOpen, justSaved), true);
    assert.equal(savedSessionMatchesCharge({ kwhRaw: 3.2, costToOwner: 2.78 }, liveOpen), false);
  });

  it("הרשימה מסתירה טעינה חיה רק כשהפאנל מציג רכב", () => {
    const src = readFileSync(join(root, "src/views/dashboard.js"), "utf8");
    assert.match(src, /const liveOpen = chargerReportsVehicle\(liveStation, sessions\) \? findChargeStillOnStation/);
  });

  it("readyToComplete לא נחשב פעיל", () => {
    const opens = [
      { id: "done", source: "wevo-live", wevoTxnId: "111", readyToComplete: true }
    ];
    assert.equal(isActiveWevoOpen(opens[0]), false);
    assert.equal(findMatchingWevoOpen(opens, "111"), null);
  });
});

describe("app-source drift guards", () => {
  it("לא מחזיר חלונות כפילות אגרסיביים של ימים/שבוע", () => {
    const src = readAppBundle();
    assert.doesNotMatch(src, /findRecentDuplicatePayment\([^)]*48\s*\*\s*60\s*\*\s*60\s*\*?\s*1000/);
    assert.doesNotMatch(src, /dedupeDuplicatePayments\([^)]*7\s*\*\s*24/);
    assert.match(src, /canSaveNewPayment/);
    assert.match(src, /cloudSnapWouldWipe|isDangerousEmptyCloudSnap/);
    assert.match(src, /rememberCloudCache/);
  });

  it("inject כולל את lib/ev-money", () => {
    const inj = readFileSync(join(root, "scripts/inject-app.mjs"), "utf8");
    assert.match(inj, /lib\/ev-money/);
    assert.match(inj, /bundleMoneyLib|__EV_MONEY__/);
  });

  it("שני קבצי הכניסה זהים — מקור אמת אחד ב־inject", () => {
    const a = readFileSync(join(root, "index.html"), "utf8");
    const b = readFileSync(join(root, "ev-charge-manager.html"), "utf8");
    assert.equal(a, b);
    const inj = readFileSync(join(root, "scripts/inject-app.mjs"), "utf8");
    assert.match(inj, /copy of index\.html/);
  });

  it("בונה payload חי אחד משותף למנוע הסנכרון ולפאנל (שלב A)", () => {
    const src = readAppBundle();
    assert.match(src, /function buildLiveOpenPayload/);
    assert.equal((src.match(/delayCharge: !!\(st/g) || []).length, 1);
    assert.equal((src.match(/buildLiveOpenPayload\(st, clientId, existing, clientsRef/g) || []).length, 2);
  });

  it("יש כפתורי אישור ייעודיים + אישור ראשון אוטומטי + כפתור לקוח", () => {
    const src = readAppBundle();
    assert.match(src, /wevo-preauth-arm/);
    assert.match(src, /wevo-preauth-premium-toggle/);
    assert.match(src, /sealConflictingWevoOpens/);
    assert.match(src, /findMatchingWevoOpen/);
    assert.match(src, /listConflictingWevoOpens/);
    assert.match(src, /repairWevoOpenRecord/);
    assert.match(src, /openChargeStatus/);
    assert.match(src, /findChargeStillOnStation/);
    assert.match(src, /finalWevoFetchCanClose/);
    assert.match(src, /openCards/);
    assert.doesNotMatch(src, /perm === "granted"\s*\?\s*"התראות פעילות"/);
    assert.match(src, /chargerReportsVehicle/);
    assert.match(src, /dropOpensAlreadySaved/);
    assert.match(src, /shouldDiscardOpen/);
    assert.match(src, /dedupeSessionsByTxn/);
    assert.match(src, /routeNotifyClick/);
    assert.match(src, /ev-notify/);
    assert.match(src, /notifyPhone/);
    assert.match(src, /bottomnav-/);
    assert.match(src, /wa-draft/);
    assert.match(src, /openWaDraft/);
    assert.match(src, /complete-delete-empty/);
    assert.match(src, /offpeak-preauth/);
    assert.match(src, /full-now/);
    assert.match(src, /first-auth/);
    assert.doesNotMatch(src, /fullAutoReady/);
    assert.doesNotMatch(src, /autoAuthClient/);
  });
});

describe("באג סגירה מוקדמת של טעינה פתוחה", () => {
  // תרחיש: העמדה הבהבה ל־Finishing באמצע טעינה (הפסקה רגעית של הרכב),
  // נכתבה חותמת סיום ספקולטיבית, והאפליקציה נפתחה מחדש אחרי 50 דקות —
  // עוד לפני סקר חי ראשון, כשהטעינה בפועל עוד רצה.
  const flickerOpen = () => ({
    id: "flick",
    source: "wevo-live",
    wevoTxnId: "777",
    notes: "txn#777 | Wevo live",
    clientId: "c1",
    plugInAt: "2026-09-23T15:32",
    startDate: "2026-09-23T15:32",
    chargeEndedAt: "2026-09-23T15:40",
    endDate: "2026-09-23T15:40",
    readyToComplete: false,
    wevoEnded: false,
    liveKw: 7.1,
    liveKwh: 3.2
  });
  const now = new Date("2026-09-23T16:30:00").getTime();

  it("לא סוגר טעינה על חותמת ספקולטיבית כשאין דגימת עמדה חיה", () => {
    const repaired = repairWevoOpenRecord(flickerOpen(), now, null);
    assert.equal(repaired.readyToComplete, false);
    assert.equal(repaired.wevoEnded, false);
    assert.equal(repaired.chargeEndedAt, "2026-09-23T15:40");
  });

  it("כן סוגר כשהעמדה מדווחת שהיא פנויה", () => {
    const repaired = repairWevoOpenRecord(flickerOpen(), now, { state: "Available" });
    assert.equal(repaired.readyToComplete, true);
    assert.equal(repaired.wevoEnded, true);
    assert.equal(repaired.liveKw, 0);
  });

  it("מנקה חותמת כוזבת כשהעמדה עדיין טוענת את אותה עסקה", () => {
    const repaired = repairWevoOpenRecord(flickerOpen(), now, {
      state: "Charging",
      transactionId: "777",
      rateKw: 7.1
    });
    assert.equal(repaired.chargeEndedAt, null);
    assert.equal(repaired.endDate, null);
    assert.equal(repaired.readyToComplete, false);
  });
});

describe("כלל היומיים בחשד כפילות + שיוך מול טעינה פתוחה", () => {
  const tx = {
    transactionId: "t1",
    plugInTime: "2026-09-29T10:00:00",
    chargingFullTime: "2026-09-29T12:00:00",
    totalEnergyKwh: 20.5,
    totalCost: 15.3
  };
  const sess = (date) => ({
    id: "s-" + date,
    clientId: "c1",
    date,
    kwhRaw: 20.5,
    costToOwner: 15.3
  });

  it("אין חשד כפילות כשהתאריכים במרווח של מעל יומיים — גם עם קוט״ש וסכום זהים", () => {
    assert.equal(findDuplicateSuspect([sess("2026-09-26T10:00:00")], "c1", tx), null);
  });

  it("יש חשד כפילות כשהתאריכים קרובים (יום אחד) עם קוט״ש זהה", () => {
    const s = sess("2026-09-28T10:00:00");
    assert.equal(findDuplicateSuspect([s], "c1", tx), s);
  });

  it("עסקה עם טעינה פתוחה תואמת (אותו txn) מוסתרת מהשיוך", () => {
    const open = { id: "o1", wevoTxnId: "t1", liveKwh: 20.5, liveWevoCost: 15.3, readyToComplete: true };
    assert.deepEqual(findUncataloguedCharges([tx], [], 0, [open]), []);
  });

  it("עסקה עם טעינה פתוחה תואמת (קוט״ש/סכום/זמן, בלי txn) מוסתרת מהשיוך", () => {
    const open = {
      id: "o2",
      plugInAt: "2026-09-29T10:00:00",
      chargeEndedAt: "2026-09-29T12:00:00",
      liveKwh: 20.5,
      liveWevoCost: 15.3,
      readyToComplete: true
    };
    assert.deepEqual(findUncataloguedCharges([tx], [], 0, [open]), []);
  });

  it("עסקה חוזרת לרשימת השיוך אחרי שהפתוחה נמחקה (אין פתוחות)", () => {
    assert.deepEqual(findUncataloguedCharges([tx], [], 0, []), [tx]);
  });

  it("טעינה פתוחה מתאריך רחוק לא מסתירה עסקה", () => {
    const open = {
      id: "o3",
      plugInAt: "2026-09-20T10:00:00",
      chargeEndedAt: "2026-09-20T12:00:00",
      liveKwh: 20.5,
      liveWevoCost: 15.3
    };
    assert.deepEqual(findUncataloguedCharges([tx], [], 0, [open]), [tx]);
  });

  it("רשומת ארכיון לטעינה משויכת — כוללת מזהה עסקה ושם לקוח", () => {
    const e = assignedChargeArchiveEntry(
      { transactionId: "t9", plugInTime: "2026-09-29T10:00:00", totalEnergyKwh: 20.5, totalCost: 15.3 },
      "c1",
      "עדן גיל"
    );
    assert.equal(e.transactionId, "t9");
    assert.equal(e.assignedTo, "c1");
    assert.equal(e.assignedName, "עדן גיל");
    assert.equal(e.kwh, 20.5);
    assert.equal(e.cost, 15.3);
    assert.ok(String(e.key).startsWith("assigned:t9:"));
    assert.ok(e.archivedAt);
  });
});

describe("pickLiveChargeEndMs — סיום חי לא דורס סיום אומת", () => {
  const plugMs = new Date("2026-10-12T15:55").getTime();
  const endMs = new Date("2026-10-12T23:20").getTime();
  const lateMs = new Date("2026-10-13T06:43").getTime();

  it("סיום קיים 23:20 גובר על חותמת חיה מאוחרת 06:43 למחרת (תרחיש עידן 13.10)", () => {
    const st = { state: "Finishing", chargingFullTime: "2026-10-13T06:43" };
    const existing = { chargeEndedAt: "2026-10-12T23:20" };
    assert.equal(pickLiveChargeEndMs(st, existing, plugMs), endMs);
  });

  it("בלי סיום קיים — החותמת החיה נלקחת", () => {
    const st = { state: "Finishing", chargingFullTime: "2026-10-12T23:20" };
    assert.equal(pickLiveChargeEndMs(st, {}, plugMs), endMs);
    assert.equal(pickLiveChargeEndMs(st, null, plugMs), endMs);
  });

  it("עמדה עדיין טוענת — אין סיום", () => {
    const st = { state: "Charging", chargingFullTime: "2026-10-12T23:20" };
    assert.equal(pickLiveChargeEndMs(st, { chargeEndedAt: "2026-10-12T23:20" }, plugMs), null);
  });

  it("סיום קיים ישן מעסקה קודמת (לפני החיבור) לא חוסם חותמת חיה תקפה", () => {
    const st = { state: "Finishing", chargingFullTime: "2026-10-12T23:20" };
    const existing = { chargeEndedAt: "2026-10-11T20:00" };
    assert.equal(pickLiveChargeEndMs(st, existing, plugMs), endMs);
  });

  it("חותמת חיה לפני החיבור — נדחית", () => {
    const st = { state: "Finishing", chargingFullTime: "2026-10-12T10:00" };
    assert.equal(pickLiveChargeEndMs(st, {}, plugMs), null);
  });

  it("חותמת חיה כמספר ms מתקבלת", () => {
    const st = { state: "Available", chargingFullTime: lateMs };
    assert.equal(pickLiveChargeEndMs(st, {}, plugMs), lateMs);
  });
});

describe("monthlyCollection — גביית החודש", () => {
  const Y = 2026, M = 9; // אוקטובר
  const sess = (clientId, day, billed) => ({ clientId, date: `2026-10-${day}T10:00`, amountBilled: billed });
  const pay = (clientId, day, amount) => ({ clientId, date: `2026-10-${day}T12:00`, amount });

  it("מחשב חויב/נגבה/אחוז לאותו חודש בלבד, בלי לקוח עצמי", () => {
    const r = monthlyCollection(
      [sess("a", "05", 200), sess("b", "06", 100), sess("self", "06", 999), sess("a", "05", 50)],
      [pay("b", "07", 100), pay("c", "07", 50), pay("self", "07", 500)],
      ["self"], Y, M
    );
    // billed: 200+100+50 (העצמי מוחרג); collected: 100+50
    assert.equal(r.billed, 350);
    assert.equal(r.collected, 150);
    assert.equal(r.pct, 43);
  });

  it("חודש אחר לא נספר", () => {
    const r = monthlyCollection(
      [{ clientId: "a", date: "2026-09-30T23:00", amountBilled: 700 }],
      [{ clientId: "a", date: "2026-11-01T09:00", amount: 700 }],
      [], Y, M
    );
    assert.deepEqual(r, { billed: 0, collected: 0, pct: null });
  });

  it("אחוז מוגבל ל־100 גם כשנגבה יותר מהחיוב החודשי", () => {
    const r = monthlyCollection([sess("a", "05", 100)], [pay("a", "06", 260)], [], Y, M);
    assert.equal(r.pct, 100);
  });

  it("תשלום שלילי/אפס לא נספר כגבייה", () => {
    const r = monthlyCollection([sess("a", "05", 100)], [pay("a", "06", 0), pay("a", "06", -30), pay("a", "06", 40)], [], Y, M);
    assert.equal(r.collected, 40);
  });
});

describe("resolveChargeTimeline (lib) — גזירת ציר זמן", () => {
  it("עסקה גמורה: חותמת Wevo קובעת את הסיום (מקרה עידן)", () => {
    const tl = resolveChargeTimeline(
      { plugInTime: "2026-10-11T15:55", chargingFullTime: "2026-10-11T23:18", netDuration: 26740 },
      {}
    );
    assert.equal(tl.chargeEndAt, "2026-10-11T23:18");
    assert.equal(tl.plugInAt, "2026-10-11T15:55");
    assert.equal(tl.billMins, 443);
  });

  it("התחלת זרם חיה + נטו: סיום = התחלה + נטו", () => {
    const tl = resolveChargeTimeline({}, {
      plugInAt: "2026-10-12T15:55",
      chargeStartedAt: "2026-10-12T15:55",
      netDuration: 26700
    });
    assert.equal(tl.chargeEndAt, "2026-10-12T23:20");
    assert.equal(tl.chargeStartAt, "2026-10-12T15:55");
  });

  it("finalEndAt גובר על חותמת חיה מאוחרת (באג הסיום הכפול)", () => {
    const tl = resolveChargeTimeline({}, {
      plugInAt: "2026-10-12T15:55",
      chargeStartedAt: "2026-10-12T15:55",
      chargeEndedAt: "2026-10-13T06:43",
      chargingFullTime: "2026-10-13T06:43",
      finalEndAt: "2026-10-12T23:20"
    });
    assert.equal(tl.chargeEndAt, "2026-10-12T23:20");
  });

  it("חידוש אחרי הפסקת פרימיום: חותמת העסקה גוברת על התחלה+נטו", () => {
    // זרם 15:00–17:00, הפסקה, חידוש 23:00–23:30. נטו 5 שעות היה נותן 20:00 — שגוי.
    const tl = resolveChargeTimeline(
      { plugInTime: "2026-10-12T15:00", chargingFullTime: "2026-10-12T23:30", netDuration: 5 * 3600 },
      {}
    );
    assert.equal(tl.chargeEndAt, "2026-10-12T23:30");
  });

  it("המתנה ארוכה (idle ≥ 20 דק׳): סיום בניתוק, התחלה = ניתוק − נטו", () => {
    const tl = resolveChargeTimeline({}, {
      plugInAt: "2026-10-12T10:00",
      plugOutAt: "2026-10-12T20:00",
      netDuration: 2 * 3600
    });
    assert.equal(tl.chargeEndAt, "2026-10-12T20:00");
    assert.equal(tl.chargeStartAt, "2026-10-12T18:00");
  });

  it("סיום לא יכול לעבור את הוצאת הכבל", () => {
    const tl = resolveChargeTimeline({}, {
      plugInAt: "2026-10-12T10:00",
      plugOutAt: "2026-10-12T12:00",
      chargeEndedAt: "2026-10-12T15:00"
    });
    assert.equal(tl.chargeEndAt, "2026-10-12T12:00");
  });
});
