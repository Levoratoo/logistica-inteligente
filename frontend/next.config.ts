import path from "node:path";
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  trailingSlash: isStaticExport,
  images: {
    unoptimized: true,
  },
  basePath: isStaticExport ? basePath : undefined,
  assetPrefix: isStaticExport && basePath ? basePath : undefined,
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
