/**
 * UK motorhome plate and weighbridge mass limits.
 *
 * Ceiling is 10,000 kg (about 22,046 lb). That covers light campervans,
 * 3,500–4,500 kg motorhomes, C1 vans up to 7,500 kg, and heavy coachbuilts,
 * including a single axle plate or a weighbridge ticket on those vans.
 * It rejects typing errors such as 999999. 10,000 kg itself is accepted;
 * anything above is not.
 *
 * Blank is "not entered". Zero and negatives are errors. A loaded weight
 * above a valid MAM is not a range error — the calculator still reports
 * Over MAM for those realistic overloads.
 *
 * These limits are plate and ticket checks only. They are not tyre pressures
 * and must not be used to invent a cold-pressure figure.
 */
"use strict";

(function (root) {
  var MAX_PLATE_KG = 10000;
  var MAX_PLATE_LABEL = "10,000 kg (22,046 lb)";

  var PLATE_FIELDS = [
    { key: "mam", label: "MAM" },
    { key: "miro", label: "Mass in Service" },
    { key: "actualEmpty", label: "Empty weighbridge ticket" },
    { key: "frontAxle", label: "Front axle rating" },
    { key: "rearAxle", label: "Rear axle rating" },
    { key: "wbFrontAxle", label: "Front axle weighbridge weight" },
    { key: "wbRearAxle", label: "Rear axle weighbridge weight" }
  ];

  function plateKg(value) {
    if (value === "" || value == null) return null;
    var cleaned = String(value).trim().replace(/,/g, "");
    if (cleaned === "") return null;
    var n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }

  function classifyPlateMass(value) {
    if (value === "" || value == null) return "blank";
    if (typeof value === "string" && value.trim() === "") return "blank";
    var n = plateKg(value);
    if (n == null || !Number.isFinite(n) || n <= 0) return "non-positive";
    if (n > MAX_PLATE_KG) return "above-max";
    return "ok";
  }

  function fieldMessage(label, kind) {
    if (kind === "non-positive") return label + " must be above 0 kg.";
    return label + " is above " + MAX_PLATE_LABEL + ". Check the VIN plate or weighbridge ticket.";
  }

  function enteredPlateKg(value) {
    if (classifyPlateMass(value) !== "ok") return null;
    return plateKg(value);
  }

  function assess(values) {
    var src = values || {};
    var errors = {};
    var order = [];
    PLATE_FIELDS.forEach(function (field) {
      var kind = classifyPlateMass(src[field.key]);
      if (kind === "blank" || kind === "ok") return;
      errors[field.key] = fieldMessage(field.label, kind);
      order.push(field.key);
    });
    return {
      errors: errors,
      blocking: order.length > 0,
      summary: order.length ? errors[order[0]] : ""
    };
  }

  /**
   * invalid — a plate or ticket figure is out of range; do not calculate with it.
   * mam-blank — MAM was cleared; the summary must not show 0 kg.
   * ready — plates are blank or inside the ceiling, so a normal result
   *          (including Over MAM) is allowed.
   */
  function resultGate(values) {
    var check = assess(values);
    if (check.blocking) {
      return { mode: "invalid", summary: check.summary, errors: check.errors };
    }
    if (classifyPlateMass(values && values.mam) !== "ok") {
      return {
        mode: "mam-blank",
        summary: "MAM is not entered.",
        errors: check.errors
      };
    }
    return { mode: "ready", summary: "", errors: check.errors };
  }

  var api = {
    MAX_PLATE_KG: MAX_PLATE_KG,
    MAX_PLATE_LABEL: MAX_PLATE_LABEL,
    PLATE_FIELDS: PLATE_FIELDS,
    classifyPlateMass: classifyPlateMass,
    enteredPlateKg: enteredPlateKg,
    assess: assess,
    resultGate: resultGate
  };
  root.MassLimits = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
