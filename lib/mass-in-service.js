/**
 * Mass in Service (V5 / MIRO) presence.
 * After a live plate lookup the stored value is cleared. The input can still
 * show a number (typed, autofilled, or kept while another control is changed)
 * without state.miro being updated — treat that visible figure as entered.
 */
"use strict";

(function (root) {
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

  var api = { parseWeightInput: parseWeightInput, isMissing: isMissing };
  root.MassInService = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
