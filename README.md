# Multiplier Labs landing page

This repository contains the standalone Multiplier Labs site published at
`https://labs.multiplier.co/`.

## Site behavior

- `/` serves the Labs landing page.
- Brand Heat Check links directly to `https://heatcheck.multiplier.co/`.
- Property Pulse links directly to `https://propertypulse.multiplier.co/`.
- Brief Builder links directly to `https://briefbuilder.multiplier.co/`.
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

## Homepage review layout and Brief Builder badge

Above 768px, the six existing cards use three equal columns and two equally tall
rows. Below that breakpoint they stack in their existing order. Fonts, icons,
brand colors, product descriptions, links, and live/coming-soon treatments are
preserved.

Desktop titles reserve the tallest title height within each row, including when
longer names wrap at narrower widths. Brief Builder retains the existing title style, while all
three descriptions in its row begin at the same vertical position. Mobile retains
the original natural title heights.

Brief Builder's compact **Just Launched** badge uses the existing coral fill and navy
text, with clear padding, slightly rounded corners, and the existing Geist font.
It has no dot or animation. The badge is shown explicitly in Preview builds while
its launch date is unknown. Production builds do not enable this preview override.
The confirmed launch date is `2026-10-12`, configured through `data-launch-date`
on the badge in `multiplier-labs-landing-page.html`. The badge expires at UTC
midnight on `2026-11-12`.
The badge appears from UTC midnight on that date until UTC midnight one calendar
month later (clamped to the next month's last day for dates such as January 31).
A configured date takes precedence in every build, so the badge expires
automatically. Badge visibility never changes card dimensions or action positions.

The customer-facing name and URL are Brief Builder and `briefbuilder.multiplier.co`.
The existing `brieflab` analytics product/tool values and `tool_brieflab` button
identifier remain stable for reporting continuity.
