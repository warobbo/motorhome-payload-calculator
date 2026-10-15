"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

describe("stepper accessible names", function () {
  it("includes the visible plus or minus in every stepper name", function () {
    const re = /<button type="button" class="stepper-btn" data-step="-?\d" aria-label="([^"]+)">([−+])<\/button>/g;
    const names = [];
    let match;
    while ((match = re.exec(index))) {
      names.push(match);
      assert.ok(match[1].includes(match[2]), match[1] + " should include " + match[2]);
    }
    assert.equal(names.length, 20);
    assert.match(app, /aria-label="\\u2212 Fewer of this item"/);
    assert.match(app, /aria-label="\+ More of this item"/);
    assert.match(app, /<label for="' \+ escapeHtml\(nameId\) \+ '">Item<\/label>/);
    assert.match(app, /<label for="' \+ escapeHtml\(kgId\) \+ '">Weight each<\/label>/);
    assert.match(app, /<label for="' \+ escapeHtml\(qtyId\) \+ '">Quantity<\/label>/);
  });
});
