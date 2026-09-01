import type { VercelConfig } from "@vercel/config/v1";
import { buildLabsConfig } from "./vercel-labs.js";

export const config = buildLabsConfig({
  vercelEnvironment: process.env.VERCEL_ENV,
}) as VercelConfig;
