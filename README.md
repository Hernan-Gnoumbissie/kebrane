# Kebrane

Monorepo Kebrane Core — socle unifié des produits edtech.

## Structure
- `apps/germanpass` — GermanPass (Next.js 16), première application importée.
- `packages/auth` — wrapper Clerk partagé (helpers, garde de routes, rôles).
- `packages/ui` — design system Kebrane.
- `packages/db` — schéma Prisma / client partagé (mutualisation ultérieure).
- `packages/config` — configs partagées (eslint, tsconfig, tailwind).

## Prérequis
Node 20+, pnpm 9+.

## Démarrer
```bash
pnpm install
pnpm dev
```

## Étape 1
Voir `docs/etape-1-monorepo-clerk.md` pour le plan d'implémentation et son statut.
