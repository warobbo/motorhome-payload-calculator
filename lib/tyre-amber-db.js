/**
 * AMBER LT catalogue: published max load @ max cold pressure only.
 *
 * GREEN Conti/Michelin step curves stay in tyre-tra-db.js and
 * tyre-michelin-db.js. This file never invents a pressure curve,
 * dual figure, or front-axle step from a load index.
 *
 * Sources retrieved 12 Sep 2026 (agent opened each file):
 * - General Grabber AT2 spec pages (GT18) — max load / max dual @ max PSI
 *   https://generaltire.com/sites/default/files/tires/files/GT18_Grabber-AT2_Tire_Spec_Pages.pdf
 * - General Grabber A/TX product flyer (GT19) — max load @ max PSI (no dual column)
 *   https://generaltire.com/sites/default/files/tires/files/GT19_Grabber_ATx_ProductFlyer_v2_Print.pdf
 * - General Grabber A/TX specs page (identification / same family)
 *   https://generaltire.com/tires/light-trucksuv/grabber-atx/specs
 * - BFGoodrich All-Terrain T/A KO2 product information — max single/dual @ max PSI
 *   https://images.carid.com/bfgoodrich/info/bfgoodrich-all-terrain-ta-ko-2-product-information.pdf
 *
 * P-metric SL/XL Grabber rows are not ingested. BFG commercial truck
 * (11R22.5 and similar) is not ingested. Dual stays blank when the
 * maker did not print a dual max. lb→kg and psi→bar are converted
 * here; printed lb/psi stay on the row for audit.
 */
"use strict";

