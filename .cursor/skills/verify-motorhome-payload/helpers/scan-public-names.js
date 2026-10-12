#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..", "..", "..");
const names = ["wayne", "robinson", "warobbo", "warobbo24", "wayne.robinson"];

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i += 1) {
    const ent = entries[i];
    if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
}

const files = [];
walk(root, files);
const hits = [];
for (let i = 0; i < files.length; i += 1) {
  const text = fs.readFileSync(files[i]).toString("utf8").toLowerCase();
  for (let n = 0; n < names.length; n += 1) {
    if (text.includes(names[n])) {
      hits.push(path.relative(root, files[i]) + " " + names[n]);
    }
  }
}

if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log("public name scan: 0");
