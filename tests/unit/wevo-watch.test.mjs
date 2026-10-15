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