(function (root) {
  var SUPPORTED_RIMS = [15, 16, 17, 18, 20];
  var LB_TO_KG = 0.45359237;
  var RETRIEVED = "2026-09-12";

  var SRC = {
    at2: {
      id: "at2",
      maker: "general",
      label: "General Grabber AT2 spec pages (GT18)",
      url: "https://generaltire.com/sites/default/files/tires/files/GT18_Grabber-AT2_Tire_Spec_Pages.pdf",
      text: "General Grabber AT2 spec pages (GT18), retrieved 12 Sep 2026 — published max load / max dual at max cold PSI only (AMBER)."
    },
    atx: {
      id: "atx",
      maker: "general",
      label: "General Grabber A/TX product flyer (GT19)",
      url: "https://generaltire.com/sites/default/files/tires/files/GT19_Grabber_ATx_ProductFlyer_v2_Print.pdf",
      text: "General Grabber A/TX product flyer (GT19), retrieved 12 Sep 2026 — published max load at max cold PSI only (AMBER). No dual column printed."
    },
    ko2: {
      id: "ko2",
      maker: "bfgoodrich",
      label: "BFGoodrich All-Terrain T/A KO2 product information",
      url: "https://images.carid.com/bfgoodrich/info/bfgoodrich-all-terrain-ta-ko-2-product-information.pdf",
      text: "BFGoodrich All-Terrain T/A KO2 product information, retrieved 12 Sep 2026 — published max load single/dual at max cold PSI only (AMBER)."
    }
  };

  function lbToKg(lb) {
    if (lb == null) return null;
    return Math.round(Number(lb) * LB_TO_KG);
  }

  function psiToBar(psi) {
    var n = Number(psi);
    if (!Number.isFinite(n)) return null;
    return Math.round((n / 14.503773773) * 100) / 100;
  }

  function fromPrinted(maker, sourceId, row) {
    var sizeKey = row[0];
    var rimIn = row[1];
    var loadRange = row[2];
    var loadIndex = row[3];
    var dualLoadIndex = row[4];
    var singleLb = row[5];
    var dualLb = row[6];
    var maxPsi = row[7];
    var flotation = !!row[8];
    var src = SRC[sourceId];
    var prefix = maker === "bfgoodrich" ? "BFG" : "GEN";
    return {
      id: prefix + "-LT" + sizeKey + "-LR" + loadRange + "-" + loadIndex,
      key: "LT" + sizeKey,
      sizeKey: sizeKey,
      family: "LT",
      maker: maker,
      confidence: "AMBER",
      loadRange: loadRange,
      loadIndex: loadIndex,
      dualLoadIndex: dualLoadIndex,
      flotation: flotation,
      rimIn: rimIn,
      units: "kg-per-tyre-max",
      maxPsi: maxPsi,
      maxBar: psiToBar(maxPsi),
      singleLb: singleLb,
      dualLb: dualLb,
      singleKgEach: lbToKg(singleLb),
      dualKgEach: dualLb == null ? null : lbToKg(dualLb),
      sourceId: sourceId,
      sourceUrl: src.url,
      source: src.text,
      retrieved: RETRIEVED,
      label: src.label + " — LT" + sizeKey.replace("R", " R ") + " LR" + loadRange + " LI " + loadIndex
    };
  }

  /* sizeKey, rim, LR, LI, dualLI, max single lb, max dual lb or null, max PSI, flotation */
  var GENERAL_AT2 = [
    ['235/75R15', 15, 'C', 104, 101, 1985, 1820, 50, false],
    ['30X9.50R15', 15, 'C', 104, null, 1985, null, 50, true],
    ['31X10.50R15', 15, 'C', 109, null, 2270, null, 50, true],
    ['33X12.50R15', 15, 'C', 108, null, 2205, null, 35, true],
    ['35X12.50R15', 15, 'C', 113, null, 2535, null, 35, true],
    ['235/85R16', 16, 'E', 120, 116, 3085, 2755, 80, false],
    ['245/75R16', 16, 'E', 120, 116, 3085, 2778, 80, false],
    ['265/75R16', 16, 'E', 123, 120, 3415, 3085, 80, false],
    ['285/75R16', 16, 'D', 122, 119, 3305, 3000, 65, false],
    ['295/75R16', 16, 'D', 123, 120, 3415, 3085, 65, false],
    ['315/75R16', 16, 'D', 121, null, 3195, null, 50, false],
    ['305/70R16', 16, 'D', 118, 115, 2910, 2680, 50, false],
    ['235/80R17', 17, 'E', 120, 117, 3085, 2835, 80, false],
    ['245/75R17', 17, 'E', 121, 118, 3195, 2910, 80, false],
    ['265/70R17', 17, 'E', 121, 118, 3195, 2910, 80, false],
    ['285/70R17', 17, 'E', 121, 118, 3195, 2910, 80, false],
    ['315/70R17', 17, 'D', 121, 118, 3195, 2910, 65, false],
    ['33X12.50R17', 17, 'C', 105, null, 2040, null, 50, true],
    ['35X12.50R17', 17, 'D', 119, null, 3000, null, 50, true],
    ['265/70R18', 18, 'E', 124, 121, 3525, 3195, 80, false],
    ['275/70R18', 18, 'E', 125, 122, 3640, 3305, 80, false],
    ['275/65R18', 18, 'E', 123, 120, 3415, 3085, 80, false],
    ['285/60R18', 18, 'E', 122, 119, 3305, 3000, 80, false],
    ['33X12.50R18', 18, 'E', 118, null, 2910, null, 65, true],
    ['35X12.50R18', 18, 'D', 118, null, 2910, null, 50, true],
    ['275/65R20', 20, 'E', 126, 123, 3750, 3415, 80, false],
    ['33X12.50R20', 20, 'E', 114, null, 2600, null, 65, true],
    ['35X12.50R20', 20, 'E', 121, null, 3195, null, 65, true]
  ].map(function (row) { return fromPrinted("general", "at2", row); });

  var GENERAL_ATX = [
    ['285/75R16', 16, 'E', 126, 123, 3750, null, 80, false],
    ['305/70R16', 16, 'E', 124, 121, 3525, null, 65, false],
    ['315/75R16', 16, 'E', 127, 124, 3860, null, 65, false],
    ['245/70R17', 17, 'E', 119, 116, 2998, null, 80, false],
    ['275/70R17', 17, 'E', 121, 118, 3195, null, 80, false],
    ['35X12.50R17', 17, 'E', 121, null, 3195, null, 65, true],
    ['37X12.50R17', 17, 'D', 124, null, 3525, null, 50, true],
    ['285/65R18', 18, 'E', 125, 122, 3640, null, 80, false],
    ['265/60R20', 20, 'E', 121, 118, 3195, null, 80, false],
    ['275/55R20', 20, 'D', 115, 112, 2679, null, 65, false],
    ['275/60R20', 20, 'D', 119, 116, 2998, null, 65, false],
    ['285/55R20', 20, 'D', 117, 114, 2833, null, 65, false],
    ['285/60R20', 20, 'E', 125, 122, 3640, null, 80, false],
    ['305/55R20', 20, 'E', 121, 118, 3195, null, 65, false],
    ['325/60R20', 20, 'E', 126, null, 3750, null, 65, false]
  ].map(function (row) { return fromPrinted("general", "atx", row); });

  var BFG_KO2 = [
    ['215/75R15', 15, 'C', 100, null, 1765, 1610, 50, false],
    ['235/75R15', 15, 'C', 104, null, 1985, 1820, 50, false],
    ['215/65R16', 16, 'D', 103, null, 1930, 1765, 65, false],
    ['215/70R16', 16, 'C', 100, null, 1765, 1610, 50, false],
    ['225/70R16', 16, 'C', 102, null, 1875, 1710, 50, false],
    ['235/70R16', 16, 'C', 104, null, 1985, 1820, 50, false],
    ['245/70R16', 16, 'D', 113, null, 2535, 2335, 65, false],
    ['255/70R16', 16, 'E', 120, null, 3085, 2835, 80, false],
    ['265/70R16', 16, 'E', 121, null, 3195, 2910, 80, false],
    ['275/70R16', 16, 'D', 119, null, 3000, 2755, 65, false],
    ['305/70R16', 16, 'E', 124, null, 3525, 3195, 65, false],
    ['225/75R16', 16, 'E', 115, null, 2680, 2470, 80, false],
    ['245/75R16', 16, 'E', 120, null, 3042, 2778, 80, false],
    ['265/75R16', 16, 'E', 123, null, 3415, 3085, 80, false],
    ['285/75R16', 16, 'E', 126, null, 3750, 3415, 80, false],
    ['295/75R16', 16, 'E', 128, null, 3970, 3640, 80, false],
    ['315/75R16', 16, 'E', 127, null, 3860, 3525, 65, false],
    ['235/85R16', 16, 'E', 120, null, 3042, 2778, 80, false],
    ['225/65R17', 17, 'D', 107, null, 2150, 1930, 65, false],
    ['245/65R17', 17, 'D', 111, null, 2405, 2205, 65, false],
    ['265/65R17', 17, 'E', 120, null, 3085, 2835, 80, false],
    ['275/65R17', 17, 'E', 121, null, 3195, 2910, 80, false],
    ['305/65R17', 17, 'E', 121, null, 3195, 2910, 65, false],
    ['245/70R17', 17, 'E', 119, null, 3000, 2755, 80, false],
    ['255/70R17', 17, 'E', 121, null, 3195, 2910, 80, false],
    ['265/70R17', 17, 'C', 112, null, 2470, 2270, 50, false],
    ['265/70R17', 17, 'E', 121, null, 3195, 2910, 80, false],
    ['275/70R17', 17, 'E', 121, null, 3195, 2910, 80, false],
    ['285/70R17', 17, 'E', 121, null, 3195, 2910, 80, false],
    ['315/70R17', 17, 'E', 121, null, 3195, 2910, 65, false],
    ['245/75R17', 17, 'E', 121, null, 3195, 2910, 80, false],
    ['255/75R17', 17, 'C', 111, null, 2405, 2205, 50, false],
    ['235/80R17', 17, 'E', 120, null, 3085, 2835, 80, false],
    ['255/55R18', 18, 'D', 109, null, 2270, 2040, 65, false],
    ['265/60R18', 18, 'E', 119, null, 3000, 2755, 80, false],
    ['285/60R18', 18, 'D', 118, null, 2910, 2680, 65, false],
    ['265/65R18', 18, 'E', 122, null, 3305, 3000, 80, false],
    ['275/65R18', 18, 'E', 123, null, 3415, 3085, 80, false],
    ['285/65R18', 18, 'E', 125, null, 3640, 3305, 80, false],
    ['305/65R18', 18, 'E', 124, null, 3525, 3195, 65, false],
    ['325/65R18', 18, 'E', 127, null, 3860, 3525, 65, false],
    ['255/70R18', 18, 'D', 117, null, 2835, 2600, 65, false],
    ['265/70R18', 18, 'E', 124, null, 3525, 3195, 80, false],
    ['275/70R18', 18, 'E', 125, null, 3640, 3305, 80, false],
    ['275/55R20', 20, 'D', 115, null, 2680, 2470, 65, false],
    ['285/55R20', 20, 'D', 117, null, 2835, 2600, 65, false],
    ['305/55R20', 20, 'E', 121, null, 3195, 2910, 65, false],
    ['275/60R20', 20, 'D', 119, null, 3000, 2755, 65, false],
    ['325/60R20', 20, 'E', 126, null, 3750, 3415, 65, false],
    ['275/65R20', 20, 'E', 126, null, 3750, 3415, 80, false],
    ['285/65R20', 20, 'E', 127, null, 3860, 3525, 80, false],
    ['30X9.50R15', 15, 'C', 104, null, 1990, null, 50, true],
    ['31X10.50R15', 15, 'C', 109, null, 2270, null, 50, true],
    ['33X10.50R15', 15, 'C', 114, null, 2600, null, 50, true],
    ['32X11.50R15', 15, 'C', 113, null, 2535, null, 50, true],
    ['33X12.50R15', 15, 'C', 108, null, 2205, null, 35, true],
    ['35X12.50R15', 15, 'C', 113, null, 2535, null, 35, true],
    ['34X10.50R17', 17, 'D', 120, null, 3085, null, 65, true],
    ['35X12.50R17', 17, 'E', 121, null, 3195, null, 65, true],
    ['37X12.50R17', 17, 'D', 124, null, 3525, null, 50, true],
    ['34X12.50R18', 18, 'E', 121, null, 3195, null, 65, true],
    ['35X12.50R18', 18, 'E', 123, null, 3415, null, 65, true],
    ['35X12.50R20', 20, 'E', 121, null, 3195, null, 75, true]
  ].map(function (row) { return fromPrinted("bfgoodrich", "ko2", row); });

  var GENERAL_ENTRIES = GENERAL_AT2.concat(GENERAL_ATX);
  var ALL = GENERAL_ENTRIES.concat(BFG_KO2);

  function isSupportedRim(rimIn) {
    var n = Number(rimIn);
    var i;
    for (i = 0; i < SUPPORTED_RIMS.length; i++) {
      if (SUPPORTED_RIMS[i] === n) return true;
    }
    return false;
  }

  function listForSize(sizeKey, maker) {
    var out = [];
    var i;
    for (i = 0; i < ALL.length; i++) {
      if (ALL[i].sizeKey === sizeKey && (!maker || ALL[i].maker === maker)) {
        out.push(ALL[i]);
      }
    }
    return out;
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
    if (opts.family && opts.family !== "LT" && opts.family !== "P") {
      return { ok: false, error: "unknown-size", sizeKey: sizeKey, family: opts.family };
    }
    var maker = opts.maker || null;
    if (maker && maker !== "general" && maker !== "bfgoodrich") {
      return { ok: false, error: "unknown-size", sizeKey: sizeKey, family: "LT" };
    }
    var candidates = listForSize(sizeKey, maker === "bfgoodrich" || maker === "general" ? maker : "general");
    if (!candidates.length) {
      return { ok: false, error: "unknown-size", sizeKey: sizeKey, family: "LT", maker: maker };
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
        family: "LT",
        maker: candidates[0].maker,
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
        family: "LT",
        maker: filtered[0].maker,
        available: availableLis(filtered),
        candidates: filtered
      };
    }
    if (!lr) {
      var sameLr = true;
      var i;
      for (i = 1; i < filtered.length; i++) {
        if (filtered[i].loadRange !== filtered[0].loadRange) sameLr = false;
      }
      if (sameLr) return { ok: true, entry: filtered[0], ambiguous: false };
      return {
        ok: false,
        error: "ambiguous",
        sizeKey: sizeKey,
        family: "LT",
        maker: filtered[0].maker,
        wantedLoadIndex: li,
        available: availableLis(filtered),
        candidates: filtered
      };
    }
    return { ok: true, entry: filtered[0], ambiguous: false };
  }

  var api = {
    SUPPORTED_RIMS: SUPPORTED_RIMS,
    RETRIEVED: RETRIEVED,
    SRC: SRC,
    LB_TO_KG: LB_TO_KG,
    lbToKg: lbToKg,
    psiToBar: psiToBar,
    GENERAL_ENTRIES: GENERAL_ENTRIES,
    BFG_ENTRIES: BFG_KO2,
    ALL: ALL,
    isSupportedRim: isSupportedRim,
    listForSize: listForSize,
    matchEntry: matchEntry
  };

  root.TyreAmberDb = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
