/**
 * Local static + API mock server for Playwright E2E.
 * Run: E2E_MOCK=1 node scripts/e2e-server.mjs
 * URL: http://127.0.0.1:8787/
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fnPath = path.resolve(root, "netlify/functions/wevo-sync.js");
const PORT = Number(process.env.E2E_PORT || 8787);
const MOCK = process.env.E2E_MOCK === "1" || process.env.E2E_MOCK === "true";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};

let cloudStore = {
  configured: false,
  pinHash: null,
  data: null,
  updatedAt: null
};

/** wevo mock: charging | wait-auth */
let wevoMock = {
  scenario: "charging",
  lastAuthorize: null,
  authorizeCalls: []
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { __raw: raw };
  }
}

function mockWevoUser() {
  return {
    chargerIdentifier: "E2E-CHARGER",
    connector: 1,
    email: "e2e@example.com"
  };
}

function mockWevoChargingState() {
  return {
    chargerIdentifier: "E2E-CHARGER",
    connector: "1",
    state: "Charging",
    success: true,
    connected: true,
    charging: true,
    waitingAuthorize: false,
    rateKw: 7.2,
    totalEnergyKwh: 12.5,
    plugInTime: new Date(Date.now() - 3600000).toISOString(),
    transactionId: 999001,
    totalCost: 18.4,
    electricityCost: 12.1,
    avgRateKW: 6.8,
    maxRateKW: 7.4,
    delayCharge: true,
    manageCharge: false,
    isWaitingAllocation: false,
    isBoost: false,
    inWindow: true,
    solarChargingType: null,
    offPeakStartTime: 82800,
    offPeakEndTime: 21600,
    didCompleteFull: false,
    idleFeeApplied: false,
    stoppedDueToLimit: false,
    stopReason: null,
    origin: "Remote",
    netDuration: 3600,
    ongoing: {
      transactionId: 999001,
      totalEnergyKwh: 12.5,
      totalCost: 18.4,
      electricityCost: 12.1,
      avgRateKW: 6.8,
      maxRateKW: 7.4,
      isOngoing: true
    }
  };
}

function mockWevoWaitAuthState() {
  return {
    ...mockWevoChargingState(),
    state: "Preparing",
    charging: false,
    waitingAuthorize: true,
    rateKw: 0,
    totalEnergyKwh: 0,
    totalCost: 0,
    electricityCost: 0,
    delayCharge: true,
    inWindow: false,
    ongoing: null
  };
}

function mockWevoState() {
  const state =
    wevoMock.scenario === "wait-auth" ? mockWevoWaitAuthState() : mockWevoChargingState();
  return {
    ok: true,
    state,
    user: mockWevoUser()
  };
}

function handleMockWevo(body) {
  const action = String(body.action || "sync");
  if (action === "state") return mockWevoState();
  if (action === "authorize") {
    const confirmPremium = body.confirmPremium !== false;
    const call = {
      confirmPremium,
      rawConfirmPremium: body.confirmPremium,
      at: Date.now()
    };
    wevoMock.lastAuthorize = call;
    wevoMock.authorizeCalls.push(call);
    if (!confirmPremium) {
      // אישור מראש לזול — נשארים בממתין / תור, בלי מעבר לטעינה בשיא
      wevoMock.scenario = "wait-auth";
      const state = mockWevoWaitAuthState();
      return {
        ok: true,
        authorized: true,
        premiumConfirmed: false,
        waitingAuthorize: true,
        state
      };
    }
    wevoMock.scenario = "charging";
    return {
      ok: true,
      authorized: true,
      premiumConfirmed: true,
      waitingAuthorize: false,
      state: mockWevoChargingState()
    };
  }
  if (action === "sync") {
    return {
      ok: true,
      user: mockWevoUser(),
      transactions: [
        {
          transactionId: 999001,
          totalEnergyKwh: 12.5,
          totalCost: 18.4,
          electricityCost: 12.1,
          plugInTime: new Date(Date.now() - 86400000).toISOString(),
          stopReason: "Remote"
        }
      ],
      merged: 0,
      pendingApprove: []
    };
  }
  if (action === "inspect") {
    return { ok: true, report: { verdict: "no_identity" } };
  }
  return { ok: true, action };
}

function handleMockDataSync(body) {
  const action = String(body.action || "status");
  if (action === "status") {
    return { ok: true, configured: cloudStore.configured, updatedAt: cloudStore.updatedAt };
  }
  if (action === "setup") {
    const pin = String(body.pin || "");
    if (pin.length < 4) return { error: "PIN קצר מדי" };
    cloudStore.configured = true;
    cloudStore.pinHash = `mock:${pin}`;
    cloudStore.updatedAt = Date.now();
    return { ok: true, configured: true, updatedAt: cloudStore.updatedAt };
  }
  if (action === "save") {
    cloudStore.data = body.data || null;
    cloudStore.updatedAt = Date.now();
    cloudStore.configured = true;
    return { ok: true, updatedAt: cloudStore.updatedAt };
  }
  if (action === "load") {
    return {
      ok: true,
      data: cloudStore.data,
      updatedAt: cloudStore.updatedAt
    };
  }
  return { error: `unknown action ${action}` };
}

function loadHandler() {
  delete require.cache[fnPath];
  return require(fnPath).handler;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    send(res, 204, "", {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
    });
    return;
  }

  if (
    url.pathname === "/api/wevo-sync" ||
    url.pathname === "/.netlify/functions/wevo-sync"
  ) {
    const body = await readBody(req);
    if (MOCK) {
      json(res, 200, handleMockWevo(body));
      return;
    }
    try {
      const handler = loadHandler();
      const out = await handler({
        httpMethod: req.method,
        headers: req.headers,
        body: JSON.stringify(body)
      });
      send(res, out.statusCode, out.body || "", out.headers || {});
    } catch (e) {
      json(res, 500, { error: e.message, stack: e.stack });
    }
    return;
  }

  if (
    url.pathname === "/api/data-sync" ||
    url.pathname === "/.netlify/functions/data-sync"
  ) {
    const body = await readBody(req);
    if (MOCK) {
      const out = handleMockDataSync(body);
      json(res, out.error ? 400 : 200, out);
      return;
    }
    json(res, 404, { error: "data-sync unavailable without E2E_MOCK=1" });
    return;
  }

  if (url.pathname === "/__e2e/reset-cloud") {
    cloudStore = { configured: false, pinHash: null, data: null, updatedAt: null };
    json(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/__e2e/wevo-mock") {
    if (req.method === "POST") {
      const body = await readBody(req);
      if (body.scenario === "charging" || body.scenario === "wait-auth") {
        wevoMock.scenario = body.scenario;
      }
      if (body.resetAuthorize) {
        wevoMock.lastAuthorize = null;
        wevoMock.authorizeCalls = [];
      }
      json(res, 200, {
        ok: true,
        scenario: wevoMock.scenario,
        authorizeCalls: wevoMock.authorizeCalls.length
      });
      return;
    }
    json(res, 200, {
      ok: true,
      scenario: wevoMock.scenario,
      lastAuthorize: wevoMock.lastAuthorize,
      authorizeCalls: wevoMock.authorizeCalls
    });
    return;
  }

  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = path.normalize(path.join(root, filePath));
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(res, 404, "Not found");
    return;
  }
  const ext = path.extname(filePath);
  send(res, 200, fs.readFileSync(filePath), {
    "Content-Type": MIME[ext] || "application/octet-stream"
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`E2E server${MOCK ? " (MOCK)" : ""}: http://127.0.0.1:${PORT}/`);
});
