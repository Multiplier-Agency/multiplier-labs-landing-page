# Multiplier Labs front door

This repository contains the Multiplier Labs landing page and the Preview-only launch rehearsal router.

## Rehearsal behavior

- `/labs` serves the Labs landing page.
- `/labs/brand-heat-check` and `/labs/property-pulse` route to the protected Heat Check Preview.
- `/labs/heat-check/*` routes report, API, PDF, and asset requests to the protected Heat Check Preview.
- All other paths route to the native Webflow staging origin.
- The build fails outside Vercel Preview or local development so it cannot be promoted accidentally.
- Every Preview response is marked `noindex`.
- The Webflow production analytics loader is replaced with an empty local script in Preview.

`HEAT_CHECK_BYPASS_SECRET` must be configured only in the Vercel Preview environment. Never place its value in this repository.

The other builder's current landing-page work was not present in GitHub when this branch was created. Merge that work only after it is committed to a named branch and the source diff has been reviewed.
