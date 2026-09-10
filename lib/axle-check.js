/**
 * Plate axle ratings are first-class limits, not invented loads.
 * Blank ratings mean MAM-only — we never guess front/rear distribution.
 */
"use strict";

(function (root) {
  function hasRating(value) {
    var n = Number(value);
    return Number.isFinite(n) && n > 0;
  }

  function isIncomplete(front, rear) {
    return !hasRating(front) || !hasRating(rear);
  }

  function cautionLabel() {
    return "MAM check only — axle check incomplete";
  }

  function cautionDetail() {
    return "Enter both front and rear axle ratings from the VIN plate. This page does not invent axle loads.";
  }

  var api = {
    hasRating: hasRating,
    isIncomplete: isIncomplete,
    cautionLabel: cautionLabel,
    cautionDetail: cautionDetail
  };
  root.AxleCheck = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
