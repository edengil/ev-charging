/**
 * Netlify Function — Wevo bridge
 * Body:
 *   { email, password, action: "sync" | "state" | "authorize",
 *     chargerIdentifier?, connector? }
 */
const WebSocket = require("ws");

const COGNITO_URL = "https://cognito-idp.eu-central-1.amazonaws.com/";
const CLIENT_ID = "2amm11et52j39kubdekse641b6";
const API_BASE = "https://api.wevo.energy/mobileapp";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

async function cognitoLogin(email, password) {
  const usernames = email.startsWith("wevo/") ? [email] : [`wevo/${email}`, email];
  let lastErr = "התחברות נכשלה";
  for (const username of usernames) {
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
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.AuthenticationResult && data.AuthenticationResult.AccessToken) {
      return data.AuthenticationResult;
    }
    lastErr = data.message || data.__type || lastErr;
  }
  const err = new Error(lastErr);
  err.status = 401;
  throw err;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function getUser(token) {
  const res = await fetch(`${API_BASE}/rest/user/details?refreshCognitoData=false`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw Object.assign(new Error("שגיאה בפרטי משתמש"), { status: 502 });
  return res.json();
}

async function getTransactions(token) {
  const res = await fetch(`${API_BASE}/rest/transactions`, { headers: authHeaders(token) });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw Object.assign(new Error(`שגיאה בשליפת טעינות (${res.status})`), { status: 502, detail });
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function wsCommand(token, payload, { matchCharger, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = API_BASE.replace("https://", "wss://") + "/ws";
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    let settled = false;
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      fn(val);
    };
    const timer = setTimeout(() => done(reject, new Error("WebSocket timeout")), timeoutMs);

    ws.on("open", () => {
      ws.send(JSON.stringify(payload));
    });
    ws.on("message", raw => {
      let data;
      try {
        data = JSON.parse(String(raw));
      } catch {
        data = { raw: String(raw) };
      }
      if (matchCharger && data.chargerIdentifier && String(data.chargerIdentifier) !== String(matchCharger)) {
        return;
      }
      done(resolve, data);
    });
    ws.on("error", err => done(reject, err));
  });
}

/**
 * אישור טעינה + לחיצות חוזרות לתעריף יקר על אותו WebSocket (כמו באפליקציית Wevo).
 * לא סוגרים בין לחיצה ראשונה לשנייה — זה מה שחסר קודם.
 */
function wsAuthorizePremium(token, charger, connector, { rounds = 3, gapMs = 1800, timeoutMs = 28000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = API_BASE.replace("https://", "wss://") + "/ws";
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    let settled = false;
    let lastMsg = null;
    let lastState = null;
    const payload = { command: "authorize", chargerIdentifier: charger, connector };
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      fn(val);
    };
    const timer = setTimeout(() => done(resolve, { lastMsg, lastState, timedOut: true }), timeoutMs);

    const sendAuthorize = () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    };
    const sendGetState = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: "getState", chargerIdentifier: charger, connector }));
      }
    };

    ws.on("open", () => {
      sendAuthorize();
      for (let i = 1; i < rounds; i++) {
        setTimeout(sendAuthorize, gapMs * i);
      }
      setTimeout(sendGetState, gapMs * rounds + 400);
      setTimeout(sendGetState, gapMs * rounds + 2000);
    });
    ws.on("message", raw => {
      let data;
      try {
        data = JSON.parse(String(raw));
      } catch {
        data = { raw: String(raw) };
      }
      if (data.chargerIdentifier && String(data.chargerIdentifier) !== String(charger)) return;
      lastMsg = data;
      if (data.state || data.rawStatus || data.transactionData) lastState = data;
      const st = String(data.state || data.rawStatus || "");
      if (st === "Charging" || st === "SuspendedEV" || st === "SuspendedEVSE") {
        done(resolve, { lastMsg, lastState, charged: true });
      }
    });
    ws.on("error", err => done(reject, err));
  });
}

function summarizeUser(userRaw) {
  if (!userRaw) return null;
  return {
    email: userRaw.email,
    firstName: userRaw.firstName,
    lastName: userRaw.lastName,
    chargerIdentifier: userRaw.chargerIdentifier,
    connector: userRaw.connector || 1,
    homeCharger: userRaw.homeCharger
  };
}

function pickLiveOngoing(list, raw) {
  const ongoing = (list || []).filter(t => t && t.isOngoing);
  if (!ongoing.length) return null;
  const rawTx = raw && raw.transactionData ? raw.transactionData : null;
  const rawId = rawTx && rawTx.transactionId != null && String(rawTx.transactionId) !== ""
    ? String(rawTx.transactionId)
    : null;
  if (rawId) return ongoing.find(t => String(t.transactionId) === rawId) || null;
  const reported = raw && (raw.state || raw.rawStatus) ? String(raw.state || raw.rawStatus) : "";
  const chargingLike = reported === "Charging" || reported === "SuspendedEV" || reported === "SuspendedEVSE" || reported === "Finishing";
  if (!chargingLike) return null;
  const now = Date.now();
  const fresh = ongoing.filter(t => {
    if (t.plugOutTime || t.stopReason) return false;
    const plug = Number(t.plugInTime);
    if (!Number.isFinite(plug) || plug <= 0) return false;
    const ms = plug > 1e12 ? plug : plug * 1000;
    const age = now - ms;
    return age >= -5 * 60 * 1000 && age <= 36 * 60 * 60 * 1000;
  });
  fresh.sort((a, b) => (Number(b.plugInTime) || 0) - (Number(a.plugInTime) || 0));
  return fresh[0] || null;
}

