/**
 * Shared Wevo bridge helpers for Cloudflare Pages Functions.
 * Outbound WebSocket via fetch Upgrade (Workers cannot use Node `ws`).
 */

export const COGNITO_URL = "https://cognito-idp.eu-central-1.amazonaws.com/";
export const CLIENT_ID = "2amm11et52j39kubdekse641b6";
export const API_BASE = "https://api.wevo.energy/mobileapp";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function cognitoLogin(email, password) {
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

export async function getUser(token) {
  const res = await fetch(`${API_BASE}/rest/user/details?refreshCognitoData=false`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw Object.assign(new Error("שגיאה בפרטי משתמש"), { status: 502 });
  return res.json();
}

export async function getTransactions(token) {
  const res = await fetch(`${API_BASE}/rest/transactions`, { headers: authHeaders(token) });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw Object.assign(new Error(`שגיאה בשליפת טעינות (${res.status})`), { status: 502, detail });
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Open outbound WebSocket to Wevo with Authorization header (Workers). */
async function openWevoSocket(token) {
  const resp = await fetch(`${API_BASE}/ws`, {
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
      Authorization: `Bearer ${token}`
    }
  });
  const ws = resp.webSocket;
  if (!ws) {
    throw Object.assign(new Error(`WebSocket נכשל (${resp.status})`), { status: 502 });
  }
  ws.accept();
  return ws;
}

export function wsCommand(token, payload, { matchCharger, timeoutMs = 10000 } = {}) {
  return new Promise(async (resolve, reject) => {
    let settled = false;
    let ws;
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws && ws.close();
      } catch {}
      fn(val);
    };
    const timer = setTimeout(() => done(reject, new Error("WebSocket timeout")), timeoutMs);
    try {
      ws = await openWevoSocket(token);
      ws.addEventListener("message", event => {
        let data;
        try {
          data = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
        } catch {
          data = { raw: String(event.data) };
        }
        if (matchCharger && data.chargerIdentifier && String(data.chargerIdentifier) !== String(matchCharger)) {
          return;
        }
        // getState: הודעה בלי state (אישור/פעימה) אינה «אין רכב». מחכים לדגימת עמדה.
        if (payload && payload.command === "getState" && !(data.state || data.rawStatus)) {
          return;
        }
        done(resolve, data);
      });
      ws.addEventListener("error", () => done(reject, new Error("WebSocket error")));
      ws.send(JSON.stringify(payload));
    } catch (e) {
      done(reject, e);
    }
  });
}

export function wsAuthorizePremium(token, charger, connector, { rounds = 3, gapMs = 1800, timeoutMs = 28000 } = {}) {
  return new Promise(async (resolve, reject) => {
    let settled = false;
    let lastMsg = null;
    let lastState = null;
    let ws;
    const payload = { command: "authorize", chargerIdentifier: charger, connector };
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws && ws.close();
      } catch {}
      fn(val);
    };
    const timer = setTimeout(() => done(resolve, { lastMsg, lastState, timedOut: true }), timeoutMs);
    const sendAuthorize = () => {
      try {
        ws && ws.send(JSON.stringify(payload));
      } catch {}
    };
    const sendGetState = () => {
      try {
        ws &&
          ws.send(
            JSON.stringify({ command: "getState", chargerIdentifier: charger, connector })
          );
      } catch {}
    };
    try {
      ws = await openWevoSocket(token);
      ws.addEventListener("message", event => {
        let data;
        try {
          data = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
        } catch {
          data = { raw: String(event.data) };
        }
        if (data.chargerIdentifier && String(data.chargerIdentifier) !== String(charger)) return;
        lastMsg = data;
        if (data.state || data.rawStatus || data.transactionData) lastState = data;
        const st = String(data.state || data.rawStatus || "");
        if (st === "Charging" || st === "SuspendedEV" || st === "SuspendedEVSE") {
          done(resolve, { lastMsg, lastState, charged: true });
        }
      });
      ws.addEventListener("error", () => done(reject, new Error("WebSocket error")));
      sendAuthorize();
      for (let i = 1; i < rounds; i++) {
        setTimeout(sendAuthorize, gapMs * i);
      }
      setTimeout(sendGetState, gapMs * rounds + 400);
      setTimeout(sendGetState, gapMs * rounds + 2000);
    } catch (e) {
      done(reject, e);
    }
  });
}

