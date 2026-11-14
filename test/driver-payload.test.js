"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { driverPayloadKg, ASSUMED_DRIVER_KG } = require("../lib/driver-payload");
const { fuelPayloadKg } = require("../lib/fuel-payload");

describe("driverPayloadKg", function () {
  it("adds the extra, or takes it off, against the 75 kg Mass in Service assumption", function () {
    assert.equal(ASSUMED_DRIVER_KG, 75);
    assert.equal(driverPayloadKg({ driverKg: 85, actualEmpty: "" }), 10);
    assert.equal(driverPayloadKg({ driverKg: 75, actualEmpty: "" }), 0);
    assert.equal(driverPayloadKg({ driverKg: 70, actualEmpty: "" }), -5);
    assert.equal(driverPayloadKg({ driverKg: 60, actualEmpty: "" }), -15);
  });

  it("does not subtract the assumed 75 kg when no driver weight is entered", function () {
    assert.equal(driverPayloadKg({ driverKg: "", actualEmpty: "" }), 0);
    assert.equal(driverPayloadKg({ driverKg: 0, actualEmpty: "" }), 0);
    assert.equal(driverPayloadKg({ actualEmpty: "" }), 0);
  });

  it("adds the full driver on a weighed-empty van", function () {
    assert.equal(driverPayloadKg({ driverKg: 85, actualEmpty: 3000 }), 85);
    assert.equal(driverPayloadKg({ driverKg: 75, actualEmpty: 3000 }), 75);
    assert.equal(driverPayloadKg({ driverKg: 70, actualEmpty: 3000 }), 70);
  });

  it("on the empty-ticket-equivalent Mass in Service path, a 70 kg driver brings the total to 3106 kg", function () {
    const base = 2800 + ASSUMED_DRIVER_KG + 90 * 0.9 * 0.84;
    const people = driverPayloadKg({ driverKg: 70, actualEmpty: "" }) + 80;
    const water = 80;
    const fuel = fuelPayloadKg({
      fuelCap: 90,
      fuelFill: 100,
      fuelDensity: 0.84,
      actualEmpty: ""
    });
    const total = base + people + water + fuel;
    assert.equal(people, 75);
    assert.equal(Math.round(total), 3106);
    assert.equal(Math.round(3500 - total), 394);
  });

  it("on a 3050 kg Mass in Service path, a 70 kg driver brings the total to 3213 kg", function () {
    const base = 3050;
    const people = driverPayloadKg({ driverKg: 70, actualEmpty: "" }) + 80;
    const water = 80;
    const fuel = fuelPayloadKg({
      fuelCap: 90,
      fuelFill: 100,
      fuelDensity: 0.84,
      actualEmpty: ""
    });
    const total = base + people + water + fuel;
    assert.equal(people, 75);
    assert.equal(Math.round(total), 3213);
    assert.equal(Math.round(3500 - total), 287);
  });
});
