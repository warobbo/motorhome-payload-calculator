"use strict";

const fs = require("fs");
const path = require("path");

function writeOgImage(root) {
  const pngPath = path.join(root, "og-image.png");
  const b64Path = path.join(root, "og-image.b64");
  try {
    if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 10000) return pngPath;
  } catch (err) {
    /* rewrite from sidecar */
  }
  const b64 = fs.readFileSync(b64Path, "utf8").replace(/\s+/g, "");
  fs.writeFileSync(pngPath, Buffer.from(b64, "base64"));
  return pngPath;
}

if (require.main === module) {
  const written = writeOgImage(path.join(__dirname, ".."));
  console.log("Wrote " + written);
}

module.exports = { writeOgImage };
