/**
 * Extra kit rows the user adds by name, kg and quantity.
 * Never invent a weight — blank or junk kg/qty add nothing.
 */
"use strict";

(function (root) {
  function num(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeItems(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (item, i) {
      var qtyRaw = item && item.qty;
      var qty = qtyRaw === "" || qtyRaw == null ? 1 : num(qtyRaw);
      if (qty < 0) qty = 0;
      var kgRaw = item && item.kg;
      var kg = kgRaw === "" || kgRaw == null ? "" : num(kgRaw);
      if (kg !== "" && kg < 0) kg = 0;
      return {
        id: item && item.id ? String(item.id) : "kit-" + i,
        name: item && item.name != null ? String(item.name) : "",
        kg: kg,
        qty: qty
      };
    });
  }

  function itemKg(item) {
    if (!item) return 0;
    var kg = num(item.kg);
    var qty = num(item.qty);
    if (kg <= 0 || qty <= 0) return 0;
    return kg * qty;
  }

  function totalKg(list) {
    return normalizeItems(list).reduce(function (sum, item) {
      return sum + itemKg(item);
    }, 0);
  }

  var api = { normalizeItems: normalizeItems, itemKg: itemKg, totalKg: totalKg };
  root.CustomKit = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
