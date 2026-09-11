/**
 * After a registration lookup (or once the van path is started), show what is
 * still blank. Ticks follow the fields only — we never invent figures.
 */
"use strict";

(function (root) {
  var LABELS = {
    base: "Mass in Service or empty weighbridge total",
    limits: "VIN plate axle limits (front/rear)",
    loaded: "Loaded axle weights if you have a ticket (for the roadside axle check)"
  };

  function hasPositive(value) {
    var n = Number(value);
    return Number.isFinite(n) && n > 0;
  }

  function hasText(value) {
    return String(value == null ? "" : value).trim() !== "";
  }

  function isVanPath(input) {
    var src = input || {};
    if (src.lookupSucceeded || src.presetStarted) return true;
    return hasText(src.vrm) || hasText(src.make) || hasText(src.model);
  }

  function items(input) {
    var src = input || {};
    var loadedMode = src.axleMode !== "empty";
    return [
      {
        id: "base",
        label: LABELS.base,
        done: hasPositive(src.miro) || hasPositive(src.actualEmpty)
      },
      {
        id: "limits",
        label: LABELS.limits,
        done: hasPositive(src.frontLimit) && hasPositive(src.rearLimit)
      },
      {
        id: "loaded",
        label: LABELS.loaded,
        done: loadedMode && hasPositive(src.frontWeight) && hasPositive(src.rearWeight)
      }
    ];
  }

  function openLabels(list) {
    return (list || []).filter(function (item) { return !item.done; }).map(function (item) {
      return item.label;
    });
  }

  function title(list) {
    return openLabels(list).length ? "Still need" : "These figures are in";
  }

  function lead() {
    return "A registration lookup is not the finished check. We do not invent these figures.";
  }

  function dockLine(list) {
    var open = openLabels(list);
    if (!open.length) return "";
    if (open.length === 1) return "Still need: " + open[0];
    if (open.length === 2) return "Still need: " + open[0] + " · " + open[1];
    return "Still need: Mass in Service or empty ticket · VIN plate axle limits · loaded axle weights";
  }

  var api = {
    LABELS: LABELS,
    hasPositive: hasPositive,
    isVanPath: isVanPath,
    items: items,
    openLabels: openLabels,
    title: title,
    lead: lead,
    dockLine: dockLine
  };
  root.StillNeed = api;
  try {
    if (typeof module !== "undefined" && module && module.exports) {
      module.exports = api;
    }
  } catch (err) { /* browser stub module */ }
})(typeof globalThis !== "undefined" ? globalThis : this);
