import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const src = readFileSync(join(root, "functions/_shared/push.js"), "utf8");
const dir = mkdtempSync(join(tmpdir(), "ev-push-"));
const dest = join(dir, "push.mjs");
writeFileSync(dest, src);
const push = await import(pathToFileURL(dest).href);
rmSync(dir, { recursive: true, force: true });

const { b64urlToBytes, bytesToB64url, encryptPushBody, vapidAuthHeader, vapidPublicKey, loadVapidJwk } = push;

// וקטור רשמי — RFC 8291 סעיף 5
const RFC = {
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  receiverPublic:
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  senderPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  senderPublic:
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  plaintext: "When I grow up, I want to be a watermelon",
  body: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
};

function jwkFromPointAndD(pointB64, dB64) {
  const point = b64urlToBytes(pointB64);
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(point.slice(1, 33)),
    y: bytesToB64url(point.slice(33, 65)),
    d: dB64
  };
}

describe("RFC 8291 aes128gcm", () => {
  it("הצפנה זהה לבייט מול וקטור ה־RFC", async () => {
    const expected = b64urlToBytes(RFC.body);
    const salt = expected.slice(0, 16);
    const senderJwk = jwkFromPointAndD(RFC.senderPublic, RFC.senderPrivate);
    const out = await encryptPushBody(
      { p256dh: RFC.receiverPublic, auth: RFC.auth },
      new TextEncoder().encode(RFC.plaintext),
      { salt, senderJwk }
    );
    assert.equal(out.length, expected.length);
    assert.deepEqual(Buffer.from(out), Buffer.from(expected));
  });

  it("הצפנה אקראית מפענחת חזרה עם מפתח המקבל (round-trip)", async () => {
    // יצירת מנוי בדיקה אמיתי ופענוח עצמאי לפי אותו אלגוריתם מצד המקבל
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const body = await encryptPushBody(
      { p256dh: bytesToB64url(pubRaw), auth: bytesToB64url(auth) },
      new TextEncoder().encode(JSON.stringify({ title: "בדיקה" }))
    );
    // פענוח: כותרת aes128gcm
    const salt = body.slice(0, 16);
    const idlen = body[20];
    const senderPub = body.slice(21, 21 + idlen);
    const ct = body.slice(21 + idlen);
    const senderKey = await crypto.subtle.importKey("raw", senderPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: senderKey }, pair.privateKey, 256));
    const hmac = async (key, data) => {
      const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
    };
    const cat = (...ps) => {
      const o = new Uint8Array(ps.reduce((n, p) => n + p.length, 0));
      let off = 0;
      for (const p of ps) { o.set(p, off); off += p.length; }
      return o;
    };
    const enc = new TextEncoder();
    const prkKey = await hmac(auth, secret);
    const ikm = await hmac(prkKey, cat(enc.encode("WebPush: info\0"), pubRaw, senderPub, new Uint8Array([1])));
    const prk = await hmac(salt, ikm);
    const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
    const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
    const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["decrypt"]);
    const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aesKey, ct));
    assert.equal(pt[pt.length - 1], 2);
    assert.equal(new TextDecoder().decode(pt.slice(0, -1)), JSON.stringify({ title: "בדיקה" }));
  });
});

describe("VAPID", () => {
  it("JWT חתום נכון ומכיל aud/exp/sub; k תואם למפתח הציבורי", async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const env = { VAPID_PRIVATE_JWK: bytesToB64url(new TextEncoder().encode(JSON.stringify(jwk))) };
    assert.ok(loadVapidJwk(env));
    const header = await vapidAuthHeader(env, "https://fcm.googleapis.com/fcm/send/abc");
    assert.ok(header.startsWith("vapid t="));
    const jwt = header.slice("vapid t=".length, header.indexOf(","));
    assert.ok(header.endsWith(", k=" + vapidPublicKey(jwk)));
    const [h, p, s] = jwt.split(".");
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    assert.equal(payload.aud, "https://fcm.googleapis.com");
    assert.equal(payload.sub, "mailto:edengil94@gmail.com");
    assert.ok(payload.exp > Math.floor(Date.now() / 1000));
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      b64urlToBytes(s),
      new TextEncoder().encode(h + "." + p)
    );
    assert.equal(ok, true);
    assert.equal(JSON.parse(new TextDecoder().decode(b64urlToBytes(h))).alg, "ES256");
  });

  it("בלי מפתח מוגדר — loadVapidJwk מחזיר null", () => {
    assert.equal(loadVapidJwk({}), null);
    assert.equal(loadVapidJwk({ VAPID_PRIVATE_JWK: "not-json" }), null);
  });
});
