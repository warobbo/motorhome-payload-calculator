# Motorhome Payload Calculator

A free, mobile-first **UK motorhome / campervan payload hub**: the payload calculator plus a tyre-pressure tool for non-OEM sizes. Built for checking whether a loaded van stays under its plated **Maximum Authorised Mass (MAM)** — the heaviest your van is allowed to be on the road. For UK campervans and motorhomes at any plated weight — light vans around 2800–3200 kg (e.g. VW Transporter-style), motorhomes at 3500, 3850, 4500 kg and up.

The public site is static HTML/CSS/JS. Payload maths, tyre pressures, demo plates, and the van catalogue run in the browser. An optional missing-size note is posted to a Cloudflare Worker when that endpoint is configured. `npm start` is only for local preview and the verification helper. See [MIGRATION.md](MIGRATION.md) for the Render static site and the Worker.

## Open it

- Double-click `index.html`, or
- Serve the folder and open it in a browser:

```bash
npm start
```

Then visit [http://localhost:4173](http://localhost:4173) (payload) or [http://localhost:4173/tyres.html](http://localhost:4173/tyres.html) (tyres).

## What it does

- UK registration lookup for make and plated revenue weight (often the MAM)
- Live remaining-payload calculation as you type
- Vehicle base (empty weighbridge ticket first, then V5 Mass in Service, MAM, plate axle ratings)
- Empty or Loaded weighbridge axle check (front/rear kg vs plate limits — never invented from kit)
- People, pets, water, diesel, gas bottles, batteries, solar, touring kit and custom extra items
- Metric (kg / litres) by default, with a UK imperial toggle (lb / UK gallons)
- Can restore the last figures from this device (`localStorage`) — first paint stays empty until you tap Restore last van
- Example presets (including a typical 3.5 t setup) — change MAM to match the plate
- “What if I empty the water?” comparison
- Printable results and a weighbridge disclaimer
- **Tyres tool** (`tyres.html`): for **LT** tyres and **changed** wheel or tyre sets. Same-size C or CP renewals are pointed to the door sticker / handbook. First paint stays empty until you tap **Restore last tyres** (saved on this phone only). Axle weights in a Payload deep-link (`?front=` / `?rear=`) still apply on load — that is a weighbridge handoff, not a silent restore. **GREEN full curves:** Continental / General Tyre Databook for listed LT, C and CP sizes on 15–18″, and **Michelin Agilis CrossClimate C and LT**. **AMBER max-only:** General Grabber LT (AT2 / A/TX spec sheets) and **BFGoodrich All-Terrain T/A KO2** LT — published max load at max cold pressure, not a step curve. **Michelin / CrossClimate Camping CP is refused** — we do not copy a Conti camping row and call it Michelin. The **2025 Conti row is used for LT265/65R17** where it differs from older books. Same size + different load index = different row. Dual stays blank where the maker did not print one. **Conti/General CP single rear** never shows less than **5.5 bar** even if the table step is lower; the table figure is still shown. Goodyear and Yokohama stay refused. The page names its sources. Sidewall decoder, bar ↔ PSI converter, and an optional notepad are helpers. Refuses a number if the tyre is outside the table or overloaded. An uncovered size or brand shows **We don’t have this size yet** and auto-notes the typed size for research — still no invented pressure. Tyre capacity is not permission to exceed vehicle axle, wheel or legal limits.

## How the numbers work

Internal maths is always metric.

- **Base weight** is the optional weighed-empty figure, otherwise Mass in Service (the V5 empty-van figure; handbooks often call this MIRO).
- **Mass in Service** assumes a 75 kg driver and 90% fuel. Enter your real driver weight — only the extra above 75 kg is added. A full diesel tank only adds the top-up above 90% (about 8 kg on 90 L at 100%). A weighed-empty ticket adds the full driver and the full tank on top. Fresh water is treated as extra.
- **Water** is 1 kg per litre. **Diesel** defaults to 0.84 kg/L.
- Gas “6 / 9 / 13 kg” labels are the gas only; full-bottle defaults include the steel cylinder (a full 9 kg bottle is about 18.5 kg).

This is an **estimate**. Confirm on a calibrated weighbridge before you treat the result as legal.

## Registration lookup

The official DVLA Vehicle Enquiry API returns **make** and **year**, plus **revenue weight** (kg). **Model** and **Mass in Service** are not on the DVLA record. After a live plate lookup the model field stays blank unless MOT history supplies an exact van-maker model — converter brands (Hymer and similar coachbuilts) are never filled with Ducato, Boxer, Relay or Sprinter. Pick the platform from the list if you know it. Mass in Service is cleared so you can enter an empty weighbridge ticket (best) or the V5 figure. You can also choose make, model and year and press **Look up make / model / year** to apply typical catalogue figures (often 3.5 t examples).

Without an API key, these demo plates still work in the browser:

- `DEMO3500` — Fiat Ducato 3,500 kg
- `BOXER35` — Peugeot Boxer 3,500 kg
- `RELAY35` — Citroën Relay 3,500 kg
- `SPRINT35` — Mercedes-Benz Sprinter 3,500 kg

Live UK plates need a free [DVLA Vehicle Enquiry](https://developer-portal.driver-vehicle-licensing.api.gov.uk/) key. Do not commit a key. The static site does not keep a server-side key.

**In the browser:** open `/?setup=1` (not linked from the public page) and paste a Vehicle Enquiry key. It is stored in this browser only (`localStorage`). A live lookup is sent from that browser to DVLA. The government API may refuse a browser call. Demo plates and the catalogue do not need the key. A key you saved earlier is still used when the setup form is hidden. Optional MOT history key is the same browser-only path.

## Missing tyre sizes

When the tyres tool refuses an uncovered size, load index or brand, the page offers a research form. That does **not** unlock a pressure.

The tyres page posts the note to `window.MISSING_SIZE_ENDPOINT` (`site-config.js`). Locally that is `/api/missing-size`, and `npm start` appends `data/missing-sizes.jsonl` when `MISSING_SIZE_LOG_PATH` is unset and `NODE_ENV` is not production. The verification helper points the log at `run/missing-sizes.jsonl`.

On the static site the same form posts to the Cloudflare Worker in `worker/`. The Worker returns `{"ok":true,"capture":true}` for GET. A real note is a JSON log line. If `MISSING_SIZE_NOTIFY_URL` is unset, that log is the whole capture. A honeypot `website` value is ignored and not logged. The response does not include a notify address.

## Hosting on Render

Production is a static site. `render.yaml` uses `runtime: static` and publishes `public/`. The build command is `bash scripts/publish-public.sh`. Dashboard steps, the Worker deploy, the domain move, and suspending the old web service are in [MIGRATION.md](MIGRATION.md). Do not delete the old web service.

`npm run build` writes `public/` from `scripts/published-files.txt`. Dotfiles, README, `render.yaml`, and this migration note are not in that directory. `og-image.png` is generated during the build and is gitignored.

`npm start` remains the local preview. It binds `0.0.0.0` and uses `PORT` (default 4173). It is not the production process.

Public URL is [https://motorhomepayload.co.uk](https://motorhomepayload.co.uk) (non-www). Tyres: [https://motorhomepayload.co.uk/tyres.html](https://motorhomepayload.co.uk/tyres.html). `robots.txt`, `sitemap.xml` and `og-image.png` are static files next to `index.html`.
