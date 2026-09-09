/* =========================================================================
   Tyres tool UI — notepad, converters, sidewall decode, optional axle check.
   Figures stay in this browser only. Never invents a recommended pressure.
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "mh-tyres-v1";
  var T = window.TyreCalc;
  if (!T) return;

  var DEFAULTS = {
    convBar: "",
    convPsi: "",
    frontBar: "",
    rearBar: "",
    spareBar: "",
    sidewall: "",
    axleLoadKg: "",
    loadIndex: "",
    dualLoadIndex: "",
    tyresOnAxle: 2
  };

  var AXLES = [
    { key: "front", barId: "frontBar", psiId: "frontPsi" },
    { key: "rear", barId: "rearBar", psiId: "rearPsi" },
    { key: "spare", barId: "spareBar", psiId: "sparePsi" }
  ];

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
    } catch (err) {
      /* ignore broken storage */
    }
    return state;
  }

  function collectState() {
    return {
      convBar: $("convBar").value,
      convPsi: $("convPsi").value,
      frontBar: $("frontBar").value,
      rearBar: $("rearBar").value,
      spareBar: $("spareBar").value,
      sidewall: $("sidewall").value,
      axleLoadKg: $("axleLoadKg").value,
      loadIndex: $("loadIndex").value,
      dualLoadIndex: $("dualLoadIndex").value,
      tyresOnAxle: $("tyresOnAxle").value
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
    setPairFromBar($("convBar"), $("convPsi"), state.convBar);
    if (!state.convBar && state.convPsi) {
      setPairFromPsi($("convBar"), $("convPsi"), state.convPsi);
    }
    setPairFromBar($("frontBar"), $("frontPsi"), state.frontBar);
    setPairFromBar($("rearBar"), $("rearPsi"), state.rearBar);
    setPairFromBar($("spareBar"), $("sparePsi"), state.spareBar);
    $("sidewall").value = state.sidewall;
    $("axleLoadKg").value = state.axleLoadKg;
    $("loadIndex").value = state.loadIndex;
    $("dualLoadIndex").value = state.dualLoadIndex;
    $("tyresOnAxle").value = state.tyresOnAxle || 2;
  }

  function decodeSidewall(opts) {
    var raw = $("sidewall").value;
    var out = $("decodeOut");
    var parsed = T.parseSidewall(raw);
    if (!String(raw).trim()) {
      out.hidden = true;
      out.innerHTML = "";
      return null;
    }
    if (!parsed.ok) {
      out.hidden = false;
      out.className = "decode-out is-err";
      var err = "That does not look like a sidewall size code.";
      if (parsed.error === "unknown-load-index") {
        err = "Size read OK, but that load index is not in the public table this page uses.";
      } else if (parsed.error === "unknown-speed") {
        err = "Size read OK, but that speed letter is not one this page explains.";
      }
      out.innerHTML = "<p>" + err + " Try something like <code>215/70 R15C 109/107 Q</code>.</p>";
      return null;
    }

    var text = T.describeSidewall(parsed);
    var rows = [];
    rows.push(row("Size", text.size));
    rows.push(row("C / CP mark", text.service));
    if (text.extraLoad) rows.push(row("Reinforced", text.extraLoad));
    if (text.load) rows.push(row("Load index", text.load));
    else rows.push(row("Load index", "Not on this code — look for a number such as 109, or 109/107."));
    if (text.speed) rows.push(row("Speed rating", text.speed));
    else rows.push(row("Speed rating", "Not on this code — a letter such as Q, R or T usually follows the load index."));

    out.hidden = false;
    out.className = "decode-out";
    out.innerHTML = rows.join("");

    if (opts && opts.syncCheck) {
      if (parsed.loadIndex != null) $("loadIndex").value = String(parsed.loadIndex);
      if (parsed.dualLoadIndex != null) $("dualLoadIndex").value = String(parsed.dualLoadIndex);
    }
    return parsed;
  }

  function row(label, body) {
    return "<div class=\"stat-row\"><span>" + escapeHtml(label) + "</span><b>" + escapeHtml(body) + "</b></div>";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCheck() {
    var box = $("checkOut");
    var result = T.checkAxleCapacity({
      axleLoadKg: $("axleLoadKg").value,
      loadIndex: $("loadIndex").value,
      dualLoadIndex: $("dualLoadIndex").value,
      tyresOnAxle: $("tyresOnAxle").value
    });

    if (!result.ok) {
      box.hidden = false;
      box.className = "remaining status-tight";
      var msg = "Enter a load index and how many tyres sit on that axle.";
      if (result.error === "unknown-load-index") {
        msg = "That load index is not in the public table this page uses, so it will not guess a kg figure.";
      } else if (result.error === "tyres") {
        msg = "Number of tyres on the axle needs to be a whole number such as 2 or 4.";
      }
      box.innerHTML =
        "<div class=\"label\">Axle check</div>" +
        "<div class=\"sub\">" + escapeHtml(msg) + "</div>";
      return;
    }

    var statusClass = "status-ok";
    var label = "Looks enough on this estimate";
    var sub = result.capacityKg + " kg from " + result.tyresOnAxle +
      " × load index " + result.usedIndex + " (" + result.kgEach + " kg each).";
    if (result.useDual) {
      sub += " Dual-wheel figure used.";
    } else if (result.dualFallback) {
      sub += " No dual figure typed, so the single load index was used for all four tyres.";
    }

    if (result.status === "need-load") {
      statusClass = "status-tight";
      label = "Capacity only — add an axle load";
      sub += " Type the axle load from a weighbridge or a careful estimate.";
    } else if (result.status === "over") {
      statusClass = "status-over";
      label = "Estimate looks short";
      sub += " Axle load " + result.axleLoadKg + " kg is " + Math.abs(result.marginKg) +
        " kg over this tyre-marking estimate.";
    } else if (result.status === "tight") {
      statusClass = "status-tight";
      label = "Little or no spare";
      sub += " Axle load " + result.axleLoadKg + " kg, spare about " + result.marginKg + " kg.";
    } else {
      sub += " Axle load " + result.axleLoadKg + " kg, spare about " + result.marginKg + " kg.";
    }

    box.hidden = false;
    box.className = "remaining " + statusClass;
    box.innerHTML =
      "<div class=\"label\">" + escapeHtml(label) + "</div>" +
      "<div class=\"value\">" + escapeHtml(String(result.capacityKg)) + "<span class=\"unit-suffix\"> kg</span></div>" +
      "<div class=\"sub\">" + escapeHtml(sub) + "</div>" +
      "<p class=\"note\">The vehicle plate, the tyre maker’s tables and a fitter win over this estimate. It is not a legal check.</p>";
  }

  function bindPair(barId, psiId) {
    var barInput = $(barId);
    var psiInput = $(psiId);
    barInput.addEventListener("input", function () {
      if (barInput.value === "") {
        psiInput.value = "";
      } else {
        var psi = T.barToPsi(barInput.value);
        psiInput.value = psi == null ? "" : String(T.roundPsi(psi));
      }
      afterChange();
    });
    psiInput.addEventListener("input", function () {
      if (psiInput.value === "") {
        barInput.value = "";
      } else {
        var bar = T.psiToBar(psiInput.value);
        barInput.value = bar == null ? "" : String(T.roundBar(bar));
      }
      afterChange();
    });
  }

  function afterChange(fromSidewall) {
    decodeSidewall({ syncCheck: !!fromSidewall });
    renderCheck();
    saveState();
  }

  function clearSaved() {
    fillFromState(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    decodeSidewall();
    renderCheck();
    setSaveNote("Cleared on this device.");
  }

  var year = $("yearNow");
  if (year) year.textContent = String(new Date().getFullYear());

  var state = loadState();
  fillFromState(state);
  bindPair("convBar", "convPsi");
  AXLES.forEach(function (axle) {
    bindPair(axle.barId, axle.psiId);
  });

  $("sidewall").addEventListener("input", function () { afterChange(true); });
  ["axleLoadKg", "loadIndex", "dualLoadIndex", "tyresOnAxle"].forEach(function (id) {
    $(id).addEventListener("input", afterChange);
    $(id).addEventListener("change", afterChange);
  });

  $("clearTyres").addEventListener("click", clearSaved);

  decodeSidewall({ syncCheck: true });
  renderCheck();
  try {
    setSaveNote(localStorage.getItem(STORAGE_KEY) ? "Saved on this device only." : "Nothing saved yet — figures stay on this phone.");
  } catch (err) {
    setSaveNote("Figures stay on this phone if storage is available.");
  }
})();
