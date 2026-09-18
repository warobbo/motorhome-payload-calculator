"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  parsePayloadPrefillQuery,
  applyPayloadPrefillToState,
  isRemainingPayloadShare,
  buildPayloadPrefillQuery,
  buildPayloadPrefillHref,
  PAYLOAD_HREF
} = require("../lib/payload-prefill");
const DriverPayload = require("../lib/driver-payload");
const FuelPayload = require("../lib/fuel-payload");

const DEFAULTS = {
  units: "metric",
  mam: 3500,
  miro: 3050,
  actualEmpty: "",
  driverKg: 75,
  extraAdults: 1,
  adultKg: 80,
  children: 0,
  childKg: 30,
  pets: 0,
  petKg: 12,
  freshCap: 90,
  freshFill: 50,
  greyCap: 70,
  greyFill: 0,
  blackCap: 19,
  blackFill: 0,
  fuelCap: 90,
  fuelFill: 90,
  fuelDensity: 0.84,
  gas6: 1,
  gas6Full: 13,
  gas9: 0,
  gas9Full: 18.5,
  gas13: 0,
  gas13Full: 28,
  battType: "life100",
  battQty: 1,
  solarType: "none",
  solarQty: 1,
  inverterKg: 0,
  elecExtrasKg: 0,
  awning: false,
  bikes: 0,
  bikeKg: 14,
  rackKg: 12,
  ramps: true,
  rampsKg: 4.5,
  furniture: false,
  generator: false,
  toolbox: true,
  toolboxKg: 10,
  foodPeople: 1,
  foodKgEach: 12,
  miscKg: 20,
  customItems: []
};

function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function remainingFromState(s) {
  const mam = num(s.mam);
  const miro = num(s.miro);
  const base = num(s.actualEmpty) > 0 ? num(s.actualEmpty) : miro;
  const driver = DriverPayload.driverPayloadKg({
    driverKg: s.driverKg,
    actualEmpty: s.actualEmpty
  });
  const people = driver + num(s.extraAdults) * num(s.adultKg) +
    num(s.children) * num(s.childKg) + num(s.pets) * num(s.petKg);
  const fresh = num(s.freshCap) * num(s.freshFill) / 100;
  const grey = num(s.greyCap) * num(s.greyFill) / 100;
  const black = num(s.blackCap) * num(s.blackFill) / 100;
  const fuel = FuelPayload.fuelPayloadKg({
    fuelCap: s.fuelCap,
    fuelFill: s.fuelFill,
    fuelDensity: s.fuelDensity,
    actualEmpty: s.actualEmpty
  });
  const gas = num(s.gas6) * num(s.gas6Full) + num(s.gas9) * num(s.gas9Full) +
    num(s.gas13) * num(s.gas13Full);
  const electrical = (s.battType === "none" ? 0 : 12) * num(s.battQty) +
    num(s.inverterKg) + num(s.elecExtrasKg);
  const bikes = num(s.bikes) * num(s.bikeKg) + (num(s.bikes) > 0 ? num(s.rackKg) : 0);
  const food = num(s.foodPeople) * num(s.foodKgEach);
  let gear = bikes + food + num(s.miscKg);
  if (s.awning) gear += num(s.awningKg);
  if (s.ramps) gear += num(s.rampsKg);
  if (s.furniture) gear += num(s.furnitureKg);
  if (s.generator) gear += num(s.generatorKg);
  if (s.toolbox) gear += num(s.toolboxKg);
  const added = people + fresh + grey + black + fuel + gas + electrical + gear;
  return mam - (base + added);
}

