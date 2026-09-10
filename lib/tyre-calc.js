/**
 * Tyre helpers for the Payload hub: bar/PSI, sidewall decode, load-index kg,
 * and cold-inflation lookup from the embedded TRA / ETRTO tables.
 *
 * Pressure sources (FAQ and comments must stay in sync):
 * - LT 15–18″: Continental Tyre Databook TRA-standard kg-per-axle steps
 *   (2020–2021 bulk reprint). LT 265/65 R17 uses the 2025 row where it
 *   differs at mid pressures. Lowest published bar step that covers the
 *   axle load. Do not divide the axle load by 2.
 * - Rim not 15–18, or size not in the table → refuse. No invented pressure.
 * - C on 15–18″: prefer the book’s Van (ETRTO C) steps when that size + LI
 *   is embedded; otherwise the ETRTO 3.75 / 4.50 bar interpolation.
 * - CP on 15–18″: Continental camping / VanContact Camper FA/RA columns.
 *   Not the plain C table. Size + LI we do not have → refuse.
 *   CP rear single (2 tyres): ETRTO camping / Continental owner advice is
 *   a 5.5 bar floor even when the table is lower. That floor lives on
 *   PR #11 — see ETRTO_CP_SINGLE_REAR_MIN_BAR. Do not invent a front floor.
 *   Rear dual (RA T) stays on the table. Prefer that PR if it lands first.
 * - Same size, different load index → different row. Never reuse another LI.
 * - P-metric: no inflation table is invented.
 * Fitter + the tyre maker’s own chart still win.
 */
"use strict";

