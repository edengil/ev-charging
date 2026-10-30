import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";

// H13 (ביקורת 30.10): מנוע הביצוע של Wevo בשרת (handleWevoRequest והדיספצ'ר)
// לא רץ באף בדיקה — ה־e2e מחליף את /api/wevo-sync במוק אינליין. כאן מריצים
// את פונקציית הייצור עצמה עם fetch ו־WebSocket מדומים מתוסרטים.
const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const dir = mkdtempSync(join(tmpdir(), "ev-wevo-engine-"));
writeFileSync(join(dir, "wevo.mjs"), readFileSync(join(root, "functions/_shared/wevo.js"), "utf8"));
const wevo = await import(pathToFileURL(join(dir, "wevo.mjs")).href);
rmSync(dir, { recursive: true, force: true });

const { handleWevoRequest, wsCommand, COGNITO_URL, API_BASE } = wevo;

const CHARGER = "TACW2242722G1263";
const USER_RAW = {
  email: "eden@example.com",
  firstName: "עדן",
  lastName: "גיל",
  chargerIdentifier: CHARGER,
  connector: 1,
  homeCharger: true
};
const CREDS = { email: "eden@example.com", password: "pw-123456" };

class FakeWS {
  static instances = [];
  constructor(script) {
    this.sent = [];
    this.listeners = {};
    this.script = script;
    this.closed = false;
    FakeWS.instances.push(this);
  }
  accept() {}
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  send(data) {
    if (this.closed) return;
    const payload = JSON.parse(data);
    this.sent.push(payload);
    const reply = this.script ? this.script(payload, this) : null;
    if (reply) {
      const replies = Array.isArray(reply) ? reply : [reply];
      for (const r of replies) {
        queueMicrotask(() => {
          if (!this.closed) this.emit("message", { data: JSON.stringify(r) });
        });
      }
    }
  }
  emit(type, ev) {
    (this.listeners[type] || []).forEach(fn => fn(ev));
  }
  close() {
    this.closed = true;
  }
}

const jsonRes = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

let fetchCalls = [];
let router = null;
const realFetch = globalThis.fetch;

function installFetch(opts = {}) {
  const {
    cognitoFail = false,
    transactions = [],
    transactionsStatus = 200,
    wsScript = null,
    tariffJson = { kind: "fixed" }
  } = opts;
  fetchCalls = [];
  FakeWS.instances = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    fetchCalls.push({ url: u, init });
    if (u === COGNITO_URL) {
      if (cognitoFail) {
        return jsonRes({ message: "Incorrect username or password.", __type: "NotAuthorizedException" }, 400);
      }
      return jsonRes({ AuthenticationResult: { AccessToken: "tok-1", IdToken: "id-1" } });
    }
    if (u.startsWith(`${API_BASE}/rest/user/details`)) return jsonRes(USER_RAW);
    if (u.startsWith(`${API_BASE}/rest/transactions`)) {
      if (transactionsStatus !== 200) return new Response("boom", { status: transactionsStatus });
      return jsonRes(transactions);
    }
    if (u.startsWith(`${API_BASE}/rest/charger/`)) return jsonRes(tariffJson);
    if (u === `${API_BASE}/ws`) {
      return { status: 101, webSocket: new FakeWS(wsScript) };
    }
    throw new Error("fetch לא צפוי בבדיקת מנוע: " + u);
  };
}

beforeEach(() => installFetch());
afterEach(() => {
  globalThis.fetch = realFetch;
});

const stateReply = (state, txExtra = {}) => ({
  chargerIdentifier: CHARGER,
  state,
  transactionData: { transactionId: 777, plugInTime: Math.floor(Date.now() / 1000) - 600, totalEnergyKwh: 5, ...txExtra }
});

describe("handleWevoRequest — שערים ושגיאות", () => {
  it("חסרים אימייל/סיסמה → 400 בלי שום קריאת רשת", async () => {
    await assert.rejects(handleWevoRequest({ action: "sync" }), e => e.status === 400);
    assert.equal(fetchCalls.length, 0);
  });
  it("פעולה לא מוכרת → 400", async () => {
    await assert.rejects(handleWevoRequest({ ...CREDS, action: "bogus" }), e => e.status === 400);
  });
  it("כשל Cognito → 401 אחרי שני ניסיונות username, עם צורת בקשה נכונה", async () => {
    installFetch({ cognitoFail: true });
    await assert.rejects(handleWevoRequest({ ...CREDS, action: "sync" }), e => e.status === 401 && /Incorrect/.test(e.message));
    const cog = fetchCalls.filter(c => c.url === COGNITO_URL);
    assert.equal(cog.length, 2);
    const first = JSON.parse(cog[0].init.body);
    assert.equal(first.AuthFlow, "USER_PASSWORD_AUTH");
    assert.equal(first.AuthParameters.USERNAME, "wevo/eden@example.com");
    assert.equal(first.AuthParameters.PASSWORD, "pw-123456");
    assert.ok(first.ClientId);
    assert.equal(JSON.parse(cog[1].init.body).AuthParameters.USERNAME, "eden@example.com");
  });
  it("כשל בשליפת טרנזקציות → 502", async () => {
    installFetch({ transactionsStatus: 500 });
    await assert.rejects(handleWevoRequest({ ...CREDS, action: "sync" }), e => e.status === 502);
  });
});

