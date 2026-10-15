# Move motorhomepayload.co.uk to a static site

The calculator pages are static files. Demo plates, the van catalogue, and the payload and tyre maths run in the browser. Production does not need a Node server.

`/api/missing-size` and `/api/vehicle-lookup` on the public site are routes on one Cloudflare Worker. The tyres form reads `window.MISSING_SIZE_ENDPOINT` from `site-config.js`. The payload page reads `window.VEHICLE_LOOKUP_ENDPOINT` from the same file. The publish step writes that file from `MISSING_SIZE_ENDPOINT` and `VEHICLE_LOOKUP_ENDPOINT` when either variable is set. If they are unset, the page uses `/api/missing-size` and `/api/vehicle-lookup`, which only the local verification server implements. If the lookup request fails, the page uses demo plates and the catalogue in the browser.

`scripts/publish-public.sh` copies `scripts/published-files.txt` into `public/`. That allowlist is the HTML, CSS, browser JS, brand images, self-hosted fonts, `favicon.ico`, `robots.txt`, `sitemap.xml`, and `og-image.png`. README, this file, `render.yaml`, the Worker, tests, and dotfiles are not copied. `public/` is not committed.

Render Blueprints describe a static site as `type: web` with `runtime: static`. There is no separate `type: static`.

## Dashboard steps

Do these in order. Do not delete the existing web service.

1. **Create a new static site.** `render.yaml` still describes the existing Node service `motorhome-payload-calculator` (`runtime: node`, `npm start`) and adds a second service, `motorhome-payload-static` (`runtime: static`). A Blueprint sync matches by name, so it must not change the Node service's runtime. Syncing can create the static site beside it. If you create the static site by hand instead, use the name `motorhome-payload-static` and the build settings below. Do not convert or delete the running web service.

2. **Build settings** (Dashboard → the new static site → Settings → Build & Deploy). Git deploy does not always apply `render.yaml` to a service that was created by hand. Set both fields:

   - Build command: `bash scripts/publish-public.sh`
   - Publish directory: `public`

   Environment:

   - `SKIP_INSTALL_DEPS` = `true`
   - `MISSING_SIZE_ENDPOINT` = the Worker URL from step 3, including the path if you add one. Leave it empty until the Worker exists, then set it and redeploy so `site-config.js` points at the Worker.
   - `VEHICLE_LOOKUP_ENDPOINT` = that same Worker URL plus `/api/vehicle-lookup`. Leave it empty until the secret in step 3 is set, then set it and redeploy. The page posts lookups there.

   Redirects / Rewrites:

   - Source `/index.html` → destination `/` (redirect). The local server already answers that with HTTP 301. The rule is also in `render.yaml` for a site created from the blueprint.

   Headers. `render.yaml` sets these on `motorhome-payload-static` for path `/*`. A static site created by hand does not always take blueprint headers. If service `srv-db7t0v6q1p3s73emg4c0` does not send them after a sync, add the same rules in Dashboard → that static site → Settings → Headers. One rule per header. Path `/*` for every row:

   | Header | Value |
   | --- | --- |
   | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
   | `Content-Security-Policy` | `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src 'self' https://*.workers.dev https://*.*.workers.dev https://driver-vehicle-licensing.api.gov.uk https://beta.check-mot.service.gov.uk; upgrade-insecure-requests` |
   | `X-Frame-Options` | `DENY` |
   | `Referrer-Policy` | `strict-origin-when-cross-origin` |
   | `Permissions-Policy` | `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()` |
   | `X-Content-Type-Options` | `nosniff` |

   `style-src` allows `'unsafe-inline'` because the calculator pages set a few `style` attributes. `font-src` is `'self'` because Outfit and Fraunces are files on this site. `connect-src` allows the Worker on `workers.dev` (one or two labels, such as `name.account.workers.dev`) and the DVLA and MOT hosts the page calls only when that Worker cannot be reached. `frame-ancestors 'none'` is the same rule as `X-Frame-Options: DENY`.

