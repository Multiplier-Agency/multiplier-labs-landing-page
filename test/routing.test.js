import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PREVIEW_HEAT_CHECK_ORIGIN,
  getFrontDoorEnvironment,
  isHeatCheckPath,
  isRehearsalEnvironment,
  resolveFrontDoorOrigins,
} from "../routing.js";
import { buildFrontDoorConfig, NO_INDEX_HEADERS } from "../vercel-routing.js";

const PRODUCTION_OPTIONS = {
  vercelEnvironment: "production",
  webflowProductionOrigin: "https://wf.multiplier.co",
  heatCheckProductionOrigin: "https://multiplier-heat-check.vercel.app",
  currentDeploymentHost: "multiplier-labs-preview.vercel.app",
};

function serialized(config) {
  return JSON.stringify(config);
}

function routeByDestination(config, destination) {
  return config.routes.find((route) => route.dest === destination);
}

function routeIndexByDestination(config, destination) {
  return config.routes.findIndex((route) => route.dest === destination);
}

function responseHeader(route, key) {
  const normalized = key.toLowerCase();
  const transform = route?.transforms?.find(
    (item) => item.type === "response.headers" && item.target?.key?.toLowerCase() === normalized,
  );
  return transform?.args ?? route?.headers?.[key] ?? route?.headers?.[normalized];
}

test("environment selection is safe for Preview, local development, and Production", () => {
  assert.equal(isRehearsalEnvironment("preview"), true);
  assert.equal(isRehearsalEnvironment("development"), true);
  assert.equal(isRehearsalEnvironment(undefined), true);
  assert.equal(isRehearsalEnvironment("production"), false);
  assert.equal(getFrontDoorEnvironment("production"), "production");
  assert.throws(() => getFrontDoorEnvironment("staging"), /Unsupported Vercel environment/);
});

test("all Heat Check product prefixes are classified with path boundaries", () => {
  const protectedPaths = [
    "/labs/brand-heat-check",
    "/labs/brand-heat-check/",
    "/labs/brand-heat-check/example",
    "/labs/property-pulse",
    "/labs/property-pulse/example",
    "/labs/heat-check/api/report",
    "/labs/heat-check/assets/index.js",
    "/labs/heat-check/report/example-id",
    "/labs/heat-check/pdf-render",
  ];
  for (const path of protectedPaths) assert.equal(isHeatCheckPath(path), true, path);

  const unprotectedPaths = [
    "/",
    "/labs",
    "/labs/brand-heat-checker",
    "/labs/property-pulses",
    "/labs/heat-checker",
    "/labs/brief-labs",
    "/capabilities",
  ];
  for (const path of unprotectedPaths) assert.equal(isHeatCheckPath(path), false, path);
});

test("Production origins are required, normalized, and protected from loops", () => {
  assert.throws(
    () => resolveFrontDoorOrigins({ vercelEnvironment: "production" }),
    /WEBFLOW_PRODUCTION_ORIGIN is required/,
  );
  assert.throws(
    () => resolveFrontDoorOrigins({
      ...PRODUCTION_OPTIONS,
      webflowProductionOrigin: "https://multiplier-cb687a.webflow.io",
    }),
    /must use wf\.multiplier\.co/,
  );
  assert.throws(
    () => resolveFrontDoorOrigins({
      ...PRODUCTION_OPTIONS,
      heatCheckProductionOrigin: "https://www.multiplier.co",
    }),
    /cannot point to www\.multiplier\.co/,
  );
  assert.throws(
    () => resolveFrontDoorOrigins({
      ...PRODUCTION_OPTIONS,
      heatCheckProductionOrigin: "https://rebuild.up.railway.app",
    }),
    /must use multiplier-heat-check\.vercel\.app/,
  );
  assert.throws(
    () => resolveFrontDoorOrigins({
      ...PRODUCTION_OPTIONS,
      heatCheckProductionOrigin: "https://another-project.vercel.app",
    }),
    /must use multiplier-heat-check\.vercel\.app/,
  );
  assert.throws(
    () => resolveFrontDoorOrigins({
      ...PRODUCTION_OPTIONS,
      heatCheckProductionOrigin: "https://multiplier-heat-check.vercel.app/path",
    }),
    /bare origin/,
  );

  assert.deepEqual(resolveFrontDoorOrigins(PRODUCTION_OPTIONS), {
    environment: "production",
    webflowOrigin: "https://wf.multiplier.co",
    heatCheckOrigin: "https://multiplier-heat-check.vercel.app",
  });
});

