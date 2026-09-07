"use strict";

const { lookupVehicle, lookupByMakeModelYear, DEMO_PLATES } = require("../lib/vehicle-lookup");

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-mot-api-key");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.end(JSON.stringify(body));
}

async function handleLookup(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-mot-api-key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.end();
    return;
  }

  let vrm = "";
  let make = "";
  let model = "";
  let year = "";
  let apiKey = req.headers["x-api-key"] || "";
  let motApiKey = req.headers["x-mot-api-key"] || "";

  if (req.method === "GET") {
    const url = new URL(req.url, "http://localhost");
    vrm = url.searchParams.get("vrm") || "";
    make = url.searchParams.get("make") || "";
    model = url.searchParams.get("model") || "";
    year = url.searchParams.get("year") || "";
  } else if (req.method === "POST") {
    let body = {};
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch (err) {
        send(res, 400, { ok: false, error: "invalid_json", message: "Invalid JSON body." });
        return;
      }
    }
    vrm = body.registrationNumber || body.vrm || "";
    make = body.make || "";
    model = body.model || "";
    year = body.year || body.yearOfManufacture || "";
    apiKey = body.apiKey || apiKey;
    motApiKey = body.motApiKey || motApiKey;
  } else {
    send(res, 405, { ok: false, error: "method", message: "Use GET or POST." });
    return;
  }

  if (!vrm && !make && !model) {
    send(res, 200, {
      ok: true,
      liveDvla: !!(process.env.DVLA_API_KEY),
      demoPlates: DEMO_PLATES,
    });
    return;
  }

  try {
    const result = vrm
      ? await lookupVehicle({ vrm, apiKey, motApiKey })
      : await lookupByMakeModelYear({ make, model, year });
    send(res, result.status || (result.ok ? 200 : 400), result);
  } catch (err) {
    send(res, 500, {
      ok: false,
      error: "server_error",
      message: "Lookup failed unexpectedly.",
    });
  }
}

module.exports = handleLookup;
module.exports.config = { api: { bodyParser: true } };
