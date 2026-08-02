import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

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
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // CSP : adapté à Next.js (inline scripts nécessaires) + OpenAI API + Clerk.
    // Ajuster AI_BASE_URL dans la directive connect-src si vous utilisez un proxy.
    //
    // Clerk : en dev, le Frontend API est `<slug>.clerk.accounts.dev` → couvert par
    // `https://*.clerk.accounts.dev`. EN PRODUCTION, le Frontend API devient
    // `clerk.<votre-domaine>` : AJOUTER ce domaine à script-src ET connect-src
    // (ex. `https://clerk.kebrane.xxx`). `challenges.cloudflare.com` = CAPTCHA Turnstile de Clerk.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js injecte des scripts inline (nonce non utilisé ici → unsafe-inline)
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkOrigins} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      // Clerk sert les avatars/logos depuis img.clerk.com
      "img-src 'self' data: blob: https://img.clerk.com",
      "font-src 'self'",
      // API IA + Clerk Frontend API + télémétrie Clerk
      `connect-src 'self' https://api.openai.com ${clerkOrigins} https://clerk-telemetry.com`,
      // Audio/video servis depuis /api/files/*
      "media-src 'self' blob:",
      "object-src 'none'",
      // Service Worker Serwist (PWA) + workers blob de Clerk (timers)
      "worker-src 'self' blob:",
      // CAPTCHA Turnstile de Clerk rendue en iframe
      "frame-src 'self' https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Paquets du monorepo publiés en TypeScript source (KB-08).
  transpilePackages: ["@kebrane/core", "@kebrane/db"],
  // Client Prisma de la base Core : externalisé (jamais bundlé), comme Next le
  // fait déjà pour `@prisma/client` (client de la base métier GermanPass).
  serverExternalPackages: ["@kebrane/prisma-client"],
  // Config Turbopack (dev). Vide = comportement par défaut. Sa présence lève
  // l'ambiguïté avec la config webpack injectée par serwist (qui ne sert qu'au
  // `build --webpack`), sinon Turbopack refuse de démarrer en dev.
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSerwist(nextConfig);
