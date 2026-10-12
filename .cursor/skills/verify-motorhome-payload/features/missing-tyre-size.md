# Missing tyre size

When the sidewall is outside the published tables, the tyres page shows We don’t have this size yet and does not invent a pressure. Typing that size also sends a research note.

## Sub-features

- `missing-panel` shows the research form for an uncovered size.
- `missing-auto` posts that size to `/api/missing-size` about 800 ms later, with no email.
- `missing-send` is the Send this size button. The helper does not press it.

## How to get to it (user POV)

- Open `/tyres.html`.
- Type a sidewall the tables do not cover, such as `205/55R16 91V`, into Sidewall code (`#sidewall`).
- The panel `#missingSize` appears under the cold-inflation result.
- Send this size (`#captureSend`) posts the form. Email is optional. The Website field is a honeypot and must stay empty.

## Driving it with verify-motorhome

Preconditions:

- Doctor has passed.
- Launch set `MISSING_SIZE_LOG_PATH` to `run/missing-sizes.jsonl`. If that variable is missing, the note would fall through to `data/missing-sizes.jsonl`. Do not drive this feature against production.

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive missing-tyre-size
```

- **Type the uncovered size.** Set `#sidewall` to `205/55R16 91V`. Do not type an email. Leave `#captureWebsite` empty.
- **Read the panel.** The heading is `We don’t have this size yet`. The button text is `Send this size`. `#frontValue` stays an em dash.
- **Read the side effect.** Wait until `#autoNoteLine` is visible, then read the new JSON line in `run/missing-sizes.jsonl`. EXPECTED: `size` is `205/55R16 91V`, `source` is `auto`, `email` is empty. Copy that object into the evidence folder. Do not click Send.

`parseSidewall("205/55R16 91V")` is family P. `coldPressureForAxle()` returns `error: "no-table"` and `reason: "p-metric"`. `isUncoveredRefuse()` is true, which is what opens the panel. The auto POST body uses `auto: true`, and `buildRecord()` stores `source: "auto"`. There is no pressure to expect. A number on this size would be a failure even if the rest of the page looks fine.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Sidewall 205/55R16 91V | Panel heading We don’t have this size yet. No cold pressure. Log line source auto, size 205/55R16 91V, email empty. | Filled by `drive missing-tyre-size` | | |

Goodyear and Yokohama are also refusals (`brand-later`). They are not in the automated drive. Confirm with `detectMaker()` before claiming a pressure.

## Gotchas

- The auto note is a real POST. Cleanup deletes `run/missing-sizes.jsonl`. The evidence copy is the proof that remains.
- Clicking Send posts a second line. The helper stops on the auto note so the run does not double-write.
- A honeypot value makes the server ignore the note (`ignored: true`) and the panel can still look successful. Leave Website empty.
- The mailto fallback appears only when the server has `MISSING_SIZE_NOTIFY_EMAIL`. Do not set that for a drive.
- Rate limit is 30 notes per 10 minutes per client. A tight retry loop will get HTTP 429.
