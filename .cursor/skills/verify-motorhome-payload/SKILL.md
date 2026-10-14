---
name: verify-motorhome-payload
description: Drive the Motorhome Payload Calculator website (payload page and tyres page) the way a user does. Use when launching the local site, checking a running instance, proving a calculator result, or reviewing a change to pages or tools in this repo.
---

# Verify Motorhome Payload

The user-facing surface is the website. Payload is `index.html` (`/`). Tyres is `tyres.html`. Payload maths and tyre maths run in the browser. While this Node server is answering, the payload page posts registration and catalogue lookups to `window.VEHICLE_LOOKUP_ENDPOINT` (this server sets that to `POST /api/vehicle-lookup`, the same route the live Node site uses). The static site points that variable at the Cloudflare Worker lookup route. If the request fails, the page uses `lib/vehicle-lookup.js` and `lib/van-catalogue.js` instead. The missing-size form posts to `window.MISSING_SIZE_ENDPOINT` (a Cloudflare Worker on the static site). This skill launches a local Node server (`server.js`) that serves those pages, answers `GET /api/vehicle-lookup` for doctor, and appends `POST /api/missing-size` to the verification JSONL. A dotfile or a dot-folder, including anything inside one, is 404. There is no login. Demo plates work without a DVLA key. Do not print `.env`, `DVLA_API_KEY`, or `MOT_API_KEY`.

Two servers can run if they use different ports. This skill's server is not the user's `npm start` on port 4173. Default verification port is **4183**, or the next free port. Read `run/port` after launch. Do not drive a server this run did not start.

Browser state is a throwaway Chrome profile under `run/chrome-profile`. Missing-size notes from this server go to `run/missing-sizes.jsonl`, not `data/missing-sizes.jsonl`.

Update this feature map in the same PR whenever a build changes pages or tools. A weekly maintain pass runs on Mondays, run by Freddie the Font2's routine. That pass edits only this verify folder, opens at most one PR through the review loop, and stays quiet unless blocked.

## Launch

From the repo root:

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome launch
```

Optional: `VERIFY_PORT=4183` pins the port. `CHROME_PATH` is only needed later, for Drive.

Ready: stdout prints `Motorhome Payload Calculator ready` and `url: http://127.0.0.1:<port>/`. The server log line is the same sentence. The pid is `run/server.pid`. A second launch exits with an error while that pid is still the verification `server.js`.

The process listens on `0.0.0.0` because `server.js` does. Drive it at `127.0.0.1` and the recorded port.

## Doctor

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome doctor
```

Read-only. It passes only when all of these are true:

- `run/server.pid` is alive and its command line contains `server.js`
- that pid is listening on `run/port`
- `GET /` is 200 and contains `<h1>Motorhome Payload Calculator</h1>`
- `GET /tyres.html` is 200 and contains `<h1>Motorhome Tyre Pressure</h1>`
- `GET /api/vehicle-lookup` is JSON with `ok: true` and a `demoPlates` array
- `GET /.gitignore`, `GET /.env`, `GET /.git/config`, and `GET /.cursor/skills/verify-motorhome-payload/SKILL.md` are each 404 with body `Not found`
- none of those bodies contain `DVLA_API_KEY` or `MOT_API_KEY` if those variables are set

It prints `dot paths: 404`, then `liveDvla: true` or `liveDvla: false`, and never the key. Run doctor before the first drive, and again after a drive that behaved oddly.

## Drive

Install the browser driver once if `drive` says puppeteer-core is missing:

```bash
npm install --prefix .cursor/skills/verify-motorhome-payload/helpers
```

Chrome is the system binary (`/usr/bin/google-chrome` unless `CHROME_PATH` is set). The driver uses a 1280×900 viewport so the payload sections are not the small-screen collapse (that starts at 980px).

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive payload-calculator
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive axle-check
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive vehicle-lookup
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive tyre-pressure
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive missing-tyre-size
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive saved-figures
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive site-pages
```

`drive` runs doctor first and exits if the instance is not worth driving. Each command opens a fresh browser context (empty `localStorage`), uses the controls below, and writes `cases.md` with INPUT / EXPECTED / ACTUAL. Recipes and gotchas are in `features/`.

Stable handles:

- Payload heading `h1`, results `#remainingValue`, `#totalWeight`, `#platedPayload`, `#remainingSub`, `#waterWhatIf`, `#emptyWater`, `#dockValue`
- Presets `#preset-typical`, `#preset-light`, `#preset-family`, `#preset-reset`
- Plates `#mam`, `#miro`, `#actualEmpty`, `#driverKg`, `#frontAxle`, `#rearAxle`, `#wbFrontAxle`, `#wbRearAxle`
- Units `label[for="unit-metric"]` and `label[for="unit-imperial"]` (the radios ignore pointer events)
- Axle mode `label[for="axleModeLoaded"]` and `label[for="axleModeEmpty"]`
- Lookup `#vrm`, `#lookupBtn`, `#lookupStatus`, `#identityTitle`, `#make`, `#model`, `#yearOfManufacture`, `#lookupSpecBtn`
- Save `#restoreVan`, `#clearVan`, `#savedVanBanner`
- Tyres `#loadExample`, `#sidewall`, `#frontValue`, `#rearValue`, `#frontAlt`, `#rearAlt`, `#familyBadge`, `#convBar`, `#convPsi`, `#missingSize`, `#captureSend`, `#restoreTyres`, `#clearTyres`
- Nav `nav[aria-label="Hub tools"]`

The helper sets a field by focusing it and dispatching `input` and `change`. That is the same event the page listens for. It does not call `calculate()` or write `state`.

## Evidence

Proof goes in `.cursor/skills/verify-motorhome-payload/evidence/<run-id>/`. Launch creates `<run-id>` and writes `launch.txt`. Doctor writes `doctor.txt`. Each drive writes a feature folder: screenshots, an accessibility snapshot, and `cases.md`.

A proof is the user path: type, click, read the result. Capture the action and the result, not only the final screen. For missing sizes, also read the new line in the verification JSONL (the side effect). Do not follow the off-site Home link, do not type a real registration, and do not type an email into the research form. `liveDvla: true` only means a key is configured. It is not permission to call DVLA.

## Cleanup

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome cleanup
```

Stops the recorded server by its pid (process group), and the recorded Chrome pid only if that command line is Chrome using `run/chrome-profile`. It deletes `run/` (pid, port, log, Chrome profile, missing-size scratch log). It does not delete `evidence/`.

## Helpers

| Helper | Command |
| --- | --- |
| Install driver | `npm install --prefix .cursor/skills/verify-motorhome-payload/helpers` |
| Launch | `.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome launch` |
| Doctor | `.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome doctor` |
| Drive one feature | `.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive <feature-id>` |
| Cleanup | `.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome cleanup` |

`verify-motorhome` is executable. Feature ids match the files in `features/`. `helpers/drives.js` is the drive implementation that command loads. Do not start the site with a hand-written `node server.js` and call it this run: doctor will reject a pid it did not record.
