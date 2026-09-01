import { routes } from "@vercel/config/v1";

export const NO_INDEX_HEADERS = {
  "x-robots-tag": "noindex, nofollow, noarchive",
};

function rewrite(source, destination) {
  return routes.rewrite(source, destination);
}

export function isPreviewDeployment(vercelEnvironment) {
  return vercelEnvironment !== "production";
}

export function buildLabsConfig({ vercelEnvironment } = {}) {
  const preview = isPreviewDeployment(vercelEnvironment);
  const routeList = [];

  if (preview) {
    routeList.push({
      src: "^/(.*)$",
      headers: NO_INDEX_HEADERS,
      continue: true,
    });
  }

  routeList.push(
    rewrite("/", "/multiplier-labs-landing-page.html"),
    rewrite(
      "/robots.txt",
      preview ? "/robots-preview.txt" : "/robots-production.txt",
    ),
    rewrite(
      "/sitemap.xml",
      preview ? "/sitemap-preview.xml" : "/sitemap-production.xml",
    ),
    rewrite(
      "/llms.txt",
      preview ? "/llms-preview.txt" : "/llms-production.txt",
    ),
    { handle: "filesystem" },
    {
      src: "^/(.*)$",
      status: 404,
      headers: NO_INDEX_HEADERS,
    },
  );

  return {
    trailingSlash: false,
    routes: routeList,
  };
}
