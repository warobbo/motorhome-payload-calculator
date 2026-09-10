# Motorhome Payload Calculator

A free, mobile-first **UK motorhome / campervan payload hub**: the payload calculator plus a tyre-pressure tool for non-OEM sizes. Built for checking whether a loaded van stays under its legal MAM (especially 3.5-tonne Fiat Ducato and Peugeot Boxer conversions).

The site is static HTML/CSS/JS plus a tiny Node server. Registration lookup is proxied through `/api/vehicle-lookup` so the DVLA key stays on Render, not in the public page. Tyre figures never leave the browser.

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
- Vehicle base (MAM, Mass in Service, optional weighbridge empty weight, axle ratings)
- People, pets, water, diesel, gas bottles, batteries, solar and touring kit
- Metric (kg / litres) by default, with a UK imperial toggle (lb / UK gallons)
- Remembers the last figures in `localStorage`
- Typical 3.5t Ducato/Boxer and light-weekend presets
- “What if I empty the water?” comparison
- Printable results and a weighbridge disclaimer
- **Tyres tool** (`tyres.html`): cold front and rear pressure from the sidewall plus axle loads. **LT, C and CP sizes on 15–18″** use an embedded Continental TRA-standard / ETRTO van / ETRTO camping table (kg per axle at bar). The **2025 row is used for LT265/65R17** where it differs from older books. Same size + different load index = different row. Rim not 15–18″, or a size / LI we do not have, is refused. Sidewall decoder, bar ↔ PSI converter, and an optional notepad are helpers. Refuses a number if the tyre is outside the table or overloaded.

## How the numbers work

Internal maths is always metric.

- **Base weight** is the optional weighed-empty figure, otherwise Mass in Service (the V5 empty-van figure; handbooks often call this MIRO).
- **Mass in Service** assumes a 75 kg driver and 90% fuel. Enter your real driver weight — only the extra above 75 kg is added. A full diesel tank only adds the top-up above 90% (about 8 kg on 90 L at 100%). A weighed-empty ticket adds the full driver and the full tank on top. Fresh water is treated as extra.
- **Water** is 1 kg per litre. **Diesel** defaults to 0.84 kg/L.
- Gas “6 / 9 / 13 kg” labels are the gas only; full-bottle defaults include the steel cylinder (a full 9 kg bottle is about 18.5 kg).

This is an **estimate**. Confirm on a calibrated weighbridge before you treat the result as legal.

## Registration lookup

The official DVLA Vehicle Enquiry API returns **make** and **year**, plus **revenue weight** (kg). **Model** and **Mass in Service** are not on the DVLA record. After a live plate lookup the model field stays blank unless MOT history supplies an exact van-maker model — converter brands (Hymer and similar coachbuilts) are never filled with Ducato, Boxer, Relay or Sprinter. Pick the platform from the list if you know it. Mass in Service is cleared so you can enter the V5 or weighbridge figure. You can also choose make, model and year and press **Look up make / model / year** to apply typical 3.5t MAM and Mass in Service figures.

Without an API key, these demo plates still work:

- `DEMO3500` — Fiat Ducato 3,500 kg
- `BOXER35` — Peugeot Boxer 3,500 kg
- `RELAY35` — Citroën Relay 3,500 kg
- `SPRINT35` — Mercedes-Benz Sprinter 3,500 kg

Live UK plates need a free [DVLA Vehicle Enquiry](https://developer-portal.driver-vehicle-licensing.api.gov.uk/) key. Do not put the key in client JavaScript or commit `.env`.

**On Render (production):** Dashboard → the web service → **Environment** → add `DVLA_API_KEY` → Save. Render restarts the service. Optional `MOT_API_KEY` (DVSA MOT history trade API) fills the model when DVLA does not. `render.yaml` declares both keys with `sync: false` so the values stay in the dashboard, not the repo.

**Browser fallback:** open `/?setup=1` (not linked from the public page) and paste a Vehicle Enquiry key. It is stored in this browser only (`localStorage`) and sent with lookups from that device. A key you saved earlier is still sent even when the setup form is hidden.

**On this machine:** copy `.env.example` to `.env`, paste the key, restart `npm start`.

## Hosting on Render

This is a Node web service, not a static site.

| Setting | Value |
| --- | --- |
| Runtime | Node **22** (pinned; do not use `>=18` or Render may pick a future major) |
| Build command | `npm install` |
| Start command | `npm start` |
| Instance | Binds `0.0.0.0` and uses Render’s `PORT` |

`npm install` runs `scripts/write-og-image.js` as a postinstall step. That script keeps a valid `og-image.png`, rebuilds it from optional `og-image.b64`, or generates a branded 1200×630 PNG. If none of that is possible it logs `Skipping og-image.png` and exits 0 so the Render build still succeeds. The generated PNG is a build artefact (gitignored); do not commit `DVLA_API_KEY`.

After adding `DVLA_API_KEY`, wait for the deploy to go live, then hard-refresh the calculator and look up a real plate.

Public URL is [https://motorhomepayload.co.uk](https://motorhomepayload.co.uk) (non-www). Tyres: [https://motorhomepayload.co.uk/tyres.html](https://motorhomepayload.co.uk/tyres.html). `robots.txt`, `sitemap.xml` and `og-image.png` are static files next to `index.html`.
