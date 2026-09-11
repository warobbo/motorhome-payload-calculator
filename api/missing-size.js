"use strict";

const missing = require("../lib/missing-size");

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.end(JSON.stringify(body));
}

function clientKey(req) {
  const forwarded = String(req.headers && req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket && req.socket.remoteAddress || "anon";
}

async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) {
      const err = new Error("too_large");
      err.code = "too_large";
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleMissingSize(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  if (req.method === "GET") {
    const email = missing.notifyEmail();
    send(res, 200, {
      ok: true,
      mailto: email || null,
      capture: true
    });
    return;
  }

  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "method", message: "Use POST to send a missing size." });
    return;
  }

  if (!missing.allowSubmit(clientKey(req))) {
    send(res, 429, { ok: false, error: "rate", message: "Please wait before sending another size." });
    return;
  }

  let body = {};
  try {
    body = await readJson(req);
  } catch (err) {
    if (err && err.code === "too_large") {
      send(res, 413, { ok: false, error: "too_large", message: "That note is too long." });
      return;
    }
    send(res, 400, { ok: false, error: "invalid_json", message: "Invalid JSON body." });
    return;
  }

  const built = missing.buildRecord(body);
  if (!built.ok) {
    send(res, 400, { ok: false, error: built.error, message: built.message });
    return;
  }
  if (built.ignored) {
    send(res, 200, { ok: true, ignored: true });
    return;
  }

  missing.persistRecord(built.record);
  send(res, 200, {
    ok: true,
    saved: true,
    mailto: missing.notifyEmail() || null
  });
}

module.exports = handleMissingSize;
