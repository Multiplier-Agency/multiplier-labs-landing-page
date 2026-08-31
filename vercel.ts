import type { VercelConfig } from "@vercel/config/v1";
import { buildFrontDoorConfig } from "./vercel-routing.js";

export const config = buildFrontDoorConfig({
  vercelEnvironment: process.env.VERCEL_ENV,
  webflowProductionOrigin: process.env.WEBFLOW_PRODUCTION_ORIGIN,
  heatCheckProductionOrigin: process.env.HEAT_CHECK_PRODUCTION_ORIGIN,
  currentDeploymentHost: process.env.VERCEL_URL,
}) as VercelConfig;
