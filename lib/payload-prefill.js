/**
 * Payload URL prefill contract (Ask / share links).
 *
 * Recognised query params — unknown keys are ignored. A param only
 * overrides the existing calculator field when it is present and valid.
 * Apply the patch onto calculator state after defaults, then recompute;
 * do not invent plated MAM / MIRO or tyre pressures.
 *
 *   mam            number — Maximum Authorised Mass kg
 *   miro           number — Mass in Service / empty base kg
 *                  (0 is valid: Ask remaining-payload mode)
 *   actualEmpty    number — optional empty weighbridge kg
 *   freshCap       litres
 *   freshFill      0–100 (default 100 if freshCap set)
 *   bikes          count
 *   bikeKg         kg each
 *   rackKg         kg
 *   gas6 / gas9 / gas13
 *                  bottle counts
 *   gas6Full / gas9Full / gas13Full
 *                  full-bottle kg overrides
 *
 * Ask remaining-payload: “500 kg payload” is sent as mam=500 (and
 * sometimes miro=0). Ask’s live href omits miro=0 because it only
 * emits van limits when the number is > 0. When mam arrives without
 * a plated miro or weighbridge ticket, do not invent a plated MIRO —
 * treat miro as 0 so remaining = mam − named items. First-paint
 * extras Ask does not send (extra adult, default gas, LiFePO4,
 * toolbox, food, misc, …) are cleared in that mode so remaining
 * after bikes matches Ask (500 − 50 − 42 − 12 ≈ 396).
 *
 * Parse with parsePayloadPrefillQuery(search).
 * Merge with applyPayloadPrefillToState(state, search).
 * Build with buildPayloadPrefillHref(state) → Ask field names.
 */
"use strict";

