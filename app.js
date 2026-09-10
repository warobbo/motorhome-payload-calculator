/* =========================================================================
   Payload maths — all internal values are metric (kg / litres).
   The unit toggle only changes what is shown and what the user types.
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "mh-payload-calc-v1";
  var DVLA_KEY_STORAGE = "mh-payload-dvla-key";
  var MOT_KEY_STORAGE = "mh-payload-mot-key";
  var KG_PER_LB = 0.45359237;
  var L_PER_UK_GAL = 4.54609;

  var BATT_KG = { none: 0, life100: 12, life200: 24, agm100: 28, agm110: 32 };
  var SOLAR_KG = { none: 0, rigid100: 7.5, rigid200: 14, flex100: 2.2, flex200: 4.2 };

  var DEFAULTS = {
    units: "metric",
    mam: 3500,
    miro: 3050,
    actualEmpty: "",
    frontAxle: "",
    rearAxle: "",
    axleMode: "loaded",
    wbFrontAxle: "",
    wbRearAxle: "",
    driverKg: 75,
    miroIncludesDriver: true,
    miroIncludesFuel: true,
    vrm: "",
    make: "",
    model: "",
    yearOfManufacture: "",
    colour: "",
    fuelType: "",
    extraAdults: 1,
    adultKg: 80,
    children: 0,
    childKg: 30,
    pets: 0,
    petKg: 12,
    freshCap: 90,
    freshFill: 50,
    greyCap: 70,
    greyFill: 0,
    blackCap: 19,
    blackFill: 0,
    fuelCap: 90,
    fuelFill: 90,
    fuelDensity: 0.84,
    gas6: 1,
    gas6Full: 13,
    gas9: 0,
    gas9Full: 18.5,
    gas13: 0,
    gas13Full: 28,
    battType: "life100",
    battQty: 1,
    battCustomKg: 12,
    solarType: "none",
    solarQty: 1,
    solarCustomKg: 14,
    inverterKg: 0,
    elecExtrasKg: 0,
    awning: false,
    awningKg: 28,
    bikes: 0,
    bikeKg: 14,
    rackKg: 12,
    ramps: true,
    rampsKg: 4.5,
    furniture: false,
    furnitureKg: 20,
    generator: false,
    generatorKg: 22,
    toolbox: true,
    toolboxKg: 10,
    foodPeople: 1,
    foodKgEach: 12,
    miscKg: 20,
    customItems: []
  };

  var TYPICAL = {
    mam: 3500,
    miro: 3120,
    actualEmpty: "",
    extraAdults: 1,
    adultKg: 80,
    children: 0,
    pets: 0,
    freshCap: 100,
    freshFill: 80,
    greyCap: 80,
    greyFill: 10,
    blackCap: 19,
    blackFill: 20,
    fuelCap: 90,
    fuelFill: 90,
    gas6: 2,
    gas6Full: 13,
    gas9: 0,
    gas9Full: 18.5,
    gas13: 0,
    gas13Full: 28,
    battType: "life100",
    battQty: 1,
    solarType: "rigid200",
    solarQty: 1,
    inverterKg: 4.5,
    elecExtrasKg: 3,
    awning: true,
    bikes: 2,
    ramps: true,
    furniture: true,
    generator: false,
    toolbox: true,
    foodPeople: 2,
    foodKgEach: 12,
    miscKg: 28
  };

  var LIGHT = {
    mam: 3500,
    miro: 3050,
    actualEmpty: "",
    extraAdults: 1,
    children: 0,
    pets: 0,
    freshCap: 90,
    freshFill: 25,
    greyCap: 70,
    greyFill: 0,
    blackCap: 19,
    blackFill: 0,
    fuelCap: 90,
    fuelFill: 80,
    gas6: 1,
    gas9: 0,
    gas13: 0,
    battType: "life100",
    battQty: 1,
    solarType: "flex100",
    solarQty: 1,
    inverterKg: 0,
    elecExtrasKg: 1.5,
    awning: false,
    bikes: 0,
    ramps: true,
    furniture: false,
    generator: false,
    toolbox: true,
    foodPeople: 2,
    foodKgEach: 12,
    miscKg: 10
  };

  var FAMILY = {
    mam: 3500,
    miro: 3120,
    actualEmpty: "",
    extraAdults: 1,
    adultKg: 80,
    children: 2,
    childKg: 30,
    pets: 0,
    freshCap: 100,
    freshFill: 90,
    greyCap: 80,
    greyFill: 20,
    blackCap: 19,
    blackFill: 40,
    fuelCap: 90,
    fuelFill: 90,
    gas6: 2,
    gas9: 0,
    gas13: 0,
    battType: "life100",
    battQty: 1,
    solarType: "rigid200",
    solarQty: 1,
    inverterKg: 4.5,
    elecExtrasKg: 3,
    awning: true,
    bikes: 2,
    ramps: true,
    furniture: true,
    generator: false,
    toolbox: true,
    foodPeople: 4,
    foodKgEach: 12,
    miscKg: 45
  };

  var nextCustomId = 1;
  var customKit = (typeof CustomKit !== "undefined" && CustomKit)
    || (typeof globalThis !== "undefined" && globalThis.CustomKit)
    || { normalizeItems: function (list) { return Array.isArray(list) ? list : []; }, totalKg: function () { return 0; } };
  var axleCheck = (typeof AxleCheck !== "undefined" && AxleCheck)
    || (typeof globalThis !== "undefined" && globalThis.AxleCheck)
    || {
      hasRating: function (v) { return Number(v) > 0; },
      isIncomplete: function (f, r) { return !(Number(f) > 0 && Number(r) > 0); },
      cautionLabel: function () { return "MAM check only — axle check incomplete"; },
      cautionDetail: function () { return "Enter both front and rear axle ratings from the VIN plate. This page does not invent axle loads."; },
      normalizeMode: function (mode) { return mode === "empty" ? "empty" : "loaded"; },
      modeNote: function (mode) {
        return mode === "empty"
          ? "Base van — does not prove trip legality; use Loaded for roadside check"
          : "As driven — front/rear vs plate";
      },
      evaluate: function () {
        return {
          status: "incomplete",
          incompleteKind: "mam-only",
          modeNote: "As driven — front/rear vs plate",
          frontOver: false,
          rearOver: false,
          loudFail: false,
          label: "MAM check only — axle check incomplete",
          detail: "Enter both front and rear axle ratings from the VIN plate. This page does not invent axle loads.",
          sanityFlag: false,
          sanityDetail: "",
          tyresLink: "Fitted different tyres? Use the Tyres tool with your axle weights (weighbridge figures, not the plate ratings)."
        };
      }
    };
  var state = loadState();
  var waterBackup = null;
  var syncing = false;

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function loadState() {
    var merged = clone(DEFAULTS);
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(merged, JSON.parse(raw));
      if (merged.foodPeople == null && merged.foodKg != null) {
        merged.foodKgEach = merged.foodKgEach != null ? merged.foodKgEach : 12;
        var oldFood = parseFloat(merged.foodKg);
        merged.foodPeople = isFinite(oldFood) && oldFood > 0
          ? Math.max(1, Math.round(oldFood / 12))
          : 0;
      }
    } catch (e) { /* private mode */ }
    merged.customItems = (customKit && customKit.normalizeItems)
      ? customKit.normalizeItems(merged.customItems)
      : (Array.isArray(merged.customItems) ? merged.customItems : []);
    merged.customItems.forEach(function (item) {
      var n = parseInt(String(item.id || "").replace(/\D/g, ""), 10);
      if (isFinite(n) && n >= nextCustomId) nextCustomId = n + 1;
    });
    return merged;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  function isImperial() { return state.units === "imperial"; }

  function displayWeight(kg) {
    return isImperial() ? kg / KG_PER_LB : kg;
  }
  function storeWeight(view) {
    return isImperial() ? num(view) * KG_PER_LB : num(view);
  }
  function displayVolume(litres) {
    return isImperial() ? litres / L_PER_UK_GAL : litres;
  }
  function storeVolume(view) {
    return isImperial() ? num(view) * L_PER_UK_GAL : num(view);
  }

  function fmt(kg, digits) {
    var n = displayWeight(kg);
    var d = digits != null ? digits : (isImperial() ? 0 : 0);
    return n.toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: 0 }) + " " + (isImperial() ? "lb" : "kg");
  }

  function roundView(value, kind) {
    if (value === "" || value == null) return "";
    var n = num(value);
    if (kind === "weight") n = displayWeight(n);
    if (kind === "volume") n = displayVolume(n);
    return String(Math.round(n * 10) / 10);
  }

  function setUnitLabels() {
    var w = isImperial() ? "lb" : "kg";
    var v = isImperial() ? "UK gal" : "litres";
    document.querySelectorAll(".u-weight").forEach(function (el) { el.textContent = w; });
    document.querySelectorAll(".u-volume").forEach(function (el) { el.textContent = v; });
    document.getElementById("unit-metric").checked = !isImperial();
    document.getElementById("unit-imperial").checked = isImperial();
  }

  function toggleCustomFields() {
    document.getElementById("battCustomWrap").style.display = state.battType === "custom" ? "" : "none";
    document.getElementById("solarCustomWrap").style.display = state.solarType === "custom" ? "" : "none";
  }

  function ensureModelOption(value) {
    var sel = document.getElementById("model");
    if (!sel || sel.tagName !== "SELECT" || !value) return;
    var exists = Array.prototype.some.call(sel.options, function (opt) {
      return opt.value === value;
    });
    if (!exists) {
      var opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      sel.appendChild(opt);
    }
  }

  var massInService = (typeof MassInService !== "undefined" && MassInService)
    || (typeof globalThis !== "undefined" && globalThis.MassInService)
    || {
      parseWeightInput: function (value) {
        if (value === "" || value == null) return null;
        var cleaned = String(value).trim().replace(/,/g, "");
        if (cleaned === "") return null;
        var n = parseFloat(cleaned);
        return isFinite(n) && n > 0 ? n : null;
      },
      isMissing: function (stateMiro, fieldValue, actualEmpty) {
        if (num(actualEmpty) > 0) return false;
        if (this.parseWeightInput(fieldValue) != null) return false;
        if (this.parseWeightInput(stateMiro) != null) return false;
        return true;
      }
    };

  function visibleMiroValue() {
    var el = document.getElementById("miro");
    return el ? el.value : "";
  }

  /* Plate lookup clears state.miro. If the box still shows a number (typed,
     autofilled, or kept while the model dropdown changes), copy it in. */
  function adoptVisibleMiro() {
    if (syncing) return;
    var el = document.getElementById("miro");
    if (!el) return;
    var parsed = massInService.parseWeightInput(el.value);
    if (parsed == null) return;
    var kg = isImperial() ? parsed * KG_PER_LB : parsed;
    if (state.miro !== kg) {
      state.miro = kg;
      saveState();
    }
  }

  function miroMissing() {
    adoptVisibleMiro();
    return massInService.isMissing(state.miro, visibleMiroValue(), state.actualEmpty);
  }

  function fillForm() {
    syncing = true;
    ensureModelOption(state.model);
    document.querySelectorAll("[data-key]").forEach(function (el) {
      var key = el.getAttribute("data-key");
      var kind = el.getAttribute("data-kind");
      var val = state[key];
      if (el.type === "checkbox") {
        el.checked = !!val;
      } else if (kind === "weight" || kind === "volume") {
        el.value = val === "" || val == null ? "" : roundView(val, kind);
      } else {
        el.value = val == null ? "" : val;
      }
    });
    setUnitLabels();
    toggleCustomFields();
    renderCustomKit();
    syncSteppers();
    syncWeighedEmptyUi();
    syncAxleModeUi();
    syncing = false;
  }

  function readForm(el) {
    if (syncing) return;
    var key = el.getAttribute("data-key");
    var kind = el.getAttribute("data-kind");
    if (el.type === "checkbox") {
      state[key] = el.checked;
    } else if (kind === "weight") {
      state[key] = el.value === "" ? "" : storeWeight(el.value);
    } else if (kind === "volume") {
      state[key] = el.value === "" ? "" : storeVolume(el.value);
    } else if (el.type === "text" || el.type === "password") {
      state[key] = el.value;
    } else if (el.tagName === "SELECT") {
      state[key] = el.value;
    } else {
      state[key] = el.value === "" ? "" : num(el.value);
    }
    toggleCustomFields();
    syncSteppers();
    saveState();
    calculate();
  }

  function syncSteppers() {
    document.querySelectorAll(".stepper").forEach(function (wrap) {
      var input = wrap.querySelector("input");
      var minus = wrap.querySelector('[data-step="-1"]');
      var plus = wrap.querySelector('[data-step="1"]');
      if (!input) return;
      var min = input.min === "" ? -Infinity : Number(input.min);
      var max = input.max === "" ? Infinity : Number(input.max);
      var current = input.value === "" ? 0 : Number(input.value);
      if (!isFinite(current)) current = 0;
      if (minus) minus.disabled = current <= min;
      if (plus) plus.disabled = isFinite(max) && current >= max;
    });
  }

  function stepValue(input, delta) {
    var min = input.min === "" ? 0 : Number(input.min);
    var max = input.max === "" ? Infinity : Number(input.max);
    var step = Number(input.step) || 1;
    var current = input.value === "" ? 0 : Number(input.value);
    if (!isFinite(current)) current = 0;
    var next = Math.round((current + delta * step) / step) * step;
    if (next < min) next = min;
    if (next > max) next = max;
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function batteryKg() {
    var each = state.battType === "custom" ? num(state.battCustomKg) : (BATT_KG[state.battType] || 0);
    return each * num(state.battQty);
  }
  function solarKg() {
    var each = state.solarType === "custom" ? num(state.solarCustomKg) : (SOLAR_KG[state.solarType] || 0);
    return each * num(state.solarQty);
  }

  function usingActualEmpty() {
    return num(state.actualEmpty) > 0;
  }

  function syncWeighedEmptyUi() {
    var emptyNote = document.getElementById("weighedEmptyNote");
    if (emptyNote) emptyNote.hidden = !usingActualEmpty();
  }

  function syncAxleModeUi() {
    var mode = axleCheck.normalizeMode(state.axleMode);
    state.axleMode = mode;
    var loaded = document.getElementById("axleModeLoaded");
    var empty = document.getElementById("axleModeEmpty");
    if (loaded) loaded.checked = mode === "loaded";
    if (empty) empty.checked = mode === "empty";
    var hint = document.getElementById("axleModeHint");
    if (hint) hint.textContent = axleCheck.modeNote(mode);
  }

  function knownAxleTotal(computed) {
    if (axleCheck.normalizeMode(state.axleMode) === "empty") {
      if (num(state.actualEmpty) > 0) return num(state.actualEmpty);
      if (num(state.miro) > 0) return num(state.miro);
      return "";
    }
    if (computed && num(computed.total) > 0 && !miroMissing()) return computed.total;
    return "";
  }

  function currentAxleResult(computed) {
    return axleCheck.evaluate({
      mode: state.axleMode,
      frontLimit: state.frontAxle,
      rearLimit: state.rearAxle,
      frontWeight: state.wbFrontAxle,
      rearWeight: state.wbRearAxle,
      knownTotal: knownAxleTotal(computed)
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function newCustomItem() {
    return { id: "kit-" + (nextCustomId++), name: "", kg: "", qty: 1 };
  }

  function renderCustomKit() {
    var root = document.getElementById("customKitRows");
    if (!root) return;
    state.customItems = customKit.normalizeItems(state.customItems);
    if (!state.customItems.length) {
      root.innerHTML = '<p class="hint" id="customKitEmpty">No extra items yet.</p>';
      return;
    }
    root.innerHTML = state.customItems.map(function (item) {
      var kgView = item.kg === "" || item.kg == null ? "" : roundView(item.kg, "weight");
      return '<div class="custom-kit-row" data-kit-id="' + escapeHtml(item.id) + '">' +
        '<div class="field"><label>Item</label>' +
        '<input type="text" class="kit-name" maxlength="80" autocomplete="off" placeholder="e.g. extra chairs" value="' + escapeHtml(item.name) + '"></div>' +
        '<div class="field"><label>Weight each</label>' +
        '<input type="number" class="kit-kg" inputmode="decimal" min="0" step="0.1" value="' + escapeHtml(kgView) + '"></div>' +
        '<div class="field"><label>Quantity</label><div class="stepper">' +
        '<button type="button" class="stepper-btn kit-step" data-step="-1" aria-label="Fewer of this item">\u2212</button>' +
        '<input type="number" class="kit-qty" inputmode="numeric" min="0" step="1" value="' + escapeHtml(item.qty) + '">' +
        '<button type="button" class="stepper-btn kit-step" data-step="1" aria-label="More of this item">+</button>' +
        '</div></div>' +
        '<button type="button" class="btn kit-remove" aria-label="Remove ' + escapeHtml(item.name || "custom item") + '">Remove</button>' +
        '</div>';
    }).join("");
  }

  function customItemFromRow(row) {
    var id = row.getAttribute("data-kit-id");
    var nameEl = row.querySelector(".kit-name");
    var kgEl = row.querySelector(".kit-kg");
    var qtyEl = row.querySelector(".kit-qty");
    return {
      id: id,
      name: nameEl ? nameEl.value : "",
      kg: kgEl && kgEl.value !== "" ? storeWeight(kgEl.value) : "",
      qty: qtyEl && qtyEl.value !== "" ? num(qtyEl.value) : 1
    };
  }

  function readCustomKitFromDom() {
    var root = document.getElementById("customKitRows");
    if (!root) return;
    var rows = root.querySelectorAll(".custom-kit-row");
    state.customItems = Array.prototype.map.call(rows, customItemFromRow);
  }

  function updateTyresLink() {
    var el = document.getElementById("tyresLink");
    if (!el) return;
    var hasWeights = axleCheck.hasRating(state.wbFrontAxle) && axleCheck.hasRating(state.wbRearAxle);
    var href = "tyres.html";
    if (hasWeights) {
      href = "tyres.html?front=" + encodeURIComponent(String(Math.round(num(state.wbFrontAxle)))) +
        "&rear=" + encodeURIComponent(String(Math.round(num(state.wbRearAxle))));
    }
    el.innerHTML = hasWeights
      ? 'Use these weights in the <a href="' + href + '">Tyres tool</a> (weighbridge figures, not the plate ratings).'
      : 'Fitted different tyres? Use the <a href="' + href + '">Tyres tool</a> with your axle weights (weighbridge figures, not the plate ratings).';
  }

  function axleStatusClass(result) {
    if (result.status === "fail") return "over";
    if (result.status === "pass") return "ok";
    return "tight";
  }

  function updateAxleResults(computed) {
    var result = currentAxleResult(computed);
    var frontEl = document.getElementById("frontAxleOut");
    var rearEl = document.getElementById("rearAxleOut");
    var wbFrontRow = document.getElementById("wbFrontRow");
    var wbRearRow = document.getElementById("wbRearRow");
    var wbFrontOut = document.getElementById("wbFrontOut");
    var wbRearOut = document.getElementById("wbRearOut");
    var warn = document.getElementById("warnAxleIncomplete");
    var warnOver = document.getElementById("warnAxleOver");
    var warnSanity = document.getElementById("warnAxleSanity");
    var note = document.getElementById("axleNote");
    var box = document.getElementById("axleStatusBox");
    var valueEl = document.getElementById("axleStatusValue");
    var subEl = document.getElementById("axleStatusSub");
    var hasWeights = axleCheck.hasRating(state.wbFrontAxle) && axleCheck.hasRating(state.wbRearAxle);

    if (frontEl) {
      frontEl.textContent = axleCheck.hasRating(state.frontAxle) ? fmt(num(state.frontAxle), 0) : "\u2014";
    }
    if (rearEl) {
      rearEl.textContent = axleCheck.hasRating(state.rearAxle) ? fmt(num(state.rearAxle), 0) : "\u2014";
    }
    if (wbFrontOut) {
      wbFrontOut.textContent = axleCheck.hasRating(state.wbFrontAxle) ? fmt(num(state.wbFrontAxle), 0) : "\u2014";
    }
    if (wbRearOut) {
      wbRearOut.textContent = axleCheck.hasRating(state.wbRearAxle) ? fmt(num(state.wbRearAxle), 0) : "\u2014";
    }
    if (wbFrontRow) wbFrontRow.hidden = !hasWeights;
    if (wbRearRow) wbRearRow.hidden = !hasWeights;

    if (box) box.className = "remaining axle-status status-" + axleStatusClass(result);
    if (valueEl) {
      valueEl.textContent = result.status === "fail"
        ? "FAIL"
        : result.status === "pass"
          ? result.label
          : "\u2014";
    }
    if (subEl) subEl.textContent = result.detail;

    if (warn) {
      warn.classList.toggle("show", result.status === "incomplete");
      warn.textContent = result.status === "incomplete"
        ? result.label + ". " + result.detail
        : warn.textContent;
    }
    if (warnOver) {
      warnOver.classList.toggle("show", !!result.loudFail);
      if (result.loudFail) warnOver.textContent = result.detail;
    }
    if (warnSanity) {
      warnSanity.classList.toggle("show", !!result.sanityFlag);
      if (result.sanityFlag) warnSanity.textContent = result.sanityDetail;
    }
    if (note) {
      note.textContent = result.status === "incomplete"
        ? result.detail
        : (result.modeNote + (result.sanityFlag ? " " + result.sanityDetail : ""));
    }
    updateTyresLink();
  }

  function compute(overrides) {
    var s = Object.assign({}, state, overrides || {});
    var mam = num(s.mam);
    var miro = num(s.miro);
    var base = usingActualEmpty() ? num(s.actualEmpty) : miro;

    var driver = DriverPayload.driverPayloadKg({
      driverKg: s.driverKg,
      actualEmpty: s.actualEmpty
    });
    var people = driver + num(s.extraAdults) * num(s.adultKg) + num(s.children) * num(s.childKg) + num(s.pets) * num(s.petKg);

    var fresh = num(s.freshCap) * num(s.freshFill) / 100;
    var grey = num(s.greyCap) * num(s.greyFill) / 100;
    var black = num(s.blackCap) * num(s.blackFill) / 100;
    var fuelOpts = {
      fuelCap: s.fuelCap,
      fuelFill: s.fuelFill,
      fuelDensity: s.fuelDensity,
      actualEmpty: s.actualEmpty
    };
    var fuelActual = FuelPayload.fuelActualKg(fuelOpts);
    var fuel = FuelPayload.fuelPayloadKg(fuelOpts);

    var water = fresh + grey + black;
    var gas = num(s.gas6) * num(s.gas6Full) + num(s.gas9) * num(s.gas9Full) + num(s.gas13) * num(s.gas13Full);

    var electrical = batteryKg() + solarKg() + num(s.inverterKg) + num(s.elecExtrasKg);

    var bikes = num(s.bikes) * num(s.bikeKg) + (num(s.bikes) > 0 ? num(s.rackKg) : 0);
    var food = num(s.foodPeople) * num(s.foodKgEach);
    var gear = bikes + food + num(s.miscKg);
    if (s.awning) gear += num(s.awningKg);
    if (s.ramps) gear += num(s.rampsKg);
    if (s.furniture) gear += num(s.furnitureKg);
    if (s.generator) gear += num(s.generatorKg);
    if (s.toolbox) gear += num(s.toolboxKg);
    gear += customKit.totalKg(s.customItems);

    var added = people + water + fuel + gas + electrical + gear;
    var total = base + added;
    var remaining = mam - total;
    var plated = mam - miro;
    var usedPct = plated > 0 ? (mam - remaining - (usingActualEmpty() ? num(s.actualEmpty) : miro)) / (mam - base) * 100 : 0;
    /* Payload used relative to available from the chosen base */
    var available = mam - base;
    usedPct = available > 0 ? (added / available) * 100 : 0;

    return {
      mam: mam, miro: miro, base: base, people: people, fresh: fresh, grey: grey, black: black,
      water: water, fuel: fuel, fuelActual: fuelActual, gas: gas, electrical: electrical, gear: gear,
      added: added, total: total, remaining: remaining, plated: plated, usedPct: usedPct, driver: driver
    };
  }

  function statusClass(remaining) {
    if (remaining < 0) return "over";
    if (remaining < 50) return "critical";
    if (remaining < 150) return "tight";
    return "ok";
  }

  function barRow(label, kg, max) {
    var pct = max > 0 ? Math.min(100, (Math.abs(kg) / max) * 100) : 0;
    var sign = kg < 0 ? "\u2212" : "";
    return '<div class="bar-row"><header><span>' + label + '</span><span>' + sign + fmt(Math.abs(kg), 0) + '</span></header><div class="bar"><span style="width:' + pct + '%;background:' + (kg < 0 ? "var(--amber)" : "var(--pine)") + '"></span></div></div>';
  }

  function calculate() {
    if (miroMissing()) {
      var boxEmpty = document.getElementById("remainingBox");
      boxEmpty.className = "remaining status-tight";
      document.getElementById("remainingLabel").textContent = "Remaining payload";
      document.getElementById("remainingValue").textContent = "\u2014";
      document.getElementById("remainingSub").textContent = "Enter Mass in Service from the V5 or a weighbridge ticket.";
      document.getElementById("totalWeight").textContent = "\u2014";
      document.getElementById("mamOut").textContent = fmt(num(state.mam), 0);
      document.getElementById("platedPayload").textContent = "\u2014";
      var platedNoteEmpty = document.getElementById("platedPayloadNote");
      if (platedNoteEmpty) platedNoteEmpty.hidden = true;
      document.getElementById("payloadPct").textContent = "Mass in Service needed";
      document.getElementById("meterFill").style.width = "0%";
      document.getElementById("warnOver").classList.remove("show");
      document.getElementById("warnLow").classList.remove("show");
      document.getElementById("breakdown").innerHTML = "";
      document.getElementById("waterWhatIf").textContent = "Enter Mass in Service or a weighbridge ticket to see how water and kit use the remaining payload.";
      updateAxleResults(null);
      var dockEmpty = document.getElementById("dockValue");
      dockEmpty.textContent = "\u2014";
      dockEmpty.className = "dock-tight";
      document.getElementById("dockHint").textContent = "Enter Mass in Service to calculate";
      document.getElementById("emptyWater").textContent = waterBackup
        ? "Restore water levels"
        : "What if I empty the water?";
      document.getElementById("peopleNote").textContent = "Mass in Service is blank after the plate lookup \u2014 the V5 figure is not guessed.";
      syncWeighedEmptyUi();
      updateIdentityCard();
      return;
    }

    var r = compute();
    var cls = statusClass(r.remaining);
    var box = document.getElementById("remainingBox");
    box.className = "remaining status-" + cls;
    document.getElementById("remainingLabel").textContent = "Remaining payload";
    document.getElementById("remainingValue").textContent = (r.remaining < 0 ? "\u2212" : "") + fmt(Math.abs(r.remaining), 0);
    document.getElementById("remainingSub").textContent = cls === "ok"
      ? "Comfortable margin under " + fmt(r.mam, 0) + " MAM"
      : cls === "tight"
        ? "Tight \u2014 weigh before a long trip"
        : cls === "critical"
          ? "Very little margin left"
          : "Over MAM";

    document.getElementById("totalWeight").textContent = fmt(r.total, 0);
    document.getElementById("mamOut").textContent = fmt(r.mam, 0);
    var hasMiro = num(state.miro) > 0;
    document.getElementById("platedPayload").textContent = hasMiro ? fmt(r.plated, 0) : "\u2014";
    var platedNote = document.getElementById("platedPayloadNote");
    if (platedNote) platedNote.hidden = !hasMiro;
    document.getElementById("payloadPct").textContent = Math.max(0, r.usedPct).toLocaleString("en-GB", { maximumFractionDigits: 0 }) + "% of available payload";

    var fill = document.getElementById("meterFill");
    fill.style.width = Math.min(100, Math.max(0, r.usedPct)) + "%";
    fill.style.background = cls === "ok" ? "var(--ok)" : cls === "tight" ? "var(--amber)" : "var(--danger)";

    document.getElementById("warnOver").classList.toggle("show", r.remaining < 0);
    document.getElementById("warnLow").classList.toggle("show", r.remaining >= 0 && r.remaining < 100);

    var maxCat = Math.max(r.people, r.water, Math.abs(r.fuel), r.gas, r.electrical, r.gear, 1);
    document.getElementById("breakdown").innerHTML =
      barRow("People & pets", r.people, maxCat) +
      barRow("Fresh / grey / black water", r.water, maxCat) +
      barRow(FuelPayload.fuelBreakdownLabel({
        actualEmpty: state.actualEmpty
      }), r.fuel, maxCat) +
      barRow("Gas bottles", r.gas, maxCat) +
      barRow("Electrical & solar", r.electrical, maxCat) +
      barRow("Gear & other", r.gear, maxCat);

    var empty = compute({ freshFill: 0, greyFill: 0, blackFill: 0 });
    var saved = r.water;
    document.getElementById("waterWhatIf").textContent = saved > 0.5
      ? "Emptying fresh, grey and black water would free " + fmt(saved, 0) + " and leave " + fmt(empty.remaining, 0) + " remaining."
      : "Water tanks are already empty in this estimate.";

    updateAxleResults(r);

    var dock = document.getElementById("dockValue");
    dock.textContent = (r.remaining < 0 ? "\u2212" : "") + fmt(Math.abs(r.remaining), 0);
    dock.className = "dock-" + cls;
    document.getElementById("dockHint").textContent = "Remaining payload";

    document.getElementById("emptyWater").textContent = waterBackup
      ? "Restore water levels"
      : "What if I empty the water?";

    document.getElementById("peopleNote").textContent = usingActualEmpty()
      ? "Weighed empty is the van only \u2014 the full driver weight is added."
      : "Mass in Service assumes a 75 kg driver \u2014 only any extra is added. Additional adults are passengers only.";
    syncWeighedEmptyUi();
    updateIdentityCard();
  }

  function titleCase(value) {
    if (!value) return "";
    return String(value).toLowerCase().replace(/(^|[\s/-])([a-z])/g, function (_, a, b) {
      return a + b.toUpperCase();
    });
  }

  function updateIdentityCard() {
    var card = document.getElementById("identityCard");
    var title = document.getElementById("identityTitle");
    var meta = document.getElementById("identityMeta");
    var summary = document.getElementById("vehicleSummary");
    var name = [titleCase(state.make), state.model].filter(Boolean).join(" ");
    if (!name && !state.vrm) {
      card.classList.remove("show");
      summary.hidden = true;
      return;
    }
    var bits = [];
    if (state.vrm) bits.push(state.vrm);
    if (state.colour) bits.push(titleCase(state.colour));
    if (state.fuelType) bits.push(titleCase(state.fuelType));
    title.textContent = name
      ? (name + (state.yearOfManufacture ? " (" + state.yearOfManufacture + ")" : ""))
      : (state.vrm || "Looked-up vehicle");
    meta.textContent = bits.join(" \u00b7 ");
    card.classList.add("show");
    summary.hidden = !name;
    summary.textContent = name
      ? (name + (state.yearOfManufacture ? " " + state.yearOfManufacture : "") + (state.vrm ? " \u00b7 " + state.vrm : ""))
      : "";
  }

  function setLookupStatus(message, kind) {
    var el = document.getElementById("lookupStatus");
    el.textContent = message;
    el.className = "lookup-status" + (kind ? " " + kind : "");
  }

  function readStored(key) {
    try { return localStorage.getItem(key) || ""; } catch (e) { return ""; }
  }
  function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function lookupKeys() {
    var apiKey = (readStored(DVLA_KEY_STORAGE) || "").trim();
    var motApiKey = (readStored(MOT_KEY_STORAGE) || "").trim();
    var dvlaEl = document.getElementById("dvlaApiKey");
    var motEl = document.getElementById("motApiKey");
    if (dvlaEl && dvlaEl.value.trim()) apiKey = dvlaEl.value.trim();
    if (motEl && motEl.value.trim()) motApiKey = motEl.value.trim();
    return { apiKey: apiKey, motApiKey: motApiKey };
  }
  function setupVisible() {
    var params = new URLSearchParams(location.search);
    return params.get("setup") === "1" || location.hash === "#setup";
  }
  function showSetupIfRequested() {
    var box = document.getElementById("setup");
    if (!box || !setupVisible()) return;
    box.hidden = false;
    var parent = box.closest("details");
    if (parent) parent.open = true;
  }
  var lookupLiveDvla = false;
  function defaultLookupHint() {
    if (lookupLiveDvla || (readStored(DVLA_KEY_STORAGE) || "").trim()) {
      return "Look up a UK plate for make and plated weight, or type make, model and year.";
    }
    return "Look up a UK plate, or type make, model and year.";
  }
  function applyDefaultLookupHint() {
    var el = document.getElementById("lookupStatus");
    if (el && !el.classList.contains("ok") && !el.classList.contains("err")) {
      setLookupStatus(defaultLookupHint());
    }
  }
  function probeLookupStatus() {
    fetch("/api/vehicle-lookup")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.liveDvla) lookupLiveDvla = true;
        applyDefaultLookupHint();
      })
      .catch(function () {
        applyDefaultLookupHint();
      });
  }

  async function lookupRegistration() {
    var btn = document.getElementById("lookupBtn");
    var vrm = (state.vrm || document.getElementById("vrm").value || "").trim();
    if (!vrm) {
      setLookupStatus("Enter a UK registration first.", "err");
      return;
    }
    btn.disabled = true;
    setLookupStatus("Looking up " + vrm.toUpperCase().replace(/\s+/g, "") + "\u2026");
    var keys = lookupKeys();
    var payload = { registrationNumber: vrm };
    if (keys.apiKey) payload.apiKey = keys.apiKey;
    if (keys.motApiKey) payload.motApiKey = keys.motApiKey;
    try {
      var res = await fetch("/api/vehicle-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (!data.ok || !data.vehicle) {
        var extra = "";
        if (data.yearFromPlate) {
          state.yearOfManufacture = data.yearFromPlate;
          fillForm();
          saveState();
          extra = " Year " + data.yearFromPlate + " taken from the UK plate age identifier.";
        }
        setLookupStatus((data.message || "Couldn't look up that plate.") + extra, "err");
        return;
      }
      applyLookup(data.vehicle);
    } catch (err) {
      setLookupStatus("Lookup needs the site running over http (npm start).", "err");
    } finally {
      btn.disabled = false;
    }
  }

  function applyLookup(vehicle) {
    var plateLookup = vehicle.source === "dvla";
    state.vrm = vehicle.registrationNumber || state.vrm;
    state.make = titleCase(vehicle.make || "");
    var exactModel = vehicle.model && !vehicle.modelInferred ? vehicle.model : "";
    state.model = plateLookup ? exactModel : (vehicle.model || "");
    ensureModelOption(state.model);
    state.yearOfManufacture = vehicle.yearOfManufacture || "";
    state.colour = titleCase(vehicle.colour || "");
    state.fuelType = vehicle.fuelType || "";
    var identity = [state.make, state.model, state.yearOfManufacture].filter(Boolean).join(" ");
    var notes = [];
    if (identity) notes.push("Looked up " + identity + ".");
    if (vehicle.applyAsMam && vehicle.revenueWeight) {
      state.mam = vehicle.revenueWeight;
      notes.push("Revenue weight " + vehicle.revenueWeight + " kg applied as MAM.");
    } else if (vehicle.revenueWeight) {
      notes.push("DVLA revenue weight is " + vehicle.revenueWeight + " kg \u2014 check the VIN plate before using it as MAM.");
    } else if (!plateLookup && vehicle.typicalMam) {
      state.mam = vehicle.typicalMam;
      notes.push("Typical MAM " + vehicle.typicalMam + " kg applied.");
    } else {
      notes.push("No plated weight on the DVLA record. Enter MAM from the VIN plate.");
    }
    if (plateLookup) {
      state.miro = "";
      notes.push("DVLA does not supply Mass in Service \u2014 an empty weighbridge ticket is best; otherwise use the V5 figure.");
    } else if (vehicle.miroAvailable && vehicle.typicalMiro) {
      state.miro = vehicle.typicalMiro;
      notes.push("Typical Mass in Service " + vehicle.typicalMiro + " kg applied" + (vehicle.typicalLabel ? " for " + vehicle.typicalLabel : "") + ". Replace with a weighbridge ticket or the V5 figure if you have it.");
    } else {
      notes.push("DVLA does not supply Mass in Service \u2014 an empty weighbridge ticket is best; otherwise use the V5 figure.");
    }
    if (plateLookup && !state.model) {
      notes.push("Model was not on the DVLA record \u2014 pick the van platform if you know it.");
    }
    if (vehicle.source === "demo") notes.push("Demo record \u2014 not a live DVLA result.");
    fillForm();
    saveState();
    calculate();
    setLookupStatus(notes.join(" "), "ok");
  }

  async function lookupMakeModelYear() {
    var btn = document.getElementById("lookupSpecBtn");
    var make = (state.make || document.getElementById("make").value || "").trim();
    var model = (state.model || document.getElementById("model").value || "").trim();
    var year = state.yearOfManufacture || document.getElementById("yearOfManufacture").value;
    if (!make || !model) {
      setLookupStatus("Enter make and model first, or look up a registration.", "err");
      return;
    }
    btn.disabled = true;
    setLookupStatus("Looking up typical weights for " + make + " " + model + (year ? " (" + year + ")" : "") + "\u2026");
    try {
      var res = await fetch("/api/vehicle-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make: make, model: model, year: year })
      });
      var data = await res.json();
      if (!data.ok || !data.vehicle) {
        setLookupStatus(data.message || "No typical weights for that van.", "err");
        return;
      }
      applyLookup(data.vehicle);
    } catch (err) {
      setLookupStatus("Typical-weight lookup needs the site running over http (npm start).", "err");
    } finally {
      btn.disabled = false;
    }
  }

  function applyPreset(partial, presetId) {
    Object.assign(state, clone(DEFAULTS), partial, { units: state.units });
    waterBackup = null;
    fillForm();
    saveState();
    calculate();
    setActivePreset(presetId);
    document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setActivePreset(presetId) {
    document.querySelectorAll(".preset-btn").forEach(function (btn) {
      var on = btn.id === presetId;
      btn.classList.toggle("btn-primary", on);
      btn.classList.toggle("btn-ghost", btn.id === "preset-reset" && !on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function fieldFromEvent(event) {
    var t = event.target;
    if (!t || !t.closest) return null;
    return t.closest("[data-key]");
  }

  document.querySelectorAll("[data-key]").forEach(function (el) {
    el.addEventListener("input", function () { readForm(el); });
    el.addEventListener("change", function () { readForm(el); });
    el.addEventListener("blur", function () { readForm(el); });
  });

  var inputsRoot = document.getElementById("calculator-inputs") || document;
  inputsRoot.addEventListener("input", function (event) {
    var el = fieldFromEvent(event);
    if (el) readForm(el);
  });
  inputsRoot.addEventListener("change", function (event) {
    var el = fieldFromEvent(event);
    if (el) readForm(el);
  });
  inputsRoot.addEventListener("focusout", function (event) {
    var el = fieldFromEvent(event);
    if (el) readForm(el);
  });

  document.querySelectorAll(".stepper [data-step]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = btn.closest(".stepper").querySelector("input");
      if (!input) return;
      stepValue(input, Number(btn.getAttribute("data-step")));
    });
  });

  document.querySelectorAll("input[name='units']").forEach(function (el) {
    el.addEventListener("change", function () {
      state.units = el.value;
      saveState();
      fillForm();
      calculate();
    });
  });

  document.querySelectorAll("input[name='axleMode']").forEach(function (el) {
    el.addEventListener("change", function () {
      state.axleMode = axleCheck.normalizeMode(el.value);
      saveState();
      syncAxleModeUi();
      calculate();
    });
  });

  var customKitRoot = document.getElementById("customKit");
  if (customKitRoot) {
    customKitRoot.addEventListener("input", function (event) {
      if (!event.target.closest(".custom-kit-row")) return;
      readCustomKitFromDom();
      saveState();
      calculate();
    });
    customKitRoot.addEventListener("click", function (event) {
      var stepBtn = event.target.closest(".kit-step");
      if (stepBtn) {
        var input = stepBtn.closest(".stepper").querySelector("input");
        if (input) stepValue(input, Number(stepBtn.getAttribute("data-step")));
        return;
      }
      var removeBtn = event.target.closest(".kit-remove");
      if (removeBtn) {
        var row = removeBtn.closest(".custom-kit-row");
        if (!row) return;
        var id = row.getAttribute("data-kit-id");
        state.customItems = customKit.normalizeItems(state.customItems).filter(function (item) {
          return item.id !== id;
        });
        fillForm();
        saveState();
        calculate();
      }
    });
  }
  var addCustomBtn = document.getElementById("addCustomKit");
  if (addCustomBtn) {
    addCustomBtn.addEventListener("click", function () {
      readCustomKitFromDom();
      state.customItems = customKit.normalizeItems(state.customItems);
      state.customItems.push(newCustomItem());
      fillForm();
      saveState();
      calculate();
      var rows = document.querySelectorAll(".custom-kit-row .kit-name");
      var last = rows[rows.length - 1];
      if (last) last.focus();
    });
  }

  document.getElementById("preset-typical").addEventListener("click", function () { applyPreset(TYPICAL, "preset-typical"); });
  document.getElementById("preset-light").addEventListener("click", function () { applyPreset(LIGHT, "preset-light"); });
  document.getElementById("preset-family").addEventListener("click", function () { applyPreset(FAMILY, "preset-family"); });
  document.getElementById("preset-reset").addEventListener("click", function () { applyPreset(clone(DEFAULTS), "preset-reset"); });

  document.getElementById("emptyWater").addEventListener("click", function () {
    if (waterBackup) {
      state.freshFill = waterBackup.freshFill;
      state.greyFill = waterBackup.greyFill;
      state.blackFill = waterBackup.blackFill;
      waterBackup = null;
    } else {
      waterBackup = { freshFill: state.freshFill, greyFill: state.greyFill, blackFill: state.blackFill };
      state.freshFill = 0;
      state.greyFill = 0;
      state.blackFill = 0;
    }
    fillForm();
    saveState();
    calculate();
  });

  function preparePrint() {
    var stamp = document.getElementById("printStamp");
    if (stamp) {
      stamp.textContent = "Printed " + new Date().toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    document.querySelectorAll("details.block").forEach(function (d) {
      d.dataset.wasOpen = d.open ? "1" : "0";
      d.open = true;
    });
  }
  function restoreAfterPrint() {
    document.querySelectorAll("details.block").forEach(function (d) {
      if (d.dataset.wasOpen === "0") d.removeAttribute("open");
      delete d.dataset.wasOpen;
    });
  }
  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", restoreAfterPrint);
  document.getElementById("printResults").addEventListener("click", function () {
    preparePrint();
    window.print();
  });

  document.getElementById("lookupBtn").addEventListener("click", function () { lookupRegistration(); });
  document.getElementById("lookupSpecBtn").addEventListener("click", function () { lookupMakeModelYear(); });
  document.getElementById("vrm").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      lookupRegistration();
    }
  });

  (function initLookupSetup() {
    var dvlaEl = document.getElementById("dvlaApiKey");
    var motEl = document.getElementById("motApiKey");
    if (dvlaEl) dvlaEl.value = readStored(DVLA_KEY_STORAGE);
    if (motEl) motEl.value = readStored(MOT_KEY_STORAGE);
    showSetupIfRequested();
    if (dvlaEl) {
      dvlaEl.addEventListener("change", function () {
        writeStored(DVLA_KEY_STORAGE, dvlaEl.value.trim());
        applyDefaultLookupHint();
      });
    }
    if (motEl) {
      motEl.addEventListener("change", function () {
        writeStored(MOT_KEY_STORAGE, motEl.value.trim());
      });
    }
  })();

  /* Collapse extra sections on small screens so the first inputs stay reachable. */
  if (window.matchMedia("(max-width: 979px)").matches) {
    document.querySelectorAll("details.block").forEach(function (d, i) {
      if (i > 2) d.removeAttribute("open");
    });
  }

  fillForm();
  calculate();
  probeLookupStatus();

  /* Hidden check for converter-brand DVLA shape (no API key required). */
  if (location.hash === "#qa-hymer-dvla") {
    applyLookup({
      source: "dvla",
      registrationNumber: "Y3WAR",
      make: "HYMER",
      model: "",
      modelInferred: false,
      yearOfManufacture: 2024,
      colour: "Grey",
      fuelType: "DIESEL",
      revenueWeight: 4430,
      applyAsMam: true,
      miroAvailable: false
    });
  }

  function openHashTarget() {
    var id = (location.hash || "").replace(/^#/, "");
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    var nested = el.closest("details");
    if (nested) nested.open = true;
  }
  window.addEventListener("hashchange", function () {
    showSetupIfRequested();
    openHashTarget();
  });
  openHashTarget();
})();
