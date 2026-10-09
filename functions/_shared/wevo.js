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

/**
 * פרטי תעריף מהמטען הפרטי: לוח "תעריף משתנה" + פרטי עלות.
 * מנסה עם chargerIdentifier+connector ואם נכשל (לא 401/403) — בלי פרמטרים.
 * מחזיר { status, json } לכל נתיב, בלי לזרוק — הלקוח מנרמל בהגנה.
 */
async function fetchWevoTariffEndpoint(token, path, qs) {
  const attempt = async suffix => {
    try {
      const res = await fetch(`${API_BASE}/rest${path}${suffix}`, { headers: authHeaders(token) });
      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text || "null");
      } catch {}
      const out = { status: res.status, json: parsed };
      if (parsed == null) out.raw = String(text || "").slice(0, 500);
      return out;
    } catch (e) {
      return { status: 0, json: null, error: String((e && e.message) || e) };
    }
  };
  let out = await attempt(qs);
  if (out.status >= 400 && out.status !== 401 && out.status !== 403) {
    const bare = await attempt("");
    // אם הקריאה עם הפרמטרים החזירה 4xx — מעדיפים את התוצאה הטובה מבין השתיים
    if (bare.status < out.status) out = bare;
  }
  return out;
}

export async function getChargerTariff(token, charger, connector) {
  const qs = charger
    ? `?chargerIdentifier=${encodeURIComponent(charger)}&connector=${encodeURIComponent(connector || 1)}`
    : `?connector=${encodeURIComponent(connector || 1)}`;
  const [rateDetails, variableRanges] = await Promise.all([
    fetchWevoTariffEndpoint(token, "/charger/rate-details", qs),
    fetchWevoTariffEndpoint(token, "/charger/variable-cost-ranges", qs)
  ]);
  return { rateDetails, variableRanges };
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

/**
 * אישור דו־שלבי כמו באפליקציית Wevo:
 * שלב 1 — "אישור טעינה" (לחיצה ראשונה).
 * שלב 2 — "אישור טעינת פרימיום" (לחיצה שנייה) — Wevo מציגה את האופציה הזו רק
 * אחרי שהראשונה עובדה, ורק בשעות הפרימיום. לכן לא יורים את כל הלחיצות ברצף —
 * מחכים בין השלבים ובודקים מצב. אותו WS נשאר פתוח בין השלבים.
 */
export function wsAuthorizePremium(token, charger, connector, { gapMs = 4000, timeoutMs = 22000, boost = false } = {}) {
  return new Promise(async (resolve, reject) => {
    let settled = false;
    let lastMsg = null;
    let lastState = null;
    let charged = false;
    let ws;
    // boost: ניסיון עקיפת תזמון מטען — מקביל ל"התחל טעינת פרימיום כעת" באפליקציית Wevo.
    // שדה לא מוכר מתעלם ע"י Wevo, כך שאין סיכון בהוספה.
    const payload = { command: "authorize", chargerIdentifier: charger, connector, ...(boost ? { boost: true } : {}) };
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws && ws.close();
      } catch {}
      fn(val);
    };
    const timer = setTimeout(() => done(resolve, { lastMsg, lastState, timedOut: true, charged }), timeoutMs);
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
    const isChargingState = data => {
      const st = String((data && (data.state || data.rawStatus)) || "");
      return st === "Charging" || st === "SuspendedEV" || st === "SuspendedEVSE";
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
        if (isChargingState(data)) {
          charged = true;
          done(resolve, { lastMsg, lastState, charged: true });
        }
      });
      ws.addEventListener("error", () => done(reject, new Error("WebSocket error")));
      // שלב 1: "אישור טעינה"
      sendAuthorize();
      setTimeout(sendGetState, 2500);
      // שלב 2: "אישור פרימיום" — רק אם עדיין לא נטען (נותנים ל-Wevo זמן לעבד את הראשון)
      setTimeout(() => {
        if (!charged && !isChargingState(lastState)) sendAuthorize();
      }, gapMs);
      setTimeout(sendGetState, gapMs + 2500);
      // שלב 3 (גיבוי): לחיצה נוספת אם עדיין ממתין
      setTimeout(() => {
        if (!charged && !isChargingState(lastState)) sendAuthorize();
      }, gapMs * 2);
      setTimeout(sendGetState, gapMs * 2 + 2500);
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
  if (!charger && action !== "sync" && action !== "inspect" && action !== "tariff") {
    const err = new Error("לא נמצא מזהה מטען בחשבון");
    err.status = 400;
    throw err;
  }

  if (action === "sync") {
    const list = await getTransactions(token);
    return { ok: true, action, user, count: list.length, transactions: list };
  }

  if (action === "tariff") {
    const tariff = await getChargerTariff(token, charger, connector);
    return { ok: true, action, user, tariff };
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
    let tariffRaw = null;
    if (charger) {
      try {
        tariffRaw = await getChargerTariff(token, charger, connector);
      } catch (e) {
        tariffRaw = { error: (e && e.message) || String(e) };
      }
    }
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
    walk({ tariffRateDetails: tariffRaw && tariffRaw.rateDetails ? tariffRaw.rateDetails.json : null });
    walk({ tariffVariableRanges: tariffRaw && tariffRaw.variableRanges ? tariffRaw.variableRanges.json : null });
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
      tariffRateDetails: tariffRaw && tariffRaw.rateDetails ? tariffRaw.rateDetails : null,
      tariffVariableRanges: tariffRaw && tariffRaw.variableRanges ? tariffRaw.variableRanges : null,
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
    const boost = body.boost === true;
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
        gapMs: 4000,
        timeoutMs: 22000,
        boost
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
            gapMs: 3500,
            timeoutMs: 16000,
            boost
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
      boostRequested: boost,
      waitingAuthorize: !!(state && state.waitingAuthorize)
    };
  }

  if (action === "probe-tariff-write") {
    // כלי אבחון: בודק אם ה־API של Wevo תומך בכתיבת תעריף (בלי לשנות כלום).
    // משתמש ב־OPTIONS בלבד — לא שולח נתונים, לא משנה מחירים.
    const paths = [
      "/charger/rate-details",
      "/charger/variable-cost-ranges",
      "/charger/tariff",
      "/charger/price",
      "/charger/rates"
    ];
    const results = [];
    for (const p of paths) {
      const entry = { path: p, allow: null, status: null, error: null };
      try {
        const res = await fetch(`${API_BASE}/rest${p}`, {
          method: "OPTIONS",
          headers: authHeaders(token)
        });
        entry.status = res.status;
        entry.allow = res.headers.get("allow") || res.headers.get("Access-Control-Allow-Methods") || "(no header)";
      } catch (e) {
        entry.error = String((e && e.message) || e).slice(0, 200);
      }
      results.push(entry);
      await new Promise(r => setTimeout(r, 400));
    }
    return { ok: true, action, user, probeResults: results };
  }

  if (action === "probe-commands") {
    // כלי אבחון זמני: מנסה לגלות את פקודת הפרימיום האמיתית של Wevo.
    // שולח פקודות WebSocket מועמדות אחת־אחת, עם timeout קצר, ומחזיר את התגובה הגולמית.
    // בטיחות: לא מבצע retry, לא שולח פקודות הרסניות (stop/reset), וכל פקודה נשלחת פעם אחת בלבד.
    // מצומצם ל־6 המועמדות הסבירות ביותר עם timeout קצר כדי לא לחרוג ממגבלת השרת.
    const candidates = [
      "authorize",
      "startCharge",
      "startCharging",
      "premiumCharge",
      "boost",
      "boostCharge",
      "startPremiumCharge"
    ];
    const results = [];
    for (const cmd of candidates) {
      const entry = { command: cmd, status: "unknown", response: null, error: null };
      try {
        const resp = await wsCommand(
          token,
          { command: cmd, chargerIdentifier: charger, connector },
          { matchCharger: charger, timeoutMs: 4000 }
        );
        entry.status = "responded";
        // שומרים תקציר בלבד — לא את כל ה־payload הגולמי
        entry.response = JSON.stringify(resp).slice(0, 500);
      } catch (e) {
        entry.status = "failed";
        entry.error = String((e && e.message) || e).slice(0, 200);
      }
      results.push(entry);
      // הפוגה קצרה בין פקודות כדי לא להעמיס
      await new Promise(r => setTimeout(r, 500));
    }
    return { ok: true, action, user, probeResults: results };
  }

  const err = new Error("action לא מוכר (sync|state|authorize|inspect|tariff|probe-commands|probe-tariff-write)");
  err.status = 400;
  throw err;
}
