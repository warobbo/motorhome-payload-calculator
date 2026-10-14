"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, text) {
  mkdir(path.dirname(file));
  fs.writeFileSync(file, text.endsWith("\n") ? text : text + "\n");
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function boot(page) {
  await page.evaluate(function () {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      });
    });
  });
}

async function openPage(browser, url) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  await boot(page);
  return { context: context, page: page };
}

async function text(page, selector) {
  return page.$eval(selector, function (el) { return el.textContent.trim(); });
}

async function value(page, selector) {
  return page.$eval(selector, function (el) { return el.value; });
}

async function hidden(page, selector) {
  return page.$eval(selector, function (el) { return el.hidden || el.hasAttribute("hidden"); });
}

async function click(page, selector) {
  await page.waitForSelector(selector);
  await page.$eval(selector, function (el) {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    el.click();
  });
}

async function setInput(page, selector, next) {
  await page.waitForSelector(selector);
  await page.$eval(selector, function (el, raw) {
    el.focus();
    el.value = raw;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, String(next));
}

async function setSelect(page, selector, next) {
  await page.select(selector, next);
}

async function uncheck(page, selector) {
  await page.$eval(selector, function (el) {
    if (el.checked) el.click();
  });
}

async function openBlock(page, heading) {
  const found = await page.evaluate(function (name) {
    const blocks = Array.prototype.slice.call(document.querySelectorAll("details.block"));
    const block = blocks.find(function (details) {
      const title = details.querySelector("h3");
      return title && title.textContent.trim() === name;
    });
    if (!block) return "missing";
    if (!block.open) block.querySelector("summary").click();
    return "open";
  }, heading);
  if (found !== "open") throw new Error("Could not open section " + heading);
}

async function shot(page, file, selector) {
  mkdir(path.dirname(file));
  if (!selector) {
    await page.screenshot({ path: file });
    return;
  }
  const handle = await page.$(selector);
  if (!handle) throw new Error("Missing " + selector);
  await handle.screenshot({ path: file });
}

async function aria(page, selector, file) {
  const handle = await page.$(selector);
  const tree = await page.accessibility.snapshot({ root: handle || undefined, interestingOnly: true });
  write(file, JSON.stringify(tree, null, 2));
}

function httpGet(url, redirect) {
  return new Promise(function (resolve, reject) {
    const req = http.get(url, function (res) {
      if (redirect === "manual" && res.statusCode >= 300 && res.statusCode < 400) {
        res.resume();
        resolve({ status: res.statusCode, location: res.headers.location || "" });
        return;
      }
      const chunks = [];
      res.on("data", function (chunk) { chunks.push(chunk); });
      res.on("end", function () {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8"), location: res.headers.location || "" });
      });
    });
    req.on("error", reject);
  });
}

function report(rows) {
  const header = "| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |\n| --- | --- | --- | --- | --- |";
  const lines = rows.map(function (row) {
    return "| " + [row.input, row.expected, row.actual, row.difference, row.pass ? "PASS" : "FAIL"].join(" | ") + " |";
  });
  return header + "\n" + lines.join("\n") + "\n";
}

function compare(rows, input, expected, actual) {
  const pass = actual === expected;
  if (!pass) console.error("FAIL " + input + "\n  expected " + JSON.stringify(expected) + "\n  actual   " + JSON.stringify(actual));
  rows.push({
    input: input,
    expected: expected,
    actual: actual,
    difference: pass ? "none" : "expected and actual text differ",
    pass: pass
  });
  return pass;
}

async function zeroKit(page) {
  await openBlock(page, "Vehicle base");
  await setInput(page, "#mam", "3500");
  await setInput(page, "#miro", "3000");
  await setInput(page, "#actualEmpty", "");
  await setInput(page, "#driverKg", "75");
  await openBlock(page, "People & pets");
  await setInput(page, "#extraAdults", "0");
  await setInput(page, "#children", "0");
  await setInput(page, "#pets", "0");
  await openBlock(page, "Fluids");
  await setInput(page, "#freshFill", "0");
  await setInput(page, "#greyFill", "0");
  await setInput(page, "#blackFill", "0");
  await setInput(page, "#fuelCap", "90");
  await setInput(page, "#fuelFill", "90");
  await setInput(page, "#fuelDensity", "0.84");
  await openBlock(page, "Gas bottles");
  await setInput(page, "#gas6", "0");
  await setInput(page, "#gas9", "0");
  await setInput(page, "#gas13", "0");
  await openBlock(page, "Electrical & solar");
  await setSelect(page, "#battType", "none");
  await setSelect(page, "#solarType", "none");
  await setInput(page, "#inverterKg", "0");
  await setInput(page, "#elecExtrasKg", "0");
  await openBlock(page, "Gear & other");
  await uncheck(page, "#awning");
  await uncheck(page, "#ramps");
  await uncheck(page, "#furniture");
  await uncheck(page, "#generator");
  await uncheck(page, "#toolbox");
  await setInput(page, "#bikes", "0");
  await setInput(page, "#foodPeople", "0");
  await setInput(page, "#miscKg", "0");
}

async function payloadCalculator(ctx) {
  const rows = [];
  const dir = ctx.evidence;
  mkdir(dir);
  const opened = await openPage(ctx.browser, ctx.baseUrl);
  const page = opened.page;
  try {
    await shot(page, path.join(dir, "first-paint-viewport.png"));
    compare(rows, "Fresh page, no typing. Defaults in app.js DEFAULTS.", "254 kg", await text(page, "#remainingValue"));
    compare(rows, "Fresh page total", "3,247 kg", await text(page, "#totalWeight"));
    await click(page, "#preset-typical");
    compare(rows, "Click Typical 3.5t Motorhome setup", "\u22126 kg", await text(page, "#remainingValue"));
    await click(page, "#preset-light");
    compare(rows, "Click Light weekend setup based on 2 adults", "270 kg", await text(page, "#remainingValue"));
    await click(page, "#preset-family");
    compare(rows, "Click Full week family of 4", "\u2212129 kg", await text(page, "#remainingValue"));
    await click(page, "#preset-reset");
    compare(rows, "Click Reset to defaults", "254 kg", await text(page, "#remainingValue"));
    await zeroKit(page);
    compare(rows, "Bare van: MAM 3500, Mass in Service 3000, driver 75, every added load 0, fuel 90 L at 90%", "500 kg", await text(page, "#remainingValue"));
    compare(rows, "Bare van total", "3,000 kg", await text(page, "#totalWeight"));
    compare(rows, "Bare van plated payload", "500 kg", await text(page, "#platedPayload"));
    compare(rows, "Bare van status line", "Comfortable margin under 3,500 kg MAM", await text(page, "#remainingSub"));
    await shot(page, path.join(dir, "bare-500kg.png"), "#results");
    await setInput(page, "#freshCap", "100");
    await setInput(page, "#freshFill", "100");
    compare(rows, "Bare van plus 100 L fresh at 100%", "400 kg", await text(page, "#remainingValue"));
    compare(rows, "Water what-if sentence", "Emptying fresh, grey and black water would free 100 kg and leave 500 kg remaining.", await text(page, "#waterWhatIf"));
    await click(page, "#emptyWater");
    compare(rows, "Click What if I empty the water?", "500 kg", await text(page, "#remainingValue"));
    compare(rows, "Water sentence after emptying", "Water tanks are already empty in this estimate.", await text(page, "#waterWhatIf"));
    compare(rows, "Button label after emptying", "Restore water levels", await text(page, "#emptyWater"));
    await click(page, "#addCustomKit");
    await setInput(page, ".kit-name", "Chairs");
    await setInput(page, ".kit-kg", "2");
    await setInput(page, ".kit-qty", "2");
    compare(rows, "Custom item Chairs, 2 kg, quantity 2, on the bare van", "496 kg", await text(page, "#remainingValue"));
    await click(page, ".kit-remove");
    compare(rows, "Remove the custom item", "500 kg", await text(page, "#remainingValue"));
    await setInput(page, "#driverKg", "85");
    compare(rows, "Driver 85 kg on Mass in Service (only +10 kg)", "490 kg", await text(page, "#remainingValue"));
    await shot(page, path.join(dir, "driver-85.png"), "#results");
    await click(page, 'label[for="unit-imperial"]');
    compare(rows, "Imperial display of the 490 kg result", "1,080 lb", await text(page, "#remainingValue"));
    await click(page, 'label[for="unit-metric"]');
    compare(rows, "Back to metric", "490 kg", await text(page, "#remainingValue"));
    await aria(page, "#results", path.join(dir, "results.aria.json"));
    await shot(page, path.join(dir, "payload-h1.png"), "h1");
  } finally {
    await opened.context.close();
  }
  write(path.join(dir, "cases.md"), report(rows));
  write(path.join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  return rows.some(function (row) { return !row.pass; }) ? 1 : 0;
}

async function axleCheck(ctx) {
  const rows = [];
  const dir = ctx.evidence;
  const opened = await openPage(ctx.browser, ctx.baseUrl);
  const page = opened.page;
  try {
    await zeroKit(page);
    await setInput(page, "#frontAxle", "1600");
    await setInput(page, "#rearAxle", "1600");
    await setInput(page, "#wbFrontAxle", "1400");
    await setInput(page, "#wbRearAxle", "1600");
    compare(rows, "Loaded mode, limits 1600/1600, ticket 1400/1600, total 3000 kg", "Pass", await text(page, "#axleStatusValue"));
    compare(rows, "Loaded pass detail", "As driven — front/rear vs VIN plate", await text(page, "#axleStatusSub"));
    await click(page, 'label[for="axleModeEmpty"]');
    compare(rows, "Empty weighbridge mode with the same ticket under the limits", "Pass (base van)", await text(page, "#axleStatusValue"));
    await click(page, 'label[for="axleModeLoaded"]');
    await setInput(page, "#wbRearAxle", "1700");
    compare(rows, "Rear ticket 1700 kg over a 1600 kg limit", "FAIL", await text(page, "#axleStatusValue"));
    compare(rows, "Rear fail detail", "Rear over the VIN plate even if total MAM is OK. Do not drive until you lose rear weight.", await text(page, "#axleStatusSub"));
    await setInput(page, "#wbFrontAxle", "100");
    await setInput(page, "#wbRearAxle", "100");
    const sanityShown = await page.$eval("#warnAxleSanity", function (el) { return el.classList.contains("show"); });
    compare(rows, "Ticket 100 kg + 100 kg against a 3000 kg total", "sanity warning shown", sanityShown ? "sanity warning shown" : "sanity warning hidden");
    await shot(page, path.join(dir, "axle-sanity.png"), "#results");
    await aria(page, "#axleStatusBox", path.join(dir, "axle.aria.json"));
  } finally {
    await opened.context.close();
  }
  write(path.join(dir, "cases.md"), report(rows));
  write(path.join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  return rows.some(function (row) { return !row.pass; }) ? 1 : 0;
}

async function vehicleLookup(ctx) {
  const rows = [];
  const dir = ctx.evidence;
  const opened = await openPage(ctx.browser, ctx.baseUrl);
  const page = opened.page;
  try {
    await setInput(page, "#vrm", "DEMO3500");
    await click(page, "#lookupBtn");
    await page.waitForFunction(function () {
      const el = document.getElementById("lookupStatus");
      return el && el.textContent.indexOf("Demo record") !== -1;
    }, { timeout: 10000 });
    const status = await text(page, "#lookupStatus");
    compare(rows, "Look up DEMO3500", "status contains Demo record", status.indexOf("Demo record") !== -1 ? "status contains Demo record" : status);
    compare(rows, "DEMO3500 identity", "Fiat Ducato (2018)", await text(page, "#identityTitle"));
    compare(rows, "DEMO3500 MAM field", "3500", await value(page, "#mam"));
    compare(rows, "DEMO3500 Mass in Service field", "3080", await value(page, "#miro"));
    compare(rows, "DEMO3500 status names the catalogue figure", "status contains 3080", status.indexOf("3080") !== -1 ? "status contains 3080" : status);
    await shot(page, path.join(dir, "demo3500.png"), "#calculator-inputs");
    await setInput(page, "#make", "Fiat");
    await setSelect(page, "#model", "Ducato");
    await setInput(page, "#yearOfManufacture", "2018");
    await click(page, "#lookupSpecBtn");
    await page.waitForFunction(function () {
      const el = document.getElementById("lookupStatus");
      return el && el.textContent.indexOf("Fiat Ducato X290") !== -1;
    }, { timeout: 10000 });
    compare(rows, "Look up make Fiat, model Ducato, year 2018", "status contains Fiat Ducato X290", (await text(page, "#lookupStatus")).indexOf("Fiat Ducato X290") !== -1 ? "status contains Fiat Ducato X290" : await text(page, "#lookupStatus"));
    compare(rows, "Catalogue Mass in Service field", "3080", await value(page, "#miro"));
  } finally {
    await opened.context.close();
  }
  write(path.join(dir, "cases.md"), report(rows));
  write(path.join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  return rows.some(function (row) { return !row.pass; }) ? 1 : 0;
}

async function tyrePressure(ctx) {
  const rows = [];
  const dir = ctx.evidence;
  const opened = await openPage(ctx.browser, ctx.baseUrl + "tyres.html");
  const page = opened.page;
  try {
    compare(rows, "Tyres page heading", "Motorhome Tyre Pressure", await text(page, "h1"));
    await click(page, "#loadExample");
    compare(rows, "Load an example, front cold", "3.0 bar", await text(page, "#frontValue"));
    compare(rows, "Load an example, front PSI", "43.5 PSI", await text(page, "#frontAlt"));
    compare(rows, "Load an example, rear cold", "3.5 bar", await text(page, "#rearValue"));
    compare(rows, "Load an example, rear PSI", "50.8 PSI", await text(page, "#rearAlt"));
    compare(rows, "Load an example, dock", "3.0 / 3.5 bar", await text(page, "#dockValue"));
    const badge = await text(page, "#familyBadge");
    compare(rows, "Example badge", "badge contains GREEN", badge.indexOf("GREEN") !== -1 ? "badge contains GREEN" : badge);
    await shot(page, path.join(dir, "example-pressures.png"), "#answers");
    await setInput(page, "#convBar", "4.5");
    compare(rows, "Converter 4.5 bar", "65.3", await value(page, "#convPsi"));
    await aria(page, "#answers", path.join(dir, "answers.aria.json"));
  } finally {
    await opened.context.close();
  }
  write(path.join(dir, "cases.md"), report(rows));
  write(path.join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  return rows.some(function (row) { return !row.pass; }) ? 1 : 0;
}

async function missingTyreSize(ctx) {
  const rows = [];
  const dir = ctx.evidence;
  const before = fs.existsSync(ctx.missingLog) ? fs.readFileSync(ctx.missingLog, "utf8") : "";
  const opened = await openPage(ctx.browser, ctx.baseUrl + "tyres.html");
  const page = opened.page;
  try {
    await setInput(page, "#sidewall", "205/55R16 91V");
    await page.waitForSelector("#missingSize:not([hidden])", { timeout: 5000 });
    compare(rows, "Uncovered P-metric sidewall 205/55R16 91V", "We don’t have this size yet", await text(page, "#missingSize h2"));
    const sendVisible = await page.$eval("#captureSend", function (el) { return el.textContent.trim(); });
    compare(rows, "Research form is on the page", "Send this size", sendVisible);
    await page.waitForFunction(function () {
      const el = document.getElementById("autoNoteLine");
      return el && !el.hidden;
    }, { timeout: 5000 }).catch(function () {});
    await sleep(400);
    const after = fs.existsSync(ctx.missingLog) ? fs.readFileSync(ctx.missingLog, "utf8") : "";
    const added = after.slice(before.length).trim();
    let record = null;
    if (added) {
      const last = added.split("\n").filter(Boolean).pop();
      try { record = JSON.parse(last); } catch (err) { record = null; }
    }
    const emailEmpty = record && !record.email;
    const auto = record && record.source === "auto" && record.size === "205/55R16 91V";
    compare(rows, "Auto-note side effect in the verification log", "source auto for 205/55R16 91V and email empty", auto && emailEmpty ? "source auto for 205/55R16 91V and email empty" : (added || "no log line"));
    if (record) {
      record.email = record.email ? "[redacted]" : "";
      write(path.join(dir, "missing-size-record.json"), JSON.stringify(record, null, 2));
    }
    await shot(page, path.join(dir, "missing-size.png"), "#missingSize");
  } finally {
    await opened.context.close();
  }
  write(path.join(dir, "cases.md"), report(rows));
  write(path.join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  return rows.some(function (row) { return !row.pass; }) ? 1 : 0;
}

async function savedFigures(ctx) {
  const rows = [];
  const dir = ctx.evidence;
  const opened = await openPage(ctx.browser, ctx.baseUrl);
  const page = opened.page;
  try {
    await setInput(page, "#mam", "3850");
    compare(rows, "After typing MAM 3850, before reload", "#restoreVan hidden", (await hidden(page, "#restoreVan")) ? "#restoreVan hidden" : "#restoreVan visible");
    await page.reload({ waitUntil: "domcontentloaded" });
    await boot(page);
    compare(rows, "Reload does not apply the save by itself", "3500", await value(page, "#mam"));
    compare(rows, "Restore last van is offered on the next load", "#restoreVan visible", (await hidden(page, "#restoreVan")) ? "#restoreVan hidden" : "#restoreVan visible");
    await click(page, "#restoreVan");
    compare(rows, "Click Restore last van", "3850", await value(page, "#mam"));
    await shot(page, path.join(dir, "restored-mam.png"), "#calculator-inputs");
    await click(page, "#clearVan");
    compare(rows, "Click Clear saved van", "3500", await value(page, "#mam"));
    compare(rows, "Banner after clear", "#savedVanBanner hidden", (await hidden(page, "#savedVanBanner")) ? "#savedVanBanner hidden" : "#savedVanBanner visible");
  } finally {
    await opened.context.close();
  }
  const tyres = await openPage(ctx.browser, ctx.baseUrl + "tyres.html");
  try {
    await setInput(tyres.page, "#sidewall", "LT265/70R17 121/118S");
    await tyres.page.reload({ waitUntil: "domcontentloaded" });
    await boot(tyres.page);
    compare(rows, "Tyres reload does not fill the sidewall", "#sidewall empty", (await value(tyres.page, "#sidewall")) === "" ? "#sidewall empty" : await value(tyres.page, "#sidewall"));
    compare(rows, "Restore last tyres on the next load", "#restoreTyres visible", (await hidden(tyres.page, "#restoreTyres")) ? "#restoreTyres hidden" : "#restoreTyres visible");
    await click(tyres.page, "#restoreTyres");
    compare(rows, "Click Restore last tyres", "LT265/70R17 121/118S", await value(tyres.page, "#sidewall"));
    await click(tyres.page, "#clearTyres");
    compare(rows, "Click Clear saved on tyres", "#sidewall empty", (await value(tyres.page, "#sidewall")) === "" ? "#sidewall empty" : await value(tyres.page, "#sidewall"));
  } finally {
    await tyres.context.close();
  }
  write(path.join(dir, "cases.md"), report(rows));
  write(path.join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  return rows.some(function (row) { return !row.pass; }) ? 1 : 0;
}

async function sitePages(ctx) {
  const rows = [];
  const dir = ctx.evidence;
  const origin = ctx.baseUrl.replace(/\/$/, "");
  const home = await httpGet(origin + "/");
  const tyres = await httpGet(origin + "/tyres.html");
  const redirect = await httpGet(origin + "/index.html", "manual");
  compare(rows, "GET /", "200 and payload h1", home.status === 200 && home.body.indexOf("<h1>Motorhome Payload Calculator</h1>") !== -1 ? "200 and payload h1" : String(home.status));
  compare(rows, "GET /tyres.html", "200 and tyres h1", tyres.status === 200 && tyres.body.indexOf("<h1>Motorhome Tyre Pressure</h1>") !== -1 ? "200 and tyres h1" : String(tyres.status));
  compare(rows, "GET /index.html", "301 to /", redirect.status === 301 && redirect.location === "/" ? "301 to /" : (redirect.status + " " + redirect.location));
  const robots = await httpGet(origin + "/robots.txt");
  const robotsLines = String(robots.body || "").split(/\r?\n/).map(function (line) { return line.trim(); }).filter(function (line) {
    return line && line.charAt(0) !== "#";
  });
  const robotsOk = robots.status === 200
    && robotsLines.indexOf("User-agent: *") !== -1
    && robotsLines.indexOf("Allow: /") !== -1
    && robotsLines.indexOf("Disallow: /api/") !== -1
    && robotsLines.indexOf("Disallow: /") === -1
    && robotsLines.indexOf("Sitemap: https://motorhomepayload.co.uk/sitemap.xml") !== -1;
  compare(rows, "GET /robots.txt", "200 allow /, disallow /api/, sitemap", robotsOk ? "200 allow /, disallow /api/, sitemap" : (robots.status + " " + String(robots.body || "").replace(/\s+/g, " ").trim()));
  const sitemap = await httpGet(origin + "/sitemap.xml");
  const sitemapOk = sitemap.status === 200
    && sitemap.body.indexOf("https://motorhomepayload.co.uk/</loc>") !== -1
    && sitemap.body.indexOf("https://motorhomepayload.co.uk/tyres.html") !== -1;
  compare(rows, "GET /sitemap.xml", "200 and both public URLs", sitemapOk ? "200 and both public URLs" : String(sitemap.status));
  const opened = await openPage(ctx.browser, ctx.baseUrl);
  try {
    await click(opened.page, 'nav[aria-label="Hub tools"] a[href="tyres.html"]');
    await opened.page.waitForSelector("h1");
    await boot(opened.page);
    compare(rows, "Header Tyres link", "Motorhome Tyre Pressure", await text(opened.page, "h1"));
    await click(opened.page, 'nav[aria-label="Hub tools"] a[href="/"]');
    await opened.page.waitForSelector("h1");
    await boot(opened.page);
    compare(rows, "Header Payload link", "Motorhome Payload Calculator", await text(opened.page, "h1"));
    await shot(opened.page, path.join(dir, "payload-header.png"));
  } finally {
    await opened.context.close();
  }
  write(path.join(dir, "cases.md"), report(rows));
  write(path.join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  return rows.some(function (row) { return !row.pass; }) ? 1 : 0;
}

const RUNNERS = {
  "payload-calculator": payloadCalculator,
  "axle-check": axleCheck,
  "vehicle-lookup": vehicleLookup,
  "tyre-pressure": tyrePressure,
  "missing-tyre-size": missingTyreSize,
  "saved-figures": savedFigures,
  "site-pages": sitePages
};

async function run(feature, ctx) {
  return RUNNERS[feature](ctx);
}

module.exports = { run };
