"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

describe("payload page identity and honesty", function () {
  it("spells out Maximum Authorised Mass on first hero use", function () {
    const introStart = html.indexOf('<div class="intro">');
    const intro = html.slice(introStart, html.indexOf('id="how-to-use"'));
    assert.ok(introStart > 0, "intro block should exist");
    assert.match(
      intro,
      /Is your motorhome still legally under its plated Maximum Authorised Mass \(MAM\)\?/
    );
    const heroAt = intro.indexOf("Is your motorhome still legally under its plated Maximum Authorised Mass (MAM)?");
    const defAt = intro.indexOf("the heaviest your van is allowed to be on the road (the plated weight)");
    assert.ok(heroAt >= 0 && defAt > heroAt, "hero should spell out MAM, then give the plated-weight meaning");
  });

  it("covers campervans and motorhomes, not only 3500 / 3850 / 4500", function () {
    assert.match(html, /UK campervans and motorhomes at any plated weight/);
    assert.match(html, /light vans around 2800–3200/);
    assert.match(html, /e\.g\. VW Transporter-style/);
    assert.match(html, /motorhomes at 3500, 3850, 4500/);
    assert.doesNotMatch(
      html,
      /For UK motorhomes and campervans at any plated weight — 3500, 3850, 4500/
    );
  });

  it("is not a 3.5t-only product in title, hero or Open Graph", function () {
    assert.match(html, /any plated Maximum Authorised Mass \(MAM\)/);
    assert.doesNotMatch(html, /Is your 3\.5t van actually legal/);
    assert.doesNotMatch(html, /<title>[^<]*3\.5t Ducato/);
    assert.doesNotMatch(html, /og:title"[^>]*3\.5t Ducato/);
  });

  it("puts the empty weighbridge ticket first and keeps Mass in Service as the V5 name", function () {
    assert.match(html, /Empty weighbridge ticket \(best\)/);
    assert.match(html, /Second best:<\/strong> Mass in Service from the V5/);
    assert.match(html, /can be optimistic/);
    const weighbridgeAt = html.indexOf('for="actualEmpty"');
    const miroAt = html.indexOf('for="miro"');
    assert.ok(weighbridgeAt > 0 && miroAt > weighbridgeAt, "weighbridge field should sit above Mass in Service");
  });

  it("treats blank axle ratings as an incomplete MAM-only check", function () {
    assert.match(html, /MAM check only — axle check incomplete/);
    assert.match(html, /We do not invent axle loads/);
    assert.match(app, /updateAxleResults/);
  });

  it("has one Empty / Loaded weighbridge pair and defaults to Loaded", function () {
    assert.match(html, /id="axleModeLoaded"[^>]*value="loaded"[^>]*checked/);
    assert.match(html, /id="axleModeEmpty"[^>]*value="empty"/);
    assert.match(html, /for="wbFrontAxle">Front axle kg/);
    assert.match(html, /for="wbRearAxle">Rear axle kg/);
    assert.equal((html.match(/id="wbFrontAxle"/g) || []).length, 1);
    assert.equal((html.match(/id="wbRearAxle"/g) || []).length, 1);
    assert.match(app, /axleMode:\s*"loaded"/);
    assert.doesNotMatch(app, /invent axle split|guess front\/rear|split today's load from kit/i);
  });

  it("puts axle status beside remaining payload and keeps plate limits separate", function () {
    assert.match(html, /id="axleStatusBox"/);
    assert.match(html, /class="result-hero"/);
    assert.match(html, /Axle ratings from the VIN plate/);
    assert.match(html, /Weighbridge axle weights/);
    assert.match(html, /id="warnAxleOver"/);
  });

  it("links to the Tyres tool without treating plate ratings as today’s axle weights", function () {
    assert.match(html, /href="tyres.html"/);
    assert.match(html, /weighbridge figures, not the VIN plate ratings/);
    assert.match(app, /Use these weights in the/);
    assert.match(app, /weighbridge figures, not the VIN plate ratings/);
  });

  it("lets people add custom kit rows and keeps setup off the public page", function () {
    assert.match(html, /id="addCustomKit"/);
    assert.match(html, /Your extra kit/);
    assert.match(html, /id="setup"[^>]*hidden/);
    assert.match(html, /\?setup=1/);
    assert.match(app, /customKit\.totalKg/);
  });

  it("warns that manufacturer payload is not real remaining if Mass in Service is optimistic", function () {
    assert.match(html, /brochure gap, not your real remaining if Mass in Service is optimistic/);
  });

  it("shows a still-need checklist after the van path starts and does not invent values", function () {
    assert.match(html, /id="stillNeed"/);
    assert.match(html, /Mass in Service or empty weighbridge total/);
    assert.match(html, /VIN plate axle limits \(front\/rear\)/);
    assert.match(html, /Loaded axle weights if you have a ticket/);
    assert.match(app, /updateStillNeed/);
    assert.match(app, /stillNeed\.items/);
  });

  it("links to Wave 1 Motorhome Tools guides next to the FAQ", function () {
    const start = html.indexOf('id="guides"');
    const end = html.indexOf('id="faq"');
    const strip = html.slice(start, end);
    assert.ok(start > 0 && end > start, "Guides strip should sit next to the FAQ");
    assert.match(strip, /<h2>Guides<\/h2>/);
    assert.match(strip, /They do not change the numbers on this calculator/);
    assert.match(strip, /href="https:\/\/motorhometools\.co\.uk\/guides\/"/);
    assert.match(strip, /href="https:\/\/motorhometools\.co\.uk\/guides\/weighbridge-how-to\.html"/);
    assert.match(strip, /href="https:\/\/motorhometools\.co\.uk\/guides\/axle-weights-explained\.html"/);
    assert.match(strip, /href="https:\/\/motorhometools\.co\.uk\/guides\/mam-mass-in-service-payload\.html"/);
    assert.match(strip, />Weighbridge how-to</);
    assert.match(strip, />Axle weights explained</);
    assert.match(strip, />MAM \/ Mass in Service \/ payload</);
    assert.equal((strip.match(/target="_blank"/g) || []).length, 4);
    assert.equal((strip.match(/rel="noopener noreferrer"/g) || []).length, 4);
    assert.match(html, /href="#guides">Guides</);
    assert.doesNotMatch(strip, /invent/i);
    const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
    assert.match(css, /\.guides-strip \{[\s\S]*?scroll-margin-top:\s*calc\(var\(--sticky-header\)/);
  });

  it("keeps SERP title and description in the usual display window", function () {
    const title = html.match(/<title>([^<]+)<\/title>/)[1].replace(/&amp;/g, "&");
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(title.length >= 50 && title.length <= 60, "title should be ~50–60 chars, got " + title.length);
    assert.ok(desc.length >= 150 && desc.length <= 160, "description should be ~150–160 chars, got " + desc.length);
    assert.match(title, /Payload/);
    assert.match(title, /Weighbridge/);
    assert.match(title, /Axle/);
    assert.match(desc, /weighbridge/i);
    assert.match(desc, /axle check/i);
    assert.match(desc, /do not invent loads/);
    assert.match(html, /rel="canonical" href="https:\/\/motorhomepayload\.co\.uk\/"/);
    assert.match(html, /property="og:image" content="https:\/\/motorhomepayload\.co\.uk\/og-image\.png"/);
    assert.match(html, /<script type="application\/ld\+json">/);
    assert.match(html, /"@type": "WebApplication"/);
    JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
  });

  it("points internal Payload links at / not index.html", function () {
    assert.doesNotMatch(html, /href=["']index\.html/);
    assert.match(html, /<a href="\/" aria-current="page">Payload<\/a>/);
    assert.match(html, /<a href="\/">Payload<\/a>/);
  });

  it("links back to the Motorhome Tools front door from header and footer", function () {
    const navStart = html.indexOf('class="hub-nav"');
    const nav = html.slice(navStart, html.indexOf("</nav>", navStart));
    const footStart = html.indexOf('class="footer-links"');
    const foot = html.slice(footStart, html.indexOf("</nav>", footStart));
    assert.ok(navStart > 0 && footStart > navStart, "hub nav and footer should both exist");
    assert.match(nav, /href="https:\/\/motorhometools\.co\.uk\/"[^>]*>Home</);
    assert.match(foot, /href="https:\/\/motorhometools\.co\.uk\/"[^>]*>Home</);
    assert.match(nav, /aria-label="Home — all calculators"/);
    assert.match(foot, /aria-label="Home — all calculators"/);
    assert.doesNotMatch(nav, />All tools</);
    assert.doesNotMatch(foot, />All tools</);
    assert.doesNotMatch(nav, />Motorhome Tools</);
    assert.doesNotMatch(foot, />Motorhome Tools</);
    assert.doesNotMatch(nav, /target="_blank"/);
    assert.doesNotMatch(foot, /target="_blank"/);
    assert.ok(nav.indexOf(">Home<") < nav.indexOf("Payload"), "Home should lead the hub nav");
    assert.match(
      html,
      /Full legal pages live on the tools home site:[\s\S]*href="https:\/\/motorhometools\.co\.uk\/privacy\.html">Privacy<\/a>/
    );
    assert.match(html, /href="https:\/\/motorhometools\.co\.uk\/cookies\.html">Cookies<\/a>/);
    assert.match(html, /href="https:\/\/motorhometools\.co\.uk\/disclaimer\.html">Disclaimer<\/a>/);
    assert.match(foot, /href="#privacy">Privacy</);
  });

  it("cross-links Power, Water and Motorhome Tools without breaking Wave A legal or guides", function () {
    const moreStart = html.indexOf('id="more-calculators"');
    const moreEnd = html.indexOf('id="privacy"');
    const more = html.slice(moreStart, moreEnd);
    assert.ok(moreStart > 0 && moreEnd > moreStart, "More calculators should sit above Privacy");
    assert.match(more, /<h2>More calculators<\/h2>/);
    assert.match(more, /href="https:\/\/motorhomepower\.co\.uk\/"/);
    assert.match(more, /href="https:\/\/motorhomewater\.co\.uk\/"/);
    assert.match(more, /href="https:\/\/motorhometools\.co\.uk\/"/);
    assert.match(more, /href="https:\/\/motorhometools\.co\.uk\/guides\/"/);
    assert.match(more, />Power</);
    assert.match(more, />Water</);
    assert.match(more, />Motorhome Tools</);
    assert.doesNotMatch(more, /target="_blank"/);
    assert.doesNotMatch(more, /campsite/i);

    const hubsStart = html.indexOf('class="footer-hubs"');
    const hubs = html.slice(hubsStart, html.indexOf("</section>", hubsStart));
    assert.ok(hubsStart > 0, "footer More calculators should exist");
    assert.match(hubs, /<h2 id="footer-hubs-title">More calculators<\/h2>/);
    assert.match(hubs, /href="https:\/\/motorhomepower\.co\.uk\/">Power</);
    assert.match(hubs, /href="https:\/\/motorhomewater\.co\.uk\/">Water</);
    assert.match(hubs, /href="https:\/\/motorhometools\.co\.uk\/">Motorhome Tools</);
    assert.match(hubs, /href="https:\/\/motorhometools\.co\.uk\/guides\/">Guides</);
    assert.doesNotMatch(hubs, /target="_blank"/);

    const guideStart = html.indexOf('id="guides"');
    const guideStrip = html.slice(guideStart, html.indexOf('id="faq"'));
    assert.match(guideStrip, /href="https:\/\/motorhometools\.co\.uk\/guides\/weighbridge-how-to\.html"/);
    assert.match(guideStrip, /href="https:\/\/motorhometools\.co\.uk\/guides\/axle-weights-explained\.html"/);
    assert.match(guideStrip, /href="https:\/\/motorhometools\.co\.uk\/guides\/mam-mass-in-service-payload\.html"/);

    assert.match(html, /rel="canonical" href="https:\/\/motorhomepayload\.co\.uk\/"/);
    assert.match(html, /property="og:image" content="https:\/\/motorhomepayload\.co\.uk\/og-image\.png"/);
    assert.match(html, /"@type": "WebApplication"/);
    JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
  });

  it("says under MAM but over on an axle is still a fail", function () {
    assert.match(html, /id="faq-under-mam-over-axle"/);
    assert.match(html, /Under MAM but over on an axle is still a fail \/ roadside risk\./);
    assert.match(html, /id="axleMamNote"/);
  });

  it("offers one Maps search for a nearby weighbridge under the Best path", function () {
    const pathStart = html.indexOf('class="path-card"');
    const pathEnd = html.indexOf('id="weighbridge-axle"');
    const path = html.slice(pathStart, pathEnd);
    assert.ok(pathStart > 0 && pathEnd > pathStart, "Best path card should sit above the axle card");
    assert.match(path, /<strong>Best:<\/strong> an empty weighbridge ticket/);
    assert.match(
      path,
      /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=weighbridge\+near\+me"/
    );
    assert.match(path, />Find a weighbridge near you</);
    assert.match(path, /target="_blank"/);
    assert.match(path, /rel="noopener noreferrer"/);
    assert.match(path, /Opens Maps — check it’s public \/ suitable for your van\./);
    assert.doesNotMatch(path, /open now/i);
    assert.doesNotMatch(html, /places\.googleapis|weighbridge directory|weighbridge-directory/i);
    assert.equal((html.match(/Find a weighbridge near you/g) || []).length, 1);
  });

  it("locks Wayne’s payload copy: legally, VIN plate path, empty make/year, driver and fuel helpers", function () {
    assert.match(html, /Also from the VIN plate:<\/strong> MAM and front\/rear axle limits \(allowed weights — not today’s load\)\./);
    assert.doesNotMatch(html, /<li><strong>Third best:/);
    assert.match(html, /id="make"[^>]*autocomplete="off"/);
    assert.doesNotMatch(html, /id="make"[^>]*placeholder=/);
    assert.doesNotMatch(html, /id="yearOfManufacture"[^>]*placeholder=/);
    assert.match(html, /placeholder="e\.g\. AB12 CDE"/);
    assert.doesNotMatch(html, /WN67 DSO/);
    assert.doesNotMatch(html, /DEMO3500/);
    assert.match(
      html,
      /Mass in Service already includes a 75 kg driver\. Enter your real weight — we only add the extra \(or subtract if you’re lighter\), so the driver isn’t counted twice\./
    );
    assert.match(html, /Mass in Service includes most diesel \(about 90%\)/);
    assert.doesNotMatch(html, /Mass in Service usually already includes most diesel/);
    assert.match(html, /Mass in Service includes 90% fuel\. Only the difference over 90% is added\./);
    assert.doesNotMatch(html, /difference from 90%/);
    assert.doesNotMatch(html, /90% fuel \(usual\)/);
    assert.match(html, /<span>Awning<\/span>/);
    assert.doesNotMatch(html, /Cassette awning/);
  });

  it("does not silently auto-fill a saved van and offers Restore / Clear on this device", function () {
    assert.match(html, /id="savedVanBanner"[^>]*hidden/);
    assert.match(html, /id="restoreVan"/);
    assert.match(html, />Restore last van</);
    assert.match(html, /id="clearVan"/);
    assert.match(html, />Clear saved van</);
    assert.match(html, /Saved on this phone only\. We don’t upload your van\./);
    assert.match(html, /Figures stay on this device only and are not filled in until you tap Restore last van/);
    assert.match(html, /styles\.css\?v=20260915wavec/);
    assert.match(html, /app\.js\?v=20260911restore2/);
    assert.match(app, /var state = freshState\(\)/);
    assert.match(app, /var pageLoadSnapshot = readSavedVan\(\)/);
    assert.match(app, /if \(booting \|\| !persistEnabled\) return;/);
    assert.match(app, /if \(state\[key\] !== before\) enablePersist\(\)/);
    assert.match(app, /function restoreLastVan/);
    assert.match(app, /function clearSavedVan/);
    assert.doesNotMatch(app, /var state = loadState\(\)/);
    assert.doesNotMatch(html, /WN67/);
  });
});
