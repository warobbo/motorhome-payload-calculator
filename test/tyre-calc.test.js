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
  LT_TABLES,
  LT_DATABOOK_SOURCE,
  TraDb,
  WAYNE_EXAMPLE,
  getChart,
  suggestChartId,
  resolvePressurePath,
  splitAxleLoads,
  roundUpBar,
  ltCapacityAtBar,
  ltColdBarForAxleLoad,
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
  it("decodes Wayne’s General Grabber LT marking and keeps the LT family", function () {
    const a = parseSidewall("LT265/65R17 120/117S");
    const b = parseSidewall("265/65 R17 120/117S");
    const c = parseSidewall("General Grabber LT265/65R17 120/117S");
    assert.equal(a.ok, true);
    assert.equal(a.family, "LT");
    assert.equal(a.prefix, "LT");
    assert.equal(a.sizeKey, "265/65R17");
    assert.equal(a.widthMm, 265);
    assert.equal(a.aspect, 65);
    assert.equal(a.rimIn, 17);
    assert.equal(a.loadIndex, 120);
    assert.equal(a.dualLoadIndex, 117);
    assert.equal(a.speed.code, "S");
    assert.equal(b.ok, true);
    assert.equal(b.sizeKey, "265/65R17");
    assert.equal(b.loadIndex, 120);
    assert.equal(b.family, "P");
    assert.equal(c.ok, true);
    assert.equal(c.family, "LT");
    assert.equal(c.sizeKey, "265/65R17");
  });

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
  it("picks the book C table when that 15–18″ size is embedded", function () {
    assert.equal(suggestChartId(parseSidewall("215/70 R15C 109/107 Q")), "c-databook");
  });

  it("falls back to the ETRTO C-type 3.75 bar chart for a C size not in the book", function () {
    assert.equal(suggestChartId(parseSidewall("195/75 R15C 110/108 R")), "c375");
    assert.equal(suggestChartId(parseSidewall("225/70 R15CP 115/113 Q")), "c375");
  });

  it("picks the Continental LT databook for LT-metric markings, not the C-type formula", function () {
    assert.equal(suggestChartId(parseSidewall("LT265/65R17 120/117S")), "lt-databook");
    assert.equal(suggestChartId(parseSidewall("265/65 R17 120/117S")), "lt-databook");
    assert.equal(suggestChartId({ ok: true, service: "LT", family: "LT", extraLoad: false }), "lt-databook");
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

  it("uses the Continental databook for Wayne’s Grabber, not the C-type ETRTO path", function () {
    const lt = coldPressureForAxle({
      sidewall: WAYNE_EXAMPLE.sidewall,
      axleLoadKg: WAYNE_EXAMPLE.frontAxleKg,
      tyresOnAxle: 2
    });
    const cType = coldPressureForAxle({
      sidewall: "215/70 R15C 109/107 Q",
      axleLoadKg: WAYNE_EXAMPLE.frontAxleKg,
      tyresOnAxle: 2,
      chartId: "c375"
    });
    assert.equal(lt.path, "lt-databook");
    assert.equal(lt.bar, 3.5);
    assert.equal(cType.path, "c-databook");
    assert.notEqual(lt.bar, cType.bar);
  });
});

