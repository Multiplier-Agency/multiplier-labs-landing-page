export const PREVIEW_HEAT_CHECK_ORIGIN =
  "https://multiplier-heat-check-qeguqny13-multiplier-labs.vercel.app";
export const PREVIEW_WEBFLOW_ORIGIN = "https://multiplier-cb687a.webflow.io";

const HEAT_CHECK_PREFIXES = [
  "/labs/brand-heat-check",
  "/labs/property-pulse",
  "/labs/heat-check",
];

const BLOCKED_PRODUCTION_HEAT_CHECK_HOSTS = new Set([
  "www.multiplier.co",
  "multiplier.co",
  "heatcheck.multiplier.co",
  new URL(PREVIEW_HEAT_CHECK_ORIGIN).hostname,
]);
const PRODUCTION_HEAT_CHECK_HOST = "multiplier-heat-check.vercel.app";

function normalizePath(pathname) {
  return String(pathname || "").replace(/\/+$/, "") || "/";
}

export function isHeatCheckPath(pathname) {
  const normalized = normalizePath(pathname);
  return HEAT_CHECK_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function isRehearsalEnvironment(vercelEnvironment) {
  return vercelEnvironment === "preview"
    || vercelEnvironment === "development"
    || !vercelEnvironment;
}

export function getFrontDoorEnvironment(vercelEnvironment) {
  if (isRehearsalEnvironment(vercelEnvironment)) return "preview";
  if (vercelEnvironment === "production") return "production";
  throw new Error(`Unsupported Vercel environment: ${vercelEnvironment}`);
}

export function validateHttpsOrigin(name, rawValue, { allowedHostname, blockedHosts = [] } = {}) {
  if (!rawValue) {
    throw new Error(`${name} is required for a Production front-door build.`);
  }

  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be a bare origin with no credentials, path, query, or hash.`);
  }
  if (allowedHostname && url.hostname !== allowedHostname) {
    throw new Error(`${name} must use ${allowedHostname}.`);
  }

  const forbiddenHosts = new Set(blockedHosts.filter(Boolean).map((host) => host.toLowerCase()));
  if (forbiddenHosts.has(url.hostname.toLowerCase())) {
    throw new Error(`${name} cannot point to ${url.hostname}.`);
  }

  return url.origin;
}

export function resolveFrontDoorOrigins({
  vercelEnvironment,
  webflowProductionOrigin,
  heatCheckProductionOrigin,
  currentDeploymentHost,
}) {
  const environment = getFrontDoorEnvironment(vercelEnvironment);
  if (environment === "preview") {
    return {
      environment,
      webflowOrigin: PREVIEW_WEBFLOW_ORIGIN,
      heatCheckOrigin: PREVIEW_HEAT_CHECK_ORIGIN,
    };
  }

  const webflowOrigin = validateHttpsOrigin(
    "WEBFLOW_PRODUCTION_ORIGIN",
    webflowProductionOrigin,
    { allowedHostname: "wf.multiplier.co" },
  );
  const heatCheckOrigin = validateHttpsOrigin(
    "HEAT_CHECK_PRODUCTION_ORIGIN",
    heatCheckProductionOrigin,
    {
      blockedHosts: [
        ...BLOCKED_PRODUCTION_HEAT_CHECK_HOSTS,
        currentDeploymentHost,
        "wf.multiplier.co",
        new URL(PREVIEW_WEBFLOW_ORIGIN).hostname,
      ],
    },
  );

  if (new URL(heatCheckOrigin).hostname !== PRODUCTION_HEAT_CHECK_HOST) {
    throw new Error(
      `HEAT_CHECK_PRODUCTION_ORIGIN must use ${PRODUCTION_HEAT_CHECK_HOST}.`,
    );
  }

  return { environment, webflowOrigin, heatCheckOrigin };
}
