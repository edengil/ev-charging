import fs from "fs";

const p = "app-source.js";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("/** יצרני רכב נפוצים");
const end = s.indexOf("const METHODS = {");
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}

const replacement = fs.readFileSync(new URL("./car-brands-snippet.js", import.meta.url), "utf8");
s = s.slice(0, start) + replacement + "\n" + s.slice(end);
fs.writeFileSync(p, s);
console.log("patched", replacement.length);
