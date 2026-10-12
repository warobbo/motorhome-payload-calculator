| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| After typing MAM 3850, before reload | #restoreVan hidden | #restoreVan hidden | none | PASS |
| Reload does not apply the save by itself | 3500 | 3500 | none | PASS |
| Restore last van is offered on the next load | #restoreVan visible | #restoreVan visible | none | PASS |
| Click Restore last van | 3850 | 3850 | none | PASS |
| Click Clear saved van | 3500 | 3500 | none | PASS |
| Banner after clear | #savedVanBanner hidden | #savedVanBanner hidden | none | PASS |
| Tyres reload does not fill the sidewall | #sidewall empty | #sidewall empty | none | PASS |
| Restore last tyres on the next load | #restoreTyres visible | #restoreTyres visible | none | PASS |
| Click Restore last tyres | LT265/70R17 121/118S | LT265/70R17 121/118S | none | PASS |
| Click Clear saved on tyres | #sidewall empty | #sidewall empty | none | PASS |
