"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { driverPayloadKg, ASSUMED_DRIVER_KG } = require("../lib/driver-payload");

describe("driverPayloadKg", function () {
  it("adds only the extra above 75 kg on the Mass in Service path", function () {
    assert.equal(ASSUMED_DRIVER_KG, 75);
    assert.equal(driverPayloadKg({ driverKg: 85, actualEmpty: "" }), 10);
    assert.equal(driverPayloadKg({ driverKg: 75, actualEmpty: "" }), 0);
    assert.equal(driverPayloadKg({ driverKg: 60, actualEmpty: "" }), 0);
  });

  it("adds the full driver on a weighed-empty van", function () {
    assert.equal(driverPayloadKg({ driverKg: 85, actualEmpty: 3000 }), 85);
    assert.equal(driverPayloadKg({ driverKg: 75, actualEmpty: 3000 }), 75);
  });
});