export function summarizeUser(userRaw) {
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

/**
 * עסקה פתוחה לשימוש רק אם היא העסקה של המצב החי.
 * הראשונה ברשימה עלולה להיות טעינה ישנה שעדיין מסומנת isOngoing.
 */
export function pickLiveOngoing(list, raw) {
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

export function normalizeState(raw, ongoingTx, charger, connector) {
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
    tx.rateKw != null
      ? Number(tx.rateKw)
      : liveOngoing && liveOngoing.avgRateKW != null
        ? Number(liveOngoing.avgRateKW)
        : null;
  const plugInTime = tx.plugInTime || (liveOngoing && liveOngoing.plugInTime) || null;
  const transactionId = vehiclePresent
    ? tx.transactionId || (liveOngoing && liveOngoing.transactionId) || null
    : null;
  const stateCharging = chargingStates.includes(state);
  const totalCost = liveOngoing ? liveOngoing.totalCost : tx.totalCost;
  const electricityCost = liveOngoing
    ? liveOngoing.electricityCost
    : tx.electricityCost != null
      ? tx.electricityCost
      : null;
  return {
    chargerIdentifier: charger,
    connector: String(connector),
    state,
    rawStatus: raw && raw.rawStatus,
    success: !!(raw && raw.success !== false),
    isSecure: raw && raw.isSecure,
    connectorType: raw && raw.connectorType,
    timeZone: raw && raw.timeZone,
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
    totalCost,
    electricityCost,
    avgRateKW: liveOngoing && liveOngoing.avgRateKW != null ? Number(liveOngoing.avgRateKW) : null,
    maxRateKW: liveOngoing && liveOngoing.maxRateKW != null ? Number(liveOngoing.maxRateKW) : null,
    // הרחבות מצב חי מ-Wevo
    delayCharge: !!tx.delayCharge,
    manageCharge: !!tx.manageCharge,
    isWaitingAllocation: !!tx.isWaitingAllocation,
    isBoost: !!(tx.isBoost || (liveOngoing && liveOngoing.isBoost)),
    inWindow: tx.inWindow != null ? !!tx.inWindow : null,
    solarChargingType: tx.solarChargingType || null,
    offPeakStartTime: tx.offPeakStartTime != null ? Number(tx.offPeakStartTime) : null,
    offPeakEndTime: tx.offPeakEndTime != null ? Number(tx.offPeakEndTime) : null,
    didCompleteFull: !!(tx.didCompleteFull || (liveOngoing && liveOngoing.didCompleteFull)),
    chargingFullTime: tx.chargingFullTime || null,
    idleFeeApplied: !!tx.idleFeeApplied,
    stoppedDueToLimit: !!tx.stoppedDueToLimit,
    maxChargingDelay: tx.maxChargingDelay != null ? Number(tx.maxChargingDelay) : null,
    stopReason: liveOngoing && liveOngoing.stopReason ? liveOngoing.stopReason : null,
    origin: liveOngoing && (liveOngoing.originStr || liveOngoing.origin) || null,
    netDuration: liveOngoing && liveOngoing.netDuration != null ? Number(liveOngoing.netDuration) : null,
    ongoing: liveOngoing
      ? {
          transactionId: liveOngoing.transactionId,
          plugInTime: liveOngoing.plugInTime,
          totalEnergyKwh: liveOngoing.totalEnergyKwh,
          totalCost: liveOngoing.totalCost,
          electricityCost: liveOngoing.electricityCost,
          avgRateKW: liveOngoing.avgRateKW,
          maxRateKW: liveOngoing.maxRateKW,
          stopReason: liveOngoing.stopReason,
          origin: liveOngoing.originStr || liveOngoing.origin,
          netDuration: liveOngoing.netDuration,
          isBoost: liveOngoing.isBoost,
          didCompleteFull: liveOngoing.didCompleteFull,
          isOngoing: true
        }
      : null
  };
}

export async function handleWevoRequest(body) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const action = String(body.action || "sync");
  if (!email || !password) {
    const err = new Error("חסרים אימייל או סיסמה");
    err.status = 400;
    throw err;
  }

  const auth = await cognitoLogin(email, password);
  const token = auth.AccessToken;
  const userRaw = await getUser(token);
  const user = summarizeUser(userRaw);
  const charger = String(body.chargerIdentifier || user.chargerIdentifier || "");
  const connector = String(body.connector || user.connector || 1);
  if (!charger && action !== "sync" && action !== "inspect") {
    const err = new Error("לא נמצא מזהה מטען בחשבון");
    err.status = 400;
    throw err;
  }

  if (action === "sync") {
    const list = await getTransactions(token);
    return { ok: true, action, user, count: list.length, transactions: list };
  }

  if (action === "inspect") {
    const list = await getTransactions(token);
    let rawState = null;
    if (charger) {
      try {
        rawState = await wsCommand(
          token,
          { command: "getState", chargerIdentifier: charger, connector },
          { matchCharger: charger, timeoutMs: 12000 }
        );
      } catch (e) {
        rawState = { error: e.message || String(e) };
      }
    }
    const ID_HINT = /id|tag|vin|rfid|car|user|token|vehicle|mac|auth|plate|license|driver|card|uid|serial|emaid|iso|ocpp/i;
    const keyInfo = new Map();
    const walk = (obj, prefix = "") => {
      if (obj == null || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        obj.slice(0, 8).forEach(v => walk(v, prefix ? `${prefix}[]` : "[]"));
        return;
      }
      for (const [k, v] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        const cur = keyInfo.get(p) || { count: 0, samples: [], identityHint: ID_HINT.test(k) || ID_HINT.test(p) };
        cur.count += 1;
        if (cur.samples.length < 4) {
          if (v == null || typeof v === "number" || typeof v === "boolean") cur.samples.push(v);
          else if (typeof v === "string") cur.samples.push(v.length > 60 ? v.slice(0, 60) + "…" : v);
          else if (Array.isArray(v)) cur.samples.push(`[${v.length}]`);
          else cur.samples.push(`{${Object.keys(v).slice(0, 8).join(",")}}`);
        }
        keyInfo.set(p, cur);
        if (v && typeof v === "object") walk(v, p);
      }
    };
    walk({ user: userRaw });
    walk({ transactions: (list || []).slice(0, 40) });
    walk({ state: rawState });
    const fields = [...keyInfo.entries()]
      .map(([path, info]) => ({ path, ...info }))
      .sort((a, b) => a.path.localeCompare(b.path));
    const identityCandidates = fields.filter(f => f.identityHint);
    const finished = (list || []).find(t => t && !t.isOngoing) || null;
    const ongoing = (list || []).find(t => t && t.isOngoing) || null;
    const rfidStats = { nonNull: 0, unique: new Set(), samples: [] };
    const plateStats = { nonNull: 0, unique: new Set(), samples: [] };
    for (const t of list || []) {
      if (!t) continue;
      if (t.rfidString != null && String(t.rfidString).trim() !== "") {
        rfidStats.nonNull += 1;
        rfidStats.unique.add(String(t.rfidString));
        if (rfidStats.samples.length < 8) rfidStats.samples.push(String(t.rfidString));
      }
      if (t.licensePlate != null && String(t.licensePlate).trim() !== "") {
        plateStats.nonNull += 1;
        plateStats.unique.add(String(t.licensePlate));
        if (plateStats.samples.length < 8) plateStats.samples.push(String(t.licensePlate));
      }
    }
    const rfidUnique = [...rfidStats.unique];
    const plateUnique = [...plateStats.unique];
    let verdict = "no_obvious_vehicle_identity";
    if (rfidUnique.length >= 2 || plateUnique.length >= 2) verdict = "auto_link_ready";
    else if (rfidStats.nonNull > 0 || plateStats.nonNull > 0) verdict = "rfid_field_exists_sparse";
    else if (identityCandidates.some(f => /rfid|licensePlate|vin|idTag|emaid/i.test(f.path))) {
      verdict = "schema_supports_rfid_but_empty";
    }
    return {
      ok: true,
      action: "inspect",
      user,
      transactionCount: (list || []).length,
      ongoingCount: (list || []).filter(t => t && t.isOngoing).length,
      identityCandidates,
      identityCandidatePaths: identityCandidates.map(f => f.path),
      allFieldPaths: fields.map(f => f.path),
      sampleFinishedKeys: finished ? Object.keys(finished).sort() : [],
      sampleOngoingKeys: ongoing ? Object.keys(ongoing).sort() : [],
      sampleStateKeys: rawState && typeof rawState === "object" ? Object.keys(rawState).sort() : [],
      sampleFinished: finished,
      sampleOngoing: ongoing,
      sampleState: rawState,
      rfid: {
        nonNull: rfidStats.nonNull,
        uniqueCount: rfidUnique.length,
        uniques: rfidUnique.slice(0, 20),
        samples: rfidStats.samples
      },
      licensePlate: {
        nonNull: plateStats.nonNull,
        uniqueCount: plateUnique.length,
        uniques: plateUnique.slice(0, 20),
        samples: plateStats.samples
      },
      verdict
    };
  }

  if (action === "state") {
    const [rawState, list] = await Promise.all([
      wsCommand(token, { command: "getState", chargerIdentifier: charger, connector }, { matchCharger: charger }),
      getTransactions(token)
    ]);
    const ongoingTx = pickLiveOngoing(list, rawState);
    const state = normalizeState(rawState, ongoingTx, charger, connector);
    return { ok: true, action, user, state };
  }

  if (action === "authorize") {
    const confirmPremium = body.confirmPremium !== false;
    const readState = async () => {
      const [rawState, list] = await Promise.all([
        wsCommand(token, { command: "getState", chargerIdentifier: charger, connector }, { matchCharger: charger }),
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

    if (state && state.waitingAuthorize) {
      if (confirmPremium) {
        try {
          result = await wsAuthorizePremium(token, charger, connector, {
            rounds: 2,
            gapMs: 1200,
            timeoutMs: 8000
          });
          state = await readState();
        } catch {}
      }
      // confirmPremium=false: אחרי אישור בודד בשיא — מצב ממתין הוא רצוי (המתנה לזול), בלי לחיצות תעריף יקר
    }

    return {
      ok: true,
      action,
      user,
      authorize: result,
      state,
      premiumConfirmed: confirmPremium,
      waitingAuthorize: !!(state && state.waitingAuthorize)
    };
  }

  const err = new Error("action לא מוכר (sync|state|authorize|inspect)");
  err.status = 400;
  throw err;
}
