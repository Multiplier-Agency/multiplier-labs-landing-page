import { deploymentEnv, matchers, routes } from "@vercel/config/v1";
import { resolveFrontDoorOrigins } from "./routing.js";

export const NO_INDEX_HEADERS = {
  "x-robots-tag": "noindex, nofollow, noarchive",
};

const INDEX_HEADERS = {
  "x-robots-tag": "index, follow",
};

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  ...NO_INDEX_HEADERS,
};

const WEBFLOW_ANALYTICS_LOADER =
  "/nvhc9u4gxsagNjhmN2Q0YTJmNzdkOWVmODg0YmUxMWU0/BpqbGJqIzZ2Zgco6Nxjgu8tdmEk";
const FRONT_DOOR_HEADERS = {
  "x-multiplier-front-door": "1",
};

function rewrite(source, destination, { requestHeaders, responseHeaders } = {}) {
  return routes.rewrite(source, destination, {
    ...(requestHeaders ? { requestHeaders } : {}),
    responseHeaders: {
      ...FRONT_DOOR_HEADERS,
      ...responseHeaders,
    },
  });
}

function routeResponseHeaders(environment, productionHeaders = {}) {
  const headers = environment === "preview"
    ? { ...NO_INDEX_HEADERS, ...productionHeaders }
    : productionHeaders;
  return Object.keys(headers).length ? headers : undefined;
}

function redirect(source, destination, { has } = {}) {
  return routes.redirect(source, destination, {
    permanent: true,
    requestHeaders: FRONT_DOOR_HEADERS,
    ...(has ? { has } : {}),
  });
}

function legacyHeatCheckRedirects() {
  const legacyHost = matchers.host("heatcheck.multiplier.co");
  return [
    redirect("/", "https://www.multiplier.co/labs/brand-heat-check", {
      has: [legacyHost],
    }),
    redirect("/property", "https://www.multiplier.co/labs/property-pulse", {
      has: [legacyHost],
    }),
    redirect(
      "/report/:shareId",
      "https://www.multiplier.co/labs/heat-check/report/:shareId",
      { has: [legacyHost] },
    ),
    {
      src: "^/(.*)$",
      has: [legacyHost],
      status: 404,
      headers: NO_INDEX_HEADERS,
    },
  ];
}

export function buildFrontDoorConfig({
  vercelEnvironment,
  webflowProductionOrigin,
  heatCheckProductionOrigin,
  currentDeploymentHost,
} = {}) {
  const { environment, webflowOrigin, heatCheckOrigin } = resolveFrontDoorOrigins({
    vercelEnvironment,
    webflowProductionOrigin,
    heatCheckProductionOrigin,
    currentDeploymentHost,
  });
  const preview = environment === "preview";
  const protectedRequestHeaders = preview
    ? { "x-vercel-protection-bypass": deploymentEnv("HEAT_CHECK_BYPASS_SECRET") }
    : undefined;

  const routeList = [];
  if (preview) {
    routeList.push({
      src: "^/(.*)$",
      headers: NO_INDEX_HEADERS,
      continue: true,
    });
  } else {
    routeList.push(...legacyHeatCheckRedirects());
    routeList.push(
      redirect("/:path*", "https://www.multiplier.co/:path*", {
        has: [matchers.host("multiplier.co")],
      }),
      redirect("/cultural-heat-check-ai", "/labs/brand-heat-check"),
    );
  }

  routeList.push(
    rewrite("/labs", "/multiplier-labs-landing-page.html", {
      responseHeaders: routeResponseHeaders(environment, preview ? {} : INDEX_HEADERS),
    }),
    rewrite(
      "/robots.txt",
      preview ? "/robots-preview.txt" : "/robots-production.txt",
      { responseHeaders: routeResponseHeaders(environment) },
    ),
    rewrite(
      "/sitemap.xml",
      preview ? "/sitemap-preview.xml" : "/sitemap-production.xml",
      { responseHeaders: routeResponseHeaders(environment) },
    ),
    rewrite(
      "/llms.txt",
      preview ? "/llms-preview.txt" : "/llms-production.txt",
      { responseHeaders: routeResponseHeaders(environment) },
    ),
  );

  if (preview) {
    routeList.push(
      rewrite(WEBFLOW_ANALYTICS_LOADER, "/preview-analytics-disabled.js", {
        responseHeaders: NO_INDEX_HEADERS,
      }),
    );
  }

  routeList.push(
    redirect("/multiplier-labs-landing-page.html", "/labs"),
    { handle: "filesystem" },
    rewrite(
      "/labs/brand-heat-check",
      `${heatCheckOrigin}/labs/brand-heat-check`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, preview ? {} : INDEX_HEADERS),
      },
    ),
    rewrite(
      "/labs/brand-heat-check/:path*",
      `${heatCheckOrigin}/labs/brand-heat-check/:path*`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, NO_INDEX_HEADERS),
      },
    ),
    rewrite(
      "/labs/property-pulse",
      `${heatCheckOrigin}/labs/property-pulse`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, preview ? {} : INDEX_HEADERS),
      },
    ),
    rewrite(
      "/labs/property-pulse/:path*",
      `${heatCheckOrigin}/labs/property-pulse/:path*`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, NO_INDEX_HEADERS),
      },
    ),
    rewrite("/labs/heat-check", `${heatCheckOrigin}/labs/heat-check`, {
      requestHeaders: protectedRequestHeaders,
      responseHeaders: routeResponseHeaders(environment, NO_INDEX_HEADERS),
    }),
    rewrite(
      "/labs/heat-check/api/:path*",
      `${heatCheckOrigin}/labs/heat-check/api/:path*`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, NO_STORE_HEADERS),
      },
    ),
    rewrite(
      "/labs/heat-check/pdf-render",
      `${heatCheckOrigin}/labs/heat-check/pdf-render`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, NO_STORE_HEADERS),
      },
    ),
    rewrite(
      "/labs/heat-check/report/:path*",
      `${heatCheckOrigin}/labs/heat-check/report/:path*`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, NO_STORE_HEADERS),
      },
    ),
    rewrite(
      "/labs/heat-check/assets/:path*",
      `${heatCheckOrigin}/labs/heat-check/assets/:path*`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment),
      },
    ),
    rewrite(
      "/labs/heat-check/:path*",
      `${heatCheckOrigin}/labs/heat-check/:path*`,
      {
        requestHeaders: protectedRequestHeaders,
        responseHeaders: routeResponseHeaders(environment, NO_INDEX_HEADERS),
      },
    ),
    {
      src: "^/labs(?:/.*)?$",
      status: 404,
      headers: NO_INDEX_HEADERS,
    },
    rewrite("/", `${webflowOrigin}/`, {
      responseHeaders: routeResponseHeaders(environment),
    }),
    rewrite("/:path*", `${webflowOrigin}/:path*`, {
      responseHeaders: routeResponseHeaders(environment),
    }),
  );

  return {
    trailingSlash: false,
    routes: routeList,
  };
}
