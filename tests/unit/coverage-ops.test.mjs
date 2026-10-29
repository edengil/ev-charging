import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  shouldCloseStaleWevoOpen,
  wevoOpenLooksFinished,
  validChargeEndMs,
  openFollowsLiveCharge,
  mergeWatchEvents,
  preferLiveStamps
} from "../../lib/ev-money.mjs";

// ב7 (18.10.2026) — כיסוי לשלושה אזורים שלא נבדקו: מחזור חיי מנויי Push,
// טיק חמוש של השומר כשה־Wevo לא נגיש (בטיחות: אין אישור בלי מצב טרי),
// וסגירת טעינות יתומות/תקועות בצד הלקוח.

const iso = minAgo => new Date(Date.now() - minAgo * 60000).toISOString();

describe("טעינות יתומות — shouldCloseStaleWevoOpen", () => {
  const base = { id: "o1", plugInAt: iso(60), startDate: iso(60) };

  it("רשומה שכבר מוכנה לאישור לא נסגרת שוב", () => {
    assert.equal(shouldCloseStaleWevoOpen({ ...base, readyToComplete: true, chargeEndedAt: iso(30) }), false);
  });

  it("חותמת סיום ישנה (מעבר לחסד של 3 דקות) — נסגרת גם בלי דגל idle", () => {
    const open = { ...base, chargeEndedAt: iso(10) };
    assert.equal(wevoOpenLooksFinished(open), true);
    assert.equal(shouldCloseStaleWevoOpen(open), true);
  });

  it("חותמת סיום טרייה (בתוך החסד) — עדיין לא נסגרת", () => {
    const open = { ...base, chargeEndedAt: iso(1) };
    assert.equal(shouldCloseStaleWevoOpen(open), false);
  });

  it("בלי חותמת סיום: נסגרת רק כשהעמדה idle והטעינה ותיקה מ־3 דקות", () => {
    assert.equal(shouldCloseStaleWevoOpen({ ...base }, { nowIdle: true }), true);
    assert.equal(shouldCloseStaleWevoOpen({ ...base, plugInAt: iso(1), startDate: iso(1) }, { nowIdle: true }), false);
    assert.equal(shouldCloseStaleWevoOpen({ ...base }, { nowIdle: false }), false);
    assert.equal(shouldCloseStaleWevoOpen({ ...base }), false);
  });

  it("חותמת סיום שלפני החיבור אינה תקפה (validChargeEndMs)", () => {
    assert.equal(validChargeEndMs({ plugInAt: iso(10), chargeEndedAt: iso(20) }), null);
    assert.ok(validChargeEndMs({ plugInAt: iso(20), chargeEndedAt: iso(10) }) > 0);
  });

  it("openFollowsLiveCharge: התאמה לפי עסקה בלבד כשהעמדה טוענת", () => {
    const open = { wevoTxnId: "111", plugInAt: iso(30), startDate: iso(30) };
    assert.equal(openFollowsLiveCharge(open, { state: "Charging", transactionId: 111 }), true);
    assert.equal(openFollowsLiveCharge(open, { state: "Available", transactionId: 111 }), false);
    assert.equal(openFollowsLiveCharge(open, { state: "Charging", transactionId: 222, plugInTime: Date.now() - 3600000, totalEnergyKwh: 5 }), false);
    assert.equal(openFollowsLiveCharge({ ...open, source: "wevo-sync" }, { state: "Charging", transactionId: 111 }), false);
  });
});

