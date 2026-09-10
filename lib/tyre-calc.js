/**
 * Tyre helpers for the Payload hub: bar/PSI, sidewall decode, load-index kg,
 * and cold-inflation lookup from the right published family table.
 *
 * Pressure sources (FAQ and comments must stay in sync):
 * - LT 265/65 R 17: Continental “Tyre Databook 2025 / Car - 4x4 - Van”
 *   Technical data LT tyres 4x4 — TRA-standard values as published for
 *   Continental brands including General Tire. Rows are kg per axle at bar
 *   (Single / Dual). Cold pressure is the lowest published bar step whose
 *   column covers that axle load. Do not divide the axle load by 2.
 *   Over 2800 kg Single (5.5 bar) → Fail. Other LT sizes are refused until
 *   their databook rows are embedded.
 * - C / CP marked van tyres: ETRTO C-type load–pressure relationship
 *   L / L_ref = (P / P_ref)^0.8, so P = P_ref × (L / L_ref)^1.25
 *   at 3.75 bar (optional 4.50 bar van marking).
 * - P-metric: detected, but no inflation table is invented for a size we
 *   do not embed.
 * Fitter + the tyre maker’s own chart still win.
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
      source: "Common van marking: load index at 450 kPa (4.50 bar / 65 PSI). Confirm on the sidewall. Not the Continental LT databook."
    }
  };

  /**
   * Continental Tyre Databook 2025 LT tables (kg per axle at bar).
   * Source of truth: “Tyre Databook 2025 / Car - 4x4 - Van” — Technical data
   * LT tyres 4x4. TRA-standard values as published for Continental brands
   * including General. Not the old US lb-per-tyre @ PSI extract.
   */
  var LT_DATABOOK_SOURCE =
    "General / Continental Tyre Databook 2025 LT table for this size (TRA-standard values as published for Continental brands including General). Not the old US lb/PSI extract.";

  var LT_TABLES = {
    "265/65R17": {
      id: "265/65R17",
      family: "LT",
      loadRange: "E",
      loadIndex: "120/117",
      speed: "S",
      measuringRim: "8J",
      minBar: 2.5,
      maxBar: 5.5,
      label: "General / Continental Tyre Databook 2025 — LT 265/65 R 17",
      source: LT_DATABOOK_SOURCE,
      units: "kg-per-axle",
      rows: [
        { bar: 2.5, singleKg: 1490, dualKg: 2735 },
        { bar: 3.0, singleKg: 1720, dualKg: 3160 },
        { bar: 3.5, singleKg: 1950, dualKg: 3580 },
        { bar: 4.0, singleKg: 2170, dualKg: 3980 },
        { bar: 4.5, singleKg: 2380, dualKg: 4375 },
        { bar: 5.0, singleKg: 2590, dualKg: 4760 },
        { bar: 5.5, singleKg: 2800, dualKg: 5140 }
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
      return "CP (camping) — a motorhome / camper tyre, including higher load when the van is parked. Driving cold pressure uses the ETRTO C-type path, not the Continental LT databook.";
    }
    if (service === "C" || family === "C") {
      return "C-rated commercial tyre — European van marking. Cold pressure uses the ETRTO C-type chart, not the Continental LT databook.";
    }
    if (service === "LT" || family === "LT") {
      return "LT-metric (light truck). Cold pressure for LT 265/65 R 17 comes from the General / Continental Tyre Databook 2025 LT table (kg per axle at bar), not the old US lb/PSI extract and not the European C-type 3.75/4.50 bar formula.";
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

  function isLtDatabookPath(path) {
    return path === "lt-databook";
  }

  function suggestChartId(parsed) {
    var path = resolvePressurePath(parsed);
    if (path.path === "lt-databook") return "lt-databook";
    if (parsed && (parsed.family === "LT" || parsed.service === "LT")) return "lt-databook";
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
    return column === "dual" ? "dualKg" : "singleKg";
  }

  /**
   * Capacity at a published bar step on the Continental LT databook.
   * Exact row only — no invented values between steps.
   */
  function ltCapacityAtBar(opts) {
    opts = opts || {};
    var table = getLtTable(opts.sizeKey || "265/65R17");
    var bar = toFiniteNumber(opts.bar);
    if (!table) return { ok: false, error: "unknown-table" };
    if (bar == null) return { ok: false, error: "need-bar" };

    var col = ltColumnKey(opts.column);
    var rows = table.rows;
    var i;
    for (i = 0; i < rows.length; i++) {
      if (Math.abs(rows[i].bar - bar) < 1e-9) {
        return {
          ok: true,
          bar: rows[i].bar,
          column: col === "dualKg" ? "dual" : "single",
          capacityKg: rows[i][col]
        };
      }
    }
    return {
      ok: false,
      error: "outside-table",
      minBar: rows[0].bar,
      maxBar: rows[rows.length - 1].bar
    };
  }

  /**
   * Cold bar for an axle load on the Continental LT databook.
   * Compare axle kg directly to the Single (or Dual) kg-per-axle column.
   * Do not divide by 2. Headline = lowest published bar step that covers.
   */
  function ltColdBarForAxleLoad(opts) {
    opts = opts || {};
    var table = getLtTable(opts.sizeKey || "265/65R17");
    if (!table) return { ok: false, error: "unknown-table" };

    var axleLoadKg = toFiniteNumber(opts.axleLoadKg);
    if (axleLoadKg == null) axleLoadKg = toFiniteNumber(opts.loadKg);
    if (axleLoadKg == null || axleLoadKg <= 0) {
      return { ok: false, error: "need-load" };
    }

    var col = ltColumnKey(opts.column);
    var column = col === "dualKg" ? "dual" : "single";
    var rows = table.rows;
    var maxRow = rows[rows.length - 1];
    if (axleLoadKg > maxRow[col]) {
      return {
        ok: true,
        status: "over-capacity",
        path: "lt-databook",
        bar: null,
        psi: null,
        axleLoadKg: axleLoadKg,
        loadKg: axleLoadKg,
        maxKg: maxRow[col],
        maxBar: maxRow.bar,
        column: column,
        table: table
      };
    }

    var step = null;
    var i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i][col] + 1e-9 >= axleLoadKg) {
        step = rows[i];
        break;
      }
    }
    if (!step) {
      return {
        ok: true,
        status: "over-capacity",
        path: "lt-databook",
        bar: null,
        psi: null,
        axleLoadKg: axleLoadKg,
        loadKg: axleLoadKg,
        maxKg: maxRow[col],
        maxBar: maxRow.bar,
        column: column,
        table: table
      };
    }

    return {
      ok: true,
      status: "ok",
      path: "lt-databook",
      bar: step.bar,
      psi: roundPsi(barToPsi(step.bar)),
      axleLoadKg: axleLoadKg,
      loadKg: axleLoadKg,
      capacityKg: step[col],
      column: column,
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
        path: "lt-databook",
        family: "LT",
        tableId: table.id,
        inferred: parsed.family !== "LT",
        label: table.label,
        source: table.source
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
        path: "lt-databook",
        family: "LT",
        tableId: table.id,
        inferred: true,
        label: table.label,
        source: table.source
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

    if (pathInfo && isLtDatabookPath(pathInfo.path)) {
      if (axleLoadKg == null || axleLoadKg <= 0) {
        return { ok: false, error: "need-load", path: "lt-databook", tyresOnAxle: tyresOnAxle, table: getLtTable(pathInfo.tableId) };
      }
      var column = tyresOnAxle >= 4 ? "dual" : "single";
      var lt = ltColdBarForAxleLoad({
        axleLoadKg: axleLoadKg,
        column: column,
        sizeKey: pathInfo.tableId
      });
      return attachAxleMeta(lt, {
        useDual: column === "dual",
        usedIndex: usedIndex,
        tyresOnAxle: tyresOnAxle,
        axleLoadKg: axleLoadKg,
        loadKg: axleLoadKg,
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
    LOAD_INDEX_KG: LOAD_INDEX_KG,
    PRESSURE_CHARTS: PRESSURE_CHARTS,
    PRESSURE_EXPONENT: PRESSURE_EXPONENT,
    LT_TABLES: LT_TABLES,
    LT_DATABOOK_SOURCE: LT_DATABOOK_SOURCE,
    WAYNE_EXAMPLE: WAYNE_EXAMPLE,
    barToPsi: barToPsi,
    psiToBar: psiToBar,
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
    ltCapacityAtBar: ltCapacityAtBar,
    ltColdBarForAxleLoad: ltColdBarForAxleLoad,
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
