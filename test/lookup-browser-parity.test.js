"use strict";

const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const handleLookup = require("../api/vehicle-lookup");
const { lookupVehicle, lookupByMakeModelYear, lookupHealth, DEMO_PLATES } = require("../lib/vehicle-lookup");
const { CATALOGUE } = require("../lib/van-catalogue");

const root = path.join(__dirname, "..");
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/lookup-server-output.json"), "utf8"));

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function browserLookup() {
  const context = { console: console };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "lib/van-catalogue.js"), "utf8"), context, {
    filename: "van-catalogue.js"
  });
  vm.runInContext(fs.readFileSync(path.join(root, "lib/vehicle-lookup.js"), "utf8"), context, {
    filename: "vehicle-lookup.js"
  });
  return context;
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader: function (key, value) { this.headers[key] = value; },
    end: function (text) { this.body = text || ""; }
  };
}

function mockReq(method, body) {
  const raw = body === undefined ? "" : JSON.stringify(body);
  const chunks = raw ? [Buffer.from(raw)] : [];
  return {
    method: method,
    url: "/api/vehicle-lookup",
    headers: {},
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

describe("browser lookup matches the server fixture", function () {
  const browser = browserLookup();
  const previousFetch = global.fetch;

  after(function () {
    global.fetch = previousFetch;
  });

  it("covers every demo plate and every catalogue row", function () {
    assert.deepEqual(DEMO_PLATES.slice().sort(), Object.keys(golden.demos).sort());
    assert.equal(Object.keys(golden.catalogue).length, CATALOGUE.length);
    CATALOGUE.forEach(function (row) {
      const key = row.make + "|" + row.model + "|" + row.yearFrom + "-" + row.yearTo;
      assert.ok(golden.catalogue[key], key);
    });
  });

  it("matches demo plates in Node, in a browser realm, and on the local route", async function () {
    for (const plate of DEMO_PLATES) {
      const live = await lookupVehicle({ vrm: plate });
      const page = await browser.VehicleLookup.lookupVehicle({ vrm: plate });
      assert.deepEqual(plain(live), golden.demos[plate], plate);
      assert.deepEqual(plain(page), golden.demos[plate], plate + " browser");

      const res = mockRes();
      await handleLookup(mockReq("POST", { registrationNumber: plate }), res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(JSON.parse(res.body), plain(live), plate + " route");
    }
  });

  it("matches every catalogue year edge in Node and in the browser", function () {
    CATALOGUE.forEach(function (row) {
      const key = row.make + "|" + row.model + "|" + row.yearFrom + "-" + row.yearTo;
      const cases = {
        start: row.yearFrom,
        end: row.yearTo,
        mid: Math.floor((row.yearFrom + row.yearTo) / 2),
        blankYear: ""
      };
      Object.keys(cases).forEach(function (name) {
        const live = lookupByMakeModelYear({ make: row.make, model: row.model, year: cases[name] });
        const page = browser.VehicleLookup.lookupByMakeModelYear({
          make: row.make,
          model: row.model,
          year: cases[name]
        });
        assert.deepEqual(plain(live), golden.catalogue[key][name], key + " " + name);
        assert.deepEqual(plain(page), golden.catalogue[key][name], key + " " + name + " browser");
        assert.equal(live.vehicle.miroAvailable, true);
        assert.equal(live.vehicle.source, "catalogue");
      });
    });
  });

  it("matches the no-key plate and the unknown catalogue path", async function () {
    const nokey = await lookupVehicle({ vrm: "AB12CDE" });
    const page = await browser.VehicleLookup.lookupVehicle({ vrm: "AB12CDE" });
    assert.deepEqual(plain(nokey), golden.nokey);
    assert.deepEqual(plain(page), golden.nokey);

    const miss = lookupByMakeModelYear({ make: "Hymer", model: "B-MC", year: 2020 });
    const missPage = browser.VehicleLookup.lookupByMakeModelYear({ make: "Hymer", model: "B-MC", year: 2020 });
    assert.deepEqual(plain(miss), golden.miss);
    assert.deepEqual(plain(missPage), golden.miss);
  });

  it("shapes a DVLA miss the same way in the browser realm", async function () {
    async function miss() {
      return {
        status: 404,
        async text() { return ""; }
      };
    }
    global.fetch = miss;
    browser.fetch = miss;
    const live = await lookupVehicle({ vrm: "AB12CDE", apiKey: "test-key" });
    const page = await browser.VehicleLookup.lookupVehicle({ vrm: "AB12CDE", apiKey: "test-key" });
    assert.equal(live.ok, false);
    assert.equal(live.error, "not_found");
    assert.deepEqual(plain(page), plain(live));
  });

  it("serves the same demo plate list the page exposes", async function () {
    const res = mockRes();
    await handleLookup(mockReq("GET"), res);
    const body = JSON.parse(res.body);
    assert.deepEqual(body, lookupHealth());
    assert.deepEqual(body.demoPlates, plain(browser.VehicleLookup.DEMO_PLATES));
    assert.equal(body.ok, true);
  });

  it("calls the configured lookup route and falls back to the browser functions", function () {
    const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const config = fs.readFileSync(path.join(root, "site-config.js"), "utf8");
    assert.match(config, /window\.VEHICLE_LOOKUP_ENDPOINT = "\/api\/vehicle-lookup";/);
    assert.match(app, /window\.VEHICLE_LOOKUP_ENDPOINT/);
    assert.match(app, /return "\/api\/vehicle-lookup"/);
    const endpointAt = app.indexOf("function vehicleLookupEndpoint");
    const fetchAt = app.indexOf("fetch(vehicleLookupEndpoint()");
    const browserAt = app.indexOf("function lookupInBrowser");
    const fromPage = app.indexOf("function lookupFromPage");
    assert.ok(endpointAt > 0 && fetchAt > endpointAt, "page must call the lookup route");
    assert.ok(browserAt > fetchAt && fromPage > browserAt, "browser lookup is the fallback");
    assert.match(app, /lookupPayloadFromApi\(body\)\.catch/);
    assert.match(app, /VehicleLookup\.lookupByMakeModelYear/);
    const configAt = html.indexOf("site-config.js");
    const appAt = html.indexOf("app.js?");
    assert.ok(configAt > 0 && appAt > configAt, "site-config.js loads before app.js");
    assert.match(html, /lib\/van-catalogue\.js/);
    assert.match(html, /lib\/vehicle-lookup\.js/);
  });
});
