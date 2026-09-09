/**
 * Fuel to add on top of the empty-van base.
 * Mass in Service / handbook MIRO already includes ~90% diesel.
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
  if (usingWeighedEmpty(opts)) return false;
  return !!(opts && opts.miroIncludesFuel);
}

/**
 * Weight to add to the running total and the breakdown.
 * Tick on + Mass in Service: only litres above 90% (never negative).
 * Weighed empty, or tick off: the whole tank contents.
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
  return includesFuelInBase(opts) ? "Fuel (above Mass in Service)" : "Fuel";
}

const api = { fuelActualKg, fuelPayloadKg, fuelBreakdownLabel, includesFuelInBase };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  globalThis.FuelPayload = api;
}
