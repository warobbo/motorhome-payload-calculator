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
    assert.match(privacy, /does not publish a personal name or an email address/);
    assert.match(terms, /do not publish a personal name or an email address/);
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
    assert.match(missing, /href="\/styles\.css\?v=20261015a11y"/);
    assert.match(missing, /src="\/brand\/payload\.svg/);
    assert.match(missing, /href="\/tyres\.html"/);
    assert.doesNotMatch(missing, /(?:href|src)="(?![/#]|https?:)[^"]+"/);
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