function normalizeState(raw, ongoingTx, charger, connector) {
  const reported = raw && (raw.state || raw.rawStatus) ? String(raw.state || raw.rawStatus) : "";
  const vehicleStates = ["Preparing", "Charging", "SuspendedEV", "SuspendedEVSE", "Finishing", "Occupied", "Reserved"];
  const chargingStates = ["Charging", "SuspendedEV", "SuspendedEVSE"];
  // עסקה ישנה עם isOngoing אינה רכב. רק מצב העמדה עצמה.
  const vehiclePresent = vehicleStates.includes(reported);
  const liveOngoing = vehiclePresent ? ongoingTx : null;
  const tx = vehiclePresent && raw && raw.transactionData ? raw.transactionData : {};
  const state = reported || "Unknown";
  const energy =
    tx.totalEnergyKwh != null
      ? Number(tx.totalEnergyKwh)
      : liveOngoing
        ? Number(liveOngoing.totalEnergyKwh)
        : null;
  const rateKw =
    tx.rateKw != null ? Number(tx.rateKw) : liveOngoing && liveOngoing.avgRateKW != null ? Number(liveOngoing.avgRateKW) : null;
  const plugInTime = tx.plugInTime || (liveOngoing && liveOngoing.plugInTime) || null;
  const transactionId = vehiclePresent
    ? tx.transactionId || (liveOngoing && liveOngoing.transactionId) || null
    : null;
  const stateCharging = chargingStates.includes(state);
  return {
    chargerIdentifier: charger,
    connector: String(connector),
    state,
    rawStatus: raw && raw.rawStatus,
    success: !!(raw && raw.success !== false),
    isSecure: raw && raw.isSecure,
    connected: vehiclePresent,
    charging: stateCharging,
    waitingAuthorize:
      state === "Preparing" ||
      state === "Occupied" ||
      (vehiclePresent && !stateCharging && state !== "Finishing"),
    rateKw,
    totalEnergyKwh: energy,
    plugInTime,
    transactionId,
    totalCost: liveOngoing ? liveOngoing.totalCost : tx.totalCost,
    electricityCost: liveOngoing ? liveOngoing.electricityCost : tx.electricityCost,
    ongoing: liveOngoing
      ? {
          transactionId: liveOngoing.transactionId,
          plugInTime: liveOngoing.plugInTime,
          totalEnergyKwh: liveOngoing.totalEnergyKwh,
          totalCost: liveOngoing.totalCost,
          electricityCost: liveOngoing.electricityCost,
          avgRateKW: liveOngoing.avgRateKW,
          isOngoing: true
        }
      : null
  };
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
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const action = String(body.action || "sync");
    if (!email || !password) {
      return json(400, { error: "חסרים אימייל או סיסמה" });
    }

    const auth = await cognitoLogin(email, password);
    const token = auth.AccessToken;
    const userRaw = await getUser(token);
    const user = summarizeUser(userRaw);
    const charger = String(body.chargerIdentifier || user.chargerIdentifier || "");
    const connector = String(body.connector || user.connector || 1);
    if (!charger && action !== "sync") {
      return json(400, { error: "לא נמצא מזהה מטען בחשבון" });
    }

    if (action === "sync") {
      const list = await getTransactions(token);
      return json(200, { ok: true, action, user, count: list.length, transactions: list });
    }

    if (action === "state") {
      const [rawState, list] = await Promise.all([
        wsCommand(
          token,
          { command: "getState", chargerIdentifier: charger, connector },
          { matchCharger: charger }
        ),
        getTransactions(token)
      ]);
      const ongoingTx = pickLiveOngoing(list, rawState);
      const state = normalizeState(rawState, ongoingTx, charger, connector);
      return json(200, { ok: true, action, user, state });
    }

    if (action === "authorize") {
      // Wevo אחרי ~17:00 דורש לחיצה שנייה על "תעריף יקר" — עושים כמה authorize על אותו WS
      const confirmPremium = body.confirmPremium !== false;
      const readState = async () => {
        const [rawState, list] = await Promise.all([
          wsCommand(
            token,
            { command: "getState", chargerIdentifier: charger, connector },
            { matchCharger: charger }
          ),
          getTransactions(token)
        ]);
        const ongoingTx = pickLiveOngoing(list, rawState);
        return normalizeState(rawState, ongoingTx, charger, connector);
      };

      let result;
      if (confirmPremium) {
        result = await wsAuthorizePremium(token, charger, connector, {
          rounds: 3,
          gapMs: 1400,
          timeoutMs: 12000
        });
      } else {
        result = await wsCommand(
          token,
          { command: "authorize", chargerIdentifier: charger, connector },
          { matchCharger: charger, timeoutMs: 10000 }
        );
      }

      let state = null;
      try {
        if (result && result.lastState) {
          const list = await getTransactions(token);
          const ongoingTx = pickLiveOngoing(list, result.lastState);
          state = normalizeState(result.lastState, ongoingTx, charger, connector);
        } else {
          state = await readState();
        }
      } catch {
        try {
          state = await readState();
        } catch {}
      }

      // אם עדיין ממתין לאישור — סיבוב נוסף רק כשמאשרים גם תעריף יקר
      if (state && state.waitingAuthorize && confirmPremium) {
        try {
          result = await wsAuthorizePremium(token, charger, connector, {
            rounds: 2,
            gapMs: 1200,
            timeoutMs: 8000
          });
          state = await readState();
        } catch {}
      }

      return json(200, {
        ok: true,
        action,
        user,
        authorize: result,
        state,
        premiumConfirmed: confirmPremium,
        waitingAuthorize: !!(state && state.waitingAuthorize)
      });
    }

    return json(400, { error: "action לא מוכר (sync|state|authorize)" });
  } catch (e) {
    const status = e.status || 500;
    return json(status, { error: e.message || "שגיאה לא צפויה", detail: e.detail });
  }
};
