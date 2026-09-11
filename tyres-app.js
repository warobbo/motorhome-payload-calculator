/* =========================================================================
   Tyres tool UI — sidewall + axle loads → cold front/rear from the
   right published table (Continental databook or Michelin Agilis C/LT).
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "mh-tyres-v5";
  var T = window.TyreCalc;
  if (!T) return;

  var EXAMPLE = {
    brand: "Continental",
    sidewall: "225/75 R16C 118R",
    frontAxleKg: 1800,
    rearAxleKg: 2000,
    tyresOnAxle: 2
  };

  var DEFAULTS = {
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
  };

  function $(id) {
    return document.getElementById(id);
  }

  function positiveKg(value) {
    var n = Number(value);
    return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : "";
  }

  function weighbridgeFromQuery() {
    var params = new URLSearchParams(location.search);
    return {
      frontAxleKg: positiveKg(params.get("front") || params.get("frontAxleKg")),
      rearAxleKg: positiveKg(params.get("rear") || params.get("rearAxleKg"))
    };
  }

  function savedLooksUseful(saved) {
    if (!saved || typeof saved !== "object") return false;
    return !!(saved.sidewall || saved.loadIndex || saved.frontAxleKg || saved.rearAxleKg);
  }

  function mergeSaved(saved) {
    var state = Object.assign({}, DEFAULTS);
    Object.keys(DEFAULTS).forEach(function (key) {
      if (saved[key] !== undefined && saved[key] !== null) state[key] = saved[key];
    });
    return state;
  }

  function readSavedTyres() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      return savedLooksUseful(saved) ? mergeSaved(saved) : null;
    } catch (err) {
      return null;
    }
  }

  function hasSavedTyres() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      return savedLooksUseful(JSON.parse(raw));
    } catch (err) {
      return false;
    }
  }

  function emptyState() {
    return Object.assign({}, DEFAULTS);
  }

  /* Payload deep-link ?front=&rear= (or frontAxleKg/rearAxleKg) still applies
     on first paint. That is an intentional weighbridge handoff, not a silent
     restore of this page’s localStorage. */
  function initialPaintState() {
    var state = emptyState();
    var fromTicket = weighbridgeFromQuery();
    if (fromTicket.frontAxleKg) state.frontAxleKg = fromTicket.frontAxleKg;
    if (fromTicket.rearAxleKg) state.rearAxleKg = fromTicket.rearAxleKg;
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

  var persistEnabled = false;
  var restoredThisVisit = false;
  var booting = true;
  var pageLoadSnapshot = readSavedTyres();
  var lastKnown = "";

  function snapshotForm() {
    return JSON.stringify(collectState());
  }

  function formChanged() {
    var now = snapshotForm();
    if (now === lastKnown) return false;
    lastKnown = now;
    return true;
  }

  function enablePersist() {
    if (booting) return;
    persistEnabled = true;
  }

  function saveState() {
    if (booting || !persistEnabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
      setSaveNote("Saved on this device only.");
    } catch (err) {
      setSaveNote("Could not save on this device.");
    }
    syncSavedTyresBanner();
  }

  function syncSavedTyresBanner() {
    var banner = $("savedTyresBanner");
    var restoreBtn = $("restoreTyres");
    if (!banner) return;
    banner.hidden = !(pageLoadSnapshot || hasSavedTyres());
    if (restoreBtn) restoreBtn.hidden = !pageLoadSnapshot || restoredThisVisit;
  }

  function restoreLastTyres() {
    if (!pageLoadSnapshot) return;
    persistEnabled = true;
    restoredThisVisit = true;
    fillFromState(pageLoadSnapshot);
    decodeInto("sidewall", { sync: true });
    renderAnswers();
    lastKnown = snapshotForm();
    saveState();
    setSaveNote("Restored last tyres on this phone.");
    syncSavedTyresBanner();
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
        out.innerHTML = "<p>" + err + " Try a size such as <code>225/75R16C 118R</code>.</p>";
        return parsed;
      }
      var text = T.describeSidewall(parsed);
      var path = T.resolvePressurePath(parsed, {
      brand: $("brandLabel").value,
      loadIndex: $("loadIndex").value,
      dualLoadIndex: $("dualLoadIndex").value
    });
      var rows = [];
      rows.push("<h4 class=\"field-heading\">Your tyre summary</h4>");
      rows.push(row("Size", text.size));
      var familyNote = "";
      if (path.path === "no-matching-li") familyNote = " — that load index is not in our table";
      else if (path.path === "unsupported-rim") familyNote = " — only 15–18″ wheels";
      else if (path.reason === "michelin-cp-no-table") familyNote = " — no table for this camping size";
      else if (path.reason === "brand-later") familyNote = " — that brand is not covered yet";
      else if (path.path === "no-table") familyNote = " — not in our table yet";
      rows.push(row("Family", parsed.family + familyNote));
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
      brand: $("brandLabel").value,
      parsed: parsed && parsed.ok ? parsed : null,
      axle: which
    };
  }

  function formatPsi(psi) {
    if (psi == null) return "";
    return Number.isInteger(psi) ? String(psi) : String(T.roundPsi(psi));
  }

  function formatBar(bar) {
    if (bar == null) return "";
    var n = Number(T.roundBar(bar));
    if (Math.abs(n * 10 - Math.round(n * 10)) < 1e-9) return n.toFixed(1);
    return n.toFixed(2);
  }

  function paintValue(result, valueEl, altEl) {
    if (!result || !result.ok) {
      valueEl.textContent = "—";
      altEl.textContent = "";
      return;
    }
    if (result.status === "over-capacity" || result.status === "over-pressure") {
      valueEl.textContent = "Fail";
      altEl.textContent = "Over this chart";
      if ((result.path === "lt-databook" || result.path === "c-databook" || result.path === "cp-databook") && result.maxKg != null) {
        altEl.textContent = "Over the last published step";
      }
      return;
    }
    if (result.psi == null && result.bar == null) {
      valueEl.textContent = "—";
      altEl.textContent = "";
      return;
    }
    valueEl.textContent = formatBar(result.bar) + " bar";
    altEl.textContent = formatPsi(result.psi) + " PSI";
  }

  function formatNote(result, axleName) {
    if (!result) return "Add " + axleName + " axle weight and the fitted tyre.";
    if (!result.ok) {
      if (result.error === "need-load") return "Type the " + axleName + " axle weight in kg.";
      if (result.error === "load-index" || result.error === "dual-load-index") {
        return "Need a load index for the " + axleName + " tyre — paste the sidewall.";
      }
      if (result.error === "unknown-load-index") {
        return "That load index is not in the public table, so this page will not invent a pressure.";
      }
      if (result.error === "unsupported-rim") {
        return "Only 15–18″ wheels are in this table. A " + result.rimIn +
          "″ rim is not supported, so this page will not invent a pressure.";
      }
      if (result.error === "ambiguous" || result.error === "no-matching-li") {
        return T.formatLiMismatch(result) || "Paste the load index from the sidewall.";
      }
      if (result.error === "no-table") {
        if (result.reason === "lt-size-unknown") {
          return "That LT size is not in our table yet, so this page will not invent a pressure.";
        }
        if (result.reason === "cp-size-unknown") {
          return "That camping tyre size is not in our table yet, so this page will not invent a pressure.";
        }
        if (result.reason === "michelin-cp-no-table") {
          return T.MICHELIN_CP_REFUSE ||
            "We don’t have Michelin’s Camping CP load/pressure table for this size. We won’t invent one or copy another brand’s camping table and call it Michelin.";
        }
        if (result.reason === "brand-later") {
          return "That brand is not in our tables yet. This page will not invent a pressure.";
        }
        if (result.reason === "p-metric") {
          return "That size is not in our table, so this page will not invent a pressure.";
        }
        return "Not in our table yet — this page will not invent a pressure. See Sources we use.";
      }
      if (result.error === "unrecognised") return "Paste a sidewall such as 225/75R16C 118R.";
      if (result.error === "tyres") return "Tyres on the axle must be 2 or 4.";
      return "Not enough to calculate the " + axleName + ".";
    }
    if (result.status === "over-capacity" || result.status === "over-pressure") {
      return "This axle weight is over the last published step. No safe pressure.";
    }
    if (result.note && result.appliedCpRearFloor) {
      return result.note;
    }
    if (result.axleLoadKg != null && result.bar != null) {
      return Math.round(result.axleLoadKg) + " kg on the axle is covered at this pressure.";
    }
    return "";
  }

  function resultClass(result) {
    if (!result || !result.ok) return "";
    if (result.status === "over-capacity" || result.status === "over-pressure") return "is-fail";
    if (result.status === "min-pressure") return "is-tight";
    return "is-ok";
  }

  function sourceHtml(result) {
    // Never dump table.source — those strings are databook/ETRTO essays for code only.
    if (result && result.ok && (result.path === "lt-databook" || result.path === "c-databook" || result.path === "cp-databook" || result.path === "c-etrto")) {
      return "From the published table for this tyre. See <a href=\"#sources\">Sources we use</a>.";
    }
    return "";
  }

  var lastFront = null;
  var lastRear = null;

  function updateFamilyUi() {
    var parsed = T.parseSidewall($("sidewall").value);
    var path = parsed && parsed.ok ? T.resolvePressurePath(parsed, {
      brand: $("brandLabel").value,
      loadIndex: $("loadIndex").value,
      dualLoadIndex: $("dualLoadIndex").value
    }) : null;
    var badge = $("familyBadge");
    var isCFallback = path && path.path === "c-etrto";
    $("cChartWrap").hidden = !isCFallback;
    var rearParsed = $("rearDifferent").checked ? T.parseSidewall($("rearSidewall").value) : parsed;
    var rearPath = rearParsed && rearParsed.ok ? T.resolvePressurePath(rearParsed, {
      brand: $("brandLabel").value,
      loadIndex: $("rearDifferent").checked ? $("rearLoadIndex").value : $("loadIndex").value,
      dualLoadIndex: $("rearDifferent").checked ? $("rearDualLoadIndex").value : $("dualLoadIndex").value
    }) : path;
    $("rearChartWrap").hidden = !(rearPath && rearPath.path === "c-etrto");

    if (!String($("sidewall").value).trim()) {
      badge.textContent = "Paste a sidewall to pick the right chart.";
      return path;
    }
    if (!parsed || !parsed.ok) {
      badge.textContent = "Sidewall not recognised yet — try 225/75R16C 118R.";
      return path;
    }
    if (path.path === "lt-databook" || path.path === "c-databook" || path.path === "cp-databook") {
      var brand = $("brandLabel").value.trim();
      var sizeLabel = parsed.sizeKey + (path.table && path.table.family === "CP" ? " CP" : "") +
        (path.table && path.table.loadRange ? " LR" + path.table.loadRange : "") +
        (path.table && path.table.loadIndex != null ? " LI " + path.table.loadIndex : "");
      var book = "Continental / General table";
      if (path.table && path.table.family === "CP") {
        book = path.maker === "michelin"
          ? "camping tyre · 5.5 bar rear minimum"
          : "camping tyre table";
      } else if (path.maker === "michelin" || (path.table && path.table.maker === "michelin")) {
        book = "Michelin table";
      }
      badge.textContent = (brand ? brand + " · " : "") + sizeLabel + " · " + book;
    } else if (path.path === "no-matching-li") {
      badge.textContent = T.formatLiMismatch(path) || "That load index is not in our table.";
    } else if (path.path === "c-etrto") {
      badge.textContent = "van C tyre table";
    } else if (path.path === "unsupported-rim") {
      badge.textContent = "Only 15–18″ supported — this is a " + parsed.rimIn + "″ rim.";
    } else if (path.reason === "michelin-cp-no-table") {
      badge.textContent = "Michelin Camping CP — no official table on this page.";
    } else if (path.reason === "brand-later") {
      badge.textContent = "That brand is not in our tables yet.";
    } else {
      badge.textContent = "Detected " + (parsed.family || "unknown") + " — not in our table yet / only 15–18″ supported.";
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
    if ($("rearDifferent").checked) extras.push("Front and rear tyres are set separately.");
    $("answerNotes").textContent = extras.join(" ");

    if (lastFront && lastFront.bar != null && lastRear && lastRear.bar != null) {
      $("dockValue").textContent = formatBar(lastFront.bar) + " / " + formatBar(lastRear.bar) + " bar";
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

    syncCapturePanel();
  }

  function captureReason(result) {
    if (!result) return "This size is not in our tables yet. This page will not invent a pressure.";
    if (result.error === "unsupported-rim") {
      return "Only 15–18″ wheels are in the tables we have today.";
    }
    if (result.error === "no-matching-li" || result.error === "unknown-load-index") {
      return T.formatLiMismatch(result) || "That load index is not in our table yet.";
    }
    if (result.reason === "brand-later") {
      return "That brand is not in our tables yet.";
    }
    if (result.reason === "michelin-cp-no-table") {
      return T.MICHELIN_CP_REFUSE ||
        "We don’t have Michelin’s Camping CP load/pressure table for this size.";
    }
    if (result.reason === "lt-size-unknown") {
      return "That LT size is not in our table yet.";
    }
    if (result.reason === "cp-size-unknown") {
      return "That camping tyre size is not in our table yet.";
    }
    if (result.reason === "p-metric") {
      return "That size is not in our table yet.";
    }
    return "This size is not in our tables yet. This page will not invent a pressure.";
  }

  function uncoveredFrom(result, which) {
    if (!T.isUncoveredRefuse(result)) return null;
    var rear = which === "rear" && $("rearDifferent").checked;
    var raw = rear ? $("rearSidewall").value : $("sidewall").value;
    var parsed = T.parseSidewall(raw);
    var liField = rear ? $("rearLoadIndex").value : $("loadIndex").value;
    var speed = "";
    if (parsed && parsed.ok && parsed.speed && parsed.speed.code) speed = parsed.speed.code;
    var size = String(raw).trim();
    if (!size && result.sizeKey) size = result.sizeKey;
    return {
      size: size,
      loadIndex: String(liField || result.wantedLoadIndex || (parsed && parsed.loadIndex) || "").trim(),
      speed: speed,
      brand: $("brandLabel").value.trim(),
      reason: result.reason || result.error || "",
      reasonText: captureReason(result)
    };
  }

  function uncoveredTarget() {
    return uncoveredFrom(lastFront, "front") || uncoveredFrom(lastRear, "rear");
  }

  var capturePrefillKey = "";
  var captureSubmittedKey = "";
  var captureMailtoTo = "";
  var autoNoteTimer = 0;
  var AUTO_NOTE_STORE = "mh-tyres-autonote-v1";

  function autoNoteKey(target) {
    return [target.size, target.loadIndex, target.brand, target.reason].join("|");
  }

  function alreadyAutoNoted(key) {
    try {
      var raw = sessionStorage.getItem(AUTO_NOTE_STORE);
      var list = raw ? JSON.parse(raw) : [];
      return list.indexOf(key) !== -1;
    } catch (err) {
      return false;
    }
  }

  function markAutoNoted(key) {
    try {
      var raw = sessionStorage.getItem(AUTO_NOTE_STORE);
      var list = raw ? JSON.parse(raw) : [];
      if (list.indexOf(key) === -1) {
        list.push(key);
        if (list.length > 40) list = list.slice(-40);
        sessionStorage.setItem(AUTO_NOTE_STORE, JSON.stringify(list));
      }
    } catch (err) { /* ignore */ }
  }

  function showAutoNoteLine(visible) {
    var el = $("autoNoteLine");
    if (el) el.hidden = !visible;
  }

  function postAutoNote(target) {
    if (!target || !String(target.size || "").trim()) return;
    var key = autoNoteKey(target);
    if (key === captureSubmittedKey || alreadyAutoNoted(key)) {
      showAutoNoteLine(true);
      return;
    }
    fetch("/api/missing-size", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        size: target.size,
        loadIndex: target.loadIndex,
        speedRating: target.speed,
        brand: target.brand,
        reason: target.reasonText || target.reason,
        auto: true
      })
    }).then(function (res) {
      return res.json().then(function (data) {
        return { res: res, data: data };
      }).catch(function () {
        return { res: res, data: {} };
      });
    }).then(function (out) {
      if (out.res && out.res.ok && out.data && out.data.ok) {
        markAutoNoted(key);
        showAutoNoteLine(true);
      }
    }).catch(function () { /* offline — form still works */ });
  }

  function scheduleAutoNote(target) {
    if (!target) {
      showAutoNoteLine(false);
      return;
    }
    var key = autoNoteKey(target);
    if (alreadyAutoNoted(key) || key === captureSubmittedKey) {
      showAutoNoteLine(true);
      return;
    }
    clearTimeout(autoNoteTimer);
    autoNoteTimer = setTimeout(function () {
      postAutoNote(target);
    }, 800);
  }

  function capturePayload() {
    return {
      size: $("captureSize").value,
      loadIndex: $("captureLoadIndex").value,
      speedRating: $("captureSpeed").value,
      brand: $("captureBrand").value,
      note: $("captureNote").value,
      email: $("captureEmail").value,
      reason: $("missingSizeReason").textContent,
      website: $("captureWebsite").value
    };
  }

  function captureSidewallLine() {
    var parts = [$("captureSize").value.trim()];
    if ($("captureLoadIndex").value.trim()) parts.push("LI " + $("captureLoadIndex").value.trim());
    if ($("captureSpeed").value.trim()) parts.push($("captureSpeed").value.trim().toUpperCase());
    if ($("captureBrand").value.trim()) parts.push($("captureBrand").value.trim());
    return parts.join(" ");
  }

  function updateMailtoLink() {
    var link = $("captureMailto");
    if (!link) return;
    if (!captureMailtoTo) {
      link.hidden = true;
      return;
    }
    var payload = capturePayload();
    var subject = "Missing tyre size: " + (payload.size || "unknown");
    var body = [
      "Missing tyre size (research only — do not invent a pressure).",
      "",
      "Tyre size: " + (payload.size || ""),
      "Load index: " + (payload.loadIndex || "(not given)"),
      "Speed rating: " + (payload.speedRating || "(not given)"),
      "Brand / model: " + (payload.brand || "(not given)"),
      "Sidewall line: " + captureSidewallLine(),
      "Note: " + (payload.note || "(none)"),
      "Reply email: " + (payload.email || "(not given)"),
      "",
      "We only add sizes from manufacturer databooks."
    ].join("\n");
    link.href = "mailto:" + captureMailtoTo +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
    link.hidden = false;
  }

  function syncCapturePanel() {
    var panel = $("missingSize");
    var form = $("missingSizeForm");
    var thanks = $("missingSizeThanks");
    if (!panel || !form || !thanks) return;
    var target = uncoveredTarget();
    if (!target) {
      panel.hidden = true;
      clearTimeout(autoNoteTimer);
      showAutoNoteLine(false);
      return;
    }
    panel.hidden = false;
    scheduleAutoNote(target);
    var key = [target.size, target.loadIndex, target.reason].join("|");
    if (key === captureSubmittedKey) {
      form.hidden = true;
      thanks.hidden = false;
      return;
    }
    form.hidden = false;
    thanks.hidden = true;
    if (key !== capturePrefillKey) {
      capturePrefillKey = key;
      $("captureSize").value = target.size;
      $("captureLoadIndex").value = target.loadIndex || "";
      $("captureSpeed").value = target.speed || "";
      $("captureBrand").value = target.brand || "";
      $("missingSizeReason").textContent = target.reasonText;
      $("captureStatus").textContent = "";
      $("captureStatus").className = "missing-size-status";
    }
    updateMailtoLink();
  }

  function setCaptureStatus(text, isErr) {
    var el = $("captureStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "missing-size-status" + (isErr ? " err" : "");
  }

  function copySidewallLine() {
    var line = captureSidewallLine();
    if (!line) {
      setCaptureStatus("Add a tyre size first.", true);
      return;
    }
    function done() {
      setCaptureStatus("Copied the sidewall line.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(line).then(done).catch(function () {
        fallbackCopy(line);
      });
      return;
    }
    fallbackCopy(line);

    function fallbackCopy(text) {
      var box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.left = "-9999px";
      document.body.appendChild(box);
      box.select();
      try {
        document.execCommand("copy");
        done();
      } catch (err) {
        setCaptureStatus("Could not copy — select the tyre size instead.", true);
      }
      document.body.removeChild(box);
    }
  }

  function showMailtoFallback(message) {
    if (!captureMailtoTo) {
      updateMailtoLink();
    }
    if (captureMailtoTo) {
      $("captureMailto").hidden = false;
      setCaptureStatus(message + " You can email the same note instead.", true);
      return;
    }
    setCaptureStatus(message + " Copy the sidewall line if you want to send it yourself.", true);
  }

  function submitCapture(ev) {
    ev.preventDefault();
    var btn = $("captureSend");
    var payload = capturePayload();
    if (!String(payload.size).trim()) {
      setCaptureStatus("Add the tyre size from the sidewall.", true);
      return;
    }
    btn.disabled = true;
    setCaptureStatus("Sending…");
    fetch("/api/missing-size", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (data) {
        return { res: res, data: data };
      }).catch(function () {
        return { res: res, data: {} };
      });
    }).then(function (out) {
      btn.disabled = false;
      if (out.data && out.data.mailto) captureMailtoTo = out.data.mailto;
      if (out.res.ok && out.data && out.data.ok) {
        captureSubmittedKey = capturePrefillKey;
        $("missingSizeForm").hidden = true;
        $("missingSizeThanks").hidden = false;
        setCaptureStatus("");
        return;
      }
      showMailtoFallback(out.data && out.data.message ? out.data.message : "Could not send just now.");
    }).catch(function () {
      btn.disabled = false;
      showMailtoFallback("Could not reach the server.");
    });
  }

  function loadMailtoConfig() {
    fetch("/api/missing-size").then(function (res) { return res.json(); }).then(function (data) {
      if (data && data.mailto) {
        captureMailtoTo = data.mailto;
        updateMailtoLink();
      }
    }).catch(function () { /* file:// or offline — copy / mailto fallback still works */ });
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
    decodeInto("sidewall", { sync: true });
    renderAnswers();
    if (formChanged()) enablePersist();
    saveState();
  }

  function applyExample() {
    fillFromState(Object.assign({}, DEFAULTS, {
      sidewall: EXAMPLE.sidewall,
      brandLabel: EXAMPLE.brand,
      frontAxleKg: EXAMPLE.frontAxleKg,
      rearAxleKg: EXAMPLE.rearAxleKg,
      tyresOnAxle: EXAMPLE.tyresOnAxle
    }));
    decodeInto("sidewall", { sync: true });
    renderAnswers();
    lastKnown = snapshotForm();
    enablePersist();
    saveState();
    setSaveNote("Example size loaded.");
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
    if (lastFront || lastRear) enablePersist();
    saveState();
    setSaveNote("Copied the calculated cold pressures onto this phone.");
  }

  function clearSaved() {
    persistEnabled = false;
    restoredThisVisit = false;
    pageLoadSnapshot = null;
    fillFromState(emptyState());
    decodeInto("sidewall");
    renderAnswers();
    lastKnown = snapshotForm();
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    setSaveNote("Cleared on this device.");
    syncSavedTyresBanner();
  }

  var year = $("yearNow");
  if (year) year.textContent = String(new Date().getFullYear());

  fillFromState(initialPaintState());
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

  $("sidewall").addEventListener("input", afterChange);
  $("rearSidewall").addEventListener("input", function () {
    decodeInto("rearSidewall", { sync: true });
    renderAnswers();
    if (formChanged()) enablePersist();
    saveState();
  });
  $("rearDifferent").addEventListener("change", afterChange);
  if ($("loadExample")) $("loadExample").addEventListener("click", applyExample);
  $("copyAnswers").addEventListener("click", copyAnswers);
  if ($("restoreTyres")) $("restoreTyres").addEventListener("click", restoreLastTyres);
  if ($("clearTyres")) $("clearTyres").addEventListener("click", clearSaved);
  if ($("missingSizeForm")) $("missingSizeForm").addEventListener("submit", submitCapture);
  if ($("captureCopy")) $("captureCopy").addEventListener("click", copySidewallLine);
  ["captureSize", "captureLoadIndex", "captureSpeed", "captureBrand", "captureNote", "captureEmail"].forEach(function (id) {
    if ($(id)) $(id).addEventListener("input", updateMailtoLink);
  });

  decodeInto("sidewall", { sync: true });
  renderAnswers();
  lastKnown = snapshotForm();
  loadMailtoConfig();
  syncSavedTyresBanner();
  if (!pageLoadSnapshot) setSaveNote("Nothing saved yet.");
  window.requestAnimationFrame(function () {
    booting = false;
  });
})();