describe("handleWevoRequest — sync / tariff", () => {
  it("sync מחזיר טרנזקציות ומשתמש מסוכם; כותרת Bearer על קריאות ה־API", async () => {
    const txs = [{ transactionId: 1 }, { transactionId: 2 }];
    installFetch({ transactions: txs });
    const r = await handleWevoRequest({ ...CREDS, action: "sync" });
    assert.equal(r.ok, true);
    assert.equal(r.count, 2);
    assert.deepEqual(r.transactions, txs);
    assert.equal(r.user.chargerIdentifier, CHARGER);
    const txCall = fetchCalls.find(c => c.url.includes("/rest/transactions"));
    assert.equal(txCall.init.headers.Authorization, "Bearer tok-1");
  });
  it("tariff מחזיר את שני קצוות התעריף עם סטטוס ו־json", async () => {
    installFetch({ tariffJson: { tariff: "variable" } });
    const r = await handleWevoRequest({ ...CREDS, action: "tariff" });
    assert.equal(r.ok, true);
    assert.equal(r.tariff.rateDetails.status, 200);
    assert.deepEqual(r.tariff.rateDetails.json, { tariff: "variable" });
    assert.equal(r.tariff.variableRanges.status, 200);
  });
});

describe("handleWevoRequest — state דרך WebSocket", () => {
  it("מצב Charging מנורמל עם העסקה החיה", async () => {
    const ongoing = { transactionId: 777, isOngoing: true, plugInTime: Math.floor(Date.now() / 1000) - 600, totalEnergyKwh: 5, totalCost: 9.5 };
    installFetch({
      transactions: [ongoing],
      wsScript: payload => (payload.command === "getState" ? stateReply("Charging") : null)
    });
    const r = await handleWevoRequest({ ...CREDS, action: "state" });
    assert.equal(r.state.state, "Charging");
    assert.equal(r.state.charging, true);
    assert.equal(r.state.connected, true);
    assert.equal(r.state.transactionId, 777);
    assert.equal(r.state.totalEnergyKwh, 5);
    const ws = FakeWS.instances[0];
    assert.deepEqual(ws.sent[0], { command: "getState", chargerIdentifier: CHARGER, connector: "1" });
  });
  it("הודעה בלי state לא פותרת getState — מחכים לדגימת עמדה", async () => {
    installFetch({
      wsScript: payload =>
        payload.command === "getState" ? [{ chargerIdentifier: CHARGER }, stateReply("Available")] : null
    });
    const r = await handleWevoRequest({ ...CREDS, action: "state" });
    assert.equal(r.state.state, "Available");
    assert.equal(r.state.connected, false);
  });
});

describe("wsCommand — סינון וטיימאאוט", () => {
  it("מדלג על הודעות של מטען אחר", async () => {
    installFetch({
      wsScript: () => [
        { chargerIdentifier: "OTHER", state: "Charging" },
        { chargerIdentifier: CHARGER, state: "Available" }
      ]
    });
    const out = await wsCommand("tok-1", { command: "getState", chargerIdentifier: CHARGER, connector: "1" }, { matchCharger: CHARGER, timeoutMs: 2000 });
    assert.equal(out.state, "Available");
  });
  it("אין תגובה → WebSocket timeout", async () => {
    installFetch({ wsScript: () => null });
    await assert.rejects(
      wsCommand("tok-1", { command: "getState", chargerIdentifier: CHARGER, connector: "1" }, { matchCharger: CHARGER, timeoutMs: 60 }),
      /WebSocket timeout/
    );
  });
});

describe("handleWevoRequest — authorize (צורת הבקשה היא הלב של H13)", () => {
  it("confirmPremium=false: authorize יחיד נקי, מצב ממתין נשמר", async () => {
    installFetch({
      wsScript: payload => {
        if (payload.command === "authorize") return stateReply("Preparing");
        if (payload.command === "getState") return stateReply("Preparing");
        return null;
      }
    });
    const r = await handleWevoRequest({ ...CREDS, action: "authorize", confirmPremium: false });
    assert.equal(r.ok, true);
    assert.equal(r.premiumConfirmed, false);
    assert.equal(r.waitingAuthorize, true);
    const authPayloads = FakeWS.instances.flatMap(ws => ws.sent).filter(p => p.command === "authorize");
    assert.equal(authPayloads.length, 1);
    assert.deepEqual(Object.keys(authPayloads[0]).sort(), ["chargerIdentifier", "command", "connector"]);
  });
  it("confirmPremium=true: אישור פרימיום נקי בלי שדות נוספים (בלי boost), טעינה מתחילה", async () => {
    installFetch({
      transactions: [{ transactionId: 777, isOngoing: true, plugInTime: Math.floor(Date.now() / 1000) - 600, totalEnergyKwh: 5 }],
      wsScript: payload => {
        if (payload.command === "authorize") return stateReply("Charging");
        if (payload.command === "getState") return stateReply("Charging");
        return null;
      }
    });
    const r = await handleWevoRequest({ ...CREDS, action: "authorize", confirmPremium: true });
    assert.equal(r.ok, true);
    assert.equal(r.premiumConfirmed, true);
    assert.equal(r.state.charging, true);
    const authPayloads = FakeWS.instances.flatMap(ws => ws.sent).filter(p => p.command === "authorize");
    assert.ok(authPayloads.length >= 1);
    for (const p of authPayloads) {
      assert.deepEqual(Object.keys(p).sort(), ["chargerIdentifier", "command", "connector"]);
      assert.equal(p.chargerIdentifier, CHARGER);
    }
  });
});
