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
  findMatchingWevoOpen,
  listConflictingWevoOpens,
  wevoOpenTxnId,
  isActiveWevoOpen,
  validChargeEndMs,
  wevoOpenLooksFinished,
  shouldCloseStaleWevoOpen,
  openChargeStatus,
  stationStillCharging,
  isUsableStationSample,
  holdLiveStation,
  shouldShowNotifyEnable,
  repairWevoOpenRecord,
  savedSessionMatchesCharge,
  shouldDiscardOpen,
  dropOpensAlreadySaved,
  chargerReportsVehicle,
  dedupeSessionsByTxn,
  routeNotifyClick,
  fictionalBilledDisplay
} from "../../lib/ev-money.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

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
    const repaired = repairWevoOpenRecord(stale, now);
    assert.equal(repaired.readyToComplete, true);
    assert.equal(repaired.liveKw, 0);
    assert.equal(shouldCloseStaleWevoOpen(stale, { nowMs: now, nowIdle: false }), true);
    assert.equal(repairWevoOpenRecord(repaired, now), repaired);
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
    const src = readFileSync(join(root, "app-source.js"), "utf8");
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
    assert.equal(openChargeStatus({ wevoTxnId: "42", liveKw: 6 }, { state: "Finishing", transactionId: "42" }).kind, "cable");
    assert.match(readFileSync(join(root, "app-source.js"), "utf8"), /liveChargeEndStamp/);
    assert.match(readFileSync(join(root, "app-source.js"), "utf8"), /clearFinishedIfStillCharging/);
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
    const src = readFileSync(join(root, "app-source.js"), "utf8");
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
    const src = readFileSync(join(root, "app-source.js"), "utf8");
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

  it("יש כפתורי אישור ייעודיים + אישור ראשון אוטומטי + כפתור לקוח", () => {
    const src = readFileSync(join(root, "app-source.js"), "utf8");
    assert.match(src, /wevo-preauth-arm/);
    assert.match(src, /wevo-fullauth-arm/);
    assert.match(src, /client-preauth-/);
    assert.match(src, /armWevoClientPreauth/);
    assert.match(src, /sealConflictingWevoOpens/);
    assert.match(src, /findMatchingWevoOpen/);
    assert.match(src, /listConflictingWevoOpens/);
    assert.match(src, /repairWevoOpenRecord/);
    assert.match(src, /openChargeStatus/);
    assert.match(src, /chargerReportsVehicle/);
    assert.match(src, /dropOpensAlreadySaved/);
    assert.match(src, /shouldDiscardOpen/);
    assert.match(src, /dedupeSessionsByTxn/);
    assert.match(src, /routeNotifyClick/);
    assert.match(src, /ev-notify/);
    assert.match(src, /notifyPhone/);
    assert.match(src, /nav-debts/);
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
