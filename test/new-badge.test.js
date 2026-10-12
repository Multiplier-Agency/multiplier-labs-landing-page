import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = await readFile(new URL("../multiplier-labs-landing-page.html", import.meta.url), "utf8");
const badgeScript = html.match(/function isNewLaunch[\s\S]*?(?=\n  \/\/ Submits silently)/)?.[0];
assert.ok(badgeScript);

function loadBadge({ launchDate = "", previewNew, hostname = "example.vercel.app" } = {}) {
  const badge = { hidden: true, dataset: { launchDate, previewNew } };
  const context = { document: { querySelector: () => badge }, window: { location: { hostname } } };
  runInNewContext(badgeScript, context);
  return { badge, isNewLaunch: context.isNewLaunch };
}

test("Launch status requires a confirmed launch date or explicit Preview display", () => {
  assert.equal(loadBadge().badge.hidden, true);
  assert.equal(loadBadge({ previewNew: "true" }).badge.hidden, false);
  assert.equal(loadBadge({ previewNew: "true", hostname: "labs.multiplier.co" }).badge.hidden, true);
  assert.equal(loadBadge({ launchDate: "2020-01-01", previewNew: "true" }).badge.hidden, true);
  assert.equal(loadBadge({ launchDate: "invalid", previewNew: "true" }).badge.hidden, true);
});

test("Launch status opens on launch and expires after one calendar month", () => {
  const { isNewLaunch } = loadBadge();
  for (const [launch, now, expected] of [
    ["2026-10-12", "2026-10-11T23:59:59Z", false],
    ["2026-10-12", "2026-10-12T00:00:00Z", true],
    ["2026-10-12", "2026-11-11T23:59:59Z", true],
    ["2026-10-12", "2026-11-12T00:00:00Z", false],
    ["2026-10-09", "2026-10-08T23:59:59Z", false],
    ["2026-10-09", "2026-10-09T00:00:00Z", true],
    ["2026-10-09", "2026-11-08T23:59:59Z", true],
    ["2026-10-09", "2026-11-09T00:00:00Z", false],
    ["2026-01-31", "2026-02-27T23:59:59Z", true],
    ["2026-01-31", "2026-02-28T00:00:00Z", false],
    ["2028-01-31", "2028-02-28T23:59:59Z", true],
    ["2028-01-31", "2028-02-29T00:00:00Z", false],
    ["2026-12-31", "2027-01-31T00:00:00Z", false],
    ["2026-02-30", "2026-03-01T00:00:00Z", false],
    ["", "2026-10-09T00:00:00Z", false],
  ]) {
    assert.equal(isNewLaunch(launch, new Date(now)), expected, `${launch} at ${now}`);
  }
});
