# Kebrane — Backlog plateforme (tickets pour Claude Code)

*Créé le 2 août 2026. Décliné de `docs/plan-site-kebrane.md` (aligné v0.2 + charte v1.0).*

## Décisions actées (cadre de tous les tickets)
- **Ordre v0.2** : socle → compte/auth → GermanPass connecté → paiements → événements → admin → **site public en dernier**.
- **Structure Option 2** : `apps/germanpass` (existant) + `apps/kebrane` (compte/hub puis site) ; **logique commune dans `packages/`** ; SSO Clerk par **sous-domaines de `kebrane.com`**.
- **Auth** : Clerk (verrouillé). Identité Clerk **liée à un `user` Core** (source de vérité métier) ; RBAC modélisé côté Core.
- **Charte** (`brand/CHARTE.md`) : **Georgia**, **Marine `#1F3352`**, **Rouge `#A5322C`**, symbole universel + **accent par produit** + « **By Kebrane** ». Logo figuratif à venir → wordmark provisoire.

## Frontières non négociables (à tenir dès le jour 1)
Isolation par **`product_id`**, **RBAC**, **journal d'activité**, **événements à 3 gravités**, **auth pensée SSO**. Un produit **n'appelle Core que via l'interface de services** (`@kebrane/core`), jamais ses tables → **imposé par lint** (pas d'imports profonds inter-modules).

## Contraintes techniques
Next.js 16 (App Router, Turbopack dev ; `--webpack` seulement si serwist), React 19, TS strict, Tailwind + shadcn/ui + lucide, Prisma + **un seul PostgreSQL**, Clerk. CSP **incluant Clerk** dans chaque app (script/connect/img/worker/frame). Perf dev : préférer FS natif WSL.

### Légende
Priorité **P1/P2/P3** · Effort **S/M/L** · Dépendances indiquées par IDs.

---

## Phase 1 — Socle (DB + design system)

### KB-01 · `packages/db` — PostgreSQL unique + schéma Core + client
**P1 · M · dépend de : —**
- Mettre en place Prisma central (`@kebrane/db`) sur **un seul PostgreSQL** ; client partagé exporté.
- Poser les tables Core de base (voir KB-06 pour le détail domaine) ou préparer le socle migrable.
- Dev : `docker-compose` (postgres + redis). Prod : hébergeur à décider (PO).
**Acceptation** : `@kebrane/db` génère le client ; migration initiale applique ; consommable par une app.
**Fichiers** : `packages/db/*`, `docker-compose.yml`.

