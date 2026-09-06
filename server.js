#!/usr/bin/env node
/**
 * Tiny static server for the payload calculator.
 * HTTP/1.1 on 0.0.0.0 so Cursor can port-forward Preview.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const requested = path.normalize(urlPath === "/" ? "/index.html" : urlPath);
  let filePath = path.join(ROOT, requested);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      try {
        data = fs.readFileSync(path.join(ROOT, "index.html"));
        filePath = path.join(ROOT, "index.html");
      } catch (readErr) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Motorhome Payload Calculator ready");
  console.log(`  Local:   http://localhost:${PORT}/`);
  console.log(`  Network: http://127.0.0.1:${PORT}/`);
});
