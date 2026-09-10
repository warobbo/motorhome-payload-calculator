/* =========================================================================
   Tyres tool UI — sidewall + axle loads → cold front/rear from the
   right published table (TRA LT or ETRTO C-type).
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "mh-tyres-v3";
  var T = window.TyreCalc;
  if (!T) return;

  var EXAMPLE = T.WAYNE_EXAMPLE || {
    brand: "General Grabber",
    sidewall: "LT265/65R17 120/117S",
    frontAxleKg: 1800,
    rearAxleKg: 2100,
    tyresOnAxle: 2
  };

  var DEFAULTS = {
    frontAxleKg: EXAMPLE.frontAxleKg,
    rearAxleKg: EXAMPLE.rearAxleKg,
    totalKg: "",
    frontPct: 46,
    sidewall: EXAMPLE.sidewall,
    brandLabel: EXAMPLE.brand,
    loadIndex: "",
    dualLoadIndex: "",
    tyresOnAxle: EXAMPLE.tyresOnAxle,
    chartId: "c375",
    rearDifferent: false,
    rearSidewall: "",
    rearLoadIndex: "",
    rearDualLoadIndex: "",
    rearTyresOnAxle: 2,
    rearChartId: "c375",
    convBar: "",
    convPsi: "",
    noteFrontBar: "",
    noteRearBar: ""
  };

  function $(id) {
    return document.getElementById(id);
  }

  function loadState() {
    var state = Object.assign({}, DEFAULTS);
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return state;
      var saved = JSON.parse(raw);
      var hasTyre = saved.sidewall || saved.loadIndex;
      var hasLoad = saved.frontAxleKg || saved.rearAxleKg;
      if (!hasTyre && !hasLoad) return state;
      Object.keys(DEFAULTS).forEach(function (key) {
        if (saved[key] !== undefined && saved[key] !== null) state[key] = saved[key];
      });
    } catch (err) { /* ignore */ }
    return state;
  }

  function collectState() {
    return {
      frontAxleKg: $("frontAxleKg").value,
      rearAxleKg: $("rearAxleKg").value,
      totalKg: $("totalKg").value,
      frontPct: $("frontPct").value,
      sidewall: $("sidewall").value,
      brandLabel: $("brandLabel").value,
      loadIndex: $("loadIndex").value,
      dualLoadIndex: $("dualLoadIndex").value,
      tyresOnAxle: $("tyresOnAxle").value,
      chartId: $("chartId").value,
      rearDifferent: $("rearDifferent").checked,
      rearSidewall: $("rearSidewall").value,
      rearLoadIndex: $("rearLoadIndex").value,
      rearDualLoadIndex: $("rearDualLoadIndex").value,
      rearTyresOnAxle: $("rearTyresOnAxle").value,
      rearChartId: $("rearChartId").value,
      convBar: $("convBar").value,
      convPsi: $("convPsi").value,
      noteFrontBar: $("noteFrontBar").value,
      noteRearBar: $("noteRearBar").value
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
      setSaveNote("Saved on this device only.");
    } catch (err) {
      setSaveNote("Could not save on this device.");
    }
  }

  function setSaveNote(text) {
    var el = $("saveNote");
    if (el) el.textContent = text;
  }

  function setPairFromBar(barInput, psiInput, barValue) {
    if (barValue === "" || barValue == null) {
      barInput.value = "";
      psiInput.value = "";
      return;
    }
    var psi = T.barToPsi(barValue);
    barInput.value = String(barValue);
    psiInput.value = psi == null ? "" : String(T.roundPsi(psi));
  }

  function setPairFromPsi(barInput, psiInput, psiValue) {
    if (psiValue === "" || psiValue == null) {
      barInput.value = "";
      psiInput.value = "";
      return;
    }
    var bar = T.psiToBar(psiValue);
    psiInput.value = String(psiValue);
    barInput.value = bar == null ? "" : String(T.roundBar(bar));
  }

  function fillFromState(state) {
    $("frontAxleKg").value = state.frontAxleKg;
    $("rearAxleKg").value = state.rearAxleKg;
    $("totalKg").value = state.totalKg;
    $("frontPct").value = state.frontPct || 46;
    $("sidewall").value = state.sidewall;
    $("brandLabel").value = state.brandLabel || "";
    $("loadIndex").value = state.loadIndex;
    $("dualLoadIndex").value = state.dualLoadIndex;
    $("tyresOnAxle").value = state.tyresOnAxle || 2;
    $("chartId").value = state.chartId === "c450" ? "c450" : "c375";
    $("rearDifferent").checked = !!state.rearDifferent;
    $("rearSidewall").value = state.rearSidewall;
    $("rearLoadIndex").value = state.rearLoadIndex;
    $("rearDualLoadIndex").value = state.rearDualLoadIndex;
    $("rearTyresOnAxle").value = state.rearTyresOnAxle || 2;
    $("rearChartId").value = state.rearChartId === "c450" ? "c450" : "c375";
    setPairFromBar($("convBar"), $("convPsi"), state.convBar);
    if (!state.convBar && state.convPsi) {
      setPairFromPsi($("convBar"), $("convPsi"), state.convPsi);
    }
    setPairFromBar($("noteFrontBar"), $("noteFrontPsi"), state.noteFrontBar);
    setPairFromBar($("noteRearBar"), $("noteRearPsi"), state.noteRearBar);
    $("rearTyreWrap").hidden = !$("rearDifferent").checked;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function row(label, body) {
    return "<div class=\"stat-row\"><span>" + escapeHtml(label) + "</span><b>" + escapeHtml(body) + "</b></div>";
  }

  function parsedFor(which) {
    var rear = which === "rear" && $("rearDifferent").checked;
    var raw = rear ? $("rearSidewall").value : $("sidewall").value;
    if (String(raw).trim()) return T.parseSidewall(raw);
    return null;
  }

  function decodeInto(inputId, opts) {
    var raw = $(inputId).value;
    var parsed = T.parseSidewall(raw);
    if (inputId === "sidewall") {
      var out = $("decodeOut");
      if (!String(raw).trim()) {
        out.hidden = true;
        out.innerHTML = "";
        return parsed;
      }
      if (!parsed.ok) {
        out.hidden = false;
        out.className = "decode-out is-err";
        var err = "That does not look like a sidewall size code.";
        if (parsed.error === "unknown-load-index") {
          err = "Size read OK, but that load index is not in the public table.";
        } else if (parsed.error === "unknown-speed") {
          err = "Size read OK, but that speed letter is not one this page explains.";
        }
        out.innerHTML = "<p>" + err + " Try <code>LT265/65R17 120/117S</code>.</p>";
        return parsed;
      }
      var text = T.describeSidewall(parsed);
      var path = T.resolvePressurePath(parsed);
      var rows = [];
      rows.push(row("Size", text.size));
      rows.push(row("Family", parsed.family + (path.path === "lt-tra" ? " — TRA Light Truck table" : path.path === "c-etrto" ? " — ETRTO C-type chart" : " — no inflation table on this page")));
      rows.push(row("C / LT mark", text.service));
      if (text.extraLoad) rows.push(row("Reinforced", text.extraLoad));
      if (text.load) rows.push(row("Load index", text.load));
      if (text.speed) rows.push(row("Speed rating", text.speed));
      out.hidden = false;
      out.className = "decode-out";
      out.innerHTML = rows.join("");
    }
    if (opts && opts.sync && parsed && parsed.ok) {
      if (inputId === "sidewall") {
        if (parsed.loadIndex != null) $("loadIndex").value = String(parsed.loadIndex);
        if (parsed.dualLoadIndex != null) $("dualLoadIndex").value = String(parsed.dualLoadIndex);
        if (T.suggestChartId(parsed) === "c450" || T.suggestChartId(parsed) === "c375") {
          $("chartId").value = T.suggestChartId(parsed);
        }
      } else if (inputId === "rearSidewall") {
        if (parsed.loadIndex != null) $("rearLoadIndex").value = String(parsed.loadIndex);
        if (parsed.dualLoadIndex != null) $("rearDualLoadIndex").value = String(parsed.dualLoadIndex);
      }
    }
    return parsed;
  }

  function axleOpts(which) {
    var rear = which === "rear" && $("rearDifferent").checked;
    var parsed = parsedFor(which);
    return {
      axleLoadKg: which === "front" ? $("frontAxleKg").value : $("rearAxleKg").value,
      tyresOnAxle: rear ? $("rearTyresOnAxle").value : $("tyresOnAxle").value,
      loadIndex: rear ? $("rearLoadIndex").value : $("loadIndex").value,
      dualLoadIndex: rear ? $("rearDualLoadIndex").value : $("dualLoadIndex").value,
      chartId: rear ? $("rearChartId").value : $("chartId").value,
      sidewall: rear ? $("rearSidewall").value : $("sidewall").value,
      parsed: parsed && parsed.ok ? parsed : null
    };
  }

  function formatPsi(psi) {
    if (psi == null) return "";
    return Number.isInteger(psi) ? String(psi) : String(T.roundPsi(psi));
  }

  function formatBar(bar) {
    if (bar == null) return "";
    return Number(T.roundBar(bar)).toFixed(2);
  }

  function paintValue(result, valueEl, altEl) {
    if (!result || !result.ok) {
      valueEl.textContent = "—";
      altEl.textContent = "";
      return;
    }
    if (result.status === "over-capacity" || result.status === "over-pressure") {
      valueEl.textContent = "Fail";
      altEl.textContent = result.path === "lt-tra"
        ? "Over max at 80 PSI"
        : "Over this chart";
      return;
    }
    if (result.psi == null && result.bar == null) {
      valueEl.textContent = "—";
      altEl.textContent = "";
      return;
    }
    if (result.path === "lt-tra" && result.psi != null) {
      valueEl.textContent = formatPsi(result.psi) + " PSI";
      altEl.textContent = formatBar(result.bar) + " bar";
      return;
    }
    valueEl.textContent = formatBar(result.bar) + " bar";
    altEl.textContent = formatPsi(result.psi) + " PSI";
  }

  function formatNote(result, axleName) {
    if (!result) return "Add " + axleName + " axle load and the fitted tyre.";
    if (!result.ok) {
      if (result.error === "need-load") return "Type the " + axleName + " axle load in kg.";
      if (result.error === "load-index" || result.error === "dual-load-index") {
        return "Need a load index for the " + axleName + " tyre — paste the sidewall.";
      }
      if (result.error === "unknown-load-index") {
        return "That load index is not in the public table, so this page will not invent a pressure.";
      }
      if (result.error === "no-table") {
        if (result.reason === "lt-size-unknown") {
          return "That LT size is not in the TRA table on this page yet, so it will not invent a pressure.";
        }
        if (result.reason === "p-metric") {
          return "P-metric size — this page has no published inflation table for it, so it will not invent a pressure.";
        }
        return "No published inflation table for this size on this page.";
      }
      if (result.error === "unrecognised") return "Paste a sidewall such as LT265/65R17 120/117S.";
      if (result.error === "tyres") return "Tyres on the axle must be 2 or 4.";
      return "Not enough to calculate the " + axleName + ".";
    }
    if (result.status === "over-capacity") {
      if (result.path === "lt-tra") {
        return "Over the TRA table at 80 PSI (" + Math.round(result.loadKg) +
          " kg on each tyre; max " + Math.round(result.maxKg) + " kg / " + result.maxLb +
          " lb). No safe pressure from this chart.";
      }
      return "Over load-index capacity (" + Math.round(result.loadKg) + " kg on each tyre; index " +
        result.usedIndex + " is " + result.lref + " kg). No safe pressure from this chart.";
    }
    if (result.status === "over-pressure") {
      return "Would need more than the chart maximum to carry this load. No pressure suggested.";
    }
    var bits = [];
    bits.push(Math.round(result.loadKg) + " kg on each of " + result.tyresOnAxle + " tyres");
    if (result.path === "lt-tra") {
      bits.push((result.column === "dual" ? "Dual" : "Single") + " column");
      bits.push("lowest table PSI that covers the load");
      if (result.interpolatedPsi != null && result.interpolatedPsi !== result.psi) {
        bits.push("between-steps interpolation " + formatPsi(result.interpolatedPsi) + " PSI");
      }
    } else {
      bits.push("index " + result.usedIndex + " = " + result.lref + " kg");
      if (result.useDual) bits.push("dual-wheel figure");
      if (result.status === "min-pressure") bits.push("raised to the chart minimum cold pressure");
    }
    return bits.join(" · ") + ".";
  }

  function resultClass(result) {
    if (!result || !result.ok) return "";
    if (result.status === "over-capacity" || result.status === "over-pressure") return "is-fail";
    if (result.status === "min-pressure") return "is-tight";
    return "is-ok";
  }

  function sourceHtml(result) {
    if (result && result.path === "lt-tra" && result.table) {
      var cite = result.table.source;
      if (result.table.sourceUrl) {
        cite += ' <a href="' + escapeHtml(result.table.sourceUrl) + '" rel="noopener noreferrer">Public LT-metric table</a>.';
      }
      return cite;
    }
    if (result && result.path === "c-etrto" && result.chart) {
      return result.chart.label + " — " + result.chart.source;
    }
    return "";
  }

  var lastFront = null;
  var lastRear = null;

  function updateFamilyUi() {
    var parsed = T.parseSidewall($("sidewall").value);
    var path = parsed && parsed.ok ? T.resolvePressurePath(parsed) : null;
    var badge = $("familyBadge");
    var isC = path && path.path === "c-etrto";
    $("cChartWrap").hidden = !isC;
    var rearParsed = $("rearDifferent").checked ? T.parseSidewall($("rearSidewall").value) : parsed;
    var rearPath = rearParsed && rearParsed.ok ? T.resolvePressurePath(rearParsed) : path;
    $("rearChartWrap").hidden = !(rearPath && rearPath.path === "c-etrto");

    if (!String($("sidewall").value).trim()) {
      badge.textContent = "Paste a sidewall to pick the right chart.";
      return path;
    }
    if (!parsed || !parsed.ok) {
      badge.textContent = "Sidewall not recognised yet — try LT265/65R17 120/117S.";
      return path;
    }
    if (path.path === "lt-tra") {
      var brand = $("brandLabel").value.trim();
      badge.textContent = (brand ? brand + " · " : "") + "LT-metric · TRA Light Truck table for " + path.tableId;
    } else if (path.path === "c-etrto") {
      badge.textContent = path.label;
    } else {
      badge.textContent = "Detected " + (parsed.family || "unknown") + " — no inflation table on this page for that size.";
    }
    return path;
  }

  function renderAnswers() {
    $("rearTyreWrap").hidden = !$("rearDifferent").checked;
    lastFront = T.coldPressureForAxle(axleOpts("front"));
    lastRear = T.coldPressureForAxle(axleOpts("rear"));
    var path = updateFamilyUi();

    paintValue(lastFront, $("frontValue"), $("frontAlt"));
    paintValue(lastRear, $("rearValue"), $("rearAlt"));
    $("frontSub").textContent = formatNote(lastFront, "front");
    $("rearSub").textContent = formatNote(lastRear, "rear");
    $("frontResult").className = "axle-result " + resultClass(lastFront);
    $("rearResult").className = "axle-result " + resultClass(lastRear);

    var cite = sourceHtml(lastFront) || sourceHtml(lastRear);
    $("chartNote").innerHTML = cite;

    var extras = [];
    var brand = $("brandLabel").value.trim();
    if (brand && path && path.path === "lt-tra") {
      extras.push(brand + " is a label only. The pressure source is still the TRA LT table for this size, not a branded PDF.");
    }
    if ($("rearDifferent").checked) extras.push("Front and rear tyres are set separately.");
    if (path && path.family === "CP") {
      extras.push("CP camping tyre: this is a driving cold-pressure estimate. Use the maker’s camping table for parked / site load.");
    }
    $("answerNotes").textContent = extras.join(" ");

    if (lastFront && lastFront.psi != null && lastRear && lastRear.psi != null) {
      $("dockValue").textContent = formatPsi(lastFront.psi) + " / " + formatPsi(lastRear.psi) + " PSI";
      $("dockHint").textContent = "Cold front / rear";
      $("dock").className = "dock dock-ok";
    } else if ((lastFront && (lastFront.status === "over-capacity" || lastFront.status === "over-pressure")) ||
               (lastRear && (lastRear.status === "over-capacity" || lastRear.status === "over-pressure"))) {
      $("dockValue").textContent = "Fail";
      $("dockHint").textContent = "Over the chart maximum";
      $("dock").className = "dock dock-over";
    } else {
      $("dockValue").textContent = "—";
      $("dockHint").textContent = "Cold front / rear";
      $("dock").className = "dock";
    }
  }

  function bindPair(barId, psiId) {
    var barInput = $(barId);
    var psiInput = $(psiId);
    barInput.addEventListener("input", function () {
      if (barInput.value === "") psiInput.value = "";
      else {
        var psi = T.barToPsi(barInput.value);
        psiInput.value = psi == null ? "" : String(T.roundPsi(psi));
      }
      afterChange();
    });
    psiInput.addEventListener("input", function () {
      if (psiInput.value === "") barInput.value = "";
      else {
        var bar = T.psiToBar(psiInput.value);
        barInput.value = bar == null ? "" : String(T.roundBar(bar));
      }
      afterChange();
    });
  }

  function applySplitLive() {
    var split = T.splitAxleLoads($("totalKg").value, $("frontPct").value);
    if (!split.ok) return;
    $("frontAxleKg").value = String(split.frontKg);
    $("rearAxleKg").value = String(split.rearKg);
  }

  function afterChange() {
    decodeInto("sidewall");
    renderAnswers();
    saveState();
  }

  function applyWayneExample() {
    fillFromState(DEFAULTS);
    decodeInto("sidewall", { sync: true });
    renderAnswers();
    saveState();
    setSaveNote("Wayne’s General Grabber example loaded.");
  }

  function copyAnswers() {
    if (lastFront && lastFront.psi != null) {
      setPairFromPsi($("noteFrontBar"), $("noteFrontPsi"), lastFront.psi);
    } else if (lastFront && lastFront.bar != null) {
      setPairFromBar($("noteFrontBar"), $("noteFrontPsi"), lastFront.bar);
    }
    if (lastRear && lastRear.psi != null) {
      setPairFromPsi($("noteRearBar"), $("noteRearPsi"), lastRear.psi);
    } else if (lastRear && lastRear.bar != null) {
      setPairFromBar($("noteRearBar"), $("noteRearPsi"), lastRear.bar);
    }
    saveState();
    setSaveNote("Copied the calculated cold pressures onto this phone.");
  }

  function clearSaved() {
    fillFromState({
      frontAxleKg: "",
      rearAxleKg: "",
      totalKg: "",
      frontPct: 46,
      sidewall: "",
      brandLabel: "",
      loadIndex: "",
      dualLoadIndex: "",
      tyresOnAxle: 2,
      chartId: "c375",
      rearDifferent: false,
      rearSidewall: "",
      rearLoadIndex: "",
      rearDualLoadIndex: "",
      rearTyresOnAxle: 2,
      rearChartId: "c375",
      convBar: "",
      convPsi: "",
      noteFrontBar: "",
      noteRearBar: ""
    });
    decodeInto("sidewall");
    renderAnswers();
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    setSaveNote("Cleared on this device. Use “Try Wayne’s example” to put the numbers back.");
  }

  var year = $("yearNow");
  if (year) year.textContent = String(new Date().getFullYear());

  fillFromState(loadState());
  bindPair("convBar", "convPsi");
  bindPair("noteFrontBar", "noteFrontPsi");
  bindPair("noteRearBar", "noteRearPsi");

  [
    "frontAxleKg", "rearAxleKg",
    "loadIndex", "dualLoadIndex", "tyresOnAxle", "chartId", "brandLabel",
    "rearLoadIndex", "rearDualLoadIndex", "rearTyresOnAxle", "rearChartId"
  ].forEach(function (id) {
    $(id).addEventListener("input", afterChange);
    $(id).addEventListener("change", afterChange);
  });

  $("totalKg").addEventListener("input", function () {
    applySplitLive();
    afterChange();
  });
  $("frontPct").addEventListener("input", function () {
    applySplitLive();
    afterChange();
  });

  $("sidewall").addEventListener("input", function () {
    decodeInto("sidewall", { sync: true });
    renderAnswers();
    saveState();
  });
  $("rearSidewall").addEventListener("input", function () {
    decodeInto("rearSidewall", { sync: true });
    renderAnswers();
    saveState();
  });
  $("rearDifferent").addEventListener("change", afterChange);
  $("wayneExample").addEventListener("click", applyWayneExample);
  $("copyAnswers").addEventListener("click", copyAnswers);
  $("clearTyres").addEventListener("click", clearSaved);

  decodeInto("sidewall", { sync: true });
  renderAnswers();
  try {
    setSaveNote(localStorage.getItem(STORAGE_KEY) ? "Saved on this device only." : "Wayne’s example is prefilled so the page is never empty.");
  } catch (err) {
    setSaveNote("Figures stay on this phone if storage is available.");
  }
})();
