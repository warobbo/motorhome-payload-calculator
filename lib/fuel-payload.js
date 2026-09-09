/**
 * Fuel to add on top of the empty-van base.
 * Mass in Service always includes ~90% diesel. No optional tick.
 */
"use strict";

function fuelActualKg(opts) {
  const cap = Number(opts && opts.fuelCap);
  const fillPct = Number(opts && opts.fuelFill);
  const density = Number(opts && opts.fuelDensity);
  const actual = cap * fillPct / 100 * density;
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
  const actual = fuelActualKg(opts);
  if (!includesFuelInBase(opts)) return actual;
  const cap = Number(opts.fuelCap) || 0;
  const density = Number(opts.fuelDensity) || 0;
  const inBase = cap * 0.9 * density;
  const extra = actual - inBase;
  return extra > 0 ? extra : 0;
}

function fuelBreakdownLabel(opts) {
  return includesFuelInBase(opts)
    ? "Fuel (above Mass in Service)"
    : "Fuel (full tank — not in weighed empty)";
}

const api = { fuelActualKg, fuelPayloadKg, fuelBreakdownLabel, includesFuelInBase };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== "undefined") {
  globalThis.FuelPayload = api;
}
