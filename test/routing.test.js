import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { buildStaticSite } from "../scripts/build-static.mjs";
import {
  buildLabsConfig,
  isPreviewDeployment,
  NO_INDEX_HEADERS,
} from "../vercel-labs.js";

function serialized(config) {
  return JSON.stringify(config);
}

test("Preview is noindex and serves only the dedicated build output", () => {
  const preview = buildLabsConfig({ vercelEnvironment: "preview" });
  const source = serialized(preview);

  assert.equal(isPreviewDeployment("preview"), true);
  assert.equal(isPreviewDeployment("development"), true);
  assert.equal(isPreviewDeployment(undefined), true);
  assert.equal(isPreviewDeployment("production"), false);
  assert.deepEqual(preview.routes[0], {
    src: "^/(.*)$",
    has: [{ type: "host", value: ".*\\.vercel\\.app" }],
    headers: NO_INDEX_HEADERS,
    continue: true,
  });
  assert.deepEqual(preview.routes[1], {
    src: "^/(.*)$",
    headers: NO_INDEX_HEADERS,
    continue: true,
  });

  assert.equal(preview.buildCommand, "npm run build");
  assert.equal(preview.outputDirectory, "dist");
  assert.ok(!preview.routes.some((route) => route.destination || route.dest));
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /bypass|webflow|heat.?check/i);

  const filesystemIndex = preview.routes.findIndex((route) => route.handle === "filesystem");
  const notFoundIndex = preview.routes.findIndex(
    (route) => route.status === 404 && route.src === "^/(.*)$",
  );
  assert.ok(filesystemIndex > 0);
  assert.ok(notFoundIndex > filesystemIndex);
  assert.deepEqual(preview.routes[notFoundIndex].headers, NO_INDEX_HEADERS);
});

test("Production serves the standalone Labs root and public discovery files", () => {
  const production = buildLabsConfig({ vercelEnvironment: "production" });
  const source = serialized(production);

  assert.deepEqual(production.routes[0], {
    src: "^/(.*)$",
    has: [{ type: "host", value: ".*\\.vercel\\.app" }],
    headers: NO_INDEX_HEADERS,
    continue: true,
  });
  assert.equal(production.routes.filter((route) => route.continue).length, 1);
  assert.equal(production.buildCommand, "npm run build");
  assert.equal(production.outputDirectory, "dist");
  assert.ok(!production.routes.some((route) => route.destination || route.dest));
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /bypass|webflow|railway|heat.?check/i);
});

test("Production output exposes only the allowlisted Labs surface", async (context) => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "multiplier-labs-production-"));
  context.after(() => rm(outputDirectory, { recursive: true, force: true }));

  await buildStaticSite({ environment: "production", outputDirectory });
  const publicFiles = (await readdir(outputDirectory)).sort();
  assert.deepEqual(publicFiles, [
    "assets",
    "index.html",
    "labs-analytics.js",
    "llms.txt",
    "robots.txt",
    "sitemap.xml",
  ]);

  const rootHtml = await readFile(join(outputDirectory, "index.html"), "utf8");
  assert.match(rootHtml, /rel="canonical" href="https:\/\/labs\.multiplier\.co\/"/);
  assert.match(
    rootHtml,
    /property="og:image" content="https:\/\/labs\.multiplier\.co\/assets\/multiplier-labs-social-share\.png"/,
  );
  assert.match(rootHtml, /name="twitter:card" content="summary_large_image"/);
  assert.deepEqual(
    await readFile(join(outputDirectory, "assets", "multiplier-labs-social-share.png")),
    await readFile(new URL("../assets/multiplier-labs-social-share.png", import.meta.url)),
  );
  assert.match(
    await readFile(join(outputDirectory, "robots.txt"), "utf8"),
    /Sitemap: https:\/\/labs\.multiplier\.co\/sitemap\.xml/,
  );

  for (const privateArtifact of [
    "multiplier-labs-landing-page.html",
    "package.json",
    "README.md",
    "vercel.ts",
    "vercel-labs.js",
    "robots-preview.txt",
    "sitemap-preview.xml",
    "llms-preview.txt",
    "test",
    "scripts",
    ".env.local",
  ]) {
    await assert.rejects(access(join(outputDirectory, privateArtifact)));
  }

  const production = buildLabsConfig({ vercelEnvironment: "production" });
  const filesystemIndex = production.routes.findIndex((route) => route.handle === "filesystem");
  const notFoundIndex = production.routes.findIndex((route) => route.status === 404);
  assert.ok(filesystemIndex >= 0);
  assert.ok(notFoundIndex > filesystemIndex);
});

