# Kebrane — Étape 1 : Monorepo + GermanPass sur Clerk (statut)

*Suivi d'implémentation. Dernière maj : 30 juillet 2026.*

## Corrections au plan initial (validées avant code)

1. **GermanPass est en Next.js 16.2.9, pas 15.** Le fichier de garde est donc `src/proxy.ts`
   (déjà présent), pas `middleware.ts`. `clerkMiddleware()` s'installe dans `proxy.ts`.
   Vigilance : bug connu de `auth.protect()` dans `proxy.ts` sous Next 16 (redirection vers
   l'URL courante au lieu de la page de connexion) — à tester à la Phase B.
2. **Login Google (OAuth) en usage.** Le modèle `User` a `googleId` et `passwordHash` nullable.
   Les comptes OAuth-only ne se migrent PAS par hash bcrypt : ils nécessitent une connexion
   Google SSO côté Clerk + liaison de compte par email. À traiter séparément en Phase C.
3. **Stratégie de migration retenue : trickle / JIT** (migration au premier login) pour
   zéro-downtime et éviter le problème de snapshot. Le bulk (migration-script) reste une
   option de repli/complément.
4. Source de vérité des rôles à désigner : **base = vérité métier, Clerk = miroir** (sync
   unidirectionnelle). Prévoir webhook Clerk `user.created` pour maintenir `clerk_user_id`.

## Phase A — Monorepo + import GermanPass — FAIT

- [x] Structure `kebrane/` (pnpm workspaces + Turborepo)
- [x] `pnpm-workspace.yaml`, `package.json` racine, `turbo.json`, `.gitignore`, `.npmrc`
- [x] GermanPass copié dans `apps/germanpass` (sans node_modules/.next/.git/.env — original `daf-saas` intact)
- [x] Paquet renommé `@kebrane/germanpass`
- [x] Paquets partagés stubs : `@kebrane/auth`, `@kebrane/ui`, `@kebrane/db`, `@kebrane/config`
- [x] Tous les `package.json` valides, workspace résolu
- [x] `pnpm install` (pnpm 9.15 via corepack) + `pnpm --filter @kebrane/germanpass build` **VERTS**
      (build 29 s, 72 pages générées, toujours sous next-auth). Phase A close.

> Note : 3 fichiers 0-octet parasites (`germanpass@0.1.0`, `next`, `node`) hérités de
> `daf-saas` n'ont pas pu être supprimés (restriction du volume). Inoffensifs ; à retirer
> manuellement (`git rm`) une fois le repo initialisé.

## Phase B — Intégrer Clerk (retirer next-auth) — TERMINÉE

### Validé en test (30 juil.)
- Connexion / inscription / dashboard fonctionnels via Clerk.
- **Gotcha 1 — CSP** : `next.config.ts` bloquait les scripts Clerk (`script-src 'self'…`).
  Corrigé : ajout de `*.clerk.accounts.dev`, `challenges.cloudflare.com`, `img.clerk.com`,
  `worker-src blob:`, `frame-src`. ⚠ Répliquer dans `deploy/nginx.conf` avant la prod
  (remplacer `*.clerk.accounts.dev` par `clerk.<domaine>`).
- **Gotcha 2 — boucle /login↔/dashboard** : session Clerk sans user métier lié (webhook non
  configuré). Résolu par le repli **lazy-link** dans `src/auth.ts` (crée/relie le compte à la
  volée). Le webhook devient non-bloquant en dev.
- **Perf dev** : passage de webpack à **Turbopack** (`"dev": "next dev"` + `turbopack: {}` dans
  `next.config.ts`). `build` reste sur `--webpack` (serwist).

### next-auth retiré (clôture)
- Désinstallé `next-auth` + `@auth/prisma-adapter` (+ `overrides` nodemailer).
- Purge `AUTH_SECRET` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` du schéma `env.ts` et de `.env.example`.
- Route `[...nextauth]` supprimée. (Routes custom `/api/auth/{register,forgot-password,reset-password}`
  laissées en place mais mortes — nettoyage optionnel ultérieur.)
- **À faire côté machine** : `pnpm install` (retire next-auth de node_modules) puis vérifier `dev`/`build`.

### Détail de l'implémentation initiale (référence)

### Fait le 30 juil. (code en place, non retiré : next-auth reste installé le temps de valider)
- `prisma/schema.prisma` : `clerkUserId String? @unique` sur `User`.
- `package.json` : ajout `@clerk/nextjs ^7`.
- `.env.example` : bloc Clerk (clés, URLs sign-in/up, secret webhook).
- `src/auth.ts` : réécrit — `auth()` lit la session Clerk, résout l'user via
  `clerkUserId`, garde la forme `{user:{id,email,name,role,sid}}` (guards & consumers intacts).
- `src/proxy.ts` : `clerkMiddleware()` + `createRouteMatcher` (redirection manuelle
  vers /login, PAS `auth.protect()`).
- `app/layout.tsx` : `<ClerkProvider>`.
- `app/(public)/login|register/page.tsx` : `<SignIn/>` / `<SignUp/>` (routing="hash").
- `components/logout-button.tsx` + `app/account/page.tsx` : déconnexion via `useClerk().signOut()`.
- `app/api/webhooks/clerk/route.ts` : `verifyWebhook` — user.created (upsert PENDING + liaison
  email + marketing), session.created (activeSessionId = session unique), user.deleted (délie).
- `app/api/auth/[...nextauth]/route.ts` : neutralisé (404).

### Checklist d'activation (côté machine, avec les clés Clerk)
1. Créer l'app Clerk, activer la connexion **Email/Mot de passe** + **Google** (Social Connection).
2. Remplir `.env.local` avec les 6 variables Clerk (voir `.env.example`).
3. `pnpm install` (récupère `@clerk/nextjs`).
4. `pnpm --filter @kebrane/germanpass exec prisma migrate dev --name add_clerk_user_id`.
5. Créer un **endpoint webhook** Clerk → `https://<domaine>/api/webhooks/clerk`, événements
   `user.created`, `session.created`, `user.deleted` ; copier le signing secret dans `.env.local`.
   (En local : `ngrok` ou le tunneling du dashboard Clerk.)
6. `pnpm --filter @kebrane/germanpass build` — **nécessite de vraies clés Clerk** (le prerender
   des écrans échoue avec des placeholders). Puis test manuel : inscription, connexion, Google,
   route protégée, rôle admin, déconnexion, session unique (2e appareil déconnecte le 1er).
7. Une fois tout vert : retirer `next-auth` + `@auth/prisma-adapter`, supprimer l'ancien
   `src/auth.ts` next-auth résiduel et le dossier `[...nextauth]`, purger `AUTH_SECRET`/`AUTH_URL`.

### Détails de la version PRÊTE (référence)

### Cartographie next-auth (établie 30 juil.)
- **Point d'entrée unique** : `src/auth.ts` (`@/auth`) exporte `handlers, auth, signIn, signOut`
  (stratégie JWT ; providers Credentials + Google ; callback `signIn`).
- **Serveur** : `auth()` consommé dans 7 fichiers, centralisé dans `lib/guards.ts`
  (`requireUser / requireStudent / requireAuthenticated / requireFullPlan / requireAdmin`)
  et `lib/active-gate.ts` (garde de page). **Les guards revalident en base à chaque
  requête (ADR-004)** et lisent `user.role` en base → la **base reste source de vérité des rôles**,
  aucun changement de ce côté.
- **Client** : `signIn`/`signOut` de `next-auth/react` dans `app/(public)/login/page.tsx`,
  `register/page.tsx`, `account/page.tsx`, `components/logout-button.tsx`.
- **Proxy** : `src/proxy.ts` — check de présence du cookie `authjs.session-token` sur
  `PROTECTED_PREFIXES` (dashboard, admin, learn, practice, exam, account).
- **Route next-auth** : `app/api/auth/[...nextauth]/route.ts` (branche `handlers`).

### Stratégie d'intégration
1. Réimplémenter `@/auth` (ou le déléguer à `@kebrane/auth`) : `auth()` lit la session Clerk
   côté serveur et **résout l'utilisateur métier via `clerk_user_id`** (nouvelle colonne).
   Les guards `lib/guards.ts` restent quasi inchangés (juste la source de session).
2. `<ClerkProvider>` dans `app/layout.tsx` ; `clerkMiddleware()` dans `src/proxy.ts`
   (⚠ bug connu `auth.protect()` sous Next 16 → protéger via les guards serveur, pas via proxy).
3. Écrans : remplacer `/login` `/register` par `<SignIn/>` `<SignUp/>` (ou flux hébergés) ;
   `<UserButton/>`/`signOut` Clerk dans le header/account.
4. Webhook Clerk `user.created` → crée la ligne `User` locale (statut `PENDING`) et pose `clerk_user_id`.
5. Retirer `next-auth`, `@auth/prisma-adapter`, `src/auth.ts` next-auth, la route `[...nextauth]`
   **une fois** tout le reste vert.

### Arbitrages nécessaires (bloquants avant code)
- **Session unique anti-partage** (`activeSessionId`/`sid`) : Clerk gère nativement les
  sessions multi-appareils. Choix : (a) abandonner le mécanisme maison, (b) limiter les
  sessions côté Clerk, (c) réimplémenter le check via `clerk_session_id` en base.
- **Flux d'inscription** : aujourd'hui register → `PENDING` → validation admin. À conserver
  via webhook (statut `PENDING` posé à la création Clerk) — à confirmer.

### Variables d'env à ajouter (`.env.local`, jamais commité)
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`,
`CLERK_WEBHOOK_SIGNING_SECRET`.

### Schéma
Ajouter `clerkUserId String? @unique` sur `User` (migration Prisma) pour la réconciliation.

## Phase C — Migration users (trickle) — À VENIR

Import à marquer email vérifié (`emailVerifiedAt`), `password_hasher: bcrypt`, réconciliation
`clerk_user_id` sur les tables métier, traitement séparé des comptes Google.
**La vraie migration se fait sur l'instance Clerk de PROD, au moment de la bascule** — pas en dev.

## Phase D — Paquets partagés — À VENIR

Remplir `@kebrane/auth` (wrapper Clerk + gardes de routes + rôles), extraire `@kebrane/ui`,
documenter le contrat d'intégration produit (variables d'env, `product_id`).

## Repli
`daf-saas` reste en prod tel quel. Le repli est total tant que la prod n'a pas basculé sur Clerk.
Après bascule + écriture de `clerk_user_id`, prévoir un plan de rollback dédié (staging identique prod).
