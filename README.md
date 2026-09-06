# Motorhome Payload Calculator

A free, mobile-first **UK motorhome / campervan payload calculator** for checking whether a loaded van stays under its legal MAM (especially 3.5-tonne Fiat Ducato and Peugeot Boxer conversions).

The calculator is a single HTML page. Registration lookup uses a tiny `/api/vehicle-lookup` proxy so DVLA keys never sit in the browser.

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

The official DVLA Vehicle Enquiry API returns **make** and **revenue weight** (kg). It does **not** return MIRO or a guaranteed model. On Ducato / Boxer vans the revenue weight is usually the plated MAM; always confirm on the VIN plate.

Without an API key, these demo plates work:

- `DEMO3500` — Fiat Ducato 3,500 kg
- `BOXER35` — Peugeot Boxer 3,500 kg
- `RELAY35` — Citroën Relay 3,500 kg
- `SPRINT35` — Mercedes-Benz Sprinter 3,500 kg

For live lookups, copy `.env.example` to `.env` and add a free key from the [DVLA developer portal](https://developer-portal.driver-vehicle-licensing.api.gov.uk/), or paste the key in the lookup panel. Restart `npm start` after changing `.env`.

Optional `MOT_API_KEY` (DVSA MOT history trade API) fills the model when DVLA does not.

## Hosting

Copy the project to any host that can run the Node server or Vercel’s `/api/vehicle-lookup` function. Replace the `https://www.example.com/` canonical, Open Graph and Twitter URLs (and `og:image`) with your real domain before publishing.
