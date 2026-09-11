"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const tyres = fs.readFileSync(path.join(root, "tyres.html"), "utf8");
const PINE = "#1e4f43";

function pngSize(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf[0], 0x89);
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("shared logo family", function () {
  it("keeps SVG masters on the site pine field with a white glyph", function () {
    ["payload", "tyres"].forEach(function (mark) {
      const svg = fs.readFileSync(path.join(root, "brand", mark + ".svg"), "utf8");
      assert.match(svg, new RegExp('rx="8" fill="' + PINE + '"'));
      assert.match(svg, /fill="#fff"/);
      assert.match(svg, /<circle /);
    });
  });

  it("ships 32, 180 and 512 PNG favicons for each mark", function () {
    [32, 180, 512].forEach(function (size) {
      ["payload", "tyres"].forEach(function (mark) {
        const dim = pngSize(path.join(root, "brand", mark + "-" + size + ".png"));
        assert.deepEqual(dim, { width: size, height: size });
      });
    });
  });

  it("puts the Payload mark on payload pages and the Tyres mark on tyres.html", function () {
    assert.match(index, /brand\/payload\.svg\?v=20260911logos1/);
    assert.match(index, /brand\/payload-32\.png\?v=20260911logos1/);
    assert.match(index, /apple-touch-icon[^>]+brand\/payload-180\.png\?v=20260911logos1/);
    assert.match(index, /brand\/payload-512\.png\?v=20260911logos1/);
    assert.match(index, /alt="Payload &#8212; motorhome tools"/);
    assert.doesNotMatch(index, /brand\/tyres/);

    assert.match(tyres, /brand\/tyres\.svg\?v=20260911logos1/);
    assert.match(tyres, /brand\/tyres-32\.png\?v=20260911logos1/);
    assert.match(tyres, /apple-touch-icon[^>]+brand\/tyres-180\.png\?v=20260911logos1/);
    assert.match(tyres, /brand\/tyres-512\.png\?v=20260911logos1/);
    assert.match(tyres, /alt="Tyres &#8212; motorhome tools"/);
    assert.doesNotMatch(tyres, /brand\/payload/);
  });
});
