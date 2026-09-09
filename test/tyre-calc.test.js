"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  BAR_TO_PSI,
  barToPsi,
  psiToBar,
  roundBar,
  roundPsi,
  loadIndexToKg,
  speedRatingInfo,
  parseSidewall,
  describeSidewall,
  checkAxleCapacity,
  PRESSURE_CHARTS,
  PRESSURE_EXPONENT,
  getChart,
  suggestChartId,
  splitAxleLoads,
  roundUpBar,
  coldPressureForLoad,
  coldPressureForAxle
} = require("../lib/tyre-calc");

describe("bar ↔ PSI", function () {
  it("uses the standard bar-to-PSI factor", function () {
    assert.ok(BAR_TO_PSI > 14.5 && BAR_TO_PSI < 14.51);
  });

  it("converts both directions", function () {
    assert.equal(barToPsi(1), BAR_TO_PSI);
    assert.equal(psiToBar(BAR_TO_PSI), 1);
    assert.ok(Math.abs(barToPsi(4.5) - 65.267) < 0.01);
    assert.ok(Math.abs(psiToBar(65) - 4.4816) < 0.001);
  });

  it("round-trips a typical motorhome pressure", function () {
    const bar = 4.5;
    assert.ok(Math.abs(psiToBar(barToPsi(bar)) - bar) < 1e-10);
  });

  it("returns null for empty or junk values", function () {
    assert.equal(barToPsi(""), null);
    assert.equal(barToPsi(null), null);
    assert.equal(barToPsi("nope"), null);
    assert.equal(psiToBar(undefined), null);
    assert.equal(roundBar(""), null);
    assert.equal(roundPsi("x"), null);
  });

  it("rounds for display without inventing a value", function () {
    assert.equal(roundBar(4.504), 4.5);
    assert.equal(roundPsi(65.26), 65.3);
    assert.equal(roundBar(0), 0);
  });
});

describe("loadIndexToKg", function () {
  it("maps well-known public load-index values", function () {
    assert.equal(loadIndexToKg(95), 690);
    assert.equal(loadIndexToKg(107), 975);
    assert.equal(loadIndexToKg(109), 1030);
    assert.equal(loadIndexToKg(116), 1250);
    assert.equal(loadIndexToKg("109"), 1030);
  });

  it("returns null outside the table", function () {
    assert.equal(loadIndexToKg(12), null);
    assert.equal(loadIndexToKg(250), null);
    assert.equal(loadIndexToKg(""), null);
    assert.equal(loadIndexToKg("Q"), null);
  });
});

describe("parseSidewall", function () {
  it("decodes a typical C-rated motorhome marking", function () {
    const p = parseSidewall("215/70 R15C 109/107 Q");
    assert.equal(p.ok, true);
    assert.equal(p.widthMm, 215);
    assert.equal(p.aspect, 70);
    assert.equal(p.construction, "R");
    assert.equal(p.rimIn, 15);
    assert.equal(p.service, "C");
    assert.equal(p.loadIndex, 109);
    assert.equal(p.dualLoadIndex, 107);
    assert.equal(p.speed.code, "Q");
    assert.equal(p.speed.kmh, 160);
  });

  it("accepts compact and messy spacing", function () {
    const a = parseSidewall("215/70R15C 109/107Q");
    const b = parseSidewall("  225/75  r16  c  116/114  q  ");
    assert.equal(a.ok, true);
    assert.equal(a.service, "C");
    assert.equal(a.loadIndex, 109);
    assert.equal(a.speedCode, "Q");
    assert.equal(b.ok, true);
    assert.equal(b.widthMm, 225);
    assert.equal(b.rimIn, 16);
    assert.equal(b.loadIndex, 116);
    assert.equal(b.dualLoadIndex, 114);
  });

  it("decodes a passenger car code with a single load index", function () {
    const p = parseSidewall("205/65 R16 95H");
    assert.equal(p.ok, true);
    assert.equal(p.service, "");
    assert.equal(p.loadIndex, 95);
    assert.equal(p.dualLoadIndex, null);
    assert.equal(p.speed.code, "H");
    assert.equal(p.speed.kmh, 210);
  });

  it("decodes a CP camping tyre", function () {
    const p = parseSidewall("225/70 R15CP 115/113 Q");
    assert.equal(p.ok, true);
    assert.equal(p.service, "CP");
    assert.equal(p.loadIndex, 115);
    assert.equal(p.dualLoadIndex, 113);
  });

  it("still reads size when load and speed are missing", function () {
    const p = parseSidewall("195/70 R15C");
    assert.equal(p.ok, true);
    assert.equal(p.rimIn, 15);
    assert.equal(p.service, "C");
    assert.equal(p.loadIndex, null);
    assert.equal(p.speed, null);
  });

  it("rejects empty and unrecognised strings", function () {
    assert.equal(parseSidewall("").ok, false);
    assert.equal(parseSidewall("   ").error, "empty");
    assert.equal(parseSidewall("door sticker 4.5 bar").ok, false);
    assert.equal(parseSidewall("215-70").error, "unrecognised");
  });

  it("rejects an unknown load index rather than guessing kg", function () {
    const p = parseSidewall("215/70 R15C 12 Q");
    assert.equal(p.ok, false);
    assert.equal(p.error, "unknown-load-index");
  });
});

