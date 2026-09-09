/**
 * Driver kg to add on top of the empty-van base.
 * Mass in Service assumes a 75 kg driver; only the extra is added.
 * A weighed-empty ticket is van-only, so the full driver is added.
 */
"use strict";

const ASSUMED_DRIVER_KG = 75;

function usingWeighedEmpty(opts) {
  return Number(opts && opts.actualEmpty) > 0;
}

function driverPayloadKg(opts) {
  const kg = Number(opts && opts.driverKg);
  const actual = Number.isFinite(kg) && kg > 0 ? kg : 0;
  if (usingWeighedEmpty(opts)) return actual;
  const extra = actual - ASSUMED_DRIVER_KG;
  return extra > 0 ? extra : 0;
}

const api = { ASSUMED_DRIVER_KG, driverPayloadKg };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== "undefined") {
  globalThis.DriverPayload = api;
}
