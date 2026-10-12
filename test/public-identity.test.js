"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

const TEXT_EXT = new Set([
  ".html", ".js", ".css", ".json", ".xml", ".txt", ".md", ".svg", ".yaml", ".yml", ".webmanifest"
]);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ALLOWED_EMAIL = /@(example\.com|example\.org|example\.net)$/i;

function walk(dir, rel, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i += 1) {
    const ent = entries[i];
    if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
    const nextRel = rel ? path.join(rel, ent.name) : ent.name;
    const nextAbs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(nextAbs, nextRel, out);
    else out.push({ abs: nextAbs, rel: nextRel.split(path.sep).join("/") });
  }
}

describe("public files do not publish a contact", function () {
  it("keeps personal addresses and Person schema out of files the server can return", function () {
    const files = [];
    walk(root, "", files);
    const emailHits = [];
    const personHits = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const text = fs.readFileSync(file.abs).toString("utf8");
      const ext = path.extname(file.rel).toLowerCase();
      if (ext === ".html" && /"@type"\s*:\s*"Person"/i.test(text)) personHits.push(file.rel);
      if (!TEXT_EXT.has(ext)) continue;
      const found = text.match(EMAIL_RE) || [];
      for (let e = 0; e < found.length; e += 1) {
        if (!ALLOWED_EMAIL.test(found[e])) emailHits.push(file.rel + " " + found[e]);
      }
    }

    assert.deepEqual(emailHits, []);
    assert.deepEqual(personHits, []);
  });
});
