/**
 * Michelin Agilis CrossClimate C-Metric and LT load/pressure tables
 * for 15–18″ motorhome tyres.
 *
 * Primary source: Michelin Inflation Charts (April 2025), Light Truck
 * section — “Loads are indicated per axle” (S = two tyres, D = four).
 * Cross-checked against the same PDF’s RV section (per axle end = half)
 * and the April 2024 RV brochure / Agilis data pages.
 *
 * https://business.michelinman.com/people-transportation/rv/load-and-inflation-tables
 * https://cxf-prod.azureedge.net/b2b-experience-production/attachments/cm91ui8aj000n01n82bvqcb8o-inflation-chart-e-april2025.pdf
 *
 * Figures stored here are kilograms per axle, matching the Continental
 * path on this page. Michelin’s RV pages show the same cells per axle
 * end — we do not divide the user’s axle load by 2.
 *
 * Only published Agilis CrossClimate C and LT grids on 15–18″. No
 * Camping CP grid (Michelin UK cites ETRTO 5.5 bar rear guidance, not
 * a size-by-size CP book). No 19.5 / 22.5″ truck sizes. No Goodyear,
 * BFGoodrich or Yokohama. Skip a size if the PDF has only a sidewall
 * max and no inflation steps (e.g. 205/75R16C).
 *
 * Every row is keyed by family + size + load index + load range.
 */
"use strict";

