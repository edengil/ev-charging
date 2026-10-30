// שער באנדל (ביקורת 30.10, גל 5): כל export של ספריות ה־lib שהקוד ב־src קורא לו
// חשוף או דרך globalThis חייב להופיע גם באובייקט ההחזרה של ה־IIFE ב־inject וגם
// ברשימת ה־var הגלובלית — אחרת הקריאה קורסת ב־ReferenceError רק בזמן ריצה
// (isSelfClient ו־isWaitingForAuthorize נשברו בדיוק כך; בדיקות היחידה של
// הספריות עצמן לא רואות את זה כי הן מייבאות את המודולים ישירות).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const LIB_FILES = [
  "lib/ev-money-core.mjs",
  "lib/ev-payments.mjs",
  "lib/ev-policy.mjs",
  "lib/ev-opens.mjs",
  "lib/ev-timeline.mjs",
  "lib/ev-matching.mjs",
  "lib/ev-misc.mjs",
  "lib/ev-idle.mjs",
  "lib/ev-tariff.mjs"
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function collectSrc(dir, out = []) {
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) collectSrc(rel, out);
    else if (ent.name.endsWith(".js")) out.push(read(rel));
  }
  return out;
}

test("כל export של lib שנקרא מ־src חשוף כגלובל בבאנדל", () => {
  const inject = read("scripts/inject-app.mjs");

  const returned = new Set();
  for (const m of inject.matchAll(/return \{([\s\S]*?)\n  \};/g)) {
    for (const line of m[1].split("\n")) {
      const t = line.trim().replace(/,$/, "");
      if (!t || t.startsWith("//")) continue;
      const name = t.split(":")[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) returned.add(name);
    }
  }
  const globalized = new Set(
    [...inject.matchAll(/var (\w+) = __\w+__\./g)].map(m => m[1])
  );

  const exports = new Map();
  for (const f of LIB_FILES) {
    for (const m of read(f).matchAll(/export (?:async )?(?:function|const|let|var) (\w+)/g)) {
      exports.set(m[1], f);
    }
  }

  const srcAll = collectSrc("src").join("\n");
  const missing = [];
  for (const [name, file] of exports) {
    const usedGlobal = new RegExp(`globalThis\\.${name}\\b`).test(srcAll);
    const usedBare = new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(srcAll);
    if (!usedGlobal && !usedBare) continue;
    if (!returned.has(name)) missing.push(`${name} (${file}): חסר באובייקט ההחזרה של inject`);
    else if (!globalized.has(name)) missing.push(`${name} (${file}): חסר ברשימת ה־var הגלובלית של inject`);
  }
  assert.deepEqual(missing, []);
});

test("M37: כל קובץ במניפסט נפתח בבלוק הערה תקין שהחיתוך מסיר במלואו", () => {
  const manifest = JSON.parse(read("src/manifest.json"));
  const bad = [];
  for (const rel of manifest.order) {
    const txt = read(rel);
    if (!txt.startsWith("/**")) {
      bad.push(`${rel}: לא נפתח בבלוק הערה`);
      continue;
    }
    const stripped = txt.replace(/^\/\*[\s\S]*?\*\/\n?/, "");
    const firstLine = stripped.split("\n").find(l => l.trim() !== "") || "";
    if (firstLine.trim().startsWith("*") || firstLine.includes("*/")) {
      bad.push(`${rel}: שארית הערה אחרי החיתוך`);
    }
  }
  assert.deepEqual(bad, []);
});
