"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const axle = require("../lib/axle-check");

describe("axle check", function () {
  it("is incomplete when either plate rating is blank", function () {
    assert.equal(axle.isIncomplete("", ""), true);
    assert.equal(axle.isIncomplete(1850, ""), true);
    assert.equal(axle.isIncomplete("", 2000), true);
    assert.equal(axle.isIncomplete(0, 2000), true);
    assert.equal(axle.isIncomplete(1850, 2000), false);
  });

  it("does not treat junk as a rating", function () {
    assert.equal(axle.hasRating("abc"), false);
    assert.equal(axle.hasRating(null), false);
    assert.equal(axle.hasRating(1850), true);
  });

  it("uses the locked incomplete caution wording", function () {
    assert.equal(axle.cautionLabel(), "MAM check only — axle check incomplete");
    assert.match(axle.cautionDetail(), /does not invent axle loads/);
  });

  it("defaults the mode to loaded", function () {
    assert.equal(axle.normalizeMode(""), "loaded");
    assert.equal(axle.normalizeMode("loaded"), "loaded");
    assert.equal(axle.normalizeMode("empty"), "empty");
  });

  it("keeps plate limits and weighbridge weights as separate pairs", function () {
    assert.equal(axle.completeness({
      frontLimit: 1850,
      rearLimit: 2000
    }), "limits-only");
    assert.equal(axle.completeness({
      frontWeight: 1700,
      rearWeight: 1900
    }), "weights-only");
    assert.equal(axle.completeness({}), "mam-only");
    assert.equal(axle.completeness({
      frontLimit: 1850,
      rearLimit: 2000,
      frontWeight: 1700,
      rearWeight: 1900
    }), "complete");
  });

  it("never invents a pass from kit or people — weights must be entered", function () {
    var result = axle.evaluate({
      mode: "loaded",
      frontLimit: 1850,
      rearLimit: 2000,
      peopleKg: 240,
      kitKg: 80
    });
    assert.equal(result.status, "incomplete");
    assert.equal(result.incompleteKind, "limits-only");
    assert.equal(result.detail, "Axle check needs weighbridge front/rear weights");
    assert.equal(result.loudFail, false);
  });

  it("never treats plate ratings as measured weights", function () {
    var result = axle.evaluate({
      mode: "loaded",
      frontLimit: 2100,
      rearLimit: 2400
    });
    assert.equal(result.status, "incomplete");
    assert.equal(result.frontOver, false);
    assert.equal(result.rearOver, false);
    assert.equal(result.detail, "Axle check needs weighbridge front/rear weights");
  });

  it("asks for plate limits when only weighbridge weights are present", function () {
    var result = axle.evaluate({
      mode: "loaded",
      frontWeight: 1700,
      rearWeight: 1900
    });
    assert.equal(result.status, "incomplete");
    assert.equal(result.incompleteKind, "weights-only");
    assert.equal(result.detail, "Enter plate axle limits to check");
  });

  it("keeps the MAM-only pattern when both pairs are missing", function () {
    var result = axle.evaluate({ mode: "loaded" });
    assert.equal(result.status, "incomplete");
    assert.equal(result.incompleteKind, "mam-only");
    assert.equal(result.label, "MAM check only — axle check incomplete");
    assert.match(result.detail, /does not invent axle loads/);
  });

  it("passes a loaded ticket under both plate limits", function () {
    var result = axle.evaluate({
      mode: "loaded",
      frontLimit: 1850,
      rearLimit: 2000,
      frontWeight: 1700,
      rearWeight: 1900
    });
    assert.equal(result.status, "pass");
    assert.equal(result.label, "Pass");
    assert.equal(result.modeNote, "As driven — front/rear vs plate");
    assert.equal(result.loudFail, false);
    assert.match(result.tyresLink, /Use these weights in the Tyres tool/);
  });

  it("fails loud when the loaded rear axle is over even if total MAM is OK", function () {
    var result = axle.evaluate({
      mode: "loaded",
      frontLimit: 1850,
      rearLimit: 2000,
      frontWeight: 1400,
      rearWeight: 2050,
      knownTotal: 3450
    });
    assert.equal(result.status, "fail");
    assert.equal(result.rearOver, true);
    assert.equal(result.frontOver, false);
    assert.equal(result.loudFail, true);
    assert.equal(result.label, "Rear axle over — fail");
    assert.match(result.detail, /even if total MAM is OK/);
  });

  it("uses softer empty-mode wording and still fails an over-rear empty ticket", function () {
    var result = axle.evaluate({
      mode: "empty",
      frontLimit: 1850,
      rearLimit: 2000,
      frontWeight: 1600,
      rearWeight: 2100
    });
    assert.equal(result.status, "fail");
    assert.equal(result.loudFail, true);
    assert.equal(
      result.modeNote,
      "Base van — does not prove trip legality; use Loaded for roadside check"
    );
    assert.match(result.detail, /empty ticket/);
  });

  it("soft-flags when front plus rear is wildly unlike a known total", function () {
    assert.equal(axle.sanityMismatch(1700, 1900, 3650), false);
    assert.equal(axle.sanityMismatch(1200, 1300, 3500), true);
    var result = axle.evaluate({
      mode: "loaded",
      frontLimit: 1850,
      rearLimit: 2000,
      frontWeight: 1200,
      rearWeight: 1300,
      knownTotal: 3500
    });
    assert.equal(result.status, "pass");
    assert.equal(result.sanityFlag, true);
    assert.match(result.sanityDetail, /long way from the total mass/);
  });

  it("does not sanity-flag when total mass is unknown", function () {
    var result = axle.evaluate({
      mode: "loaded",
      frontLimit: 1850,
      rearLimit: 2000,
      frontWeight: 1200,
      rearWeight: 1300
    });
    assert.equal(result.sanityFlag, false);
  });
});
