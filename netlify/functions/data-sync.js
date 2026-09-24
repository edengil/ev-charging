/**
 * Netlify Function — cloud backup for EV Charge Manager
 * Body: { action: "status"|"setup"|"load"|"save", pin, data? }
 */
const crypto = require("crypto");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function hashPin(pin) {
  return crypto.createHash("sha256").update(String(pin) + "|eden-ev-charge-v1").digest("hex");
}

async function getBlobStore() {
  try {
    const { getStore } = require("@netlify/blobs");
    return getStore("ev-charge-backup");
  } catch (e) {
    const err = new Error("גיבוי ענן לא זמין בסביבה זו");
    err.status = 503;
    throw err;
  }
}

exports.handler = async event => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const action = String(body.action || "status");
    const pin = String(body.pin || "").trim();
    const store = await getBlobStore();

    let meta = null;
    try {
      meta = await store.get("meta", { type: "json" });
    } catch {
      meta = null;
    }

    if (action === "status") {
      return json(200, {
        ok: true,
        configured: !!(meta && meta.pinHash),
        updatedAt: meta && meta.updatedAt || null
      });
    }

    if (action === "setup") {
      if (meta && meta.pinHash) {
        return json(400, { error: "כבר הוגדר PIN לגיבוי. התחבר עם אותו PIN." });
      }
      if (pin.length < 4) {
        return json(400, { error: "בחר PIN באורך 4 ספרות לפחות" });
      }
      const now = Date.now();
      await store.setJSON("meta", { pinHash: hashPin(pin), updatedAt: now });
      const payload = body.data && typeof body.data === "object"
        ? { ...body.data, updatedAt: now }
        : { clients: [], sessions: [], payments: [], openSess: [], config: null, updatedAt: now };
      await store.setJSON("data", payload);
      return json(200, { ok: true, setup: true, updatedAt: now });
    }

    if (!meta || !meta.pinHash) {
      return json(400, { error: "עדיין לא הוגדר גיבוי ענן — הגדר PIN ראשוני" });
    }
    if (pin.length < 4 || hashPin(pin) !== meta.pinHash) {
      return json(401, { error: "PIN שגוי" });
    }

    if (action === "load") {
      let data = null;
      try {
        data = await store.get("data", { type: "json" });
      } catch {
        data = null;
      }
      return json(200, { ok: true, data, updatedAt: data && data.updatedAt || meta.updatedAt || null });
    }

    if (action === "save") {
      if (!body.data || typeof body.data !== "object") {
        return json(400, { error: "חסרים נתונים לשמירה" });
      }
      const now = Date.now();
      const payload = {
        clients: body.data.clients || [],
        sessions: body.data.sessions || [],
        payments: body.data.payments || [],
        openSess: body.data.openSess || [],
        config: body.data.config != null ? body.data.config : null,
        updatedAt: now
      };
      await store.setJSON("data", payload);
      await store.setJSON("meta", { ...meta, updatedAt: now });
      return json(200, { ok: true, saved: true, updatedAt: now });
    }

    return json(400, { error: "action לא מוכר (status|setup|load|save)" });
  } catch (e) {
    const status = e.status || 500;
    return json(status, { error: e.message || "שגיאה לא צפויה" });
  }
};
