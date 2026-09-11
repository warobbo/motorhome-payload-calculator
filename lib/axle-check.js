/**
 * Plate axle ratings are first-class limits, not invented loads.
 * Weighbridge front/rear kg are measured weights — never guessed from kit.
 * Pass/fail only when both plate limits AND weighbridge weights are present.
 */
"use strict";

(function (root) {
  var MODE_EMPTY = "empty";
  var MODE_LOADED = "loaded";
  var SANITY_MIN_KG = 150;
  var SANITY_PCT = 0.08;

  function hasRating(value) {
    var n = Number(value);
    return Number.isFinite(n) && n > 0;
  }

  function hasPair(front, rear) {
    return hasRating(front) && hasRating(rear);
  }

  function isIncomplete(front, rear) {
    return !hasPair(front, rear);
  }

  function cautionLabel() {
    return "MAM check only — axle check incomplete";
  }

  function cautionDetail() {
    return "Enter both front and rear axle ratings from the VIN plate. This page does not invent axle loads.";
  }

  function normalizeMode(mode) {
    return mode === MODE_EMPTY ? MODE_EMPTY : MODE_LOADED;
  }

  function modeNote(mode) {
    return normalizeMode(mode) === MODE_EMPTY
      ? "Base van — does not prove trip legality; use Loaded for roadside check"
      : "As driven — front/rear vs VIN plate";
  }

  function completeness(input) {
    var limits = hasPair(input && input.frontLimit, input && input.rearLimit);
    var weights = hasPair(input && input.frontWeight, input && input.rearWeight);
    if (!limits && !weights) return "mam-only";
    if (limits && !weights) return "limits-only";
    if (!limits && weights) return "weights-only";
    return "complete";
  }

  function incompleteCopy(kind) {
    if (kind === "limits-only") {
      return {
        label: "Axle check incomplete",
        detail: "Axle check needs weighbridge front/rear weights"
      };
    }
    if (kind === "weights-only") {
      return {
        label: "Axle check incomplete",
        detail: "Enter VIN plate axle limits to check"
      };
    }
    return {
      label: cautionLabel(),
      detail: cautionDetail()
    };
  }

  function sanityMismatch(frontWeight, rearWeight, knownTotal) {
    if (!hasPair(frontWeight, rearWeight) || !hasRating(knownTotal)) return false;
    var sum = Number(frontWeight) + Number(rearWeight);
    var known = Number(knownTotal);
    var delta = Math.abs(sum - known);
    var threshold = Math.max(SANITY_MIN_KG, SANITY_PCT * Math.max(sum, known));
    return delta > threshold;
  }

  function sanityDetail() {
    return "Front plus rear is a long way from the total mass you entered. Check the ticket figures.";
  }

  function tyresLinkCopy(hasWeights) {
    return hasWeights
      ? "Use these weights in the Tyres tool (weighbridge figures, not the VIN plate ratings)."
      : "Fitted different tyres? Use the Tyres tool with your axle weights (weighbridge figures, not the VIN plate ratings).";
  }

  function evaluate(input) {
    var src = input || {};
    var mode = normalizeMode(src.mode);
    var kind = completeness(src);
    var note = modeNote(mode);
    var knownTotal = src.knownTotal;
    var sanity = kind === "complete"
      ? sanityMismatch(src.frontWeight, src.rearWeight, knownTotal)
      : (hasPair(src.frontWeight, src.rearWeight)
        ? sanityMismatch(src.frontWeight, src.rearWeight, knownTotal)
        : false);

    if (kind !== "complete") {
      var copy = incompleteCopy(kind);
      return {
        status: "incomplete",
        incompleteKind: kind,
        mode: mode,
        modeNote: note,
        frontOver: false,
        rearOver: false,
        loudFail: false,
        label: copy.label,
        detail: copy.detail,
        sanityFlag: sanity,
        sanityDetail: sanity ? sanityDetail() : "",
        tyresLink: tyresLinkCopy(kind === "weights-only")
      };
    }

    var frontOver = Number(src.frontWeight) > Number(src.frontLimit);
    var rearOver = Number(src.rearWeight) > Number(src.rearLimit);
    var fail = frontOver || rearOver;
    var label;
    var detail;
    if (fail && rearOver) {
      label = "Rear axle over — fail";
      detail = mode === MODE_LOADED
        ? "Rear over the VIN plate even if total MAM is OK. Do not drive until you lose rear weight."
        : "Rear axle is over the VIN plate on this empty ticket. That is a fail — use Loaded for a roadside check.";
    } else if (fail) {
      label = "Front axle over — fail";
      detail = mode === MODE_LOADED
        ? "Front axle is over the VIN plate. That is a fail even if total MAM is OK."
        : "Front axle is over the VIN plate on this empty ticket. That is a fail — use Loaded for a roadside check.";
    } else {
      label = mode === MODE_EMPTY ? "Pass (base van)" : "Pass";
      detail = note;
    }

    return {
      status: fail ? "fail" : "pass",
      incompleteKind: null,
      mode: mode,
      modeNote: note,
      frontOver: frontOver,
      rearOver: rearOver,
      loudFail: fail,
      label: label,
      detail: detail,
      sanityFlag: sanity,
      sanityDetail: sanity ? sanityDetail() : "",
      tyresLink: tyresLinkCopy(true)
    };
  }

  var api = {
    MODE_EMPTY: MODE_EMPTY,
    MODE_LOADED: MODE_LOADED,
    hasRating: hasRating,
    hasPair: hasPair,
    isIncomplete: isIncomplete,
    cautionLabel: cautionLabel,
    cautionDetail: cautionDetail,
    normalizeMode: normalizeMode,
    modeNote: modeNote,
    completeness: completeness,
    incompleteCopy: incompleteCopy,
    sanityMismatch: sanityMismatch,
    tyresLinkCopy: tyresLinkCopy,
    evaluate: evaluate
  };
  root.AxleCheck = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
