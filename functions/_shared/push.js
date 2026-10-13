// Web Push — שליחת התראות כשהאפליקציה סגורה (RFC 8291 הצפנה + RFC 8292 VAPID).
// מפתח פרטי: env.VAPID_PRIVATE_JWK כ־base64url של JWK ‏(EC P-256). המפתח הציבורי נגזר ממנו.
// אם המשתנה חסר — השליחה מדולגת בשקט (הפיצ׳ר כבוי עד ההגדרה ב־Cloudflare).

const subtle = globalThis.crypto && globalThis.crypto.subtle;

export function b64urlToBytes(str) {
  const s = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", key, dataBytes));
}

// HKDF שלב expand יחיד (L<=32) — מספיק לכל שלבי RFC 8291
async function hkdfExpand(prkBytes, infoBytes) {
  return hmacSha256(prkBytes, concatBytes(infoBytes, new Uint8Array([1])));
}

export function vapidPublicKey(jwk) {
  const x = b64urlToBytes(jwk.x);
  const y = b64urlToBytes(jwk.y);
  const point = concatBytes(new Uint8Array([4]), x, y);
  return bytesToB64url(point);
}

export function loadVapidJwk(env) {
  const raw = env && env.VAPID_PRIVATE_JWK;
  if (!raw) return null;
  try {
    const jwk = JSON.parse(new TextDecoder().decode(b64urlToBytes(raw)));
    if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.d || !jwk.x || !jwk.y) return null;
    return jwk;
  } catch {
    return null;
  }
}

export async function vapidAuthHeader(env, endpoint, subject) {
  const jwk = loadVapidJwk(env);
  if (!jwk) return null;
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject || "mailto:edengil94@gmail.com"
  };
  const enc = new TextEncoder();
  const signingInput =
    bytesToB64url(enc.encode(JSON.stringify(header))) + "." + bytesToB64url(enc.encode(JSON.stringify(payload)));
  const key = await subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y, d: jwk.d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)));
  const jwt = signingInput + "." + bytesToB64url(sig);
  return `vapid t=${jwt}, k=${vapidPublicKey(jwk)}`;
}

// הצפנת גוף ההודעה לפי RFC 8291 (aes128gcm, רשומה יחידה).
// opts.salt / opts.senderJwk ניתנים להזרקה לבדיקות מול וקטור ה־RFC.
export async function encryptPushBody(subKeys, plaintext, opts = {}) {
  const receiverPublic = b64urlToBytes(subKeys.p256dh);
  const authSecret = b64urlToBytes(subKeys.auth);
  if (receiverPublic.length !== 65 || authSecret.length !== 16) {
    throw new Error("מפתחות מנוי לא תקינים");
  }

  let senderPrivate;
  let senderPublic;
  if (opts.senderJwk) {
    senderPrivate = await subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x: opts.senderJwk.x, y: opts.senderJwk.y, d: opts.senderJwk.d },
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"]
    );
    senderPublic = concatBytes(
      new Uint8Array([4]),
      b64urlToBytes(opts.senderJwk.x),
      b64urlToBytes(opts.senderJwk.y)
    );
  } else {
    const pair = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    senderPrivate = pair.privateKey;
    senderPublic = new Uint8Array(await subtle.exportKey("raw", pair.publicKey));
  }

  const receiverKey = await subtle.importKey(
    "raw",
    receiverPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const ecdhSecret = new Uint8Array(
    await subtle.deriveBits({ name: "ECDH", public: receiverKey }, senderPrivate, 256)
  );

  const salt = opts.salt ? new Uint8Array(opts.salt) : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();

  // RFC 8291 §3.4
  const prkKey = await hmacSha256(authSecret, ecdhSecret);
  const keyInfo = concatBytes(enc.encode("WebPush: info\0"), receiverPublic, senderPublic);
  const ikm = await hkdfExpand(prkKey, keyInfo);
  const prk = await hmacSha256(salt, ikm);
  const cek = (await hkdfExpand(prk, enc.encode("Content-Encoding: aes128gcm\0"))).slice(0, 16);
  const nonce = (await hkdfExpand(prk, enc.encode("Content-Encoding: nonce\0"))).slice(0, 12);

  const record = concatBytes(plaintext, new Uint8Array([2]));
  const aesKey = await subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, record));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concatBytes(salt, rs, new Uint8Array([senderPublic.length]), senderPublic, ct);
}

// שליחת push אחד. מחזיר {status} או {skipped:true} כשאין מפתח מוגדר.
// gone=true כשהמנוי מת (404/410) ויש למחוק אותו.
export async function sendWebPush(env, subscription, payloadObj, opts = {}) {
  if (!loadVapidJwk(env)) return { skipped: true };
  const auth = await vapidAuthHeader(env, subscription.endpoint, opts.subject);
  const body = await encryptPushBody(
    subscription.keys,
    new TextEncoder().encode(JSON.stringify(payloadObj))
  );
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(opts.ttl != null ? opts.ttl : 3600)
    },
    body
  });
  return { status: res.status, gone: res.status === 404 || res.status === 410 };
}

// שליחה לכל המנויים ב־KV (push:subs) + ניקוי מנויים מתים. לא זורק לעולם.
export async function pushToAllSubscribers(env, payloadObj) {
  try {
    if (!loadVapidJwk(env) || !env.EV_BACKUP) return { sent: 0, skipped: true };
    const subs = (await env.EV_BACKUP.get("push:subs", { type: "json" })) || [];
    if (!Array.isArray(subs) || !subs.length) return { sent: 0 };
    let sent = 0;
    const alive = [];
    for (const sub of subs) {
      try {
        const r = await sendWebPush(env, sub, payloadObj);
        if (r.status >= 200 && r.status < 300) sent++;
        if (!r.gone) alive.push(sub);
      } catch {
        alive.push(sub);
      }
    }
    if (alive.length !== subs.length) {
      await env.EV_BACKUP.put("push:subs", JSON.stringify(alive));
    }
    return { sent };
  } catch {
    return { sent: 0 };
  }
}
