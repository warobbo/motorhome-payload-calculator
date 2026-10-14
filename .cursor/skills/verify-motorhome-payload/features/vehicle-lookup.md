# Vehicle lookup

Lookup fills make, year, and a MAM figure. Mass in Service is not on a DVLA record. On this verification server `site-config.js` sets `window.VEHICLE_LOOKUP_ENDPOINT` to `/api/vehicle-lookup`, and the page posts there. That route calls `lib/vehicle-lookup.js` and `lib/van-catalogue.js`. The static site sets the same variable to the Cloudflare Worker route, which calls DVLA with the Worker secret. If that request fails, the page calls those same functions in the browser (demo plates and the catalogue). `GET /api/vehicle-lookup` is what doctor reads for `ok` and `demoPlates`. Make, model, and year can apply a catalogue Mass in Service.

## Sub-features

- `lookup-demo` resolves `DEMO3500` to a Fiat Ducato demo record.
- `lookup-catalogue` applies the Fiat Ducato 2018 catalogue row.
- `lookup-blank` asks for a registration when the field is empty.
- `lookup-live` is the DVLA path. This skill does not call it.

## How to get to it (user POV)

- On `/`, Vehicle base, type a registration in UK registration (`#vrm`) and press Look up vehicle (`#lookupBtn`). Enter works too.
- Or type Make, Model / platform, and Year, then press Look up make / model / year (`#lookupSpecBtn`).
- The status line is `#lookupStatus`. The identity card is `#identityTitle`.
- `/?setup=1` reveals the browser-only key boxes. Do not type a key.

## Driving it with verify-motorhome

Preconditions:

- Doctor has passed.
- Fresh context, so no stored API key is sent.
- Use only the demo plate `DEMO3500` or the catalogue names below.

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive vehicle-lookup
```

- **Demo plate.** Fill `#vrm` with `DEMO3500` and click `#lookupBtn`. Wait until `#lookupStatus` contains `Demo record`.
- **Catalogue.** Fill make `Fiat`, choose model `Ducato`, year `2018`, click `#lookupSpecBtn`. Wait until the status contains `Fiat Ducato X290`.

From `lib/vehicle-lookup.js` and `lib/van-catalogue.js`: `DEMO3500` is a 2018 Fiat Ducato with revenue weight 3500. `applyLookup()` in `app.js` sets MAM from that revenue weight. The source is `demo`, not `dvla`, so the catalogue may fill Mass in Service. The 2014–2026 Ducato row is `miro: 3080`, label `Fiat Ducato X290 3.5t`. The identity heading is `Fiat Ducato (2018)`.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Registration DEMO3500 | Status contains Demo record and 3080. Identity Fiat Ducato (2018). MAM field 3500. Mass in Service field 3080. | Filled by `drive vehicle-lookup` | | |
| Make Fiat, model Ducato, year 2018 | Status contains Fiat Ducato X290. Mass in Service field 3080. | same evidence file | | |

Other demo plates in `lib/vehicle-lookup.js` are `BOXER35`, `RELAY35`, and `SPRINT35`. They are not in the automated drive. Do not invent their Mass in Service: read the matching catalogue row first.

A live plate is not given an EXPECTED Mass in Service here. DVLA does not supply it, and this drive must not send one.

## Gotchas

- After a real DVLA lookup the model stays blank unless MOT history supplies an exact van-maker model. Converter makes are not filled with Ducato. The demo plate is not that path: its source is `demo`, and it does include Ducato.
- A lookup enables save-on-this-device. The next page load will offer Restore. It does not change the numbers until that click.
- `/?setup=1` and any key already in `localStorage` would be sent. The fresh context avoids that. Never paste a key to make doctor pass.
- Empty registration status is `Enter a UK registration first.`
