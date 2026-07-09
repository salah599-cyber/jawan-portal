import type { NextConfig } from "next";

const clerkOrigin =
  process.env.NODE_ENV === "production"
    ? "https://clerk.jawaninvest.com"
    : "https://*.clerk.accounts.dev";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkOrigin} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://img.clerk.com data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' " + clerkOrigin + " https://*.clerk.services",
  `frame-src ${clerkOrigin} https://challenges.cloudflare.com`,
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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
    "/api/portfolio/public-markets/import": [
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
    ],
    "/api/cash/import-statement": [
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
    ],
    "/portfolio/pe": ["./lib/db/pe-schema.sql"],
    "/portfolio/pe/[id]": ["./lib/db/pe-schema.sql"],
    "/portfolio/pe/new": ["./lib/db/pe-schema.sql"],
    "/portfolio/pe/[id]/edit": ["./lib/db/pe-schema.sql"],
    "/portfolio/public-markets": ["./lib/db/public-markets-schema.sql"],
    "/real-estate": ["./lib/db/real-estate-schema.sql"],
    "/real-estate/[id]": ["./lib/db/real-estate-schema.sql"],
    "/real-estate/new": ["./lib/db/real-estate-schema.sql"],
    "/real-estate/rent": ["./lib/db/real-estate-schema.sql"],
    "/cash": ["./lib/db/cash-management-schema-statements.ts"],
    "/cash/[id]": ["./lib/db/cash-management-schema-statements.ts"],
    "/cash/new": ["./lib/db/cash-management-schema-statements.ts"],
    "/api/cron/sync-schema": [
      "./lib/db/pe-schema.sql",
      "./lib/db/public-markets-schema.sql",
      "./lib/db/real-estate-schema.sql",
      "./scripts/sync-pe-schema.cjs",
      "./scripts/sync-public-markets-schema.cjs",
      "./scripts/sync-real-estate-schema.cjs",
    ],
  },
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "15mb",
    },
    proxyClientMaxBodySize: "15mb",
  },
};

export default nextConfig;
