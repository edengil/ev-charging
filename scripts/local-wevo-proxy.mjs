/**
 * Local stand-in for Netlify Function wevo-sync.
 * Run: npm start
 * Then open http://127.0.0.1:8787/
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
const PORT = 8787;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function loadHandler() {
  delete require.cache[fnPath];
  return require(fnPath).handler;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/.netlify/functions/wevo-sync" || url.pathname === "/api/wevo-sync") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks).toString("utf8");
    const event = { httpMethod: req.method, headers: req.headers, body };
    try {
      const handler = loadHandler();
      const out = await handler(event);
      send(res, out.statusCode, out.body || "", out.headers || {});
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message, stack: e.stack }), {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
    }
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
  console.log(`EV Charge + Wevo proxy: http://127.0.0.1:${PORT}/`);
});