// ── טעינת מודולי functions/ כ־ESM זמני (אותו דפוס כמו wevo-watch.test.mjs) ──
const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const dir = mkdtempSync(join(tmpdir(), "ev-ops-"));
mkdirSync(join(dir, "_shared"), { recursive: true });
mkdirSync(join(dir, "api"), { recursive: true });
const copyAs = (from, to) => {
  const src = readFileSync(join(root, from), "utf8")
    .replaceAll("../_shared/wevo.js", "../_shared/wevo.mjs")
    .replaceAll("../_shared/push.js", "../_shared/push.mjs")
    .replaceAll("../_shared/watch-store.js", "../_shared/watch-store.mjs")
    .replaceAll("./wevo.js", "./wevo.mjs")
    .replaceAll("./push.js", "./push.mjs");
  writeFileSync(join(dir, to), src);
};
copyAs("functions/_shared/wevo.js", "_shared/wevo.mjs");
copyAs("functions/_shared/push.js", "_shared/push.mjs");
copyAs("functions/_shared/watch-store.js", "_shared/watch-store.mjs");
copyAs("functions/api/wevo-watch.js", "api/wevo-watch.mjs");
copyAs("functions/api/push.js", "api/push.mjs");
const watch = await import(pathToFileURL(join(dir, "api/wevo-watch.mjs")).href);
const pushApi = await import(pathToFileURL(join(dir, "api/push.mjs")).href);
rmSync(dir, { recursive: true, force: true });

function makeKv() {
  const m = new Map();
  return {
    _map: m,
    async get(k, opts) {
      const v = m.get(k);
      if (v == null) return null;
      return opts && opts.type === "json" ? JSON.parse(v) : v;
    },
    async put(k, v) { m.set(k, String(v)); },
    async delete(k) { m.delete(k); }
  };
}