### KB-02 · `packages/ui` — design system depuis la charte
**P1 · L · dépend de : —**
- Traduire la charte en **tokens** : Marine `#1F3352` / Rouge `#A5322C`, **couleur d'accent paramétrable par produit**, neutres + sémantiques (success/warning/danger/info) **AA** ; **Georgia** (marque) + une sans-serif lisible pour l'UI dense ; rayons/ombres/espacements.
- Preset Tailwind dans `packages/config` + variables CSS shadcn.
- Composants de base thémés (Button, Card, Input, Badge, Nav, Footer) + **`Logo`/`Wordmark` avec mention « By Kebrane »** (wordmark Georgia + symbole provisoire tant que le logo figuratif n'existe pas).
- Page de démo du design system.
**Acceptation** : démo conforme charte ; accent produit injectable ; contrastes AA ; `@kebrane/ui` importable par les apps.
**Fichiers** : `packages/ui/*`, `packages/config/*`.
**Décision PO** : couleur d'accent officielle de GermanPass (dans le cadre Marine/Rouge).

### KB-03 · Config partagée + règle de lint de frontière
**P1 · S · dépend de : —**
- `packages/config` : eslint/tsconfig/tailwind préréglés (preset thème Kebrane).
- **Règle de lint interdisant les imports profonds** entre Core et produits (frontière v0.2).
**Acceptation** : lint échoue si un produit importe autre chose que l'API publique de Core.
**Fichiers** : `packages/config/*`, config eslint racine.

### KB-04 · Ops — nettoyer les projets Vercel vides
**P3 · S · dépend de : —**
- Supprimer/renommer `project-gglt1`, `project-ruide` (coquilles vides) ; nomenclature claire (`kebrane-web`, `kebrane-account`/`kebrane`, `kebrane-admin`, `germanpass`).
**Acceptation** : plus de projets vides ; noms cohérents.

---

## Phase 2 — Compte Kebrane (auth + comptes + RBAC)

### KB-05 · `packages/auth` — Clerk centralisé + liaison Core
**P1 · M · dépend de : KB-01**
- Centraliser Clerk (helpers, gardes de routes, rôles) dans `@kebrane/auth`.
- **Lier l'identité Clerk à un `user` Core** (réconciliation `clerkUserId`), source de vérité métier ; RBAC lu côté Core.
- Reprendre l'approche déjà éprouvée sur GermanPass (adaptateur `auth()`, lazy-link, webhook).
**Acceptation** : une session Clerk résout un `user` Core ; rôles Core exposés aux gardes.
**Fichiers** : `packages/auth/*`.

### KB-06 · `packages/core` — domaine transversal + interface de services
**P1 · L · dépend de : KB-01**
- Modèles : `accounts`, **`products` (registre + `product_id`)**, `roles`/`permissions` (RBAC), base `events` + **journal d'activité**, socle `billing`/`notifications`/`support` (interfaces).
- Exposer l'**interface de services publique** (auth, accounts, billing, notifications, events, support) — **seule porte** pour les produits.
**Acceptation** : un produit peut créer/lire un compte, vérifier un accès et émettre un événement **uniquement via l'interface** ; aucun accès direct aux tables Core.
**Fichiers** : `packages/core/*`.

### KB-07 · `apps/kebrane` — scaffold + hub de compte minimal
**P1 · M · dépend de : KB-02, KB-05, KB-06**
- Scaffolder l'app (Next 16, `@kebrane/ui`/`auth`/`core`), `<ClerkProvider>`, `proxy.ts` + **CSP incluant Clerk** dès le départ.
- Écrans Clerk **thémés charte** (`appearance`) ; **hub de compte** minimal (profil, liste produits — vide au début).
**Acceptation** : `pnpm --filter @kebrane/kebrane dev` OK ; créer un compte, voir le hub ; CSP ne bloque pas Clerk.
**Fichiers** : `apps/kebrane/*`.

---

## Phase 3 — Brancher GermanPass au compte Kebrane

### KB-08 · GermanPass consomme Core via l'interface de services
**P1 · M · dépend de : KB-06, KB-07** — **Statut : fait (2 août 2026)**
- [x] GermanPass appelle `@kebrane/core` (comptes, accès) **via l'interface** ; retirer toute logique transversale dupliquée (auth déjà sur Clerk).
- [x] Poser les **crochets de contrôle d'accès** (gating rôle/abonnement) même avant le paiement.
**Acceptation** : [x] GermanPass ne lit plus que son métier + l'API Core ; [x] gating en place.
**Fichiers** : `apps/germanpass/*`.

**Réalisation.** Pont unique `apps/germanpass/src/lib/kebrane.ts` : seule porte du produit
vers Core (`@kebrane/core` uniquement, jamais `@kebrane/db`). Il expose la résolution du
compte Kebrane (`clerkUserId`), le miroir de l'accès produit (`access.sync`) et le crochet
`isKebraneAccessDenied()` branché dans `lib/guards.ts` (`requireStudent`) et
`lib/active-gate.ts` (`requireActivePage`). Points de synchronisation : `lib/account.ts`
(activation, expiration cron), `api/admin/users/[id]` (suspend / unsuspend / set_plan),
`auth.ts` (lazy-link) et `api/webhooks/clerk`.

**Sens de la vérité.** Tant que `billing` n'est pas dans Core (KB-13), GermanPass reste la
source de vérité de SON accès et Core n'en est que le miroir : le crochet est en mode
**observation** (`KEBRANE_ACCESS_ENFORCE=0`, il journalise `product_access.denied_observed`
sans bloquer). KB-13 inversera le sens en passant le drapeau à `1`. Core indisponible ⇒
le pont échoue en silence, GermanPass n'est jamais bloqué.

**Cohabitation des deux bases (résolu ici, indispensable).** GermanPass garde sa base métier
(`DATABASE_URL`, daf_saas:55432) et Core a la sienne (`KEBRANE_DATABASE_URL`, kebrane:55433).
Trois collisions corrigées : (1) `node-linker=hoisted` ⇒ un seul `node_modules/@prisma/client`
pour tout le dépôt, les deux schémas s'y écrasaient — le client Core est désormais généré
sous `@kebrane/prisma-client` (`serverExternalPackages` dans les deux apps pour qu'il reste
externalisé) ; (2) clé de singleton globale commune `globalThis.prisma` — désormais
`__kebranePrisma` / `__germanpassPrisma` ; (3) même variable `DATABASE_URL` — Core lit
`KEBRANE_DATABASE_URL` (repli `DATABASE_URL` pour `apps/kebrane`) et la passe en
`datasourceUrl`. Sans `KEBRANE_DATABASE_URL`, le pont est **désactivé** (pas de repli
silencieux sur la base produit).

**Vérifié** : `typecheck` vert (les deux apps), `build` vert et sans warning (les deux apps),
`test` GermanPass 106/106 (dont 8 nouveaux sur `toKebraneAccessStatus`).

### KB-09 · Enregistrer GermanPass dans le registre produits
**P2 · S · dépend de : KB-06** — **Statut : fait (2 août 2026)**
- [x] Déclarer GermanPass dans `products` (`product_id`, URL, **accent couleur**, « By Kebrane ») ; réconciliation `clerkUserId` ↔ `user` Core (déjà en place côté GermanPass).
**Acceptation** : [x] le hub liste GermanPass avec son statut d'accès.
**Fichiers** : `packages/core/*`, seed/registre.

**Réalisation.** Registre déclaratif `packages/core/src/registry.ts` (`PRODUCT_REGISTRY`)
appliqué par `products.syncRegistry()` — donc **via l'interface de services**, jamais les
tables. Seed idempotent : `pnpm --filter @kebrane/core seed`. L'URL du produit est
surchargeable par env (`GERMANPASS_URL`) pour passer de localhost au sous-domaine (KB-10)
sans retoucher la base.

Le hub (`apps/kebrane/src/app/hub/page.tsx`) ne code plus GermanPass en dur : il boucle sur
`products.list()` croisé avec `access.forAccount()` et affiche une pastille par carte —
**Actif** / **En attente** / **Suspendu** / **À souscrire** — avec le CTA correspondant
(« Ouvrir » si l'accès est actif, « Découvrir » sinon, « Bientôt » si le produit n'est pas
`ACTIVE`). Charte respectée : le Rouge (accent rare) n'est employé que pour « Suspendu »,
le seul état qui appelle une action.

**⚠ Décision PO en attente** : l'accent officiel de GermanPass. Le registre porte pour
l'instant le Rouge de la charte `#A5322C` (marqué provisoire dans `registry.ts`) ; changer
la valeur et rejouer le seed suffira.

**Reprise de l'existant.** La synchronisation « au fil de l'eau » se déclenche sur un
*changement* d'état. Les comptes **déjà liés à Clerk avant KB-08** n'en connaissent aucun :
sans reprise, leur carte serait restée « À souscrire » alors que leur accès est valide.
D'où `pnpm --filter @kebrane/germanpass kebrane:backfill` — rejoue une fois la
synchronisation pour tous les comptes liés, idempotent, à passer après chaque déploiement.

**Vérifié** : seed joué sur la base de dev (`products` : 1 ligne, slug `germanpass`, ACTIVE) ;
rendu du hub validé sur les 4 statuts d'accès via une transaction annulée (base inchangée) ;
`build` `apps/kebrane` vert. **Boucle complète prouvée sur données réelles** : le backfill a
reflété le compte existant en `ProductAccess` ACTIVE/FULL pour `germanpass`, avec
l'événement `product_access.changed` (gravité IMPORTANT) au journal.

### KB-10 · SSO sous-domaines + ouverture produit depuis le hub
**P1 · M · dépend de : KB-07, KB-09** — **Statut : fait côté code (2 août 2026) ; reste la config du dashboard Clerk en prod**
- [x] Configurer Clerk pour **sous-domaines de `kebrane.com`** (`app.` / `germanpass.`) → **cookie de session partagé**.
- [x] Bouton hub « Ouvrir GermanPass » qui **porte la session** ; retour vers le hub.
- [x] `allowedRedirectOrigins`, CSP `connect-src`/`frame-src` par app.
**Acceptation** : [~] « compte Kebrane → hub → GermanPass connecté → retour » sans re-login
— *tout est en place et vérifié techniquement ; le parcours connecté demande une session
réelle (voir « Reste à faire »).*
**Fichiers** : config Clerk, `apps/kebrane`, `apps/germanpass` (env/CSP).

**Topologie retenue — et pourquoi il n'y a PAS de « satellite ».** Le hub et les produits
vivent sur des **sous-domaines d'un même domaine racine** (`app.kebrane.com`,
`germanpass.kebrane.com`). Une seule instance Clerk pose alors son cookie de session sur
`.kebrane.com` : la session est partagée nativement, **aucune configuration satellite n'est
nécessaire**. Le mode satellite ne sert que pour des domaines racines *différents* ; il
reste disponible sans refonte, par env (`NEXT_PUBLIC_CLERK_IS_SATELLITE`,
`NEXT_PUBLIC_CLERK_DOMAIN`, câblés sur `<ClerkProvider>` de GermanPass). Cela **tranche de
fait** la décision PO « sous-domaines vs satellites » en faveur des sous-domaines, qui est
la lecture déjà écrite dans ce ticket ; à confirmer.

