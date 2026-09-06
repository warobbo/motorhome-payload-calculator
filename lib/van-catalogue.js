/**
 * Typical 3.5t UK van / motorhome base weights by make, model and year.
 * MIRO figures are starting points for conversions, not handbook values.
 */
"use strict";

const CATALOGUE = [
  { make: "Fiat", model: "Ducato", yearFrom: 2006, yearTo: 2014, mam: 3500, miro: 3020, label: "Fiat Ducato X250 3.5t" },
  { make: "Fiat", model: "Ducato", yearFrom: 2014, yearTo: 2026, mam: 3500, miro: 3080, label: "Fiat Ducato X290 3.5t" },
  { make: "Peugeot", model: "Boxer", yearFrom: 2006, yearTo: 2014, mam: 3500, miro: 3020, label: "Peugeot Boxer 3.5t" },
  { make: "Peugeot", model: "Boxer", yearFrom: 2014, yearTo: 2026, mam: 3500, miro: 3080, label: "Peugeot Boxer 3.5t" },
  { make: "Citroen", model: "Relay", yearFrom: 2006, yearTo: 2014, mam: 3500, miro: 3020, label: "Citroën Relay 3.5t" },
  { make: "Citroen", model: "Relay", yearFrom: 2014, yearTo: 2026, mam: 3500, miro: 3080, label: "Citroën Relay 3.5t" },
  { make: "Mercedes-Benz", model: "Sprinter", yearFrom: 2006, yearTo: 2018, mam: 3500, miro: 3100, label: "Mercedes-Benz Sprinter 3.5t" },
  { make: "Mercedes-Benz", model: "Sprinter", yearFrom: 2018, yearTo: 2026, mam: 3500, miro: 3180, label: "Mercedes-Benz Sprinter 907 3.5t" },
  { make: "Ford", model: "Transit", yearFrom: 2014, yearTo: 2026, mam: 3500, miro: 3000, label: "Ford Transit 3.5t" },
  { make: "Volkswagen", model: "Crafter", yearFrom: 2017, yearTo: 2026, mam: 3500, miro: 3120, label: "Volkswagen Crafter 3.5t" },
  { make: "Volkswagen", model: "Transporter", yearFrom: 2015, yearTo: 2026, mam: 2800, miro: 2100, label: "Volkswagen T6/T6.1 camper" },
  { make: "Renault", model: "Master", yearFrom: 2010, yearTo: 2026, mam: 3500, miro: 3050, label: "Renault Master 3.5t" },
  { make: "Vauxhall", model: "Movano", yearFrom: 2010, yearTo: 2026, mam: 3500, miro: 3050, label: "Vauxhall Movano 3.5t" },
  { make: "Iveco", model: "Daily", yearFrom: 2014, yearTo: 2026, mam: 3500, miro: 3150, label: "Iveco Daily 3.5t" },
];

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[ëé]/g, "e")
    .replace(/[^a-z0-9]+/g, "");
}

function normMake(value) {
  const key = norm(value);
  if (key === "mercedes" || key === "mercedesbenz") return "mercedesbenz";
  if (key === "vw" || key === "volkswagen") return "volkswagen";
  return key;
}

function matchCatalogue(make, model, year) {
  const makeKey = normMake(make);
  const modelKey = norm(model);
  const yr = parseInt(year, 10);
  if (!makeKey || !modelKey) return null;
  const rows = CATALOGUE.filter(function (row) {
    return normMake(row.make) === makeKey && norm(row.model) === modelKey;
  });
  if (!rows.length) return null;
  if (!yr) return rows[rows.length - 1];
  return rows.find(function (row) {
    return yr >= row.yearFrom && yr <= row.yearTo;
  }) || rows[rows.length - 1];
}

function makes() {
  return Array.from(new Set(CATALOGUE.map(function (row) { return row.make; })));
}

function modelsFor(make) {
  return Array.from(new Set(
    CATALOGUE.filter(function (row) { return norm(row.make) === norm(make); })
      .map(function (row) { return row.model; })
  ));
}

module.exports = {
  CATALOGUE,
  matchCatalogue,
  makes,
  modelsFor,
};
