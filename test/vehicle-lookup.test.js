"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  lookupVehicle,
  lookupByMakeModelYear,
  shapeVehicle,
  exactModel,
  fieldsFromLookup,
} = require("../lib/vehicle-lookup");

const HYMER_DVLA = {
  registrationNumber: "Y3WAR",
  make: "HYMER",
  yearOfManufacture: 2024,
  colour: "Grey",
  fuelType: "DIESEL",
  revenueWeight: 4430,
};

describe("exactModel", function () {
  it("leaves converter + chassis platform blank", function () {
    assert.equal(exactModel("HYMER", "Ducato"), "");
    assert.equal(exactModel("Hymer", "DUCATO"), "");
    assert.equal(exactModel("BURSTNER", "Boxer"), "");
    assert.equal(exactModel("Swift", "Relay"), "");
  });

  it("keeps an OEM van model from MOT", function () {
    assert.equal(exactModel("FIAT", "DUCATO"), "Ducato");
    assert.equal(exactModel("PEUGEOT", "Boxer 35"), "Boxer");
  });

  it("keeps a non-chassis MOT model on a converter", function () {
    assert.equal(exactModel("HYMER", "B-MC I 580"), "B-MC I 580");
  });
});

describe("shapeVehicle for live DVLA", function () {
  it("does not infer Ducato or typical MIRO for a Hymer-like record", function () {
    const v = shapeVehicle(HYMER_DVLA, "dvla");
    assert.equal(v.make, "HYMER");
    assert.equal(v.model, "");
    assert.equal(v.modelInferred, false);
    assert.equal(v.yearOfManufacture, 2024);
    assert.equal(v.colour, "Grey");
    assert.equal(v.fuelType, "DIESEL");
    assert.equal(v.revenueWeight, 4430);
    assert.equal(v.applyAsMam, true);
    assert.equal(v.miroAvailable, false);
    assert.equal(v.typicalMiro, undefined);
  });

  it("ignores MOT chassis model on a converter brand", function () {
    const v = shapeVehicle(Object.assign({}, HYMER_DVLA, { model: "DUCATO" }), "dvla");
    assert.equal(v.model, "");
    assert.equal(v.miroAvailable, false);
    assert.equal(v.typicalMiro, undefined);
  });

  it("does not infer a platform from Fiat make alone", function () {
    const v = shapeVehicle({
      make: "FIAT",
      yearOfManufacture: 2018,
      revenueWeight: 3500,
    }, "dvla");
    assert.equal(v.model, "");
    assert.equal(v.modelInferred, false);
    assert.equal(v.applyAsMam, true);
    assert.equal(v.miroAvailable, false);
  });

  it("keeps Fiat Ducato when MOT supplies that model", function () {
    const v = shapeVehicle({
      make: "FIAT",
      model: "DUCATO",
      yearOfManufacture: 2018,
      revenueWeight: 3500,
    }, "dvla");
    assert.equal(v.model, "Ducato");
    assert.equal(v.miroAvailable, false);
    assert.equal(v.typicalMiro, undefined);
  });
});

describe("demo plates", function () {
  it("keep known model and typical MIRO", async function () {
    const result = await lookupVehicle({ vrm: "DEMO3500" });
    assert.equal(result.ok, true);
    assert.equal(result.vehicle.source, "demo");
    assert.equal(result.vehicle.model, "Ducato");
    assert.equal(result.vehicle.modelInferred, false);
    assert.equal(result.vehicle.miroAvailable, true);
    assert.ok(result.vehicle.typicalMiro > 0);
    assert.equal(result.vehicle.revenueWeight, 3500);
  });
});

describe("fieldsFromLookup", function () {
  it("clears model and MIRO after a Hymer-like DVLA response", function () {
    const vehicle = shapeVehicle(HYMER_DVLA, "dvla");
    const fields = fieldsFromLookup(vehicle);
    assert.equal(fields.plateLookup, true);
    assert.equal(fields.model, "");
    assert.equal(fields.clearMiro, true);
    assert.equal(fields.applyTypicalMiro, false);
  });

  it("keeps demo fixture model and typical MIRO", async function () {
    const result = await lookupVehicle({ vrm: "DEMO3500" });
    const fields = fieldsFromLookup(result.vehicle);
    assert.equal(fields.plateLookup, false);
    assert.equal(fields.model, "Ducato");
    assert.equal(fields.clearMiro, false);
    assert.equal(fields.applyTypicalMiro, true);
  });
});

describe("catalogue lookup", function () {
  it("still applies typical MAM and MIRO", function () {
    const result = lookupByMakeModelYear({ make: "Fiat", model: "Ducato", year: 2018 });
    assert.equal(result.ok, true);
    assert.equal(result.vehicle.source, "catalogue");
    assert.equal(result.vehicle.model, "Ducato");
    assert.equal(result.vehicle.miroAvailable, true);
    assert.equal(result.vehicle.typicalMiro, 3080);
  });
});
