/**
 * Driver kg to add on top of the empty-van base.
 * Mass in Service assumes a 75 kg driver; the difference is added
 * (or taken off if the driver is lighter). A blank or zero driver
 * is left unadjusted so 75 kg is not subtracted by default.
 * A weighed-empty ticket is van-only, so the full driver is added.
 */
"use strict";

(function (root) {
  const ASSUMED_DRIVER_KG = 75;

  function usingWeighedEmpty(opts) {
    return Number(opts && opts.actualEmpty) > 0;
  }

  function driverPayloadKg(opts) {
    const kg = Number(opts && opts.driverKg);
    const actual = Number.isFinite(kg) && kg > 0 ? kg : 0;
    if (usingWeighedEmpty(opts)) return actual;
    if (actual === 0) return 0;
    return actual - ASSUMED_DRIVER_KG;
  }

  var api = { ASSUMED_DRIVER_KG: ASSUMED_DRIVER_KG, driverPayloadKg: driverPayloadKg };
  root.DriverPayload = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
