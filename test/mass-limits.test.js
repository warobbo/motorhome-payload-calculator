"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { classifyPlateMass, enteredPlateKg, assess, resultGate, MAX_PLATE_KG } = require("../lib/mass-limits");

describe("plate mass limits", function () {
  it("documents a 10000 kg ceiling", function () {
    assert.equal(MAX_PLATE_KG, 10000);
  });

  it("accepts realistic UK motorhome plates including the ceiling", function () {
    [2800, 3200, 3500, 3850, 4500, 5000, 7500, 10000, "3,500"].forEach(function (value) {
      assert.equal(classifyPlateMass(value), "ok", String(value));
      assert.equal(enteredPlateKg(value) > 0, true);
    });
  });

  it("treats blank as not entered and never as 0 kg", function () {
    assert.equal(classifyPlateMass(""), "blank");
    assert.equal(classifyPlateMass("   "), "blank");
    assert.equal(classifyPlateMass(null), "blank");
    assert.equal(enteredPlateKg(""), null);
    assert.equal(enteredPlateKg(null), null);
    assert.equal(resultGate({ mam: "", miro: 3050 }).mode, "mam-blank");
    assert.match(resultGate({ mam: "" }).summary, /not entered/i);
  });

  it("rejects non-positive and implausible oversized masses", function () {
    [0, "0", -5, "abc"].forEach(function (value) {
      assert.equal(classifyPlateMass(value), "non-positive", String(value));
      assert.equal(enteredPlateKg(value), null);
    });
    [10001, 999999, "999999"].forEach(function (value) {
      assert.equal(classifyPlateMass(value), "above-max", String(value));
      assert.equal(enteredPlateKg(value), null);
    });
  });

  it("reports an inline error per plate and ticket field", function () {
    var check = assess({
      mam: 999999,
      miro: 0,
      actualEmpty: -10,
      frontAxle: "",
      rearAxle: 2100,
      wbFrontAxle: 999999,
      wbRearAxle: ""
    });
    assert.equal(check.blocking, true);
    assert.match(check.errors.mam, /above 10,000 kg/);
    assert.match(check.errors.miro, /above 0 kg/);
    assert.match(check.errors.actualEmpty, /above 0 kg/);
    assert.equal(check.errors.frontAxle, undefined);
    assert.equal(check.errors.rearAxle, undefined);
    assert.match(check.errors.wbFrontAxle, /above 10,000 kg/);
    assert.equal(check.errors.wbRearAxle, undefined);
    assert.equal(resultGate({ mam: 999999, miro: 3050 }).mode, "invalid");
  });

  it("leaves realistic plates ready so Over MAM stays the calculator's job", function () {
    var gate = resultGate({
      mam: 3500,
      miro: 3400,
      actualEmpty: 3600,
      frontAxle: 1850,
      rearAxle: 2000,
      wbFrontAxle: 1600,
      wbRearAxle: 2100
    });
    assert.equal(gate.mode, "ready");
    assert.equal(gate.summary, "");
    assert.deepEqual(gate.errors, {});
  });
});

describe("page wiring", function () {
  it("loads MassLimits before app.js and does not format a blank MAM as 0 kg", function () {
    const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
    const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
    const limitsAt = html.indexOf("lib/mass-limits.js");
    const appAt = html.indexOf("app.js?v=");
    assert.ok(limitsAt > 0 && appAt > limitsAt, "mass limits should load before app.js");
    ["mamError", "miroError", "actualEmptyError", "frontAxleError", "rearAxleError", "wbFrontAxleError", "wbRearAxleError"].forEach(function (id) {
      assert.match(html, new RegExp('id="' + id + '"'));
    });
    assert.match(app, /MassLimits/);
    assert.match(app, /resultGate/);
    assert.match(app, /formatEnteredKg\(state\.mam\)/);
    assert.doesNotMatch(app, /getElementById\("mamOut"\)\.textContent = fmt\(num\(state\.mam\)/);
    assert.doesNotMatch(app, /getElementById\("mamOut"\)\.textContent = fmt\(r\.mam/);
  });
});

describe("browser global", function () {
  it("sets MassLimits even when a CommonJS module object exists", function () {
    const sandbox = { module: { exports: {} }, exports: {} };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, "../lib/mass-limits.js"), "utf8"),
      sandbox
    );
    assert.equal(sandbox.globalThis.MassLimits.resultGate({ mam: "" }).mode, "mam-blank");
    assert.equal(sandbox.globalThis.MassLimits.resultGate({ mam: 3500 }).mode, "ready");
  });
});
