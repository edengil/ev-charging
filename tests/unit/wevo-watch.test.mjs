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
    .replaceAll("../_shared/watch-store.js", "../_shared/watch-store.mjs")
    .replaceAll("./wevo.js", "./wevo.mjs")
    .replaceAll("./push.js", "./push.mjs");
  writeFileSync(join(dir, to), src);
};
copyAs("functions/_shared/wevo.js", "_shared/wevo.mjs");
copyAs("functions/_shared/push.js", "_shared/push.mjs");
copyAs("functions/_shared/watch-store.js", "_shared/watch-store.mjs");
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

  it("חותמת full יציבה מייצרת אירוע full; אותה חותמת שוב — לא", () => {
    // חותמת שנראתה גם בדגימה הקודמת (lastFullSeenMs) = יציבה → יורה מיד
    const prev = { connected: true, charging: true, lastTxnId: "777", lastFullMs: null, lastFullSeenMs: FULL, fullNotifiedKey: null };
    const st = { connected: true, charging: false, transactionId: 777, chargingFullTime: FULL };
    const d = diff(prev, st, FULL + 60000);
    assert.equal(d.full.atMs, FULL);
    const again = diff({ ...prev, lastFullMs: FULL, fullNotifiedKey: "777" }, st, FULL + 120000);
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
    assert.match(src, /storeDelete\(env, EVENTS_KEY\)/);
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

  it("שומר מקור: הגנות טריות על התראות חיבור/ניתוק (שידור חוזר ממצב קפוא)", () => {
    const src = readFileSync(join(root, "functions/api/wevo-watch.js"), "utf8");
    assert.match(src, /staleReplay/);
    assert.match(src, /plugFresh/);
  });

  it("חותמת full מתקדמת כל דקה אינה יורה; חותמת יציבה או עם didCompleteFull כן (רגרסיית הצפה 19.10)", () => {
    const base = { connected: true, charging: true, state: "SuspendedEV", lastEventKey: "55", lastFullMs: null, lastFullSeenMs: null, didCompleteFull: false, fullNotifiedKey: null };
    const stAt = (full) => ({ connected: true, charging: true, state: "SuspendedEV", transactionId: 55, plugInTime: T0, chargingFullTime: full, didCompleteFull: false });
    // חותמת חדשה בכל דגימה — לעולם לא יציבה, לעולם לא יורה
    let d = diff(base, stAt(T0 + 3600000), T0 + 3600000);
    assert.equal(d.full, undefined);
    d = diff({ ...base, lastFullSeenMs: T0 + 3600000 }, stAt(T0 + 3660000), T0 + 3660000);
    assert.equal(d.full, undefined, "חותמת שזזה שוב — לא יורה");
    // אותה חותמת שתי דגימות רצופות — יורה
    d = diff({ ...base, lastFullSeenMs: T0 + 3600000 }, stAt(T0 + 3600000), T0 + 3720000);
    assert.ok(d.full && !d.full.approx, "חותמת יציבה יורה כסיום מדויק");
    assert.equal(d.full.atMs, T0 + 3600000);
    // חותמת + didCompleteFull — יורה מיד, גם בלי יציבות
    const stFull = { ...stAt(T0 + 3600000), didCompleteFull: true };
    d = diff(base, stFull, T0 + 3600000);
    assert.ok(d.full && !d.full.approx);
    // שער החיבור סגור (כבר דווח סיום) — חותמת חדשה לא יורה שוב
    d = diff({ ...base, fullNotifiedKey: "55" }, stFull, T0 + 3800000);
    assert.equal(d.full, undefined);
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
    // שלב 3ב בפיצול הפאנל: באנר השומר עבר ל־WatchBanner בקטעי התצוגה
    const sections = readFileSync(join(root, "src/views/wevo-panel-sections.js"), "utf8");
    assert.match(sections, /wevo-watch-notify-arm/);
    assert.match(sections, /watchInfo\.notifyOnly/);
    // שלב 2 בפיצול הפאנל: מטען הרישום של armNotifyWatch עבר לגשר השומר
    const bridge = readFileSync(join(root, "src/views/wevo-watch-bridge.js"), "utf8");
    assert.match(bridge, /notifyOnly: true/);
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
    // שלב 3ב בפיצול הפאנל: באנר השומר עבר ל־WatchBanner בקטעי התצוגה
    const sections = readFileSync(join(root, "src/views/wevo-panel-sections.js"), "utf8");
    assert.match(sections, /wevo-watch-guard-arm/);
    // שלב 2 בפיצול הפאנל: מטעני הרישום של armGuard/syncServerWatch עברו לגשר השומר
    const bridge = readFileSync(join(root, "src/views/wevo-watch-bridge.js"), "utf8");
    assert.match(bridge, /persistent: true/);
    assert.match(bridge, /premiumContinue: true/);
  });
});

