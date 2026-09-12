"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const tyres = fs.readFileSync(path.join(__dirname, "../tyres.html"), "utf8");

describe("mobile horizontal overflow guards", function () {
  it("clips sideways overflow on html/body without locking pinch-zoom", function () {
    assert.match(css, /html, body \{ overflow-x: clip; \}/);
    assert.match(css, /overscroll-behavior-x: none/);
    assert.match(index, /width=device-width, initial-scale=1/);
    assert.match(tyres, /width=device-width, initial-scale=1/);
    assert.doesNotMatch(index, /user-scalable\s*=\s*no/);
    assert.doesNotMatch(tyres, /user-scalable\s*=\s*no/);
    assert.doesNotMatch(css, /touch-action:\s*none/);
  });

  it("does not use a dock negative margin that is wider than the viewport", function () {
    assert.match(css, /body child, so full-bleed without negative margins/);
    assert.doesNotMatch(css, /\.dock \{[\s\S]*?margin:\s*0\s+-1rem/);
    assert.match(css, /\.dock \{[\s\S]*?max-width:\s*100%/);
  });

  it("hides skip and honeypot without parking them at a large negative left", function () {
    assert.doesNotMatch(css, /left:\s*-999/);
    assert.match(css, /\.skip \{[\s\S]*?clip-path:\s*inset\(50%\)/);
    assert.match(css, /\.missing-size \.hp \{[\s\S]*?clip-path:\s*inset\(50%\)/);
  });

  it("grows field-row tips left so hidden tooltips do not widen the page", function () {
    assert.match(css, /\.tip::after \{[\s\S]*?left:\s*auto;[\s\S]*?right:\s*0;/);
    assert.doesNotMatch(css, /\.tip::after \{[\s\S]*?transform:\s*translate\(-50%/);
  });

  it("bumps the shared stylesheet cache-bust on both pages", function () {
    assert.match(index, /styles\.css\?v=20260912guides2/);
    assert.match(tyres, /styles\.css\?v=20260912guides2/);
  });
});
