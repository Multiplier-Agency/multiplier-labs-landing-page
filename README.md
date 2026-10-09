# Multiplier Labs landing page

This repository contains the standalone Multiplier Labs site published at
`https://labs.multiplier.co/`.

## Site behavior

- `/` serves the Labs landing page.
- Brand Heat Check links directly to `https://heatcheck.multiplier.co/`.
- Property Pulse links directly to `https://propertypulse.multiplier.co/`.
- BriefLab links directly to `https://brieflab.multiplier.co/`.
- All other unknown paths return `404` and are marked `noindex`.
- There are no Webflow proxies, product rewrites, Railway fallbacks, or cross-project protection-bypass requests.

`npm run build` creates an allowlisted `dist` directory containing only the public
HTML entry point, analytics script, optional image/font asset directories, and the
environment-appropriate discovery files. Repository source, tests, configuration,
and Preview-only source files are not published.

Preview deployments are globally marked `noindex` and use the Preview versions of
`robots.txt`, `sitemap.xml`, and `llms.txt`. Production serves the public discovery
files for the Labs root only.

The landing page loads GA4 only when its browser hostname is exactly
`labs.multiplier.co`, so Vercel Preview activity is excluded from the production
property.

## Homepage review layout and BriefLab badge

Above 768px, the six existing cards use three equal columns and two equally tall
rows. Below that breakpoint they stack in their existing order. Fonts, icons,
brand colors, product descriptions, links, and live/coming-soon treatments are
preserved.

BriefLab's small coral **New** badge is shown explicitly in Preview builds while
its launch date is unknown. Production builds do not enable this preview override.
The actual launch date remains unset: configure `data-launch-date="YYYY-MM-DD"`
on the badge in `multiplier-labs-landing-page.html` after launch is confirmed.
The badge appears from UTC midnight on that date until UTC midnight one calendar
month later (clamped to the next month's last day for dates such as January 31).
A configured date takes precedence in every build, so the badge expires
automatically. Badge visibility never changes card dimensions or action positions.
