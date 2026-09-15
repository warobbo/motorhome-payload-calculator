"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const tyres = fs.readFileSync(path.join(root, "tyres.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function footerHubs(html) {
  const start = html.indexOf('class="footer-hubs"');
  return html.slice(start, html.indexOf("</section>", start));
}

describe("SEO Wave C cross-family links", function () {
  it("adds More calculators on Payload and Tyres to Power, Water, Tools and Guides", function () {
    for (const html of [index, tyres]) {
      const hubs = footerHubs(html);
      assert.match(hubs, /More calculators/);
      assert.match(hubs, /href="https:\/\/motorhomepower\.co\.uk\/">Power</);
      assert.match(hubs, /href="https:\/\/motorhomewater\.co\.uk\/">Water</);
      assert.match(hubs, /href="https:\/\/motorhometools\.co\.uk\/">Motorhome Tools</);
      assert.match(hubs, /href="https:\/\/motorhometools\.co\.uk\/guides\/">Guides</);
    }

    const more = index.slice(index.indexOf('id="more-calculators"'), index.indexOf('id="privacy"'));
    assert.match(more, /href="https:\/\/motorhomepower\.co\.uk\/"/);
    assert.match(more, /href="https:\/\/motorhomewater\.co\.uk\/"/);
    assert.match(more, /href="https:\/\/motorhometools\.co\.uk\/"/);
    assert.match(more, /href="https:\/\/motorhometools\.co\.uk\/guides\/"/);
  });

  it("keeps Wave A Tools legal links and on-page privacy", function () {
    for (const html of [index, tyres]) {
      assert.match(html, /Full legal pages live on the tools home site:/);
      assert.match(html, /href="https:\/\/motorhometools\.co\.uk\/privacy\.html">Privacy</);
      assert.match(html, /href="https:\/\/motorhometools\.co\.uk\/cookies\.html">Cookies</);
      assert.match(html, /href="https:\/\/motorhometools\.co\.uk\/disclaimer\.html">Disclaimer</);
      assert.match(html, /href="#privacy">Privacy</);
    }
  });

  it("does not change canonicals, WebApplication JSON-LD or og-image", function () {
    assert.match(index, /<link rel="canonical" href="https:\/\/motorhomepayload\.co\.uk\/">/);
    assert.match(tyres, /<link rel="canonical" href="https:\/\/motorhomepayload\.co\.uk\/tyres\.html">/);
    assert.match(index, /property="og:image" content="https:\/\/motorhomepayload\.co\.uk\/og-image\.png"/);
    assert.match(tyres, /property="og:image" content="https:\/\/motorhomepayload\.co\.uk\/og-image\.png"/);
    assert.match(index, /"@type": "WebApplication"/);
    JSON.parse(index.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
    JSON.parse(tyres.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
  });

  it("styles the footer hubs and hides More calculators in print", function () {
    assert.match(css, /\.footer-hubs \{/);
    assert.match(css, /\.footer-hubs-links \{/);
    assert.match(css, /#more-calculators,/);
  });
});
