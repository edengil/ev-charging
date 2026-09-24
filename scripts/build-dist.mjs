/**
 * Copy static site assets into dist/ for Cloudflare Pages.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest, filter) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d, filter);
    else if (!filter || filter(name, s)) copyFile(s, d);
  }
}

rmrf(dist);
fs.mkdirSync(dist, { recursive: true });

copyFile(path.join(root, "index.html"), path.join(dist, "index.html"));
const headersSrc = path.join(root, "public", "_headers");
if (fs.existsSync(headersSrc)) {
  copyFile(headersSrc, path.join(dist, "_headers"));
}
const swSrc = path.join(root, "public", "sw.js");
if (fs.existsSync(swSrc)) {
  copyFile(swSrc, path.join(dist, "sw.js"));
}
if (fs.existsSync(path.join(root, "site.webmanifest"))) {
  copyFile(path.join(root, "site.webmanifest"), path.join(dist, "site.webmanifest"));
}
if (fs.existsSync(path.join(root, "icons"))) {
  copyDir(path.join(root, "icons"), path.join(dist, "icons"), name => !name.includes("source"));
}
if (fs.existsSync(path.join(root, "brand"))) {
  copyDir(path.join(root, "brand"), path.join(dist, "brand"));
}

// Ensure SPA-ish fallback isn't needed; add _routes for functions
fs.writeFileSync(
  path.join(dist, "_routes.json"),
  JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      exclude: []
    },
    null,
    2
  )
);

console.log("dist ready:", fs.readdirSync(dist).join(", "));