**Réalisation.** `apps/*/src/lib/platform.ts` (module sans dépendance, importable par le
layout racine sans tirer Prisma) centralise les URL de la plateforme et
`ALLOWED_REDIRECT_ORIGINS`, passés à `<ClerkProvider allowedRedirectOrigins={…}>` dans les
deux apps — sans quoi Clerk refuse la redirection cross-origine. Le hub ouvre le produit
via `products.url` **lu dans le registre Core** (KB-09), pas une URL en dur. GermanPass
gagne un retour « Compte Kebrane » dans le header desktop et le menu mobile (lien natif :
origine différente, donc pas de `next/link`). La CSP des deux apps prend les origines Clerk
depuis `CLERK_FRONTEND_API_ORIGIN` : passer en prod ne demande plus de toucher au code.

**Vérifié** : `typecheck` et `build` verts sur les deux apps ; les deux serveurs de dev
répondent 200 ; `/hub` non connecté redirige (307) ; `allowedRedirectOrigins` bien présent
dans la charge utile Clerk du hub ; **Clerk se charge sans aucune erreur console ni blocage
CSP sur les deux apps** (piège n°1 du handoff), et les deux affichent « Sign in to
Kebrane » — preuve qu'elles partagent la même instance Clerk, prérequis du SSO.

