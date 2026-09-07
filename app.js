/* =========================================================================
   Payload maths — all internal values are metric (kg / litres).
   The unit toggle only changes what is shown and what the user types.
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "mh-payload-calc-v1";
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
    miscKg: 20
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

  function fillForm() {
    syncing = true;
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
    syncSteppers();
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

  function compute(overrides) {
    var s = Object.assign({}, state, overrides || {});
    var mam = num(s.mam);
    var miro = num(s.miro);
    var base = usingActualEmpty() ? num(s.actualEmpty) : miro;

    var driver = 0;
    if (usingActualEmpty()) {
      driver = num(s.driverKg);
    } else if (!s.miroIncludesDriver) {
      driver = num(s.driverKg);
    }
    var people = driver + num(s.extraAdults) * num(s.adultKg) + num(s.children) * num(s.childKg) + num(s.pets) * num(s.petKg);

    var fresh = num(s.freshCap) * num(s.freshFill) / 100;
    var grey = num(s.greyCap) * num(s.greyFill) / 100;
    var black = num(s.blackCap) * num(s.blackFill) / 100;
    var fuelActual = num(s.fuelCap) * num(s.fuelFill) / 100 * num(s.fuelDensity);
    var fuelMiro = num(s.fuelCap) * 0.9 * num(s.fuelDensity);
    var fuel = 0;
    if (usingActualEmpty() || !s.miroIncludesFuel) fuel = fuelActual;
    else fuel = fuelActual - fuelMiro;

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
    var sign = kg < 0 ? "−" : "";
    return '<div class="bar-row"><header><span>' + label + '</span><span>' + sign + fmt(Math.abs(kg), 0) + '</span></header><div class="bar"><span style="width:' + pct + '%;background:' + (kg < 0 ? "var(--amber)" : "var(--pine)") + '"></span></div></div>';
  }

  function calculate() {
    var r = compute();
    var cls = statusClass(r.remaining);
    var box = document.getElementById("remainingBox");
    box.className = "remaining status-" + cls;
    document.getElementById("remainingLabel").textContent = "Remaining payload";
    document.getElementById("remainingValue").textContent = (r.remaining < 0 ? "−" : "") + fmt(Math.abs(r.remaining), 0);
    document.getElementById("remainingSub").textContent = cls === "ok"
      ? "Comfortable margin for a 3.5t van"
      : cls === "tight"
        ? "Tight — weigh before a long trip"
        : cls === "critical"
          ? "Very little margin left"
          : "Illegal to drive at this estimate";

    document.getElementById("totalWeight").textContent = fmt(r.total, 0);
    document.getElementById("mamOut").textContent = fmt(r.mam, 0);
    document.getElementById("platedPayload").textContent = fmt(r.plated, 0);
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
      barRow(usingActualEmpty() || !state.miroIncludesFuel ? "Fuel" : "Fuel vs MIRO 90%", r.fuel, maxCat) +
      barRow("Gas bottles", r.gas, maxCat) +
      barRow("Electrical & solar", r.electrical, maxCat) +
      barRow("Gear & other", r.gear, maxCat);

    var empty = compute({ freshFill: 0, greyFill: 0, blackFill: 0 });
    var saved = r.water;
    document.getElementById("waterWhatIf").textContent = saved > 0.5
      ? "Emptying fresh, grey and black water would free " + fmt(saved, 0) + " and leave " + fmt(empty.remaining, 0) + " remaining."
      : "Water tanks are already empty in this estimate.";

    var axle = "";
    if (num(state.frontAxle) || num(state.rearAxle)) {
      axle = "Axle limits entered: front " + (num(state.frontAxle) ? fmt(num(state.frontAxle), 0) : "—") +
        ", rear " + (num(state.rearAxle) ? fmt(num(state.rearAxle), 0) : "—") +
        ". This calculator cannot split axle loads — confirm both on a weighbridge.";
    }
    document.getElementById("axleNote").textContent = axle;

    var dock = document.getElementById("dockValue");
    dock.textContent = (r.remaining < 0 ? "−" : "") + fmt(Math.abs(r.remaining), 0);
    dock.className = "dock-" + cls;
    document.getElementById("dockHint").textContent = "Remaining payload";

    document.getElementById("emptyWater").textContent = waterBackup
      ? "Restore water levels"
      : "What if I empty the water?";

    var driverNote = usingActualEmpty()
      ? "Weighed empty is in use, so the driver is added separately."
      : (state.miroIncludesDriver ? "Driver is already in MIRO — additional adults are passengers only." : "Driver is being added on top of MIRO.");
    document.getElementById("peopleNote").textContent = driverNote;
    document.getElementById("driverHint").textContent = usingActualEmpty()
      ? "Added because you entered a weighed empty van."
      : "Used only if MIRO does not include the driver, or you enter a weighed empty weight.";
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
    meta.textContent = bits.join(" · ");
    card.classList.add("show");
    summary.hidden = !name;
    summary.textContent = name
      ? (name + (state.yearOfManufacture ? " " + state.yearOfManufacture : "") + (state.vrm ? " · " + state.vrm : ""))
      : "";
  }

  function setLookupStatus(message, kind) {
    var el = document.getElementById("lookupStatus");
    el.textContent = message;
    el.className = "lookup-status" + (kind ? " " + kind : "");
  }

  async function lookupRegistration() {
    var btn = document.getElementById("lookupBtn");
    var vrm = (state.vrm || document.getElementById("vrm").value || "").trim();
    if (!vrm) {
      setLookupStatus("Enter a UK registration first.", "err");
      return;
    }
    btn.disabled = true;
    setLookupStatus("Looking up " + vrm.toUpperCase().replace(/\s+/g, "") + "…");
    try {
      var res = await fetch("/api/vehicle-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: vrm })
      });
      var data = await res.json();
      if (!data.ok || !data.vehicle) {
        var extra = data.demoPlates && data.demoPlates.length
          ? " Demo plates: " + data.demoPlates.join(", ") + "."
          : "";
        if (data.yearFromPlate) {
          state.yearOfManufacture = data.yearFromPlate;
          fillForm();
          saveState();
          extra += " Year " + data.yearFromPlate + " taken from the UK plate age identifier.";
        }
        setLookupStatus((data.message || "Lookup failed.") + extra, "err");
        return;
      }
      applyLookup(data.vehicle);
    } catch (err) {
      setLookupStatus("Lookup needs the site running over http (npm start). Demo plates still work on the server.", "err");
    } finally {
      btn.disabled = false;
    }
  }

  function applyLookup(vehicle) {
    state.vrm = vehicle.registrationNumber || state.vrm;
    state.make = titleCase(vehicle.make || "");
    state.model = vehicle.model || "";
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
      notes.push("DVLA revenue weight is " + vehicle.revenueWeight + " kg — check the VIN plate before using it as MAM.");
    } else if (vehicle.typicalMam) {
      state.mam = vehicle.typicalMam;
      notes.push("Typical MAM " + vehicle.typicalMam + " kg applied.");
    } else {
      notes.push("No plated weight on the DVLA record. Enter MAM from the VIN plate.");
    }
    if (vehicle.miroAvailable && vehicle.typicalMiro) {
      state.miro = vehicle.typicalMiro;
      notes.push("Typical MIRO " + vehicle.typicalMiro + " kg applied" + (vehicle.typicalLabel ? " for " + vehicle.typicalLabel : "") + ". Replace with the handbook figure if you have it.");
    } else {
      notes.push("DVLA does not supply MIRO — keep the handbook or weighbridge figure.");
    }
    if (vehicle.modelInferred) notes.push("Model is inferred from make for this van platform; edit it if the conversion badge is different.");
    if (vehicle.source === "demo") notes.push("Demo record — not a live DVLA result.");
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
    setLookupStatus("Looking up typical weights for " + make + " " + model + (year ? " (" + year + ")" : "") + "…");
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

  document.querySelectorAll("[data-key]").forEach(function (el) {
    el.addEventListener("input", function () { readForm(el); });
    el.addEventListener("change", function () { readForm(el); });
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

  /* Collapse extra sections on small screens so the first inputs stay reachable. */
  if (window.matchMedia("(max-width: 979px)").matches) {
    document.querySelectorAll("details.block").forEach(function (d, i) {
      if (i > 2) d.removeAttribute("open");
    });
  }

  fillForm();
  calculate();

  function openHashTarget() {
    var id = (location.hash || "").replace(/^#/, "");
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    var nested = el.closest("details");
    if (nested) nested.open = true;
  }
  window.addEventListener("hashchange", openHashTarget);
  openHashTarget();
})();
