/**
 * Mass in Service (V5 / MIRO) presence.
 * After a live plate lookup the stored value is cleared. The input can still
 * show a number (typed, autofilled, or kept while another control is changed)
 * without state.miro being updated — treat that visible figure as entered.
 *
 * Wrapped in an IIFE so `const`/`function` names are not shared with the
 * other classic script tags (duplicate `const api` is a SyntaxError).
 */
(function (root) {
  "use strict";

  function parseWeightInput(value) {
    if (value === "" || value == null) return null;
    var cleaned = String(value).trim().replace(/,/g, "");
    if (cleaned === "") return null;
    var n = parseFloat(cleaned);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function isMissing(stateMiro, fieldValue, actualEmpty) {
    if (Number(actualEmpty) > 0) return false;
    if (parseWeightInput(fieldValue) != null) return false;
    if (parseWeightInput(stateMiro) != null) return false;
    return true;
  }

  /** Prefer the number in the box; fall back to stored state. */
  function visibleOrStored(fieldValue, stateMiro) {
    var fromField = parseWeightInput(fieldValue);
    if (fromField != null) return fromField;
    return parseWeightInput(stateMiro);
  }

  var api = { parseWeightInput: parseWeightInput, isMissing: isMissing, visibleOrStored: visibleOrStored };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MassInService = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