describe("parsePayloadPrefillQuery", function () {
  it("reads the Ask bikes + rack contract", function () {
    const patch = parsePayloadPrefillQuery("?bikes=3&bikeKg=14&rackKg=12");
    assert.ok(patch);
    assert.equal(patch.bikes, 3);
    assert.equal(patch.bikeKg, 14);
    assert.equal(patch.rackKg, 12);
    assert.equal(patch.mam, undefined);
    assert.equal(patch.miro, undefined);
  });

  it("reads remaining-payload Ask params including miro=0", function () {
    const patch = parsePayloadPrefillQuery(
      "?mam=500&miro=0&bikes=3&bikeKg=14&rackKg=12&freshCap=50&freshFill=100"
    );
    assert.ok(patch);
    assert.equal(patch.mam, 500);
    assert.equal(patch.miro, 0);
    assert.equal(patch.bikes, 3);
    assert.equal(patch.bikeKg, 14);
    assert.equal(patch.rackKg, 12);
    assert.equal(patch.freshCap, 50);
    assert.equal(patch.freshFill, 100);
  });

  it("defaults freshFill to 100 when freshCap is set", function () {
    const patch = parsePayloadPrefillQuery("?freshCap=50");
    assert.equal(patch.freshCap, 50);
    assert.equal(patch.freshFill, 100);
  });

  it("accepts gas bottle counts and full-kg overrides", function () {
    const patch = parsePayloadPrefillQuery("?gas6=2&gas6Full=13.5&gas9=1&gas13=0");
    assert.equal(patch.gas6, 2);
    assert.equal(patch.gas6Full, 13.5);
    assert.equal(patch.gas9, 1);
    assert.equal(patch.gas13, 0);
  });

  it("ignores unknown keys, setup=1, and invalid values", function () {
    assert.equal(parsePayloadPrefillQuery(""), null);
    assert.equal(parsePayloadPrefillQuery("?setup=1"), null);
    assert.equal(parsePayloadPrefillQuery("?foo=bar&utm_source=ask"), null);
    const patch = parsePayloadPrefillQuery(
      "?bikes=nope&bikeKg=-4&rackKg=abc&mam=foo&miro=&freshFill=140&freshCap=50&setup=1"
    );
    assert.ok(patch);
    assert.equal(patch.freshCap, 50);
    assert.equal(patch.freshFill, 100);
    assert.equal(patch.bikes, undefined);
    assert.equal(patch.bikeKg, undefined);
    assert.equal(patch.rackKg, undefined);
    assert.equal(patch.mam, undefined);
    assert.equal(patch.setup, undefined);
  });

  it("accepts URLSearchParams", function () {
    const params = new URLSearchParams("bikes=3&bikeKg=14&rackKg=12");
    const patch = parsePayloadPrefillQuery(params);
    assert.equal(patch.bikes, 3);
    assert.equal(patch.bikeKg, 14);
    assert.equal(patch.rackKg, 12);
  });
});

describe("applyPayloadPrefillToState", function () {
  it("patches bikes onto defaults and leaves plated weights alone", function () {
    const next = applyPayloadPrefillToState(DEFAULTS, "?bikes=3&bikeKg=14&rackKg=12");
    assert.ok(next);
    assert.equal(next.bikes, 3);
    assert.equal(next.bikeKg, 14);
    assert.equal(next.rackKg, 12);
    assert.equal(next.mam, 3500);
    assert.equal(next.miro, 3050);
    assert.equal(next.extraAdults, 1);
    assert.equal(next.gas6, 1);
    assert.equal(next.remainingPayloadShare, undefined);
  });

  it("does not invent plated MAM/MIRO when only kit params arrive", function () {
    const next = applyPayloadPrefillToState(DEFAULTS, "?freshCap=50&freshFill=100&bikes=3");
    assert.equal(next.mam, DEFAULTS.mam);
    assert.equal(next.miro, DEFAULTS.miro);
    assert.equal(next.actualEmpty, DEFAULTS.actualEmpty);
    assert.equal(next.freshCap, 50);
    assert.equal(next.freshFill, 100);
    assert.equal(next.bikes, 3);
  });

  it("applies remaining-payload Ask mode so remaining matches Ask (~396)", function () {
    const next = applyPayloadPrefillToState(
      DEFAULTS,
      "?mam=500&miro=0&bikes=3&bikeKg=14&rackKg=12&freshCap=50&freshFill=100"
    );
    assert.ok(next);
    assert.equal(next.mam, 500);
    assert.equal(next.miro, 0);
    assert.equal(next.bikes, 3);
    assert.equal(next.bikeKg, 14);
    assert.equal(next.rackKg, 12);
    assert.equal(next.freshCap, 50);
    assert.equal(next.freshFill, 100);
    assert.equal(next.remainingPayloadShare, true);
    assert.equal(next.extraAdults, 0);
    assert.equal(next.gas6, 0);
    assert.equal(next.battType, "none");
    assert.equal(next.ramps, false);
    assert.equal(next.toolbox, false);
    assert.equal(next.foodPeople, 0);
    assert.equal(next.miscKg, 0);
    assert.equal(remainingFromState(next), 396);
  });

  it("treats mam without miro as remaining-payload (Ask omits miro=0)", function () {
    const next = applyPayloadPrefillToState(DEFAULTS, "?mam=500&bikes=3&bikeKg=14&rackKg=12");
    assert.equal(next.mam, 500);
    assert.equal(next.miro, 0);
    assert.equal(next.remainingPayloadShare, true);
    assert.equal(isRemainingPayloadShare(parsePayloadPrefillQuery("?mam=500&bikes=3")), true);
  });

  it("keeps extras when both plated mam and miro arrive", function () {
    const next = applyPayloadPrefillToState(DEFAULTS, "?mam=3500&miro=3050&bikes=2");
    assert.equal(next.mam, 3500);
    assert.equal(next.miro, 3050);
    assert.equal(next.bikes, 2);
    assert.equal(next.extraAdults, 1);
    assert.equal(next.gas6, 1);
    assert.equal(next.remainingPayloadShare, undefined);
  });

  it("returns null when nothing valid is present", function () {
    assert.equal(applyPayloadPrefillToState(DEFAULTS, ""), null);
    assert.equal(applyPayloadPrefillToState(DEFAULTS, "?setup=1&foo=1"), null);
  });

  it("does not mutate the defaults object", function () {
    const snapshot = JSON.parse(JSON.stringify(DEFAULTS));
    applyPayloadPrefillToState(DEFAULTS, "?bikes=3&mam=500&miro=0");
    assert.deepEqual(DEFAULTS, snapshot);
  });
});

