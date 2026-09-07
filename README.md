# Motorhome Payload Calculator

A free, mobile-first **UK motorhome / campervan payload calculator** for checking whether a loaded van stays under its legal MAM (especially 3.5-tonne Fiat Ducato and Peugeot Boxer conversions).

The calculator is a single HTML page. Registration lookup uses a tiny `/api/vehicle-lookup` proxy so DVLA keys never sit in the public page.

## Open it

- Double-click `index.html`, or
- Serve the folder and open it in a browser:

```bash
npm start
```

Then visit [http://localhost:4173](http://localhost:4173).

## What it does

- UK registration lookup for make and plated revenue weight (often the MAM)
- Live remaining-payload calculation as you type
- Vehicle base (MAM, MIRO, optional weighbridge empty weight, axle ratings)
- People, pets, water, diesel, gas bottles, batteries, solar and touring kit
- Metric (kg / litres) by default, with a UK imperial toggle (lb / UK gallons)
- Remembers the last figures in `localStorage`
- Typical 3.5t Ducato/Boxer and light-weekend presets
- “What if I empty the water?” comparison
- Printable results and a weighbridge disclaimer

## How the numbers work

Internal maths is always metric.

- **Base weight** is the optional weighed-empty figure, otherwise MIRO.
- **MIRO** is assumed to include the driver and 90% fuel unless you untick those options. Fresh water is treated as extra, which matches most UK motorhome handbooks.
- **Water** is 1 kg per litre. **Diesel** defaults to 0.84 kg/L.
- Gas “6 / 9 / 13 kg” labels are the gas only; full-bottle defaults include the steel cylinder (a full 9 kg bottle is about 18.5 kg).

This is an **estimate**. Confirm on a calibrated weighbridge before you treat the result as legal.

## Registration lookup

The official DVLA Vehicle Enquiry API returns **make** and **year**, plus **revenue weight** (kg). **Model** is not on the DVLA record, so the calculator infers it for common van platforms (Ducato, Boxer, Relay, Sprinter, and others). You can also type make, model and year and press **Look up make / model / year** to apply typical 3.5t MAM and MIRO figures.

Without an API key, these demo plates still work:

- `DEMO3500` — Fiat Ducato 3,500 kg
- `BOXER35` — Peugeot Boxer 3,500 kg
- `RELAY35` — Citroën Relay 3,500 kg
- `SPRINT35` — Mercedes-Benz Sprinter 3,500 kg

Live UK plates need a free [DVLA Vehicle Enquiry](https://developer-portal.driver-vehicle-licensing.api.gov.uk/) key. Do not put the key in client JavaScript or commit `.env`.

**On Vercel (or any host):** add `DVLA_API_KEY` in the project environment — on Vercel that is **Project Settings → Environment Variables** — then redeploy. Optional `MOT_API_KEY` (DVSA MOT history trade API) fills the model when DVLA does not.

**Browser fallback:** open `/?setup=1` (not linked from the public page) and paste a Vehicle Enquiry key. It is stored in this browser only (`localStorage`) and sent with lookups from that device. A key you saved earlier is still sent even when the setup form is hidden.

**On this machine:** copy `.env.example` to `.env`, paste the key, restart `npm start`.

## Hosting

Copy the project to any host that can run the Node server (`npm start`) or Vercel’s `/api/vehicle-lookup` function. `vercel.json` includes `lib/**` with that function. Other Node hosts (including Render) should set the same `DVLA_API_KEY` / `MOT_API_KEY` environment variables.

Replace the `https://www.example.com/` canonical, Open Graph and Twitter URLs (and `og:image`) with your real domain before publishing.
