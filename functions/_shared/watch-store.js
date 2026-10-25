// מתאם אחסון למצב השומר (מעבר KV → D1, 25.10.2026).
// ממשק בצורת KV עם JSON מעל שני מאגרים:
//   • D1 (env.EV_WATCH_DB) — כשקיימת הכריכה: מקור הקריאה הראשי.
//   • KV (env.EV_BACKUP) — גיבוי ומקור־מעבר: קריאה ב־miss של D1 + כתיבה־דרך ל־D1,
//     וכתיבה כפולה כל עוד שני המאגרים קיימים (תקופת הרצה של המיגרציה).
// בלי כריכת D1 ההתנהגות זהה להיום (KV בלבד). המתאם לעולם לא זורק:
// כל שגיאת D1 נבלעת עם נפילה ל־KV, ושגיאת KV בקריאה מחזירה null.
const DDL =
  "CREATE TABLE IF NOT EXISTS watch_state (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)";
const SQL_GET = "SELECT value FROM watch_state WHERE key = ?";
const SQL_PUT =
  "INSERT INTO watch_state (key, value, updated_at) VALUES (?, ?, ?) " +
  "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at";
const SQL_DELETE = "DELETE FROM watch_state WHERE key = ?";

// ה־DDL רץ פעם אחת לכל אובייקט מסד (cache של ה־Promise; כשל מנוקה כדי לאפשר ניסיון חוזר)
const ddlByDb = new WeakMap();

function ensureTable(db) {
  let p = ddlByDb.get(db);
  if (!p) {
    p = (async () => { await db.prepare(DDL).run(); })();
    p.catch(() => { if (ddlByDb.get(db) === p) ddlByDb.delete(db); });
    ddlByDb.set(db, p);
  }
  return p;
}

async function d1GetJson(db, key) {
  await ensureTable(db);
  const row = await db.prepare(SQL_GET).bind(key).first();
  if (!row || row.value == null) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

async function d1PutText(db, key, text) {
  await ensureTable(db);
  await db.prepare(SQL_PUT).bind(key, text, Date.now()).run();
}

async function d1Delete(db, key) {
  await ensureTable(db);
  await db.prepare(SQL_DELETE).bind(key).run();
}

function kvOf(env) { return (env && env.EV_BACKUP) || null; }
function dbOf(env) { return (env && env.EV_WATCH_DB) || null; }

// קריאה: D1 תחילה; ב־miss → KV, וערך שנמצא ב־KV נכתב־דרך ל־D1 (best-effort).
// מחזיר אובייקט מפוענח או null. לעולם לא זורק.
export async function storeGetJson(env, key) {
  const db = dbOf(env);
  if (db) {
    try {
      const v = await d1GetJson(db, key);
      if (v != null) return v;
    } catch { /* נפילה ל־KV */ }
  }
  const kv = kvOf(env);
  if (!kv) return null;
  let value = null;
  try {
    const raw = await kv.get(key);
    if (raw != null) {
      try { value = JSON.parse(raw); } catch { value = null; }
    }
  } catch { value = null; }
  if (value != null && db) {
    try { await d1PutText(db, key, JSON.stringify(value)); } catch {}
  }
  return value;
}

// כתיבה: לשני המאגרים הקיימים (D1 + KV). מחזיר true אם נכתב לפחות למאגר אחד.
// לעולם לא זורק — הקורא מחליט איך להתייחס לכשל מוחלט (למשל דגל kvWriteFailed בטיק).
export async function storePutJson(env, key, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  let ok = false;
  const db = dbOf(env);
  if (db) {
    try { await d1PutText(db, key, text); ok = true; } catch {}
  }
  const kv = kvOf(env);
  if (kv) {
    try { await kv.put(key, text); ok = true; } catch {}
  }
  return ok;
}

// מחיקה: משני המאגרים הקיימים. לעולם לא זורק.
export async function storeDelete(env, key) {
  const db = dbOf(env);
  if (db) {
    try { await d1Delete(db, key); } catch {}
  }
  const kv = kvOf(env);
  if (kv) {
    try { await kv.delete(key); } catch {}
  }
}