describe("describeSidewall", function () {
  it("explains size, C-rating, dual load and speed in plain English", function () {
    const text = describeSidewall(parseSidewall("215/70 R15C 109/107 Q"));
    assert.match(text.size, /215 mm wide/);
    assert.match(text.size, /15-inch/);
    assert.match(text.service, /C-rated commercial/);
    assert.match(text.load, /1030 kg/);
    assert.match(text.load, /975 kg/);
    assert.match(text.speed, /160 km\/h/);
  });

  it("returns null when parse failed", function () {
    assert.equal(describeSidewall(parseSidewall("nope")), null);
  });
});

describe("speedRatingInfo", function () {
  it("knows common motorhome letters", function () {
    assert.equal(speedRatingInfo("Q").kmh, 160);
    assert.equal(speedRatingInfo("r").kmh, 170);
    assert.equal(speedRatingInfo("H").mph, 130);
    assert.equal(speedRatingInfo("Z"), null);
  });
});

describe("checkAxleCapacity", function () {
  it("treats two LI 109 tyres as 2060 kg", function () {
    const r = checkAxleCapacity({ axleLoadKg: 1800, loadIndex: 109, tyresOnAxle: 2 });
    assert.equal(r.ok, true);
    assert.equal(r.useDual, false);
    assert.equal(r.kgEach, 1030);
    assert.equal(r.capacityKg, 2060);
    assert.equal(r.marginKg, 260);
    assert.equal(r.status, "ok");
  });

  it("flags overload when axle load is above capacity", function () {
    const r = checkAxleCapacity({ axleLoadKg: 2100, loadIndex: 109, tyresOnAxle: 2 });
    assert.equal(r.status, "over");
    assert.equal(r.marginKg, -40);
  });

  it("flags tight when there is little or no spare capacity", function () {
    const atLimit = checkAxleCapacity({ axleLoadKg: 2060, loadIndex: 109, tyresOnAxle: 2 });
    assert.equal(atLimit.status, "tight");
    assert.equal(atLimit.marginKg, 0);
    const almost = checkAxleCapacity({ axleLoadKg: 1960, loadIndex: 109, tyresOnAxle: 2 });
    assert.equal(almost.status, "tight");
  });

  it("uses the dual figure only when the axle has four tyres", function () {
    const dual = checkAxleCapacity({
      axleLoadKg: 3400,
      loadIndex: 109,
      dualLoadIndex: 107,
      tyresOnAxle: 4
    });
    assert.equal(dual.useDual, true);
    assert.equal(dual.usedIndex, 107);
    assert.equal(dual.kgEach, 975);
    assert.equal(dual.capacityKg, 3900);
    assert.equal(dual.status, "ok");
    const dualTight = checkAxleCapacity({
      axleLoadKg: 3800,
      loadIndex: 109,
      dualLoadIndex: 107,
      tyresOnAxle: 4
    });
    assert.equal(dualTight.status, "tight");

    const singles = checkAxleCapacity({
      axleLoadKg: 1800,
      loadIndex: 109,
      dualLoadIndex: 107,
      tyresOnAxle: 2
    });
    assert.equal(singles.useDual, false);
    assert.equal(singles.usedIndex, 109);
    assert.equal(singles.capacityKg, 2060);
  });

  it("falls back to the single index on duals if the second figure is missing", function () {
    const r = checkAxleCapacity({ axleLoadKg: 3500, loadIndex: 109, tyresOnAxle: 4 });
    assert.equal(r.useDual, false);
    assert.equal(r.dualFallback, true);
    assert.equal(r.capacityKg, 4120);
    assert.equal(r.status, "ok");
  });

  it("asks for axle load once capacity can be shown", function () {
    const r = checkAxleCapacity({ loadIndex: 109, tyresOnAxle: 2 });
    assert.equal(r.status, "need-load");
    assert.equal(r.capacityKg, 2060);
    assert.equal(r.marginKg, null);
  });

  it("rejects missing or invalid inputs without inventing a result", function () {
    assert.equal(checkAxleCapacity({ axleLoadKg: 1800, tyresOnAxle: 2 }).error, "load-index");
    assert.equal(checkAxleCapacity({ axleLoadKg: 1800, loadIndex: 12, tyresOnAxle: 2 }).error, "unknown-load-index");
    assert.equal(checkAxleCapacity({ axleLoadKg: 1800, loadIndex: 109, tyresOnAxle: 0 }).error, "tyres");
    assert.equal(checkAxleCapacity({ axleLoadKg: 1800, loadIndex: 109, tyresOnAxle: 1.5 }).error, "tyres");
    assert.equal(checkAxleCapacity({ axleLoadKg: 1800, loadIndex: 109, tyresOnAxle: -2 }).error, "tyres");
  });
});