describe("fullPushAllowed — שער סיום במצב קפוא", () => {
  const allowed = watch.fullPushAllowed;
  const NOW = 1792400000000;
  it("שמירה בריאה — תמיד דוחף", () => {
    assert.equal(allowed({ txnId: "1", atMs: NOW - 3600000, approx: true }, { state: "SuspendedEV" }, NOW, true), true);
    assert.equal(allowed({ txnId: "1", atMs: NOW - 3600000 }, { state: "SuspendedEV" }, NOW, true), true);
  });
  it("קפוא + חותמת טריה — דוחף; חותמת ישנה — לא", () => {
    assert.equal(allowed({ txnId: "1", atMs: NOW - 120000 }, { state: "SuspendedEV", chargingFullTime: NOW - 120000 }, NOW, false), true);
    assert.equal(allowed({ txnId: "1", atMs: NOW - 3600000 }, { state: "SuspendedEV", chargingFullTime: NOW - 3600000 }, NOW, false), false);
  });
  it("קפוא + מקורב במצב Finishing — דוחף; ב־SuspendedEV בלי חותמת — לא", () => {
    assert.equal(allowed({ txnId: "1", atMs: NOW, approx: true }, { state: "Finishing" }, NOW, false), true);
    assert.equal(allowed({ txnId: "1", atMs: NOW, approx: true }, { state: "SuspendedEV" }, NOW, false), false);
  });
  it("אין אירוע — לא דוחף", () => {
    assert.equal(allowed(null, { state: "Charging" }, NOW, true), false);
  });
  it("שומר מקור: שערי שמירה־קפואה מחווטים לכל דחיפות האירועים", () => {
    const src = readFileSync(join(root, "functions/api/wevo-watch.js"), "utf8");
    assert.match(src, /persistenceHealthy/);
    assert.match(src, /fullPushAllowed\(diff\.full/);
    assert.match(src, /notifyPeakStop && persistenceHealthy/);
    assert.match(src, /!decide\.notifyPeakStop && persistenceHealthy/);
  });
});

describe("גשר שומר הפאנל — תיקון ב3: מיזוג חותמות דרך onUpsertOpen", () => {
  it("refreshWatchInfo מחיל טלאי חותמות על רשומה פתוחה ולא מאפס את watchInfo", async () => {
    const src = readFileSync(join(root, "src/views/wevo-watch-bridge.js"), "utf8");
    assert.ok(!src.includes("dataStore.upsertOpenSessions"), "אין עוד קריאה ל־dataStore שלא קיים במערכת");
    const { mergeWatchEvents } = await import(pathToFileURL(join(root, "lib/ev-money.mjs")).href);
    const factory = new Function(
      "getWevoCreds", "ownerPeakWindow", "pushWevoLog", "mergeWatchEvents", "fetch",
      src + "\nreturn createWatchBridge;"
    );
    const upserts = [];
    const watchInfos = [];
    const t0 = 1760000000000;
    const openRec = {
      id: "o1", wevoTxnId: "123", clientId: "c1",
      plugInAt: new Date(t0).toISOString(), chargeStartedAt: null, chargeEndedAt: null
    };
    const statusData = {
      ok: true, armed: true,
      events: { "123": { plugInAt: t0, chargeStartedAt: t0 + 60000, chargingFullTime: t0 + 3600000 } }
    };
    const bridge = factory(
      () => ({ email: "a@b.c", password: "x" }),
      () => ({ startMin: 0, endMin: 0 }),
      () => {},
      mergeWatchEvents,
      async () => ({ ok: true, json: async () => statusData })
    )({
      clientsRef: { current: [] },
      openRef: { current: [openRec] },
      getCid: () => "",
      setWatchInfo: (v) => watchInfos.push(v),
      onUpsertOpen: (p) => upserts.push(p)
    });
    bridge.refreshWatchInfo();
    await new Promise(r => setTimeout(r, 30));
    assert.equal(upserts.length, 1, "הטלאי הוחל פעם אחת דרך onUpsertOpen");
    assert.equal(upserts[0].id, "o1");
    assert.ok(upserts[0].chargeStartedAt, "חותמת תחילת הטעינה מולאה מאירוע השומר");
    assert.ok(upserts[0].chargeEndedAt, "חותמת סיום הטעינה מולאה מאירוע השומר");
    assert.ok(upserts[0].verifiedEndAt, "חותמת הסיום המאומתת מולאה");
    assert.ok(watchInfos.length >= 1 && watchInfos[0] && watchInfos[0].armed, "watchInfo קיבל את נתוני הסטטוס");
    assert.ok(!watchInfos.includes(null), "watchInfo לא אופס בגלל שגיאת מיזוג");
  });

  it("בלי אירועי שומר תואמים — אין upsert ו־watchInfo מוגדר כרגיל", async () => {
    const src = readFileSync(join(root, "src/views/wevo-watch-bridge.js"), "utf8");
    const { mergeWatchEvents } = await import(pathToFileURL(join(root, "lib/ev-money.mjs")).href);
    const factory = new Function(
      "getWevoCreds", "ownerPeakWindow", "pushWevoLog", "mergeWatchEvents", "fetch",
      src + "\nreturn createWatchBridge;"
    );
    const upserts = [];
    const watchInfos = [];
    const statusData = { ok: true, armed: true, events: {} };
    const bridge = factory(
      () => ({ email: "a@b.c", password: "x" }),
      () => ({ startMin: 0, endMin: 0 }),
      () => {},
      mergeWatchEvents,
      async () => ({ ok: true, json: async () => statusData })
    )({
      clientsRef: { current: [] },
      openRef: { current: [{ id: "o9", wevoTxnId: "999" }] },
      getCid: () => "",
      setWatchInfo: (v) => watchInfos.push(v),
      onUpsertOpen: (p) => upserts.push(p)
    });
    bridge.refreshWatchInfo();
    await new Promise(r => setTimeout(r, 30));
    assert.equal(upserts.length, 0);
    assert.ok(watchInfos[0] && watchInfos[0].armed);
  });
});
