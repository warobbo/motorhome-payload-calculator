# Site pages

The site the user can open in this repo is the payload tool and the tyres tool. `/index.html` permanently redirects to `/`. Header links move between those two tools. Home leaves this site.

## Sub-features

- `page-payload` serves the payload h1 at `/`.
- `page-tyres` serves the tyres h1 at `/tyres.html`.
- `page-redirect` answers `/index.html` with 301 to `/`.
- `page-nav` follows the header Tyres and Payload links, then the footer Privacy link.
- `page-robots` serves the static file `robots.txt` at `/robots.txt`. It allows `/`, disallows `/api/`, and names the sitemap.
- `page-legal` serves `privacy.html`, `cookies.html` and `terms.html`.
- `page-missing` serves `404.html` for an unknown public path, with status 404.

## How to get to it (user POV)

- Open the site root.
- Use the header nav labelled Hub tools: Home, Payload, Tyres.
- Home is `https://motorhometools.co.uk/`. Payload is `/`. Tyres is `tyres.html`.
- Footer links repeat Payload and Tyres, leave for Power, Water and Guides, and open Privacy, Cookies, Terms and Accessibility on this site (`privacy.html`, `cookies.html`, `terms.html`, `accessibility.html`). Contact opens `https://motorhometools.co.uk/contact.html`.
- The payload FAQ, a short privacy note, and the guides list are on `/`. The full privacy, cookie, terms and accessibility notices are their own pages.
- Crawlers read `/robots.txt` and `/sitemap.xml`. Both are static files next to `index.html`. The server does not generate them. The sitemap lists `/`, `tyres.html`, `privacy.html`, `cookies.html`, `terms.html` and `accessibility.html`. Every listed URL has `<lastmod>2026-10-15</lastmod>`.
- An unknown public path (for example `/no-such-page`) is status 404 and the body is `404.html`. `GET /404.html` is 200 because the file exists. Render’s static host serves that same file automatically for a missing path, and the browser keeps the missing address. Links and images in `404.html` are root-absolute (`/tyres.html`, `/styles.css`) so a nested miss such as `/missing/page` still loads the page and can open the tools. A dot path is still plain text `Not found`.

## Driving it with verify-motorhome

Preconditions:

- Doctor has passed.

```bash
.cursor/skills/verify-motorhome-payload/helpers/verify-motorhome drive site-pages
```

- **Root.** `GET /` returns 200 and the body contains `<h1>Motorhome Payload Calculator</h1>`.
- **Tyres.** `GET /tyres.html` returns 200 and the body contains `<h1>Motorhome Tyre Pressure</h1>`.
- **Redirect.** `GET /index.html` without following the redirect returns 301 and `Location: /`.
- **Header.** From `/`, click `nav[aria-label="Hub tools"] a[href="tyres.html"]`. The h1 is Motorhome Tyre Pressure. Click `nav[aria-label="Hub tools"] a[href="/"]`. The h1 is Motorhome Payload Calculator.
- **Robots.** `GET /robots.txt` returns 200. The body includes the lines `User-agent: *`, `Disallow: /api/`, `Allow: /`, and `Sitemap: https://motorhomepayload.co.uk/sitemap.xml`. It has no line that is exactly `Disallow: /`.
- **Sitemap.** `GET /sitemap.xml` returns 200 and lists `https://motorhomepayload.co.uk/`, `https://motorhomepayload.co.uk/tyres.html`, `privacy.html`, `cookies.html`, `terms.html` and `accessibility.html`. It does not list `404.html`.
- **Legal pages.** `GET /privacy.html` is 200 and the body contains `<h1>Privacy</h1>`, `Cloudflare Worker`, `DVLA`, `The controller is Motorhome Payload Calculator` and `https://ico.org.uk/make-a-complaint/`. `GET /cookies.html` is 200 and contains `<h1>Cookies</h1>` and `does not use tracking cookies`. `GET /terms.html` is 200 and contains `<h1>Terms</h1>`. `GET /accessibility.html` is 200 and contains `<h1>Accessibility</h1>`. The payload and tyres HTML link `privacy.html`, `cookies.html`, `terms.html` and `accessibility.html`, and Contact points at `https://motorhometools.co.uk/contact.html`. They do not link `motorhometools.co.uk/privacy.html`, `cookies.html` or `disclaimer.html`.
- **Favicon.** `GET /favicon.ico` is 200 and the body starts with the ICO signature (reserved `0`, type `1`).
- **Missing page.** `GET /404.html` is 200 and contains `<h1>Page not found</h1>` and `Motorhome Payload Calculator`. `GET /no-such-page` is 404 and contains `<h1>Page not found</h1>`.
- **Footer.** From `/`, click `footer.site-footer a[href="privacy.html"]`. The h1 is Privacy.
- **Call to action.** Back on `/`, the only element with `btn-primary` is `#lookupBtn`.

There is no calculator EXPECTED on this feature. A 200 with the wrong h1 is a fail. A robots file that disallows the whole site is a fail.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| GET / | 200 and payload h1 | Filled by `drive site-pages` | | |
| GET /tyres.html | 200 and tyres h1 | same evidence file | | |
| GET /index.html | 301 to / | same evidence file | | |
| GET /robots.txt | 200 allow /, disallow /api/, sitemap | same evidence file | | |
| GET /sitemap.xml | 200 and the public pages | same evidence file | | |
| Footer legal links | local privacy, cookies, terms, accessibility, contact | same evidence file | | |
| GET /privacy.html | 200 Privacy, Worker, DVLA | same evidence file | | |
| GET /cookies.html | 200 Cookies, no tracking cookies | same evidence file | | |
| GET /terms.html | 200 Terms | same evidence file | | |
| GET /accessibility.html | 200 Accessibility | same evidence file | | |
| GET /favicon.ico | 200 ICO | same evidence file | | |
| GET /404.html | 200 branded missing page | same evidence file | | |
| GET /no-such-page | 404 branded missing page | same evidence file | | |
| Header Tyres link | Motorhome Tyre Pressure | same evidence file | | |
| Header Payload link | Motorhome Payload Calculator | same evidence file | | |
| Footer Privacy link | Privacy | same evidence file | | |
| Self-hosted fonts | Outfit and Fraunces | same evidence file | | |
| Footer Accessibility link | Accessibility | same evidence file | | |
| Filled call to action | lookupBtn | same evidence file | | |

## Gotchas

- Do not follow Home, the guide links, or the footer Contact link for this proof. They are a different site. Contact is `https://motorhometools.co.uk/contact.html`. The footer Privacy, Cookies, Terms and Accessibility links stay on this site; the drive opens Privacy.
- Do not follow the 404 page’s Home link.
- `/?setup=1` is a hidden key form, not a public page to complete.
- Sitemap URLs use the live host `https://motorhomepayload.co.uk/`. This drive checks the local server, not the live host. The legal URLs are on that same host.
- The static site serves `/robots.txt` from the published file. It does not spin down. The old free web service, if it is still answering the hostname while spun down, replaces that file with `User-agent: *` and `Disallow: /`. This drive checks the local server, which always serves the file. After the domain moves, suspend that web service and do not delete it.
