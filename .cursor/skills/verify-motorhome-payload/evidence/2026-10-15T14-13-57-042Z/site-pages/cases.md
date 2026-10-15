| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| GET / | 200 and payload h1 | 200 and payload h1 | none | PASS |
| GET /tyres.html | 200 and tyres h1 | 200 and tyres h1 | none | PASS |
| GET /index.html | 301 to / | 301 to / | none | PASS |
| GET /robots.txt | 200 allow /, disallow /api/, sitemap | 200 allow /, disallow /api/, sitemap | none | PASS |
| GET /sitemap.xml | 200 and the public pages | 200 and the public pages | none | PASS |
| Footer legal links | local privacy, cookies, terms, accessibility, contact | local privacy, cookies, terms, accessibility, contact | none | PASS |
| GET /privacy.html | 200 Privacy, Worker, DVLA | 200 Privacy, Worker, DVLA | none | PASS |
| GET /cookies.html | 200 Cookies, no tracking cookies | 200 Cookies, no tracking cookies | none | PASS |
| GET /terms.html | 200 Terms | 200 Terms | none | PASS |
| GET /accessibility.html | 200 Accessibility | 200 Accessibility | none | PASS |
| GET /favicon.ico | 200 ICO | 200 ICO | none | PASS |
| GET /404.html | 200 branded missing page | 200 branded missing page | none | PASS |
| GET /no-such-page | 404 branded missing page | 404 branded missing page | none | PASS |
| Header Tyres link | Motorhome Tyre Pressure | Motorhome Tyre Pressure | none | PASS |
| Header Payload link | Motorhome Payload Calculator | Motorhome Payload Calculator | none | PASS |
| Footer Privacy link | Privacy | Privacy | none | PASS |
| Self-hosted fonts | Outfit and Fraunces | Outfit and Fraunces | none | PASS |
| Footer Accessibility link | Accessibility | Accessibility | none | PASS |
| Filled call to action | lookupBtn | lookupBtn | none | PASS |