test("Preview output uses private discovery files while keeping the root available", async (context) => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "multiplier-labs-preview-"));
  context.after(() => rm(outputDirectory, { recursive: true, force: true }));

  await buildStaticSite({ environment: "preview", outputDirectory });
  assert.match(
    await readFile(join(outputDirectory, "index.html"), "utf8"),
    /<title>Multiplier Labs<\/title>/,
  );
  assert.match(
    await readFile(join(outputDirectory, "robots.txt"), "utf8"),
    /Disallow: \//,
  );
  assert.equal(
    (await readFile(join(outputDirectory, "sitemap.xml"), "utf8")).includes("<loc>"),
    false,
  );
});

test("Labs source uses the subdomain canonical and direct product links", async () => {
  const html = await readFile(new URL("../multiplier-labs-landing-page.html", import.meta.url), "utf8");
  const analytics = await readFile(new URL("../labs-analytics.js", import.meta.url), "utf8");

  assert.match(html, /rel="canonical" href="https:\/\/labs\.multiplier\.co\/"/);
  assert.match(html, /property="og:url" content="https:\/\/labs\.multiplier\.co\/"/);
  assert.match(
    html,
    /property="og:image" content="https:\/\/labs\.multiplier\.co\/assets\/multiplier-labs-social-share\.png"/,
  );
  assert.match(html, /property="og:image:width" content="1731"/);
  assert.match(html, /property="og:image:height" content="909"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(
    html,
    /name="twitter:image" content="https:\/\/labs\.multiplier\.co\/assets\/multiplier-labs-social-share\.png"/,
  );
  assert.match(html, /"url": "https:\/\/labs\.multiplier\.co\/"/);
  assert.equal((html.match(/href="https:\/\/labs\.multiplier\.co\/"/g) ?? []).length, 3);
  assert.equal((html.match(/href="https:\/\/heatcheck\.multiplier\.co\/"/g) ?? []).length, 2);
  assert.equal((html.match(/href="https:\/\/propertypulse\.multiplier\.co\/"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /data-labs-path|FILE_PREVIEW_FRONT_DOOR_ORIGIN|setAbsoluteLabsLinks/);
  assert.doesNotMatch(html, /www\.multiplier\.co\/labs|railway\.app|webflow\.io/i);
  assert.match(html, /href="mailto:hello@multiplier\.co"[^>]*>Contact<\/a>/);
  assert.match(html, /<ul class="footer-links" hidden>/);
  assert.match(html, /\.footer-links\[hidden\] \{ display: none; \}/);
  assert.match(html, /id="toolsMenuButton"[^>]+aria-haspopup="true"[^>]+aria-expanded="false"/);
  assert.match(html, /id="toolsMenu"[^>]+hidden/);
  assert.equal((html.match(/aria-disabled="true"/g) ?? []).length, 4);
  assert.match(html, /src="\/labs-analytics\.js"/);
  assert.match(analytics, /hostname\.toLowerCase\(\) !== "labs\.multiplier\.co"/);
  assert.match(analytics, /G-G59ZHX4YS9/);
  assert.match(analytics, /window\.multiplierLabsAnalytics = Object\.freeze\(\{ track \}\)/);
  assert.match(analytics, /source\.closest\("\[data-analytics-event\]"\)/);
  assert.doesNotMatch(analytics, /email["']?\s*:/i);
  assert.doesNotMatch(analytics, /www\.multiplier\.co/);
});

test("Labs landing page preserves approved copy, cards, ticker, and signup target", async () => {
  const html = await readFile(new URL("../multiplier-labs-landing-page.html", import.meta.url), "utf8");
  const approvedCopy = [
    "Tools to navigate cultural relevance",
    "See how a brand is showing up across culture and what is driving its relevance. Understand the signals, strengths, and momentum shaping its cultural position.",
    "Evaluate the strength, momentum, and relevance of a sports, music, entertainment, or cultural property. Understand where it is resonating, how its position is evolving, and what that means for potential partners.",
    "Identify the cultural moments that matter throughout the year.",
    "Turn any assignment into a structured team brief.",
    "Find the creators who best fit your brand.",
    "Multiplier Labs is where we experiment, build, and share.",
  ];
  for (const copy of approvedCopy) assert.ok(html.includes(copy), copy);
  assert.match(html, /Generate editorial-style sports visuals in seconds/);
  assert.doesNotMatch(html, /Agency tools for the modern marketer/);
  assert.doesNotMatch(html, /experiment, build and share/);
  assert.doesNotMatch(html, /class="tool-tags?"/);

  const expectedPartners = [
    "3M",
    "Amazon Leo",
    "Bridgestone",
    "Caterpillar",
    "Chase Sapphire",
    "ESPN",
    "Front Office Sports",
    "GEODIS",
    "Invisalign",
    "J.P. Morgan Payments",
    "MLB Players Association",
    "PitchBook",
    "Raymond James",
    "Saratoga Spring Water",
    "Sheppard Pratt",
    "Total Wine &amp; More",
    "UPMC",
    "Winnebago Industries",
    "Wyndham Hotels &amp; Resorts",
  ];
  const partners = [...html.matchAll(/<div class="marquee-item"><span>([^<]+)<\/span><\/div>/g)]
    .map((match) => match[1]);
  assert.equal(partners.length, expectedPartners.length * 2);
  assert.deepEqual(partners.slice(0, expectedPartners.length), expectedPartners);
  assert.deepEqual(partners.slice(expectedPartners.length), expectedPartners);

  const anchorTags = html.match(/<a\b[^>]*>/g) ?? [];
  const attribute = (tag, name) => tag.match(new RegExp("\\b" + name + '="([^"]*)"'))?.[1];
  const hasClass = (tag, className) => (attribute(tag, "class") ?? "").split(/\s+/).includes(className);
  const expectedNewTabLinks = [
    { className: "nav-tool-link", href: "https://heatcheck.multiplier.co/" },
    { className: "nav-tool-link", href: "https://propertypulse.multiplier.co/" },
    { className: "tool-card", href: "https://heatcheck.multiplier.co/" },
    { className: "tool-card", href: "https://propertypulse.multiplier.co/" },
    { className: "nav-agency", href: "https://www.multiplier.co/" },
    { className: "agency-link", href: "https://www.multiplier.co/" },
  ];
  for (const expected of expectedNewTabLinks) {
    const matches = anchorTags.filter((tag) => (
      hasClass(tag, expected.className) && attribute(tag, "href") === expected.href
    ));
    assert.equal(matches.length, 1, expected.className + ": " + expected.href);
    assert.equal(attribute(matches[0], "target"), "_blank");
    assert.ok((attribute(matches[0], "rel") ?? "").split(/\s+/).includes("noopener"));
  }

  const blankAnchors = anchorTags.filter((tag) => attribute(tag, "target") === "_blank");
  assert.equal(blankAnchors.length, expectedNewTabLinks.length);
  assert.equal((html.match(/<span class="tool-cta">Use tool →<\/span>/g) ?? []).length, 2);
  assert.equal((html.match(/<div class="tool-card coming-soon">/g) ?? []).length, 4);
  const waitlistAnchors = anchorTags.filter((tag) => (
    hasClass(tag, "waitlist") && attribute(tag, "href") === "#newsletter"
  ));
  assert.equal(waitlistAnchors.length, 4);
  assert.ok(waitlistAnchors.every((tag) => attribute(tag, "data-analytics-button") === "join_waitlist"));

  const navLogo = anchorTags.find((tag) => hasClass(tag, "nav-logo")) ?? "";
  const footerLogo = anchorTags.find((tag) => hasClass(tag, "footer-logo")) ?? "";
  assert.equal(attribute(navLogo, "href"), "https://labs.multiplier.co/");
  assert.equal(attribute(footerLogo, "href"), "https://labs.multiplier.co/");
  assert.notEqual(attribute(navLogo, "target"), "_blank");
  assert.notEqual(attribute(footerLogo, "target"), "_blank");

  assert.match(html, /\.tools-grid \{[^}]*gap: 3px;[^}]*background: transparent;/);
  assert.match(html, /\.tool-card\.coming-soon \{[^}]*border: none;/);
  assert.match(html, /\.tool-card-header \{[^}]*border-bottom: none;/);
  assert.match(html, /\.tool-card\.coming-soon \.tool-card-header \{[\s\S]*?border-bottom: none;/);
  assert.match(html, /\.tool-card\.coming-soon \.tool-card-body \{[^}]*flex: 1;[^}]*justify-content: flex-end;/);
  assert.match(html, /a\.tool-card:hover,[\s\S]*?transform: translateY\(-2px\);/);

  assert.match(
    html,
    /const GFORM_ACTION = "https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSeX2LuIpNGN1a2YIuXnByoZSsNGHBy9bblyVa4qHKPQBrLj0Q\/formResponse";/,
  );
  assert.match(html, /const GFORM_EMAIL_FIELD = "entry\.778182506";/);
  assert.match(html, /form\.action = GFORM_ACTION;/);
  assert.match(html, /input\.name = GFORM_EMAIL_FIELD;/);
  assert.match(html, /track\('newsletter_signup'/);
  assert.match(html, /track\('newsletter_signup_error'/);
  assert.match(html, /handleSubscribe\('button'\)/);
  assert.match(html, /handleSubscribe\('enter'\)/);
  assert.doesNotMatch(html, /newsletter_(?:signup|signup_error)'[\s\S]{0,250}email\s*:/);
});

test("Labs analytics emits stable low-cardinality events only on the production host", async () => {
  const analytics = await readFile(new URL("../labs-analytics.js", import.meta.url), "utf8");
  const listeners = {};
  const scripts = [];
  const window = {
    location: { hostname: "labs.multiplier.co" },
    dataLayer: [],
  };
  const document = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    createElement(tagName) {
      assert.equal(tagName, "script");
      return {};
    },
    head: {
      appendChild(script) {
        scripts.push({ ...script });
      },
    },
  };

  runInNewContext(analytics, { document, window, Date, Object, encodeURIComponent });
  assert.equal(typeof window.multiplierLabsAnalytics?.track, "function");
  assert.equal(typeof listeners.click, "function");
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].src, /googletagmanager\.com\/gtag\/js\?id=G-G59ZHX4YS9/);

  listeners.click({
    target: {
      closest() {
        return {
          dataset: {
            analyticsEvent: "labs_tool_select",
            analyticsButton: "tool_brand_heat_check",
            analyticsProduct: "brand_heat_check",
            analyticsSurface: "labs_tools_grid",
            analyticsTool: "brand_heat_check",
          },
        };
      },
    },
  });

  window.multiplierLabsAnalytics.track("newsletter_signup", {
    button_name: "newsletter_subscribe",
    email: "must-not-be-collected@example.com",
    method: "button",
    result: "submitted",
    surface: "labs_newsletter",
  });

  const calls = window.dataLayer.map((entry) => Array.from(entry));
  const toolEvent = calls.find((entry) => entry[0] === "event" && entry[1] === "labs_tool_select");
  const newsletterEvent = calls.find((entry) => entry[0] === "event" && entry[1] === "newsletter_signup");
  assert.deepEqual(JSON.parse(JSON.stringify(toolEvent?.[2])), {
    send_to: "G-G59ZHX4YS9",
    button_name: "tool_brand_heat_check",
    product: "brand_heat_check",
    surface: "labs_tools_grid",
    tool_name: "brand_heat_check",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(newsletterEvent?.[2])), {
    send_to: "G-G59ZHX4YS9",
    button_name: "newsletter_subscribe",
    method: "button",
    result: "submitted",
    surface: "labs_newsletter",
  });
});

test("Labs analytics stays disabled on Vercel aliases", async () => {
  const analytics = await readFile(new URL("../labs-analytics.js", import.meta.url), "utf8");
  const window = { location: { hostname: "example.vercel.app" } };
  const document = {
    addEventListener() {
      throw new Error("Preview analytics must not register listeners");
    },
    createElement() {
      throw new Error("Preview analytics must not load gtag");
    },
  };

  runInNewContext(analytics, { document, window });
  assert.equal(window.gtag, undefined);
  assert.equal(window.multiplierLabsAnalytics, undefined);
});

test("Labs signup builds the expected Google Form request without sending it", async () => {
  const html = await readFile(new URL("../multiplier-labs-landing-page.html", import.meta.url), "utf8");
  const signupScript = html.match(
    /const GFORM_ACTION[\s\S]*?(?=\n\s*function handleSubscribe)/,
  )?.[0];
  assert.ok(signupScript);

  let capturedRequest;
  const document = {
    getElementById() {
      return null;
    },
    createElement(tagName) {
      if (tagName === "iframe") return { style: {} };
      if (tagName === "input") return {};
      if (tagName === "form") {
        return {
          child: null,
          appendChild(input) {
            this.child = input;
          },
          submit() {
            capturedRequest = {
              action: this.action,
              method: this.method,
              target: this.target,
              field: { ...this.child },
            };
          },
          remove() {},
        };
      }
      throw new Error("Unexpected element: " + tagName);
    },
    body: {
      appendChild() {},
    },
  };

  runInNewContext(
    signupScript + '\nsubmitToSheet("qa+labs@example.com");',
    { document },
  );

  assert.deepEqual(capturedRequest, {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSeX2LuIpNGN1a2YIuXnByoZSsNGHBy9bblyVa4qHKPQBrLj0Q/formResponse",
    method: "POST",
    target: "gformTargetFrame",
    field: {
      type: "hidden",
      name: "entry.778182506",
      value: "qa+labs@example.com",
    },
  });
});

test("Production discovery files are scoped to the Labs subdomain", async () => {
  const robots = await readFile(new URL("../robots-production.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap-production.xml", import.meta.url), "utf8");
  const llms = await readFile(new URL("../llms-production.txt", import.meta.url), "utf8");
  const previewRobots = await readFile(new URL("../robots-preview.txt", import.meta.url), "utf8");
  const previewSitemap = await readFile(new URL("../sitemap-preview.xml", import.meta.url), "utf8");

  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow:/);
  assert.match(robots, /Sitemap: https:\/\/labs\.multiplier\.co\/sitemap\.xml/);
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 1);
  assert.match(sitemap, /<loc>https:\/\/labs\.multiplier\.co\/<\/loc>/);
  assert.doesNotMatch(sitemap, /www\.multiplier\.co|heatcheck|propertypulse/);
  assert.match(llms, /https:\/\/labs\.multiplier\.co\//);
  assert.match(llms, /https:\/\/heatcheck\.multiplier\.co\//);
  assert.match(llms, /https:\/\/propertypulse\.multiplier\.co\//);
  assert.doesNotMatch(llms, /www\.multiplier\.co\/labs/);
  assert.match(previewRobots, /Disallow: \//);
  assert.equal((previewSitemap.match(/<loc>/g) ?? []).length, 0);
});

test("repository no longer contains front-door proxy dependencies", async () => {
  const files = [
    "../vercel.ts",
    "../vercel-labs.js",
    "../package.json",
    "../multiplier-labs-landing-page.html",
  ];
  const source = (
    await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")))
  ).join("\n");

  assert.doesNotMatch(
    source,
    /WEBFLOW_PRODUCTION_ORIGIN|HEAT_CHECK_PRODUCTION_ORIGIN|HEAT_CHECK_BYPASS_SECRET/,
  );
  assert.doesNotMatch(
    source,
    /x-vercel-protection-bypass|multiplier-cb687a\.webflow\.io|multiplier-heat-check[^"]*\.vercel\.app|railway\.app/i,
  );

  for (const legacyFile of [
    "../routing.js",
    "../vercel-routing.js",
    "../preview-analytics-disabled.js",
  ]) {
    await assert.rejects(access(new URL(legacyFile, import.meta.url)));
  }
});
