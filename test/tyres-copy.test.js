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
    assert.match(app, /function postAutoNote/);
    assert.doesNotMatch(app, /invent a pressure for this size/);
  });

  it("keeps calculation private and names the optional send", function () {
    const privacy = html.slice(html.indexOf('id="privacy"'), html.indexOf("</section>", html.indexOf('id="privacy"')));
    assert.match(privacy, /posted automatically so we can research a manufacturer table/);
    assert.match(privacy, /We will not email a pressure/);
    assert.match(privacy, /Nothing you type is sent to the payload lookup server/);
    assert.match(privacy, /We’ve noted this size for research/);
  });

  it("bumps cache-bust and keeps the sticky bar off the form footer", function () {
    assert.match(html, /ASSET_VERSION=20260912lt1/);
    assert.match(html, /styles\.css\?v=20260912lt1/);
    assert.match(html, /tyre-amber-db\.js\?v=20260912lt1/);
    assert.match(html, /tyre-calc\.js\?v=20260912lt1/);
    assert.match(html, /tyres-app\.js\?v=20260912lt1/);
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
    assert.match(html, /tyres-app\.js\?v=20260912lt1/);
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

  it("locks Wayne’s LT-first copy, sticker nudge, AMBER warning, and honest Michelin CP refuse", function () {
    assert.match(html, /Use this for LT tyres, or when the wheels or tyres are different to the originals\./);
    assert.match(html, /Same-size C or CP renewals: use the door sticker or handbook/);
    assert.match(html, /Van axle, wheel and legal limits still win/);
    assert.match(html, /We’ve noted this size for research when we can; use the form on this page/);
    assert.match(html, /See <a href="#sources">Sources we use<\/a> — it names the manufacturer tables behind the figures\./);
    assert.match(html, /id="autoNoteLine"[^>]*>We’ve noted this size for research\./);
    assert.match(html, /id="stickerNudge"/);
    assert.match(html, /Same-size C or CP\?/);
    assert.match(html, /id="amberWarning"/);
    assert.match(html, /incomplete maker table/);
    assert.match(html, /not a full pressure curve/);
    assert.match(html, /id="legalLimitNote"/);
    assert.match(html, /Tyre capacity is not permission to exceed the vehicle axle, wheel or legal limits/);
    const sources = html.slice(html.indexOf('id="sources"'), html.indexOf("</aside>", html.indexOf('id="sources"')));
    assert.match(sources, /We do not have Michelin’s Camping CP load\/pressure table/);
    assert.match(sources, /Conti_Tyre_Databook_2025_EN_screen\.pdf/);
    assert.match(sources, /VanContact Camper/);
    assert.match(sources, /AMBER \(max load @ max cold pressure only\)/);
    assert.match(sources, /GT18_Grabber-AT2_Tire_Spec_Pages\.pdf/);
    assert.match(sources, /GT19_Grabber_ATx_ProductFlyer_v2_Print\.pdf/);
    assert.match(sources, /grabber-atx\/specs/);
    assert.match(sources, /bfgoodrich-all-terrain-ta-ko-2-product-information\.pdf/);
    assert.match(sources, /retrieved 12 Sep 2026/);
    assert.match(sources, /11R22\.5/);
    assert.doesNotMatch(sources, /rear never below 5\.5 bar/);
    assert.doesNotMatch(sources, /Don’t go above the maximum/);
    assert.match(sources, /tyresafe\.org\/vehicle-owners\/motorhome-tyre-safety\/load-and-inflation-tables/);
    assert.match(html, /<p class="lede">Enter the size printed on the tyre you fitted\.<\/p>/);
    assert.doesNotMatch(html, /that box names/);
    assert.doesNotMatch(html, /you can send the size so we can look/);
    assert.doesNotMatch(html, /matching camping row/);
    const calc = fs.readFileSync(path.join(__dirname, "../lib/tyre-calc.js"), "utf8");
    assert.match(calc, /never copy a Conti camping/);
    assert.match(calc, /call it Michelin/);
    assert.match(calc, /var MICHELIN_CP_REFUSE/);
    assert.match(app, /scheduleAutoNote/);
    assert.match(app, /auto: true/);
    assert.match(app, /syncHonestyNotes/);
    assert.match(app, /amber-max-only/);
    assert.match(css, /\.sticker-nudge/);
    assert.match(css, /\.amber-warning/);
  });
});
