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
  MichelinDb,
  AmberDb,
  detectMaker,
  WAYNE_EXAMPLE,
  getChart,
  suggestChartId,
  resolvePressurePath,
  splitAxleLoads,
  roundUpBar,
  ltCapacityAtBar,
  ltColdBarForAxleLoad,
  coldPressureForLoad,
  coldPressureForAxle,
  formatLiMismatch,
  isUncoveredRefuse,
  ETRTO_CP_SINGLE_REAR_MIN_BAR,
  MICHELIN_CP_REFUSE
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
    assert.equal(p.family, "CP");
    assert.equal(p.loadIndex, 115);
    assert.equal(p.dualLoadIndex, 113);
    const trailing = parseSidewall("225/75R16 116R CP");
    assert.equal(trailing.family, "CP");
    assert.equal(trailing.loadIndex, 116);
  });

  it("reads 225/75 R16CP 118R and 225/75 R16 CP 118R as family CP, LI 118", function () {
    const glued = parseSidewall("225/75 R16CP 118R");
    const spaced = parseSidewall("225/75 R16 CP 118R");
    assert.equal(glued.ok, true);
    assert.equal(spaced.ok, true);
    assert.equal(glued.family, "CP");
    assert.equal(spaced.family, "CP");
    assert.equal(glued.service, "CP");
    assert.equal(spaced.service, "CP");
    assert.equal(glued.loadIndex, 118);
    assert.equal(spaced.loadIndex, 118);
    assert.equal(glued.sizeKey, "225/75R16");
    assert.equal(spaced.sizeKey, "225/75R16");
    assert.equal(glued.speedCode, "R");
    assert.equal(spaced.speedCode, "R");
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
    assert.match(text.service, /C — reinforced van tyre/);
    assert.equal(text.service.includes("ETRTO"), false);
    assert.equal(text.service.includes("VanContact"), false);
    assert.match(text.load, /1030 kg/);
    assert.match(text.load, /975 kg/);
    assert.match(text.speed, /99 mph/);
    assert.match(text.speed, /160 km\/h/);
    assert.match(text.speed, /up to about 99 mph \(160 km\/h\)/);
    assert.equal(/up to \d+ km\/h/.test(text.speed), false);
  });

  it("leads speed ratings with mph, then km/h", function () {
    const r = describeSidewall(parseSidewall("225/75 R16C 118R"));
    assert.equal(r.speed, "Speed rating R — up to about 106 mph (170 km/h)");
    const zr = describeSidewall(parseSidewall("265/65 R17 120 ZR"));
    if (zr && zr.speed) {
      assert.match(zr.speed, /149 mph \(240 km\/h\)/);
      assert.equal(zr.speed.indexOf("mph") < zr.speed.indexOf("km/h"), true);
    }
  });

  it("uses one short line for CP and LT marks", function () {
    assert.equal(
      describeSidewall(parseSidewall("225/75 R16 CP 118R")).service,
      "CP — camping / motorhome tyre (not a plain van C tyre)"
    );
    assert.equal(
      describeSidewall(parseSidewall("LT265/65R17 120/117S")).service,
      "LT — light truck tyre"
    );
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
  });

  it("picks the CP camping table for a CP marking, not the plain C chart", function () {
    assert.equal(suggestChartId(parseSidewall("225/75 R16 CP 116R")), "cp-databook");
    assert.equal(suggestChartId(parseSidewall("215/70 R15CP 109R")), "cp-databook");
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
    const parsed = parseSidewall("LT255/70R17 121/118S");
    assert.equal(parsed.family, "LT");
    assert.equal(resolvePressurePath(parsed).reason, "lt-size-unknown");
    assert.equal(coldPressureForAxle({
      sidewall: "LT255/70R17 121/118S",
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

describe("CP camping lane", function () {
  it("uses the Continental CP front/rear columns, not the plain C table", function () {
    const parsed = parseSidewall("225/75 R16 CP 116R");
    assert.equal(parsed.family, "CP");
    const path = resolvePressurePath(parsed);
    assert.equal(path.path, "cp-databook");
    assert.equal(path.family, "CP");
    assert.equal(path.table.family, "CP");
    assert.equal(path.table.loadIndex, 116);

    const front = coldPressureForAxle({
      sidewall: "225/75 R16 CP 116R",
      axleLoadKg: 2100,
      tyresOnAxle: 2,
      axle: "front"
    });
    assert.equal(front.path, "cp-databook");
    assert.equal(front.bar, 4.0);
    assert.equal(front.column, "front");
    assert.equal(front.capacityKg, 2180);

    const rear = coldPressureForAxle({
      sidewall: "225/75 R16 CP 116R",
      axleLoadKg: 2400,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(rear.path, "cp-databook");
    assert.equal(rear.tableBar, 5.25);
    assert.equal(rear.bar, 5.5);
    assert.equal(rear.recommendedBar, 5.5);
    assert.equal(rear.column, "rear");
    assert.equal(rear.capacityKg, 2410);

    const cRear = coldPressureForAxle({
      sidewall: "225/75 R16C 116/114R",
      axleLoadKg: 2400,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(cRear.path, "c-databook");
    assert.equal(cRear.bar, 4.75);
    assert.notEqual(cRear.bar, rear.bar);
  });

  it("matches the published 215/70 R15 CP 109 front 1500 / rear 1800 steps", function () {
    const front = coldPressureForAxle({
      sidewall: "215/70 R15CP 109R",
      axleLoadKg: 1500,
      tyresOnAxle: 2,
      axle: "front"
    });
    const rear = coldPressureForAxle({
      sidewall: "215/70 R15CP 109R",
      axleLoadKg: 1800,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(front.bar, 3.25);
    assert.equal(rear.tableBar, 4.75);
    assert.equal(rear.bar, 5.5);
    assert.match(describeSidewall(parseSidewall("215/70 R15CP 109R")).service, /camping \/ motorhome tyre/);
    assert.match(describeSidewall(parseSidewall("215/70 R15CP 109R")).service, /not a plain van C tyre/);
  });

  it("floors CP single-rear to 5.5 bar when the RA S table is lower", function () {
    const rear = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      axleLoadKg: 2000,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(rear.ok, true);
    assert.equal(rear.path, "cp-databook");
    assert.equal(rear.table.loadIndex, 118);
    assert.equal(rear.column, "rear");
    assert.equal(rear.tableBar, 4.25);
    assert.equal(rear.bar, 5.5);
    assert.equal(rear.recommendedBar, 5.5);
    assert.equal(rear.appliedCpRearFloor, true);
    assert.match(rear.note, /Table for your axle weight: 4\.25 bar/);
    assert.match(rear.note, /Minimum for a camping tyre on the rear \(two tyres\): 5\.5 bar/);
    assert.match(rear.note, /We show the higher/);
  });

  it("keeps the RA S table value when CP single-rear already needs more than 5.5 bar", function () {
    const rear = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      axleLoadKg: 2500,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(rear.tableBar, 5.75);
    assert.equal(rear.bar, 5.75);
    assert.equal(rear.recommendedBar, 5.75);
    assert.equal(rear.appliedCpRearFloor, false);
    assert.equal(rear.note, undefined);
  });

  it("leaves CP front on the FA S table with no 5.5 floor", function () {
    const front = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      axleLoadKg: 1800,
      tyresOnAxle: 2,
      axle: "front"
    });
    assert.equal(front.column, "front");
    assert.equal(front.tableBar, 3.25);
    assert.equal(front.bar, 3.25);
    assert.equal(front.recommendedBar, 3.25);
    assert.equal(front.appliedCpRearFloor, false);
    assert.equal(front.note, undefined);
  });

  it("does not apply the 5.5 single-rear floor to CP dual rear", function () {
    const dual = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      axleLoadKg: 3500,
      tyresOnAxle: 4,
      axle: "rear"
    });
    assert.equal(dual.column, "dual");
    assert.equal(dual.tableBar, 3.5);
    assert.equal(dual.bar, 3.5);
    assert.equal(dual.recommendedBar, 3.5);
    assert.equal(dual.appliedCpRearFloor, false);
    assert.equal(dual.note, undefined);
  });

  it("does not treat a CP size we do not have as a C tyre", function () {
    const parsed = parseSidewall("215/65 R16 CP 109R");
    assert.equal(parsed.family, "CP");
    assert.equal(resolvePressurePath(parsed).path, "no-table");
    assert.equal(resolvePressurePath(parsed).reason, "cp-size-unknown");
    assert.equal(coldPressureForAxle({
      sidewall: "215/65 R16 CP 109R",
      axleLoadKg: 1600,
      tyresOnAxle: 2,
      axle: "front"
    }).error, "no-table");
  });
});

describe("load index is a separate row", function () {
  it("uses different cold pressures for the same C size at two load indexes", function () {
    const li116 = coldPressureForAxle({
      sidewall: "225/75 R16C 116/114R",
      axleLoadKg: 2500,
      tyresOnAxle: 2
    });
    const li118 = coldPressureForAxle({
      sidewall: "225/75 R16C 118/116R",
      axleLoadKg: 2500,
      tyresOnAxle: 2
    });
    const li121 = coldPressureForAxle({
      sidewall: "225/75 R16C 121/120R",
      axleLoadKg: 2500,
      tyresOnAxle: 2
    });
    assert.equal(li116.table.loadIndex, 116);
    assert.equal(li118.table.loadIndex, 118);
    assert.equal(li121.table.loadIndex, 121);
    assert.equal(li116.bar, 4.75);
    assert.equal(li118.bar, 5.0);
    assert.equal(li121.bar, 5.0);
    assert.equal(li116.capacityKg, 2500);
    assert.equal(li118.capacityKg, 2540);
    assert.equal(li121.capacityKg, 2595);
    assert.notEqual(li116.bar, li118.bar);
    assert.notEqual(li116.table.id, li118.table.id);
    assert.notEqual(li118.table.id, li121.table.id);
  });

  it("refuses a load index we do not have and lists the ones we do", function () {
    const parsed = parseSidewall("225/75 R16C 114/112R");
    const path = resolvePressurePath(parsed);
    assert.equal(path.path, "no-matching-li");
    assert.ok(path.available.some(function (row) { return /LI 116/.test(row); }));
    assert.ok(path.available.some(function (row) { return /LI 118/.test(row); }));
    assert.ok(path.available.some(function (row) { return /LI 121/.test(row); }));
    const r = coldPressureForAxle({
      sidewall: "225/75 R16C 114/112R",
      axleLoadKg: 2000,
      tyresOnAxle: 2
    });
    assert.equal(r.error, "no-matching-li");
    assert.equal(r.bar, undefined);
    const msg = formatLiMismatch(r);
    assert.match(msg, /225\/75R16C/);
    assert.match(msg, /not LI 114/);
    assert.match(msg, /LI 116/);
  });

  it("does not silently use another LI when the sidewall LI is wrong for a known LT size", function () {
    const parsed = parseSidewall("LT245/70R16 119/116S");
    assert.equal(parsed.family, "LT");
    const path = resolvePressurePath(parsed);
    assert.equal(path.path, "no-matching-li");
    assert.ok(path.available.some(function (row) { return /LI 113/.test(row); }));
    assert.equal(coldPressureForAxle({
      sidewall: "LT245/70R16 119/116S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    }).error, "no-matching-li");
  });

  it("honours a typed load-index override and still refuses an unknown override", function () {
    const use121 = coldPressureForAxle({
      sidewall: "225/75 R16C 116/114R",
      loadIndex: 121,
      axleLoadKg: 2500,
      tyresOnAxle: 2
    });
    assert.equal(use121.table.loadIndex, 121);
    assert.equal(use121.capacityKg, 2595);
    const nope = coldPressureForAxle({
      sidewall: "225/75 R16C 116/114R",
      loadIndex: 114,
      axleLoadKg: 2000,
      tyresOnAxle: 2
    });
    assert.equal(nope.error, "no-matching-li");
    assert.equal(nope.wantedLoadIndex, 114);
  });
});

describe("Continental / General coverage extras", function () {
  it("keeps Wayne’s Grabber LT265/65R17 120/117 at 3.5 / 4.0 bar", function () {
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
    assert.equal(front.capacityKg, 1950);
    assert.equal(rear.capacityKg, 2170);
    assert.equal(front.path, "lt-databook");
  });

  it("adds further Conti C rows from the 2020–2021 Van section", function () {
    const special115 = coldPressureForAxle({
      sidewall: "225/70 R15C 115N",
      axleLoadKg: 2010,
      tyresOnAxle: 2
    });
    assert.equal(special115.path, "c-databook");
    assert.equal(special115.table.loadIndex, 115);
    assert.equal(special115.bar, 3.75);
    assert.equal(special115.capacityKg, 2010);

    const li122 = coldPressureForAxle({
      sidewall: "225/75 R16C 122R",
      axleLoadKg: 3000,
      tyresOnAxle: 2
    });
    assert.equal(li122.table.loadIndex, 122);
    assert.equal(li122.bar, 6.0);
    assert.equal(li122.capacityKg, 3000);

    const wide = coldPressureForAxle({
      sidewall: "285/65 R16C 128N",
      axleLoadKg: 2895,
      tyresOnAxle: 2
    });
    assert.equal(wide.table.loadIndex, 128);
    assert.equal(wide.bar, 4.0);

    const sprinter = coldPressureForAxle({
      sidewall: "235/60 R17C 114R",
      axleLoadKg: 1955,
      tyresOnAxle: 2
    });
    assert.equal(sprinter.table.loadIndex, 114);
    assert.equal(sprinter.bar, 3.75);
  });

  it("refuses a size or load index that is still not in the Conti book", function () {
    assert.equal(coldPressureForAxle({
      sidewall: "LT255/70R17 121/118S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    }).error, "no-table");
    assert.equal(coldPressureForAxle({
      sidewall: "215/65 R16 CP 109R",
      axleLoadKg: 1600,
      tyresOnAxle: 2,
      axle: "front"
    }).error, "no-table");
    assert.equal(coldPressureForAxle({
      sidewall: "225/75 R16C 114/112R",
      axleLoadKg: 2000,
      tyresOnAxle: 2
    }).error, "no-matching-li");
  });

  it("keeps Continental tables Conti-only; Michelin lives in its own file", function () {
    const blob = JSON.stringify(TraDb.ALL);
    assert.equal(/michelin/i.test(blob), false);
    assert.equal(/goodyear/i.test(blob), false);
    assert.equal(/bfgoodrich|bfg/i.test(blob), false);
    assert.equal(/yokohama/i.test(blob), false);
    assert.ok(TraDb.LT_SOURCE.indexOf("Continental") !== -1);
    assert.ok(TraDb.C_SOURCE.indexOf("Continental") !== -1);
    assert.ok(TraDb.CP_SOURCE.indexOf("Continental") !== -1);
    assert.equal(TraDb.ALL[0].maker, "continental");
    assert.ok(MichelinDb);
    assert.ok(MichelinDb.ALL.length > 0);
    assert.equal(MichelinDb.ALL[0].maker, "michelin");
    const mic = JSON.stringify(MichelinDb.ALL);
    assert.equal(/goodyear/i.test(mic), false);
    assert.equal(/bfgoodrich|camping cp/i.test(mic), false);
    assert.equal(/yokohama/i.test(mic), false);
    assert.ok(MichelinDb.ALL.every(function (row) {
      return row.family === "C" || row.family === "LT";
    }));
    assert.ok(MichelinDb.ALL.every(function (row) {
      return MichelinDb.isSupportedRim(row.rimIn);
    }));
  });

  it("applies the CP rear 5.5 bar floor on Conti camping rows", function () {
    assert.equal(ETRTO_CP_SINGLE_REAR_MIN_BAR, 5.5);
    const rear = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      axleLoadKg: 2000,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(rear.path, "cp-databook");
    assert.equal(rear.tableBar, 4.25);
    assert.equal(rear.bar, 5.5);
  });
});

describe("describeSidewall LT", function () {
  it("says the LT family uses the Continental TRA-standard databook", function () {
    const text = describeSidewall(parseSidewall("LT265/65R17 120/117S"));
    assert.match(text.service, /LT — light truck tyre/);
    assert.match(text.load, /1400 kg/);
  });
});

describe("Michelin Agilis C/LT tables", function () {
  it("detects maker from the brand box or sidewall text", function () {
    assert.equal(detectMaker("Michelin Agilis", ""), "michelin");
    assert.equal(detectMaker("agilis crossclimate", ""), "michelin");
    assert.equal(detectMaker("CrossClimate Camping", ""), "michelin");
    assert.equal(detectMaker("General Grabber", ""), "general");
    assert.equal(detectMaker("", "Continental VanContact 225/75R16C"), "continental");
    assert.equal(detectMaker("Goodyear Wrangler", ""), "goodyear");
    assert.equal(detectMaker("BFGoodrich", ""), "bfgoodrich");
    assert.equal(detectMaker("BFG KO2", ""), "bfgoodrich");
    assert.equal(detectMaker("Yokohama", ""), "later");
    assert.equal(detectMaker("", ""), null);
  });

  it("uses Michelin C 195/75R16C 107 from the April 2025 chart, not Conti steps", function () {
    const front = coldPressureForAxle({
      sidewall: "195/75 R16C 107/105R",
      brand: "Michelin Agilis",
      axleLoadKg: 1600,
      tyresOnAxle: 2
    });
    const rear = coldPressureForAxle({
      sidewall: "195/75 R16C 107/105R",
      brand: "Michelin Agilis",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(front.path, "c-databook");
    assert.equal(front.table.maker, "michelin");
    assert.equal(front.bar, 3.8);
    assert.equal(front.capacityKg, 1630);
    assert.equal(rear.bar, 4.5);
    assert.equal(rear.capacityKg, 1870);
    assert.match(front.table.source, /Michelin/);
  });

  it("uses Michelin C 205/65R15C 102 including the 3.75 bar sidewall-max step", function () {
    const low = coldPressureForAxle({
      sidewall: "205/65 R15C 102/100T",
      brand: "Michelin",
      axleLoadKg: 1400,
      tyresOnAxle: 2
    });
    const high = coldPressureForAxle({
      sidewall: "205/65 R15C 102/100T",
      brand: "Michelin",
      axleLoadKg: 1600,
      tyresOnAxle: 2
    });
    assert.equal(low.bar, 3.1);
    assert.equal(low.capacityKg, 1460);
    assert.equal(high.bar, 3.75);
    assert.equal(high.capacityKg, 1700);
  });

  it("uses Michelin LT215/85R16 115 from the Agilis LT grid", function () {
    const r = coldPressureForAxle({
      sidewall: "LT215/85R16 115/112R",
      brand: "Michelin Agilis CrossClimate",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(r.path, "lt-databook");
    assert.equal(r.table.maker, "michelin");
    assert.equal(r.bar, 3.8);
    assert.equal(r.capacityKg, 1864);
  });

  it("keeps an unmarked Conti/General C size on the Conti book", function () {
    const r = coldPressureForAxle({
      sidewall: "195/75 R16C 107/105R",
      axleLoadKg: 1600,
      tyresOnAxle: 2
    });
    assert.equal(r.table.maker, "continental");
    assert.equal(r.bar, 3.75);
    assert.equal(r.capacityKg, 1615);
  });

  it("refuses Michelin CrossClimate Camping CP instead of copying a Conti camping row", function () {
    const front = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      brand: "Michelin CrossClimate Camping",
      axleLoadKg: 1800,
      tyresOnAxle: 2,
      axle: "front"
    });
    const rear = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      brand: "Michelin CrossClimate Camping",
      axleLoadKg: 2000,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(front.ok, false);
    assert.equal(front.bar, undefined);
    assert.equal(front.psi, undefined);
    assert.equal(front.error, "no-table");
    assert.equal(front.reason, "michelin-cp-no-table");
    assert.equal(isUncoveredRefuse(front), true);
    assert.equal(rear.ok, false);
    assert.equal(rear.reason, "michelin-cp-no-table");
    assert.match(MICHELIN_CP_REFUSE, /won’t invent one or copy another brand’s camping table/);
    assert.match(MICHELIN_CP_REFUSE, /Michelin UK has been asked/);
  });

  it("still refuses Michelin Camping CP when the load index would not match a Conti row", function () {
    const r = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      brand: "Michelin CrossClimate Camping",
      loadIndex: 107,
      axleLoadKg: 2000,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(r.error, "no-table");
    assert.equal(r.reason, "michelin-cp-no-table");
    assert.equal(r.ok, false);
  });

  it("refuses Michelin Camping CP when there is no Conti camping row either", function () {
    const r = coldPressureForAxle({
      sidewall: "215/75 R16 CP 116R",
      brand: "Michelin CrossClimate Camping",
      axleLoadKg: 1800,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(r.error, "no-table");
    assert.equal(r.reason, "michelin-cp-no-table");
  });

  it("still uses Conti CP when the brand is not Michelin, with the same 5.5 rear floor", function () {
    const r = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      brand: "Continental VanContact Camper",
      axleLoadKg: 2000,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(r.path, "cp-databook");
    assert.equal(r.table.maker, "continental");
    assert.equal(r.tableBar, 4.25);
    assert.equal(r.bar, 5.5);
  });

  it("refuses a Michelin brand on a Conti-only Grabber size", function () {
    const r = coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      brand: "Michelin",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(r.error, "no-table");
  });

  it("refuses Goodyear and Yokohama; BFG uses its own AMBER sheet", function () {
    assert.equal(coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      brand: "Goodyear Wrangler",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    }).reason, "brand-later");
    assert.equal(coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      brand: "Yokohama",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    }).reason, "brand-later");
  });

  it("refuses a Michelin C size that has no published Agilis grid", function () {
    const r = coldPressureForAxle({
      sidewall: "205/75 R16C 113/111R",
      brand: "Michelin Agilis",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(r.error, "no-table");
  });

  it("does not invent 19.5″ or 22.5″ Michelin truck sizes", function () {
    const r = coldPressureForAxle({
      sidewall: "LT235/85R19 120/116R",
      brand: "Michelin",
      axleLoadKg: 2000,
      tyresOnAxle: 2
    });
    assert.equal(r.error, "unsupported-rim");
    assert.equal(r.rimIn, 19);
    assert.equal(isUncoveredRefuse(r), true);
    assert.equal(r.bar, undefined);
    assert.equal(r.psi, undefined);
  });
});

describe("isUncoveredRefuse", function () {
  it("is true for uncovered size, load index and later brands — still no pressure", function () {
    const unknownLt = coldPressureForAxle({
      sidewall: "LT255/70R17 121/118S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(unknownLt.error, "no-table");
    assert.equal(isUncoveredRefuse(unknownLt), true);
    assert.ok(unknownLt.bar == null && unknownLt.psi == null);

    const goodyear = coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      brand: "Goodyear Wrangler",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(goodyear.reason, "brand-later");
    assert.equal(isUncoveredRefuse(goodyear), true);
    assert.ok(goodyear.bar == null && goodyear.psi == null);

    const wrongLi = coldPressureForAxle({
      sidewall: "225/75 R16C 114/112R",
      brand: "Continental",
      axleLoadKg: 2000,
      tyresOnAxle: 2
    });
    assert.equal(wrongLi.error, "no-matching-li");
    assert.equal(isUncoveredRefuse(wrongLi), true);
  });

  it("is false when a table pressure exists or the axle is only overloaded", function () {
    const covered = coldPressureForAxle({
      sidewall: "225/75 R16C 118R",
      brand: "Continental",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(covered.ok, true);
    assert.ok(covered.bar != null);
    assert.equal(isUncoveredRefuse(covered), false);

    const needLoad = coldPressureForAxle({
      sidewall: "225/75 R16C 118R",
      brand: "Continental",
      tyresOnAxle: 2
    });
    assert.equal(needLoad.error, "need-load");
    assert.equal(isUncoveredRefuse(needLoad), false);

    const over = coldPressureForAxle({
      sidewall: "225/75 R16C 118R",
      brand: "Continental",
      axleLoadKg: 9000,
      tyresOnAxle: 2
    });
    assert.ok(over.status === "over-capacity" || over.status === "over-pressure" || over.ok === false);
    assert.equal(isUncoveredRefuse(over), false);
  });
});

describe("AMBER LT max-only catalogue", function () {
  it("keeps General Grabber LT265/65R17 on the GREEN Conti curve", function () {
    const r = coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      brand: "General Grabber",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(r.ok, true);
    assert.equal(r.path, "lt-databook");
    assert.equal(r.confidence, "GREEN");
    assert.equal(r.table.maker, "continental");
    assert.equal(r.bar, 3.5);
    assert.notEqual(r.status, "amber-max-only");
  });

  it("uses General Grabber A/TX AMBER max for LT275/70R17 (no Conti curve)", function () {
    const r = coldPressureForAxle({
      sidewall: "LT275/70R17 121/118R",
      brand: "General Grabber",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(r.ok, true);
    assert.equal(r.path, "lt-amber-max");
    assert.equal(r.status, "amber-max-only");
    assert.equal(r.confidence, "AMBER");
    assert.equal(r.table.maker, "general");
    assert.equal(r.table.sourceId, "atx");
    assert.equal(r.table.singleLb, 3195);
    assert.equal(r.table.dualLb, null);
    assert.equal(r.maxPsi || r.psi, 80);
    assert.equal(r.bar, AmberDb.psiToBar(80));
    assert.equal(r.maxKgEach, AmberDb.lbToKg(3195));
    assert.match(r.table.sourceUrl, /GT19_Grabber_ATx/);
  });

  it("uses AT2 dual max when General printed one, and will not invent a missing dual", function () {
    const single = coldPressureForAxle({
      sidewall: "LT265/70R17 121/118S",
      brand: "General Grabber AT2",
      axleLoadKg: 2100,
      tyresOnAxle: 2
    });
    assert.equal(single.path, "lt-databook");
    assert.equal(single.confidence, "GREEN");

    const amberAt2 = AmberDb.matchEntry({
      sizeKey: "265/70R17",
      family: "LT",
      loadIndex: 121,
      maker: "general"
    });
    assert.equal(amberAt2.ok, true);
    assert.equal(amberAt2.entry.sourceId, "at2");
    assert.equal(amberAt2.entry.singleLb, 3195);
    assert.equal(amberAt2.entry.dualLb, 2910);

    const noDual = coldPressureForAxle({
      sidewall: "LT275/70R17 121/118R",
      brand: "General Grabber",
      axleLoadKg: 4000,
      tyresOnAxle: 4
    });
    assert.equal(noDual.ok, false);
    assert.equal(noDual.reason, "amber-no-dual");
    assert.equal(noDual.bar, undefined);
    assert.equal(isUncoveredRefuse(noDual), true);
  });

  it("uses BFG KO2 AMBER max for LT265/65R17 and never a Conti proxy", function () {
    const r = coldPressureForAxle({
      sidewall: "LT265/65R17 120/117S",
      brand: "BFGoodrich All-Terrain T/A KO2",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(r.path, "lt-amber-max");
    assert.equal(r.status, "amber-max-only");
    assert.equal(r.table.maker, "bfgoodrich");
    assert.equal(r.table.singleLb, 3085);
    assert.equal(r.table.dualLb, 2835);
    assert.equal(r.psi, 80);
    assert.equal(r.maxKgEach, AmberDb.lbToKg(3085));
    assert.notEqual(r.table.maker, "continental");
    assert.match(r.table.sourceUrl, /bfgoodrich-all-terrain-ta-ko-2/);
  });

  it("does not invent a lower AMBER pressure for a lighter axle", function () {
    const light = coldPressureForAxle({
      sidewall: "LT265/65R17 120S",
      brand: "BFGoodrich",
      axleLoadKg: 1200,
      tyresOnAxle: 2
    });
    const heavy = coldPressureForAxle({
      sidewall: "LT265/65R17 120S",
      brand: "BFGoodrich",
      axleLoadKg: 2500,
      tyresOnAxle: 2
    });
    assert.equal(light.bar, heavy.bar);
    assert.equal(light.psi, 80);
    assert.equal(light.status, "amber-max-only");
  });

  it("fails AMBER when the axle is over the published max, and keeps Conti CP GREEN", function () {
    const over = coldPressureForAxle({
      sidewall: "LT265/65R17 120S",
      brand: "BFGoodrich",
      axleLoadKg: 4000,
      tyresOnAxle: 2
    });
    assert.equal(over.status, "over-capacity");
    assert.equal(over.bar, null);
    assert.equal(over.confidence, "AMBER");

    const cp = coldPressureForAxle({
      sidewall: "225/75 R16 CP 118R",
      brand: "Continental VanContact Camper",
      axleLoadKg: 2000,
      tyresOnAxle: 2,
      axle: "rear"
    });
    assert.equal(cp.path, "cp-databook");
    assert.equal(cp.confidence, "GREEN");
    assert.equal(cp.bar, 5.5);
  });

  it("refuses unnamed BFG-only sizes and named Continental on a Grabber-only size", function () {
    const unmarkedBfgOnly = coldPressureForAxle({
      sidewall: "LT255/70R17 121/118S",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(unmarkedBfgOnly.error, "no-table");

    const namedBfg = coldPressureForAxle({
      sidewall: "LT255/70R17 121/118S",
      brand: "BFGoodrich",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(namedBfg.path, "lt-amber-max");
    assert.equal(namedBfg.table.singleLb, 3195);

    const contiOnGrabberOnly = coldPressureForAxle({
      sidewall: "LT275/70R17 121/118R",
      brand: "Continental",
      axleLoadKg: 1800,
      tyresOnAxle: 2
    });
    assert.equal(contiOnGrabberOnly.error, "no-table");
  });

  it("converts printed lb/psi only; does not ingest P-metric or BFG truck sizes", function () {
    assert.equal(AmberDb.lbToKg(3085), 1399);
    assert.equal(AmberDb.psiToBar(80), 5.52);
    assert.ok(AmberDb.ALL.every(function (row) {
      return row.confidence === "AMBER" && row.family === "LT";
    }));
    assert.ok(AmberDb.ALL.every(function (row) {
      return row.maker === "general" || row.maker === "bfgoodrich";
    }));
    const blob = JSON.stringify(AmberDb.ALL);
    assert.equal(/11R22\.5|275\/80R22|295\/80R22/i.test(blob), false);
    const pMetric = AmberDb.matchEntry({
      sizeKey: "265/65R17",
      family: "LT",
      loadIndex: 112,
      maker: "general"
    });
    assert.equal(pMetric.ok, false);
    const truck = AmberDb.matchEntry({
      sizeKey: "11R22.5",
      family: "LT",
      maker: "bfgoodrich"
    });
    assert.equal(truck.ok, false);
  });
});
