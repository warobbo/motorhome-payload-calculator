"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { fuelPayloadKg, fuelBreakdownLabel, includesFuelInBase } = require("../lib/fuel-payload");

const WAYNE = {
  fuelCap: 90,
  fuelFill: 100,
  fuelDensity: 0.84,
  miroIncludesFuel: true,
  actualEmpty: "",
};

describe("fuelPayloadKg", function () {
  it("adds only the top-up above 90% when Mass in Service includes fuel", function () {
    const kg = fuelPayloadKg(WAYNE);
    assert.ok(kg > 7 && kg < 8.1, "expected ~7.6 kg, got " + kg);
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

  it("adds the full tank when the 90% tick is off", function () {
    const kg = fuelPayloadKg(Object.assign({}, WAYNE, { miroIncludesFuel: false }));
    assert.ok(kg > 75 && kg < 76.1, "expected ~75.6 kg, got " + kg);
  });

  it("adds the full tank on a weighed-empty van", function () {
    const kg = fuelPayloadKg(Object.assign({}, WAYNE, { actualEmpty: 3000 }));
    assert.ok(kg > 75 && kg < 76.1, "expected ~75.6 kg, got " + kg);
    assert.equal(includesFuelInBase(Object.assign({}, WAYNE, { actualEmpty: 3000 })), false);
  });
});

describe("fuelBreakdownLabel", function () {
  it("says extra fuel when Mass in Service includes 90%", function () {
    assert.equal(fuelBreakdownLabel(WAYNE), "Fuel (above Mass in Service)");
  });

  it("says Fuel when the tank is not in the base", function () {
    assert.equal(fuelBreakdownLabel(Object.assign({}, WAYNE, { miroIncludesFuel: false })), "Fuel");
    assert.equal(fuelBreakdownLabel(Object.assign({}, WAYNE, { actualEmpty: 3000 })), "Fuel");
  });
});
