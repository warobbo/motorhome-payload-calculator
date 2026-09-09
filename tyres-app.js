/* =========================================================================
   Tyres tool UI — axle load + fitted tyre → cold front/rear pressure.
   Converter and notepad are helpers. Never invents an OEM sticker pressure.
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "mh-tyres-v2";
  var T = window.TyreCalc;
  if (!T) return;

  var DEFAULTS = {
    frontAxleKg: "",
    rearAxleKg: "",
    totalKg: "",
    frontPct: 45,
    sidewall: "",
    loadIndex: "",
    dualLoadIndex: "",
    tyresOnAxle: 2,
    chartId: "c375",
    sidewallMaxBar: "",
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
      loadIndex: $("loadIndex").value,
      dualLoadIndex: $("dualLoadIndex").value,
      tyresOnAxle: $("tyresOnAxle").value,
      chartId: $("chartId").value,
      sidewallMaxBar: $("sidewallMaxBar").value,
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

  function fillFromState(state) {
    $("frontAxleKg").value = state.frontAxleKg;
    $("rearAxleKg").value = state.rearAxleKg;
    $("totalKg").value = state.totalKg;
    $("frontPct").value = state.frontPct || 45;
    $("sidewall").value = state.sidewall;
    $("loadIndex").value = state.loadIndex;
    $("dualLoadIndex").value = state.dualLoadIndex;
    $("tyresOnAxle").value = state.tyresOnAxle || 2;
    $("chartId").value = state.chartId || "c375";
    $("sidewallMaxBar").value = state.sidewallMaxBar;
    $("rearDifferent").checked = !!state.rearDifferent;
    $("rearSidewall").value = state.rearSidewall;
    $("rearLoadIndex").value = state.rearLoadIndex;
    $("rearDualLoadIndex").value = state.rearDualLoadIndex;
    $("rearTyresOnAxle").value = state.rearTyresOnAxle || 2;
    $("rearChartId").value = state.rearChartId || "c375";
    setPairFromBar($("convBar"), $("convPsi"), state.convBar);
    if (!state.convBar && state.convPsi) {
      var bar = T.psiToBar(state.convPsi);
      $("convPsi").value = state.convPsi;
      $("convBar").value = bar == null ? "" : String(T.roundBar(bar));
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
        out.innerHTML = "<p>" + err + " Try <code>215/70 R15C 109/107 Q</code>.</p>";
        return parsed;
      }
      var text = T.describeSidewall(parsed);
      var rows = [];
      rows.push(row("Size", text.size));
      rows.push(row("C / CP mark", text.service));
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
        $("chartId").value = T.suggestChartId(parsed);
      } else if (inputId === "rearSidewall") {
        if (parsed.loadIndex != null) $("rearLoadIndex").value = String(parsed.loadIndex);
        if (parsed.dualLoadIndex != null) $("rearDualLoadIndex").value = String(parsed.dualLoadIndex);
        $("rearChartId").value = T.suggestChartId(parsed);
      }
    }
    return parsed;
  }

  function axleOpts(which) {
    var rear = which === "rear" && $("rearDifferent").checked;
    return {
      axleLoadKg: which === "front" ? $("frontAxleKg").value : $("rearAxleKg").value,
      tyresOnAxle: rear ? $("rearTyresOnAxle").value : $("tyresOnAxle").value,
      loadIndex: rear ? $("rearLoadIndex").value : $("loadIndex").value,
      dualLoadIndex: rear ? $("rearDualLoadIndex").value : $("dualLoadIndex").value,
      chartId: rear ? $("rearChartId").value : $("chartId").value,
      sidewallMaxBar: $("sidewallMaxBar").value
    };
  }

  function formatValue(result) {
    if (!result || !result.ok) return "—";
    if (result.status === "over-capacity" || result.status === "over-pressure") return "Fail";
    if (result.bar == null) return "—";
    return result.bar + " bar · " + result.psi + " PSI";
  }

  function formatNote(result, axleName) {
    if (!result) return "Add " + axleName + " axle load and the fitted tyre.";
    if (!result.ok) {
      if (result.error === "need-load") return "Type the " + axleName + " axle load in kg.";
      if (result.error === "load-index" || result.error === "dual-load-index") {
        return "Need a load index for the " + axleName + " tyre — paste the sidewall or type it.";
      }
      if (result.error === "unknown-load-index") {
        return "That load index is not in the public table, so this page will not invent a pressure.";
      }
      if (result.error === "unknown-chart") return "Pick a load/pressure chart.";
      if (result.error === "tyres") return "Tyres on the axle must be 2 or 4.";
      return "Not enough to calculate the " + axleName + ".";
    }
    if (result.status === "over-capacity") {
      return "Over load-index capacity (" + Math.round(result.loadKg) + " kg on each tyre; index " +
        result.usedIndex + " is " + result.lref + " kg). No safe pressure from this chart.";
    }
    if (result.status === "over-pressure") {
      return "Would need more than the chart maximum (" + result.pmaxBar +
        " bar) to carry this load. No pressure suggested.";
    }
    var bits = [];
    bits.push(Math.round(result.loadKg) + " kg on each of " + result.tyresOnAxle + " tyres");
    bits.push("index " + result.usedIndex + " = " + result.lref + " kg");
    if (result.useDual) bits.push("dual-wheel figure");
    if (result.dualFallback) bits.push("no dual index typed, so the single index was used");
    if (result.status === "min-pressure") bits.push("raised to the chart minimum cold pressure");
    return bits.join(" · ") + ".";
  }

  function resultClass(result) {
    if (!result || !result.ok) return "";
    if (result.status === "over-capacity" || result.status === "over-pressure") return "is-fail";
    if (result.status === "min-pressure") return "is-tight";
    return "is-ok";
  }

  var lastFront = null;
  var lastRear = null;

  function renderAnswers() {
    lastFront = T.coldPressureForAxle(axleOpts("front"));
    lastRear = T.coldPressureForAxle(axleOpts("rear"));

    $("frontValue").textContent = formatValue(lastFront);
    $("frontSub").textContent = formatNote(lastFront, "front");
    $("rearValue").textContent = formatValue(lastRear);
    $("rearSub").textContent = formatNote(lastRear, "rear");
    $("frontResult").className = "axle-result " + resultClass(lastFront);
    $("rearResult").className = "axle-result " + resultClass(lastRear);

    var chart = T.getChart($("chartId").value);
    $("chartNote").textContent = chart
      ? ("Chart: " + chart.label + " " + chart.source)
      : "";

    var extras = [];
    if ($("rearDifferent").checked) extras.push("Front and rear tyres are set separately.");
    var parsed = T.parseSidewall($("sidewall").value);
    if (parsed && parsed.ok && parsed.service === "CP") {
      extras.push("CP camping tyre: this is a driving cold-pressure estimate. Use the maker’s camping table for parked / site load.");
    }
    $("answerNotes").textContent = extras.join(" ");

    if (lastFront && lastFront.bar != null && lastRear && lastRear.bar != null) {
      $("dockValue").textContent = lastFront.bar + " / " + lastRear.bar + " bar";
      $("dockHint").textContent = "Cold front / rear";
      $("dock").className = "dock dock-ok";
    } else if ((lastFront && (lastFront.status === "over-capacity" || lastFront.status === "over-pressure")) ||
               (lastRear && (lastRear.status === "over-capacity" || lastRear.status === "over-pressure"))) {
      $("dockValue").textContent = "Fail";
      $("dockHint").textContent = "Over load or over max pressure";
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

  function afterChange() {
    $("rearTyreWrap").hidden = !$("rearDifferent").checked;
    decodeInto("sidewall");
    renderAnswers();
    saveState();
  }

  function applySplit() {
    var split = T.splitAxleLoads($("totalKg").value, $("frontPct").value);
    if (!split.ok) return;
    $("frontAxleKg").value = String(split.frontKg);
    $("rearAxleKg").value = String(split.rearKg);
    afterChange();
  }

  function copyAnswers() {
    if (lastFront && lastFront.bar != null) {
      setPairFromBar($("noteFrontBar"), $("noteFrontPsi"), lastFront.bar);
    }
    if (lastRear && lastRear.bar != null) {
      setPairFromBar($("noteRearBar"), $("noteRearPsi"), lastRear.bar);
    }
    saveState();
    setSaveNote("Copied the calculated cold pressures onto this phone.");
  }

  function clearSaved() {
    fillFromState(DEFAULTS);
    decodeInto("sidewall");
    renderAnswers();
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    setSaveNote("Cleared on this device.");
  }

  var year = $("yearNow");
  if (year) year.textContent = String(new Date().getFullYear());

  fillFromState(loadState());
  bindPair("convBar", "convPsi");
  bindPair("noteFrontBar", "noteFrontPsi");
  bindPair("noteRearBar", "noteRearPsi");

  [
    "frontAxleKg", "rearAxleKg", "totalKg", "frontPct",
    "loadIndex", "dualLoadIndex", "tyresOnAxle", "chartId", "sidewallMaxBar",
    "rearLoadIndex", "rearDualLoadIndex", "rearTyresOnAxle", "rearChartId"
  ].forEach(function (id) {
    $(id).addEventListener("input", afterChange);
    $(id).addEventListener("change", afterChange);
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
  $("applySplit").addEventListener("click", applySplit);
  $("copyAnswers").addEventListener("click", copyAnswers);
  $("clearTyres").addEventListener("click", clearSaved);

  decodeInto("sidewall");
  renderAnswers();
  try {
    setSaveNote(localStorage.getItem(STORAGE_KEY) ? "Saved on this device only." : "Nothing saved yet.");
  } catch (err) {
    setSaveNote("Figures stay on this phone if storage is available.");
  }
})();
