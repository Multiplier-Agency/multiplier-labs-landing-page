export const NO_INDEX_HEADERS = {
  "x-robots-tag": "noindex, nofollow, noarchive",
};

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
    { handle: "filesystem" },
    {
      src: "^/(.*)$",
      status: 404,
      headers: NO_INDEX_HEADERS,
    },
  );

  return {
    buildCommand: "npm run build",
    outputDirectory: "dist",
    trailingSlash: false,
    routes: routeList,
  };
}
