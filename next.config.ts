import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ws", "@neondatabase/serverless", "pdf-parse", "pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    proxyClientMaxBodySize: "15mb",
  },
};

export default nextConfig;