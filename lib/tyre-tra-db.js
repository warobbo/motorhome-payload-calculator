/**
 * TRA-standard / ETRTO van load–pressure tables for 15–18″ motorhome tyres.
 *
 * Sources (public Continental reprints, not the paid TRA Yearbook):
 * - LT 265/65 R17 Load Range E: Continental / General Tyre Databook 2025
 *   screenshot (kg per axle). Mid-pressure figures differ from the 2020 book
 *   — this 2025 row is the source of truth for that size.
 * - Other LT 15–18″ (metric + flotation): Continental Tyre Databook
 *   Car · 4x4 · Van 2020–2021, LT section, “standard values acc. to TRA.”
 * - C-marked van 15–18″: same book, Van section (ETRTO C tables).
 * - CP camping / motorhome 15–18″: same book, VanContact Camper / CP rows
 *   (ETRTO camping). Front axle (FA) and rear axle (RA) are different
 *   columns — not the plain C table.
 *
 * Figures are kilograms per axle at a published bar step. Single (S) = two
 * tyres on the axle. Dual / Twin (D/T) = four tyres. Empty dual cells mean
 * the book did not publish a twin column for that row.
 *
 * Every row is keyed by family + size + load index (and load range / ply
 * when the book distinguishes them). Never reuse another LI for the same size.
 *
 * This file is Continental / General only. Michelin Agilis C/LT lives in
 * tyre-michelin-db.js. Do not dump Goodyear, BFGoodrich or Yokohama here.
 */
"use strict";

