# Prompt de reprise — Kebrane (pour Claude Code)

Copie tout ce bloc dans Claude Code, à la racine du monorepo.

---

Tu reprends le projet **Kebrane** (monorepo, ici `/mnt/c/Users/kresp/projekts/kebrane`, sous WSL). Marque parapluie edtech : « **un compte Kebrane, tous les produits** », avec des **abonnements séparés par produit**. Fondateur solo.

## Lis d'abord ces docs du repo
- `docs/plan-site-kebrane.md` — plan plateforme (8 phases, aligné archi v0.2, structure Option 2).
- `docs/PLATFORM-TICKETS.md` — backlog KB-01 → KB-16 (contexte, à-faire, critères, fichiers).
- `brand/CHARTE.md` — charte v1.1 : **Georgia**, **Marine `#1F3352`**, **Rouge `#A5322C`** (accent rare ≤5 %), Ciel `#A7C4DC`, Sable `#ECD8BE`, Encre `#1A1A1A`, Papier `#FBF9F5`. Symbole « **A ouvert** » (assets `brand/assets/kebrane-symbol-*.svg`), endorsement « **By Kebrane** », équilibre 60/25/10/5, principe « **le retrait** ».
- `docs/etape-1-monorepo-clerk.md` — socle GermanPass sur Clerk (fait).
- `apps/germanpass/docs/UX-TICKETS.md` — backlog UX du produit GermanPass.

## Décisions actées (ne pas relitiger)
- Monorepo pnpm workspaces + Turborepo.
- Auth = **Clerk** (une seule application Clerk pour tout). L'identité Clerk est liée à un `Account` **Core** via `clerkUserId` (Core = source de vérité métier ; RBAC côté Core).
- Structure **Option 2** : `apps/germanpass` + `apps/kebrane` + logique commune dans `packages/{ui,core,auth,db,config}`. SSO via **sous-domaines de kebrane.com**. Site public **en dernier**.
- Frontière v0.2 : un produit n'accède au domaine **que** via `@kebrane/core` (jamais les tables) — lint `@kebrane/config/eslint-boundaries`.

## État actuel (fait, tourne)
- **GermanPass** (`apps/germanpass`, :3000) : Next 16, migré sur Clerk (next-auth retiré), `auth()` adapté avec lazy-link, dev Turbopack.
- **Phase 1 socle** : `@kebrane/config` (preset Tailwind + tokens charte + lint frontière) ; `@kebrane/ui` (Button, Card, Logo « A ouvert »/pastille/favicon/By Kebrane, tokens `styles.css`) ; `@kebrane/db` (Prisma, modèles `Account`, `Product`, `ProductAccess` [status+plan par produit], `Event`).
- **Phase 2** : `@kebrane/core` (interface de services : `accounts`, `products`, `access`, `events`) ; `@kebrane/auth` (`getKebraneSession()` / `requireRole()` lazy-link) ; `apps/kebrane` (:3001) — landing de marque + `/login` `/register` Clerk (catch-all `[[...rest]]`) + `/hub` connecté.
- **Phase 3 (KB-08→KB-11)** : GermanPass est branché au compte Kebrane. Pont unique
  `apps/germanpass/src/lib/kebrane.ts` (seule porte vers Core) ; crochet d'accès dans
  `guards.ts` / `active-gate.ts` ; registre produits semé (`pnpm --filter @kebrane/core seed`) ;
  reprise de l'existant (`pnpm --filter @kebrane/germanpass kebrane:backfill`, à rejouer après
  chaque déploiement) ; hub qui liste les produits avec leur `ProductAccess.status` ;
  `allowedRedirectOrigins` + retour « Compte Kebrane » depuis GermanPass ; lint de frontière
  actif et prouvé mordant.

## Gotchas déjà rencontrés (respecte-les)
- **CSP incluant Clerk** dans chaque app (`script/connect/img/worker/frame` : `*.clerk.accounts.dev`, `challenges.cloudflare.com`, `img.clerk.com`, `blob:`) — sinon écran blanc. Voir `apps/kebrane/next.config.ts` et `apps/germanpass/next.config.ts`.
- **Turbopack dev** : `turbopack: {}` dans next.config si une config webpack (serwist) est présente. Le `build` de GermanPass reste `--webpack` (serwist) ; le `dev` est Turbopack.
- `transpilePackages: ["@kebrane/ui","@kebrane/auth","@kebrane/core","@kebrane/db"]` dans chaque app.
- `@clerk/nextjs@7.6.3` : **pas** de `SignedIn`/`SignedOut` exportés → vérifier l'auth avec `auth()` serveur (resource-based, recommandé par Clerk). `UserButton`, `SignIn`, `SignUp` OK.
- **Ports dev** (WSL, plusieurs stacks tournent) : Kebrane Postgres **55433** / Redis **6381** ; GermanPass 55432/6380 ; TCF 5433/6379. `docker compose up -d` à la racine `kebrane/`.
- **Env** : `apps/kebrane/.env.local` = **mêmes clés Clerk** que `apps/germanpass/.env.local` + `DATABASE_URL` (…:55433…). `packages/db/.env` pour Prisma. pnpm 9 via corepack. Perf : préférer le FS natif WSL au `/mnt/c` (lent).

