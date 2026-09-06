# Motorhome Payload Calculator

A free, mobile-first **UK motorhome / campervan payload calculator** for checking whether a loaded van stays under its legal MAM (especially 3.5-tonne Fiat Ducato and Peugeot Boxer conversions).

The whole app is a single HTML file. There is no backend, no account, and no build step.

## Open it

- Double-click `index.html`, or
- Serve the folder and open it in a browser:

```bash
python3 -m http.server 43127
```

Then visit [http://127.0.0.1:43127](http://127.0.0.1:43127).

## What it does

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

## Hosting

Copy `index.html` to any static host. Replace the `https://www.example.com/` canonical, Open Graph and Twitter URLs (and `og:image`) with your real domain before publishing.
