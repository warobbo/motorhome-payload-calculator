"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.join(__dirname, "..");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

function request(port, urlPath) {
  return new Promise(function (resolve, reject) {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: port,
        path: urlPath,
        method: "GET",
      },
      function (res) {
        const chunks = [];
        res.on("data", function (chunk) {
          chunks.push(chunk);
        });
        res.on("end", function () {
          resolve({
            status: res.statusCode,
            location: res.headers.location || "",
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

describe("sitemap lastmod", function () {
  it("dates the homepage and tyres URLs", function () {
    assert.match(sitemap, /<loc>https:\/\/motorhomepayload\.co\.uk\/<\/loc>\s*<lastmod>2026-09-15<\/lastmod>/);
    assert.match(
      sitemap,
      /<loc>https:\/\/motorhomepayload\.co\.uk\/tyres\.html<\/loc>\s*<lastmod>2026-09-15<\/lastmod>/
    );
    assert.equal((sitemap.match(/<lastmod>/g) || []).length, 2);
  });
});

describe("static server", function () {
  let child;
  let port;

  before(async function () {
    port = 41000 + Math.floor(Math.random() * 2000);
    child = spawn(process.execPath, ["server.js"], {
      cwd: root,
      env: Object.assign({}, process.env, { PORT: String(port) }),
      stdio: ["ignore", "pipe", "pipe"],
    });

    await new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        reject(new Error("server did not become ready"));
      }, 8000);
      function onData(buf) {
        if (String(buf).includes("ready")) {
          clearTimeout(timer);
          child.stdout.off("data", onData);
          resolve();
        }
      }
      child.stdout.on("data", onData);
      child.once("error", function (err) {
        clearTimeout(timer);
        reject(err);
      });
      child.once("exit", function (code) {
        clearTimeout(timer);
        reject(new Error("server exited before ready: " + code));
      });
    });
  });

  after(function () {
    if (child) child.kill("SIGTERM");
  });

  it("redirects /index.html to / and keeps / as 200", async function () {
    const redirected = await request(port, "/index.html");
    assert.equal(redirected.status, 301);
    assert.equal(redirected.location, "/");
    assert.equal(redirected.body, "");

    const withQuery = await request(port, "/index.html?setup=1");
    assert.equal(withQuery.status, 301);
    assert.equal(withQuery.location, "/?setup=1");

    const home = await request(port, "/");
    assert.equal(home.status, 200);
    assert.match(home.body, /<link rel="canonical" href="https:\/\/motorhomepayload\.co\.uk\/">/);
    assert.match(home.body, /<title>Motorhome Payload Calculator \| Weighbridge &amp; Axle Check<\/title>/);

    const tyres = await request(port, "/tyres.html");
    assert.equal(tyres.status, 200);
    assert.match(tyres.body, /rel="canonical" href="https:\/\/motorhomepayload\.co\.uk\/tyres\.html"/);

    const map = await request(port, "/sitemap.xml");
    assert.equal(map.status, 200);
    assert.match(map.body, /<lastmod>2026-09-15<\/lastmod>/);
  });

  it("returns 404 for dotfiles and dot-folders without changing public routes", async function () {
    const hidden = [
      "/.gitignore",
      "/.env",
      "/.env.example",
      "/.node-version",
      "/.git/config",
      "/.git/",
      "/.cursor/",
      "/.cursor/skills/verify-motorhome-payload/SKILL.md",
      "/.cursor/skills/verify-motorhome-payload/helpers/package.json",
      "/.cursor/skills/verify-motorhome-payload/.gitignore",
      "/%2eenv",
      "/%2Egitignore",
      "/%2ecursor/skills/verify-motorhome-payload/SKILL.md",
      "/styles.css/../.cursor/skills/verify-motorhome-payload/SKILL.md",
      "/.cursor/skills/verify-motorhome-payload/SKILL.md?raw=1",
    ];
    for (let i = 0; i < hidden.length; i += 1) {
      const urlPath = hidden[i];
      const hiddenRes = await request(port, urlPath);
      assert.equal(hiddenRes.status, 404, urlPath);
      if (hiddenRes.body !== "Not found") {
        assert.fail(urlPath + " body was " + hiddenRes.body.length + " bytes");
      }
    }

    const setup = await request(port, "/?setup=1");
    assert.equal(setup.status, 200);
    assert.match(setup.body, /<h1>Motorhome Payload Calculator<\/h1>/);

    const tyresQuery = await request(port, "/tyres.html?axle=rear");
    assert.equal(tyresQuery.status, 200);
    assert.match(tyresQuery.body, /<h1>Motorhome Tyre Pressure<\/h1>/);

    const encodedCss = await request(port, "/styles%2ecss");
    assert.equal(encodedCss.status, 200, "percent-decoded public asset");
    assert.equal(encodedCss.body.includes("{"), true);

    const css = await request(port, "/styles.css");
    assert.equal(css.status, 200);
    assert.equal(css.body.includes("{"), true);

    const app = await request(port, "/app.js");
    assert.equal(app.status, 200);
    assert.equal(app.body.includes("function"), true);

    const robots = await request(port, "/robots.txt");
    assert.equal(robots.status, 200);
    assert.equal(robots.body.includes("User-agent"), true);

    const brand = await request(port, "/brand/payload-32.png");
    assert.equal(brand.status, 200);
    assert.equal(brand.body === "Not found", false);

    const lookup = await request(port, "/api/vehicle-lookup");
    assert.equal(lookup.status, 200);
    const lookupJson = JSON.parse(lookup.body);
    assert.equal(lookupJson.ok, true);
    assert.equal(Array.isArray(lookupJson.demoPlates), true);

    const missing = await request(port, "/api/missing-size");
    assert.equal(missing.status, 200);
    const missingJson = JSON.parse(missing.body);
    assert.equal(missingJson.ok, true);
  });
});