describe("suggestChartId", function () {
  it("picks the ETRTO C-type 3.75 bar chart for C, CP and LT", function () {
    assert.equal(suggestChartId(parseSidewall("215/70 R15C 109/107 Q")), "c375");
    assert.equal(suggestChartId(parseSidewall("225/70 R15CP 115/113 Q")), "c375");
    assert.equal(suggestChartId({ ok: true, service: "LT", extraLoad: false }), "c375");
  });

  it("picks passenger or XL from the marking", function () {
    assert.equal(suggestChartId(parseSidewall("205/65 R16 95H")), "passenger");
    assert.equal(suggestChartId({ ok: true, service: "", extraLoad: true }), "xl");
  });
});

describe("splitAxleLoads", function () {
  it("splits a total weight by front percent", function () {
    const r = splitAxleLoads(3500, 40);
    assert.equal(r.ok, true);
    assert.equal(r.estimate, true);
    assert.equal(r.frontKg, 1400);
    assert.equal(r.rearKg, 2100);
  });

  it("rejects junk without inventing a split", function () {
    assert.equal(splitAxleLoads("", 40).ok, false);
    assert.equal(splitAxleLoads(3500, 140).ok, false);
  });
});

describe("coldPressureForLoad", function () {
  it("returns the reference pressure at the full load index", function () {
    const r = coldPressureForLoad({ loadPerTyreKg: 1030, loadIndex: 109, chartId: "c375" });
    assert.equal(r.ok, true);
    assert.equal(r.status, "ok");
    assert.equal(r.bar, 3.75);
    assert.equal(getChart("c375").prefBar, 3.75);
    assert.equal(PRESSURE_EXPONENT, 1.25);
    assert.ok(PRESSURE_CHARTS.c375);
  });

  it("uses the 0.8-power ETRTO interpolation and never rounds down", function () {
    const loadKg = 800;
    const raw = 3.75 * Math.pow(800 / 1030, 1.25);
    const r = coldPressureForLoad({ loadPerTyreKg: loadKg, loadIndex: 109, chartId: "c375" });
    assert.equal(r.status, "ok");
    assert.ok(r.bar >= raw - 1e-9);
    assert.equal(r.bar, roundUpBar(raw));
    assert.equal(r.psi, Math.round(r.bar * (14.503773773) * 10) / 10);
  });

  it("uses the C 4.50 bar chart when that table is selected", function () {
    const full = coldPressureForLoad({ loadPerTyreKg: 1030, loadIndex: 109, chartId: "c450" });
    assert.equal(full.bar, 4.5);
    const part = coldPressureForLoad({ loadPerTyreKg: 800, loadIndex: 109, chartId: "c450" });
    const c375 = coldPressureForLoad({ loadPerTyreKg: 800, loadIndex: 109, chartId: "c375" });
    assert.ok(part.bar > c375.bar);
  });

  it("raises a light load to the chart minimum instead of inventing a lower figure", function () {
    const r = coldPressureForLoad({ loadPerTyreKg: 400, loadIndex: 109, chartId: "c375" });
    assert.equal(r.status, "min-pressure");
    assert.equal(r.bar, 2.25);
  });

  it("refuses a pressure when the tyre is over its load index", function () {
    const r = coldPressureForLoad({ loadPerTyreKg: 1100, loadIndex: 109, chartId: "c375" });
    assert.equal(r.status, "over-capacity");
    assert.equal(r.bar, null);
    assert.equal(r.psi, null);
  });

  it("refuses a pressure when the required inflation exceeds the chart max", function () {
    const r = coldPressureForLoad({
      loadPerTyreKg: 1000,
      loadIndex: 109,
      chartId: "c375",
      sidewallMaxBar: 2.5
    });
    assert.equal(r.status, "over-pressure");
    assert.equal(r.bar, null);
  });

  it("does not invent a number for a missing table or load index", function () {
    assert.equal(coldPressureForLoad({ loadPerTyreKg: 800, loadIndex: 109, chartId: "nope" }).error, "unknown-chart");
    assert.equal(coldPressureForLoad({ loadPerTyreKg: 800, loadIndex: 12, chartId: "c375" }).error, "unknown-load-index");
    assert.equal(coldPressureForLoad({ loadIndex: 109, chartId: "c375" }).error, "need-load");
  });
});

