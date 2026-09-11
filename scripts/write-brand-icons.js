"use strict";

/**
 * Rasterize brand SVG masters to favicon PNGs (32, 180, 512).
 * Uses @resvg/resvg-js when present; otherwise skip (committed PNGs stay).
 */

const fs = require("fs");
const path = require("path");

const SIZES = [32, 180, 512];
const MARKS = ["payload", "tyres"];

function loadResvg() {
  try {
    return require("@resvg/resvg-js").Resvg;
  } catch (err) {
    return null;
  }
}

function writeBrandIcons(root) {
  const Resvg = loadResvg();
  const brandDir = path.join(root, "brand");
  if (!Resvg) {
    console.log("Skipping brand PNG rasterize (install @resvg/resvg-js to regenerate).");
    return;
  }

  MARKS.forEach(function (mark) {
    const svg = fs.readFileSync(path.join(brandDir, mark + ".svg"));
    SIZES.forEach(function (size) {
      const png = new Resvg(svg, {
        fitTo: { mode: "width", value: size },
      }).render().asPng();
      const out = path.join(brandDir, mark + "-" + size + ".png");
      fs.writeFileSync(out, png);
      console.log("Wrote " + out);
    });
  });
}

if (require.main === module) {
  writeBrandIcons(path.join(__dirname, ".."));
}

module.exports = { writeBrandIcons };