(function (root) {
  var SUPPORTED_RIMS = [15, 16, 17, 18];

  var LT_SOURCE =
    "TRA-standard values as published in Continental Tyre Databook (General/Continental brands). 2025 row used for LT265/65R17 where it differs from older books.";

  var LT_SOURCE_2025 =
    "TRA-standard values as published in Continental Tyre Databook (General/Continental brands). 2025 row used for LT265/65R17 where it differs from older books.";

  var C_SOURCE =
    "ETRTO C-type load/pressure steps as published in Continental Tyre Databook Van section (2020–2021).";

  var CP_SOURCE =
    "ETRTO camping / CP (VanContact Camper) load/pressure steps as published in Continental Tyre Databook Van section (2020–2021). Front and rear axle columns differ. Not the plain C table.";

  var LT_BARS = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5];
  var C_BARS = [3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0, 5.25, 5.5, 5.75, 6.0];
  var FLOT_BARS = [1.7, 2.1, 2.5, 2.8, 3.1, 3.5, 3.8, 4.1, 4.5];

  function rowsFrom(bars, single, dual) {
    var rows = [];
    var i;
    for (i = 0; i < single.length; i++) {
      rows.push({
        bar: bars[i],
        singleKg: single[i],
        dualKg: dual && dual[i] != null ? dual[i] : null
      });
    }
    return rows;
  }

  function entry(opts) {
    var rows = opts.rows || rowsFrom(opts.bars, opts.single, opts.dual);
    var family = opts.family;
    var sizeKey = opts.sizeKey;
    var loadRange = opts.loadRange || null;
    var plyRating = opts.plyRating != null ? opts.plyRating : null;
    var loadIndex = opts.loadIndex;
    var id;
    var key;
    if (family === "LT") {
      id = "LT" + sizeKey + (loadRange ? "-LR" + loadRange : "") + "-" + loadIndex;
      key = "LT" + sizeKey;
    } else if (family === "CP") {
      id = sizeKey + "CP-PR" + plyRating + "-" + loadIndex;
      key = sizeKey + "CP";
    } else {
      id = sizeKey + "C-PR" + plyRating + "-" + loadIndex;
      key = sizeKey + "C";
    }
    return {
      id: id,
      key: key,
      sizeKey: sizeKey,
      family: family,
      maker: "continental",
      loadRange: loadRange,
      plyRating: plyRating,
      loadIndex: loadIndex,
      dualLoadIndex: opts.dualLoadIndex != null ? opts.dualLoadIndex : null,
      sourceYear: opts.sourceYear,
      flotation: !!opts.flotation,
      rimIn: opts.rimIn,
      units: "kg-per-axle",
      label: opts.label,
      source: opts.source,
      rows: rows,
      minBar: rows[0].bar,
      maxBar: rows[rows.length - 1].bar
    };
  }

  function lt(sizeKey, rimIn, loadRange, loadIndex, dualLoadIndex, single, dual, extra) {
    extra = extra || {};
    var bars = extra.bars || LT_BARS;
    var year = extra.sourceYear || 2020;
    return entry({
      family: "LT",
      sizeKey: sizeKey,
      rimIn: rimIn,
      loadRange: loadRange,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      single: single,
      dual: dual,
      bars: bars,
      sourceYear: year,
      flotation: !!extra.flotation,
      source: year === 2025 ? LT_SOURCE_2025 : LT_SOURCE,
      label: year === 2025
        ? "General / Continental Tyre Databook 2025 — LT " + sizeKey.replace("R", " R ")
        : "Continental Tyre Databook 2020–2021 LT — " + sizeKey.replace("R", " R ") + " LR" + loadRange
    });
  }

  function c(sizeKey, rimIn, plyRating, loadIndex, dualLoadIndex, single, dual) {
    return entry({
      family: "C",
      sizeKey: sizeKey,
      rimIn: rimIn,
      plyRating: plyRating,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      single: single,
      dual: dual,
      bars: C_BARS,
      sourceYear: 2020,
      source: C_SOURCE,
      label: "Continental Tyre Databook 2020–2021 Van — " + sizeKey.replace("R", " R ") + "C PR" + plyRating
    });
  }

  function cpRows(front, rear, rearDual) {
    var rows = [];
    var i;
    for (i = 0; i < C_BARS.length; i++) {
      var hasF = front && i < front.length;
      var hasR = rear && i < rear.length;
      var hasD = rearDual && i < rearDual.length;
      if (!hasF && !hasR && !hasD) continue;
      rows.push({
        bar: C_BARS[i],
        frontKg: hasF ? front[i] : null,
        rearKg: hasR ? rear[i] : null,
        rearDualKg: hasD ? rearDual[i] : null,
        singleKg: hasF ? front[i] : null,
        dualKg: hasD ? rearDual[i] : null
      });
    }
    return rows;
  }

  function cp(sizeKey, rimIn, plyRating, loadIndex, dualLoadIndex, front, rear, rearDual) {
    return entry({
      family: "CP",
      sizeKey: sizeKey,
      rimIn: rimIn,
      plyRating: plyRating,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      rows: cpRows(front, rear, rearDual),
      sourceYear: 2020,
      source: CP_SOURCE,
      label: "Continental Tyre Databook 2020–2021 VanContact Camper / CP — " +
        sizeKey.replace("R", " R ") + " CP LI " + loadIndex
    });
  }

  /**
   * LT metric 15–18″ from the 2020–2021 TRA reprint, plus the 2025
   * LT265/65R17 row (do not replace with the older 1640 / 1860 / 2060… figures).
   */
  var LT_ENTRIES = [
    // 15 inch metric
    lt("215/80R15", 15, "E", 112, 109, [1300, 1480, 1650, 1810, 1950, 2120, 2240], [2360, 2700, 3000, 3300, 3500, 3860, 4120]),
    lt("215/75R15", 15, "D", 106, 103, [1250, 1420, 1600, 1740, 1900], [2280, 2580, 2920, 3160, 3500]),
    lt("235/75R15", 15, "D", 110, 107, [1420, 1620, 1800, 1980, 2120], [2580, 2940, 3300, 3600, 3900]),
    lt("245/75R15", 15, "D", 113, 110, [1520, 1730, 1950, 2120, 2300], [2760, 3140, 3500, 3860, 4240]),
    lt("205/70R15", 15, "E", 107, 103, [1120, 1270, 1420, 1550, 1700, 1820, 1950], [2040, 2320, 2600, 2820, 3100, 3320, 3500]),

    // 16 inch metric
    lt("215/85R16", 16, "E", 115, 112, [1390, 1580, 1760, 1930, 2120, 2260, 2430], [2520, 2880, 3200, 3480, 3900, 4120, 4480]),
    lt("235/85R16", 16, "E", 120, 116, [1580, 1800, 2000, 2200, 2380, 2580, 2760], [2880, 3280, 3640, 4000, 4320, 4680, 5040]),
    lt("225/75R16", 16, "D", 110, 107, [1400, 1590, 1760, 1940, 2120], [2540, 2900, 3200, 3540, 3900]),
    lt("225/75R16", 16, "E", 115, 112, [1400, 1590, 1760, 1940, 2120, 2280, 2430], [2540, 2900, 3200, 3540, 3900, 4160, 4480]),
    lt("245/75R16", 16, "E", 120, 116, [1580, 1800, 2000, 2200, 2380, 2580, 2760], [2880, 3280, 3640, 4000, 4320, 4680, 5040]),
    lt("265/75R16", 16, "C", 112, 109, [1780, 2020, 2240], [3240, 3680, 4120]),
    lt("265/75R16", 16, "D", 119, 116, [1780, 2020, 2240, 2480, 2720], [3240, 3680, 4120, 4520, 5000]),
    lt("265/75R16", 16, "E", 123, 120, [1780, 2020, 2240, 2480, 2720, 2880, 3100], [3240, 3680, 4120, 4520, 5000, 5240, 5600]),
    lt("285/75R16", 16, "C", 116, 113, [1980, 2260, 2500], [3600, 4120, 4600]),
    lt("285/75R16", 16, "D", 122, 119, [1980, 2260, 2500, 2760, 3000], [3600, 4120, 4600, 5040, 5440]),
    lt("285/75R16", 16, "E", 126, 123, [1980, 2260, 2500, 2760, 3000, 3220, 3400], [3600, 4120, 4600, 5040, 5440, 5880, 6200]),
    lt("295/75R16", 16, "D", 123, 120, [2080, 2360, 2640, 2900, 3100], [3780, 4280, 4860, 5280, 5600]),
    lt("315/75R16", 16, "D", 121, null, [2300, 2620, 2900], null),
    lt("315/75R16", 16, "E", 127, 124, [2300, 2620, 2900, 3200, 3500], [4240, 4760, 5280, 5840, 6400]),
    lt("235/70R16", 16, "D", 110, 107, [1420, 1610, 1800, 1970, 2120], [2580, 2940, 3300, 3580, 3900]),
    lt("245/70R16", 16, "D", 113, 110, [1510, 1710, 1900, 2100, 2300], [2740, 3120, 3500, 3820, 4240]),
    lt("255/70R16", 16, "E", 120, 117, [1600, 1820, 2000, 2220, 2450, 2600, 2800], [2920, 3320, 3600, 4040, 4480, 4720, 5140]),
    lt("265/70R16", 16, "E", 121, 118, [1690, 1920, 2120, 2360, 2570, 2740, 2900], [3080, 3500, 3900, 4280, 4720, 5000, 5280]),
    lt("305/70R16", 16, "D", 118, 115, [2060, 2380, 2640], [3700, 4320, 4860]),
    lt("305/70R16", 16, "E", 124, 121, [2060, 2380, 2640, 2900, 3200], [3700, 4320, 4860, 5280, 5800]),
    lt("215/65R16", 16, "D", 103, 100, [1160, 1330, 1500, 1630, 1750], [2120, 2420, 2760, 2960, 3200]),

    // 17 inch metric
    lt("235/80R17", 17, "E", 120, 117, [1600, 1820, 2060, 2220, 2430, 2600, 2800], [2920, 3320, 3700, 4040, 4480, 4720, 5140]),
    lt("245/75R17", 17, "E", 121, 118, [1650, 1870, 2060, 2280, 2500, 2680, 2900], [3000, 3400, 3700, 4160, 4600, 4880, 5280]),
    lt("255/75R17", 17, "E", 111, 108, [1740, 1980, 2180], [3160, 3600, 4000]),
    lt("225/70R17", 17, "E", 115, 112, [1390, 1580, 1750, 1930, 2120, 2260, 2430], [2520, 2880, 3200, 3520, 3900, 4120, 4480]),
    lt("245/70R17", 17, "E", 119, 116, [1570, 1780, 2000, 2180, 2360, 2540, 2720], [2860, 3240, 3600, 3960, 4240, 4640, 5000]),
    lt("265/70R17", 17, "E", 121, 118, [1760, 2000, 2240, 2440, 2640, 2780, 2900], [3200, 3640, 4120, 4440, 4860, 5040, 5280]),
    lt("285/70R17", 17, "E", 121, 118, [1960, 2220, 2500, 2700, 2900], [3560, 4040, 4600, 4920, 5280]),
    lt("295/70R17", 17, "E", 121, 118, [2060, 2340, 2640, 2780, 2900], [3740, 4240, 4860, 5040, 5280]),
    lt("315/70R17", 17, "E", 121, 118, [2300, 2580, 2900], [4240, 4680, 5280]),
    lt("255/65R17", 17, "D", 114, 110, [1550, 1770, 1950, 2160, 2360], [2820, 3220, 3500, 3940, 4240]),
    // 2025 Grabber row — do not overwrite with 2020 1640/1860/2060…
    lt("265/65R17", 17, "E", 120, 117, [1490, 1720, 1950, 2170, 2380, 2590, 2800], [2735, 3160, 3580, 3980, 4375, 4760, 5140], { sourceYear: 2025 }),
    lt("285/65R17", 17, "E", 121, 118, [1850, 2080, 2300, 2540, 2800, 2860, 2900], [3360, 3780, 4240, 4640, 5140, 5200, 5280]),

    // 18 inch metric
    lt("275/70R18", 18, "E", 125, 122, [1920, 2180, 2430, 2680, 2900, 3120, 3300], [3500, 3960, 4480, 4880, 5280, 5680, 6000]),
    lt("265/65R18", 18, "D", 117, 114, [1700, 1930, 2180, 2360, 2570], [3100, 3520, 4000, 4280, 4720]),
    lt("265/60R18", 18, "E", 119, 116, [1600, 1790, 2000, 2200, 2360, 2560, 2720], [2920, 3260, 3600, 4000, 4240, 4640, 5000]),
    lt("285/60R18", 18, "D", 118, 115, [1750, 1990, 2240, 2440, 2640], [3180, 3620, 4120, 4440, 4860]),
    lt("285/60R18", 18, "E", 122, 119, [1750, 1990, 2240, 2440, 2640, 2840, 3000], [3180, 3620, 4120, 4440, 4860, 5160, 5440]),

    // Flotation 15–18″ (different bar steps)
    lt("30X9.50R15", 15, "C", 104, null, [1120, 1280, 1420, 1560, 1680, 1800], null, { flotation: true, bars: FLOT_BARS }),
    lt("31X10.50R15", 15, "C", 109, null, [1270, 1450, 1600, 1760, 1910, 2060], null, { flotation: true, bars: FLOT_BARS }),
    lt("33X10.50R15", 15, "C", 114, null, [1480, 1680, 1850, 2050, 2220, 2360], null, { flotation: true, bars: FLOT_BARS }),
    lt("33X12.50R15", 15, "C", 108, null, [1600, 1810, 2000], null, { flotation: true, bars: FLOT_BARS }),
    lt("35X12.50R15", 15, "C", 113, null, [1850, 2080, 2300], null, { flotation: true, bars: FLOT_BARS }),
    lt("33X12.50R17", 17, "C", 105, null, [1460, 1680, 1850], null, { flotation: true, bars: FLOT_BARS }),
    lt("33X12.50R17", 17, "D", 114, null, [1460, 1680, 1850, 2050, 2210, 2360], null, { flotation: true, bars: FLOT_BARS }),
    lt("35X12.50R17", 17, "E", 121, null, [1700, 1960, 2180, 2380, 2580, 2720, 2780, 2840, 2900], null, { flotation: true, bars: FLOT_BARS }),
    lt("37X12.50R17", 17, "C", 116, null, [1950, 2240, 2500], null, { flotation: true, bars: FLOT_BARS }),
    lt("33X12.50R18", 18, "E", 118, null, [1420, 1600, 1800, 1950, 2110, 2240, 2400, 2540, 2640], null, { flotation: true, bars: FLOT_BARS }),
    lt("35X12.50R18", 18, "D", 118, null, [1650, 1880, 2120, 2300, 2480, 2640], null, { flotation: true, bars: FLOT_BARS }),
    lt("35X12.50R18", 18, "E", 123, null, [1650, 1880, 2120, 2300, 2480, 2640, 2830, 2990, 3100], null, { flotation: true, bars: FLOT_BARS })
  ];

  /**
   * Common motorhome / van C sizes on 15–18″ from the 2020–2021 Van section.
   * Pressure steps start at 3.0 bar (ETRTO C table). PR 6 usually ends at
   * 3.75 bar; PR 8 at 4.75; PR 10 continues higher.
   */
  var C_ENTRIES = [
    // 15 inch
    c("185R15", 15, 8, 103, 102, [1265, 1350, 1435, 1515, 1595, 1675, 1750], [2460, 2620, 2780, 2940, 3095, 3250, 3400]),
    c("195R15", 15, 8, 106, 104, [1375, 1465, 1555, 1645, 1730, 1815, 1900], [2605, 2775, 2945, 3110, 3275, 3440, 3600]),
    c("215/80R15", 15, 8, 111, 109, [1510, 1610, 1705, 1805, 1900, 1995, 2090, 2180], [2855, 3040, 3225, 3410, 3590, 3770, 3945, 4120]),
    c("245/75R15", 15, 6, 109, 107, [1725, 1835, 1950, 2060], [3260, 3480, 3690, 3900]),
    c("195/70R15", 15, 6, 100, 98, [1340, 1425, 1515, 1600], [2510, 2675, 2840, 3000]),
    c("195/70R15", 15, 8, 104, 102, [1300, 1385, 1470, 1555, 1640, 1720, 1800], [2460, 2620, 2780, 2940, 3095, 3250, 3400]),
    c("205/70R15", 15, 8, 106, 104, [1375, 1465, 1555, 1640, 1730, 1815, 1900], [2605, 2775, 2945, 3110, 3275, 3440, 3600]),
    c("215/70R15", 15, 8, 109, 107, [1490, 1590, 1685, 1780, 1875, 1970, 2060], [2820, 3005, 3190, 3370, 3550, 3725, 3900]),
    c("225/70R15", 15, 6, 109, 107, [1725, 1835, 1950, 2060], [3260, 3480, 3690, 3900]),
    c("225/70R15", 15, 8, 112, 110, [1620, 1725, 1830, 1935, 2040, 2140, 2240], [3065, 3270, 3470, 3665, 3860, 4050, 4240]),
    // Special 115 N marking on the same 225/70 R15 C page (Single only in the book)
    c("225/70R15", 15, 8, 115, null, [1680, 1790, 1900, 2010, 2115, 2220, 2325, 2430], null),
    c("185/65R15", 15, 6, 97, 95, [1220, 1300, 1380, 1460], [2310, 2460, 2610, 2760]),
    c("205/65R15", 15, 6, 102, 100, [1420, 1515, 1605, 1700], [2675, 2855, 3030, 3200]),
    c("215/65R15", 15, 6, 104, 102, [1505, 1605, 1700, 1800], [2840, 3030, 3215, 3400]),
    c("185/60R15", 15, 6, 94, 92, [1120, 1195, 1270, 1340], [2110, 2245, 2385, 2520]),
    c("185/55R15", 15, 6, 90, 88, [1005, 1070, 1135, 1200], [1875, 2000, 2120, 2240]),

    // 16 inch
    c("235/85R16", 16, 8, 114, 111, [1635, 1740, 1850, 1955, 2055, 2160, 2260, 2360], [3020, 3220, 3415, 3610, 3800, 3990, 4175, 4360]),
    c("235/85R16", 16, 10, 120, 116, [1665, 1775, 1880, 1990, 2059, 2200, 2300, 2405, 2505, 2605, 2700, 2800], [2970, 3170, 3360, 3550, 3740, 3925, 4110, 4290, 4470, 4650, 4825, 5000]),
    c("205R16", 16, 8, 110, 108, [1535, 1635, 1735, 1830, 1930, 2025, 2120], [2890, 3085, 3270, 3455, 3640, 3820, 4000]),
    c("175/75R16", 16, 8, 101, 99, [1140, 1215, 1290, 1360, 1435, 1505, 1575, 1650], [2145, 2290, 2430, 2565, 2700, 2835, 2970, 3100]),
    c("185/75R16", 16, 8, 104, 102, [1245, 1330, 1410, 1490, 1570, 1645, 1725, 1800], [2355, 2510, 2665, 2815, 2965, 3110, 3255, 3400]),
    c("195/75R16", 16, 8, 107, 105, [1350, 1440, 1525, 1615, 1700, 1785, 1865, 1950], [2560, 2730, 2900, 3060, 3225, 3385, 3545, 3700]),
    c("195/75R16", 16, 10, 110, 108, [1355, 1445, 1535, 1620, 1705, 1790, 1875, 1955, 2040, 2120], [2555, 2725, 2890, 3055, 3220, 3380, 3535, 3690, 3845, 4000]),
    c("205/75R16", 16, 8, 110, 108, [1470, 1565, 1660, 1755, 1850, 1940, 2030, 2120], [2770, 2955, 3135, 3310, 3485, 3660, 3830, 4000]),
    c("205/75R16", 16, 10, 113, 111, [1470, 1565, 1665, 1755, 1850, 1940, 2035, 2125, 2210, 2300], [2785, 2970, 3150, 3330, 3510, 3680, 3855, 4025, 4195, 4360]),
    c("215/75R16", 16, 8, 113, 111, [1590, 1700, 1800, 1905, 2005, 2105, 2205, 2300], [3020, 3220, 3415, 3610, 3800, 3990, 4175, 4360]),
    c("215/75R16", 16, 10, 116, 114, [1600, 1705, 1805, 1910, 2010, 2110, 2210, 2310, 2405, 2500], [3015, 3215, 3410, 3605, 3795, 3985, 4170, 4355, 4540, 4720]),
    c("215/75R16", 16, 10, 121, 119, [1725, 1835, 1950, 2060, 2170, 2275, 2385, 2490, 2595, 2695, 2800, 2900], [3235, 3445, 3655, 3865, 4070, 4270, 4470, 4670, 4865, 5060, 5250, 5440]),
    c("225/75R16", 16, 8, 116, 114, [1730, 1845, 1960, 2070, 2180, 2285, 2395, 2500], [3270, 3485, 3695, 3905, 4115, 4320, 4520, 4720]),
    c("225/75R16", 16, 10, 118, 116, [1685, 1800, 1910, 2015, 2125, 2230, 2335, 2435, 2540, 2640], [3195, 3410, 3615, 3820, 4020, 4220, 4420, 4615, 4810, 5000]),
    c("225/75R16", 16, 10, 121, 120, [1725, 1835, 1950, 2060, 2170, 2275, 2385, 2490, 2595, 2695, 2800, 2900], [3330, 3550, 3765, 3980, 4190, 4395, 4605, 4805, 5010, 5205, 5405, 5600]),
    c("225/75R16", 16, 10, 122, null, [1725, 1835, 1950, 2060, 2170, 2275, 2385, 2490, 2595, 2695, 2800, 2900, 3000], null),
    c("215/70R16", 16, 6, 108, 106, [1675, 1785, 1895, 2000], [3180, 3390, 3595, 3800]),
    c("195/65R16", 16, 6, 100, 98, [1340, 1425, 1515, 1600], [2510, 2675, 2840, 3000]),
    c("195/65R16", 16, 8, 104, 102, [1245, 1330, 1410, 1490, 1570, 1645, 1725, 1800], [2355, 2510, 2665, 2815, 2965, 3110, 3255, 3400]),
    c("205/65R16", 16, 6, 103, 101, [1465, 1560, 1655, 1750], [2760, 2940, 3120, 3300]),
    c("205/65R16", 16, 8, 107, 105, [1350, 1440, 1525, 1615, 1700, 1785, 1865, 1950], [2560, 2730, 2900, 3060, 3225, 3385, 3545, 3700]),
    c("215/65R16", 16, 6, 106, 104, [1590, 1695, 1800, 1900], [3010, 3210, 3405, 3600]),
    c("215/65R16", 16, 8, 109, 107, [1425, 1520, 1615, 1705, 1795, 1885, 1975, 2060], [2700, 2880, 3055, 3230, 3400, 3570, 3735, 3900]),
    c("225/65R16", 16, 8, 112, 110, [1550, 1655, 1755, 1855, 1950, 2050, 2145, 2240], [2935, 3130, 3320, 3510, 3695, 3880, 4060, 4240]),
    c("235/65R16", 16, 8, 115, 113, [1680, 1795, 1905, 2010, 2120, 2225, 2330, 2430], [3185, 3395, 3605, 3805, 4010, 4210, 4405, 4600]),
    c("235/65R16", 16, 10, 118, 116, [1685, 1800, 1910, 2015, 2125, 2230, 2335, 2435, 2540, 2640], [3195, 3405, 3615, 3820, 4020, 4220, 4420, 4615, 4810, 5000]),
    c("235/65R16", 16, 10, 121, 119, [1725, 1835, 1950, 2060, 2170, 2275, 2385, 2490, 2595, 2695, 2800, 2900], [3235, 3445, 3655, 3865, 4070, 4270, 4470, 4670, 4865, 5060, 5250, 5440]),
    c("285/65R16", 16, 10, 123, null, [2060, 2195, 2330, 2465, 2595, 2720, 2850, 2975, 3100], null),
    c("285/65R16", 16, 10, 128, null, [2300, 2455, 2605, 2750, 2895, 3040, 3180, 3325, 3460, 3600], null),
    c("285/65R16", 16, 10, 131, null, [2320, 2470, 2620, 2770, 2915, 3060, 3205, 3345, 3485, 3625, 3765, 3900], null),
    c("195/60R16", 16, 6, 99, 97, [1295, 1380, 1465, 1550], [2445, 2605, 2765, 2920]),
    c("205/60R16", 16, 6, 100, 98, [1340, 1425, 1515, 1600], [2510, 2675, 2840, 3000]),
    c("215/60R16", 16, 6, 103, 101, [1460, 1560, 1655, 1750], [2760, 2940, 3120, 3300]),
    c("225/60R16", 16, 6, 105, 103, [1550, 1650, 1750, 1850], [2930, 3120, 3310, 3500]),
    c("225/60R16", 16, 8, 111, 109, [1510, 1610, 1705, 1805, 1900, 1995, 2090, 2180], [2855, 3040, 3225, 3410, 3590, 3770, 3945, 4120]),

    // 17 inch
    c("205/70R17", 17, 10, 115, 113, [1555, 1655, 1755, 1855, 1955, 2050, 2150, 2245, 2335, 2430], [2940, 3135, 3325, 3515, 3700, 3885, 4065, 4245, 4425, 4600]),
    c("245/70R17", 17, 8, 121, 119, [2010, 2140, 2270, 2400, 2525, 2655, 2775, 2900], [3765, 4015, 4260, 4505, 4740, 4975, 5210, 5440]),
    c("185/60R17", 17, 6, 96, 94, [1190, 1265, 1345, 1420], [2240, 2390, 2535, 2680]),
    c("215/60R17", 17, 6, 104, 102, [1505, 1605, 1705, 1800], [2845, 3030, 3215, 3400]),
    c("215/60R17", 17, 8, 109, 107, [1425, 1520, 1615, 1705, 1795, 1885, 1975, 2060], [2700, 2880, 3055, 3230, 3400, 3570, 3735, 3900]),
    // Dual column for PR8 114 was not reliably printed — Single only
    c("235/60R17", 17, 8, 114, 112, [1635, 1740, 1850, 1955, 2055, 2160, 2260, 2360], null),
    c("235/60R17", 17, 10, 117, 115, [1640, 1750, 1860, 1965, 2070, 2170, 2270, 2370, 2470, 2570], [3105, 3310, 3515, 3715, 3910, 4105, 4295, 4485, 4675, 4860]),
    c("225/55R17", 17, 6, 104, 102, [1505, 1605, 1705, 1800], [2845, 3030, 3215, 3400]),
    c("225/55R17", 17, 8, 109, 107, [1425, 1520, 1615, 1705, 1795, 1885, 1975, 2060], [2700, 2880, 3055, 3230, 3400, 3570, 3735, 3900]),
    c("255/55R17", 17, 10, 118, 116, [1685, 1800, 1910, 2015, 2125, 2230, 2335, 2435, 2540, 2640], [3195, 3405, 3615, 3820, 4020, 4220, 4420, 4615, 4810, 5000]),

    // 18 inch
    c("255/55R18", 18, 8, 116, 114, [1730, 1845, 1955, 2065, 2175, 2285, 2390, 2500], [3265, 3480, 3695, 3905, 4110, 4315, 4520, 4720])
  ];

  /**
   * CP camping / motorhome sizes on 15–18″ from the same Van section.
   * FA S = front axle, two tyres. RA S = rear axle, two tyres (higher
   * pressure for the same kg). RA T = rear dual (1.85 × FA S at the
   * same bar steps). Do not reuse the plain C row for a CP sidewall.
   */
  var CP_ENTRIES = [
    // 15 inch
    cp("215/70R15", 15, 8, 109, null,
      [1425, 1520, 1615, 1705, 1795, 1885, 1975, 2060],
      [1270, 1350, 1435, 1516, 1595, 1675, 1755, 1830, 1910, 1985, 2060],
      [2640, 2810, 2985, 3155, 3320, 3485, 3650, 3810]),
    cp("225/70R15", 15, 8, 112, null,
      [1550, 1655, 1755, 1855, 1950, 2050, 2145, 2240],
      [1380, 1470, 1560, 1650, 1735, 1825, 1910, 1990, 2075, 2160, 2240],
      [2865, 3060, 3245, 3430, 3605, 3790, 3970, 4145]),

    // 16 inch
    cp("195/75R16", 16, 8, 107, null,
      [1350, 1440, 1525, 1615, 1700, 1785, 1865, 1950],
      [1200, 1280, 1360, 1435, 1510, 1585, 1660, 1735, 1805, 1880, 1950],
      [2500, 2665, 2830, 2990, 3145, 3300, 3455, 3610]),
    cp("225/75R16", 16, 8, 116, null,
      [1730, 1845, 1960, 2070, 2180, 2285, 2395, 2500],
      [1540, 1640, 1740, 1840, 1940, 2035, 2130, 2225, 2315, 2410, 2500],
      [3200, 3415, 3625, 3830, 4030, 4230, 4430, 4625]),
    cp("225/75R16", 16, 10, 118, null,
      [1685, 1800, 1910, 2015, 2125, 2230, 2335, 2435, 2540, 2640],
      [1515, 1615, 1715, 1815, 1910, 2005, 2095, 2190, 2280, 2370, 2460, 2550, 2640],
      [3120, 3330, 3530, 3730, 3930, 4125, 4320, 4510, 4700, 4885]),
    cp("225/65R16", 16, 8, 112, null,
      [1550, 1655, 1755, 1855, 1950, 2050, 2145, 2240],
      [1380, 1470, 1560, 1650, 1735, 1825, 1910, 1990, 2075, 2160, 2240],
      [2870, 3060, 3245, 3430, 3615, 3790, 3970, 4145]),
    cp("235/65R16", 16, 8, 115, null,
      [1680, 1795, 1905, 2010, 2120, 2225, 2330, 2430],
      [1495, 1595, 1695, 1790, 1885, 1975, 2070, 2160, 2250, 2340, 2430],
      [3110, 3320, 3520, 3720, 3920, 4110, 4305, 4495]),

    // 18 inch
    cp("255/55R18", 18, 10, 120, null,
      [1790, 1910, 2025, 2140, 2255, 2365, 2475, 2585, 2695, 2800],
      [1610, 1715, 1820, 1920, 2025, 2125, 2225, 2325, 2420, 2515, 2610, 2705, 2800],
      [3310, 3530, 3745, 3960, 4165, 4375, 4580, 4780, 4980, 5180])
  ];

  var ALL = LT_ENTRIES.concat(C_ENTRIES, CP_ENTRIES);

  function isSupportedRim(rimIn) {
    var n = Number(rimIn);
    var i;
    for (i = 0; i < SUPPORTED_RIMS.length; i++) {
      if (SUPPORTED_RIMS[i] === n) return true;
    }
    return false;
  }

  function sameNumber(a, b) {
    return a != null && b != null && Number(a) === Number(b);
  }

  function listForSize(sizeKey, family) {
    var out = [];
    var i;
    for (i = 0; i < ALL.length; i++) {
      if (ALL[i].sizeKey === sizeKey && (!family || ALL[i].family === family)) {
        out.push(ALL[i]);
      }
    }
    return out;
  }

  function familySizeLabel(sizeKey, family) {
    if (family === "LT") return "LT" + sizeKey;
    if (family === "CP") return sizeKey + "CP";
    if (family === "C") return sizeKey + "C";
    return sizeKey;
  }

  function describeCandidate(row) {
    var text = "LI " + row.loadIndex;
    if (row.dualLoadIndex != null) text += "/" + row.dualLoadIndex;
    if (row.loadRange) text += " LR" + row.loadRange;
    if (row.family !== "LT" && row.plyRating != null) text += " PR" + row.plyRating;
    return text;
  }

  function availableLis(rows) {
    return rows.map(describeCandidate);
  }

  /**
   * Match a parsed sidewall to one published row.
   * Key is family + size + primary load index (and load range when given).
   * Never silently use another LI for the same size.
   */
  function matchEntry(opts) {
    opts = opts || {};
    var sizeKey = opts.sizeKey;
    if (!sizeKey) return { ok: false, error: "need-size" };

    var family = opts.family || null;
    var candidates = [];
    if (family === "CP") {
      candidates = listForSize(sizeKey, "CP");
    } else if (family === "C") {
      candidates = listForSize(sizeKey, "C");
    } else if (family === "LT") {
      candidates = listForSize(sizeKey, "LT");
    } else {
      // Unmarked / P-metric: may still be an LT size written without the LT
      // prefix (Wayne’s 265/65 R17 120/117S). Never borrow a C or CP row.
      candidates = listForSize(sizeKey, "LT");
    }
    if (!candidates.length) {
      return { ok: false, error: "unknown-size", sizeKey: sizeKey, family: family };
    }

    var li = opts.loadIndex != null && opts.loadIndex !== "" ? Number(opts.loadIndex) : null;
    if (li != null && !Number.isFinite(li)) li = null;
    var lr = opts.loadRange ? String(opts.loadRange).toUpperCase().replace(/^LR/, "") : null;

    var filtered = candidates.filter(function (row) {
      if (lr && row.loadRange && row.loadRange !== lr) return false;
      if (li != null && row.loadIndex !== li) return false;
      return true;
    });

    if (!filtered.length) {
      return {
        ok: false,
        error: "no-matching-li",
        sizeKey: sizeKey,
        family: candidates[0].family,
        wantedLoadIndex: li,
        wantedLoadRange: lr,
        available: availableLis(candidates),
        candidates: candidates
      };
    }
    if (filtered.length === 1) {
      return { ok: true, entry: filtered[0], ambiguous: false };
    }

    if (li == null) {
      return {
        ok: false,
        error: "ambiguous",
        sizeKey: sizeKey,
        family: filtered[0].family,
        available: availableLis(filtered),
        candidates: filtered
      };
    }

    // Same primary LI still has more than one row (e.g. two load ranges
    // sharing a number). Need the load range — do not pick another LI.
    if (!lr) {
      return {
        ok: false,
        error: "ambiguous",
        sizeKey: sizeKey,
        family: filtered[0].family,
        wantedLoadIndex: li,
        available: availableLis(filtered),
        candidates: filtered
      };
    }

    filtered.sort(function (a, b) {
      if (a.sourceYear !== b.sourceYear) return b.sourceYear - a.sourceYear;
      return (b.plyRating || 0) - (a.plyRating || 0);
    });
    return { ok: true, entry: filtered[0], ambiguous: false };
  }

  function getById(id) {
    var i;
    for (i = 0; i < ALL.length; i++) {
      if (ALL[i].id === id) return ALL[i];
    }
    return null;
  }

  /** Convenience map: one row per sizeKey (2025 / highest LR wins). */
  function tablesBySizeKey(family) {
    var map = {};
    var i;
    for (i = 0; i < ALL.length; i++) {
      var row = ALL[i];
      if (family && row.family !== family) continue;
      var prev = map[row.sizeKey];
      if (!prev || row.sourceYear > prev.sourceYear ||
          "BCDEF".indexOf(row.loadRange || "") > "BCDEF".indexOf(prev.loadRange || "") ||
          (row.plyRating || 0) > (prev.plyRating || 0)) {
        map[row.sizeKey] = row;
      }
    }
    return map;
  }

  var api = {
    SUPPORTED_RIMS: SUPPORTED_RIMS,
    LT_BARS: LT_BARS,
    C_BARS: C_BARS,
    FLOT_BARS: FLOT_BARS,
    LT_SOURCE: LT_SOURCE,
    C_SOURCE: C_SOURCE,
    CP_SOURCE: CP_SOURCE,
    LT_ENTRIES: LT_ENTRIES,
    C_ENTRIES: C_ENTRIES,
    CP_ENTRIES: CP_ENTRIES,
    familySizeLabel: familySizeLabel,
    describeCandidate: describeCandidate,
    ALL: ALL,
    isSupportedRim: isSupportedRim,
    listForSize: listForSize,
    matchEntry: matchEntry,
    getById: getById,
    tablesBySizeKey: tablesBySizeKey,
    sameNumber: sameNumber
  };

  root.TyreTraDb = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
