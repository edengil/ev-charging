/**
 * Probe Wevo for any vehicle/RFID/identity fields.
 * Usage: set WEVO_EMAIL / WEVO_PASSWORD then:
 *   node scripts/probe-wevo-identity.mjs
 * Writes scrubbed report to data/wevo-identity-report.json (no tokens/passwords).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import WebSocket from "ws";

const COGNITO_URL = "https://cognito-idp.eu-central-1.amazonaws.com/";
const CLIENT_ID = "2amm11et52j39kubdekse641b6";
const API_BASE = "https://api.wevo.energy/mobileapp";

const email = process.env.WEVO_EMAIL || "edengil94@gmail.com";
const password = process.env.WEVO_PASSWORD || "";
if (!password) {
  console.error("Set WEVO_PASSWORD env var (not stored in repo).");
  process.exit(1);
}

const ID_HINT = /id|tag|vin|rfid|car|user|token|vehicle|mac|auth|plate|license|driver|card|uid|serial|evcc|emaid|iso/i;

function collectKeys(obj, prefix = "", into = new Map()) {
  if (obj == null || typeof obj !== "object") return into;
  if (Array.isArray(obj)) {
    obj.slice(0, 5).forEach((v, i) => collectKeys(v, `${prefix}[]`, into));
    return into;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const samples = into.get(p) || { count: 0, samples: [], identityHint: ID_HINT.test(k) || ID_HINT.test(p) };
    samples.count += 1;
    if (samples.samples.length < 3) {
      let s = v;
      if (typeof v === "string" && v.length > 80) s = v.slice(0, 80) + "…";
      if (typeof v === "object" && v) s = Array.isArray(v) ? `[array:${v.length}]` : `{object:${Object.keys(v).join(",")}}`;
      samples.samples.push(s);
    }
    into.set(p, samples);
    if (v && typeof v === "object") collectKeys(v, p, into);
  }
  return into;
}

async function login() {
  for (const username of [`wevo/${email}`, email]) {
    const res = await fetch(COGNITO_URL, {
      method: "POST",
      headers: {
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
        "Content-Type": "application/x-amz-json-1.1"
      },
      body: JSON.stringify({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: username, PASSWORD: password }
      })
    });
    const data = await res.json();
    if (data.AuthenticationResult?.AccessToken) return data.AuthenticationResult.AccessToken;
  }
  throw new Error("login failed");
}

function wsCall(token, payload, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const url = API_BASE.replace("https://", "wss://") + "/ws";
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const messages = [];
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      resolve(messages);
    }, timeoutMs);
    ws.on("open", () => ws.send(JSON.stringify(payload)));
    ws.on("message", raw => {
      try {
        messages.push(JSON.parse(String(raw)));
      } catch {
        messages.push({ raw: String(raw) });
      }
      if (messages.length >= 2) {
        clearTimeout(timer);
        try {
          ws.close();
        } catch {}
        resolve(messages);
      }
    });
    ws.on("error", err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

const token = await login();
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
const user = await fetch(`${API_BASE}/rest/user/details?refreshCognitoData=false`, { headers }).then(r => r.json());
const txs = await fetch(`${API_BASE}/rest/transactions`, { headers }).then(r => r.json());
const list = Array.isArray(txs) ? txs : [];

const charger = String(user.chargerIdentifier || "");
const connector = String(user.connector || 1);
let stateMsgs = [];
try {
  stateMsgs = await wsCall(token, { command: "getState", chargerIdentifier: charger, connector });
} catch (e) {
  stateMsgs = [{ error: String(e.message || e) }];
}

const keyMap = new Map();
collectKeys({ user }, "user", keyMap);
collectKeys({ transactions: list.slice(0, 30) }, "tx", keyMap);
collectKeys({ stateMessages: stateMsgs }, "ws", keyMap);

const allKeys = [...keyMap.entries()]
  .map(([path, info]) => ({ path, ...info }))
  .sort((a, b) => a.path.localeCompare(b.path));
const identityKeys = allKeys.filter(k => k.identityHint);

const report = {
  generatedAt: new Date().toISOString(),
  transactionCount: list.length,
  ongoingCount: list.filter(t => t.isOngoing).length,
  chargerPresent: !!charger,
  identityCandidateFields: identityKeys,
  allFields: allKeys,
  sampleFinishedTx: list.find(t => !t.isOngoing) || null,
  sampleOngoingTx: list.find(t => t.isOngoing) || null,
  sampleStateMessage: stateMsgs[0] || null
};

// scrub emails mildly in samples
const scrub = JSON.stringify(report).replaceAll(email, "[email]");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "data", "wevo-identity-report.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, scrub);
console.log(
  JSON.stringify(
    {
      ok: true,
      out,
      transactionCount: list.length,
      identityCandidates: identityKeys.map(k => k.path),
      identityCount: identityKeys.length,
      topIdSamples: identityKeys.slice(0, 40).map(k => ({ path: k.path, samples: k.samples }))
    },
    null,
    2
  )
);
