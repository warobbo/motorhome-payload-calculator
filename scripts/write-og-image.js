"use strict";

/**
 * Build or restore og-image.png for social previews.
 *
 * Order: keep a valid PNG, else decode og-image.b64, else generate a
 * branded 1200x630 PNG. Missing files never fail npm install / Render builds.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const PINE = [30, 79, 67];
const PINE_DEEP = [22, 58, 50];
const CREAM = [239, 230, 214];
const PAPER = [255, 250, 242];
const INK = [26, 22, 18];
const MUTED = [90, 82, 72];
const COPPER = [196, 98, 45];
const WHEEL = [42, 36, 30];

// 5x7 glyphs, one byte per row, low 5 bits used.
const FONT = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0, 4],
  "/": [1, 2, 2, 4, 8, 8, 16],
  "&": [10, 21, 10, 4, 10, 17, 14],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [14, 17, 1, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [14, 17, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 17, 14],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 14],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [1, 1, 1, 1, 17, 17, 14],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [14, 17, 16, 14, 1, 17, 14],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (~c) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const dest = y * (width * 3 + 1);
    raw[dest] = 0;
    rgb.copy(raw, dest + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function isUsablePng(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 32) return false;
    const fd = fs.openSync(filePath, "r");
    const head = Buffer.alloc(8);
    fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    return head.equals(PNG_SIG);
  } catch (err) {
    return false;
  }
}

function fillRect(px, width, height, x, y, w, h, rgb) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(height, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * width + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      i += 3;
    }
  }
}

function fillCircle(px, width, height, cx, cy, r, rgb) {
  const r2 = r * r;
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(height - 1, Math.ceil(cy + r));
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(width - 1, Math.ceil(cx + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) {
        const i = (y * width + x) * 3;
        px[i] = rgb[0];
        px[i + 1] = rgb[1];
        px[i + 2] = rgb[2];
      }
    }
  }
}

function drawGlyph(px, width, height, ch, x, y, scale, rgb) {
  const rows = FONT[ch] || FONT[" "];
  for (let row = 0; row < 7; row++) {
    const bits = rows[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (16 >> col)) {
        fillRect(px, width, height, x + col * scale, y + row * scale, scale, scale, rgb);
      }
    }
  }
}

function drawText(px, width, height, text, x, y, scale, rgb) {
  const step = 6 * scale;
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    drawGlyph(px, width, height, text[i].toUpperCase(), cx, y, scale, rgb);
    cx += step;
  }
  return cx;
}

function drawVan(px, width, height, originX, originY, scale) {
  const s = scale;
  const x = originX;
  const y = originY;
  fillRect(px, width, height, x + 8 * s, y + 22 * s, 92 * s, 28 * s, PINE);
  fillRect(px, width, height, x + 18 * s, y + 8 * s, 48 * s, 16 * s, PINE);
  fillRect(px, width, height, x + 22 * s, y + 11 * s, 18 * s, 11 * s, [196, 220, 212]);
  fillRect(px, width, height, x + 44 * s, y + 11 * s, 18 * s, 11 * s, [196, 220, 212]);
  fillRect(px, width, height, x + 70 * s, y + 26 * s, 22 * s, 14 * s, PINE_DEEP);
  fillRect(px, width, height, x + 76 * s, y + 30 * s, 12 * s, 8 * s, [196, 220, 212]);
  fillRect(px, width, height, x + 8 * s, y + 48 * s, 92 * s, 4 * s, COPPER);
  fillCircle(px, width, height, x + 28 * s, y + 56 * s, 8 * s, WHEEL);
  fillCircle(px, width, height, x + 28 * s, y + 56 * s, 3 * s, CREAM);
  fillCircle(px, width, height, x + 80 * s, y + 56 * s, 8 * s, WHEEL);
  fillCircle(px, width, height, x + 80 * s, y + 56 * s, 3 * s, CREAM);
}

function generateOgPng() {
  const width = OG_WIDTH;
  const height = OG_HEIGHT;
  const px = Buffer.alloc(width * height * 3);
  fillRect(px, width, height, 0, 0, width, height, CREAM);
  fillRect(px, width, height, 0, 0, width, 88, PINE);
  fillRect(px, width, height, 0, 88, width, 8, COPPER);
  fillRect(px, width, height, 64, 140, 1072, 390, PAPER);
  fillRect(px, width, height, 64, 140, 16, 390, PINE);
  drawVan(px, width, height, 110, 230, 4);
  drawText(px, width, height, "MOTORHOME PAYLOAD", 560, 200, 7, PINE);
  drawText(px, width, height, "CALCULATOR", 560, 268, 7, INK);
  drawText(px, width, height, "FREE UK 3.5T WEIGHT CHECKER", 560, 360, 4, MUTED);
  drawText(px, width, height, "STAY LEGAL UNDER YOUR MAM", 560, 420, 3, COPPER);
  fillRect(px, width, height, 0, height - 28, width, 28, PINE_DEEP);
  return encodePng(width, height, px);
}

function decodeSidecar(b64Path) {
  const b64 = fs.readFileSync(b64Path, "utf8").replace(/\s+/g, "");
  if (!b64) {
    throw new Error("og-image.b64 is empty");
  }
  const png = Buffer.from(b64, "base64");
  if (png.length < 32 || !png.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("og-image.b64 is not a PNG");
  }
  return png;
}

function writeOgImage(root) {
  const pngPath = path.join(root, "og-image.png");
  const b64Path = path.join(root, "og-image.b64");

  try {
    if (isUsablePng(pngPath)) {
      console.log("Keeping existing og-image.png");
      return pngPath;
    }

    if (fs.existsSync(b64Path)) {
      fs.writeFileSync(pngPath, decodeSidecar(b64Path));
      console.log("Wrote " + pngPath + " from og-image.b64");
      return pngPath;
    }

    fs.writeFileSync(pngPath, generateOgPng());
    console.log("Wrote generated " + pngPath);
    return pngPath;
  } catch (err) {
    console.log("Skipping og-image.png: " + err.message);
    return null;
  }
}

if (require.main === module) {
  writeOgImage(path.join(__dirname, ".."));
}

module.exports = { writeOgImage };
