# Axle check

The axle check compares weighbridge front and rear kilograms with the VIN plate axle ratings. It does not split the payload kit across axles. Pass or fail needs both ratings and both ticket weights.

## Sub-features

- `axle-incomplete` stays on an em dash until both pairs are entered.
- `axle-pass-loaded` passes a loaded ticket that is within both ratings.
- `axle-pass-empty` passes the same ticket in Empty mode and says it is the base van.
- `axle-fail-rear` fails when the rear ticket is over the rear rating, even if total MAM is fine.
- `axle-sanity` warns when front plus rear is far from the known total.

## How to get to it (user POV)

- On `/`, the weighbridge pair is the Front axle kg and Rear axle kg fields above How to use (`#wbFrontAxle`, `#wbRearAxle`).
- Loaded weighbridge and Empty weighbridge are the radios beside those fields.
- VIN ratings are Front axle rating and Rear axle rating in Vehicle base (`#frontAxle`, `#rearAxle`).
- The result is the Axle check card (`#axleStatusValue`, `#axleStatusSub`).

## Driving it with verify-motorhome

Preconditions:

- Doctor has passed.
- Fresh browser context.

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive axle-check
```

- **Set a known total.** Use the bare van from the payload recipe: MAM 3500, Mass in Service 3000, no added kit. Estimated total is 3000 kg.
- **Pass.** Front rating 1600, rear rating 1600, front ticket 1400, rear ticket 1600. Loaded is the default. Sum 3000 equals the total, so the sanity warning stays off. `#axleStatusValue` is `Pass`. Detail is `As driven — front/rear vs VIN plate`.
- **Empty mode.** Click the Empty weighbridge label. Value becomes `Pass (base van)`.
- **Rear fail.** Return to Loaded and set the rear ticket to 1700. Value is `FAIL`. Detail is `Rear over the VIN plate even if total MAM is OK. Do not drive until you lose rear weight.`
- **Sanity.** Set both ticket fields to 100. The value can still be a pass against the 1600 kg ratings. `#warnAxleSanity` gains the class `show` because |200 − 3000| is greater than max(150, 8% of the larger mass). The sentence is `Front plus rear is a long way from the total mass you entered. Check the ticket figures.`

`lib/axle-check.js` `evaluate()` is the source of the labels. The page prints `FAIL` for a fail and the label text for a pass.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Limits 1600/1600, ticket 1400/1600, loaded, total 3000 | Pass | Filled by `drive axle-check` | | |
| Same ticket, Empty mode | Pass (base van) | same evidence file | | |
| Rear ticket 1700, limit 1600, loaded | FAIL and the rear-over sentence | same evidence file | | |
| Ticket 100 and 100 against total 3000 | sanity warning shown | same evidence file | | |

With no ticket and no ratings, `#axleStatusValue` is an em dash. That case is not in the automated drive. The page must not invent axle loads from the kit list.

## Gotchas

- A pass on MAM does not make an axle pass. The rear-fail case is under MAM (1700+1400 = 3100 against MAM 3500) and is still FAIL.
- Empty mode does not prove the trip. The label says base van.
- The sanity check uses the estimated total in Loaded mode and the empty ticket or Mass in Service in Empty mode. A mismatch is a warning, not an automatic FAIL.
- Weighbridge kilograms are not the VIN ratings. The tyres link must be given the ticket figures, not the plate limits.
