"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { fuelPayloadKg, fuelBreakdownLabel, includesFuelInBase } = require("../lib/fuel-payload");

const FUEL_90 = {
  fuelCap: 90,
  fuelFill: 100,
  fuelDensity: 0.84,
  actualEmpty: "",
};

describe("fuelPayloadKg", function () {
  it("always applies the 90% Mass in Service rule (no optional tick)", function () {
    const kg = fuelPayloadKg(FUEL_90);
    assert.ok(kg > 7 && kg < 8.1, "expected ~7.6 kg, got " + kg);
    assert.equal(includesFuelInBase(FUEL_90), true);
    assert.equal(includesFuelInBase(Object.assign({}, FUEL_90, { miroIncludesFuel: false })), true);
  });

  it("is about 8 kg (not 76) for a 90 L tank at 100%", function () {
    const kg = fuelPayloadKg(FUEL_90);
    assert.ok(Math.round(kg) === 8, "expected rounded 8 kg, got " + kg);
    assert.ok(Math.round(kg) !== 76);
  });

  it("adds 0 at 90% fill or below", function () {
    assert.equal(fuelPayloadKg(Object.assign({}, FUEL_90, { fuelFill: 90 })), 0);
    assert.equal(fuelPayloadKg(Object.assign({}, FUEL_90, { fuelFill: 50 })), 0);
    assert.equal(fuelPayloadKg(Object.assign({}, FUEL_90, { fuelFill: 0 })), 0);
  });

  it("adds the full tank on a weighed-empty van", function () {
    const kg = fuelPayloadKg(Object.assign({}, FUEL_90, { actualEmpty: 3000 }));
    assert.ok(kg > 75 && kg < 76.1, "expected ~75.6 kg, got " + kg);
    assert.equal(includesFuelInBase(Object.assign({}, FUEL_90, { actualEmpty: 3000 })), false);
  });
});

describe("fuelBreakdownLabel", function () {
  it("says extra fuel on the Mass in Service path", function () {
    assert.equal(fuelBreakdownLabel(FUEL_90), "Fuel (above Mass in Service)");
  });

  it("says full tank on the weighed-empty path", function () {
    assert.equal(
      fuelBreakdownLabel(Object.assign({}, FUEL_90, { actualEmpty: 3000 })),
      "Fuel (full tank — not in weighed empty)"
    );
  });
});
