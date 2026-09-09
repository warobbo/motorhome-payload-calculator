/**
 * UK vehicle registration lookup.
 * Uses the official DVLA Vehicle Enquiry Service when an API key is available.
 * Demo plates work without a key so the calculator is usable immediately.
 *
 * DVLA returns make + revenueWeight (kg). It does not return model or MIRO.
 * Never guess Ducato/Boxer/Relay/Sprinter into the model field — especially
 * for converter brands (Hymer and similar coachbuilts).
 */
"use strict";

const DVLA_URL = "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";
const MOT_URL = "https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests";
const { matchCatalogue, canonicalModel, isCataloguePlatform } = require("./van-catalogue");

/** OEM van makers whose MOT "model" is usually the real van model. */
const OEM_VAN_MAKES = {
  FIAT: "Ducato",
  PEUGEOT: "Boxer",
  CITROEN: "Relay",
  "CITROËN": "Relay",
  "MERCEDES-BENZ": "Sprinter",
  MERCEDES: "Sprinter",
  FORD: "Transit",
  VOLKSWAGEN: "Crafter",
  VW: "Crafter",
  RENAULT: "Master",
  VAUXHALL: "Movano",
  OPEL: "Movano",
  IVECO: "Daily",
  MAN: "TGE",
};

const DEMO = {
  DEMO3500: {
    registrationNumber: "DEMO3500",
    make: "FIAT",
    model: "Ducato",
    modelInferred: false,
    yearOfManufacture: 2018,
    colour: "White",
    fuelType: "DIESEL",
    typeApproval: "N1",
    revenueWeight: 3500,
    taxStatus: "Taxed",
    motStatus: "Valid",
  },
  BOXER35: {
    registrationNumber: "BOXER35",
    make: "PEUGEOT",
    model: "Boxer",
    modelInferred: false,
    yearOfManufacture: 2019,
    colour: "Silver",
    fuelType: "DIESEL",
    typeApproval: "N1",
    revenueWeight: 3500,
    taxStatus: "Taxed",
    motStatus: "Valid",
  },
  RELAY35: {
    registrationNumber: "RELAY35",
    make: "CITROEN",
    model: "Relay",
    modelInferred: false,
    yearOfManufacture: 2017,
    colour: "White",
    fuelType: "DIESEL",
    typeApproval: "N1",
    revenueWeight: 3500,
    taxStatus: "Taxed",
    motStatus: "Valid",
  },
  SPRINT35: {
    registrationNumber: "SPRINT35",
    make: "MERCEDES-BENZ",
    model: "Sprinter",
    modelInferred: false,
    yearOfManufacture: 2020,
    colour: "Grey",
    fuelType: "DIESEL",
    typeApproval: "N1",
    revenueWeight: 3500,
    taxStatus: "Taxed",
    motStatus: "Valid",
  },
};

function normaliseVrm(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function titleCase(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/(^|[\s/-])([a-z])/g, function (_, a, b) {
      return a + b.toUpperCase();
    });
}

function isOemVanMake(make) {
  return !!OEM_VAN_MAKES[String(make || "").toUpperCase()];
}

/**
 * Only keep a model that DVLA or MOT actually supplied.
 * Chassis platforms (Ducato, Boxer, …) are not the model for converter brands.
 */
function exactModel(make, model) {
  const trimmed = String(model || "").trim();
  if (!trimmed) return "";
  if (!isOemVanMake(make) && isCataloguePlatform(trimmed)) return "";
  return canonicalModel(trimmed);
}

function applyMamFromRevenue(kg) {
  return typeof kg === "number" && kg >= 2800 && kg <= 7500;
}

