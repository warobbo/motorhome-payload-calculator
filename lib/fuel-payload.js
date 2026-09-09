/**
 * Fuel to add on top of the empty-van base.
 * Mass in Service always includes ~90% diesel. No optional tick.
 *
 * Wrapped in an IIFE so names are not shared with the other classic scripts.
 */
(function (root) {
  "use strict";

  function fuelActualKg(opts) {
    var cap = Number(opts && opts.fuelCap);
    var fillPct = Number(opts && opts.fuelFill);
    var density = Number(opts && opts.fuelDensity);
    var actual = cap * fillPct / 100 * density;
    return Number.isFinite(actual) && actual > 0 ? actual : 0;
  }

  function usingWeighedEmpty(opts) {
    return Number(opts && opts.actualEmpty) > 0;
  }

  function includesFuelInBase(opts) {
    return !usingWeighedEmpty(opts);
  }

  /**
   * Mass in Service path: only litres above 90% (never negative).
   * Weighed-empty path: the whole tank, because that ticket has no fuel in it.
   */
  function fuelPayloadKg(opts) {
    var actual = fuelActualKg(opts);
    if (!includesFuelInBase(opts)) return actual;
    var cap = Number(opts.fuelCap) || 0;
    var density = Number(opts.fuelDensity) || 0;
    var inBase = cap * 0.9 * density;
    var extra = actual - inBase;
    return extra > 0 ? extra : 0;
  }

  function fuelBreakdownLabel(opts) {
    return includesFuelInBase(opts)
      ? "Fuel (above Mass in Service)"
      : "Fuel (full tank — not in weighed empty)";
  }

  var api = {
    fuelActualKg: fuelActualKg,
    fuelPayloadKg: fuelPayloadKg,
    fuelBreakdownLabel: fuelBreakdownLabel,
    includesFuelInBase: includesFuelInBase
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FuelPayload = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
