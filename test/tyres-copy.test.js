"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../tyres.html"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../tyres-app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

describe("tyres missing-size capture copy", function () {
  it("shows a calm refuse panel and research form", function () {
    assert.match(html, /We don’t have this size yet/);
    assert.match(html, /id="missingSize"/);
    assert.match(html, /id="missingSizeForm"/);
    assert.match(html, /for="captureSize">Tyre size/);
    assert.match(html, /for="captureLoadIndex">Load index/);
    assert.match(html, /Speed rating/);
    assert.match(html, /Brand \/ model if known/);
    assert.match(html, /sidewall paste welcome/);
    assert.match(html, /Email if a reply would help/);
    assert.match(html, /We will not email a pressure/);
    assert.match(html, /Thank you\. We only add sizes from manufacturer databooks — no invented pressures\./);
    assert.match(html, /id="captureMailto"[^>]*hidden/);
    assert.doesNotMatch(html, /we will email you a pressure/i);
    assert.doesNotMatch(html, /we.?ll send you the (bar|PSI|pressure)/i);
  });

  it("only appears after an uncovered refuse in the app", function () {
    assert.match(app, /isUncoveredRefuse/);
    assert.match(app, /syncCapturePanel/);
    assert.match(app, /\/api\/missing-size/);
    assert.match(app, /will not invent a pressure/);
    assert.doesNotMatch(app, /invent a pressure for this size/);
  });

  it("keeps calculation private and names the optional send", function () {
    const privacy = html.slice(html.indexOf('id="privacy"'), html.indexOf("</section>", html.indexOf('id="privacy"')));
    assert.match(privacy, /posted to this site so we can research a manufacturer table/);
    assert.match(privacy, /we will not email a pressure/);
    assert.match(privacy, /Nothing you type is sent to the payload lookup server/);
  });

  it("bumps cache-bust and keeps the sticky bar off the form footer", function () {
    assert.match(html, /ASSET_VERSION=20260911tyres1/);
    assert.match(html, /styles\.css\?v=20260911restore1/);
    assert.match(html, /tyre-calc\.js\?v=20260911miss1/);
    assert.match(html, /tyres-app\.js\?v=20260911tyres1/);
    assert.match(css, /Keep the last fields and Send above the sticky cold-pressure bar/);
    assert.match(css, /\.missing-size/);
    assert.match(css, /\[hidden\] \{ display: none !important; \}/);
  });
});

describe("tyres opt-in restore", function () {
  it("does not silently auto-fill saved tyres and offers Restore / Clear on this device", function () {
    assert.match(html, /id="savedTyresBanner"[^>]*hidden/);
    assert.match(html, /id="restoreTyres"/);
    assert.match(html, />Restore last tyres</);
    assert.match(html, /id="clearTyres"/);
    assert.match(html, />Clear saved</);
    assert.match(html, /Saved on this phone only\. We don’t upload your tyres\./);
    assert.match(html, /are not filled in until you restore them/);
    assert.match(html, /tyres-app\.js\?v=20260911tyres1/);
    assert.match(app, /function restoreLastTyres/);
    assert.match(app, /function clearSaved/);
    assert.match(app, /if \(booting \|\| !persistEnabled\) return;/);
    assert.match(app, /if \(formChanged\(\)\) enablePersist\(\)/);
    assert.match(app, /fillFromState\(initialPaintState\(\)\)/);
    assert.match(app, /weighbridgeFromQuery/);
    assert.doesNotMatch(app, /fillFromState\(loadState\(\)\)/);
    assert.doesNotMatch(html, /Clear saved figures/);
    assert.doesNotMatch(html, /usual recommended pressures are usually/);
    assert.doesNotMatch(html, /usual pressures are usually/);
  });

  it("keeps axle sources as weighbridge, Payload estimate, and VIN plate maximums", function () {
    assert.match(html, /public weighbridge \(best — today’s weight\)/);
    assert.match(html, /Payload calculator \(an estimate\)/);
    assert.match(html, /VIN plate \(often axle maximums, not today’s weight\)/);
  });
});