/** Current-style UK plates encode the year: AB12 CDE → 12 = 2012, 62 = 2012. */
function yearFromUkPlate(vrm) {
  const match = String(vrm || "").toUpperCase().match(/^[A-Z]{2}(\d{2})[A-Z]{3}$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (n >= 51 && n <= 99) return 2000 + (n - 50);
  if (n >= 1 && n <= 50) return 2000 + n;
  return null;
}

function yearFromDvla(raw) {
  if (raw.yearOfManufacture) return Number(raw.yearOfManufacture);
  const month = raw.monthOfFirstRegistration || raw.monthOfFirstDvlaRegistration || "";
  const y = String(month).slice(0, 4);
  return /^\d{4}$/.test(y) ? Number(y) : null;
}

function withTypical(vehicle) {
  const hit = matchCatalogue(vehicle.make, vehicle.model, vehicle.yearOfManufacture);
  if (!hit) return vehicle;
  vehicle.typicalMiro = hit.miro;
  vehicle.typicalMam = hit.mam;
  vehicle.typicalLabel = hit.label;
  return vehicle;
}

function shapeVehicle(raw, source) {
  const make = raw.make || "";
  const knownFixture = source === "demo" && raw.model;
  const model = knownFixture
    ? canonicalModel(raw.model)
    : exactModel(make, raw.model);
  const revenueWeight = raw.revenueWeight == null || raw.revenueWeight === ""
    ? null
    : Number(raw.revenueWeight);
  const year = raw.yearOfManufacture
    || yearFromDvla(raw)
    || yearFromUkPlate(raw.registrationNumber)
    || null;

  const vehicle = withTypical({
    source: source,
    registrationNumber: raw.registrationNumber || "",
    make: make,
    model: model,
    modelInferred: false,
    yearOfManufacture: year,
    colour: raw.colour || "",
    fuelType: raw.fuelType || "",
    typeApproval: raw.typeApproval || "",
    revenueWeight: Number.isFinite(revenueWeight) ? revenueWeight : null,
    taxStatus: raw.taxStatus || "",
    motStatus: raw.motStatus || "",
    applyAsMam: applyMamFromRevenue(revenueWeight),
    miroAvailable: false,
  });

  if (source === "dvla") {
    vehicle.miroAvailable = false;
    delete vehicle.typicalMiro;
    delete vehicle.typicalMam;
    delete vehicle.typicalLabel;
  } else if (source === "demo" && vehicle.typicalMiro) {
    vehicle.miroAvailable = true;
  }

  return vehicle;
}

async function fetchDvla(vrm, apiKey) {
  const res = await fetch(DVLA_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ registrationNumber: vrm }),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function fetchMotModel(vrm, motKey) {
  if (!motKey) return "";
  try {
    const url = MOT_URL + "?registration=" + encodeURIComponent(vrm);
    const res = await fetch(url, {
      headers: { "x-api-key": motKey, Accept: "application/json" },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : data;
    return (first && first.model) || "";
  } catch (err) {
    return "";
  }
}

async function lookupVehicle({ vrm, apiKey, motApiKey }) {
  const registration = normaliseVrm(vrm);
  if (!registration) {
    return { ok: false, status: 400, error: "missing_vrm", message: "Enter a UK registration number." };
  }

  if (DEMO[registration]) {
    return { ok: true, status: 200, vehicle: shapeVehicle(DEMO[registration], "demo") };
  }

  const key = apiKey || process.env.DVLA_API_KEY || "";
  if (!key) {
    const plateYear = yearFromUkPlate(registration);
    return {
      ok: false,
      status: 401,
      error: "no_api_key",
      liveDvla: false,
      message: "Couldn't look up that plate live. Type make, model and year instead.",
      yearFromPlate: plateYear,
    };
  }

  const dvla = await fetchDvla(registration, key);
  if (dvla.status === 404) {
    return { ok: false, status: 404, error: "not_found", message: "DVLA has no record for that registration." };
  }
  if (dvla.status === 400) {
    return { ok: false, status: 400, error: "invalid_vrm", message: "That does not look like a valid UK registration." };
  }
  if (dvla.status === 401 || dvla.status === 403) {
    return { ok: false, status: 401, error: "bad_api_key", message: "The DVLA API key was rejected. Check it on the DVLA developer portal." };
  }
  if (dvla.status !== 200) {
    return {
      ok: false,
      status: 502,
      error: "dvla_error",
      message: "DVLA lookup failed (" + dvla.status + "). Try again in a moment.",
    };
  }

  const motKey = motApiKey || process.env.MOT_API_KEY || "";
  const motModel = await fetchMotModel(registration, motKey);
  if (motModel) dvla.data.model = motModel;

  return { ok: true, status: 200, vehicle: shapeVehicle(dvla.data, "dvla") };
}

/** Client apply rules: live DVLA never guesses model or MIRO. */
function fieldsFromLookup(vehicle) {
  const plateLookup = vehicle && vehicle.source === "dvla";
  const exact = vehicle && vehicle.model && !vehicle.modelInferred ? vehicle.model : "";
  return {
    plateLookup: !!plateLookup,
    model: plateLookup ? exact : ((vehicle && vehicle.model) || ""),
    clearMiro: !!plateLookup,
    applyTypicalMiro: !plateLookup && !!(vehicle && vehicle.miroAvailable && vehicle.typicalMiro),
  };
}

function lookupByMakeModelYear({ make, model, year }) {
  const hit = matchCatalogue(make, model, year);
  if (!hit) {
    return {
      ok: false,
      status: 404,
      error: "no_match",
      message: "No typical weights for that make, model and year. Try Fiat Ducato, Peugeot Boxer, Citroen Relay or Mercedes-Benz Sprinter.",
    };
  }
  const yr = parseInt(year, 10) || hit.yearFrom;
  return {
    ok: true,
    status: 200,
    vehicle: withTypical({
      source: "catalogue",
      registrationNumber: "",
      make: hit.make,
      model: hit.model,
      modelInferred: false,
      yearOfManufacture: yr,
      colour: "",
      fuelType: "DIESEL",
      typeApproval: "N1",
      revenueWeight: hit.mam,
      taxStatus: "",
      motStatus: "",
      applyAsMam: true,
      miroAvailable: true,
      typicalMiro: hit.miro,
      typicalMam: hit.mam,
      typicalLabel: hit.label,
    }),
  };
}

module.exports = {
  lookupVehicle,
  lookupByMakeModelYear,
  shapeVehicle,
  exactModel,
  fieldsFromLookup,
  yearFromUkPlate,
  normaliseVrm,
  titleCase,
  DEMO_PLATES: Object.keys(DEMO),
};
