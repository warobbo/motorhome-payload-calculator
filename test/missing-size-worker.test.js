"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const missing = require("../lib/missing-size");
const handleNode = require("../api/missing-size");

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

function mockReq(method, body, headers) {
  const raw = body === undefined ? "" : JSON.stringify(body);
  const chunks = raw ? [Buffer.from(raw)] : [];
  return {
    method: method,
    headers: headers || {},
    socket: { remoteAddress: "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

function workerRequest(method, body, headers) {
  const init = { method: method, headers: headers || {} };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = Object.assign({ "Content-Type": "application/json" }, headers || {});
  }
  return new Request("https://missing.example/api/missing-size", init);
}

describe("missing-size worker", function () {
  const logs = [];
  let previousLog;
  let previousFetch;
  const fetches = [];

  beforeEach(async function () {
    missing.resetRateLimit();
    logs.length = 0;
    fetches.length = 0;
    previousLog = console.log;
    previousFetch = global.fetch;
    console.log = function () {
      logs.push(Array.prototype.join.call(arguments, " "));
    };
    global.fetch = async function (url, init) {
      fetches.push({ url: String(url), init: init });
      return new Response("ok", { status: 204 });
    };
    if (!worker) worker = await import("../worker/src/index.js");
  });

  afterEach(function () {
    console.log = previousLog;
    global.fetch = previousFetch;
  });

  async function callWorker(method, body, env, headers) {
    const pending = [];
    const ctx = { waitUntil: function (job) { pending.push(job); } };
    const response = await worker.handleMissingSize(workerRequest(method, body, headers), env || {}, ctx);
    await Promise.all(pending);
    const text = await response.text();
    return { status: response.status, text: text };
  }

  it("imports the shared module so the upload contains it", function () {
    const src = fs.readFileSync(path.join(__dirname, "../worker/src/index.js"), "utf8");
    assert.match(src, /import missing from "\.\.\/\.\.\/lib\/missing-size\.js"/);
    assert.equal(src.includes("createRequire"), false);
  });

  it("answers GET with the capture flag and no notify address", async function () {
    const out = await callWorker("GET", undefined, {
      MISSING_SIZE_NOTIFY_EMAIL: "notify@example.com",
      MISSING_SIZE_NOTIFY_URL: "https://notify.example/hook"
    });
    assert.equal(out.status, 200);
    assert.equal(out.text, "{\"ok\":true,\"capture\":true}");
    assert.equal(out.text.includes("notify@example.com"), false);
    assert.equal(out.text.includes("mailto"), false);
    assert.equal(fetches.length, 0);
  });

  it("logs a note and stays log-only when notify vars are absent", async function () {
    const out = await callWorker("POST", {
      size: "205/55R16 91V",
      auto: true
    }, { MISSING_SIZE_NOTIFY_EMAIL: "notify@example.com" });
    assert.equal(out.status, 200);
    const data = JSON.parse(out.text);
    assert.equal(data.ok, true);
    assert.equal(data.saved, true);
    assert.equal(out.text.includes("notify@example.com"), false);
    assert.equal(fetches.length, 0);
    assert.equal(logs.some(function (line) { return line.indexOf("[missing-size] ") === 0; }), true);
    const record = JSON.parse(logs.find(function (line) {
      return line.indexOf("[missing-size] ") === 0;
    }).slice("[missing-size] ".length));
    assert.equal(record.size, "205/55R16 91V");
    assert.equal(record.source, "auto");
    assert.equal(record.email, "");
  });

  it("notifies only when a URL is set, and still hides it from the response", async function () {
    const out = await callWorker("POST", {
      size: "225/75R16C",
      email: "visitor@example.com"
    }, {
      MISSING_SIZE_NOTIFY_URL: "https://notify.example/hook",
      MISSING_SIZE_NOTIFY_EMAIL: "notify@example.com"
    });
    assert.equal(out.status, 200);
    assert.equal(out.text.includes("notify@example.com"), false);
    assert.equal(out.text.includes("mailto"), false);
    assert.equal(fetches.length, 1);
    assert.equal(fetches[0].url, "https://notify.example/hook");
    const sent = JSON.parse(fetches[0].init.body);
    assert.equal(sent.notifyEmail, "notify@example.com");
    assert.equal(sent.record.size, "225/75R16C");
    assert.match(sent.text, /do not invent a pressure/);
  });

  it("ignores the honeypot and does not log or notify", async function () {
    const out = await callWorker("POST", {
      size: "225/75R16C",
      website: "http://spam.example"
    }, { MISSING_SIZE_NOTIFY_URL: "https://notify.example/hook" });
    assert.equal(out.status, 200);
    assert.deepEqual(JSON.parse(out.text), { ok: true, ignored: true });
    assert.equal(logs.some(function (line) { return line.indexOf("[missing-size] {") === 0; }), false);
    assert.equal(fetches.length, 0);
  });

  it("matches the local route for the same note", async function () {
    const body = { size: "LT275/70R18 125S", loadIndex: "125", brand: "Goodyear" };
    const headers = { "x-forwarded-for": "203.0.113.10" };
    const dest = path.join(os.tmpdir(), "mh-worker-parity-" + Date.now() + ".jsonl");
    const prevPath = process.env.MISSING_SIZE_LOG_PATH;
    process.env.MISSING_SIZE_LOG_PATH = dest;
    missing.resetRateLimit();
    const nodeRes = mockRes();
    await handleNode(mockReq("POST", body, headers), nodeRes);
    if (prevPath == null) delete process.env.MISSING_SIZE_LOG_PATH;
    else process.env.MISSING_SIZE_LOG_PATH = prevPath;
    try { fs.unlinkSync(dest); } catch (err) { /* ignore */ }
    missing.resetRateLimit();
    const edge = await callWorker("POST", body, {}, headers);
    assert.equal(nodeRes.statusCode, 200);
    assert.equal(edge.status, 200);
    assert.equal(edge.text, nodeRes.body);
    assert.equal(JSON.parse(edge.text).saved, true);
  });
});
