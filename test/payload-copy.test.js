"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

describe("payload page identity and honesty", function () {
  it("is not a 3.5t-only product in title, hero or Open Graph", function () {
    assert.match(html, /any plated MAM/);
    assert.match(html, /Is your motorhome still legal under its plated MAM/);
    assert.doesNotMatch(html, /Is your 3\.5t van actually legal/);
    assert.doesNotMatch(html, /<title>[^<]*3\.5t Ducato/);
    assert.doesNotMatch(html, /og:title"[^>]*3\.5t Ducato/);
  });

  it("puts the empty weighbridge ticket first and keeps Mass in Service as the V5 name", function () {
    assert.match(html, /Empty weighbridge ticket \(best\)/);
    assert.match(html, /Second best:<\/strong> Mass in Service from the V5/);
    assert.match(html, /can be optimistic/);
    const weighbridgeAt = html.indexOf('for="actualEmpty"');
    const miroAt = html.indexOf('for="miro"');
    assert.ok(weighbridgeAt > 0 && miroAt > weighbridgeAt, "weighbridge field should sit above Mass in Service");
  });

  it("treats blank axle ratings as an incomplete MAM-only check", function () {
    assert.match(html, /MAM check only — axle check incomplete/);
    assert.match(html, /We do not invent axle loads/);
    assert.match(app, /updateAxleResults/);
  });

  it("links to the Tyres tool without treating plate ratings as today’s axle weights", function () {
    assert.match(html, /href="tyres.html"/);
    assert.match(html, /Fitted different tyres\?/);
    assert.match(html, /weighbridge figures, not the plate ratings/);
  });

  it("lets people add custom kit rows and keeps setup off the public page", function () {
    assert.match(html, /id="addCustomKit"/);
    assert.match(html, /Your extra kit/);
    assert.match(html, /id="setup"[^>]*hidden/);
    assert.match(html, /\?setup=1/);
    assert.match(app, /customKit\.totalKg/);
  });

  it("warns that manufacturer payload is not real remaining if Mass in Service is optimistic", function () {
    assert.match(html, /brochure gap, not your real remaining if Mass in Service is optimistic/);
  });
});
