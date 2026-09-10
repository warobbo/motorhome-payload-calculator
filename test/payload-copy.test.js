"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

describe("payload page identity and honesty", function () {
  it("spells out Maximum Authorised Mass on first hero use", function () {
    const introStart = html.indexOf('<div class="intro">');
    const intro = html.slice(introStart, html.indexOf('id="how-to-use"'));
    assert.ok(introStart > 0, "intro block should exist");
    assert.match(
      intro,
      /Is your motorhome still legal under its plated Maximum Authorised Mass \(MAM\)\?/
    );
    const heroAt = intro.indexOf("Is your motorhome still legal under its plated Maximum Authorised Mass (MAM)?");
    const defAt = intro.indexOf("the heaviest your van is allowed to be on the road (the plated weight)");
    assert.ok(heroAt >= 0 && defAt > heroAt, "hero should spell out MAM, then give the plated-weight meaning");
  });

  it("covers campervans and motorhomes, not only 3500 / 3850 / 4500", function () {
    assert.match(html, /UK campervans and motorhomes at any plated weight/);
    assert.match(html, /light vans around 2800–3200/);
    assert.match(html, /e\.g\. VW Transporter-style/);
    assert.match(html, /motorhomes at 3500, 3850, 4500/);
    assert.doesNotMatch(
      html,
      /For UK motorhomes and campervans at any plated weight — 3500, 3850, 4500/
    );
  });

  it("is not a 3.5t-only product in title, hero or Open Graph", function () {
    assert.match(html, /any plated Maximum Authorised Mass \(MAM\)/);
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

  it("has one Empty / Loaded weighbridge pair and defaults to Loaded", function () {
    assert.match(html, /id="axleModeLoaded"[^>]*value="loaded"[^>]*checked/);
    assert.match(html, /id="axleModeEmpty"[^>]*value="empty"/);
    assert.match(html, /for="wbFrontAxle">Front axle kg/);
    assert.match(html, /for="wbRearAxle">Rear axle kg/);
    assert.equal((html.match(/id="wbFrontAxle"/g) || []).length, 1);
    assert.equal((html.match(/id="wbRearAxle"/g) || []).length, 1);
    assert.match(app, /axleMode:\s*"loaded"/);
    assert.doesNotMatch(app, /invent axle split|guess front\/rear|split today's load from kit/i);
  });

  it("puts axle status beside remaining payload and keeps plate limits separate", function () {
    assert.match(html, /id="axleStatusBox"/);
    assert.match(html, /class="result-hero"/);
    assert.match(html, /Axle ratings from the plate/);
    assert.match(html, /Weighbridge axle weights/);
    assert.match(html, /id="warnAxleOver"/);
  });

  it("links to the Tyres tool without treating plate ratings as today’s axle weights", function () {
    assert.match(html, /href="tyres.html"/);
    assert.match(html, /weighbridge figures, not the plate ratings/);
    assert.match(app, /Use these weights in the/);
    assert.match(app, /weighbridge figures, not the plate ratings/);
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
