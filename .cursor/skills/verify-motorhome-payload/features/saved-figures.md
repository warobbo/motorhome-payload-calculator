# Saved on this device

Payload and tyres can keep the last figures in this browser only. The first paint does not apply them. The user presses Restore.

## Sub-features

- `save-payload` writes `mh-payload-calc-v1` after an edit, once the boot frame has passed.
- `restore-payload` puts that save back on the next load.
- `clear-payload` removes it and returns the form to defaults.
- `save-tyres` writes `mh-tyres-v5` after a sidewall edit.
- `restore-tyres` and `clear-tyres` match the tyres buttons.

## How to get to it (user POV)

- Payload: after an edit, Vehicle base can show Saved on this phone only. Restore last van is `#restoreVan`. Clear saved van is `#clearVan`. The banner is `#savedVanBanner`.
- Tyres: Restore last tyres is `#restoreTyres`. Clear saved is `#clearTyres`.
- Nothing is uploaded. Privacy copy on the payload page says figures stay in this browser.

## Driving it with verify-motorhome

Preconditions:

- Doctor has passed.
- Fresh context, so the first load has no banner.

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive saved-figures
```

- **Edit.** On `/`, set `#mam` to `3850`. `#restoreVan` stays hidden on this same visit because the snapshot was taken at load, before the edit.
- **Reload.** `#mam` is back to the default `3500`. `#restoreVan` is visible.
- **Restore.** Click `#restoreVan`. `#mam` is `3850`.
- **Clear.** Click `#clearVan`. `#mam` is `3500` and `#savedVanBanner` is hidden.
- **Tyres.** On `/tyres.html`, set `#sidewall` to `LT265/70R17 121/118S`, reload, confirm the field is empty and `#restoreTyres` is visible, click it, confirm the sidewall text, then click `#clearTyres` and confirm the field is empty.

No calculator EXPECTED beyond the field values. 3850 is the typed MAM, not a derived weight. The sidewall is the typed string, not a pressure.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Set MAM 3850, reload | Field shows 3500 and Restore last van is visible | Filled by `drive saved-figures` | | |
| Click Restore last van | MAM field 3850 | same evidence file | | |
| Click Clear saved van | MAM field 3500 and the banner is hidden | same evidence file | | |
| Type the LT sidewall, reload, Restore last tyres, Clear saved | Empty after reload, the typed sidewall after restore, empty after clear | same evidence file | | |

## Gotchas

- Restore on the same visit, before a reload, is the wrong check. The button is hidden until the next load.
- A deep link `?front=` / `?rear=` on the tyres page fills axle weights immediately. That is not Restore last tyres.
- Clear saved van resets to `DEFAULTS`, including MAM 3500. It does not leave the restored 3850 in place.
- The verification Chrome profile is deleted on cleanup. A pass here does not touch the user's normal browser.
