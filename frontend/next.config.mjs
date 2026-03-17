/** @type {import("next").NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
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

