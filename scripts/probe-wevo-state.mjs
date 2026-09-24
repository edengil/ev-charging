import WebSocket from "ws";

const COGNITO_URL = "https://cognito-idp.eu-central-1.amazonaws.com/";
const CLIENT_ID = "2amm11et52j39kubdekse641b6";
const API_BASE = "https://api.wevo.energy/mobileapp";

const email = process.env.WEVO_EMAIL || "edengil94@gmail.com";
const password = process.env.WEVO_PASSWORD || "";
if (!password) {
  console.error("Set WEVO_PASSWORD");
  process.exit(1);
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

function wsCall(token, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = API_BASE.replace("https://", "wss://") + "/ws";
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("ws timeout"));
    }, timeoutMs);
    const messages = [];
    ws.on("open", () => ws.send(JSON.stringify(payload)));
    ws.on("message", raw => {
      try {
        messages.push(JSON.parse(String(raw)));
      } catch {
        messages.push(String(raw));
      }
      if (messages.length >= 1) {
        clearTimeout(timer);
        ws.close();
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
const user = await fetch(`${API_BASE}/rest/user/details?refreshCognitoData=false`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
const txs = await fetch(`${API_BASE}/rest/transactions`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
const ongoing = (txs || []).filter(t => t.isOngoing);
const charger = String(user.chargerIdentifier || "");
const connector = String(user.connector || 1);
console.log(
  JSON.stringify(
    {
      charger,
      connector,
      ongoingCount: ongoing.length,
      ongoing: ongoing.slice(0, 2),
      stateMessages: await wsCall(token, {
        command: "getState",
        chargerIdentifier: charger,
        connector
      })
    },
    null,
    2
  )
);