test("Preview config applies global noindex and keeps bypass and analytics suppression Preview-only", () => {
  const preview = buildFrontDoorConfig({ vercelEnvironment: "preview" });
  const source = serialized(preview);

  assert.deepEqual(preview.routes[0], {
    src: "^/(.*)$",
    headers: NO_INDEX_HEADERS,
    continue: true,
  });
  assert.match(source, /HEAT_CHECK_BYPASS_SECRET/);
  assert.match(source, /preview-analytics-disabled\.js/);
  assert.ok(source.includes(PREVIEW_HEAT_CHECK_ORIGIN));
  assert.match(source, /multiplier-cb687a\.webflow\.io/);
  assert.doesNotMatch(source, /robots-production\.txt/);

  const labsIndex = routeIndexByDestination(preview, "/multiplier-labs-landing-page.html");
  const filesystemIndex = preview.routes.findIndex((route) => route.handle === "filesystem");
  const brandIndex = routeIndexByDestination(
    preview,
    `${PREVIEW_HEAT_CHECK_ORIGIN}/labs/brand-heat-check`,
  );
  const webflowIndex = routeIndexByDestination(
    preview,
    "https://multiplier-cb687a.webflow.io/$1",
  );
  assert.ok(labsIndex > 0);
  assert.ok(labsIndex < filesystemIndex);
  assert.ok(filesystemIndex < brandIndex);
  assert.ok(brandIndex < webflowIndex);
});