describe("LT265/65R17 Continental Databook 2025", function () {
  it("embeds the official kg-per-axle Single and Dual rows", function () {
    const rows = LT_TABLES["265/65R17"].rows;
    assert.match(LT_DATABOOK_SOURCE, /TRA-standard values as published in Continental Tyre Databook/);
    assert.match(LT_DATABOOK_SOURCE, /2025 row used for LT265\/65R17/);
    assert.equal(LT_TABLES["265/65R17"].loadRange, "E");
    assert.equal(LT_TABLES["265/65R17"].sourceYear, 2025);
    assert.equal(rows[0].bar, 2.5);
    assert.equal(rows[0].singleKg, 1490);
    assert.equal(rows[0].dualKg, 2735);
    assert.equal(rows[2].bar, 3.5);
    assert.equal(rows[2].singleKg, 1950);
    assert.equal(rows[3].bar, 4.0);
    assert.equal(rows[3].singleKg, 2170);
    const max = rows[rows.length - 1];
    assert.equal(max.bar, 5.5);
    assert.equal(max.singleKg, 2800);
    assert.equal(max.dualKg, 5140);
  });

  it("returns exact capacity on a published bar step and refuses invented steps", function () {
    const r = ltCapacityAtBar({ bar: 5.5, column: "single", sizeKey: "265/65R17" });
    assert.equal(r.ok, true);
    assert.equal(r.capacityKg, 2800);
    const dual = ltCapacityAtBar({ bar: 5.5, column: "dual", sizeKey: "265/65R17" });
    assert.equal(dual.capacityKg, 5140);
    assert.equal(ltCapacityAtBar({ bar: 3.25, column: "single", sizeKey: "265/65R17" }).error, "outside-table");
    assert.equal(ltCapacityAtBar({ bar: 3.5, column: "single", sizeKey: "275/70R19" }).error, "unknown-table");
  });

  it("steps to the lowest bar whose Single kg/axle covers the axle load", function () {
    assert.equal(ltColdBarForAxleLoad({ axleLoadKg: 1800, column: "single" }).bar, 3.5);
    assert.equal(ltColdBarForAxleLoad({ axleLoadKg: 2100, column: "single" }).bar, 4.0);
    assert.equal(ltColdBarForAxleLoad({ axleLoadKg: 2800, column: "single" }).bar, 5.5);
    assert.equal(ltColdBarForAxleLoad({ axleLoadKg: 1720, column: "single" }).bar, 3.0);
    assert.equal(ltColdBarForAxleLoad({ axleLoadKg: 1721, column: "single" }).bar, 3.5);
    assert.equal(ltColdBarForAxleLoad({ axleLoadKg: 1950, column: "single" }).bar, 3.5);
    assert.equal(ltColdBarForAxleLoad({ axleLoadKg: 1951, column: "single" }).bar, 4.0);
  });

  it("fails when the axle load is over 2800 kg Single at 5.5 bar", function () {
    const r = ltColdBarForAxleLoad({ axleLoadKg: 2801, column: "single" });
    assert.equal(r.status, "over-capacity");
    assert.equal(r.bar, null);
    assert.equal(r.psi, null);
    assert.equal(r.maxBar, 5.5);
    assert.equal(r.maxKg, 2800);
  });

  it("compares axle kg directly and does not divide by 2", function () {
    const front = coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    const rear = coldPressureForAxle({
      sidewall: "265/65 R17 120/117S",
      axleLoadKg: 2100,
      tyresOnAxle: 2
    });
    assert.equal(front.path, "lt-databook");
    assert.equal(front.column, "single");
    assert.equal(front.bar, 3.5);
    assert.equal(front.axleLoadKg, 1800);
    assert.equal(front.capacityKg, 1950);
    assert.ok(Math.abs(front.psi - 3.5 * BAR_TO_PSI) < 0.05);
    assert.equal(rear.path, "lt-databook");
    assert.equal(rear.bar, 4.0);
    assert.equal(rear.capacityKg, 2170);
    assert.notEqual(front.bar, 3.1);
    assert.notEqual(rear.psi, 55);
    assert.equal(resolvePressurePath(parseSidewall("265/65 R17 120/117S")).path, "lt-databook");
  });

  it("shows Wayne’s sample as 3.5 bar front and 4.0 bar rear", function () {
    const front = coldPressureForAxle({
      sidewall: WAYNE_EXAMPLE.sidewall,
      axleLoadKg: WAYNE_EXAMPLE.frontAxleKg,
      tyresOnAxle: 2
    });
    const rear = coldPressureForAxle({
      sidewall: WAYNE_EXAMPLE.sidewall,
      axleLoadKg: WAYNE_EXAMPLE.rearAxleKg,
      tyresOnAxle: 2
    });
    assert.equal(front.bar, 3.5);
    assert.equal(rear.bar, 4.0);
    assert.equal(front.status, "ok");
    assert.equal(rear.status, "ok");
  });

  it("uses the Dual column only when there are four tyres on the axle", function () {
    const r = coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      axleLoadKg: 3600,
      tyresOnAxle: 4
    });
    assert.equal(r.column, "dual");
    assert.equal(r.useDual, true);
    assert.equal(r.bar, 4.0);
    assert.equal(r.capacityKg, 3980);
    const stillSingle = coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      axleLoadKg: 2100,
      tyresOnAxle: 2
    });
    assert.equal(stillSingle.column, "single");
    assert.equal(stillSingle.bar, 4.0);
  });

  it("covers 2800 kg Single at 5.5 bar and fails 2801", function () {
    const ok = coldPressureForAxle({
      sidewall: WAYNE_EXAMPLE.sidewall,
      axleLoadKg: 2800,
      tyresOnAxle: 2
    });
    assert.equal(ok.status, "ok");
    assert.equal(ok.bar, 5.5);
    const fail = coldPressureForAxle({
      sidewall: WAYNE_EXAMPLE.sidewall,
      axleLoadKg: 2801,
      tyresOnAxle: 2
    });
    assert.equal(fail.status, "over-capacity");
    assert.equal(fail.bar, null);
    assert.equal(fail.psi, null);
  });
});