describe("coldPressureForAxle", function () {
  it("uses half the axle load on a two-tyre axle", function () {
    const r = coldPressureForAxle({
      axleLoadKg: 1600,
      tyresOnAxle: 2,
      loadIndex: 109,
      chartId: "c375"
    });
    const one = coldPressureForLoad({ loadPerTyreKg: 800, loadIndex: 109, chartId: "c375" });
    assert.equal(r.status, "ok");
    assert.equal(r.useDual, false);
    assert.equal(r.bar, one.bar);
    assert.equal(r.loadKg, 800);
  });

  it("uses the dual load index only on a four-tyre axle", function () {
    const dual = coldPressureForAxle({
      axleLoadKg: 3600,
      tyresOnAxle: 4,
      loadIndex: 109,
      dualLoadIndex: 107,
      chartId: "c375"
    });
    assert.equal(dual.useDual, true);
    assert.equal(dual.usedIndex, 107);
    assert.equal(dual.loadKg, 900);
    assert.equal(dual.lref, 975);
    assert.equal(dual.status, "ok");

    const single = coldPressureForAxle({
      axleLoadKg: 1600,
      tyresOnAxle: 2,
      loadIndex: 109,
      dualLoadIndex: 107,
      chartId: "c375"
    });
    assert.equal(single.useDual, false);
    assert.equal(single.usedIndex, 109);
  });

  it("fails a dual axle that is over the dual load index", function () {
    const r = coldPressureForAxle({
      axleLoadKg: 4000,
      tyresOnAxle: 4,
      loadIndex: 109,
      dualLoadIndex: 107,
      chartId: "c375"
    });
    assert.equal(r.status, "over-capacity");
    assert.equal(r.bar, null);
  });

  it("refuses to invent a pressure without a load index or axle load", function () {
    assert.equal(coldPressureForAxle({ axleLoadKg: 1600, tyresOnAxle: 2, chartId: "c375" }).error, "load-index");
    assert.equal(coldPressureForAxle({ tyresOnAxle: 2, loadIndex: 109, chartId: "c375" }).error, "need-load");
    assert.equal(coldPressureForAxle({ axleLoadKg: 1600, tyresOnAxle: 0, loadIndex: 109, chartId: "c375" }).error, "tyres");
  });
});
