"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
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
