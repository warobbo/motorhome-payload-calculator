/**
 * Tyre helpers for the Payload hub: bar/PSI, sidewall decode, load-index kg,
 * and cold-inflation lookup from the right published family table.
 *
 * Pressure sources (FAQ and comments must stay in sync):
 * - LT-metric sizes we embed (first: LT265/65R17): TRA / industry Light Truck
 *   load & inflation table. Rows are Single/Dual pounds at PSI. Converted to
 *   kg in code. Headline pressure is the lowest published PSI whose capacity
 *   covers the load. Capacity between PSI steps is linearly interpolated.
 *   Never invent below 35 PSI or above 80 PSI for this size.
 * - C / CP marked van tyres: ETRTO C-type load–pressure relationship
 *   L / L_ref = (P / P_ref)^0.8, so P = P_ref × (L / L_ref)^1.25
 *   at 3.75 bar (optional 4.50 bar van marking).
 * - P-metric: detected, but no inflation table is invented for a size we
 *   do not embed.
 * Not a fake branded PDF. Fitter + the tyre maker’s own chart still win.
 */
"use strict";

(function (root) {
  var BAR_TO_PSI = 14.503773773;
  var LB_TO_KG = 0.45359237;
  var KG_TO_LB = 1 / LB_TO_KG;

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

  /** Inverse of the ETRTO/ISO 0.8 load–pressure exponent. */
  var PRESSURE_EXPONENT = 1.25;

  /**
   * Published reference charts. pmaxBar defaults to prefBar: the load index
   * is the cap. Extra pressure does not raise rated capacity above L_ref.
   */
  var PRESSURE_CHARTS = {
    passenger: {
      id: "passenger",
      prefBar: 2.5,
      pminBar: 1.5,
      pmaxBar: 2.5,
      label: "Passenger / standard load (load index at 2.50 bar)",
      source: "ETRTO / ISO passenger chart — standard load reference 250 kPa (2.50 bar)."
    },
    xl: {
      id: "xl",
      prefBar: 2.9,
      pminBar: 1.8,
      pmaxBar: 2.9,
      label: "Extra load / XL (load index at 2.90 bar)",
      source: "ETRTO / ISO extra-load / reinforced reference 290 kPa (2.90 bar)."
    },
    c375: {
      id: "c375",
      prefBar: 3.75,
      pminBar: 2.25,
      pmaxBar: 3.75,
      label: "C-type / commercial (ETRTO — load index at 3.75 bar)",
      source: "ETRTO C-type commercial reference 375 kPa (3.75 bar / 54 PSI)."
    },
    c450: {
      id: "c450",
      prefBar: 4.5,
      pminBar: 2.25,
      pmaxBar: 4.5,
      label: "C-type / van (load index at 4.50 bar)",
      source: "Common van marking: load index at 450 kPa (4.50 bar / 65 PSI). Confirm on the sidewall. Not the TRA LT chart."
    }
  };

  /**
   * TRA / industry LT-metric load & inflation tables.
   * Pounds are the published source figures. Convert to kg at lookup time.
   * Verified against public LT-metric charts for LT265/65R17 Load Range E
   * (LI 120/117, 3085 / 2835 lb at 80 PSI).
   */
  var LT_TABLES = {
    "265/65R17": {
      id: "265/65R17",
      family: "LT",
      loadRange: "E",
      maxPsi: 80,
      minPsi: 35,
      label: "TRA / industry Light Truck table for LT265/65R17",
      source: "TRA / industry Light Truck (LT-metric) load and inflation table for LT265/65R17. Load Range E / LI 120 single is 3085 lb (about 1399 kg) at 80 PSI. Tyre makers including General use this industry chart for LT fitments — this is not a General Tire PDF.",
      sourceUrl: "https://tirepressure.com/lt-metric-tire-load-and-inflation-table",
      rows: [
        { psi: 35, singleLb: 1765, dualLb: 1605 },
        { psi: 40, singleLb: 1935, dualLb: 1760 },
        { psi: 45, singleLb: 2105, dualLb: 1915 },
        { psi: 50, singleLb: 2270, dualLb: 2040 },
        { psi: 55, singleLb: 2420, dualLb: 2200 },
        { psi: 60, singleLb: 2570, dualLb: 2340 },
        { psi: 65, singleLb: 2755, dualLb: 2535 },
        { psi: 70, singleLb: 2865, dualLb: 2605 },
        { psi: 75, singleLb: 3005, dualLb: 2735 },
        { psi: 80, singleLb: 3085, dualLb: 2835 }
      ]
    }
  };

  var WAYNE_EXAMPLE = {
    brand: "General Grabber",
    sidewall: "LT265/65R17 120/117S",
    sidewallAlt: "265/65 R17 120/117S",
    frontAxleKg: 1800,
    rearAxleKg: 2100,
    tyresOnAxle: 2
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

  function lbToKg(lb) {
    var n = toFiniteNumber(lb);
    if (n == null) return null;
    return n * LB_TO_KG;
  }

  function kgToLb(kg) {
    var n = toFiniteNumber(kg);
    if (n == null) return null;
    return n * KG_TO_LB;
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

    // Drop a brand name sitting in front of the size (e.g. GENERAL GRABBER LT265…).
    text = text.replace(/^(?:[A-Z][A-Z0-9.'-]*\s+)+(?=(?:LT|P)?\s*\d{3}\s*\/)/, "");

    var prefix = "";
    if (/^LT(?:\s+|(?=\d))/.test(text)) {
      prefix = "LT";
      text = text.replace(/^LT\s*/, "");
    } else if (/^P(?:\s+|(?=\d))/.test(text)) {
      prefix = "P";
      text = text.replace(/^P\s*/, "");
    }

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
    var family = "P";
    if (prefix === "LT" || service === "LT") family = "LT";
    else if (service === "CP") family = "CP";
    else if (service === "C") family = "C";
    else if (prefix === "P") family = "P";

    var sizeKey = widthMm + "/" + aspect + (construction === "ZR" ? "R" : construction) + rimIn;

    return {
      ok: true,
      raw: String(raw).trim(),
      widthMm: widthMm,
      aspect: aspect,
      construction: construction,
      rimIn: rimIn,
      prefix: prefix || null,
      family: family,
      sizeKey: sizeKey,
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

  function serviceLabel(service, family) {
    if (service === "CP" || family === "CP") {
      return "CP (camping) — a motorhome / camper tyre, including higher load when the van is parked. Driving cold pressure uses the ETRTO C-type path, not the TRA LT chart.";
    }
    if (service === "C" || family === "C") {
      return "C-rated commercial tyre — European van marking. Cold pressure uses the ETRTO C-type chart, not the TRA Light Truck table.";
    }
    if (service === "LT" || family === "LT") {
      return "LT-metric (light truck) — US/industry Light Truck family. Cold pressure comes from the TRA / industry LT load and inflation table for that size, not the European C-type 3.75/4.50 bar formula.";
    }
    return "No C, CP or LT mark — often a passenger (P-metric) tyre. This page will not invent an LT or C pressure chart for it.";
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
      service: serviceLabel(parsed.service, parsed.family),
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

  function getChart(chartId) {
    if (!chartId || !Object.prototype.hasOwnProperty.call(PRESSURE_CHARTS, chartId)) {
      return null;
    }
    return PRESSURE_CHARTS[chartId];
  }

  function suggestChartId(parsed) {
    var path = resolvePressurePath(parsed);
    if (path.path === "lt-tra") return "lt-tra";
    if (parsed && (parsed.family === "LT" || parsed.service === "LT")) return "lt-tra";
    if (parsed && (parsed.family === "C" || parsed.family === "CP" || parsed.service === "C" || parsed.service === "CP")) {
      return "c375";
    }
    if (parsed && parsed.extraLoad) return "xl";
    if (parsed && parsed.ok && (parsed.family === "P" || parsed.service === "")) return "passenger";
    return "c375";
  }

  function getLtTable(sizeKey) {
    if (!sizeKey || !Object.prototype.hasOwnProperty.call(LT_TABLES, sizeKey)) return null;
    return LT_TABLES[sizeKey];
  }

  function ltColumnKey(column) {
    return column === "dual" ? "dualLb" : "singleLb";
  }

  /**
   * Capacity at a PSI on an LT table. Exact row, or linear interpolation
   * between adjacent published steps. Refuses values outside the table.
   */
  function ltCapacityAtPsi(opts) {
    opts = opts || {};
    var table = getLtTable(opts.sizeKey || "265/65R17");
    var psi = toFiniteNumber(opts.psi);
    if (!table) return { ok: false, error: "unknown-table" };
    if (psi == null) return { ok: false, error: "need-psi" };

    var col = ltColumnKey(opts.column);
    var rows = table.rows;
    var minPsi = rows[0].psi;
    var maxPsi = rows[rows.length - 1].psi;
    if (psi < minPsi || psi > maxPsi) {
      return { ok: false, error: "outside-table", minPsi: minPsi, maxPsi: maxPsi };
    }

    var i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].psi === psi) {
        return {
          ok: true,
          interpolated: false,
          psi: psi,
          column: col === "dualLb" ? "dual" : "single",
          capacityLb: rows[i][col],
          capacityKg: lbToKg(rows[i][col])
        };
      }
    }
    for (i = 0; i < rows.length - 1; i++) {
      if (psi > rows[i].psi && psi < rows[i + 1].psi) {
        var span = rows[i + 1].psi - rows[i].psi;
        var t = (psi - rows[i].psi) / span;
        var capLb = rows[i][col] + t * (rows[i + 1][col] - rows[i][col]);
        return {
          ok: true,
          interpolated: true,
          psi: psi,
          column: col === "dualLb" ? "dual" : "single",
          capacityLb: capLb,
          capacityKg: lbToKg(capLb),
          loPsi: rows[i].psi,
          hiPsi: rows[i + 1].psi
        };
      }
    }
    return { ok: false, error: "outside-table", minPsi: minPsi, maxPsi: maxPsi };
  }

  /**
   * Cold PSI for a required load on an LT table.
   * Headline = lowest published PSI whose capacity ≥ load (standard practice).
   * Also returns a linearly interpolated PSI between the surrounding rows.
   */
  function ltColdPsiForLoad(opts) {
    opts = opts || {};
    var table = getLtTable(opts.sizeKey || "265/65R17");
    if (!table) return { ok: false, error: "unknown-table" };

    var loadLb = toFiniteNumber(opts.loadLb);
    if (loadLb == null && toFiniteNumber(opts.loadKg) != null) {
      loadLb = kgToLb(opts.loadKg);
    }
    if (loadLb == null || loadLb <= 0) {
      return { ok: false, error: "need-load" };
    }

    var col = ltColumnKey(opts.column);
    var rows = table.rows;
    var maxRow = rows[rows.length - 1];
    if (loadLb > maxRow[col]) {
      return {
        ok: true,
        status: "over-capacity",
        path: "lt-tra",
        psi: null,
        bar: null,
        interpolatedPsi: null,
        loadLb: loadLb,
        loadKg: lbToKg(loadLb),
        maxLb: maxRow[col],
        maxKg: lbToKg(maxRow[col]),
        maxPsi: maxRow.psi,
        column: col === "dualLb" ? "dual" : "single",
        table: table
      };
    }

    var step = null;
    var stepIndex = -1;
    var i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i][col] + 1e-9 >= loadLb) {
        step = rows[i];
        stepIndex = i;
        break;
      }
    }
    if (!step) {
      return {
        ok: true,
        status: "over-capacity",
        path: "lt-tra",
        psi: null,
        bar: null,
        loadLb: loadLb,
        maxLb: maxRow[col],
        maxPsi: maxRow.psi,
        table: table
      };
    }

    var interpPsi = step.psi;
    if (stepIndex > 0 && rows[stepIndex][col] !== loadLb) {
      var prev = rows[stepIndex - 1];
      var denom = step[col] - prev[col];
      if (denom > 0) {
        interpPsi = prev.psi + (step.psi - prev.psi) * (loadLb - prev[col]) / denom;
      }
    } else if (stepIndex === 0) {
      interpPsi = step.psi;
    }

    return {
      ok: true,
      status: "ok",
      path: "lt-tra",
      psi: step.psi,
      interpolatedPsi: roundPsi(interpPsi),
      bar: roundBar(psiToBar(step.psi)),
      loadLb: loadLb,
      loadKg: lbToKg(loadLb),
      capacityLb: step[col],
      capacityKg: lbToKg(step[col]),
      column: col === "dualLb" ? "dual" : "single",
      table: table
    };
  }

  function resolvePressurePath(parsed) {
    if (!parsed || !parsed.ok) {
      return { path: "need-sidewall" };
    }
    if (parsed.family === "C" || parsed.family === "CP") {
      return {
        path: "c-etrto",
        family: parsed.family,
        chartId: "c375",
        label: parsed.family === "CP"
          ? "CP camping tyre — ETRTO C-type driving chart"
          : "C-type van tyre — ETRTO load/pressure chart",
        source: PRESSURE_CHARTS.c375.source
      };
    }
    var table = getLtTable(parsed.sizeKey);
    var looksLt = parsed.family === "LT" || (table && parsed.dualLoadIndex != null);
    if (table && looksLt) {
      return {
        path: "lt-tra",
        family: "LT",
        tableId: table.id,
        inferred: parsed.family !== "LT",
        label: table.label,
        source: table.source,
        sourceUrl: table.sourceUrl
      };
    }
    if (parsed.family === "LT") {
      return {
        path: "no-table",
        family: "LT",
        reason: "lt-size-unknown",
        sizeKey: parsed.sizeKey
      };
    }
    if (table && parsed.family === "P") {
      return {
        path: "lt-tra",
        family: "LT",
        tableId: table.id,
        inferred: true,
        label: table.label,
        source: table.source,
        sourceUrl: table.sourceUrl
      };
    }
    return {
      path: "no-table",
      family: parsed.family || "P",
      reason: parsed.family === "P" ? "p-metric" : "unknown",
      sizeKey: parsed.sizeKey
    };
  }

  function splitAxleLoads(totalKg, frontPercent) {
    var total = toFiniteNumber(totalKg);
    var pct = toFiniteNumber(frontPercent);
    if (total == null || total <= 0 || pct == null || pct < 0 || pct > 100) {
      return { ok: false, error: "split" };
    }
    var front = Math.round(total * pct / 100);
    var rear = Math.round(total - front);
    return { ok: true, estimate: true, frontKg: front, rearKg: rear, frontPercent: pct };
  }

  /** Never round a required cold pressure down. */
  function roundUpBar(bar) {
    var n = toFiniteNumber(bar);
    if (n == null) return null;
    return Math.ceil(n * 20 - 1e-9) / 20;
  }

  /**
   * Cold inflation for one tyre from the chosen chart.
   * Refuses a number if the load index or chart is unknown, or if the load
   * exceeds capacity at the chart’s maximum pressure.
   */
  function coldPressureForLoad(opts) {
    opts = opts || {};
    var loadKg = toFiniteNumber(opts.loadPerTyreKg);
    var chart = getChart(opts.chartId);
    if (!chart) return { ok: false, error: "unknown-chart" };

    var lref = loadIndexToKg(opts.loadIndex);
    if (lref == null) return { ok: false, error: "unknown-load-index" };

    if (loadKg == null || loadKg <= 0) {
      return { ok: false, error: "need-load", lref: lref, chart: chart };
    }

    var pmax = chart.pmaxBar;
    var userMax = toFiniteNumber(opts.sidewallMaxBar);
    if (userMax != null && userMax > 0) pmax = userMax;

    if (loadKg > lref) {
      return {
        ok: true,
        status: "over-capacity",
        bar: null,
        psi: null,
        loadKg: loadKg,
        lref: lref,
        chart: chart,
        pmaxBar: pmax
      };
    }

    var rawBar = chart.prefBar * Math.pow(loadKg / lref, PRESSURE_EXPONENT);
    var usedMin = false;
    if (rawBar < chart.pminBar) {
      rawBar = chart.pminBar;
      usedMin = true;
    }

    if (rawBar > pmax + 1e-9) {
      return {
        ok: true,
        status: "over-pressure",
        bar: null,
        psi: null,
        loadKg: loadKg,
        lref: lref,
        chart: chart,
        pmaxBar: pmax,
        rawBar: rawBar
      };
    }

    var bar = roundUpBar(rawBar);
    if (bar > pmax) bar = pmax;

    return {
      ok: true,
      status: usedMin ? "min-pressure" : "ok",
      bar: bar,
      psi: roundPsi(barToPsi(bar)),
      rawBar: rawBar,
      loadKg: loadKg,
      lref: lref,
      chart: chart,
      pmaxBar: pmax,
      usedMin: usedMin
    };
  }

  function attachAxleMeta(result, extras) {
    var key;
    for (key in extras) {
      if (Object.prototype.hasOwnProperty.call(extras, key)) {
        result[key] = extras[key];
      }
    }
    return result;
  }

  function coldPressureForAxle(opts) {
    opts = opts || {};
    var axleLoadKg = toFiniteNumber(opts.axleLoadKg);
    var tyresOnAxle = toFiniteNumber(opts.tyresOnAxle);
    if (tyresOnAxle == null) tyresOnAxle = 2;
    if (tyresOnAxle <= 0 || Math.round(tyresOnAxle) !== tyresOnAxle) {
      return { ok: false, error: "tyres" };
    }
    tyresOnAxle = Math.round(tyresOnAxle);

    var parsed = opts.parsed || null;
    if (!parsed && opts.sidewall != null && String(opts.sidewall).trim()) {
      parsed = parseSidewall(opts.sidewall);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error || "unrecognised", parsed: parsed };
      }
    }

    var loadIndex = toFiniteNumber(opts.loadIndex);
    var dualLoadIndex = toFiniteNumber(opts.dualLoadIndex);
    if (parsed && parsed.ok) {
      if (loadIndex == null && parsed.loadIndex != null) loadIndex = parsed.loadIndex;
      if (dualLoadIndex == null && parsed.dualLoadIndex != null) dualLoadIndex = parsed.dualLoadIndex;
    }

    var useDual = tyresOnAxle >= 4 && dualLoadIndex != null;
    var usedIndex = useDual ? dualLoadIndex : loadIndex;
    var pathInfo = parsed && parsed.ok ? resolvePressurePath(parsed) : null;

    if (pathInfo && pathInfo.path === "lt-tra") {
      if (axleLoadKg == null || axleLoadKg <= 0) {
        return { ok: false, error: "need-load", path: "lt-tra", tyresOnAxle: tyresOnAxle, table: getLtTable(pathInfo.tableId) };
      }
      var column = tyresOnAxle >= 4 ? "dual" : "single";
      var lt = ltColdPsiForLoad({
        loadKg: axleLoadKg / tyresOnAxle,
        column: column,
        sizeKey: pathInfo.tableId
      });
      return attachAxleMeta(lt, {
        useDual: column === "dual",
        usedIndex: usedIndex,
        tyresOnAxle: tyresOnAxle,
        axleLoadKg: axleLoadKg,
        loadKg: axleLoadKg / tyresOnAxle,
        pathInfo: pathInfo,
        dualFallback: tyresOnAxle >= 4 && dualLoadIndex == null
      });
    }

    if (pathInfo && pathInfo.path === "no-table") {
      return {
        ok: false,
        error: "no-table",
        reason: pathInfo.reason,
        family: pathInfo.family,
        sizeKey: parsed.sizeKey
      };
    }

    if (usedIndex == null) {
      return { ok: false, error: useDual ? "dual-load-index" : "load-index" };
    }

    if (axleLoadKg == null || axleLoadKg <= 0) {
      return { ok: false, error: "need-load", useDual: useDual, usedIndex: Number(usedIndex), tyresOnAxle: tyresOnAxle };
    }

    var chartId = opts.chartId;
    if (!chartId && pathInfo && pathInfo.chartId) chartId = pathInfo.chartId;
    if (!chartId) chartId = "c375";

    var result = coldPressureForLoad({
      loadPerTyreKg: axleLoadKg / tyresOnAxle,
      loadIndex: usedIndex,
      chartId: chartId,
      sidewallMaxBar: opts.sidewallMaxBar
    });
    if (!result.ok) return result;

    result.path = "c-etrto";
    return attachAxleMeta(result, {
      useDual: useDual,
      usedIndex: Number(usedIndex),
      tyresOnAxle: tyresOnAxle,
      axleLoadKg: axleLoadKg,
      dualFallback: tyresOnAxle >= 4 && dualLoadIndex == null,
      pathInfo: pathInfo
    });
  }

  var api = {
    BAR_TO_PSI: BAR_TO_PSI,
    LB_TO_KG: LB_TO_KG,
    KG_TO_LB: KG_TO_LB,
    LOAD_INDEX_KG: LOAD_INDEX_KG,
    PRESSURE_CHARTS: PRESSURE_CHARTS,
    PRESSURE_EXPONENT: PRESSURE_EXPONENT,
    LT_TABLES: LT_TABLES,
    WAYNE_EXAMPLE: WAYNE_EXAMPLE,
    barToPsi: barToPsi,
    psiToBar: psiToBar,
    lbToKg: lbToKg,
    kgToLb: kgToLb,
    roundBar: roundBar,
    roundPsi: roundPsi,
    roundUpBar: roundUpBar,
    loadIndexToKg: loadIndexToKg,
    speedRatingInfo: speedRatingInfo,
    parseSidewall: parseSidewall,
    describeSidewall: describeSidewall,
    checkAxleCapacity: checkAxleCapacity,
    getChart: getChart,
    getLtTable: getLtTable,
    suggestChartId: suggestChartId,
    resolvePressurePath: resolvePressurePath,
    splitAxleLoads: splitAxleLoads,
    ltCapacityAtPsi: ltCapacityAtPsi,
    ltColdPsiForLoad: ltColdPsiForLoad,
    coldPressureForLoad: coldPressureForLoad,
    coldPressureForAxle: coldPressureForAxle
  };

  root.TyreCalc = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
