"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { fuelPayloadKg, fuelBreakdownLabel, includesFuelInBase } = require("../lib/fuel-payload");

const WAYNE = {
  fuelCap: 90,
  fuelFill: 100,
  fuelDensity: 0.84,
  actualEmpty: "",
};

describe("fuelPayloadKg", function () {
  it("always applies the 90% Mass in Service rule (no optional tick)", function () {
    const kg = fuelPayloadKg(WAYNE);
    assert.ok(kg > 7 && kg < 8.1, "expected ~7.6 kg, got " + kg);
    assert.equal(includesFuelInBase(WAYNE), true);
    assert.equal(includesFuelInBase(Object.assign({}, WAYNE, { miroIncludesFuel: false })), true);
  });

  it("is about 8 kg (not 76) for Wayne’s 90 L @ 100% example", function () {
    const kg = fuelPayloadKg(WAYNE);
    assert.ok(Math.round(kg) === 8, "expected rounded 8 kg, got " + kg);
    assert.ok(Math.round(kg) !== 76);
  });

  it("adds 0 at 90% fill or below", function () {
    assert.equal(fuelPayloadKg(Object.assign({}, WAYNE, { fuelFill: 90 })), 0);
    assert.equal(fuelPayloadKg(Object.assign({}, WAYNE, { fuelFill: 50 })), 0);
    assert.equal(fuelPayloadKg(Object.assign({}, WAYNE, { fuelFill: 0 })), 0);
  });

  it("adds the full tank on a weighed-empty van", function () {
    const kg = fuelPayloadKg(Object.assign({}, WAYNE, { actualEmpty: 3000 }));
    assert.ok(kg > 75 && kg < 76.1, "expected ~75.6 kg, got " + kg);
    assert.equal(includesFuelInBase(Object.assign({}, WAYNE, { actualEmpty: 3000 })), false);
  });
});

describe("fuelBreakdownLabel", function () {
  it("says extra fuel on the Mass in Service path", function () {
    assert.equal(fuelBreakdownLabel(WAYNE), "Fuel (above Mass in Service)");
  });

  it("says full tank on the weighed-empty path", function () {
    assert.equal(
      fuelBreakdownLabel(Object.assign({}, WAYNE, { actualEmpty: 3000 })),
      "Fuel (full tank — not in weighed empty)"
    );
  });
});
