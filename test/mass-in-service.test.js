"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { parseWeightInput, isMissing, visibleOrStored } = require("../lib/mass-in-service");

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

describe("visibleOrStored", function () {
  it("prefers the box when state was cleared by a plate lookup", function () {
    assert.equal(visibleOrStored("3430", ""), 3430);
    assert.equal(visibleOrStored("3", ""), 3);
  });

  it("falls back to stored Mass in Service when the box is blank", function () {
    assert.equal(visibleOrStored("", 3430), 3430);
    assert.equal(visibleOrStored("", ""), null);
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
  });
});
