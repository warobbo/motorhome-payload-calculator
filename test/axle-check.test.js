"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { hasRating, isIncomplete, cautionLabel, cautionDetail } = require("../lib/axle-check");

describe("axle check", function () {
  it("is incomplete when either plate rating is blank", function () {
    assert.equal(isIncomplete("", ""), true);
    assert.equal(isIncomplete(1850, ""), true);
    assert.equal(isIncomplete("", 2000), true);
    assert.equal(isIncomplete(0, 2000), true);
    assert.equal(isIncomplete(1850, 2000), false);
  });

  it("does not treat junk as a rating", function () {
    assert.equal(hasRating("abc"), false);
    assert.equal(hasRating(null), false);
    assert.equal(hasRating(1850), true);
  });

  it("uses the locked incomplete caution wording", function () {
    assert.equal(cautionLabel(), "MAM check only — axle check incomplete");
    assert.match(cautionDetail(), /does not invent axle loads/);
  });
});
