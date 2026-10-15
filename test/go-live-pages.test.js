"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

const index = read("index.html");
const tyres = read("tyres.html");
const privacy = read("privacy.html");
const cookies = read("cookies.html");
const terms = read("terms.html");
const missing = read("404.html");
const css = read("styles.css");
const app = read("app.js");
const allow = read("scripts/published-files.txt");
const sitemap = read("sitemap.xml");

describe("go-live legal pages", function () {
  it("publishes privacy, cookies, terms and the branded 404", function () {
    ["privacy.html", "cookies.html", "terms.html", "404.html"].forEach(function (name) {
      assert.equal(allow.split(/\n/).includes(name), true, name);
    });
    assert.match(sitemap, /https:\/\/motorhomepayload\.co\.uk\/privacy\.html/);
    assert.match(sitemap, /https:\/\/motorhomepayload\.co\.uk\/cookies\.html/);
    assert.match(sitemap, /https:\/\/motorhomepayload\.co\.uk\/terms\.html/);
    assert.doesNotMatch(sitemap, /404\.html/);
  });

  it("writes the notices as Motorhome Payload Calculator, with no contact address", function () {
    [privacy, cookies, terms, missing].forEach(function (html) {
      assert.match(html, /Motorhome Payload Calculator/);
      assert.doesNotMatch(html, /mailto:/i);
      assert.doesNotMatch(html, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      assert.doesNotMatch(html, /"@type"\s*:\s*"Person"/);
    });
    assert.match(privacy, /<h1>Privacy<\/h1>/);
    assert.match(cookies, /<h1>Cookies<\/h1>/);
    assert.match(terms, /<h1>Terms<\/h1>/);
    assert.doesNotMatch(privacy, /does not publish a personal name or an email address/);
    assert.match(terms, /do not publish a personal name or an email address/);
    assert.match(privacy, /The controller is Motorhome Payload Calculator/);
    assert.match(privacy, /Lawful basis/);
    assert.match(privacy, /How long we keep data/);
    assert.match(privacy, /Your rights/);
    assert.match(privacy, /https:\/\/ico\.org\.uk\/make-a-complaint\//);
    assert.match(privacy, /https:\/\/motorhometools\.co\.uk\/ask\//);
    assert.doesNotMatch(privacy, /contact\.html/);
    assert.match(privacy, /local storage/);
    assert.match(privacy, /do not load Google Fonts/);
    assert.doesNotMatch(privacy, /fonts\.googleapis\.com/);
    assert.match(privacy, /sends that key with the registration/);
    assert.match(privacy, /asks DVLA from this device/);
    assert.match(privacy, /A saved MOT key is sent the same way/);
    assert.doesNotMatch(privacy, /does not call DVLA itself/);
    assert.match(cookies, /send that key with the registration/);
    assert.match(cookies, /not written into a cookie/);
  });

  it("says there are no tracking cookies and plate lookups use a Worker to reach DVLA", function () {
    assert.match(privacy, /does not use tracking cookies/);
    assert.match(privacy, /Cloudflare Worker/);
    assert.match(privacy, /DVLA/);
    assert.match(cookies, /does not use tracking cookies/);
    assert.match(cookies, /Cloudflare Worker/);
    assert.match(cookies, /DVLA/);
    assert.match(terms, /Cloudflare Worker/);
    assert.match(terms, /DVLA/);
    assert.match(index, /Cloudflare Worker, which asks DVLA/);
    assert.match(index, /no tracking or advertising cookies/);
  });

  it("brands the missing page for Render to serve", function () {
    assert.match(missing, /<h1>Page not found<\/h1>/);
    assert.match(missing, /name="robots" content="noindex"/);
    assert.match(missing, /class="btn btn-primary" href="\/"/);
    assert.match(missing, /href="\/privacy\.html"/);
    assert.match(missing, /href="\/styles\.css\?v=20261015golive"/);
    assert.match(missing, /src="\/brand\/payload\.svg/);
    assert.match(missing, /href="\/tyres\.html"/);
    assert.doesNotMatch(missing, /(?:href|src)="(?![/#]|https?:)[^"]+"/);
  });
});

describe("go-live checklist", function () {
  const pages = [index, tyres, privacy, cookies, terms, missing, read("accessibility.html")];

  it("links Contact and Accessibility from every footer", function () {
    pages.forEach(function (html) {
      assert.match(html, /href="(?:\/)?accessibility\.html"/);
      assert.match(html, /href="https:\/\/motorhometools\.co\.uk\/ask\/">Contact</);
      assert.doesNotMatch(html, /contact\.html/);
    });
    assert.equal(allow.split(/\n/).includes("accessibility.html"), true);
    assert.match(sitemap, /https:\/\/motorhomepayload\.co\.uk\/accessibility\.html/);
    assert.match(read("accessibility.html"), /<h1>Accessibility<\/h1>/);
    assert.doesNotMatch(read("accessibility.html"), /mailto:/i);
  });

  it("adds Twitter cards on the privacy, terms, cookies and accessibility pages", function () {
    [privacy, cookies, terms, read("accessibility.html")].forEach(function (html) {
      assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
      assert.match(html, /<meta name="twitter:title" content="[^"]+">/);
      assert.match(html, /<meta name="twitter:description" content="[^"]+">/);
      assert.match(html, /<meta name="twitter:image" content="https:\/\/motorhomepayload\.co\.uk\/og-image\.png">/);
    });
  });

  it("serves a real favicon and self-hosts the typefaces", function () {
    assert.equal(allow.split(/\n/).includes("favicon.ico"), true);
    const ico = fs.readFileSync(path.join(root, "favicon.ico"));
    assert.equal(ico.readUInt16LE(0), 0);
    assert.equal(ico.readUInt16LE(2), 1);
    assert.ok(ico.readUInt16LE(4) >= 1);
    pages.forEach(function (html) {
      assert.match(html, /href="\/favicon\.ico"/);
      assert.doesNotMatch(html, /fonts\.googleapis\.com/);
      assert.doesNotMatch(html, /fonts\.gstatic\.com/);
    });
    assert.match(read("styles.css"), /fonts\/outfit-latin\.woff2/);
    assert.match(read("styles.css"), /fonts\/fraunces-latin\.woff2/);
    assert.equal(allow.split(/\n/).includes("fonts/outfit-latin.woff2"), true);
    assert.equal(allow.split(/\n/).includes("fonts/fraunces-latin.woff2"), true);
  });

  it("sets the static-site security headers in the blueprint", function () {
    const yaml = read("render.yaml");
    const staticAt = yaml.indexOf("name: motorhome-payload-static");
    assert.ok(staticAt > 0);
    const headers = yaml.slice(staticAt);
    assert.match(headers, /name: Strict-Transport-Security\n\s+value: max-age=31536000; includeSubDomains/);
    assert.match(headers, /name: Content-Security-Policy/);
    assert.match(headers, /font-src 'self'/);
    assert.match(headers, /connect-src 'self' https:\/\/\*\.workers\.dev https:\/\/driver-vehicle-licensing\.api\.gov\.uk/);
    assert.doesNotMatch(headers, /https:\/\/\*\.\*\.workers\.dev/);
    const csp = headers.match(/name: Content-Security-Policy\n\s+value: "([^"]+)"/);
    assert.ok(csp, "CSP value");
    assert.ok(read("MIGRATION.md").includes(csp[1]));
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /name: X-Frame-Options\n\s+value: DENY/);
    assert.match(headers, /name: Referrer-Policy\n\s+value: strict-origin-when-cross-origin/);
    assert.match(headers, /name: Permissions-Policy/);
    assert.match(headers, /name: X-Content-Type-Options\n\s+value: nosniff/);
    assert.match(read("MIGRATION.md"), /Settings → Headers/);
  });
});

describe("single call to action", function () {
  it("keeps Look up vehicle as the only filled button on the calculator", function () {
    assert.deepEqual(index.match(/btn-primary/g), ["btn-primary"]);
    assert.match(index, /class="btn btn-primary" id="lookupBtn">Look up vehicle</);
    assert.match(index, /class="btn" id="restoreVan"/);
    assert.match(index, /class="btn btn-ghost" id="lookupSpecBtn"/);
    assert.match(index, /class="btn" href="tyres\.html">Open the Tyres tool/);
    assert.match(index, /class="btn" href="#results">Full breakdown/);
    assert.doesNotMatch(tyres, /btn-primary/);
    assert.doesNotMatch(app, /btn-primary/);
    assert.match(css, /#lookupBtn \{/);
    assert.match(css, /\.preset-btn\[aria-pressed="true"\]/);
  });
});
