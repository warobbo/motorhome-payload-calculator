"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const handleLookup = require("../api/vehicle-lookup");

const ORIGIN = "https://motorhomepayload.co.uk";
const SECRET = "test-dvla-key";
const MOT_SECRET = "test-mot-key";

let worker;

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader: function (key, value) { this.headers[key] = value; },
    end: function (text) { this.body = text || ""; }
  };
}

function nodeReq(method, body, url) {
  const raw = body === undefined ? "" : (typeof body === "string" ? body : JSON.stringify(body));
  const chunks = raw ? [Buffer.from(raw)] : [];
  return {
    method: method,
    url: url || "/api/vehicle-lookup",
    headers: {},
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

function workerRequest(method, body, headers, url) {
  const init = { method: method, headers: headers || {} };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    init.headers = Object.assign({ "Content-Type": "application/json" }, headers || {});
  }
  return new Request(url || "https://lookup.example/api/vehicle-lookup", init);
}

describe("vehicle-lookup worker", function () {
  const logs = [];
  let previousLog;
  let previousFetch;
  let savedDvla;
  let savedMot;
  const fetches = [];

  beforeEach(async function () {
    logs.length = 0;
    fetches.length = 0;
    savedDvla = process.env.DVLA_API_KEY;
    savedMot = process.env.MOT_API_KEY;
    delete process.env.DVLA_API_KEY;
    delete process.env.MOT_API_KEY;
    previousLog = console.log;
    previousFetch = global.fetch;
    console.log = function () {
      logs.push(Array.prototype.join.call(arguments, " "));
    };
    global.fetch = async function () {
      throw new Error("unexpected fetch");
    };
    if (!worker) worker = await import("../worker/src/index.js");
    worker.resetVehicleLookupRateLimit();
  });

  afterEach(function () {
    console.log = previousLog;
    global.fetch = previousFetch;
    if (savedDvla == null) delete process.env.DVLA_API_KEY;
    else process.env.DVLA_API_KEY = savedDvla;
    if (savedMot == null) delete process.env.MOT_API_KEY;
    else process.env.MOT_API_KEY = savedMot;
  });

  function installFetch(handler) {
    global.fetch = async function (url, init) {
      fetches.push({ url: String(url), init: init });
      return handler(String(url), init);
    };
  }

  async function callWorker(method, body, env, headers, url) {
    const response = await worker.handleVehicleLookup(
      workerRequest(method, body, headers, url),
      env || {}
    );
    const text = await response.text();
    return {
      status: response.status,
      text: text,
      allowOrigin: response.headers.get("Access-Control-Allow-Origin"),
      allowHeaders: response.headers.get("Access-Control-Allow-Headers")
    };
  }

  async function pair(method, body, env, url) {
    if (env && env.DVLA_API_KEY) process.env.DVLA_API_KEY = env.DVLA_API_KEY;
    else delete process.env.DVLA_API_KEY;
    if (env && env.MOT_API_KEY) process.env.MOT_API_KEY = env.MOT_API_KEY;
    else delete process.env.MOT_API_KEY;
    const nodeRes = mockRes();
    await handleLookup(nodeReq(method, body, url), nodeRes);
    const edge = await callWorker(method, body, env, {}, url && ("https://lookup.example" + url));
    return { nodeRes: nodeRes, edge: edge };
  }

  function assertSame(nodeRes, edge, label) {
    assert.equal(edge.status, nodeRes.statusCode, label || "status");
    assert.equal(edge.text, nodeRes.body, label || "body");
    assert.equal(edge.text.includes(SECRET), false);
    assert.equal(edge.text.includes(MOT_SECRET), false);
  }

  it("imports the shared lookup modules", function () {
    const src = fs.readFileSync(path.join(__dirname, "../worker/src/index.js"), "utf8");
    assert.match(src, /import catalogue from "\.\.\/\.\.\/lib\/van-catalogue\.js"/);
    assert.match(src, /import lookup from "\.\.\/\.\.\/lib\/vehicle-lookup\.js"/);
    assert.equal(src.includes("createRequire"), false);
    assert.match(src, /DVLA_API_KEY/);
    assert.doesNotMatch(src, /DVLA_API_KEY\s*[:=]\s*["'][^"']+["']/);
    const toml = fs.readFileSync(path.join(__dirname, "../worker/wrangler.toml"), "utf8");
    assert.equal(/DVLA_API_KEY\s*=/.test(toml), false);
    assert.equal(/MOT_API_KEY\s*=/.test(toml), false);
    const migration = fs.readFileSync(path.join(__dirname, "../MIGRATION.md"), "utf8");
    assert.match(migration, /npx wrangler secret put DVLA_API_KEY/);
    const nodeSrc = fs.readFileSync(path.join(__dirname, "../api/vehicle-lookup.js"), "utf8");
    assert.match(nodeSrc, /Access-Control-Allow-Origin", "\*"/);
  });

  it("matches the Node route for demo plates, catalogue, and empty queries", async function () {
    const demo = await pair("POST", { registrationNumber: "demo 3500" });
    assertSame(demo.nodeRes, demo.edge, "demo");
    assert.equal(JSON.parse(demo.edge.text).vehicle.source, "demo");
    assert.equal(JSON.parse(demo.edge.text).vehicle.typicalMiro, 3080);

    const catalogue = await pair("POST", { make: "Fiat", model: "Ducato", year: 2018 });
    assertSame(catalogue.nodeRes, catalogue.edge, "catalogue");
    assert.equal(JSON.parse(catalogue.edge.text).vehicle.source, "catalogue");
    assert.equal(JSON.parse(catalogue.edge.text).vehicle.miroAvailable, true);

    const missing = await pair("POST", {});
    assertSame(missing.nodeRes, missing.edge, "missing");
    assert.equal(missing.edge.status, 400);

    const health = await pair("GET");
    assertSame(health.nodeRes, health.edge, "health");
    assert.equal(JSON.parse(health.edge.text).liveDvla, false);

    const nokey = await pair("POST", { registrationNumber: "AB12CDE" });
    assertSame(nokey.nodeRes, nokey.edge, "nokey");
    assert.equal(nokey.edge.status, 401);
    assert.equal(JSON.parse(nokey.edge.text).error, "no_api_key");
    assert.equal(fetches.length, 0);
  });

  it("reports liveDvla from the Worker secret and never returns the key", async function () {
    const out = await callWorker("GET", undefined, { DVLA_API_KEY: SECRET, MOT_API_KEY: MOT_SECRET });
    const data = JSON.parse(out.text);
    assert.equal(out.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.liveDvla, true);
    assert.ok(data.demoPlates.includes("DEMO3500"));
    assert.equal(out.text.includes(SECRET), false);
    assert.equal(out.text.includes(MOT_SECRET), false);
    assert.equal(logs.some(function (line) { return line.includes(SECRET) || line.includes(MOT_SECRET); }), false);
    assert.equal(fetches.length, 0);
  });

  it("matches Node DVLA statuses and keeps catalogue weights off a live record", async function () {
    const cases = [
      { status: 404, error: "not_found", http: 404 },
      { status: 400, error: "invalid_vrm", http: 400 },
      { status: 401, error: "bad_api_key", http: 401 },
      { status: 403, error: "bad_api_key", http: 401 },
      { status: 503, error: "dvla_error", http: 502 }
    ];
    for (const item of cases) {
      fetches.length = 0;
      installFetch(function () {
        return new Response("", { status: item.status });
      });
      const out = await pair("POST", { registrationNumber: "AB12 CDE" }, { DVLA_API_KEY: SECRET });
      assertSame(out.nodeRes, out.edge, "dvla " + item.status);
      assert.equal(out.edge.status, item.http);
      assert.equal(JSON.parse(out.edge.text).error, item.error);
      assert.equal(fetches[0].init.headers["x-api-key"], SECRET);
      assert.equal(out.edge.text.includes(SECRET), false);
    }

    installFetch(function (url) {
      if (url.indexOf("mot-tests") !== -1) {
        return new Response(JSON.stringify([{ model: "DUCATO" }]), { status: 200 });
      }
      return new Response(JSON.stringify({
        registrationNumber: "AB12CDE",
        make: "HYMER",
        yearOfManufacture: 2024,
        revenueWeight: 4430
      }), { status: 200 });
    });
    const live = await pair("POST", { registrationNumber: "AB12CDE" }, {
      DVLA_API_KEY: SECRET,
      MOT_API_KEY: MOT_SECRET
    });
    assertSame(live.nodeRes, live.edge, "hymer");
    const vehicle = JSON.parse(live.edge.text).vehicle;
    assert.equal(vehicle.source, "dvla");
    assert.equal(vehicle.model, "");
    assert.equal(vehicle.miroAvailable, false);
    assert.equal(vehicle.typicalMiro, undefined);
    assert.equal(vehicle.revenueWeight, 4430);
  });

  it("uses a caller key in front of the Worker secret", async function () {
    installFetch(function () {
      return new Response("", { status: 404 });
    });
    const out = await callWorker("POST", {
      registrationNumber: "AB12CDE",
      apiKey: "caller-key"
    }, { DVLA_API_KEY: SECRET });
    assert.equal(out.status, 404);
    assert.equal(fetches[0].init.headers["x-api-key"], "caller-key");
    assert.equal(out.text.includes(SECRET), false);
    assert.equal(out.text.includes("caller-key"), false);
  });

  it("matches Node for invalid JSON, the wrong method, and a GET plate", async function () {
    const bad = await pair("POST", "{");
    assertSame(bad.nodeRes, bad.edge, "json");
    assert.equal(bad.edge.status, 400);
    assert.equal(JSON.parse(bad.edge.text).error, "invalid_json");

    const method = await pair("PUT", { registrationNumber: "DEMO3500" });
    assertSame(method.nodeRes, method.edge, "method");
    assert.equal(method.edge.status, 405);

    const viaGet = await pair("GET", undefined, {}, "/api/vehicle-lookup?vrm=DEMO3500");
    assertSame(viaGet.nodeRes, viaGet.edge, "get");
    assert.equal(JSON.parse(viaGet.edge.text).vehicle.registrationNumber, "DEMO3500");
  });

  it("allows CORS only from the public site", async function () {
    assert.equal(worker.LOOKUP_ORIGIN, ORIGIN);
    const ok = await callWorker("POST", { registrationNumber: "DEMO3500" }, {}, {
      Origin: ORIGIN
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.allowOrigin, ORIGIN);
    assert.equal(ok.allowHeaders, "Content-Type, x-api-key, x-mot-api-key");
    assert.equal(ok.text.includes("*"), false);

    const blocked = [
      "https://evil.example",
      "https://www.motorhomepayload.co.uk",
      "http://motorhomepayload.co.uk",
      "https://motorhomepayload.co.uk.evil.example",
      "https://motorhomepayload.co.uk/"
    ];
    for (const origin of blocked) {
      const out = await callWorker("POST", { registrationNumber: "AB12CDE" }, {
        DVLA_API_KEY: SECRET
      }, { Origin: origin });
      assert.equal(out.status, 403, origin);
      assert.equal(out.allowOrigin, null, origin);
      assert.equal(JSON.parse(out.text).error, "origin");
    }
    assert.equal(fetches.length, 0);

    const preflight = await worker.handleVehicleLookup(workerRequest("OPTIONS", undefined, {
      Origin: ORIGIN
    }), {});
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), ORIGIN);

    const foreignPreflight = await worker.handleVehicleLookup(workerRequest("OPTIONS", undefined, {
      Origin: "https://evil.example"
    }), {});
    assert.equal(foreignPreflight.status, 403);
    assert.equal(foreignPreflight.headers.get("Access-Control-Allow-Origin"), null);

    const noOrigin = await callWorker("GET");
    assert.equal(noOrigin.status, 200);
    assert.equal(noOrigin.allowOrigin, null);
  });

  it("rate limits each IP and still answers a health check", async function () {
    const headers = { "cf-connecting-ip": "203.0.113.44", Origin: ORIGIN };
    for (let i = 0; i < 40; i += 1) {
      const health = await callWorker("GET", undefined, { DVLA_API_KEY: SECRET }, headers);
      assert.equal(health.status, 200, "health " + i);
      assert.equal(health.text.includes(SECRET), false);
    }
    for (let i = 0; i < worker.LOOKUP_RATE_MAX; i += 1) {
      const out = await callWorker("POST", { registrationNumber: "DEMO3500" }, {}, headers);
      assert.equal(out.status, 200, "allowed " + i);
    }
    const limited = await callWorker("POST", { registrationNumber: "DEMO3500" }, {}, headers);
    assert.equal(limited.status, 429);
    assert.equal(JSON.parse(limited.text).error, "rate");
    assert.equal(limited.allowOrigin, ORIGIN);

    const other = await callWorker("POST", { registrationNumber: "DEMO3500" }, {}, {
      "cf-connecting-ip": "203.0.113.45"
    });
    assert.equal(other.status, 200);

    worker.resetVehicleLookupRateLimit();
    const stamp = "203.0.113.46";
    for (let i = 0; i < worker.LOOKUP_RATE_MAX; i += 1) {
      assert.equal(worker.allowVehicleLookup(stamp, 1_000), true);
    }
    assert.equal(worker.allowVehicleLookup(stamp, 1_000), false);
    assert.equal(worker.allowVehicleLookup(stamp, 1_000 + worker.LOOKUP_WINDOW_MS), true);
  });

  it("routes lookup and missing-size on the same Worker", async function () {
    const capture = await worker.default.fetch(new Request("https://lookup.example/"));
    assert.equal(capture.status, 200);
    assert.equal(await capture.text(), "{\"ok\":true,\"capture\":true}");

    const lookupRes = await worker.default.fetch(new Request("https://lookup.example/api/vehicle-lookup"));
    const data = JSON.parse(await lookupRes.text());
    assert.equal(data.ok, true);
    assert.equal(data.liveDvla, false);
    assert.ok(data.demoPlates.includes("DEMO3500"));

    const slashed = await worker.default.fetch(new Request("https://lookup.example/api/vehicle-lookup/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ make: "Fiat", model: "Ducato", year: 2018 })
    }));
    assert.equal(slashed.status, 200);
    assert.equal(JSON.parse(await slashed.text()).vehicle.typicalLabel, "Fiat Ducato X290 3.5t");

    const note = await worker.default.fetch(new Request("https://lookup.example/api/missing-size", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }));
    assert.equal(note.status, 400);
    assert.equal(JSON.parse(await note.text()).error, "need-size");
  });
});
