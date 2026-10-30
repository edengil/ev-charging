import { json, optionsResponse, cognitoLogin, requestOrigin } from "../_shared/wevo.js";
import { loadVapidJwk, vapidPublicKey } from "../_shared/push.js";

// מנויי Web Push — התראות כשהאפליקציה סגורה.
// GET: מחזיר את מפתח ה־VAPID הציבורי (נגזר מהפרטי ב־env). בלי מפתח מוגדר → 503.
// POST subscribe/unsubscribe: מאומתים בהתחברות Cognito אמיתית (כמו שומר הפרימיום).
// המנויים נשמרים ב־KV ‏(EV_BACKUP, מפתח push:subs) — endpoint + מפתחות הצפנה של הדפדפן בלבד.

const SUBS_KEY = "push:subs";

export async function onRequestGet(context) {
  const jwk = loadVapidJwk(context.env);
  if (!jwk) {
    return json(503, { ok: false, error: "התראות שרת לא מוגדרות (חסר VAPID_PRIVATE_JWK)" }, requestOrigin(context));
  }
  return json(200, { ok: true, publicKey: vapidPublicKey(jwk) }, requestOrigin(context));
}

export function onRequestOptions(context) {
  return optionsResponse(requestOrigin(context));
}

async function verifyCreds(email, password) {
  if (!email || !password) {
    const err = new Error("חסרים אימייל או סיסמה");
    err.status = 400;
    throw err;
  }
  await cognitoLogin(email, password);
}

function validSubscription(sub) {
  return (
    sub &&
    typeof sub.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    sub.keys &&
    typeof sub.keys.p256dh === "string" &&
    sub.keys.p256dh.length > 40 &&
    typeof sub.keys.auth === "string" &&
    sub.keys.auth.length >= 16
  );
}

async function loadSubs(env) {
  const subs = await env.EV_BACKUP.get(SUBS_KEY, { type: "json" });
  return Array.isArray(subs) ? subs : [];
}

async function handleSubscribe(env, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const sub = body.subscription;
  if (!validSubscription(sub)) {
    const err = new Error("מנוי לא תקין");
    err.status = 400;
    throw err;
  }
  await verifyCreds(email, password);
  const subs = (await loadSubs(env)).filter(s => s.endpoint !== sub.endpoint);
  subs.push({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    at: Date.now()
  });
  await env.EV_BACKUP.put(SUBS_KEY, JSON.stringify(subs.slice(-8)));
  return { ok: true, action: "subscribe", count: subs.length };
}

async function handleUnsubscribe(env, body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const endpoint = String(body.endpoint || "");
  await verifyCreds(email, password);
  const subs = (await loadSubs(env)).filter(s => s.endpoint !== endpoint);
  await env.EV_BACKUP.put(SUBS_KEY, JSON.stringify(subs));
  return { ok: true, action: "unsubscribe", count: subs.length };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const action = String(body.action || "");
    let result;
    if (action === "subscribe") result = await handleSubscribe(context.env, body);
    else if (action === "unsubscribe") result = await handleUnsubscribe(context.env, body);
    else {
      const err = new Error("פעולה לא מוכרת");
      err.status = 400;
      throw err;
    }
    return json(200, result, requestOrigin(context));
  } catch (e) {
    const status = e.status || 500;
    return json(status, { error: e.message || "שגיאה לא צפויה", ok: false }, requestOrigin(context));
  }
}
