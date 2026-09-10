"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeItems, itemKg, totalKg } = require("../lib/custom-kit");

describe("custom kit", function () {
  it("adds name + kg + qty without inventing a blank weight", function () {
    assert.equal(itemKg({ name: "E-bike", kg: 22, qty: 2 }), 44);
    assert.equal(itemKg({ name: "Mystery box", kg: "", qty: 1 }), 0);
    assert.equal(itemKg({ name: "Zero", kg: 0, qty: 3 }), 0);
    assert.equal(itemKg({ name: "No qty", kg: 10, qty: 0 }), 0);
  });

  it("sums several extra rows and ignores junk", function () {
    const kg = totalKg([
      { name: "Awning room", kg: 12, qty: 1 },
      { name: "Tools", kg: "4.5", qty: 2 },
      { name: "Skip me", kg: "", qty: 1 },
      { name: "Bad", kg: "nope", qty: 2 }
    ]);
    assert.equal(kg, 21);
  });

  it("treats a missing list as empty, not an invented kit", function () {
    assert.deepEqual(normalizeItems(null), []);
    assert.equal(totalKg(undefined), 0);
    assert.equal(totalKg([]), 0);
  });

  it("defaults quantity to 1 when the user leaves qty blank", function () {
    const items = normalizeItems([{ name: "Chair", kg: 5 }]);
    assert.equal(items[0].qty, 1);
    assert.equal(totalKg(items), 5);
  });
});