(function (root) {
  var TraDb = root.TyreTraDb;
  try {
    if (typeof require === "function") {
      TraDb = require("./tyre-tra-db");
    }
  } catch (err) { /* browser: loaded via script tag */ }

  var BAR_TO_PSI = 14.503773773;

  /**
   * Hook for PR #11 (do not fight that PR if it lands first).
   * ETRTO camping guidance for a CP tyre in single fitment on the rear
   * axle: inflate to at least 5.5 bar even when the FA/RA load table
   * would allow a lower step. This branch only exports the constant so
   * Sources + Conti expansion stay complementary. Apply with
   * headline = max(tableBar, 5.5) for CP rear single only.
   */
  var ETRTO_CP_SINGLE_REAR_MIN_BAR = 5.5;

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
   * TRA-standard LT tables (kg per axle at bar). One convenience row per
   * sizeKey (2025 / highest load range). Full matching is matchTraEntry().
   */
  var LT_DATABOOK_SOURCE = TraDb
    ? TraDb.LT_SOURCE
    : "TRA-standard values as published in Continental Tyre Databook (General/Continental brands). 2025 row used for LT265/65R17 where it differs from older books.";

  var LT_TABLES = TraDb ? TraDb.tablesBySizeKey("LT") : {};

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

  function finishParsed(fields) {
    var speedCode = fields.speedCode || "";
    var service = fields.service || "";
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

    if (fields.loadIndex != null && loadIndexToKg(fields.loadIndex) == null) {
      return { ok: false, error: "unknown-load-index" };
    }
    if (fields.dualLoadIndex != null && loadIndexToKg(fields.dualLoadIndex) == null) {
      return { ok: false, error: "unknown-load-index" };
    }

    var family = "P";
    if (fields.prefix === "LT" || service === "LT" || fields.flotation) family = "LT";
    else if (service === "CP") family = "CP";
    else if (service === "C") family = "C";
    else if (fields.prefix === "P") family = "P";

    return {
      ok: true,
      raw: fields.raw,
      widthMm: fields.widthMm,
      aspect: fields.aspect,
      construction: fields.construction,
      rimIn: fields.rimIn,
      prefix: fields.prefix || null,
      family: family,
      sizeKey: fields.sizeKey,
      service: service,
      extraLoad: !!fields.extraLoad,
      flotation: !!fields.flotation,
      loadRange: fields.loadRange || null,
      loadIndex: fields.loadIndex,
      dualLoadIndex: fields.dualLoadIndex,
      speedCode: speed ? speed.code : (speedCode || null),
      speed: speed
    };
  }

  function padFlotWidth(raw) {
    if (raw.indexOf(".") === -1) return raw;
    var parts = raw.split(".");
    if (parts[1].length === 1) return raw + "0";
    return raw;
  }

  function parseFlotationSidewall(text, raw) {
    var prefix = "";
    if (/^LT(?:\s+|(?=\d))/.test(text)) {
      prefix = "LT";
      text = text.replace(/^LT\s*/, "");
    }
    var re = /^(\d{2})\s*[X×]\s*(\d{2}(?:\.\d{1,2})?)\s*(ZR|R|D|B|-)?\s*(\d{2})\s*(LT)?(?:\s+(?:LR\s*)?([CDEF]))?(?:\s+(\d{2,3})(?:\s*\/\s*(\d{2,3}))?)?(?:\s*([A-Z]{1,2}))?\s*$/;
    var m = text.match(re);
    if (!m) return null;
    var construction = m[3] && m[3] !== "-" ? m[3] : "R";
    var rimIn = Number(m[4]);
    var width = padFlotWidth(m[2]);
    return finishParsed({
      raw: raw,
      widthMm: Number(m[1]),
      aspect: Number(width),
      construction: construction,
      rimIn: rimIn,
      prefix: prefix || (m[5] ? "LT" : ""),
      sizeKey: m[1] + "X" + width + (construction === "ZR" ? "R" : construction) + rimIn,
      service: m[5] || "LT",
      flotation: true,
      loadRange: m[6] || null,
      loadIndex: m[7] ? Number(m[7]) : null,
      dualLoadIndex: m[8] ? Number(m[8]) : null,
      speedCode: m[9] || "",
      extraLoad: false
    });
  }

  function parseSidewall(raw) {
    if (raw == null) return { ok: false, error: "empty" };
    var text = String(raw).trim().toUpperCase();
    text = text.replace(/,/g, " ").replace(/\s+/g, " ");
    if (!text) return { ok: false, error: "empty" };

    // Drop a brand name sitting in front of the size (e.g. GENERAL GRABBER LT265…).
    text = text.replace(/^(?:[A-Z][A-Z0-9.'-]*\s+)+(?=(?:LT|P)?\s*(?:\d{3}\s*\/|\d{2}\s*[X×]))/, "");

    var trailingCp = /\s+CP$/.test(text);
    if (trailingCp) text = text.replace(/\s+CP$/, "");

    var flotation = parseFlotationSidewall(text, String(raw).trim());
    if (flotation) return flotation;

    var prefix = "";
    if (/^LT(?:\s+|(?=\d))/.test(text)) {
      prefix = "LT";
      text = text.replace(/^LT\s*/, "");
    } else if (/^P(?:\s+|(?=\d))/.test(text)) {
      prefix = "P";
      text = text.replace(/^P\s*/, "");
    }

    var re = /^(\d{3})\s*\/\s*(\d{2,3})\s*(ZR|R|D|B|-)?\s*(\d{2})(?:\s*[X×]\s*\d{1,2}(?:\.\d)?)?\s*(CP|C|LT)?(?:\s+(?:XL|RF|REINFORCED|EXTRA\s+LOAD))?(?:\s+(?:LR\s*)?([BCDEF]))?(?:\s+(\d{2,3})(?:\s*\/\s*(\d{2,3}))?)?(?:\s*([A-Z]{1,2}))?\s*$/;
    var m = text.match(re);
    if (!m) return { ok: false, error: "unrecognised" };

    var widthMm = Number(m[1]);
    var aspect = Number(m[2]);
    var construction = m[3] && m[3] !== "-" ? m[3] : (m[3] === "-" ? "D" : "R");
    var rimIn = Number(m[4]);
    var service = m[5] || (trailingCp ? "CP" : "");
    var loadRange = m[6] || null;
    var loadIndex = m[7] ? Number(m[7]) : null;
    var dualLoadIndex = m[8] ? Number(m[8]) : null;
    var speedCode = m[9] || "";
    var extraLoad = /\b(XL|RF|REINFORCED|EXTRA\s+LOAD)\b/.test(text);
    var sizeKey = widthMm + "/" + aspect + (construction === "ZR" ? "R" : construction) + rimIn;

    return finishParsed({
      raw: String(raw).trim(),
      widthMm: widthMm,
      aspect: aspect,
      construction: construction,
      rimIn: rimIn,
      prefix: prefix,
      sizeKey: sizeKey,
      service: service,
      extraLoad: extraLoad,
      flotation: false,
      loadRange: loadRange,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      speedCode: speedCode
    });
  }

  function constructionLabel(code) {
    if (code === "R" || code === "ZR") return "radial";
    if (code === "D") return "diagonal (cross-ply)";
    if (code === "B") return "bias-belted";
    return "radial";
  }

  function serviceLabel(service, family) {
    if (service === "CP" || family === "CP") {
      return "CP (camping / Camping Pneu) — a motorhome tyre with ETRTO special camping load capacities. Not the same as a plain C van tyre. Driving cold pressure uses the Continental VanContact Camper front-axle and rear-axle columns when that 15–18″ size and load index are in the book. Parked / site load can allow a temporary higher load at a higher pressure — the maker’s camping table and a fitter still win.";
    }
    if (service === "C" || family === "C") {
      return "C-rated commercial tyre — European van marking. Cold pressure uses the Continental Van (ETRTO C) steps when that 15–18″ size is in the book, otherwise the ETRTO C-type chart.";
    }
    if (service === "LT" || family === "LT") {
      return "LT-metric (light truck). Cold pressure comes from the Continental Tyre Databook TRA-standard table (kg per axle at bar) for 15–18″ sizes. The 2025 row is used for LT265/65R17 where it differs from older books. Not the old US lb/PSI extract and not the European C-type 3.75/4.50 bar formula.";
    }
    return "No C, CP or LT mark — often a passenger (P-metric) tyre. This page will not invent an LT or C pressure chart for it.";
  }

  function describeSidewall(parsed) {
    if (!parsed || !parsed.ok) return null;
    var size;
    if (parsed.flotation) {
      size = parsed.widthMm + "×" + parsed.aspect + " flotation tyre to fit a " +
        parsed.rimIn + "-inch wheel (" + constructionLabel(parsed.construction) + ").";
    } else {
      size = parsed.widthMm + " mm wide, sidewall height " + parsed.aspect +
        "% of that width, to fit a " + parsed.rimIn + "-inch wheel (" +
        constructionLabel(parsed.construction) + ").";
    }

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

  function isTablePath(path) {
    return path === "lt-databook" || path === "c-databook" || path === "cp-databook";
  }

  function isLtDatabookPath(path) {
    return path === "lt-databook";
  }

  function matchTraEntry(opts) {
    if (!TraDb) return { ok: false, error: "unknown-table" };
    return TraDb.matchEntry(opts);
  }

  function suggestChartId(parsed) {
    var path = resolvePressurePath(parsed);
    if (path.path === "lt-databook") return "lt-databook";
    if (path.path === "c-databook") return "c-databook";
    if (path.path === "cp-databook") return "cp-databook";
    if (parsed && (parsed.family === "LT" || parsed.service === "LT")) return "lt-databook";
    if (parsed && (parsed.family === "CP" || parsed.service === "CP")) return "cp-databook";
    if (parsed && (parsed.family === "C" || parsed.service === "C")) {
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

  function tableFromMatch(match) {
    return match && match.ok ? match.entry : null;
  }

  function ltColumnKey(column) {
    return column === "dual" ? "dualKg" : "singleKg";
  }

  function resolveTable(opts) {
    if (opts && opts.entry) return opts.entry;
    if (opts && opts.table) return opts.table;
    if (opts && opts.sizeKey) {
      var match = matchTraEntry({
        sizeKey: opts.sizeKey,
        family: opts.family || "LT",
        loadIndex: opts.loadIndex,
        dualLoadIndex: opts.dualLoadIndex,
        loadRange: opts.loadRange
      });
      if (match.ok) return match.entry;
      return getLtTable(opts.sizeKey);
    }
    return getLtTable("265/65R17");
  }

  /**
   * Capacity at a published bar step. Exact row only — no invented values.
   */
  function ltCapacityAtBar(opts) {
    opts = opts || {};
    var table = resolveTable(opts);
    var bar = toFiniteNumber(opts.bar);
    if (!table) return { ok: false, error: "unknown-table" };
    if (bar == null) return { ok: false, error: "need-bar" };

    var col = ltColumnKey(opts.column);
    var rows = table.rows;
    var i;
    for (i = 0; i < rows.length; i++) {
      if (Math.abs(rows[i].bar - bar) < 1e-9) {
        var cap = rows[i][col];
        if (cap == null) return { ok: false, error: "no-dual-column" };
        return {
          ok: true,
          bar: rows[i].bar,
          column: col === "dualKg" ? "dual" : "single",
          capacityKg: cap
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
   * Cold bar for an axle load on a published kg-per-axle table.
   * Compare axle kg directly to the Single (or Dual) column.
   * Do not divide by 2. Headline = lowest published bar step that covers.
   */
  function ltColdBarForAxleLoad(opts) {
    opts = opts || {};
    var table = resolveTable(opts);
    if (!table) return { ok: false, error: "unknown-table" };

    var axleLoadKg = toFiniteNumber(opts.axleLoadKg);
    if (axleLoadKg == null) axleLoadKg = toFiniteNumber(opts.loadKg);
    if (axleLoadKg == null || axleLoadKg <= 0) {
      return { ok: false, error: "need-load" };
    }

    var axle = opts.axle === "rear" ? "rear" : "front";
    var wantDual = opts.column === "dual";
    var col;
    var column;
    if (table.family === "CP") {
      if (wantDual) {
        col = "rearDualKg";
        column = "dual";
      } else if (axle === "rear") {
        col = "rearKg";
        column = "rear";
      } else {
        col = "frontKg";
        column = "front";
      }
    } else {
      col = ltColumnKey(opts.column);
      column = col === "dualKg" ? "dual" : "single";
    }
    var path = table.family === "CP" ? "cp-databook" : (table.family === "C" ? "c-databook" : "lt-databook");
    var rows = table.rows;
    var maxRow = null;
    var ri;
    for (ri = rows.length - 1; ri >= 0; ri--) {
      if (rows[ri][col] != null) {
        maxRow = rows[ri];
        break;
      }
    }
    if (!maxRow) {
      return { ok: false, error: "no-dual-column", table: table, column: column };
    }
    if (axleLoadKg > maxRow[col]) {
      return {
        ok: true,
        status: "over-capacity",
        path: path,
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
      if (rows[i][col] != null && rows[i][col] + 1e-9 >= axleLoadKg) {
        step = rows[i];
        break;
      }
    }
    if (!step) {
      return {
        ok: true,
        status: "over-capacity",
        path: path,
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
      path: path,
      bar: step.bar,
      tableBar: step.bar,
      recommendedBar: step.bar,
      psi: roundPsi(barToPsi(step.bar)),
      axleLoadKg: axleLoadKg,
      loadKg: axleLoadKg,
      capacityKg: step[col],
      column: column,
      table: table
    };
  }

  function resolvePressurePath(parsed, extras) {
    extras = extras || {};
    if (!parsed || !parsed.ok) {
      return { path: "need-sidewall" };
    }
    if (TraDb && !TraDb.isSupportedRim(parsed.rimIn)) {
      return {
        path: "unsupported-rim",
        family: parsed.family,
        rimIn: parsed.rimIn,
        sizeKey: parsed.sizeKey,
        reason: "rim-not-15-18"
      };
    }

    var loadIndex = extras.loadIndex != null ? extras.loadIndex : parsed.loadIndex;
    var dualLoadIndex = extras.dualLoadIndex != null ? extras.dualLoadIndex : parsed.dualLoadIndex;
    var loadRange = extras.loadRange != null ? extras.loadRange : parsed.loadRange;

    var match = matchTraEntry({
      sizeKey: parsed.sizeKey,
      family: parsed.family,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      loadRange: loadRange
    });

    if (match.ok && match.entry.family === "LT") {
      return {
        path: "lt-databook",
        family: "LT",
        tableId: match.entry.id,
        table: match.entry,
        inferred: parsed.family !== "LT",
        label: match.entry.label,
        source: match.entry.source
      };
    }
    if (match.ok && match.entry.family === "C") {
      return {
        path: "c-databook",
        family: "C",
        tableId: match.entry.id,
        table: match.entry,
        label: match.entry.label,
        source: match.entry.source
      };
    }
    if (match.ok && match.entry.family === "CP") {
      return {
        path: "cp-databook",
        family: "CP",
        tableId: match.entry.id,
        table: match.entry,
        label: match.entry.label,
        source: match.entry.source
      };
    }
    if (match.error === "no-matching-li") {
      return {
        path: "no-matching-li",
        family: match.family || parsed.family,
        reason: "wrong-load-index",
        sizeKey: parsed.sizeKey,
        wantedLoadIndex: match.wantedLoadIndex,
        available: match.available || []
      };
    }
    if (match.error === "ambiguous") {
      return {
        path: "ambiguous",
        family: match.family || parsed.family,
        reason: "need-load-index",
        sizeKey: parsed.sizeKey,
        available: match.available || []
      };
    }

    if (parsed.family === "C") {
      return {
        path: "c-etrto",
        family: "C",
        chartId: "c375",
        label: "C-type van tyre — ETRTO load/pressure chart",
        source: PRESSURE_CHARTS.c375.source
      };
    }
    if (parsed.family === "CP") {
      return {
        path: "no-table",
        family: "CP",
        reason: "cp-size-unknown",
        sizeKey: parsed.sizeKey
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
    var pathInfo = parsed && parsed.ok
      ? resolvePressurePath(parsed, {
        loadIndex: loadIndex,
        dualLoadIndex: dualLoadIndex,
        loadRange: opts.loadRange || parsed.loadRange
      })
      : null;

    if (pathInfo && pathInfo.path === "unsupported-rim") {
      return {
        ok: false,
        error: "unsupported-rim",
        reason: "rim-not-15-18",
        rimIn: pathInfo.rimIn,
        family: pathInfo.family,
        sizeKey: parsed.sizeKey
      };
    }

    if (pathInfo && pathInfo.path === "ambiguous") {
      return {
        ok: false,
        error: "ambiguous",
        reason: "need-load-index",
        family: pathInfo.family,
        sizeKey: parsed.sizeKey,
        available: pathInfo.available || []
      };
    }

    if (pathInfo && pathInfo.path === "no-matching-li") {
      return {
        ok: false,
        error: "no-matching-li",
        reason: "wrong-load-index",
        family: pathInfo.family,
        sizeKey: parsed.sizeKey,
        wantedLoadIndex: pathInfo.wantedLoadIndex,
        available: pathInfo.available || []
      };
    }

    if (pathInfo && isTablePath(pathInfo.path)) {
      if (axleLoadKg == null || axleLoadKg <= 0) {
        return { ok: false, error: "need-load", path: pathInfo.path, tyresOnAxle: tyresOnAxle, table: pathInfo.table };
      }
      var column = tyresOnAxle >= 4 ? "dual" : "single";
      var lt = ltColdBarForAxleLoad({
        axleLoadKg: axleLoadKg,
        column: column,
        axle: opts.axle === "rear" ? "rear" : "front",
        entry: pathInfo.table,
        sizeKey: parsed.sizeKey,
        family: pathInfo.table.family,
        loadIndex: pathInfo.table.loadIndex,
        loadRange: pathInfo.table.loadRange
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

  function formatLiMismatch(result) {
    if (!result) return "";
    var sizeKey = result.sizeKey || "";
    var family = result.family || "";
    var label = TraDb && TraDb.familySizeLabel
      ? TraDb.familySizeLabel(sizeKey, family)
      : sizeKey;
    var have = (result.available || []).join(", ");
    if (result.error === "no-matching-li" || result.path === "no-matching-li") {
      if (!have) return "That load index is not in our table for " + label + ".";
      if (result.wantedLoadIndex != null) {
        return "We have " + label + " as " + have + " but not LI " + result.wantedLoadIndex + ".";
      }
      return "We have " + label + " as " + have + " — that load index is not in the table.";
    }
    if (result.error === "ambiguous" || result.path === "ambiguous") {
      if (!have) {
        return "That size has more than one load index in the book. Paste the load index from the sidewall.";
      }
      return "That size has more than one load index in the book (" + have + "). Paste the load index from the sidewall.";
    }
    return "";
  }

  var api = {
    BAR_TO_PSI: BAR_TO_PSI,
    ETRTO_CP_SINGLE_REAR_MIN_BAR: ETRTO_CP_SINGLE_REAR_MIN_BAR,
    LOAD_INDEX_KG: LOAD_INDEX_KG,
    PRESSURE_CHARTS: PRESSURE_CHARTS,
    PRESSURE_EXPONENT: PRESSURE_EXPONENT,
    LT_TABLES: LT_TABLES,
    LT_DATABOOK_SOURCE: LT_DATABOOK_SOURCE,
    TraDb: TraDb,
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
    matchTraEntry: matchTraEntry,
    suggestChartId: suggestChartId,
    resolvePressurePath: resolvePressurePath,
    splitAxleLoads: splitAxleLoads,
    ltCapacityAtBar: ltCapacityAtBar,
    ltColdBarForAxleLoad: ltColdBarForAxleLoad,
    coldPressureForLoad: coldPressureForLoad,
    coldPressureForAxle: coldPressureForAxle,
    formatLiMismatch: formatLiMismatch
  };

  root.TyreCalc = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