**Reste à faire (hors code).**
1. *Parcours connecté* : dérouler « hub → Ouvrir GermanPass → retour Compte Kebrane » avec
   une vraie session. En dev, `localhost:3000` et `localhost:3001` partagent déjà leurs
   cookies (même hôte, ports différents) : ça doit passer sans re-login.
2. *Dashboard Clerk, au passage en prod* : ajouter le domaine de production `kebrane.com`,
   laisser Clerk provisionner `clerk.kebrane.com` (Frontend API), puis renseigner
   `CLERK_FRONTEND_API_ORIGIN=https://clerk.kebrane.com` et les URL publiques
   (`NEXT_PUBLIC_KEBRANE_HUB_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GERMANPASS_URL`,
   `GERMANPASS_URL`) dans les deux apps, puis rejouer le seed du registre.

### KB-11 · Activer la règle de lint de frontière sur GermanPass
**P2 · S · dépend de : KB-03, KB-08** — **Statut : fait (2 août 2026)**
- [x] Vérifier que GermanPass respecte la frontière (imports profonds Core interdits) ; corriger les violations.
**Acceptation** : [x] lint vert ; [x] aucune violation de frontière.

**Réalisation.** `apps/germanpass/.eslintrc.json` étend désormais
`./node_modules/@kebrane/config/eslint-boundaries.cjs`. La règle partagée a été **durcie** :
elle n'interdisait que les imports profonds, elle interdit maintenant aussi la couche
données elle-même — `@kebrane/db` et `@kebrane/prisma-client` sont bannis des produits, qui
doivent passer par `@kebrane/core`. C'est l'énoncé exact de la frontière v0.2, désormais
opposable et pas seulement documenté. La règle reste réservée aux **produits** :
`packages/core` accède légitimement à `@kebrane/db`, c'est son rôle.