## Méthode — travailler ticket par ticket
Le backlog est la source de vérité de l'exécution :
- **Plateforme** : `docs/PLATFORM-TICKETS.md` (KB-01 → KB-16).
- **UX GermanPass** : `apps/germanpass/docs/UX-TICKETS.md` (UX-01 → UX-14).

Pour chaque ticket : suivre l'ordre du plan, **cocher les critères d'acceptation** au fur et à mesure, ne le marquer terminé que quand tous les critères passent (build + test manuel), puis **mettre à jour son statut** dans le fichier de tickets (`[ ]` → `[x]`, ou une ligne « Statut : fait »). Respecter les **dépendances** indiquées. Ne pas commencer un gros ticket sans avoir proposé un mini-plan.

**Statut à ce jour (2 août 2026) :**
- Faits : **KB-01, KB-02, KB-03** (Phase 1) ; **KB-05, KB-06, KB-07** (Phase 2) ; **KB-08, KB-09, KB-10, KB-11** (Phase 3).
- Prochain : **KB-12** (UI GermanPass → `@kebrane/ui`, progressif) et **KB-13** (paiements — *bloqué par décision PO*).
- Reste : KB-04 (nettoyage Vercel), KB-14/15/16.

## Prochaines étapes (ordre du plan)
1. **Terminer la recette KB-10** : dérouler « hub → Ouvrir GermanPass → retour Compte Kebrane »
   avec une vraie session (les deux apps sur `localhost` partagent leurs cookies, ça doit
   passer sans re-login). C'est le seul critère de Phase 3 non coché.
   Le hub doit afficher GermanPass en **Actif** (le backfill a été joué).
2. **Phase 4 — KB-12** : migrer progressivement l'UI GermanPass vers `@kebrane/ui`
   (s'appuyer sur `apps/germanpass/docs/UX-TICKETS.md`). Nécessite l'accent produit (décision PO).
3. **Phase 5 — KB-13** : `billing` dans Core + paywall + gating par abonnement. Les crochets
   sont déjà posés (KB-08) : il « suffira » de passer `KEBRANE_ACCESS_ENFORCE=1` une fois
   que Core pilote réellement l'accès. **Bloqué** : moyen de paiement.

## Points d'attention hérités de la Phase 3
- **Deux bases, deux clients Prisma** dans le processus GermanPass. Ne jamais réunifier
  `DATABASE_URL` (métier) et `KEBRANE_DATABASE_URL` (Core), ni les clés de singleton
  (`__germanpassPrisma` / `__kebranePrisma`), ni les sorties de génération
  (`@prisma/client` / `@kebrane/prisma-client`) — le monorepo est en `node-linker=hoisted`,
  tout nom partagé s'écrase. Les deux clients sont dans `serverExternalPackages`.
- **Sens de la vérité de l'accès** : GermanPass reste la source de vérité tant que KB-13
  n'est pas fait ; Core en est le miroir et le crochet n'observe que
  (`KEBRANE_ACCESS_ENFORCE=0`). Ne pas basculer le drapeau avant que `billing` existe.
- **Frontière opposable** : un produit ne peut plus importer `@kebrane/db` ni
  `@kebrane/prisma-client` (lint). Tout passe par `@kebrane/core`, via `lib/kebrane.ts`.

## Décisions PO en attente
- **Moyen(s) de paiement** (KB-13) — *bloquant pour la Phase 5*.
- **Couleur d'accent officielle de GermanPass** (KB-02) — le registre porte le Rouge de la
  charte `#A5322C` à titre provisoire ; changer `packages/core/src/registry.ts` et rejouer le seed.
- **Hébergeur PostgreSQL de prod** (KB-01).
- **Topologie de domaines** — *de fait tranchée par KB-10* : sous-domaines d'un même domaine
  racine (une instance Clerk, cookie sur `.kebrane.com`, pas de satellite). Le mode satellite
  reste activable par env si la décision change. **À confirmer.**

## Règles de travail
Travaille **ticket par ticket** depuis `docs/PLATFORM-TICKETS.md` (et `apps/germanpass/docs/UX-TICKETS.md` pour l'UX produit) : coche les critères d'acceptation et **mets à jour le statut du ticket** une fois terminé. Respecte la **charte** (Georgia, Marine/Rouge, retrait, By Kebrane) et les **frontières** (product_id, RBAC Core, interface de services, lint). Pour les gros morceaux, **propose un plan avant de coder**. Ne casse pas GermanPass en service.
