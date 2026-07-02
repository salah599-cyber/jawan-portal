import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "ws",
    "@neondatabase/serverless",
    "pg",
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "exceljs",
    "xlsx",
  ],
  outputFileTracingIncludes: {
    "/api/portfolio/msx/import": [
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
    ],
    "/portfolio/pe": ["./lib/db/pe-schema.sql"],
    "/portfolio/pe/[id]": ["./lib/db/pe-schema.sql"],
    "/portfolio/pe/new": ["./lib/db/pe-schema.sql"],
    "/portfolio/pe/[id]/edit": ["./lib/db/pe-schema.sql"],
    "/assets": ["./lib/db/asset-schema.sql"],
    "/assets/[id]": ["./lib/db/asset-schema.sql"],
    "/assets/new": ["./lib/db/asset-schema.sql"],
    "/assets/[id]/edit": ["./lib/db/asset-schema.sql"],
    "/api/cron/sync-schema": ["./lib/db/pe-schema.sql", "./scripts/sync-pe-schema.cjs"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    proxyClientMaxBodySize: "15mb",
  },
};

export default nextConfig;