`@kebrane/db` a par ailleurs été **retiré des dépendances** de GermanPass : le produit n'en
a jamais eu besoin (les types du domaine sont ré-exportés par `@kebrane/core`). La frontière
est donc tenue à trois niveaux : dépendances déclarées, règle de lint, et un pont unique
(`lib/kebrane.ts`).

**Vérifié** : lint GermanPass en sortie 0. Surtout, la règle a été **prouvée mordante** — un
fichier sonde important `@kebrane/db` et `@kebrane/core/src/index` a bien produit les deux
erreurs `no-restricted-imports` attendues, avant d'être retiré (un lint vert seul ne prouve
pas qu'une config est chargée).

---

## Phase 4 — Métier GermanPass (cohérence visuelle)

### KB-12 · Migrer l'UI GermanPass vers `@kebrane/ui`
**P2 · L · dépend de : KB-02**
- Adopter progressivement `@kebrane/ui` (accent GermanPass), sans big-bang ; s'appuyer sur `apps/germanpass/docs/UX-TICKETS.md`.
**Acceptation** : GermanPass cohérent avec la maison Kebrane ; pas de régression.
**Fichiers** : `apps/germanpass/*`.

---

## Phase 5 — Abonnements, paiements & paywall

### KB-13 · Module billing Core + paywall
**P1 · L · dépend de : KB-06, KB-08**
- ⚠ **Décision PO bloquante** : **moyen(s) de paiement** — v0.2 mentionne **Stripe** ; GermanPass utilise aujourd'hui **mobile money (Orange/MTN) + preuve + validation admin**. Trancher (Stripe / mobile money / les deux) avant implémentation.
- Implémenter `billing` dans Core + **paywall** + gating par abonnement (crochets KB-08).
**Acceptation** : accès conditionné à l'abonnement selon le moyen retenu ; parcours de paiement testé.
**Fichiers** : `packages/core/*`, apps concernées.

---

## Phase 6 — Événements & notifications

### KB-14 · Catalogue d'événements 3 gravités + notifications
**P2 · M · dépend de : KB-06**
- Catalogue d'événements (info / important / action immédiate), routage (notif / e-mail / ticket) ; e-mails transactionnels essentiels.
**Acceptation** : événements clés émis et routés ; e-mails partent.
**Fichiers** : `packages/core/*` (events/notifications).

---

## Phase 7 — Mini-dashboard admin

### KB-15 · `apps/admin` — admin minimal + 2FA staff obligatoire
**P2 · M · dépend de : KB-06**
- App `admin.kebrane.com` ; **2FA staff obligatoire** (Clerk).
- Afficher les 7 chiffres : inscrits · abonnements actifs · revenus · paiements échoués · dernière connexion · progression générale · journal d'erreurs. Pas de sur-outillage.
**Acceptation** : les 7 indicateurs s'affichent ; accès staff protégé par 2FA.
**Fichiers** : `apps/admin/*`.

