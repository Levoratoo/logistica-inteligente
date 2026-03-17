import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import("next").NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const isStaticExport = process.env.STATIC_EXPORT === "true";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  trailingSlash: true,
  outputFileTracingRoot: projectRoot,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: projectRoot,
  },
};

if (basePath.length > 0) {
  nextConfig.basePath = basePath;
  nextConfig.assetPrefix = `${basePath}/`;
}

if (isStaticExport) {
  nextConfig.output = "export";
}

export default nextConfig;