describe("buildPayloadPrefillHref", function () {
  it("emits the same Ask field names (mam, miro, water, gas, bikes)", function () {
    const href = buildPayloadPrefillHref({
      mam: 500,
      miro: 0,
      freshCap: 50,
      freshFill: 100,
      bikes: 3,
      bikeKg: 14,
      rackKg: 12,
      gas6: 1,
      gas6Full: 13
    });
    assert.ok(href.indexOf(PAYLOAD_HREF) === 0);
    assert.ok(href.indexOf("mam=500") !== -1);
    assert.ok(href.indexOf("miro=0") !== -1);
    assert.ok(href.indexOf("freshCap=50") !== -1);
    assert.ok(href.indexOf("freshFill=100") !== -1);
    assert.ok(href.indexOf("bikes=3") !== -1);
    assert.ok(href.indexOf("bikeKg=14") !== -1);
    assert.ok(href.indexOf("rackKg=12") !== -1);
    assert.ok(href.indexOf("gas6=1") !== -1);
    assert.ok(href.indexOf("gas6Full=13") !== -1);
  });

  it("round-trips through the parser", function () {
    const state = {
      mam: 500,
      miro: 0,
      freshCap: 50,
      freshFill: 100,
      bikes: 3,
      bikeKg: 14,
      rackKg: 12
    };
    const href = buildPayloadPrefillHref(state, "/");
    const again = applyPayloadPrefillToState(DEFAULTS, href);
    assert.equal(again.mam, 500);
    assert.equal(again.miro, 0);
    assert.equal(again.freshCap, 50);
    assert.equal(again.freshFill, 100);
    assert.equal(again.bikes, 3);
    assert.equal(again.bikeKg, 14);
    assert.equal(again.rackKg, 12);
    assert.equal(remainingFromState(again), 396);
  });

  it("omits empty kit and does not invent plated weights from a bikes-only state", function () {
    const href = buildPayloadPrefillHref({
      bikes: 3,
      bikeKg: 14,
      rackKg: 12
    }, "/");
    assert.equal(href, "/?bikes=3&bikeKg=14&rackKg=12");
    assert.ok(href.indexOf("mam=") === -1);
    assert.ok(href.indexOf("miro=") === -1);
  });

  it("builds a query string without a path when asked", function () {
    assert.equal(
      buildPayloadPrefillQuery({ bikes: 3, bikeKg: 14, rackKg: 12 }),
      "bikes=3&bikeKg=14&rackKg=12"
    );
  });
});

describe("browser global", function () {
  it("sets PayloadPrefill even when a CommonJS module object exists", function () {
    const sandbox = { module: { exports: {} }, exports: {} };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, "../lib/payload-prefill.js"), "utf8"),
      sandbox
    );
    assert.equal(typeof sandbox.globalThis.PayloadPrefill.parsePayloadPrefillQuery, "function");
    assert.equal(typeof sandbox.globalThis.PayloadPrefill.buildPayloadPrefillHref, "function");
    const patch = sandbox.globalThis.PayloadPrefill.parsePayloadPrefillQuery("?bikes=3");
    assert.equal(patch.bikes, 3);
  });
});

describe("page wiring", function () {
  it("loads the prefill script before app.js and cache-busts both", function () {
    const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
    const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
    assert.match(html, /lib\/payload-prefill\.js\?v=20260918prefill/);
    assert.match(html, /app\.js\?v=20260918prefill/);
    const prefillAt = html.indexOf("lib/payload-prefill.js");
    const appAt = html.indexOf("app.js?v=20260918prefill");
    assert.ok(prefillAt > 0 && appAt > prefillAt, "prefill lib should load before app.js");
    assert.match(app, /applyPayloadPrefillToState/);
    assert.match(app, /buildPayloadPrefillHref/);
    assert.match(app, /remainingPayloadShare/);
  });
});