(function (root) {
  var PAYLOAD_PREFILL_KEYS = [
    "mam",
    "miro",
    "actualEmpty",
    "freshCap",
    "freshFill",
    "bikes",
    "bikeKg",
    "rackKg",
    "gas6",
    "gas6Full",
    "gas9",
    "gas9Full",
    "gas13",
    "gas13Full"
  ];

  var PAYLOAD_HREF = "https://motorhomepayload.co.uk/";

  /**
   * First-paint extras Ask does not copy. Applied only for remaining-
   * payload share links (mam + miro 0 / omitted) so remaining matches
   * Ask maths. Unit weights (bikeKg, gas6Full, …) stay on defaults.
   */
  var REMAINING_PAYLOAD_SHARE_EXTRAS = {
    extraAdults: 0,
    children: 0,
    pets: 0,
    freshCap: 0,
    freshFill: 0,
    greyFill: 0,
    blackFill: 0,
    gas6: 0,
    gas9: 0,
    gas13: 0,
    battType: "none",
    battQty: 0,
    solarType: "none",
    solarQty: 0,
    inverterKg: 0,
    elecExtrasKg: 0,
    awning: false,
    bikes: 0,
    ramps: false,
    furniture: false,
    generator: false,
    toolbox: false,
    foodPeople: 0,
    miscKg: 0
  };

  function decodeQueryPart(value) {
    try {
      return decodeURIComponent(String(value).replace(/\+/g, " "));
    } catch (err) {
      return String(value).replace(/\+/g, " ");
    }
  }

  function queryParamsFromSearch(input) {
    if (input == null || input === "") return {};
    if (typeof input === "object") {
      if (typeof input.get === "function") {
        var fromSearch = {};
        if (typeof input.forEach === "function") {
          input.forEach(function (value, key) {
            fromSearch[key] = value;
          });
          return fromSearch;
        }
        PAYLOAD_PREFILL_KEYS.forEach(function (key) {
          if (typeof input.has === "function" && input.has(key)) {
            fromSearch[key] = input.get(key);
          }
        });
        return fromSearch;
      }
      return input;
    }

    var search = String(input);
    var qMark = search.indexOf("?");
    if (qMark >= 0) search = search.slice(qMark + 1);
    var hash = search.indexOf("#");
    if (hash >= 0) search = search.slice(0, hash);
    var out = {};
    if (!search) return out;
    search.split("&").forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf("=");
      var rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
      var rawValue = eq >= 0 ? pair.slice(eq + 1) : "";
      var key = decodeQueryPart(rawKey);
      if (key) out[key] = decodeQueryPart(rawValue);
    });
    return out;
  }

  function hasOwnParam(params, key) {
    return !!(params && Object.prototype.hasOwnProperty.call(params, key));
  }

  function parseQueryNumber(value) {
    if (value == null) return undefined;
    var trimmed = String(value).trim();
    if (trimmed === "") return undefined;
    var n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }

  function parseNonNegative(value) {
    var n = parseQueryNumber(value);
    if (n == null || n < 0) return undefined;
    return n;
  }

  function parsePositive(value) {
    var n = parseQueryNumber(value);
    if (n == null || n <= 0) return undefined;
    return n;
  }

  function parseFillPct(value) {
    var n = parseQueryNumber(value);
    if (n == null || n < 0 || n > 100) return undefined;
    return n;
  }

  function parseCount(value) {
    var n = parseNonNegative(value);
    if (n == null) return undefined;
    return Math.round(n);
  }

  function num(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function parsePayloadPrefillQuery(search) {
    var params = queryParamsFromSearch(search);
    var patch = {};

    if (hasOwnParam(params, "mam")) {
      var mam = parseNonNegative(params.mam);
      if (mam != null) patch.mam = mam;
    }
    if (hasOwnParam(params, "miro")) {
      var miro = parseNonNegative(params.miro);
      if (miro != null) patch.miro = miro;
    }
    if (hasOwnParam(params, "actualEmpty")) {
      var actualEmpty = parsePositive(params.actualEmpty);
      if (actualEmpty != null) patch.actualEmpty = actualEmpty;
    }
    if (hasOwnParam(params, "freshCap")) {
      var freshCap = parseNonNegative(params.freshCap);
      if (freshCap != null) patch.freshCap = freshCap;
    }
    if (hasOwnParam(params, "freshFill")) {
      var freshFill = parseFillPct(params.freshFill);
      if (freshFill != null) patch.freshFill = freshFill;
    }
    if (hasOwnParam(params, "bikes")) {
      var bikes = parseCount(params.bikes);
      if (bikes != null) patch.bikes = bikes;
    }
    if (hasOwnParam(params, "bikeKg")) {
      var bikeKg = parseNonNegative(params.bikeKg);
      if (bikeKg != null) patch.bikeKg = bikeKg;
    }
    if (hasOwnParam(params, "rackKg")) {
      var rackKg = parseNonNegative(params.rackKg);
      if (rackKg != null) patch.rackKg = rackKg;
    }

    ["gas6", "gas9", "gas13"].forEach(function (key) {
      if (!hasOwnParam(params, key)) return;
      var qty = parseCount(params[key]);
      if (qty != null) patch[key] = qty;
    });
    ["gas6Full", "gas9Full", "gas13Full"].forEach(function (key) {
      if (!hasOwnParam(params, key)) return;
      var kg = parsePositive(params[key]);
      if (kg != null) patch[key] = kg;
    });

    if (patch.freshCap != null && patch.freshFill == null) {
      patch.freshFill = 100;
    }

    return Object.keys(patch).length ? patch : null;
  }

  function isRemainingPayloadShare(patch) {
    if (!patch || patch.mam == null) return false;
    if (patch.actualEmpty != null && Number(patch.actualEmpty) > 0) return false;
    if (patch.miro == null) return true;
    return Number(patch.miro) === 0;
  }

  function copyState(raw) {
    var copy = {};
    var source = raw && typeof raw === "object" ? raw : {};
    Object.keys(source).forEach(function (key) {
      copy[key] = source[key];
    });
    return copy;
  }

  function applyPayloadPrefillToState(state, search) {
    var patch = parsePayloadPrefillQuery(search);
    if (!patch) return null;

    var merged = copyState(state);
    if (isRemainingPayloadShare(patch)) {
      Object.keys(REMAINING_PAYLOAD_SHARE_EXTRAS).forEach(function (key) {
        merged[key] = REMAINING_PAYLOAD_SHARE_EXTRAS[key];
      });
      if (patch.miro == null && patch.actualEmpty == null) {
        merged.miro = 0;
      }
      merged.remainingPayloadShare = true;
    }

    Object.keys(patch).forEach(function (key) {
      merged[key] = patch[key];
    });
    return merged;
  }

  function addPrefillParam(parts, key, value) {
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
  }

  function buildPayloadPrefillQuery(state) {
    var s = state && typeof state === "object" ? state : {};
    var parts = [];

    if (parseNonNegative(s.mam) != null && num(s.mam) > 0) {
      addPrefillParam(parts, "mam", num(s.mam));
    }
    if (parseNonNegative(s.miro) != null) {
      if (num(s.miro) > 0 || (num(s.mam) > 0 && num(s.miro) === 0)) {
        addPrefillParam(parts, "miro", num(s.miro));
      }
    }
    if (parsePositive(s.actualEmpty) != null) {
      addPrefillParam(parts, "actualEmpty", num(s.actualEmpty));
    }
    if (num(s.freshCap) > 0) {
      addPrefillParam(parts, "freshCap", num(s.freshCap));
      addPrefillParam(parts, "freshFill", s.freshFill == null || s.freshFill === "" ? 100 : num(s.freshFill));
    }
    [
      ["gas6", "gas6Full"],
      ["gas9", "gas9Full"],
      ["gas13", "gas13Full"]
    ].forEach(function (pair) {
      if (num(s[pair[0]]) > 0) {
        addPrefillParam(parts, pair[0], num(s[pair[0]]));
        if (num(s[pair[1]]) > 0) addPrefillParam(parts, pair[1], num(s[pair[1]]));
      }
    });
    if (num(s.bikes) > 0) {
      addPrefillParam(parts, "bikes", num(s.bikes));
      if (num(s.bikeKg) > 0) addPrefillParam(parts, "bikeKg", num(s.bikeKg));
      if (num(s.rackKg) > 0) addPrefillParam(parts, "rackKg", num(s.rackKg));
    }

    return parts.join("&");
  }

  function buildPayloadPrefillHref(state, base) {
    var query = buildPayloadPrefillQuery(state);
    var path = base == null || base === "" ? PAYLOAD_HREF : String(base);
    return query ? path.replace(/\?$/, "") + (path.indexOf("?") >= 0 ? "&" : "?") + query : path;
  }

  var api = {
    PAYLOAD_PREFILL_KEYS: PAYLOAD_PREFILL_KEYS,
    PAYLOAD_HREF: PAYLOAD_HREF,
    REMAINING_PAYLOAD_SHARE_EXTRAS: REMAINING_PAYLOAD_SHARE_EXTRAS,
    parsePayloadPrefillQuery: parsePayloadPrefillQuery,
    applyPayloadPrefillToState: applyPayloadPrefillToState,
    isRemainingPayloadShare: isRemainingPayloadShare,
    buildPayloadPrefillQuery: buildPayloadPrefillQuery,
    buildPayloadPrefillHref: buildPayloadPrefillHref
  };
  root.PayloadPrefill = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
