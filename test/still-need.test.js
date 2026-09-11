"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const stillNeed = require("../lib/still-need");

describe("still-need checklist", function () {
  it("stays hidden until a lookup or the van path has started", function () {
    assert.equal(stillNeed.isVanPath({}), false);
    assert.equal(stillNeed.isVanPath({ mam: 3500, miro: 3050 }), false);
    assert.equal(stillNeed.isVanPath({ vrm: "DEMO3500" }), true);
    assert.equal(stillNeed.isVanPath({ make: "Fiat" }), true);
    assert.equal(stillNeed.isVanPath({ lookupSucceeded: true }), true);
    assert.equal(stillNeed.isVanPath({ presetStarted: true }), true);
  });

  it("ticks Mass in Service or empty weighbridge total from the fields only", function () {
    var blank = stillNeed.items({});
    assert.equal(blank[0].done, false);
    assert.equal(stillNeed.items({ miro: 3080 })[0].done, true);
    assert.equal(stillNeed.items({ actualEmpty: 3010 })[0].done, true);
    assert.equal(stillNeed.items({ miro: 0, actualEmpty: "" })[0].done, false);
  });

  it("ticks plate limits only when both front and rear are present", function () {
    assert.equal(stillNeed.items({ frontLimit: 1850 })[1].done, false);
    assert.equal(stillNeed.items({ frontLimit: 1850, rearLimit: 2000 })[1].done, true);
  });

  it("ticks loaded ticket weights only in Loaded mode — never from kit", function () {
    assert.equal(stillNeed.items({
      axleMode: "loaded",
      peopleKg: 240,
      kitKg: 80
    })[2].done, false);
    assert.equal(stillNeed.items({
      axleMode: "empty",
      frontWeight: 1400,
      rearWeight: 1900
    })[2].done, false);
    assert.equal(stillNeed.items({
      axleMode: "loaded",
      frontWeight: 1400,
      rearWeight: 1900
    })[2].done, true);
  });

  it("uses the locked Still need wording", function () {
    var list = stillNeed.items({});
    assert.equal(stillNeed.title(list), "Still need");
    assert.match(stillNeed.lead(), /do not invent/);
    assert.equal(list[0].label, "Mass in Service or empty weighbridge total");
    assert.equal(list[1].label, "VIN plate axle limits (front/rear)");
    assert.match(list[2].label, /Loaded axle weights if you have a ticket/);
    assert.match(stillNeed.dockLine(list), /^Still need:/);
  });

  it("clears the dock line when every matching field is filled", function () {
    var list = stillNeed.items({
      miro: 3080,
      frontLimit: 1850,
      rearLimit: 2000,
      axleMode: "loaded",
      frontWeight: 1400,
      rearWeight: 1900
    });
    assert.equal(stillNeed.title(list), "These figures are in");
    assert.equal(stillNeed.dockLine(list), "");
    assert.deepEqual(stillNeed.openLabels(list), []);
  });
});
