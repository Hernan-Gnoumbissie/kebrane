import type { NextConfig } from "next";

/**
 * Origines Clerk autorisées par la CSP (KB-10).
 * En dev, le Frontend API est `<slug>.clerk.accounts.dev` → couvert par le
 * joker. EN PRODUCTION il devient `clerk.kebrane.com` : le renseigner dans
 * `CLERK_FRONTEND_API_ORIGIN` suffit, sans toucher au code.
 */
const clerkOrigins = [
  "https://*.clerk.accounts.dev",
  process.env.CLERK_FRONTEND_API_ORIGIN,
]
  .filter(Boolean)
  .join(" ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // CSP incluant Clerk (script/connect/img/worker/frame) — voir `clerkOrigins`.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkOrigins} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://img.clerk.com",
      "font-src 'self'",
      `connect-src 'self' ${clerkOrigins} https://clerk-telemetry.com`,
      "worker-src 'self' blob:",
      "frame-src 'self' https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@kebrane/ui", "@kebrane/auth", "@kebrane/core", "@kebrane/db"],
  // Client Prisma Core : externalisé (jamais bundlé), comme Next le fait déjà
  // pour `@prisma/client` — sinon le moteur de requêtes n'est pas résolu.
  serverExternalPackages: ["@kebrane/prisma-client"],
  // Config Turbopack (dev) explicite pour le monorepo.
  turbopack: {},
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
