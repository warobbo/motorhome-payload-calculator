# Site pages

The site the user can open in this repo is the payload tool and the tyres tool. `/index.html` permanently redirects to `/`. Header links move between those two tools. Home leaves this site.

## Sub-features

- `page-payload` serves the payload h1 at `/`.
- `page-tyres` serves the tyres h1 at `/tyres.html`.
- `page-redirect` answers `/index.html` with 301 to `/`.
- `page-nav` follows the header Tyres and Payload links.
- `page-robots` serves the static file `robots.txt` at `/robots.txt`. It allows `/`, disallows `/api/`, and names the sitemap.

## How to get to it (user POV)

- Open the site root.
- Use the header nav labelled Hub tools: Home, Payload, Tyres.
- Home is `https://motorhometools.co.uk/`. Payload is `/`. Tyres is `tyres.html`.
- Footer links repeat Payload and Tyres and also leave for Power, Water, Guides, and the legal pages on the tools site.
- The payload FAQ, privacy section, and guides list are on `/`, not separate calculator routes.
- Crawlers read `/robots.txt` and `/sitemap.xml`. Both are static files next to `index.html`. The server does not generate them.

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
- **Sitemap.** `GET /sitemap.xml` returns 200 and lists `https://motorhomepayload.co.uk/` and `https://motorhomepayload.co.uk/tyres.html`.

There is no calculator EXPECTED on this feature. A 200 with the wrong h1 is a fail. A robots file that disallows the whole site is a fail.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| GET / | 200 and payload h1 | Filled by `drive site-pages` | | |
| GET /tyres.html | 200 and tyres h1 | same evidence file | | |
| GET /index.html | 301 to / | same evidence file | | |
| Header Tyres, then Payload | Tyres h1, then payload h1 | same evidence file | | |
| GET /robots.txt | 200 allow /, disallow /api/, sitemap | same evidence file | | |
| GET /sitemap.xml | 200 and both public URLs | same evidence file | | |

## Gotchas

- Do not follow Home, the guide links, or the footer legal links for this proof. They are a different site. Record the href if you need to show where they point.
- `/?setup=1` is a hidden key form, not a public page to complete.
- Sitemap URLs are the live host `https://motorhomepayload.co.uk/` and `https://motorhomepayload.co.uk/tyres.html`. This drive checks the local server, not the live host.
- On the live host, a Render Free web service that has spun down answers `/robots.txt` itself with `User-agent: *` and `Disallow: /`. That reply is not the static file, and the request does not start the app. While the app is running, `/robots.txt` is the static file. This drive checks the local server, which always serves the file.
