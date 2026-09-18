import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow larger multipart bodies through the proxy (images / small videos).
    // Large videos use signed direct-to-storage uploads and bypass this path.
    proxyClientMaxBodySize: "100mb",
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
