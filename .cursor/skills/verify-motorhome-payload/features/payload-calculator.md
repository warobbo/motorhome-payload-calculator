# Payload calculator

The payload page turns a plated MAM and a van base (Mass in Service, or an empty weighbridge ticket) plus people, fluids, gas, electrical gear and kit into a remaining-payload figure. Internal maths is metric. The screen rounds to the nearest kilogram or pound.

## Sub-features

- `payload-first-paint` shows the built-in defaults before any restore.
- `payload-presets` replace the form with the Typical, Light, Family, or Reset bundles in `app.js`.
- `payload-bare` is MAM minus Mass in Service when nothing extra is added.
- `payload-driver` adds only the kilograms above 75 on a Mass in Service base, and the whole driver on a weighed-empty base.
- `payload-water` treats water as 1 kg per litre and can show the emptied-tank comparison.
- `payload-fuel` adds diesel only above the 90% already assumed in Mass in Service, unless the base is a weighed-empty ticket.
- `payload-custom` adds name × weight × quantity, and a blank weight adds nothing.
- `payload-units` switches the same kilogram result to pounds.

## How to get to it (user POV)

- Open `/` or the header link Payload.
- The results sit in Loaded weight vs MAM (`#results`) and in the bottom dock (`#dockValue`).
- Presets are the four buttons under Start from a typical van. A selected preset is a soft pine outline (`aria-pressed="true"`). It does not become a second filled button. Look up vehicle stays the only filled call to action.
- Sections Vehicle base, People & pets, Fluids, Gas bottles, Electrical & solar, and Gear & other hold the inputs. Gas, Electrical, and Gear start closed.
- Each + or − stepper’s accessible name includes that visible symbol, for example `− Fewer additional adults` and `+ More additional adults`. Custom kit rows use `− Fewer of this item` and `+ More of this item`, and the Item, Weight each and Quantity fields have labels.
- Metric and Imperial are the unit radios in the header.

## Driving it with verify-motorhome

Preconditions:

- Doctor has passed.
- The browser context has no `mh-payload-calc-v1` save.

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive payload-calculator
```

- **First paint.** Open `/`. Read `#remainingValue` and `#totalWeight`. EXPECTED below.
- **Presets.** Click `#preset-typical`, `#preset-light`, `#preset-family`, then `#preset-reset`. Read `#remainingValue` after each click.
- **Bare van.** Click Reset, then set MAM `3500`, Mass in Service `3000`, empty weighbridge blank, driver `75`, additional adults `0`, children `0`, pets `0`, fresh/grey/black fill `0`, fuel `90` L at `90%` and density `0.84`, gas quantities `0`, leisure batteries None, solar None, inverter `0`, extras `0`, awning/ramps/furniture/generator/toolbox off, bikes `0`, food people `0`, miscellaneous `0`.
- **Water.** On that bare van set fresh capacity `100` and fresh fill `100`. Read `#remainingValue` and `#waterWhatIf`. Click `#emptyWater`.
- **Custom kit.** Click `#addCustomKit`, name `Chairs`, weight `2`, quantity `2`. Then click Remove.
- **Driver.** Set `#driverKg` to `85`. Then click Imperial, then Metric.

Formulas from `app.js` `compute()`, `lib/driver-payload.js`, and `lib/fuel-payload.js`. Display uses `toLocaleString("en-GB")` with 0 fraction digits, and a Unicode minus (U+2212) when the result is negative. `KG_PER_LB` is `0.45359237`.

Defaults (`DEFAULTS` in `app.js`): base 3050, people 1×80, water 90×50%, fuel extra 0 (fill is already 90%), gas 1×13, battery 12, gear 12 food + 20 misc + 4.5 ramps + 10 toolbox. Added 196.5. Total 3246.5. Remaining 253.5, shown as 254 kg. Total shown as 3,247 kg.

Typical preset: base 3120, added 385.8, total 3505.8, remaining −5.8, shown as −6 kg.

Light preset: base 3050, added 179.7, total 3229.7, remaining 270.3, shown as 270 kg.

Family preset: base 3120, added 508.6, total 3628.6, remaining −128.6, shown as −129 kg.

Bare van: added 0, total 3000, remaining 500 kg. Plated payload 3500−3000 = 500 kg. Status text is Comfortable margin under 3,500 kg MAM.

100 L fresh on the bare van adds 100 kg, remaining 400 kg. The what-if line is `Emptying fresh, grey and black water would free 100 kg and leave 500 kg remaining.` After the button, fill levels are 0 and remaining is 500 kg again.

Custom 2 kg × 2 adds 4 kg (`lib/custom-kit.js`), remaining 496 kg. Removing it returns 500 kg.

Driver 85 on Mass in Service adds 85−75 = 10 kg, remaining 490 kg. In pounds, 490 / 0.45359237 = 1080.265…, shown as 1,080 lb.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh page, defaults | 254 kg remaining, 3,247 kg total | Filled by `drive payload-calculator` into `evidence/<run-id>/payload-calculator/cases.md` | | |
| Typical 3.5t preset | −6 kg | same evidence file | | |
| Light weekend preset | 270 kg | same evidence file | | |
| Family of 4 preset | −129 kg | same evidence file | | |
| Reset to defaults | 254 kg | same evidence file | | |
| Bare van (inputs above) | 500 kg remaining, 3,000 kg total, plated 500 kg | same evidence file | | |
| Bare van, 100 L fresh at 100% | 400 kg, what-if frees 100 kg and leaves 500 kg | same evidence file | | |
| Empty the water | 500 kg, tanks already empty | same evidence file | | |
| Custom Chairs 2 kg × 2 | 496 kg | same evidence file | | |
| Driver 85 kg | 490 kg, or 1,080 lb in imperial | same evidence file | | |

Fuel top-up is not in the automated drive. On the bare van, fuel fill 100% adds 90×0.10×0.84 = 7.56 kg, remaining 492.44 kg, shown as 492 kg. The fuel row rounds 7.56 kg to 8 kg.

A weighed-empty ticket is not in the automated drive. Bare van plus empty ticket 3100 kg and driver 85 kg uses the full driver (85) and the full 90% tank (90×0.90×0.84 = 68.04). Added 153.04. Total 3253.04. Remaining 246.96 kg, shown as 247 kg. Mass in Service is ignored while the ticket is above 0.

MAM blank shows `—` and the text `MAM is not entered.` MAM 10001 does not calculate: the summary is `MAM is above 10,000 kg (22,046 lb). Check the VIN plate or weighbridge ticket.`

## Gotchas

- The first paint uses defaults. A saved van is not applied until Restore last van. A leftover save makes the first paint look like a pass while the user's van is still hidden.
- Inputs are ignored while the page is still booting (one animation frame). The helper waits for that frame.
- Gas, Electrical, and Gear start closed. Fields inside them still exist, but a user opens the section first.
- Imperial is a display change. Switching back to Metric does not keep pound figures as kilograms.
- The minus sign on an overload is U+2212, not a hyphen.
- Print opens every section for the print stylesheet. A headless run does not prove a paper layout.
- Do not treat the brochure plated payload as the remaining figure. Remaining subtracts the kit as well.
