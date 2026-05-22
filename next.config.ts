import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      // Consolidated into Wallet tabs
      { source: "/benefits",             destination: "/wallet?tab=credits-benefits", permanent: true },
      { source: "/credits",              destination: "/wallet?tab=credits-benefits", permanent: true },
      { source: "/annual-fees",          destination: "/wallet?tab=annual-fees",      permanent: true },
      { source: "/wallet/offers",        destination: "/wallet?tab=offers",           permanent: true },
      { source: "/wallet/points",        destination: "/wallet?tab=points",           permanent: true },
      { source: "/wallet/challenges",    destination: "/wallet?tab=challenges",       permanent: true },
      { source: "/wallet/applications",  destination: "/wallet?tab=applications",     permanent: true },
      // Merged into Ask
      { source: "/best-card",            destination: "/ask",                         permanent: true },
      // Folded into Today
      { source: "/wallet/copilot",       destination: "/dashboard",                   permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.plaid.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.plaid.com",
              "frame-src https://js.stripe.com https://cdn.plaid.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
