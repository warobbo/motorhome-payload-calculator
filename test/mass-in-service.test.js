"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { parseWeightInput, isMissing } = require("../lib/mass-in-service");

describe("parseWeightInput", function () {
  it("reads Wayne’s V5 figure", function () {
    assert.equal(parseWeightInput(3430), 3430);
    assert.equal(parseWeightInput("3430"), 3430);
    assert.equal(parseWeightInput("3,430"), 3430);
  });

  it("treats blank, zero and junk as absent", function () {
    assert.equal(parseWeightInput(""), null);
    assert.equal(parseWeightInput(null), null);
    assert.equal(parseWeightInput(0), null);
    assert.equal(parseWeightInput("0"), null);
    assert.equal(parseWeightInput("abc"), null);
  });
});

describe("isMissing", function () {
  it("is missing after a plate lookup with an empty field", function () {
    assert.equal(isMissing("", "", ""), true);
    assert.equal(isMissing(null, "", ""), true);
  });

  it("is not missing when the box shows 3430 even if state was cleared", function () {
    assert.equal(isMissing("", "3430", ""), false);
    assert.equal(isMissing(null, 3430, ""), false);
  });

  it("is not missing when state already has the figure", function () {
    assert.equal(isMissing(3430, "", ""), false);
    assert.equal(isMissing(3420, "", ""), false);
  });

  it("is not missing on a weighed-empty ticket without Mass in Service", function () {
    assert.equal(isMissing("", "", 3100), false);
  });
});

describe("browser global", function () {
  it("sets MassInService even when a CommonJS module object exists", function () {
    const sandbox = { module: { exports: {} }, exports: {} };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, "../lib/mass-in-service.js"), "utf8"),
      sandbox
    );
    assert.equal(typeof sandbox.globalThis.MassInService.isMissing, "function");
    assert.equal(sandbox.globalThis.MassInService.isMissing("", "3430", ""), false);

    const frozen = { module: { exports: {} }, exports: {} };
    Object.defineProperty(frozen.module, "exports", { value: {}, writable: false });
    frozen.globalThis = frozen;
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, "../lib/mass-in-service.js"), "utf8"),
      frozen
    );
    assert.equal(typeof frozen.globalThis.MassInService.parseWeightInput, "function");
  });

  it("loads FuelPayload, DriverPayload and MassInService in one page realm", function () {
    const sandbox = {};
    sandbox.globalThis = sandbox;
    ["fuel-payload.js", "driver-payload.js", "mass-in-service.js", "custom-kit.js", "axle-check.js"].forEach(function (file) {
      vm.runInNewContext(
        fs.readFileSync(path.join(__dirname, "../lib", file), "utf8"),
        sandbox
      );
    });
    assert.equal(typeof sandbox.FuelPayload.fuelPayloadKg, "function");
    assert.equal(typeof sandbox.DriverPayload.driverPayloadKg, "function");
    assert.equal(typeof sandbox.MassInService.isMissing, "function");
    assert.equal(typeof sandbox.CustomKit.totalKg, "function");
    assert.equal(typeof sandbox.AxleCheck.isIncomplete, "function");
  });
});
