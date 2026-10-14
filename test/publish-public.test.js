"use strict";

const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

function listFiles(dir, base) {
  const rootDir = base || dir;
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push.apply(out, listFiles(abs, rootDir));
    else out.push(path.relative(rootDir, abs).split(path.sep).join("/"));
  }
  return out.sort();
}

describe("static publish allowlist", { concurrency: 1 }, function () {
  after(function () {
    fs.rmSync(publicDir, { recursive: true, force: true });
  });

  it("copies only the public calculator files", function () {
    execFileSync("bash", ["scripts/publish-public.sh"], {
      cwd: root,
      env: Object.assign({}, process.env, {
        MISSING_SIZE_ENDPOINT: "",
        VEHICLE_LOOKUP_ENDPOINT: ""
      }),
      stdio: "pipe"
    });
    const files = listFiles(publicDir);
    const allow = fs.readFileSync(path.join(root, "scripts/published-files.txt"), "utf8")
      .split(/\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .sort();
    assert.deepEqual(files, allow);
    const banned = [
      "README.md",
      "MIGRATION.md",
      "render.yaml",
      "server.js",
      "package.json",
      ".gitignore",
      ".env",
      ".env.example",
      "worker/wrangler.toml",
      "worker/src/index.js",
      "api/missing-size.js",
      "api/vehicle-lookup.js"
    ];
    banned.forEach(function (name) {
      assert.equal(files.includes(name), false, name);
    });
    files.forEach(function (name) {
      assert.equal(name.startsWith("."), false, name);
      assert.equal(name.includes("/."), false, name);
    });
    assert.equal(fs.readFileSync(path.join(publicDir, "robots.txt"), "utf8"), robots);
    assert.equal(fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8"), sitemap);
    assert.equal(fs.readFileSync(path.join(publicDir, "site-config.js"), "utf8"), fs.readFileSync(path.join(root, "site-config.js"), "utf8"));
    const png = fs.readFileSync(path.join(publicDir, "og-image.png"));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.match(fs.readFileSync(path.join(publicDir, "index.html"), "utf8"), /lib\/vehicle-lookup\.js/);
    assert.match(fs.readFileSync(path.join(publicDir, "tyres.html"), "utf8"), /site-config\.js/);
  });

  it("writes the worker endpoints only into the published config", function () {
    const missing = "https://motorhome-payload-missing-size.example.workers.dev";
    const lookup = missing + "/api/vehicle-lookup";
    execFileSync("bash", ["scripts/publish-public.sh"], {
      cwd: root,
      env: Object.assign({}, process.env, {
        MISSING_SIZE_ENDPOINT: missing,
        VEHICLE_LOOKUP_ENDPOINT: lookup
      }),
      stdio: "pipe"
    });
    const published = fs.readFileSync(path.join(publicDir, "site-config.js"), "utf8");
    assert.equal(published, [
      "window.MISSING_SIZE_ENDPOINT = " + JSON.stringify(missing) + ";",
      "window.VEHICLE_LOOKUP_ENDPOINT = " + JSON.stringify(lookup) + ";",
      ""
    ].join("\n"));
    assert.equal(
      fs.readFileSync(path.join(root, "site-config.js"), "utf8"),
      "window.MISSING_SIZE_ENDPOINT = \"/api/missing-size\";\n" +
      "window.VEHICLE_LOOKUP_ENDPOINT = \"/api/vehicle-lookup\";\n"
    );
    const yaml = fs.readFileSync(path.join(root, "render.yaml"), "utf8");
    assert.match(yaml, /name: motorhome-payload-calculator\n\s+runtime: node/);
    assert.match(yaml, /startCommand: npm start/);
    assert.match(yaml, /name: motorhome-payload-static\n\s+buildCommand: bash scripts\/publish-public\.sh/);
    assert.match(yaml, /runtime: static/);
    assert.match(yaml, /staticPublishPath: public/);
    assert.match(yaml, /key: VEHICLE_LOOKUP_ENDPOINT\n\s+sync: false/);
    assert.match(yaml, /key: DVLA_API_KEY\n\s+sync: false/);
    assert.equal(fs.existsSync(path.join(publicDir, "render.yaml")), false);

    execFileSync("bash", ["scripts/publish-public.sh"], {
      cwd: root,
      env: Object.assign({}, process.env, {
        MISSING_SIZE_ENDPOINT: missing,
        VEHICLE_LOOKUP_ENDPOINT: ""
      }),
      stdio: "pipe"
    });
    assert.equal(
      fs.readFileSync(path.join(publicDir, "site-config.js"), "utf8"),
      "window.MISSING_SIZE_ENDPOINT = " + JSON.stringify(missing) + ";\n" +
      "window.VEHICLE_LOOKUP_ENDPOINT = \"/api/vehicle-lookup\";\n"
    );
  });
});