3. **Deploy the Worker.** From a machine logged into Cloudflare:

   ```bash
   cd worker
   npx wrangler deploy
   ```

   Wrangler prints a `*.workers.dev` URL. Keep it for the environment variables below.

   The Worker was not deployed from the environment that opened the pull request. `npx wrangler deploy --dry-run` (Wrangler 4) packages the script. `wrangler login` is required before a real deploy.

   Set the DVLA key as a Worker secret. The name is `DVLA_API_KEY`, the same name the Node service uses. The value is not written into this repo, `wrangler.toml`, or the static site. Wrangler prompts for the value and does not print it back:

   ```bash
   npx wrangler secret put DVLA_API_KEY
   ```

   Optional, and only if the Node service already has it: `npx wrangler secret put MOT_API_KEY`. That fills the model when DVLA does not. Leave it unset and the lookup still returns make and revenue weight.

   `secret put` publishes a new Worker version. Do this after the first deploy. Then set `MISSING_SIZE_ENDPOINT` to the Worker URL and `VEHICLE_LOOKUP_ENDPOINT` to that URL plus `/api/vehicle-lookup`, and redeploy the static site.

   `GET /api/vehicle-lookup` on the Worker returns `{"ok":true,"liveDvla":true,"demoPlates":[...]}` when `DVLA_API_KEY` is set, and `liveDvla` false when it is not. The JSON never includes the key. `POST` with a registration calls DVLA the same way the Node route does. Demo plates and a make / model / year catalogue row do not need the key. Error statuses match the Node route (`400`, `401`, `404`, `405`, `500`, `502`).

   Browser calls are allowed only from `https://motorhomepayload.co.uk`. Any other `Origin` is refused before DVLA is called. A basic per-IP limit allows 30 lookup requests in 10 minutes on that isolate. The table keeps at most 512 addresses and drops an address once its window expires. It is a guard against a burst, not a global quota.

   `GET` on the Worker root returns `{"ok":true,"capture":true}`.

   A filled honeypot field (`website`) returns `{"ok":true,"ignored":true}` and is not logged. A real note is one JSON log line. The response never includes a notify address.

   Notify stays off unless you set a URL. With no notify variables, the Worker is log-only (Workers logs). To turn notify on:

   ```bash
   npx wrangler secret put MISSING_SIZE_NOTIFY_URL
   npx wrangler secret put MISSING_SIZE_NOTIFY_EMAIL
   ```

   `MISSING_SIZE_NOTIFY_URL` must be an `http` or `https` URL. If that URL is absent, the Worker does not call out, even when an email value is present. Those values are not written into the site and are not returned to the browser.

4. **Move the custom domain.** On the new static site, add `motorhomepayload.co.uk`. Remove that domain from the old web service so the hostname follows the static site. Keep the canonical host non-www. `robots.txt` and `sitemap.xml` stay the files in this repo (`Allow: /`, `Disallow: /api/`, and the Sitemap line).

5. **Check the cut-over.** Open `/` and `/tyres.html`. Look up `DEMO3500` and a Fiat Ducato 2018 catalogue row. Open `/robots.txt` and `/sitemap.xml`. On the tyres page, an uncovered sidewall should show “We don’t have this size yet” and the Worker log should gain a line when the endpoint is the Worker URL. `GET` the lookup URL and confirm `liveDvla` is true and the body has no key. Do not paste a registration into the check notes.

6. **Suspend the old web service.** Dashboard → the Node web service → Suspend. Do not delete it. A suspended service stops the free-tier spin-down `robots.txt` (`Disallow: /`) from answering the hostname once the domain has moved. Leave the service in the account so it can be resumed.

## Local checks

`npm start` still serves the folder for development and for the verification helper. The Node `/api/vehicle-lookup` route is unchanged. `npm test` includes the browser lookup fixture, the Worker capture, the Worker lookup, and the publish allowlist. `npm run build` fills `public/`.
