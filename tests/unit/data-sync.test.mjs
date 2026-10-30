import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";

// functions/ נכתבו כ־ESM אך package.json הוא commonjs — אותו דפוס העתקה כמו wevo-watch.test.mjs
const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const dir = mkdtempSync(join(tmpdir(), "ev-datasync-"));
mkdirSync(join(dir, "_shared"), { recursive: true });
mkdirSync(join(dir, "api"), { recursive: true });
const copyAs = (from, to) => {
  const src = readFileSync(join(root, from), "utf8")
    .replaceAll("../_shared/wevo.js", "../_shared/wevo.mjs");
  writeFileSync(join(dir, to), src);
};
copyAs("functions/_shared/wevo.js", "_shared/wevo.mjs");
copyAs("functions/api/data-sync.js", "api/data-sync.mjs");
const ds = await import(pathToFileURL(join(dir, "api/data-sync.mjs")).href);
rmSync(dir, { recursive: true, force: true });

function makeKv() {
  const m = new Map();
  const puts = [];
  return {
    _map: m,
    _puts: puts,
    async get(k, opts) {
      const v = m.get(k);
      if (v == null) return null;
      return opts && opts.type === "json" ? JSON.parse(v) : v;
    },
    async put(k, v) { puts.push(k); m.set(k, String(v)); },
    async delete(k) { m.delete(k); },
    async list({ prefix } = {}) {
      const keys = [...m.keys()].filter(k => !prefix || k.startsWith(prefix)).map(name => ({ name }));
      return { keys, list_complete: true, cursor: "" };
    }
  };
}

function makeEnv() {
  return { EV_BACKUP: makeKv() };
}

async function call(env, body) {
  const req = { method: "POST", json: async () => body };
  const res = await ds.onRequestPost({ request: req, env });
  return { status: res.status, body: await res.json() };
}

