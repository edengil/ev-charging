import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";

// כמו בשאר בדיקות ה־functions: מעתיקים לעץ זמני עם סיומת mjs (המתאם בלי ייבואים יחסיים)
const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const dir = mkdtempSync(join(tmpdir(), "ev-watch-store-"));
mkdirSync(join(dir, "_shared"), { recursive: true });
writeFileSync(
  join(dir, "_shared/watch-store.mjs"),
  readFileSync(join(root, "functions/_shared/watch-store.js"), "utf8")
);
const store = await import(pathToFileURL(join(dir, "_shared/watch-store.mjs")).href);
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

// fake D1 מינימלי מעל Map — תומך רק במשפטי ה־SQL של המתאם
// (CREATE TABLE / SELECT value / INSERT ... ON CONFLICT / DELETE).
function makeFakeD1() {
  const rows = new Map();
  return {
    _rows: rows,
    prepare(sql) {
      const q = String(sql).trim();
      let bindings = [];
      const stmt = {
        bind(...args) { bindings = args; return stmt; },
        async run() {
          if (q.startsWith("CREATE TABLE")) return { success: true };
          if (q.startsWith("INSERT INTO watch_state")) {
            rows.set(bindings[0], { value: bindings[1], updated_at: bindings[2] });
            return { success: true };
          }
          if (q.startsWith("DELETE FROM watch_state")) {
            rows.delete(bindings[0]);
            return { success: true };
          }
          throw new Error(`SQL לא נתמך ב־fake D1: ${q.slice(0, 48)}`);
        },
        async first() {
          if (q.startsWith("SELECT value FROM watch_state")) {
            const r = rows.get(bindings[0]);
            return r ? { value: r.value } : null;
          }
          throw new Error(`SQL לא נתמך ב־fake D1: ${q.slice(0, 48)}`);
        }
      };
      return stmt;
    }
  };
}

function makeThrowingD1() {
  return {
    prepare() { throw new Error("D1 לא זמין (fake)"); }
  };
}

describe("watch-store — מתאם אחסון השומר (D1 + KV)", () => {
  it("roundtrip על D1: put/get/delete", async () => {
    const d1 = makeFakeD1();
    const env = { EV_WATCH_DB: d1, EV_BACKUP: makeKv() };
    assert.equal(await store.storePutJson(env, "watch:cfg", { armed: true, n: 1 }), true);
    assert.deepEqual(await store.storeGetJson(env, "watch:cfg"), { armed: true, n: 1 });
    const row = d1._rows.get("watch:cfg");
    assert.ok(row, "השורה קיימת ב־D1");
    assert.equal(JSON.parse(row.value).armed, true);
    assert.equal(typeof row.updated_at, "number");
    await store.storeDelete(env, "watch:cfg");
    assert.equal(await store.storeGetJson(env, "watch:cfg"), null);
    assert.equal(d1._rows.has("watch:cfg"), false);
  });

  it("miss ב־D1 נופל ל־KV וכותב־דרך ל־D1", async () => {
    const d1 = makeFakeD1();
    const kv = makeKv();
    await kv.put("watch:status", JSON.stringify({ lastTickAt: 123 }));
    const env = { EV_WATCH_DB: d1, EV_BACKUP: kv };
    assert.deepEqual(await store.storeGetJson(env, "watch:status"), { lastTickAt: 123 });
    assert.ok(d1._rows.has("watch:status"), "הערך הועבר ל־D1 בכתיבה־דרך");
    // קריאה שנייה באה מ־D1 גם אם ה־KV התרוקן
    kv._map.clear();
    assert.deepEqual(await store.storeGetJson(env, "watch:status"), { lastTickAt: 123 });
  });

  it("כתיבה כפולה נראית בשני הצדדים", async () => {
    const d1 = makeFakeD1();
    const kv = makeKv();
    const env = { EV_WATCH_DB: d1, EV_BACKUP: kv };
    await store.storePutJson(env, "watch:log", [{ kind: "register" }]);
    assert.equal(JSON.parse(kv._map.get("watch:log"))[0].kind, "register");
    assert.equal(JSON.parse(d1._rows.get("watch:log").value)[0].kind, "register");
    // מחיקה מוחקת משניהם
    await store.storeDelete(env, "watch:log");
    assert.equal(kv._map.has("watch:log"), false);
    assert.equal(d1._rows.has("watch:log"), false);
  });

  it("ערך ב־D1 קודם לערך ישן יותר ב־KV", async () => {
    const d1 = makeFakeD1();
    const kv = makeKv();
    const env = { EV_WATCH_DB: d1, EV_BACKUP: kv };
    await store.storePutJson(env, "watch:cfg", { v: "d1" });
    await kv.put("watch:cfg", JSON.stringify({ v: "kv-stale" }));
    assert.deepEqual(await store.storeGetJson(env, "watch:cfg"), { v: "d1" });
  });

  it("D1 שזורק — המתאם לא זורק וה־KV ממשיך לעבוד", async () => {
    const kv = makeKv();
    const env = { EV_WATCH_DB: makeThrowingD1(), EV_BACKUP: kv };
    assert.equal(await store.storePutJson(env, "watch:cfg", { ok: 1 }), true);
    assert.deepEqual(await store.storeGetJson(env, "watch:cfg"), { ok: 1 });
    await store.storeDelete(env, "watch:cfg");
    assert.equal(await store.storeGetJson(env, "watch:cfg"), null);
  });

  it("בלי כריכת D1 — KV בלבד, זהה להיום", async () => {
    const kv = makeKv();
    const env = { EV_BACKUP: kv };
    assert.equal(await store.storeGetJson(env, "watch:cfg"), null);
    assert.equal(await store.storePutJson(env, "watch:cfg", { a: [1, 2] }), true);
    assert.deepEqual(await store.storeGetJson(env, "watch:cfg"), { a: [1, 2] });
    assert.equal(kv._map.get("watch:cfg"), JSON.stringify({ a: [1, 2] }));
    await store.storeDelete(env, "watch:cfg");
    assert.equal(await store.storeGetJson(env, "watch:cfg"), null);
  });

  it("רק D1 בלי KV — עובד מהמסד בלבד; בלי שום מאגר — כשל שקט", async () => {
    const env = { EV_WATCH_DB: makeFakeD1() };
    assert.equal(await store.storePutJson(env, "watch:events", { t1: {} }), true);
    assert.deepEqual(await store.storeGetJson(env, "watch:events"), { t1: {} });
    const empty = {};
    assert.equal(await store.storeGetJson(empty, "watch:cfg"), null);
    assert.equal(await store.storePutJson(empty, "watch:cfg", {}), false);
    await store.storeDelete(empty, "watch:cfg");
  });
});
