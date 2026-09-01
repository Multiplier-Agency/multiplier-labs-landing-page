# Multiplier Labs landing page

This repository contains the standalone Multiplier Labs site published at
`https://labs.multiplier.co/`.

## Site behavior

- `/` serves the Labs landing page.
- Brand Heat Check links directly to `https://heatcheck.multiplier.co/`.
- Property Pulse links directly to `https://propertypulse.multiplier.co/`.
- All other unknown paths return `404` and are marked `noindex`.
- There are no Webflow proxies, product rewrites, Railway fallbacks, or cross-project protection-bypass requests.

Preview deployments are globally marked `noindex` and use the Preview versions of
`robots.txt`, `sitemap.xml`, and `llms.txt`. Production serves the public discovery
files for the Labs root only.

The landing page loads GA4 only when its browser hostname is exactly
`labs.multiplier.co`, so Vercel Preview activity is excluded from the production
property.