describe("C vs LT path", function () {
  it("uses the Continental Van table for a listed 15–18″ C size", function () {
    const parsed = parseSidewall("215/70 R15C 109/107 Q");
    assert.equal(parsed.family, "C");
    assert.equal(resolvePressurePath(parsed).path, "c-databook");
    const r = coldPressureForAxle({
      sidewall: "215/70 R15C 109/107 Q",
      axleLoadKg: 1600,
      tyresOnAxle: 2
    });
    assert.equal(r.path, "c-databook");
    assert.equal(r.status, "ok");
    assert.equal(r.bar, 3.5);
    assert.equal(r.capacityKg, 1685);
  });

  it("keeps the ETRTO path for a C size that is not in the book", function () {
    const parsed = parseSidewall("195/75 R15C 110/108 R");
    assert.equal(parsed.family, "C");
    assert.equal(resolvePressurePath(parsed).path, "c-etrto");
    const r = coldPressureForAxle({
      sidewall: "195/75 R15C 110/108 R",
      axleLoadKg: 1600,
      tyresOnAxle: 2
    });
    assert.equal(r.path, "c-etrto");
    assert.equal(r.status, "ok");
    assert.ok(r.bar > 0);
  });

  it("does not invent a table for a P-metric size we have not embedded", function () {
    const parsed = parseSidewall("205/65 R16 95H");
    assert.equal(parsed.family, "P");
    assert.equal(resolvePressurePath(parsed).path, "no-table");
    assert.equal(resolvePressurePath(parsed).reason, "p-metric");
    assert.equal(coldPressureForAxle({
      sidewall: "205/65 R16 95H",
      axleLoadKg: 1200,
      tyresOnAxle: 2
    }).error, "no-table");
  });

  it("refuses an LT size that is not in the embedded 15–18″ table", function () {
    const parsed = parseSidewall("LT245/70R16 119/116S");
    assert.equal(parsed.family, "LT");
    // 245/70R16 LRD is 113/110 — LI 119 is not a matching row
    assert.equal(resolvePressurePath(parsed).reason, "lt-size-unknown");
    assert.equal(coldPressureForAxle({
      sidewall: "LT245/70R16 119/116S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    }).error, "no-table");
  });
});

describe("TRA 15–18″ database", function () {
  it("looks up several other LT sizes from the 2020–2021 book", function () {
    const a = coldPressureForAxle({
      sidewall: "LT245/75R16 120/116S",
      axleLoadKg: 2000,
      tyresOnAxle: 2
    });
    assert.equal(a.path, "lt-databook");
    assert.equal(a.bar, 3.5);
    assert.equal(a.capacityKg, 2000);

    const b = coldPressureForAxle({
      sidewall: "LT215/85R16 115/112S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(b.bar, 4.0);
    assert.equal(b.capacityKg, 1930);

    const c = coldPressureForAxle({
      sidewall: "LT225/70R17 115/112S",
      axleLoadKg: 1750,
      tyresOnAxle: 2
    });
    assert.equal(c.bar, 3.5);
    assert.equal(c.capacityKg, 1750);

    const d = coldPressureForAxle({
      sidewall: "LT275/70R18 125/122S",
      axleLoadKg: 2500,
      tyresOnAxle: 2
    });
    assert.equal(d.bar, 4.0);
    assert.equal(d.capacityKg, 2680);
  });

  it("picks the matching load range when a size has more than one row", function () {
    const lrd = coldPressureForAxle({
      sidewall: "LT225/75R16 110/107S",
      axleLoadKg: 2120,
      tyresOnAxle: 2
    });
    assert.equal(lrd.table.loadRange, "D");
    assert.equal(lrd.bar, 4.5);
    assert.equal(lrd.status, "ok");

    const overLrd = coldPressureForAxle({
      sidewall: "LT225/75R16 110/107S",
      axleLoadKg: 2121,
      tyresOnAxle: 2
    });
    assert.equal(overLrd.status, "over-capacity");

    const lre = coldPressureForAxle({
      sidewall: "LT225/75R16 LRE 115/112S",
      axleLoadKg: 2280,
      tyresOnAxle: 2
    });
    assert.equal(lre.table.loadRange, "E");
    assert.equal(lre.bar, 5.0);
  });

  it("refuses a 19″ rim instead of inventing a pressure", function () {
    const parsed = parseSidewall("LT275/70R19 125/122S");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.rimIn, 19);
    assert.equal(resolvePressurePath(parsed).path, "unsupported-rim");
    const r = coldPressureForAxle({
      sidewall: "LT275/70R19 125/122S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "unsupported-rim");
    assert.equal(r.bar, undefined);
  });

  it("fails when an LT axle load is over the last published step", function () {
    const r = coldPressureForAxle({
      sidewall: "LT215/85R16 115/112S",
      axleLoadKg: 2431,
      tyresOnAxle: 2
    });
    assert.equal(r.status, "over-capacity");
    assert.equal(r.bar, null);
    assert.equal(r.maxKg, 2430);
    assert.equal(r.maxBar, 5.5);
  });

  it("does not use the older 2020 mid-pressure figures for LT265/65R17", function () {
    const mid = TraDb.LT_ENTRIES.filter(function (row) {
      return row.sizeKey === "265/65R17";
    });
    assert.equal(mid.length, 1);
    assert.equal(mid[0].sourceYear, 2025);
    assert.equal(mid[0].rows[2].singleKg, 1950);
    assert.notEqual(mid[0].rows[2].singleKg, 2060);
    assert.equal(mid[0].rows[1].singleKg, 1720);
    assert.notEqual(mid[0].rows[1].singleKg, 1860);
  });

  it("reads a flotation LT size on a 15″ rim", function () {
    const p = parseSidewall("31x10.50R15LT");
    assert.equal(p.ok, true);
    assert.equal(p.family, "LT");
    assert.equal(p.flotation, true);
    assert.equal(p.sizeKey, "31X10.50R15");
    const r = coldPressureForAxle({
      sidewall: "31x10.50R15LT",
      axleLoadKg: 1600,
      tyresOnAxle: 2
    });
    assert.equal(r.path, "lt-databook");
    assert.equal(r.bar, 2.5);
  });
});

describe("describeSidewall LT", function () {
  it("says the LT family uses the Continental TRA-standard databook", function () {
    const text = describeSidewall(parseSidewall("LT265/65R17 120/117S"));
    assert.match(text.service, /Continental Tyre Databook/);
    assert.match(text.service, /kg per axle/);
    assert.match(text.service, /2025 row is used for LT265\/65R17/);
    assert.match(text.service, /[Nn]ot the old US lb\/PSI extract/);
    assert.match(text.service, /not the European C-type/);
    assert.match(text.load, /1400 kg/);
  });
});