test("Production config omits Preview controls and makes public and private routes explicit", () => {
  const production = buildFrontDoorConfig(PRODUCTION_OPTIONS);
  const source = serialized(production);

  assert.doesNotMatch(source, /HEAT_CHECK_BYPASS_SECRET/);
  assert.doesNotMatch(source, /preview-analytics-disabled\.js/);
  assert.ok(!source.includes(new URL(PREVIEW_HEAT_CHECK_ORIGIN).hostname));
  assert.ok(!production.routes.some((route) => route.continue));
  assert.match(source, /robots-production\.txt/);
  assert.match(source, /sitemap-production\.xml/);
  assert.match(source, /llms-production\.txt/);

  const labs = routeByDestination(production, "/multiplier-labs-landing-page.html");
  const brand = routeByDestination(
    production,
    "https://multiplier-heat-check.vercel.app/labs/brand-heat-check",
  );
  const property = routeByDestination(
    production,
    "https://multiplier-heat-check.vercel.app/labs/property-pulse",
  );
  const api = routeByDestination(
    production,
    "https://multiplier-heat-check.vercel.app/labs/heat-check/api/$1",
  );
  const pdf = routeByDestination(
    production,
    "https://multiplier-heat-check.vercel.app/labs/heat-check/pdf-render",
  );
  const report = routeByDestination(
    production,
    "https://multiplier-heat-check.vercel.app/labs/heat-check/report/$1",
  );

  assert.equal(responseHeader(labs, "x-robots-tag"), "index, follow");
  assert.equal(responseHeader(brand, "x-robots-tag"), "index, follow");
  assert.equal(responseHeader(property, "x-robots-tag"), "index, follow");
  const nestedBrand = routeByDestination(
    production,
    "https://multiplier-heat-check.vercel.app/labs/brand-heat-check/$1",
  );
  const nestedProperty = routeByDestination(
    production,
    "https://multiplier-heat-check.vercel.app/labs/property-pulse/$1",
  );
  assert.equal(responseHeader(nestedBrand, "x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(responseHeader(nestedProperty, "x-robots-tag"), "noindex, nofollow, noarchive");
  for (const route of [api, pdf, report]) {
    assert.equal(responseHeader(route, "cache-control"), "no-store");
    assert.equal(responseHeader(route, "x-robots-tag"), "noindex, nofollow, noarchive");
  }

  const labsIndex = production.routes.indexOf(labs);
  const brandIndex = production.routes.indexOf(brand);
  const unknownLabsIndex = production.routes.findIndex(
    (route) => route.src === "^/labs(?:/.*)?$" && route.status === 404,
  );
  const webflowIndex = routeIndexByDestination(production, "https://wf.multiplier.co/$1");
  assert.ok(labsIndex < brandIndex);
  assert.ok(brandIndex < unknownLabsIndex);
  assert.ok(unknownLabsIndex < webflowIndex);
});

test("Production includes canonical and legacy redirects without changing Preview", () => {
  const preview = serialized(buildFrontDoorConfig({ vercelEnvironment: "preview" }));
  const production = serialized(buildFrontDoorConfig(PRODUCTION_OPTIONS));

  assert.doesNotMatch(preview, /heatcheck\.multiplier\.co/);
  assert.match(production, /heatcheck\.multiplier\.co/);
  assert.match(production, /labs\/brand-heat-check/);
  assert.match(production, /labs\/property-pulse/);
  assert.match(production, /labs\/heat-check\/report\/\$1/);
  assert.match(production, /cultural-heat-check-ai/);
  assert.match(production, /https:\/\/www\.multiplier\.co\/\$1/);
});

test("Labs source links to canonical routes and loads host-gated Production analytics", async () => {
  const html = await readFile(new URL("../multiplier-labs-landing-page.html", import.meta.url), "utf8");
  const analytics = await readFile(new URL("../labs-analytics.js", import.meta.url), "utf8");

  assert.match(html, /data-labs-path="\/labs\/brand-heat-check"/);
  assert.match(html, /data-labs-path="\/labs\/property-pulse"/);
  assert.match(html, /data-labs-path="\/labs" class="nav-logo"/);
  assert.equal((html.match(/data-labs-path=/g) ?? []).length, 6);
  assert.equal(
    (html.match(/href="https:\/\/www\.multiplier\.co\/labs(?:\/(?:brand-heat-check|property-pulse))?" data-labs-path=/g) ?? []).length,
    6,
  );
  assert.doesNotMatch(html, /href="\/labs(?:\/|")/);
  assert.match(html, /FILE_PREVIEW_FRONT_DOOR_ORIGIN = "https:\/\/multiplier-labs-preview-git-codex-front-15db8f-multiplier-labs\.vercel\.app"/);
  assert.match(html, /location\.protocol === 'http:' \|\| location\.protocol === 'https:'/);
  assert.match(html, /href="mailto:hello@multiplier\.co">Contact<\/a>/);
  assert.match(html, /id="toolsMenuButton"[^>]+aria-haspopup="true"[^>]+aria-expanded="false"/);
  assert.match(html, /id="toolsMenu"[^>]+hidden/);
  assert.match(html, /Culture Calendar Generator/);
  assert.match(html, /Sports AI Image Creator/);
  assert.match(html, /Brief Builder/);
  assert.match(html, /Influencer Finder/);
  assert.equal((html.match(/aria-disabled="true"/g) ?? []).length, 4);
  assert.match(html, /src="\/labs-analytics\.js"/);
  assert.doesNotMatch(html, /railway\.app/i);
  assert.match(html, /rel="canonical" href="https:\/\/www\.multiplier\.co\/labs"/);
  assert.match(analytics, /hostname\.toLowerCase\(\) !== "www\.multiplier\.co"/);
  assert.match(analytics, /G-G59ZHX4YS9/);
});

test("Production discovery files expose public pages and exclude private report surfaces", async () => {
  const robots = await readFile(new URL("../robots-production.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap-production.xml", import.meta.url), "utf8");
  const llms = await readFile(new URL("../llms-production.txt", import.meta.url), "utf8");

  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/labs\/heat-check\/api/);
  assert.match(robots, /Disallow: \/labs\/heat-check\/report/);
  assert.match(robots, /Sitemap: https:\/\/www\.multiplier\.co\/sitemap\.xml/);

  for (const path of ["/labs", "/labs/brand-heat-check", "/labs/property-pulse"]) {
    assert.match(sitemap, new RegExp(`https://www\\.multiplier\\.co${path.replaceAll("/", "\\/")}`));
    assert.match(llms, new RegExp(`https://www\\.multiplier\\.co${path.replaceAll("/", "\\/")}`));
  }
  assert.doesNotMatch(sitemap, /\/labs\/heat-check\/report/);
  assert.doesNotMatch(sitemap, /cultural-heat-check-ai/);
});

test("repository configuration contains no literal protection bypass secret", async () => {
  const files = ["../vercel.ts", "../vercel-routing.js"];
  const configSource = (
    await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")))
  ).join("\n");
  assert.doesNotMatch(configSource, /x-vercel-protection-bypass["']?\s*:\s*["'][^"'$]{10}/i);
});

test("Webflow production analytics loader remains disabled in Preview", async () => {
  const preview = serialized(buildFrontDoorConfig({ vercelEnvironment: "preview" }));
  const production = serialized(buildFrontDoorConfig(PRODUCTION_OPTIONS));
  const disabledScript = await readFile(
    new URL("../preview-analytics-disabled.js", import.meta.url),
    "utf8",
  );

  assert.match(preview, /nvhc9u4gxsagNjhmN2Q0YTJmNzdkOWVmODg0YmUxMWU0/);
  assert.match(preview, /preview-analytics-disabled/);
  assert.doesNotMatch(production, /preview-analytics-disabled/);
  assert.doesNotMatch(disabledScript, /G-[A-Z0-9]+/);
});
