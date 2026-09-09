/**
 * Driver kg to add on top of the empty-van base.
 * Mass in Service assumes a 75 kg driver; only the extra is added.
 * A weighed-empty ticket is van-only, so the full driver is added.
 *
 * Wrapped in an IIFE so names are not shared with the other classic scripts.
 */
(function (root) {
  "use strict";

  var ASSUMED_DRIVER_KG = 75;

  function usingWeighedEmpty(opts) {
    return Number(opts && opts.actualEmpty) > 0;
  }

  function driverPayloadKg(opts) {
    var kg = Number(opts && opts.driverKg);
    var actual = Number.isFinite(kg) && kg > 0 ? kg : 0;
    if (usingWeighedEmpty(opts)) return actual;
    var extra = actual - ASSUMED_DRIVER_KG;
    return extra > 0 ? extra : 0;
  }

  var api = { ASSUMED_DRIVER_KG: ASSUMED_DRIVER_KG, driverPayloadKg: driverPayloadKg };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DriverPayload = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
