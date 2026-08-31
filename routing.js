const HEAT_CHECK_PREFIX = "/labs/heat-check";

export function isHeatCheckPath(pathname) {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  return normalized === "/labs/brand-heat-check"
    || normalized === "/labs/property-pulse"
    || normalized === HEAT_CHECK_PREFIX
    || normalized.startsWith(`${HEAT_CHECK_PREFIX}/`);
}

export function isRehearsalEnvironment(vercelEnvironment) {
  return vercelEnvironment === "preview" || !vercelEnvironment;
}
