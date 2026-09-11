"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const missing = require("../lib/missing-size");
const handleMissingSize = require("../api/missing-size");

describe("missing-size research intake", function () {
  beforeEach(function () {
    missing.resetRateLimit();
  });

  it("requires a tyre size and never returns a pressure", function () {
    const empty = missing.buildRecord({});
    assert.equal(empty.ok, false);
    assert.equal(empty.error, "need-size");

    const built = missing.buildRecord({
      size: "  245/70 R19.5  136/134M  ",
      loadIndex: "136",
      speedRating: "m",
      brand: "Goodyear Kmax",
      note: "from the sidewall",
      email: "Wayne@example.com",
      bar: 4.5,
      psi: 65
    });
    assert.equal(built.ok, true);
    assert.equal(built.record.size, "245/70 R19.5 136/134M");
    assert.equal(built.record.loadIndex, "136");
    assert.equal(built.record.speedRating, "M");
    assert.equal(built.record.email, "wayne@example.com");
    assert.equal(built.record.bar, undefined);
    assert.equal(built.record.psi, undefined);
    assert.equal(built.record.source, "form");

    const auto = missing.buildRecord({
      size: "205/75 R16C 113R",
      loadIndex: "113",
      brand: "Goodyear",
      auto: true
    });
    assert.equal(auto.ok, true);
    assert.equal(auto.record.source, "auto");
    assert.equal(auto.record.bar, undefined);
    assert.match(missing.sidewallLine(built.record), /245\/70 R19\.5/);
    assert.match(missing.formatMailtoBody(built.record), /do not invent a pressure/);
    assert.doesNotMatch(missing.formatMailtoBody(built.record), /we will email you a pressure/i);
  });

  it("ignores the honeypot and drops a bad email", function () {
    const bot = missing.buildRecord({ size: "225/75R16C", website: "http://spam.example" });
    assert.equal(bot.ok, true);
    assert.equal(bot.ignored, true);

    const badMail = missing.buildRecord({ size: "225/75R16C", email: "not-an-email" });
    assert.equal(badMail.record.email, "");
  });

  it("logs JSON and can append a JSONL file", function () {
    const dest = path.join(os.tmpdir(), "mh-missing-size-" + Date.now() + ".jsonl");
    const lines = [];
    const built = missing.buildRecord({ size: "LT275/70R18 125S", loadIndex: "125" });
    const out = missing.persistRecord(built.record, {
      log: function (line) { lines.push(line); },
      logPath: dest
    });
    assert.equal(out.logged, true);
    assert.equal(out.saved, true);
    assert.match(lines[0], /^\[missing-size\] /);
    const saved = JSON.parse(fs.readFileSync(dest, "utf8").trim());
    assert.equal(saved.size, "LT275/70R18 125S");
    assert.equal(saved.bar, undefined);
    fs.unlinkSync(dest);
  });

  it("rate-limits repeated submits from the same key", function () {
    const now = 1_000_000;
    for (let i = 0; i < 30; i += 1) {
      assert.equal(missing.allowSubmit("1.1.1.1", now + i), true);
    }
    assert.equal(missing.allowSubmit("1.1.1.1", now + 31), false);
    assert.equal(missing.allowSubmit("2.2.2.2", now + 31), true);
  });
});

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader: function (key, value) { this.headers[key] = value; },
    end: function (text) { this.body = text || ""; }
  };
}

function mockReq(method, body) {
  const raw = body === undefined ? "" : JSON.stringify(body);
  const chunks = raw ? [Buffer.from(raw)] : [];
  return {
    method: method,
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

describe("POST /api/missing-size", function () {
  beforeEach(function () {
    missing.resetRateLimit();
  });

  it("accepts a research note and does not invent bar or PSI", async function () {
    const dest = path.join(os.tmpdir(), "mh-missing-api-" + Date.now() + ".jsonl");
    const prevPath = process.env.MISSING_SIZE_LOG_PATH;
    process.env.MISSING_SIZE_LOG_PATH = dest;
    const req = mockReq("POST", {
      size: "205/75 R16C 113R",
      brand: "Goodyear",
      loadIndex: "113"
    });
    const res = mockRes();
    await handleMissingSize(req, res);
    if (prevPath == null) delete process.env.MISSING_SIZE_LOG_PATH;
    else process.env.MISSING_SIZE_LOG_PATH = prevPath;
    try { fs.unlinkSync(dest); } catch (err) { /* ignore */ }
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.ok, true);
    assert.equal(data.saved, true);
    assert.equal(Object.prototype.hasOwnProperty.call(data, "bar"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(data, "psi"), false);
    assert.doesNotMatch(res.body, /"bar"|"psi"/);
  });

  it("rejects an empty body and answers GET without secrets", async function () {
    const bad = mockRes();
    await handleMissingSize(mockReq("POST", {}), bad);
    assert.equal(bad.statusCode, 400);
    assert.match(bad.body, /tyre size/);

    const prev = process.env.MISSING_SIZE_NOTIFY_EMAIL;
    process.env.MISSING_SIZE_NOTIFY_EMAIL = "wayne@example.com";
    const getRes = mockRes();
    await handleMissingSize(mockReq("GET"), getRes);
    const data = JSON.parse(getRes.body);
    assert.equal(data.ok, true);
    assert.equal(data.mailto, "wayne@example.com");
    if (prev == null) delete process.env.MISSING_SIZE_NOTIFY_EMAIL;
    else process.env.MISSING_SIZE_NOTIFY_EMAIL = prev;
  });
});
