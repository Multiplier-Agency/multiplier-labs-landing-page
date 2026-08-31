import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isHeatCheckPath,
  isRehearsalEnvironment,
} from "../routing.js";

test("environment guard prevents promotion of the rehearsal build", () => {
  assert.equal(isRehearsalEnvironment("preview"), true);
  assert.equal(isRehearsalEnvironment(undefined), true);
  assert.equal(isRehearsalEnvironment("production"), false);
  assert.equal(isRehearsalEnvironment("development"), false);
});

test("only Heat Check product routes receive the protection bypass", () => {
  const protectedPaths = [
    "/labs/brand-heat-check",
    "/labs/brand-heat-check/",
    "/labs/property-pulse",
    "/labs/heat-check/api/report",
    "/labs/heat-check/assets/index.js",
    "/labs/heat-check/report/example-id",
    "/labs/heat-check/pdf-render",
  ];
  for (const path of protectedPaths) assert.equal(isHeatCheckPath(path), true, path);

  const unprotectedPaths = [
    "/",
    "/labs",
    "/labs/brief-labs",
    "/capabilities",
  ];
  for (const path of unprotectedPaths) assert.equal(isHeatCheckPath(path), false, path);
});

test("programmatic route configuration keeps Labs routes ahead of Webflow fallback", async () => {
  const configSource = await readFile(new URL("../vercel.ts", import.meta.url), "utf8");
  const labsIndex = configSource.indexOf('previewRewrite("/labs"');
  const brandIndex = configSource.indexOf('"/labs/brand-heat-check"');
  const propertyIndex = configSource.indexOf('"/labs/property-pulse"');
  const heatCheckIndex = configSource.indexOf('"/labs/heat-check"');
  const webflowIndex = configSource.indexOf('previewRewrite("/:path*"');
  assert.ok(labsIndex >= 0);
  assert.ok(labsIndex < brandIndex);
  assert.ok(brandIndex < propertyIndex);
  assert.ok(propertyIndex < heatCheckIndex);
  assert.ok(heatCheckIndex < webflowIndex);
  assert.match(configSource, /https:\/\/multiplier-cb687a\.webflow\.io/);
  assert.match(configSource, /deploymentEnv\("HEAT_CHECK_BYPASS_SECRET"\)/);
});

test("Labs source links to canonical routes and contains no Railway target", async () => {
  const html = await readFile(new URL("../multiplier-labs-landing-page.html", import.meta.url), "utf8");
  assert.match(html, /href="\/labs\/brand-heat-check"/);
  assert.match(html, /href="\/labs\/property-pulse"/);
  assert.doesNotMatch(html, /railway\.app/i);
  assert.match(html, /rel="canonical" href="https:\/\/www\.multiplier\.co\/labs"/);
});

test("no repository file contains a protection bypass secret", async () => {
  const config = await readFile(new URL("../vercel.ts", import.meta.url), "utf8");
  assert.doesNotMatch(config, /x-vercel-protection-bypass["']?\s*:\s*["'][^"']{10}/i);
});

test("Webflow production analytics loader is replaced in Preview", async () => {
  const configSource = await readFile(new URL("../vercel.ts", import.meta.url), "utf8");
  const disabledScript = await readFile(new URL("../preview-analytics-disabled.js", import.meta.url), "utf8");
  assert.match(configSource, /nvhc9u4gxsagNjhmN2Q0YTJmNzdkOWVmODg0YmUxMWU0/);
  assert.match(configSource, /preview-analytics-disabled/);
  assert.doesNotMatch(disabledScript, /G-[A-Z0-9]+/);
});