let wevoDown = false;
const realFetch = globalThis.fetch;
beforeEach(() => {
  wevoDown = false;
  globalThis.fetch = async (url) => {
    if (String(url).includes("cognito-idp")) {
      return new Response(JSON.stringify({ AuthenticationResult: { AccessToken: "tok-1" } }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    if (wevoDown) throw new Error("Wevo לא נגיש (דימוי)");
    throw new Error("fetch לא צפוי בבדיקות ב7: " + url);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

async function callPost(mod, env, body) {
  const req = { method: "POST", json: async () => body };
  const res = await mod.onRequestPost({ request: req, env });
  return { status: res.status, body: await res.json() };
}

const CREDS = { email: "eden@example.com", password: "pw-secret-123" };
const SUB = {
  endpoint: "https://push.example.com/sub/abc123",
  keys: { p256dh: "B".repeat(80), auth: "a".repeat(22) }
};

async function vapidEnv() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  // פורמט הייצור: ה־JWK נשמר ב־env כ־base64url של ה־JSON (כך loadVapidJwk קורא אותו)
  const stored = Buffer.from(JSON.stringify(jwk), "utf8").toString("base64url");
  return { EV_BACKUP: makeKv(), VAPID_PRIVATE_JWK: stored };
}

describe("Push — מחזור חיי מנויים", () => {
  it("GET בלי מפתח VAPID מחזיר 503; עם מפתח מחזיר publicKey", async () => {
    const noKey = await pushApi.onRequestGet({ env: { EV_BACKUP: makeKv() } });
    assert.equal(noKey.status, 503);
    const env = await vapidEnv();
    const res = await pushApi.onRequestGet({ env });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.publicKey, "string");
    assert.ok(body.publicKey.length > 40);
  });

  it("subscribe שומר מנוי, הרשמה חוזרת לאותו endpoint לא מכפילה, unsubscribe מסיר", async () => {
    const env = await vapidEnv();
    const r1 = await callPost(pushApi, env, { action: "subscribe", ...CREDS, subscription: SUB });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.count, 1);
    const r2 = await callPost(pushApi, env, { action: "subscribe", ...CREDS, subscription: SUB });
    assert.equal(r2.body.count, 1);
    const sub2 = { endpoint: "https://push.example.com/sub/def456", keys: SUB.keys };
    const r3 = await callPost(pushApi, env, { action: "subscribe", ...CREDS, subscription: sub2 });
    assert.equal(r3.body.count, 2);
    const stored = JSON.parse(env.EV_BACKUP._map.get("push:subs"));
    assert.equal(stored.length, 2);
    const r4 = await callPost(pushApi, env, { action: "unsubscribe", ...CREDS, endpoint: SUB.endpoint });
    assert.equal(r4.body.count, 1);
  });

  it("מנוי לא תקין (endpoint לא-https) נדחה ב־400", async () => {
    const env = await vapidEnv();
    const bad = { endpoint: "http://insecure.example.com/x", keys: SUB.keys };
    const r = await callPost(pushApi, env, { action: "subscribe", ...CREDS, subscription: bad });
    assert.equal(r.status, 400);
  });
});

describe("שומר — טיק חמוש כשה־Wevo לא נגיש", () => {
  it("אין אישור פרימיום ואין סימון actedKey בלי קריאת מצב מוצלחת", async () => {
    const env = {
      EV_BACKUP: makeKv(),
      EV_WATCH_KEY: Buffer.alloc(32, 9).toString("base64"),
      EV_WATCH_TICK_SECRET: "tick-secret-1"
    };
    const reg = await callPost(watch, env, {
      action: "register", ...CREDS, clientId: "c1", clientName: "שכן בדיקה",
      peakStartMin: 1020, peakEndMin: 1380
    });
    assert.equal(reg.status, 200);
    // מכינים את תנאי ההיפוך: היה בטעינה, לא היה פיק — אם המצב היה נקרא,
    // מעבר לפיק עם הפסקת טעינה היה מפעיל אישור. ה־Wevo "למטה" כעת.
    const cfg = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    cfg.wasCharging = true;
    cfg.wasPeak = false;
    env.EV_BACKUP._map.set("watch:cfg", JSON.stringify(cfg));
    wevoDown = true;
    await callPost(watch, env, { action: "tick", secret: "tick-secret-1" });
    const log = JSON.parse(env.EV_BACKUP._map.get("watch:log") || "[]");
    assert.equal(log.some(e => e.kind === "authorize"), false);
    const after = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    assert.ok(!after.actedKey, "actedKey לא סומן — האישור לא בוצע");
  });
});

describe("ב3 — mergeWatchEvents (מיזוג חותמות שרת לרשומה פתוחה)", () => {
  const ev = {
    txnId: "777",
    plugInAt: new Date("2026-01-15T14:14").getTime(),
    chargeStartedAt: new Date("2026-01-15T14:59").getTime(),
    chargingFullTime: new Date("2026-01-15T20:20").getTime(),
    chargeEndedAt: new Date("2026-01-15T20:20").getTime(),
    plugOutAt: new Date("2026-01-15T20:54").getTime()
  };

  it("ממלא את כל החותמות החסרות ומנפיק verifiedEndAt מחותמת ה־full", () => {
    const patch = mergeWatchEvents({ id: "o1", wevoTxnId: "777" }, ev);
    assert.equal(patch.plugInAt, "2026-01-15T14:14");
    assert.equal(patch.chargeStartedAt, "2026-01-15T14:59");
    assert.equal(patch.chargingFullTime, "2026-01-15T20:20");
    assert.equal(patch.chargeEndedAt, "2026-01-15T20:20");
    assert.equal(patch.verifiedEndAt, "2026-01-15T20:20");
    assert.equal(patch.plugOutAt, "2026-01-15T20:54");
  });

  it("לעולם לא דורס ערכים שהאפליקציה כבר לכדה", () => {
    const open = {
      id: "o1", wevoTxnId: "777",
      plugInAt: "2026-01-15T14:10", chargeEndedAt: "2026-01-15T20:15",
      verifiedEndAt: "2026-01-15T20:15", chargingFullTime: "2026-01-15T20:15"
    };
    const patch = mergeWatchEvents(open, ev);
    assert.equal(patch.plugInAt, undefined);
    assert.equal(patch.chargeEndedAt, undefined);
    assert.equal(patch.verifiedEndAt, undefined);
    assert.equal(patch.chargingFullTime, undefined);
    assert.equal(patch.chargeStartedAt, "2026-01-15T14:59"); // היחיד שהיה חסר
  });

  it("בלי אירועים או בלי חותמות — null", () => {
    assert.equal(mergeWatchEvents({ id: "o1" }, null), null);
    assert.equal(mergeWatchEvents({ id: "o1" }, { txnId: "777" }), null);
    assert.equal(mergeWatchEvents(null, ev), null);
  });
});

describe("ב3 — חיווט הבאנדל (שומר רגרסיה)", () => {
  it("mergeWatchEvents מיוצא מהספרייה ומחווט ב־inject-app כשם גלובלי", () => {
    const inject = readFileSync(join(root, "scripts/inject-app.mjs"), "utf8");
    assert.match(inject, /mergeWatchEvents: mergeWatchEvents,/);
    assert.match(inject, /var mergeWatchEvents = __EV_MONEY__\.mergeWatchEvents;/);
    // שלב 2 בפיצול הפאנל: קריאת המיזוג עברה עם גשר השומר ל־wevo-watch-bridge.js
    const bridge = readFileSync(join(root, "src/views/wevo-watch-bridge.js"), "utf8");
    assert.match(bridge, /mergeWatchEvents\(o, ev\)/);
  });
});

describe("F1–F3 (19.10) — חותמות חיות גוברות על חותמות עסקת קטע של Wevo", () => {
  const ms = (h, m) => new Date(2026, 9, 18, h, m).getTime();

  it("preferLiveStamps: סטייה מעל 30 דקות — הלכידה החיה מנצחת; המקור לא משתנה", () => {
    const tl = {
      plugInAt: "2026-10-18T16:42", plugInMs: ms(16, 42),
      chargeStartAt: "2026-10-18T16:42", chargeStartMs: ms(16, 42),
      chargeEndAt: "2026-10-18T18:27", chargeEndMs: ms(18, 27),
      plugOutAt: "2026-10-18T18:27", plugOutMs: ms(18, 27)
    };
    const open = { plugInAt: "2026-10-18T14:44", chargeStartedAt: "2026-10-18T14:45" };
    const out = preferLiveStamps(tl, open);
    assert.equal(out.plugInAt, "2026-10-18T14:44");
    assert.equal(out.chargeStartAt, "2026-10-18T14:45");
    assert.equal(out.chargeEndAt, "2026-10-18T18:27", "סיום לא נוגעים בו");
    assert.equal(tl.plugInAt, "2026-10-18T16:42", "המקור לא שונה");
  });

  it("preferLiveStamps: סטייה קטנה (≤30 דקות) — ציר הזמן נשאר; בלי לכידה חיה — אין שינוי", () => {
    const tl = { plugInAt: "2026-10-18T14:50", plugInMs: ms(14, 50), chargeStartAt: "2026-10-18T14:52", chargeStartMs: ms(14, 52) };
    const out = preferLiveStamps(tl, { plugInAt: "2026-10-18T14:44", chargeStartedAt: "2026-10-18T14:45" });
    assert.equal(out.plugInAt, "2026-10-18T14:50");
    assert.equal(preferLiveStamps(tl, {}), tl);
    assert.equal(preferLiveStamps(null, { plugInAt: "2026-10-18T14:44" }), null);
  });

  it("חיווט: F1 בבלוק הסנכרון ו־F3 באשף וב־inject", () => {
    const sync = readFileSync(join(root, "src/40-wevo-sync.js"), "utf8");
    assert.match(sync, /plugInAt: openMatch && \(openMatch\.plugInAt \|\| openMatch\.startDate\)/);
    assert.match(sync, /chargeStartedAt: openMatch\.chargeStartedAt \|\| win\.chargeStartAt/);
    const wizard = readFileSync(join(root, "src/views/complete-session.js"), "utf8");
    assert.match(wizard, /preferLiveStamps\(sessionTimeline, openSession\)/);
    assert.match(wizard, /preferLiveStamps\(fields\.timeline, openSession\)/);
    const inject = readFileSync(join(root, "scripts/inject-app.mjs"), "utf8");
    assert.match(inject, /preferLiveStamps: preferLiveStamps,/);
    assert.match(inject, /var preferLiveStamps = __EV_MONEY__\.preferLiveStamps;/);
  });
});
