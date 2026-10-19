import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";

// functions/ נכתבו כ־ESM אך package.json הוא commonjs — מעתיקים לעץ זמני עם סיומת mjs
// (אותו דפוס כמו push.test.mjs), עם שכתוב מפרטי הייבוא היחסיים.
const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const dir = mkdtempSync(join(tmpdir(), "ev-watch-"));
mkdirSync(join(dir, "_shared"), { recursive: true });
mkdirSync(join(dir, "api"), { recursive: true });
const copyAs = (from, to) => {
  const src = readFileSync(join(root, from), "utf8")
    .replaceAll("../_shared/wevo.js", "../_shared/wevo.mjs")
    .replaceAll("../_shared/push.js", "../_shared/push.mjs")
    .replaceAll("./wevo.js", "./wevo.mjs")
    .replaceAll("./push.js", "./push.mjs");
  writeFileSync(join(dir, to), src);
};
copyAs("functions/_shared/wevo.js", "_shared/wevo.mjs");
copyAs("functions/_shared/push.js", "_shared/push.mjs");
copyAs("functions/api/wevo-watch.js", "api/wevo-watch.mjs");
copyAs("watcher/worker.js", "worker.mjs");
const watch = await import(pathToFileURL(join(dir, "api/wevo-watch.mjs")).href);
const workerMod = await import(pathToFileURL(join(dir, "worker.mjs")).href);
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

function makeEnv() {
  return {
    EV_BACKUP: makeKv(),
    EV_WATCH_KEY: Buffer.alloc(32, 9).toString("base64"),
    EV_WATCH_TICK_SECRET: "tick-secret-1"
  };
}

