# Multiplier Labs front door

This repository contains the Multiplier Labs landing page and the launch front-door router.

## Rehearsal behavior

- `/labs` serves the Labs landing page.
- `/labs/brand-heat-check` and `/labs/property-pulse` route to the protected Heat Check Preview.
- `/labs/heat-check/*` routes report, API, PDF, and asset requests to the protected Heat Check Preview.
- All other paths route to the native Webflow staging origin.
- Every Preview response is marked `noindex`.
- The Webflow production analytics loader is replaced with an empty local script in Preview.

`HEAT_CHECK_BYPASS_SECRET` must be configured only in the Vercel Preview environment. Never place its value in this repository.

## Production behavior

Production builds fail closed unless both of these build-time values are present and valid:

- `WEBFLOW_PRODUCTION_ORIGIN=https://wf.multiplier.co`
- `HEAT_CHECK_PRODUCTION_ORIGIN=<stable, public Vercel Production origin>`

Production omits the Preview protection bypass, Preview analytics suppression, and global `noindex`. It serves public `robots.txt`, `sitemap.xml`, and `llms.txt` files, keeps report/API/PDF routes out of discovery, redirects the bare domain to `www`, and preserves the launch redirects for the legacy Heat Check URLs.

The Labs landing page loads GA4 only when its browser hostname is exactly `www.multiplier.co`. Preview activity is therefore not sent to the production property.

Do not deploy Production until `wf.multiplier.co` serves the current Webflow site without redirecting back to `www.multiplier.co`, and the Heat Check origin is the exact Vercel Production deployment accepted for launch.

The other builder's current landing-page work was not present in GitHub when this branch was created. Merge that work only after it is committed to a named branch and the source diff has been reviewed.