(function (root) {
  var SUPPORTED_RIMS = [15, 16, 17, 18];

  var MICHELIN_SOURCE =
    "Michelin Agilis CrossClimate load/inflation tables (April 2025 Inflation Charts, Light Truck section — kg per axle). RV pages show the same figures per axle end. Confirm on the Michelin chart; a fitter still wins.";

  var C_SOURCE = MICHELIN_SOURCE;
  var LT_SOURCE = MICHELIN_SOURCE;

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
    var loadIndex = opts.loadIndex;
    var id;
    var key;
    if (family === "LT") {
      id = "MIC-LT" + sizeKey + (loadRange ? "-LR" + loadRange : "") + "-" + loadIndex;
      key = "LT" + sizeKey;
    } else {
      id = "MIC-" + sizeKey + "C" + (loadRange ? "-LR" + loadRange : "") + "-" + loadIndex;
      key = sizeKey + "C";
    }
    return {
      id: id,
      key: key,
      sizeKey: sizeKey,
      family: family,
      maker: "michelin",
      loadRange: loadRange,
      plyRating: opts.plyRating != null ? opts.plyRating : null,
      loadIndex: loadIndex,
      dualLoadIndex: opts.dualLoadIndex != null ? opts.dualLoadIndex : null,
      sourceYear: opts.sourceYear || 2025,
      flotation: false,
      rimIn: opts.rimIn,
      units: "kg-per-axle",
      label: opts.label,
      source: opts.source || MICHELIN_SOURCE,
      rows: rows,
      minBar: rows[0].bar,
      maxBar: rows[rows.length - 1].bar
    };
  }

  function c(sizeKey, rimIn, loadRange, loadIndex, dualLoadIndex, bars, single, dual) {
    return entry({
      family: "C",
      sizeKey: sizeKey,
      rimIn: rimIn,
      loadRange: loadRange,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      bars: bars,
      single: single,
      dual: dual,
      sourceYear: 2025,
      source: C_SOURCE,
      label: "Michelin Agilis CrossClimate C-Metric — " + sizeKey.replace("R", " R ") + "C LR" + loadRange + " LI " + loadIndex
    });
  }

  function lt(sizeKey, rimIn, loadRange, loadIndex, dualLoadIndex, bars, single, dual) {
    return entry({
      family: "LT",
      sizeKey: sizeKey,
      rimIn: rimIn,
      loadRange: loadRange,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      bars: bars,
      single: single,
      dual: dual,
      sourceYear: 2025,
      source: LT_SOURCE,
      label: "Michelin Agilis CrossClimate LT — LT" + sizeKey.replace("R", " R ") + " LR" + loadRange + " LI " + loadIndex
    });
  }

  // Published kPa steps from the April 2025 chart, as bar.
  var B15C = [2.10, 2.40, 2.80, 3.10, 3.40, 3.75];
  var B16C_195 = [2.10, 2.40, 2.80, 3.10, 3.40, 3.80, 4.10, 4.50, 4.75];
  var B16C_E = [2.40, 2.80, 3.10, 3.40, 3.80, 4.10, 4.50, 4.80, 5.20, 5.50, 5.75];
  var B16LT = [2.40, 2.80, 3.10, 3.40, 3.80, 4.10, 4.50, 4.80, 5.20, 5.50];
  var B16LT_225 = [2.80, 3.10, 3.40, 3.80, 4.10, 4.50, 4.80, 5.20, 5.50];
  var B17LT_285 = [3.40, 3.80, 4.10, 4.50, 4.80, 5.20, 5.50];

  /**
   * C-Metric 15–16″ Agilis CrossClimate from April 2025 Light Truck
   * pages. Last step is the published sidewall max when that pressure
   * is higher than the last column (54 / 69 / 83 PSI).
   * 205/75R16C LRE is listed with a max only — no grid, so omitted.
   */
  var C_ENTRIES = [
    c("185/60R15", 15, "C", 94, null, B15C,
      [890, 990, 1120, 1220, 1310, 1340],
      null),
    c("205/65R15", 15, "C", 102, 100, B15C,
      [1070, 1190, 1350, 1460, 1570, 1700],
      [2010, 2240, 2530, 2750, 2960, 3200]),
    c("195/75R16", 16, "D", 107, 105, B16C_195,
      [1010, 1130, 1280, 1390, 1490, 1630, 1730, 1870, 1950],
      [1930, 2140, 2420, 2630, 2830, 3100, 3290, 3540, 3700]),
    c("225/75R16", 16, "E", 121, 120, B16C_E,
      [1440, 1630, 1770, 1900, 2080, 2210, 2380, 2510, 2680, 2800, 2900],
      [2780, 3150, 3420, 3680, 4020, 4270, 4600, 4850, 5170, 5400, 5600]),
    c("235/65R16", 16, "E", 121, 119, B16C_E,
      [1440, 1630, 1770, 1900, 2080, 2210, 2380, 2510, 2680, 2800, 2900],
      [2700, 3060, 3320, 3570, 3910, 4150, 4470, 4710, 5020, 5250, 5440])
  ];

  /**
   * LT 16–18″ Agilis CrossClimate from the same Light Truck pages.
   * XPS RIB sharing a printed row is the same published grid — stored
   * once as Agilis CrossClimate LT. LTX A/T2 rows are not copied.
   */
  var LT_ENTRIES = [
    lt("215/85R16", 16, "E", 115, 112, B16LT,
      [1356, 1488, 1619, 1760, 1864, 1978, 2118, 2204, 2313, 2430],
      [2468, 2703, 2948, 3202, 3378, 3602, 3901, 4010, 4209, 4480]),
    // Chart starts at 40 PSI / 280 kPa (35 PSI column empty). Sidewall max 90 PSI / 620 kPa is the same 1215 / 1120 kg as the last step.
    lt("225/75R16", 16, "E", 115, 112, B16LT_225,
      [1497, 1624, 1760, 1869, 1987, 2118, 2214, 2322, 2431],
      [2722, 2957, 3202, 3402, 3620, 3901, 4028, 4228, 4482]),
    lt("235/85R16", 16, "E", 120, 116, B16LT,
      [1580, 1690, 1800, 2000, 2100, 2200, 2380, 2500, 2640, 2760],
      [2880, 3080, 3280, 3640, 3820, 4000, 4320, 4540, 4800, 5040]),
    lt("245/75R16", 16, "E", 120, 116, B16LT,
      [1580, 1690, 1840, 2000, 2120, 2250, 2380, 2510, 2630, 2760],
      [2880, 3075, 3350, 3640, 3855, 4090, 4320, 4560, 4790, 5040]),
    lt("265/75R16", 16, "E", 123, 120, B16LT,
      [1578, 1732, 1882, 2058, 2168, 2304, 2498, 2562, 2690, 2798],
      [3464, 3808, 4136, 4480, 4760, 5060, 5444, 5632, 5912, 6196]),
    lt("235/80R17", 17, "E", 120, 117, B16LT,
      [1424, 1564, 1696, 1850, 1986, 2100, 2240, 2322, 2436, 2572],
      [3128, 3436, 3728, 4116, 4364, 4616, 4860, 5108, 5352, 5596]),
    lt("245/70R17", 17, "E", 119, 116, B16LT,
      [1570, 1685, 1825, 2000, 2100, 2230, 2360, 2485, 2610, 2720],
      [2860, 3065, 3320, 3600, 3820, 4065, 4240, 4525, 4745, 5000]),
    lt("245/75R17", 17, "E", 121, 118, B16LT,
      [1460, 1606, 1742, 1850, 2004, 2140, 2300, 2394, 2518, 2640],
      [3212, 3528, 3828, 4116, 4408, 4708, 4996, 5260, 5532, 5796]),
    lt("265/70R17", 17, "E", 121, 118, B16LT,
      [1560, 1714, 1860, 2058, 2140, 2276, 2430, 2480, 2558, 2640],
      [3428, 3764, 4092, 4480, 4708, 5008, 5280, 5452, 5624, 5796]),
    // Seven published steps; 35–45 PSI columns empty on the 17″ page.
    lt("285/70R17", 17, "E", 121, 118, B17LT_285,
      [1736, 1910, 2072, 2300, 2386, 2536, 2640],
      [3820, 4200, 4552, 4996, 5244, 5568, 5796]),
    lt("265/70R18", 18, "E", 124, 121, B16LT,
      [1778, 1954, 2122, 2300, 2440, 2594, 2798, 2888, 3034, 3198],
      [3240, 3556, 3864, 4236, 4444, 4724, 5144, 5260, 5524, 5796]),
    lt("275/65R18", 18, "E", 123, 120, B16LT,
      [1600, 1760, 1904, 2118, 2196, 2332, 2498, 2598, 2730, 2798],
      [3520, 3864, 4192, 4600, 4824, 5124, 5444, 5716, 5996, 6196]),
    lt("275/70R18", 18, "E", 125, 122, B16LT,
      [1710, 1874, 2040, 2240, 2344, 2494, 2640, 2776, 2912, 2998],
      [3756, 4116, 4480, 4860, 5152, 5480, 5796, 6096, 6404, 6604])
  ];

  var ALL = C_ENTRIES.concat(LT_ENTRIES);

  function isSupportedRim(rimIn) {
    var n = Number(rimIn);
    var i;
    for (i = 0; i < SUPPORTED_RIMS.length; i++) {
      if (SUPPORTED_RIMS[i] === n) return true;
    }
    return false;
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
    if (family === "C") return sizeKey + "C";
    return sizeKey;
  }

  function describeCandidate(row) {
    var text = "LI " + row.loadIndex;
    if (row.dualLoadIndex != null) text += "/" + row.dualLoadIndex;
    if (row.loadRange) text += " LR" + row.loadRange;
    return text;
  }

  function availableLis(rows) {
    return rows.map(describeCandidate);
  }

  function matchEntry(opts) {
    opts = opts || {};
    var sizeKey = opts.sizeKey;
    if (!sizeKey) return { ok: false, error: "need-size" };

    var family = opts.family || null;
    var candidates = [];
    if (family === "CP") {
      return { ok: false, error: "michelin-cp-no-table", sizeKey: sizeKey, family: "CP" };
    }
    if (family === "C") {
      candidates = listForSize(sizeKey, "C");
    } else if (family === "LT") {
      candidates = listForSize(sizeKey, "LT");
    } else {
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
    return { ok: true, entry: filtered[0], ambiguous: false };
  }

  function getById(id) {
    var i;
    for (i = 0; i < ALL.length; i++) {
      if (ALL[i].id === id) return ALL[i];
    }
    return null;
  }

  var api = {
    SUPPORTED_RIMS: SUPPORTED_RIMS,
    MICHELIN_SOURCE: MICHELIN_SOURCE,
    C_SOURCE: C_SOURCE,
    LT_SOURCE: LT_SOURCE,
    C_ENTRIES: C_ENTRIES,
    LT_ENTRIES: LT_ENTRIES,
    ALL: ALL,
    familySizeLabel: familySizeLabel,
    describeCandidate: describeCandidate,
    isSupportedRim: isSupportedRim,
    listForSize: listForSize,
    matchEntry: matchEntry,
    getById: getById
  };

  root.TyreMichelinDb = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