async function pinHash(pin) {
  const data = new TextEncoder().encode(String(pin) + "|eden-ev-charge-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

const PIN = "123456";
const DATA = {
  clients: [{ id: "c1", name: "שכן" }],
  sessions: [
    { id: "s-oct", date: "2026-10-05", amount: 50 },
    { id: "s-sep", date: "2026-09-14", amount: 40 },
    { id: "s-nodate", amount: 10 }
  ],
  payments: [{ id: "p1", amount: 100 }],
  openSess: [{ id: "o1" }],
  config: { tariff: 0.64 }
};

describe("data-sync — ב5 אחסון מפוצל", () => {
  it("setup כותב פיצול + בלוב ישן ומסמן splitVersion=2; load מחזיר את אותם נתונים", async () => {
    const env = makeEnv();
    const r = await call(env, { action: "setup", pin: PIN, data: DATA });
    assert.equal(r.status, 200);
    const kv = env.EV_BACKUP;
    const meta = JSON.parse(kv._map.get("meta"));
    assert.equal(meta.splitVersion, 2);
    assert.ok(kv._map.has("data"), "הבלוב הישן נכתב (כתיבה כפולה)");
    assert.ok(kv._map.has("data:clients"));
    assert.ok(kv._map.has("data:sessions:2026-10"));
    assert.ok(kv._map.has("data:sessions:2026-09"));
    assert.ok(kv._map.has("data:sessions:undated"), "סשן בלי תאריך תחת undated");
    const load = await call(env, { action: "load", pin: PIN });
    assert.equal(load.status, 200);
    assert.deepEqual(load.body.data.clients, DATA.clients);
    assert.deepEqual(new Set(load.body.data.sessions.map(s => s.id)), new Set(["s-oct", "s-sep", "s-nodate"]));
    assert.deepEqual(load.body.data.payments, DATA.payments);
    assert.deepEqual(load.body.data.openSess, DATA.openSess);
    assert.deepEqual(load.body.data.config, DATA.config);
  });

  it("PIN שגוי נדחה ב־401 גם אחרי setup", async () => {
    const env = makeEnv();
    await call(env, { action: "setup", pin: PIN, data: DATA });
    const r = await call(env, { action: "load", pin: "9999" });
    assert.equal(r.status, 401);
  });

  it("מורשת בלבד (בלי splitVersion): load נופל לבלוב הישן", async () => {
    const env = makeEnv();
    const kv = env.EV_BACKUP;
    kv._map.set("meta", JSON.stringify({ pinHash: await pinHash(PIN), updatedAt: 111 }));
    kv._map.set("data", JSON.stringify({ ...DATA, updatedAt: 111 }));
    const load = await call(env, { action: "load", pin: PIN });
    assert.equal(load.status, 200);
    assert.equal(load.body.data.sessions.length, 3);
    assert.equal(load.body.updatedAt, 111);
  });

  it("הפיצול מועדף על בלוב ישן מעופש", async () => {
    const env = makeEnv();
    const kv = env.EV_BACKUP;
    await call(env, { action: "setup", pin: PIN, data: DATA });
    kv._map.set("data", JSON.stringify({ clients: [{ id: "STALE" }], sessions: [], payments: [], openSess: [], config: null, updatedAt: 1 }));
    const load = await call(env, { action: "load", pin: PIN });
    assert.equal(load.body.data.clients[0].id, "c1", "נקרא מהפיצול, לא מהבלוב המעופש");
  });

  it("save מסיר מפתח חודש שנעלם מהמטען (אין תחיית סשנים מחוקים)", async () => {
    const env = makeEnv();
    const kv = env.EV_BACKUP;
    await call(env, { action: "setup", pin: PIN, data: DATA });
    assert.ok(kv._map.has("data:sessions:2026-09"));
    const smaller = { ...DATA, sessions: DATA.sessions.filter(s => s.id !== "s-sep") };
    const r = await call(env, { action: "save", pin: PIN, data: smaller });
    assert.equal(r.status, 200);
    assert.equal(kv._map.has("data:sessions:2026-09"), false, "מפתח החודש המעופש נמחק");
    const load = await call(env, { action: "load", pin: PIN });
    assert.deepEqual(new Set(load.body.data.sessions.map(s => s.id)), new Set(["s-oct", "s-nodate"]));
  });

  it("אוסף מפוצל פגום — load נופל לבלוב הישן במקום לקרוס", async () => {
    const env = makeEnv();
    const kv = env.EV_BACKUP;
    await call(env, { action: "setup", pin: PIN, data: DATA });
    kv._map.set("data:clients", JSON.stringify("not-an-array"));
    const load = await call(env, { action: "load", pin: PIN });
    assert.equal(load.status, 200);
    assert.deepEqual(load.body.data.clients, DATA.clients, "הוחזר הבלוב הישן התקין");
  });

  it("status בלי setup: configured=false; הבלוב הישן נשמר זהה בתוכן אחרי save", async () => {
    const env = makeEnv();
    const st = await call(env, { action: "status" });
    assert.equal(st.body.configured, false);
    await call(env, { action: "setup", pin: PIN, data: DATA });
    const legacy = JSON.parse(env.EV_BACKUP._map.get("data"));
    assert.equal(legacy.sessions.length, 3);
    assert.equal(legacy.clients.length, 1);
  });

  it("חיסכון כתיבות: save זהה לקודמו לא כותב שוב אף מפתח מפוצל", async () => {
    const env = makeEnv();
    const kv = env.EV_BACKUP;
    await call(env, { action: "setup", pin: PIN, data: DATA });
    kv._puts.length = 0;
    const r = await call(env, { action: "save", pin: PIN, data: DATA });
    assert.equal(r.status, 200);
    const splitPuts = kv._puts.filter(k => k.startsWith("data:"));
    assert.deepEqual(splitPuts, [], "אף חלק מפוצל לא נכתב מחדש כשהתוכן זהה");
    assert.ok(kv._puts.includes("data"), "הבלוב הישן עדיין נכתב (חותמת עדכניות)");
    assert.ok(kv._puts.includes("meta"), "המטא עדיין נכתב");
  });

  it("חיסכון כתיבות: שינוי בסשן אחד כותב רק את חודשו; ה־load מחזיר את השינוי", async () => {
    const env = makeEnv();
    const kv = env.EV_BACKUP;
    await call(env, { action: "setup", pin: PIN, data: DATA });
    kv._puts.length = 0;
    const changed = {
      ...DATA,
      sessions: DATA.sessions.map(s => s.id === "s-oct" ? { ...s, amount: 55 } : s)
    };
    const r = await call(env, { action: "save", pin: PIN, data: changed });
    assert.equal(r.status, 200);
    const splitPuts = kv._puts.filter(k => k.startsWith("data:"));
    assert.deepEqual(splitPuts, ["data:sessions:2026-10"], "נכתב רק חודש הסשן שהשתנה");
    const load = await call(env, { action: "load", pin: PIN });
    const oct = load.body.data.sessions.find(s => s.id === "s-oct");
    assert.equal(oct.amount, 55, "השינוי נקרא בחזרה מהפיצול");
  });
});

describe("data-sync — אבטחת PIN (H4+H5+M22, ביקורת 30.10)", () => {
  it("setup שומר גיבוב PBKDF2, ו־load תקין עובד מולו", async () => {
    const env = makeEnv();
    const r = await call(env, { action: "setup", pin: PIN, data: DATA });
    assert.equal(r.status, 200);
    const meta = JSON.parse(env.EV_BACKUP._map.get("meta"));
    assert.ok(meta.pinHash.startsWith("pbkdf2$"), "פורמט הגיבוב החדש");
    const load = await call(env, { action: "load", pin: PIN });
    assert.equal(load.status, 200);
  });

  it("setup עם PIN קצר מ־6 תווים נדחה ב־400", async () => {
    const env = makeEnv();
    const r = await call(env, { action: "setup", pin: "12345", data: DATA });
    assert.equal(r.status, 400);
  });

  it("גיבוב מורשת (SHA-256) מאומת ומשודרג ל־PBKDF2 בכניסה ראשונה", async () => {
    const env = makeEnv();
    const kv = env.EV_BACKUP;
    kv._map.set("meta", JSON.stringify({ pinHash: await pinHash(PIN), updatedAt: 111 }));
    kv._map.set("data", JSON.stringify({ ...DATA, updatedAt: 111 }));
    const load = await call(env, { action: "load", pin: PIN });
    assert.equal(load.status, 200);
    const meta = JSON.parse(kv._map.get("meta"));
    assert.ok(meta.pinHash.startsWith("pbkdf2$"), "הגיבוב שודרג בשקיפות");
    const load2 = await call(env, { action: "load", pin: PIN });
    assert.equal(load2.status, 200);
  });

  it("H4: אחרי 5 ניסיונות שגויים רצופים — נעילה (429) גם ל־PIN הנכון", async () => {
    const env = makeEnv();
    await call(env, { action: "setup", pin: PIN, data: DATA });
    for (let i = 0; i < 5; i++) {
      const r = await call(env, { action: "load", pin: "000000" });
      assert.equal(r.status, 401);
    }
    const locked = await call(env, { action: "load", pin: PIN });
    assert.equal(locked.status, 429);
  });

  it("H4: התחברות מוצלחת מאפסת את מונה הכשלונות", async () => {
    const env = makeEnv();
    await call(env, { action: "setup", pin: PIN, data: DATA });
    for (let i = 0; i < 4; i++) await call(env, { action: "load", pin: "000000" });
    const ok = await call(env, { action: "load", pin: PIN });
    assert.equal(ok.status, 200);
    assert.equal(env.EV_BACKUP._map.has("pin:guard"), false);
  });

  it("M22: status לא חושף updatedAt ללקוח לא־מאומת", async () => {
    const env = makeEnv();
    await call(env, { action: "setup", pin: PIN, data: DATA });
    const st = await call(env, { action: "status" });
    assert.equal(st.body.configured, true);
    assert.equal("updatedAt" in st.body, false);
  });
});
