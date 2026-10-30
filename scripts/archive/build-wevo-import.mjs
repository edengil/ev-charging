/**
 * Builds a starter import JSON from live Wevo + neighbor client stubs.
 * Note: full neighbor assignments lived in wevo_merged_import.json (not in files.zip).
 * Run: WEVO_PASSWORD=... node scripts/build-wevo-import.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handler } = require("../netlify/functions/wevo-sync.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../data/wevo_live_import.json");

const email = process.env.WEVO_EMAIL || "edengil94@gmail.com";
const password = process.env.WEVO_PASSWORD || "";
if (!password) {
  console.error("Set WEVO_PASSWORD");
  process.exit(1);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toLocalDT(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

const event = {
  httpMethod: "POST",
  body: JSON.stringify({ email, password, action: "sync" })
};
const res = await handler(event);
const data = JSON.parse(res.body || "{}");
if (!data.ok) {
  console.error(data);
  process.exit(1);
}

const edenId = uid();
const neighborNames = [
  "מתן גמליאל שכן",
  "ליאור מנעולן שכן",
  "סיימון 2203 שכן",
  "עידן 2301 שכן",
  "שלו שכן 1401",
  "יאיר ברדה שכן",
  "משה"
];

const clients = [
  {
    id: edenId,
    name: "עדן (עצמי) 🔒",
    phone: "",
    notes: "אשראי Wevo — ללא חוב",
    self: true
  },
  ...neighborNames.map(name => ({
    id: uid(),
    name,
    phone: "",
    notes: "ממתין לשיוך מ-wevo_merged_import אם יישלח"
  }))
];

const INFLATION = 1.21;
const sessions = (data.transactions || [])
  .filter(t => t && !t.isOngoing && Number(t.totalEnergyKwh) > 0)
  .map(t => {
    const kwh = Number(t.totalEnergyKwh) || 0;
    const cost = Math.round(Number(t.totalCost) * 100) / 100;
    const start = toLocalDT(new Date(t.plugInTime));
    const durMin = t.netDuration > 0 ? Math.round(Number(t.netDuration) / 60) : 0;
    return {
      id: uid(),
      clientId: edenId,
      date: start,
      kwhRaw: kwh,
      kwhInflated: Math.round(kwh * INFLATION),
      premiumRatio: 0,
      isMixed: false,
      rate: kwh ? Math.round((cost / kwh) * 1000) / 1000 : 0,
      amountBilled: cost,
      costToOwner: cost,
      profit: 0,
      rateLabel: "Wevo",
      source: "wevo-sync",
      notes: `txn#${t.transactionId}`,
      durMin,
      electricityCost: Math.round(Number(t.electricityCost || 0) * 100) / 100
    };
  });

const payload = {
  clients,
  sessions,
  payments: [],
  openSess: [],
  config: {
    ratePremium: 2.98,
    rateRegular: 1.47,
    ownerPeak: 2.08,
    ownerOff: 0.87
  },
  meta: {
    builtAt: new Date().toISOString(),
    source: "live Wevo /rest/transactions",
    note: "שיוכי שכנים המלאים היו ב-wevo_merged_import.json שלא צורף ל-files.zip. טעינות כרגע תחת עדן (עצמי) ללא חוב."
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(`Wrote ${outPath}`);
console.log(`clients=${clients.length} sessions=${sessions.length}`);