---

## Phase 8 — Site public `kebrane.com` (EN DERNIER)

### KB-16 · Landing marque Kebrane + catalogue produits
**P2 · L · dépend de : KB-02 (idéalement après un MVP produit concret)**
- Dans `apps/kebrane` (route publique) ou `apps/kebrane-web` : hero marque (charte), **catalogue produits** (GermanPass 1er, autres « bientôt »), promesse « un compte, tous les produits », CTA.
- Inspiration réfs (`apps/germanpass/docs/UX-TICKETS.md`, ex. Geek Institut : hero photo + voile + titre display + CTA pill + nav glassy) — **en se différenciant** (montrer la profondeur produit).
- SEO/OpenGraph/sitemap, perf (`next/image`), a11y, `prefers-reduced-motion`.
**Acceptation** : site public conforme charte, responsive, Lighthouse correct.
**Fichiers** : `apps/kebrane/*` (public) ou `apps/kebrane-web/*`.

---

## Ordre & dépendances (résumé)
1. **Phase 1** : KB-01, KB-02, KB-03 (KB-04 en //).
2. **Phase 2** : KB-05, KB-06 → KB-07.
3. **Phase 3** : KB-08, KB-09 → KB-10, KB-11.
4. **Phase 4** : KB-12 (en //, progressif).
5. **Phase 5** : KB-13 (après décision paiement).
6. **Phase 6** : KB-14. · **Phase 7** : KB-15. · **Phase 8** : KB-16 (dernier).

> **MVP lançable = Phases 1 → 5.** Décisions PO à débloquer : moyen de paiement (KB-13), accent GermanPass (KB-02), PostgreSQL prod (KB-01), Brand Book complet dans `brand/`.

---

## Tickets additionnels — revue de l'état (2 août 2026)
*Issus de la revue après Phase 3 (KB-08→11 faits). Comblent des manques non couverts par KB-12→16.*

### KB-17 · Webhook Clerk côté Kebrane (`apps/kebrane`)
**P2 · M · dépend de : KB-06, KB-07** — **Statut : fait (2 août 2026)**
Aujourd'hui le compte Core Kebrane n'est créé QUE par le lazy-link (première visite du hub). GermanPass, lui, a un webhook Clerk. Il manque le webhook côté Kebrane.
- [x] Route `apps/kebrane/src/app/api/webhooks/clerk/route.ts` (`verifyWebhook`, publique, non couverte par le proxy).
- [x] `user.created` → `accounts.getOrCreateForClerk` (création **eager** du compte Core, ne plus dépendre du seul lazy-link en prod).
- [x] `user.deleted` → délier/anonymiser le compte (`clerkUserId`).
- [~] (option) `session.created` → **écarté** par décision PO (voir ci-dessous).
**Acceptation** : [x] une inscription Clerk crée le compte Core sans visite du hub ; [x] une suppression délie ; [x] signature vérifiée ; [x] idempotent ; [x] échec silencieux non bloquant. [x] Lazy-link conservé comme repli dev.
**Fichiers** : `apps/kebrane/src/app/api/webhooks/clerk/*`, `@kebrane/core`.

**Décision PO tranchée (2 août 2026) : PAS de session unique sur le compte Kebrane.**
La protection anti-partage reste portée par **GermanPass**, là où est le contenu payant.
La dupliquer sur le hub aurait un effet de bord fort : le cookie étant partagé sur
`.kebrane.com` (KB-10), ouvrir le hub sur un téléphone déconnecterait le PC **de tous les
produits à la fois**. Réversible plus tard, au prix d'une migration (`activeSessionId` sur
`Account` + `session.created`). `session.created` n'est donc pas traité ici.

**Délier plutôt que supprimer.** `Account.clerkUserId` passe **nullable**
(migration `20260802200730_kb17_account_clerk_user_id_nullable`) : sur `user.deleted`, le
compte Kebrane et son historique (accès produits, journal, facturation à venir) **survivent**
à la disparition de l'identité Clerk. Une réinscription avec le même email repasse par
`getOrCreateForClerk`, qui **retrouve le compte existant par email** — pas de doublon, pas
d'accès perdu. Deux nouveaux services dans Core : `accounts.unlinkClerk()` et le traçage
`account.clerk_linked` (gravité IMPORTANT) sur la branche « compte retrouvé par email »,
qui était jusqu'ici muette alors que c'est un changement d'identité.

**Idempotence.** Clerk réessaie un webhook en échec : les deux handlers sont rejouables sans
effet de bord, et n'émettent d'événement **que si l'état change**. C'est ce qui rend un 500
sans danger — d'où le choix de renvoyer 500 (et non 200) sur erreur, pour que Clerk réessaie.
Rien de tout cela ne bloque le membre : l'inscription Clerk aboutit indépendamment, et le
lazy-link rattrape au premier passage sur le hub.

**Effet de bord corrigé au passage.** `apps/kebrane` avait `"lint": "next lint"` — commande
**supprimée dans Next 16** : elle interprétait `lint` comme un répertoire et échouait. Le
lint n'avait donc **jamais tourné sur le hub**, ni la règle de frontière (KB-11). Corrigé
(`eslint .` + `.eslintrc.json` étendant `eslint-boundaries.cjs`, comme GermanPass) et
**prouvé mordant** : un fichier sonde important `@kebrane/db` et `@kebrane/core/src/index`
a produit les deux erreurs attendues, avant d'être retiré.

**Vérifié** : `turbo typecheck lint build` vert sur tout le workspace. Surtout, **recette de
bout en bout du webhook** (script temporaire signant des payloads Svix comme Clerk, contre le
serveur de dev, 23 assertions vertes) : signature invalide rejetée en 400 **sans rien écrire
en base** · `user.created` crée le compte (email normalisé, nom repris) + `account.created`
au journal · rejeu → aucun doublon, aucun événement en double · `user.deleted` → compte
toujours présent, `clerkUserId` à `null`, `account.clerk_unlinked` au journal · rejeu →
aucun second événement · réinscription avec un **nouvel** id Clerk et le même email → **même
compte** relié, `account.clerk_linked`. Base de dev nettoyée derrière.

**Reste à faire (hors code)** : créer l'abonnement webhook dans le dashboard Clerk pour le
hub — endpoint `<hub>/api/webhooks/clerk`, événements `user.created` et `user.deleted` —
et renseigner `CLERK_WEBHOOK_SIGNING_SECRET` dans `apps/kebrane`. ⚠ C'est un abonnement
**distinct** de celui de GermanPass : deux endpoints, deux secrets. À intégrer à KB-21.

### KB-18 · Tests & CI du monorepo
**P2 · L · dépend de : KB-06**
`@kebrane/core`, `@kebrane/auth` et `apps/kebrane` n'ont **aucun test** ; il n'y a **pas de CI**. Or la génération des **deux** clients Prisma (`@prisma/client` GermanPass + `@kebrane/prisma-client` Core) est sensible à l'ordre.
- Tests unitaires `@kebrane/core` : `accounts.getOrCreateForClerk` (idempotence + liaison par email), `access.sync` (idempotence + événement émis), `products.syncRegistry`.
- Smoke `apps/kebrane` : landing 200 ; `/hub` non connecté → 307.
- Pipeline CI (GitHub Actions) : install pnpm, **génération Prisma déterministe (ordre des deux clients)**, puis `turbo typecheck lint build test` sur tout le workspace.
- `turbo.json` : déclarer la dépendance de génération Prisma pour éviter la course entre les deux clients.
**Acceptation** : CI verte sur PR ; Core couvert ; génération Prisma reproductible en CI et au déploiement.
**Fichiers** : `.github/workflows/*`, `turbo.json`, `packages/core/tests/*`.

### KB-19 · Cohérence landing ↔ registre produits
**P3 · S · dépend de : KB-09**
La landing (`apps/kebrane/src/app/page.tsx`) code les 4 produits **en dur**, alors que le hub lit le **registre Core**. Deux sources = dérive assurée.
- La landing lit `products.list()` (source unique), avec repli statique si la base est indisponible.
- Ajouter **TCF Canada**, **Permis Cameroun**, **Gestion Formation** au `PRODUCT_REGISTRY` en `COMING_SOON` (chacun sa couleur d'accent).
**Acceptation** : landing et hub affichent le **même** catalogue ; plus aucun produit codé en dur.
**Fichiers** : `packages/core/src/registry.ts`, `apps/kebrane/src/app/page.tsx`.

### KB-20 · Attribution des rôles Kebrane (bootstrap admin)
**P2 · M · dépend de : KB-06 · prérequis de KB-15**
`Account.role` existe (`MEMBER/STAFF/ADMIN`) mais **aucun moyen de l'attribuer** — bloquant pour `admin.kebrane.com`.
- Service `accounts.setRole(accountId, role)` + événement (`account.role_changed`, gravité IMPORTANT).
- Bootstrap du premier admin : via env (`KEBRANE_BOOTSTRAP_ADMIN_EMAIL`, appliqué au seed/à la connexion) **ou** script `pnpm --filter @kebrane/core grant-admin <email>`.
**Acceptation** : un compte peut devenir `ADMIN` de façon **tracée** ; un bootstrap existe pour le tout premier admin.
**Fichiers** : `packages/core/*`, script.

### KB-21 · Préparation production (env, domaines, déploiement)
**P2 · L**
Le code SSO est prêt (KB-10) mais rien n'est déployé, et les variables d'env se sont multipliées.
- **Consolider/documenter** les variables par app : `KEBRANE_DATABASE_URL`, `DATABASE_URL`, `KEBRANE_ACCESS_ENFORCE`, `CLERK_FRONTEND_API_ORIGIN`, `GERMANPASS_URL`, `NEXT_PUBLIC_*`. `.env.example` complets et à jour.
- **DNS** : sous-domaines `app.` / `germanpass.` (+ `admin.`) de `kebrane.com` ; **instance Clerk de prod** + provisioning `clerk.kebrane.com` ; renseigner `CLERK_FRONTEND_API_ORIGIN`.
- **PostgreSQL de prod** (hébergeur — décision PO) ; **répliquer la CSP Clerk** dans `apps/germanpass/deploy/nginx.conf`.
- Rejouer `pnpm --filter @kebrane/core seed` (registre) + `pnpm --filter @kebrane/germanpass kebrane:backfill` **au déploiement**.
- Dérouler le **parcours SSO connecté réel** (« hub → Ouvrir GermanPass → retour ») — le reste-à-faire de KB-10.
**Acceptation** : les deux apps déployables sur sous-domaines ; SSO connecté prouvé de bout en bout ; seed + backfill intégrés au déploiement.
**Décisions PO** : hébergeur PostgreSQL de prod ; confirmation topologie **sous-domaines** (déjà tranchée de fait par KB-10, à valider).

---

## Statut synthétique (2 août 2026)
- **Faits** : KB-01, KB-02, KB-03 (Phase 1) · KB-05, KB-06, KB-07 (Phase 2) · **KB-08, KB-09, KB-10 [code], KB-11 (Phase 3)** · **KB-17**.
- **Prochains** : KB-19 (landing↔registre), KB-18 (tests/CI), KB-20 (rôles admin), puis KB-12 (UI GermanPass→@kebrane/ui), KB-13 (paiements — décision PO), KB-14/15, KB-21 (prod), KB-16 (site public), KB-04 (Vercel).
- **Décisions PO ouvertes** : moyen de paiement (KB-13) · accent officiel GermanPass (KB-02/09) · PostgreSQL prod (KB-21) · confirmation topologie domaines (KB-10/21).
- **Décisions PO tranchées** : ~~session unique côté Kebrane~~ → **non** (KB-17, 2 août 2026).
