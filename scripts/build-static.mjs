import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PUBLIC_FILES = [
  ["multiplier-labs-landing-page.html", "index.html"],
  ["labs-analytics.js", "labs-analytics.js"],
];

const PUBLIC_DIRECTORIES = ["assets", "fonts", "images"];

async function copyDirectoryIfPresent(source, destination) {
  try {
    if (!(await stat(source)).isDirectory()) return;
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  await cp(source, destination, { recursive: true });
}

export async function buildStaticSite({
  environment = process.env.VERCEL_ENV,
  outputDirectory = join(projectRoot, "dist"),
} = {}) {
  const resolvedOutput = resolve(outputDirectory);
  if (resolvedOutput === projectRoot) {
    throw new Error("Refusing to use the project root as the build output directory.");
  }

  const preview = environment !== "production";
  const discoveryVariant = preview ? "preview" : "production";

  await rm(resolvedOutput, { recursive: true, force: true });
  await mkdir(resolvedOutput, { recursive: true });

  for (const [source, destination] of PUBLIC_FILES) {
    await cp(join(projectRoot, source), join(resolvedOutput, destination));
  }

  for (const filename of ["robots.txt", "sitemap.xml", "llms.txt"]) {
    const extensionIndex = filename.lastIndexOf(".");
    const variantFilename = `${filename.slice(0, extensionIndex)}-${discoveryVariant}${filename.slice(extensionIndex)}`;
    await cp(join(projectRoot, variantFilename), join(resolvedOutput, filename));
  }

  for (const directory of PUBLIC_DIRECTORIES) {
    await copyDirectoryIfPresent(
      join(projectRoot, directory),
      join(resolvedOutput, directory),
    );
  }

  return resolvedOutput;
}

const executedDirectly = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executedDirectly) {
  await buildStaticSite();
}