let cognitoOk = true;
const realFetch = globalThis.fetch;
beforeEach(() => {
  cognitoOk = true;
  globalThis.fetch = async (url) => {
    if (String(url).includes("cognito-idp")) {
      if (cognitoOk) {
        return new Response(JSON.stringify({ AuthenticationResult: { AccessToken: "tok-1" } }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ message: "Incorrect username or password.", __type: "NotAuthorizedException" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }
    throw new Error("fetch לא צפוי בבדיקות השומר: " + url);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

async function call(env, body) {
  const req = { method: "POST", json: async () => body };
  const res = await watch.onRequestPost({ request: req, env });
  return { status: res.status, body: await res.json() };
}

const CREDS = { email: "eden@example.com", password: "pw-secret-123" };
const REGISTER = { action: "register", ...CREDS, clientId: "c1", clientName: "שכן בדיקה", peakStartMin: 1020, peakEndMin: 1380 };

describe("wevo-watch — שומר צד־שרת", () => {
  it("פעולה לא מוכרת נדחית ב־400", async () => {
    const r = await call(makeEnv(), { action: "bogus" });
    assert.equal(r.status, 400);
    assert.equal(r.body.ok, false);
  });

  it("tick עם סוד שגוי או חסר נדחה ב־403", async () => {
    const env = makeEnv();
    assert.equal((await call(env, { action: "tick", secret: "wrong" })).status, 403);
    assert.equal((await call(env, { action: "tick" })).status, 403);
  });

  it("tick תקין בלי רישום — לא חמוש", async () => {
    const r = await call(makeEnv(), { action: "tick", secret: "tick-secret-1" });
    assert.equal(r.status, 200);
    assert.equal(r.body.armed, false);
  });

  it("register בלי חלון פרימיום נדחה ב־400", async () => {
    const r = await call(makeEnv(), { action: "register", ...CREDS, clientId: "c1" });
    assert.equal(r.status, 400);
  });

  it("register עם פרטי Wevo שגויים נדחה ב־401", async () => {
    cognitoOk = false;
    const r = await call(makeEnv(), REGISTER);
    assert.equal(r.status, 401);
  });

  it("register תקין: נשמר מוצפן (בלי סיסמה בטקסט), status משקף חמוש", async () => {
    const env = makeEnv();
    const r = await call(env, REGISTER);
    assert.equal(r.status, 200);
    assert.equal(r.body.armed, true);
    const raw = env.EV_BACKUP._map.get("watch:cfg");
    assert.ok(raw && !raw.includes("pw-secret-123"), "הסיסמה לא נשמרת כטקסט גלוי ב־KV");
    const st = await call(env, { action: "status", ...CREDS });
    assert.equal(st.body.armed, true);
    assert.equal(st.body.clientName, "שכן בדיקה");
  });

  it("deregister עם אימייל לא תואם נדחה ב־403; תואם מוחק את הרישום", async () => {
    const env = makeEnv();
    await call(env, REGISTER);
    const bad = await call(env, { action: "deregister", email: "other@example.com", password: CREDS.password });
    assert.equal(bad.status, 403);
    const ok = await call(env, { action: "deregister", ...CREDS });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.armed, false);
    const st = await call(env, { action: "status", ...CREDS });
    assert.equal(st.body.armed, false);
  });

  it("tick אחרי 24 שעות פוקע: מוחק רישום ומסמן expired", async () => {
    const env = makeEnv();
    await call(env, REGISTER);
    const cfg = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    cfg.armedAt = Date.now() - 25 * 3600 * 1000;
    env.EV_BACKUP._map.set("watch:cfg", JSON.stringify(cfg));
    const r = await call(env, { action: "tick", secret: "tick-secret-1" });
    assert.equal(r.status, 200);
    assert.equal(r.body.expired, true);
    assert.equal(r.body.armed, false);
    assert.equal(env.EV_BACKUP._map.has("watch:cfg"), false);
  });
});

describe("watcher worker — טריגר הטיק", () => {
  it("scheduled שולח tick עם הסוד לנקודת הקצה של האפליקציה", async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push({ url: String(url), opts });
      return new Response("{}", { status: 200 });
    };
    let pending = null;
    const ctx = { waitUntil(p) { pending = p; } };
    await workerMod.default.scheduled({}, { TICK_SECRET: "abc-123" }, ctx);
    await pending;
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://eden-ev-charge.pages.dev/api/wevo-watch");
    const body = JSON.parse(calls[0].opts.body);
    assert.equal(body.action, "tick");
    assert.equal(body.secret, "abc-123");
  });

  it("fetch מריץ tick ומחזיר שורת סטטוס", async () => {
    globalThis.fetch = async () => new Response("{\"ok\":true}", { status: 200 });
    const res = await workerMod.default.fetch(new Request("https://worker.example/"), { TICK_SECRET: "abc-123" });
    const txt = await res.text();
    assert.ok(txt.startsWith("tick status 200"));
  });
});

describe("ב3 — eventsFromStateDiff (לכידת אירועי טעינה)", () => {
  const diff = watch.eventsFromStateDiff;
  const T0 = 1768479240000; // plugInTime
  const FULL = 1768501200000;

  it("חיבור חדש מייצר אירוע plugIn עם plugInTime של Wevo", () => {
    const d = diff({ connected: false, charging: false, lastTxnId: null, lastFullMs: null },
      { connected: true, charging: false, transactionId: 777, plugInTime: T0 }, T0 + 60000);
    assert.equal(d.plugIn.txnId, "777");
    assert.equal(d.plugIn.atMs, T0);
    assert.equal(d.chargeStart, undefined);
    assert.equal(d.plugOut, undefined);
  });

  it("מעבר לטעינה מייצר chargeStart בזמן התצפית; בלי שינוי — אין אירועים", () => {
    const prev = { connected: true, charging: false, state: "Preparing", lastTxnId: "777", lastFullMs: null };
    const d = diff(prev, { connected: true, charging: true, state: "Charging", transactionId: 777, plugInTime: T0 }, T0 + 120000);
    assert.equal(d.chargeStart.atMs, T0 + 120000);
    const none = diff({ connected: true, charging: true, state: "Charging", lastTxnId: "777", lastFullMs: null },
      { connected: true, charging: true, state: "Charging", transactionId: 777, plugInTime: T0 }, T0 + 180000);
    assert.deepEqual(none, {});
  });

  it("חותמת full חדשה מייצרת אירוע full; אותה חותמת שוב — לא", () => {
    const prev = { connected: true, charging: true, lastTxnId: "777", lastFullMs: null };
    const st = { connected: true, charging: false, transactionId: 777, chargingFullTime: FULL };
    const d = diff(prev, st, FULL + 60000);
    assert.equal(d.full.atMs, FULL);
    const again = diff({ ...prev, lastFullMs: FULL }, st, FULL + 120000);
    assert.equal(again.full, undefined);
  });

  it("ניתוק מייחס plugOut לעסקה הקודמת גם כשהמצב החדש בלי עסקה", () => {
    const d = diff({ connected: true, charging: false, lastTxnId: "777", lastFullMs: FULL },
      { connected: false, charging: false, transactionId: null }, FULL + 3600000);
    assert.equal(d.plugOut.txnId, "777");
  });

  it("שילוב חיווט בשומר: status מחזיר events, ו־deregister מוחק את מפתח האירועים", () => {
    const src = readFileSync(join(root, "functions/api/wevo-watch.js"), "utf8");
    assert.match(src, /EVENTS_KEY = "watch:events"/);
    assert.match(src, /events,/);
    assert.match(src, /delete\(EVENTS_KEY\)/);
    assert.match(src, /recordWatchEvents\(env, cfg, diff/);
  });

  it("עצירת זרם כשהכבל מחובר: chargeStop; SuspendedEVSE מסומן evsePaused", () => {
    const prev = { connected: true, charging: true, lastTxnId: "777", lastFullMs: null };
    const d = diff(prev, { connected: true, charging: false, transactionId: 777, state: "SuspendedEVSE" }, T0 + 3600000);
    assert.ok(d.chargeStop, "chargeStop קיים");
    assert.equal(d.chargeStop.evsePaused, true);
    assert.equal(d.full, undefined);
    const d2 = diff(prev, { connected: true, charging: false, transactionId: 777, state: "Finishing" }, T0 + 3600000);
    assert.ok(d2.full && d2.full.approx, "Finishing אחרי זרם = סיום מקורב, לא עצירת שיא");
    assert.equal(d2.chargeStop, undefined);
  });

  it("full באותה דגימה מדכא chargeStop; בלי טעינה קודמת אין chargeStop", () => {
    const prev = { connected: true, charging: true, lastTxnId: "777", lastFullMs: null };
    const d = diff(prev, { connected: true, charging: false, transactionId: 777, chargingFullTime: FULL, state: "SuspendedEV" }, FULL + 60000);
    assert.ok(d.full);
    assert.equal(d.chargeStop, undefined);
    const idle = diff({ connected: true, charging: false, lastTxnId: "777", lastFullMs: null },
      { connected: true, charging: false, transactionId: 777, state: "SuspendedEVSE" }, T0 + 3600000);
    assert.equal(idle.chargeStop, undefined);
  });

  it("chargeStoppedAt מחווט ברישום האירועים (ראשון בלבד)", () => {
    const src = readFileSync(join(root, "functions/api/wevo-watch.js"), "utf8");
    assert.match(src, /chargeStoppedAt == null/);
    assert.match(src, /e\.chargeStoppedAt = diff\.chargeStop\.atMs/);
  });
});

describe("ב3 v2 — זיהוי מבוסס מצב (רגרסיית 19.10: charging לא נופל ב־SuspendedEV)", () => {
  const diff = watch.eventsFromStateDiff;
  const T0 = 1768479240000;

  it("סיום מזוהה ממעבר Charging→SuspendedEV גם בלי מזהה עסקה ובלי חותמת (זהות לפי שעת חיבור)", () => {
    const prev = { connected: true, charging: true, state: "Charging", lastEventKey: `plug-${T0}`, lastFullMs: null, didCompleteFull: false };
    const st = { connected: true, charging: true, state: "SuspendedEV", transactionId: 0, plugInTime: T0, rateKw: 0 };
    const d = diff(prev, st, T0 + 7200000);
    assert.ok(d.full, "אירוע סיום נוצר");
    assert.equal(d.full.approx, true);
    assert.equal(d.full.txnId, `plug-${T0}`);
    assert.equal(d.chargeStop, undefined);
  });

  it("didCompleteFull שהתהפך מייצר סיום גם אם המצב עוד לא השתנה", () => {
    const prev = { connected: true, charging: true, state: "Charging", lastEventKey: "55", lastFullMs: null, didCompleteFull: false };
    const st = { connected: true, charging: true, state: "Charging", transactionId: 55, plugInTime: T0, didCompleteFull: true };
    const d = diff(prev, st, T0 + 7200000);
    assert.ok(d.full && d.full.approx);
    // הטיק מסמן fullNotifiedKey אחרי כל אירוע full — כך נראה ה־prev האמיתי בסיבוב הבא
    const again = diff({ ...prev, didCompleteFull: true, fullNotifiedKey: "55" }, st, T0 + 7260000);
    assert.equal(again.full, undefined, "לא יורה פעמיים");
  });

  it("SuspendedEV בלי זרם קודם (הושהה מההתחלה) — אין סיום כוזב", () => {
    const prev = { connected: true, charging: true, state: "SuspendedEV", lastEventKey: `plug-${T0}`, lastFullMs: null, didCompleteFull: false };
    const st = { connected: true, charging: true, state: "SuspendedEV", transactionId: null, plugInTime: T0, rateKw: 0 };
    const d = diff(prev, st, T0 + 7200000);
    assert.equal(d.full, undefined);
  });

  it("חיבור בלי מזהה עסקה — plugIn עם זהות שעת־חיבור; ניתוק מיוחס לאותה זהות", () => {
    const d = diff({ connected: false, charging: false, state: null, lastEventKey: null },
      { connected: true, charging: false, state: "Preparing", transactionId: 0, plugInTime: T0 }, T0 + 60000);
    assert.equal(d.plugIn.txnId, `plug-${T0}`);
    const out = diff({ connected: true, charging: true, state: "SuspendedEV", lastEventKey: `plug-${T0}` },
      { connected: false, charging: false, state: "Available", transactionId: null }, T0 + 7300000);
    assert.equal(out.plugOut.txnId, `plug-${T0}`);
  });

  it("שומר מקור: סיום מקורב לא כותב chargingFullTime ברישום האירועים", () => {
    const src = readFileSync(join(root, "functions/api/wevo-watch.js"), "utf8");
    assert.match(src, /diff\.full\.approx/);
    assert.match(src, /e\.endApprox = true/);
  });

  it("סיום שכבר קרה (didCompleteFull דלוק, מעברים נצרכו) מדווח פעם אחת לפי fullNotifiedKey", () => {
    const prev = { connected: true, charging: true, state: "SuspendedEV", lastEventKey: "plug-5", lastFullMs: null, didCompleteFull: true, fullNotifiedKey: null };
    const st = { connected: true, charging: true, state: "SuspendedEV", transactionId: null, plugInTime: 5, didCompleteFull: true };
    const d = diff(prev, st, T0 + 8000000);
    assert.ok(d.full && d.full.approx, "דווח סיום מאוחר");
    const again = diff({ ...prev, fullNotifiedKey: "plug-5" }, st, T0 + 8060000);
    assert.equal(again.full, undefined, "לא מדווח שוב באותו חיבור");
  });

  it("זהות מושב מקומית (watch-*) מה־cfg משמשת כשאין שום זהות מהפיד", () => {
    const prev = { connected: true, charging: true, state: "Charging", lastEventKey: "watch-123", lastFullMs: null, didCompleteFull: false, fullNotifiedKey: null };
    const st = { connected: true, charging: true, state: "SuspendedEV", transactionId: 0, plugInTime: 0, didCompleteFull: true };
    const d = diff(prev, st, T0 + 8000000);
    assert.ok(d.full);
    assert.equal(d.full.txnId, "watch-123");
  });

  it("היפוכי מצב Charging↔SuspendedEV: סיום מקורב אחד בלבד לחיבור (רגרסיית הצפת 19.10)", () => {
    // מדמה את שרשור ה־prev שהטיק שומר: אחרי ירייה ראשונה fullNotifiedKey נטבע
    let prev = { connected: true, charging: true, state: "Charging", lastEventKey: "6301736", lastFullMs: null, didCompleteFull: false, fullNotifiedKey: null };
    let fulls = 0;
    const seq = ["SuspendedEV", "Charging", "SuspendedEV", "Charging", "SuspendedEV", "Charging"];
    seq.forEach((state, i) => {
      const st = { connected: true, charging: true, state, transactionId: 6301736, plugInTime: T0, didCompleteFull: false };
      const d = diff(prev, st, T0 + (i + 1) * 60000);
      if (d.full) {
        fulls++;
        prev = { ...prev, fullNotifiedKey: d.full.txnId };
      }
      prev = { ...prev, state, charging: true };
    });
    assert.equal(fulls, 1, "בדיוק התראת סיום אחת למרות ההיפוכים");
  });

  it("שומר מקור: שער הסיום וחימוש־המחדש מחווטים בטיק", () => {
    const src = readFileSync(join(root, "functions/api/wevo-watch.js"), "utf8");
    assert.match(src, /cfg\.flowSinceMs/);
    assert.match(src, /cfg\.lastFullAtMs = Date\.now\(\)/);
    assert.match(src, /lastStopPushAtMs/);
  });
});

describe("שומר התראות — notifyOnly (גם ללקוח עצמי)", () => {
  it("register עם notifyOnly נשמר ב־cfg ומוחזר ב־status; בלי הדגל — false", async () => {
    const env = makeEnv();
    const r = await call(env, { ...REGISTER, clientId: "self-1", clientName: "עדן (עצמי)", notifyOnly: true });
    assert.equal(r.status, 200);
    const cfg = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    assert.equal(cfg.notifyOnly, true);
    const st = await call(env, { action: "status", ...CREDS });
    assert.equal(st.body.notifyOnly, true);
    const env2 = makeEnv();
    await call(env2, REGISTER);
    assert.equal(JSON.parse(env2.EV_BACKUP._map.get("watch:cfg")).notifyOnly, false);
    const st2 = await call(env2, { action: "status", ...CREDS });
    assert.equal(st2.body.notifyOnly, false);
  });

  it("שומרים: שערי האישור בטיק וההתראות מחווטים", () => {
    const src = readFileSync(join(root, "functions/api/wevo-watch.js"), "utf8");
    assert.match(src, /decideGuardActions\(cfg/, "הטיק עובד דרך פונקציית ההחלטה");
    assert.match(src, /if \(!cfg \|\| cfg\.notifyOnly\) return out/, "notifyOnly מכבה את כל האישורים בהחלטה");
    assert.match(src, /premiumArmActive/, "שער חימוש הפרימיום מחווט");
    assert.match(src, /הטעינה הסתיימה ב־/);
    assert.match(src, /הטעינה הופסקה/);
    assert.match(src, /הכבל נותק/);
  });

  it("שומרי פאנל: חימוש שומר התראות וכפתור ההפעלה", () => {
    const panel = readFileSync(join(root, "src/views/wevo-live-panel.js"), "utf8");
    assert.match(panel, /armNotifyWatch/);
    assert.match(panel, /notifyOnly: true/);
    assert.match(panel, /wevo-watch-notify-arm/);
    assert.match(panel, /watchInfo\.notifyOnly/);
  });
});

describe("שומר קבוע — decideGuardActions", () => {
  const decide = watch.decideGuardActions;
  const GUARD = { persistent: true, autoApprove: true, premiumContinue: false, notifyOnly: false, plugActedKey: null, actedKey: null };
  const plugDiff = { plugIn: { txnId: "9", atMs: 1000 } };
  const idleSt = { connected: true, charging: false };
  const flipCtx = { peak: true, flip: true, peakKey: "pk1" };

  it("חיבור לא בשיא — אישור ראשון אוטומטי; אותו חיבור שוב — לא", () => {
    const d = decide(GUARD, { charging: false }, idleSt, plugDiff, { peak: false, flip: false, peakKey: "pk0" });
    assert.equal(d.authorizeFirst, true);
    assert.equal(d.plugKey, "plug:9:1000");
    const again = decide({ ...GUARD, plugActedKey: "plug:9:1000" }, { charging: false }, idleSt, plugDiff, { peak: false, flip: false, peakKey: "pk0" });
    assert.equal(again.authorizeFirst, false);
  });

  it("חיבור בשעות שיא — אין אישור, רק התראה להחלטת עדן", () => {
    const d = decide(GUARD, { charging: false }, idleSt, plugDiff, { peak: true, flip: false, peakKey: "pk1" });
    assert.equal(d.authorizeFirst, false);
    assert.equal(d.notifyPeakPlug, true);
  });

  it("מעבר לשיא באמצע טעינה: עם חימוש פרימיום — אישור המשך; בלעדיו (שומר קבוע) — התראת עצירה בלבד", () => {
    const stopped = { connected: true, charging: false };
    const withPrem = decide({ ...GUARD, premiumContinue: true }, { charging: true }, stopped, {}, flipCtx);
    assert.equal(withPrem.authorizePremium, true);
    const again = decide({ ...GUARD, premiumContinue: true, actedKey: "pk1" }, { charging: true }, stopped, {}, flipCtx);
    assert.equal(again.authorizePremium, false, "actedKey מונע אישור כפול באותו חלון");
    const guardOnly = decide(GUARD, { charging: true }, stopped, {}, flipCtx);
    assert.equal(guardOnly.authorizePremium, false);
    assert.equal(guardOnly.notifyPeakStop, true);
  });

  it("רישום מורשת (בלי שדות חדשים) נחשב חימוש פרימיום; notifyOnly מכבה הכול", () => {
    const stopped = { connected: true, charging: false };
    const legacy = decide({ notifyOnly: false }, { charging: true }, stopped, {}, flipCtx);
    assert.equal(legacy.authorizePremium, true);
    const notify = decide({ notifyOnly: true, autoApprove: true, persistent: true }, { charging: false }, idleSt, plugDiff, { peak: false, flip: false, peakKey: "x" });
    assert.deepEqual(notify, { authorizeFirst: false, plugKey: null, authorizePremium: false, notifyPeakPlug: false, notifyPeakStop: false });
  });

  it("רישום שומר קבוע נשמר; חימוש פרימיום מתמזג לתוכו ולא דורס אותו; הסטטוס חושף את הדגלים", async () => {
    const env = makeEnv();
    const g = await call(env, { ...REGISTER, clientId: null, clientName: "שומר קבוע", persistent: true, autoApprove: true, premiumContinue: false });
    assert.equal(g.status, 200);
    let cfg = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    assert.equal(cfg.persistent, true);
    assert.equal(cfg.autoApprove, true);
    assert.equal(cfg.premiumContinue, false);
    const p = await call(env, { ...REGISTER, clientId: "c9", clientName: "שכן טעינה", premiumContinue: true });
    assert.equal(p.status, 200);
    cfg = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    assert.equal(cfg.persistent, true, "השומר הקבוע שרד את חימוש הפרימיום");
    assert.equal(cfg.premiumContinue, true);
    assert.ok(cfg.premiumArmedAt > 0);
    assert.equal(cfg.clientName, "שכן טעינה");
    const st = await call(env, { action: "status", ...CREDS });
    assert.equal(st.body.persistent, true);
    assert.equal(st.body.premiumContinue, true);
    assert.equal(st.body.autoApprove, true);
  });

  it("שומר קבוע במנוחה: טיק מדולג (throttled) בלי קריאת Wevo", async () => {
    const env = makeEnv();
    await call(env, { ...REGISTER, clientId: null, clientName: "שומר קבוע", persistent: true, autoApprove: true, premiumContinue: false });
    const cfg = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    cfg.wasConnected = false;
    cfg.lastPollAt = Date.now();
    env.EV_BACKUP._map.set("watch:cfg", JSON.stringify(cfg));
    const r = await call(env, { action: "tick", secret: "tick-secret-1" });
    assert.equal(r.status, 200);
    assert.equal(r.body.throttled, true);
  });

  it("פקיעת חימוש פרימיום בתוך שומר קבוע: החימוש מתבטל, השומר לא נמחק", async () => {
    const env = makeEnv();
    await call(env, { ...REGISTER, clientId: null, clientName: "שומר קבוע", persistent: true, autoApprove: true, premiumContinue: false });
    await call(env, { ...REGISTER, clientId: "c9", clientName: "שכן", premiumContinue: true });
    const cfg = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    cfg.premiumArmedAt = Date.now() - 25 * 3600 * 1000;
    cfg.lastPollAt = Date.now() - 10 * 60 * 1000;
    env.EV_BACKUP._map.set("watch:cfg", JSON.stringify(cfg));
    await call(env, { action: "tick", secret: "tick-secret-1" }); // ייכשל בשליפת מצב (fetch מדומה) — ההורדה קורית לפניה
    const after = JSON.parse(env.EV_BACKUP._map.get("watch:cfg"));
    assert.ok(after, "השומר הקבוע לא נמחק");
    assert.equal(after.premiumContinue, false, "חימוש הפרימיום בוטל");
    assert.equal(after.persistent, true);
  });

  it("שומרי פאנל: שומר קבוע + חימוש פרימיום מפורש ברישום", () => {
    const panel = readFileSync(join(root, "src/views/wevo-live-panel.js"), "utf8");
    assert.match(panel, /armGuard/);
    assert.match(panel, /persistent: true/);
    assert.match(panel, /wevo-watch-guard-arm/);
    assert.match(panel, /premiumContinue: true/);
  });
});
