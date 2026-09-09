"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

describe("assumption copy placement", function () {
  it("does not put the driver assumption under the vehicle grid", function () {
    const vehicle = html.slice(0, html.indexOf("People &amp; pets"));
    assert.equal(
      vehicle.includes('<p class="assumption">Mass in Service usually assumes a 75 kg driver</p>'),
      false
    );
    assert.equal(vehicle.includes("Mass in Service already includes 90% fuel"), false);
    assert.ok(vehicle.includes("id=\"driverHint\""));
  });

  it("puts the fuel assumption under the fuel capacity / fill fields", function () {
    const fluids = html.slice(html.indexOf(">Fluids<"), html.indexOf("Gas bottles"));
    const fuelFillAt = fluids.indexOf('id="fuelFill"');
    const fuelLineAt = fluids.indexOf("Mass in Service already includes 90% fuel (usual). Only the difference from 90% is added.");
    const densityAt = fluids.indexOf('id="fuelDensity"');
    assert.ok(fuelFillAt > 0);
    assert.ok(fuelLineAt > fuelFillAt);
    assert.ok(densityAt > fuelLineAt);
    assert.equal(fluids.includes("type=\"checkbox\""), false);
  });
});

describe("ASSET_VERSION cache bust", function () {
  it("adds the same query param on app.js and lib scripts", function () {
    const tags = html.match(/<script src="[^"]+\.js\?v=[^"]+"><\/script>/g) || [];
    assert.equal(tags.length, 4);
    assert.ok(tags.some(function (t) { return t.includes("lib/fuel-payload.js?v="); }));
    assert.ok(tags.some(function (t) { return t.includes("lib/driver-payload.js?v="); }));
    assert.ok(tags.some(function (t) { return t.includes("lib/mass-in-service.js?v="); }));
    assert.ok(tags.some(function (t) { return t.includes("app.js?v="); }));
    const versions = tags.map(function (t) { return t.match(/\?v=([^"]+)/)[1]; });
    assert.equal(new Set(versions).size, 1);
  });
});

describe("calculate hardening", function () {
  it("reads #miro before deciding the breakdown is empty", function () {
    assert.match(appJs, /function calculate\(\) \{\s*adoptVisibleMiro\(\);/s);
    assert.match(appJs, /if \(syncing\) return;/);
    assert.equal(/function adoptVisibleMiro\(\) \{\s*if \(syncing\) return;/s.test(appJs), false);
  });

  it("binds explicit input/change/blur on #miro", function () {
    assert.match(appJs, /miroInput\.addEventListener\("input", onMiroEdited\)/);
    assert.match(appJs, /miroInput\.addEventListener\("change", onMiroEdited\)/);
    assert.match(appJs, /miroInput\.addEventListener\("blur", onMiroEdited\)/);
  });

  it("fails soft instead of leaving a silent empty breakdown", function () {
    assert.match(appJs, /function showSoftFail/);
    assert.match(appJs, /Could not update the weight breakdown/);
    assert.match(appJs, /fillForm\(\{ wipeMiro: wipeMiro \}\)/);
  });
});
