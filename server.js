#!/usr/bin/env node
/**
 * Tiny static server for the payload calculator, plus /api/vehicle-lookup.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const handleLookup = require("./api/vehicle-lookup");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

try {
  const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  envFile.split("\n").forEach(function (line) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  });
} catch (err) {
  /* no .env file — demo plates still work */
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  if (urlPath === "/api/vehicle-lookup") {
    handleLookup(req, res);
    return;
  }

  const requested = path.normalize(
    (urlPath === "/" ? "index.html" : urlPath).replace(/^\/+/, "")
  );
  let filePath = path.join(ROOT, requested);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const baseName = path.basename(filePath);
  if (baseName.startsWith(".") && baseName !== ".") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    };
    if (ext === ".txt" || ext === ".xml") {
      headers["Cache-Control"] = "public, max-age=300";
    } else if (ext === ".png") {
      headers["Cache-Control"] = "public, max-age=86400";
    } else {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Motorhome Payload Calculator ready");
  console.log("  Local:   http://localhost:" + PORT + "/");
  console.log("  Lookup:  POST /api/vehicle-lookup");
  console.log("  DVLA:    " + (process.env.DVLA_API_KEY ? "live key present" : "not configured"));
});
