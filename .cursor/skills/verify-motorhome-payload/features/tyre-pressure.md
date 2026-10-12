# Tyre pressure

The tyres page turns a sidewall and front/rear axle weights into a cold pressure from a published table. If the size or brand is outside those tables, it refuses a number. The Load an example button fills the General Grabber sample that ships in `tyres-app.js`.

## Sub-features

- `tyres-example` loads `LT265/70R17 121/118S` at 1800 kg front and 2100 kg rear.
- `tyres-green` uses the Continental / General LT databook step that covers the axle, and does not divide the axle by 2.
- `tyres-convert` turns bar into PSI with `BAR_TO_PSI` 14.503773773.
- `tyres-refuse` is the missing-size feature, not a guessed pressure.

## How to get to it (user POV)

- Open `/tyres.html`, or the header Tyres link, or the Tyres tool link on the payload results.
- A payload handoff may arrive as `tyres.html?front=1800&rear=2100`. That fills axle weights only. It does not restore a saved sidewall.
- Load an example is `#loadExample` in Tyre you fitted.
- Cold inflation is `#frontValue`, `#frontAlt`, `#rearValue`, `#rearAlt`, and the dock `#dockValue`.
- The converter is Bar (`#convBar`) and PSI (`#convPsi`).

## Driving it with verify-motorhome

Preconditions:

- Doctor has passed.
- Fresh context, so Restore last tyres is not required.

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive tyre-pressure
```

- **Example.** Open `/tyres.html`. Click `#loadExample`. Read the four pressure lines and the dock.
- **Converter.** Set `#convBar` to `4.5` and read `#convPsi`.

`EXAMPLE` in `tyres-app.js` is sidewall `LT265/70R17 121/118S`, brand `General Grabber`, front 1800 kg, rear 2100 kg, two tyres on the axle. `coldPressureForAxle()` uses table `LT265/70R17-LRE-121`. Single column: 2.5 bar is 1760 kg (under 1800), 3.0 bar is 2000 kg (covers 1800). Rear: 3.0 bar is 2000 kg (under 2100), 3.5 bar is 2240 kg (covers 2100). So front 3.0 bar and rear 3.5 bar.

PSI is `round(bar × 14.503773773, 1 decimal)`. 3.0 × 14.503773773 = 43.511… → 43.5. 3.5 × 14.503773773 = 50.763… → 50.8. The screen shows one decimal for bar (`3.0 bar`, `3.5 bar`).

4.5 × 14.503773773 = 65.26698… → 65.3 PSI.

The brand text General Grabber still resolves this listed size on the GREEN databook path (`lt-databook`), not the AMBER Grabber max-only sheet. The badge contains `GREEN`.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Click Load an example | Front 3.0 bar / 43.5 PSI. Rear 3.5 bar / 50.8 PSI. Dock `3.0 / 3.5 bar`. Badge contains GREEN. | Filled by `drive tyre-pressure` | | |
| Converter bar 4.5 | PSI field 65.3 | same evidence file | | |

`lib/tyre-calc.js` `SAMPLE_LT265` is a different size (`LT265/65R17 120/117S`) and is not what the button loads. Do not expect 3.5 bar front / 4.0 bar rear from Load an example.

## Gotchas

- Same-size C or CP shows a nudge toward the door sticker. That nudge is not a pressure.
- AMBER sizes show `Max <bar> bar` and are the published maximum only. Do not treat that as a stepped curve.
- Michelin Camping CP is refused. Do not copy a Continental camping row.
- An uncovered size auto-posts a research note. See the missing-size feature before typing one.
- Tyre capacity is not permission to exceed an axle rating or MAM.
