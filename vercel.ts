import {
  deploymentEnv,
  routes,
  type Route,
  type VercelConfig,
} from "@vercel/config/v1";
import { isRehearsalEnvironment } from "./routing.js";

if (!isRehearsalEnvironment(process.env.VERCEL_ENV)) {
  throw new Error("The front-door rehearsal may only be built for Vercel Preview.");
}

const heatCheckOrigin = "https://multiplier-heat-check-git-codex-about-re-52826a-multiplier-labs.vercel.app";
const webflowOrigin = "https://multiplier-cb687a.webflow.io";
const noIndexHeaders = {
  "x-robots-tag": "noindex, nofollow, noarchive",
};
const protectedRequestHeaders = {
  "x-vercel-protection-bypass": deploymentEnv("HEAT_CHECK_BYPASS_SECRET"),
};

function previewRewrite(
  source: string,
  destination: string,
  options: {
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
  } = {},
): Route {
  return routes.rewrite(source, destination, {
    ...(options.requestHeaders ? { requestHeaders: options.requestHeaders } : {}),
    responseHeaders: {
      ...noIndexHeaders,
      ...options.responseHeaders,
    },
  }) as Route;
}

export const config: VercelConfig = {
  trailingSlash: false,
  routes: [
    previewRewrite("/labs", "/multiplier-labs-landing-page.html"),
    previewRewrite("/robots.txt", "/robots-preview.txt"),
    previewRewrite("/sitemap.xml", "/sitemap-preview.xml"),
    previewRewrite("/llms.txt", "/llms-preview.txt"),
    previewRewrite(
      "/nvhc9u4gxsagNjhmN2Q0YTJmNzdkOWVmODg0YmUxMWU0/BpqbGJqIzZ2Zgco6Nxjgu8tdmEk",
      "/preview-analytics-disabled.js",
    ),
    { handle: "filesystem" },
    previewRewrite(
      "/labs/brand-heat-check",
      `${heatCheckOrigin}/labs/brand-heat-check`,
      { requestHeaders: protectedRequestHeaders },
    ),
    previewRewrite(
      "/labs/brand-heat-check/:path*",
      `${heatCheckOrigin}/labs/brand-heat-check/:path*`,
      { requestHeaders: protectedRequestHeaders },
    ),
    previewRewrite(
      "/labs/property-pulse",
      `${heatCheckOrigin}/labs/property-pulse`,
      { requestHeaders: protectedRequestHeaders },
    ),
    previewRewrite(
      "/labs/property-pulse/:path*",
      `${heatCheckOrigin}/labs/property-pulse/:path*`,
      { requestHeaders: protectedRequestHeaders },
    ),
    previewRewrite(
      "/labs/heat-check",
      `${heatCheckOrigin}/labs/heat-check`,
      { requestHeaders: protectedRequestHeaders },
    ),
    previewRewrite(
      "/labs/heat-check/api/:path*",
      `${heatCheckOrigin}/labs/heat-check/api/:path*`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: { "cache-control": "no-store" },
      },
    ),
    previewRewrite(
      "/labs/heat-check/pdf-render",
      `${heatCheckOrigin}/labs/heat-check/pdf-render`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: { "cache-control": "no-store" },
      },
    ),
    previewRewrite(
      "/labs/heat-check/:path*",
      `${heatCheckOrigin}/labs/heat-check/:path*`,
      { requestHeaders: protectedRequestHeaders },
    ),
    previewRewrite("/:path*", `${webflowOrigin}/:path*`),
  ],
};
