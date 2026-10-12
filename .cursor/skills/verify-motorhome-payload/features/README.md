# Motorhome Payload verification map

This directory is the maintained source for verifying the user-facing behaviour of the Motorhome Payload Calculator. Read this index before driving the site, then use the matching feature file as the recipe.

Update this feature map in the same PR whenever a build changes pages or tools. A weekly maintain pass runs on Mondays, run by Freddie the Font2's routine. That pass edits only this verify folder, opens at most one PR through the review loop, and stays quiet unless blocked.

## Baseline preconditions

- Launch with `.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome launch`.
- The ready URL is `http://127.0.0.1:<port>/`. The port is `run/port` (default start 4183, not the everyday `npm start` port 4173).
- Run `verify-motorhome doctor` and require the payload h1, the tyres h1, and `lookup ok: true`.
- Drive with `verify-motorhome drive <feature-id>`. Each drive uses a fresh Chrome context, so `localStorage` starts empty.
- Never drive an instance that was not started by this verification run.
- Do not type a DVLA key, a real registration, or an email address.

## Driving conventions

- Start every recipe from a fresh browser context unless it says otherwise.
- Prefer ids, labels, and ARIA names over coordinates.
- Viewport for these commands is 1280×900. Below 980px the page closes payload sections after the third one on boot.
- The commands fill fields by dispatching `input` and `change`. They do not call page functions.
- Calculator rows are INPUT / EXPECTED / ACTUAL. EXPECTED is derived from the code formulas in the feature file. ACTUAL is what that drive read. Do not invent a number to fill a gap.

## Proof and skip reporting

- Capture the action and the resulting state.
- UI proof includes an accessibility snapshot and a screenshot that shows the result.
- Missing-size proof includes the JSONL line the page wrote, with no email.
- Record the feature id on the evidence folder name.
- An unreachable path is reported with the command and the failed precondition. Do not mark it passed via a different path.

## Pages

- `https://motorhomepayload.co.uk/` and local `/` — payload calculator
- `https://motorhomepayload.co.uk/tyres.html` and local `/tyres.html` — tyre pressures
- `/index.html` redirects to `/`
- `/privacy` is a section on the payload page (`#privacy`), not a separate route
- Header Home points at `https://motorhometools.co.uk/`. That site is outside this repo.

## Features

- [Payload calculator](./payload-calculator.md) — remaining payload, presets, water comparison, custom kit, units.
- [Axle check](./axle-check.md) — VIN plate limits against weighbridge front and rear kg.
- [Vehicle lookup](./vehicle-lookup.md) — demo registration and make / model / year catalogue.
- [Tyre pressure](./tyre-pressure.md) — cold inflation from the published tables, plus the bar/PSI converter.
- [Missing tyre size](./missing-tyre-size.md) — refusal and the research note. No invented pressure.
- [Saved on this device](./saved-figures.md) — restore and clear for the van and for tyres.
- [Site pages](./site-pages.md) — the two tools, the `/index.html` redirect, and the header links between them.
