import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "brand", "cars");
fs.mkdirSync(dir, { recursive: true });

function fetch(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 EV-Charge-Manager/1.0" },
      timeout: 30000
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`${url} -> ${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 80) return reject(new Error("too small"));
        fs.writeFileSync(dest, buf);
        resolve(buf.length);
      });
    });
    req.on("error", reject);
  });
}

const colors = {
  tesla: "#CC0000",
  hyundai: "#002C5F",
  kia: "#05141F",
  bmw: "#1C69D4",
  mercedes: "#333333",
  audi: "#000000",
  toyota: "#EB0A1E",
  nissan: "#C3002F",
  ford: "#003478",
  volvo: "#003057",
  peugeot: "#000000",
  renault: "#FFCC33",
  vw: "#1A1F71",
  skoda: "#4BA82E",
  polestar: "#000000",
  chevrolet: "#D4A017",
  mg: "#A21017",
  cupra: "#1A1A1A"
};

async function main() {
  const extras = [
    ["geely", "https://upload.wikimedia.org/wikipedia/commons/8/8a/Geely_Auto_2023.svg"],
    ["geely", "https://upload.wikimedia.org/wikipedia/commons/d/d5/Geely_Logo_2022.svg"],
    ["geometry", "https://upload.wikimedia.org/wikipedia/commons/4/4e/Geometry_2019.svg"],
    ["byd", "https://upload.wikimedia.org/wikipedia/commons/e/e2/BYD_Auto_2022_logo.svg"]
  ];
  for (const [id, url] of extras) {
    const dest = path.join(dir, `${id}.svg`);
    if (id !== "byd" && fs.existsSync(dest) && fs.statSync(dest).size > 200) {
      console.log("skip existing", id);
      continue;
    }
    try {
      const n = await fetch(url, dest);
      console.log("OK", id, n);
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log("FAIL", id, e.message);
    }
  }

  for (const [id, color] of Object.entries(colors)) {
    const f = path.join(dir, `${id}.svg`);
    if (!fs.existsSync(f)) continue;
    let s = fs.readFileSync(f, "utf8");
    if (s.includes("BYD") || s.includes("d70c19")) continue; // keep official BYD colors
    s = s.replace(/fill="currentColor"/g, `fill="${color}"`);
    s = s.replace(/<path /g, (m, offset, str) => {
      const slice = str.slice(offset, offset + 80);
      if (/fill=/.test(slice)) return m;
      return `<path fill="${color}" `;
    });
    if (!/fill=/.test(s.slice(0, 200))) {
      s = s.replace(/<svg\b/, `<svg fill="${color}"`);
    }
    fs.writeFileSync(f, s);
    console.log("colored", id);
  }

  console.log("---");
  for (const name of fs.readdirSync(dir).sort()) {
    console.log(name, fs.statSync(path.join(dir, name)).size);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
