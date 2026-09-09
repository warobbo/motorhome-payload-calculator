/**
 * Tyre helpers for the Payload hub: bar/PSI, sidewall decode, load-index kg.
 * Industry-standard load-index → kg table (ETRTO / ISO). Not a pressure chart.
 */
"use strict";

(function (root) {
  var BAR_TO_PSI = 14.503773773;

  /**
   * Load index → kg at the tyre's reference pressure.
   * Public ETRTO / ISO / tyre-industry values. Not a maker's fitment table.
   */
  var LOAD_INDEX_KG = {
    70: 335, 71: 345, 72: 355, 73: 365, 74: 375,
    75: 387, 76: 400, 77: 412, 78: 425, 79: 437,
    80: 450, 81: 462, 82: 475, 83: 487, 84: 500,
    85: 515, 86: 530, 87: 545, 88: 560, 89: 580,
    90: 600, 91: 615, 92: 630, 93: 650, 94: 670,
    95: 690, 96: 710, 97: 730, 98: 750, 99: 775,
    100: 800, 101: 825, 102: 850, 103: 875, 104: 900,
    105: 925, 106: 950, 107: 975, 108: 1000, 109: 1030,
    110: 1060, 111: 1090, 112: 1120, 113: 1150, 114: 1180,
    115: 1215, 116: 1250, 117: 1285, 118: 1320, 119: 1360,
    120: 1400, 121: 1450, 122: 1500, 123: 1550, 124: 1600,
    125: 1650, 126: 1700, 127: 1750, 128: 1800, 129: 1850,
    130: 1900, 131: 1950, 132: 2000, 133: 2060, 134: 2120,
    135: 2180, 136: 2240, 137: 2300, 138: 2360, 139: 2430,
    140: 2500, 141: 2575, 142: 2650, 143: 2725, 144: 2800,
    145: 2900, 146: 3000, 147: 3075, 148: 3150, 149: 3250,
    150: 3350
  };

  var SPEED_KMH = {
    L: 120, M: 130, N: 140, P: 150, Q: 160, R: 170,
    S: 180, T: 190, U: 200, H: 210, V: 240, W: 270, Y: 300
  };

  function toFiniteNumber(value) {
    if (value === "" || value == null) return null;
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function barToPsi(bar) {
    var n = toFiniteNumber(bar);
    if (n == null) return null;
    return n * BAR_TO_PSI;
  }

  function psiToBar(psi) {
    var n = toFiniteNumber(psi);
    if (n == null) return null;
    return n / BAR_TO_PSI;
  }

  function roundBar(bar) {
    var n = toFiniteNumber(bar);
    if (n == null) return null;
    return Math.round(n * 100) / 100;
  }

  function roundPsi(psi) {
    var n = toFiniteNumber(psi);
    if (n == null) return null;
    return Math.round(n * 10) / 10;
  }

  function loadIndexToKg(index) {
    var n = toFiniteNumber(index);
    if (n == null) return null;
    var key = Math.round(n);
    if (!Object.prototype.hasOwnProperty.call(LOAD_INDEX_KG, key)) return null;
    return LOAD_INDEX_KG[key];
  }

  function speedRatingInfo(letter) {
    if (!letter) return null;
    var code = String(letter).trim().toUpperCase();
    if (code === "ZR") {
      return { code: "ZR", kmh: 240, mph: 149, note: "over 240 km/h (about 149 mph)" };
    }
    if (!Object.prototype.hasOwnProperty.call(SPEED_KMH, code)) return null;
    var kmh = SPEED_KMH[code];
    return {
      code: code,
      kmh: kmh,
      mph: Math.round(kmh / 1.609344)
    };
  }

  function parseSidewall(raw) {
    if (raw == null) return { ok: false, error: "empty" };
    var text = String(raw).trim().toUpperCase();
    text = text.replace(/,/g, " ").replace(/\s+/g, " ");
    if (!text) return { ok: false, error: "empty" };

    text = text.replace(/^(LT|P)\s+/, "");
    text = text.replace(/^(LT|P)(?=\d{3}\s*\/)/, "");

    var re = /^(\d{3})\s*\/\s*(\d{2,3})\s*(ZR|R|D|B|-)?\s*(\d{2})(?:\s*[X×]\s*\d{1,2}(?:\.\d)?)?\s*(CP|C|LT)?(?:\s+(?:XL|RF|REINFORCED|EXTRA\s+LOAD))?(?:\s+(\d{2,3})(?:\s*\/\s*(\d{2,3}))?)?(?:\s*([A-Z]{1,2}))?\s*$/;
    var m = text.match(re);
    if (!m) return { ok: false, error: "unrecognised" };

    var widthMm = Number(m[1]);
    var aspect = Number(m[2]);
    var construction = m[3] && m[3] !== "-" ? m[3] : (m[3] === "-" ? "D" : "R");
    var rimIn = Number(m[4]);
    var service = m[5] || "";
    var loadIndex = m[6] ? Number(m[6]) : null;
    var dualLoadIndex = m[7] ? Number(m[7]) : null;
    var speedCode = m[8] || "";

    if (speedCode === "C" && !service) {
      service = "C";
      speedCode = "";
    }
    if (speedCode === "LT" && !service) {
      service = "LT";
      speedCode = "";
    }
    if (speedCode === "CP" && !service) {
      service = "CP";
      speedCode = "";
    }

    var speed = speedRatingInfo(speedCode);
    if (speedCode && !speed && speedCode !== "C" && speedCode !== "LT" && speedCode !== "CP") {
      return { ok: false, error: "unknown-speed" };
    }

    if (loadIndex != null && loadIndexToKg(loadIndex) == null) {
      return { ok: false, error: "unknown-load-index" };
    }
    if (dualLoadIndex != null && loadIndexToKg(dualLoadIndex) == null) {
      return { ok: false, error: "unknown-load-index" };
    }

    var extraLoad = /\b(XL|RF|REINFORCED|EXTRA\s+LOAD)\b/.test(text);

    return {
      ok: true,
      raw: String(raw).trim(),
      widthMm: widthMm,
      aspect: aspect,
      construction: construction,
      rimIn: rimIn,
      service: service,
      extraLoad: extraLoad,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      speedCode: speed ? speed.code : (speedCode || null),
      speed: speed
    };
  }

  function constructionLabel(code) {
    if (code === "R" || code === "ZR") return "radial";
    if (code === "D") return "diagonal (cross-ply)";
    if (code === "B") return "bias-belted";
    return "radial";
  }

  function serviceLabel(service) {
    if (service === "CP") {
      return "CP (camping) — a motorhome / camper tyre, including higher load when the van is parked.";
    }
    if (service === "C") {
      return "C-rated commercial tyre — built for heavier vans than a car tyre of the same size.";
    }
    if (service === "LT") {
      return "LT (light truck) marking — a commercial / van tyre, similar idea to a C-rating.";
    }
    return "No C or CP mark — often a passenger car tyre. Check it is approved for your van’s load.";
  }

  function describeSidewall(parsed) {
    if (!parsed || !parsed.ok) return null;
    var size = parsed.widthMm + " mm wide, sidewall height " + parsed.aspect +
      "% of that width, to fit a " + parsed.rimIn + "-inch wheel (" +
      constructionLabel(parsed.construction) + ").";

    var load = null;
    if (parsed.loadIndex != null) {
      var singleKg = loadIndexToKg(parsed.loadIndex);
      load = "Load index " + parsed.loadIndex + " is " + singleKg + " kg on a single tyre.";
      if (parsed.dualLoadIndex != null) {
        var dualKg = loadIndexToKg(parsed.dualLoadIndex);
        load += " The second figure (" + parsed.dualLoadIndex + ") is " + dualKg +
          " kg each when the axle has dual wheels (two tyres per side).";
      }
    }

    var speed = null;
    if (parsed.speed) {
      if (parsed.speed.note) {
        speed = "Speed rating " + parsed.speed.code + " means " + parsed.speed.note + ".";
      } else {
        speed = "Speed rating " + parsed.speed.code + " means up to " + parsed.speed.kmh +
          " km/h (about " + parsed.speed.mph + " mph) at the tyre’s reference load.";
      }
    }

    return {
      size: size,
      service: serviceLabel(parsed.service),
      extraLoad: parsed.extraLoad ? "Marked XL / reinforced — a higher load version of that size, still not a substitute for the van’s plate." : null,
      load: load,
      speed: speed
    };
  }

  /**
   * Light axle-capacity check from load indices. Not a legal or maker approval.
   *
   * Dual load index is used only when there are 4+ tyres on the axle.
   */
  function checkAxleCapacity(opts) {
    opts = opts || {};
    var axleLoadKg = toFiniteNumber(opts.axleLoadKg);
    var tyresOnAxle = toFiniteNumber(opts.tyresOnAxle);
    var loadIndex = toFiniteNumber(opts.loadIndex);
    var dualLoadIndex = toFiniteNumber(opts.dualLoadIndex);

    if (tyresOnAxle == null || tyresOnAxle <= 0 || Math.round(tyresOnAxle) !== tyresOnAxle) {
      return { ok: false, error: "tyres" };
    }
    tyresOnAxle = Math.round(tyresOnAxle);

    var useDual = tyresOnAxle >= 4 && dualLoadIndex != null;
    var usedIndex = useDual ? dualLoadIndex : loadIndex;
    if (usedIndex == null) {
      return { ok: false, error: useDual ? "dual-load-index" : "load-index" };
    }

    var kgEach = loadIndexToKg(usedIndex);
    if (kgEach == null) {
      return { ok: false, error: "unknown-load-index" };
    }

    var capacityKg = kgEach * tyresOnAxle;
    var missingLoad = axleLoadKg == null || axleLoadKg <= 0;
    if (missingLoad) {
      return {
        ok: true,
        status: "need-load",
        useDual: useDual,
        usedIndex: usedIndex,
        kgEach: kgEach,
        tyresOnAxle: tyresOnAxle,
        capacityKg: capacityKg,
        axleLoadKg: null,
        marginKg: null
      };
    }

    var marginKg = Math.round((capacityKg - axleLoadKg) * 10) / 10;
    var ratio = axleLoadKg / capacityKg;
    var status;
    if (marginKg < 0) status = "over";
    else if (marginKg === 0 || ratio >= 0.95) status = "tight";
    else status = "ok";

    return {
      ok: true,
      status: status,
      useDual: useDual,
      usedIndex: usedIndex,
      kgEach: kgEach,
      tyresOnAxle: tyresOnAxle,
      capacityKg: capacityKg,
      axleLoadKg: axleLoadKg,
      marginKg: marginKg,
      dualFallback: tyresOnAxle >= 4 && dualLoadIndex == null
    };
  }

  var api = {
    BAR_TO_PSI: BAR_TO_PSI,
    LOAD_INDEX_KG: LOAD_INDEX_KG,
    barToPsi: barToPsi,
    psiToBar: psiToBar,
    roundBar: roundBar,
    roundPsi: roundPsi,
    loadIndexToKg: loadIndexToKg,
    speedRatingInfo: speedRatingInfo,
    parseSidewall: parseSidewall,
    describeSidewall: describeSidewall,
    checkAxleCapacity: checkAxleCapacity
  };

  root.TyreCalc = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
