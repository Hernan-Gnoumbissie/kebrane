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
**P2 · L · dépend de : KB-02** — **Statut : socle fait (3 août 2026) ; adoption des composants à poursuivre**
- [x] Adopter progressivement `@kebrane/ui` (accent GermanPass), sans big-bang ; s'appuyer sur `apps/germanpass/docs/UX-TICKETS.md`.
**Acceptation** : [x] GermanPass cohérent avec la maison Kebrane ; [x] pas de régression.
**Fichiers** : `apps/germanpass/*`, `packages/ui/src/styles/theme.css`, `packages/config/*`.

**La bascule se joue sur les TOKENS, pas sur les composants.** Les deux apps
partageaient déjà la convention shadcn `hsl(var(--token))` : changer les variables
suffit à faire basculer **77 fichiers `.tsx` sans en toucher un seul**. C'est ce qui rend
ce ticket faisable « sans big-bang », et c'est aussi pourquoi le socle est déjà fait
alors que l'adoption des *composants* de `@kebrane/ui` (Button, Card…) reste à faire —
elle peut se poursuivre écran par écran, sans urgence, GermanPass étant déjà cohérent.

**Le piège était sémantique, pas technique.** Les deux systèmes donnent un sens **opposé**
au même nom : dans shadcn, `--accent` est la surface **neutre de survol** ; dans la charte,
c'est l'accent de **marque**, rare (≤5 %). Les brancher l'un sur l'autre aurait rendu rouge
chaque survol de l'application — une migration qui « compile » parfaitement en produisant
une interface inutilisable. Les 13 usages (`hover:bg-accent`, états actifs de la nav,
variantes `outline`/`ghost` du bouton) ont donc d'abord été renommés en `secondary` — ce
qu'ils sont sémantiquement — ce qui libère `--accent` pour son rôle de marque.

**⚠ L'incident qui compte : une app entièrement SANS style a franchi build + 133 tests.**
Le premier jet importait le thème par `@import "@kebrane/ui/styles.css"` dans `globals.css`,
après les `@tailwind`. Or `@tailwind base` se déploie en milliers de règles : l'`@import` se
retrouvait ligne 2800, et la spécification CSS exige qu'il précède toute autre règle.
PostCSS rejette alors la **feuille entière**. Résultat : page en Times New Roman, pas une
couleur — et `typecheck`, `lint`, `build`, `test` et le smoke **tous verts**, car aucun ne
regarde le CSS compilé. Seule l'inspection du rendu l'a vu.

*La consigne fautive venait de `theme.css` lui-même* (« à importer dans le globals.css
APRÈS @tailwind »). `apps/kebrane` ne la suivait pas — il charge le thème depuis son
`layout.tsx` —, donc elle n'avait jamais été exercée. Corrigée à la source, avec
l'explication du pourquoi, pour que le prochain produit n'y retourne pas.

**Piège de cascade évité.** L'override d'accent produit était rangé dans `@layer base`. Les
règles **non layerées l'emportent** sur les layerées : il aurait perdu silencieusement
contre les tokens de la charte. Invisible aujourd'hui — les deux valeurs sont identiques —
mais l'accent GermanPass n'aurait **jamais** pris le jour de la décision PO. Sorti du layer.

**Garde-fou durable ajouté.** Puisque rien n'inspectait le CSS compilé, les deux apps ont
désormais un smoke qui vérifie la feuille **réellement servie** : elle référence bien une
CSS, celle-ci porte le Marine et le Papier de la charte, et ne contient plus la palette
shadcn par défaut. Quelques millisecondes pour fermer le trou qui a laissé passer ceci.

**Deux corrections de chaîne trouvées en chemin** (indépendantes de KB-12, mais qui
auraient mordu plus tard) :
1. `packages/config/tailwind-preset.d.ts` — le preset partagé n'était pas typé.
   `apps/kebrane` ne le voyait pas (`allowJs: true`) ; GermanPass, plus strict, échouait en
   `TS7016`. Typé à la source plutôt qu'en assouplissant l'app : le preset est un artefact
   **public** du design system.
2. `turbo.json` — `typecheck` dépend désormais de son **propre** `build`. Les tsconfig des
   apps Next incluent `.next/types/**`, que `next build` régénère pendant que `tsc` les
   lit : 101 erreurs `TS6053` alors que le même typecheck lancé seul passe. Rouge
   intermittent garanti en CI — le pire genre de rouge.

**Accent produit PROVISOIRE** (`#A5322C`, le Rouge de la charte), aligné sur
`packages/core/src/registry.ts`. ⚠ **Changer les DEUX ensemble** quand la décision PO
tombera, sinon la pastille du hub et l'application afficheraient deux couleurs différentes.

**Reste à faire** : remplacer progressivement les primitives locales
(`src/components/ui/*`) par celles de `@kebrane/ui`, écran par écran. Sans urgence : la
cohérence visuelle est déjà acquise par les tokens.

---

## Phase 5 — Abonnements, paiements & paywall

### KB-13 · Module `billing` Core + paywall (paiement agnostique du fournisseur)
**P1 · L · dépend de : KB-06, KB-08**

**Moyen de paiement — tranché (4 août 2026) : mobile money, MTN en tête. Stripe est écarté.**
Cohérent avec le marché visé et avec ce que GermanPass encaisse déjà. La carte bancaire
n'est plus une hypothèse de travail : `/tarifs` ne doit rien en promettre.
**Les deux opérateurs dès le lancement** (4 août 2026) : MTN MoMo **et** Orange Money. Le
critère (c) des vérifs KPay — couvrir les deux — reste donc bien un critère éliminatoire.

**Décision (2 août 2026).** On **ne se couple pas** à un fournisseur. Le module `billing` de Core
expose une **interface `PaymentProvider`** ; l'application encaisse via un **adaptateur**
interchangeable. Marché visé : mobile money Cameroun (**MTN MoMo + Orange Money**).
- **Fournisseur candidat n°1 : KPay** — *à confirmer* par 3 vérifs concrètes avant de coder l'adaptateur : (a) compte Freelance/Student **sans registre de commerce** accepté pour ce cas, (b) **frais** par transaction + retrait, (c) **MoMo *et* Orange Money** tous deux couverts.
- **Repli documenté : Fapshi** — le mieux documenté pour « entreprise non enregistrée » (CNI + selfie + description). Si KPay exige des papiers ou gèle les fonds, on **remplace l'adaptateur** sans toucher au reste.
- **Filet de lancement : le flux existant de GermanPass** (preuve de paiement mobile money + **validation admin**) reste opérationnel pendant l'intégration du PSP — on peut encaisser **avant** que l'adaptateur soit prêt.

**État (4 août 2026) : le module `billing` de Core est fait ; il reste ce qui dépend de toi.**
- [x] `PaymentProvider` (interface) dans `@kebrane/core` (`src/billing.ts`) : `createCollection`, `handleWebhook`, + registre d'adaptateurs (`registerPaymentProvider`).
- [x] **Adaptateur « preuve manuelle »** (`manual-proof`) encapsulant le flux admin GermanPass actuel — le filet de lancement passe par la même interface que les futurs PSP.
- [ ] **Adaptateur PSP concret** (KPay, ou Fapshi) — *bloqué par les 3 vérifs, qui sont des démarches auprès du fournisseur.*
- [x] Confirmation → `access.sync({ status: ACTIVE, plan })`.
- [ ] Bascule du gating en **mode enforce** (`KEBRANE_ACCESS_ENFORCE=1`, cf. KB-08) — à faire quand un PSP encaisse réellement, pas avant : passer le drapeau maintenant couperait l'accès à des membres à jour.
- [ ] **Paywall** + page `/tarifs` — *bloqué par la grille tarifaire (montants, offres), qui ne s'invente pas.*
- [x] Idempotence (rejeu de webhook, double clic admin), journalisation aux 3 gravités.

**Modèle `Payment`** (migration `20260804165252_kb13_billing_payments`). Trois choix
structurants : `provider` est une **chaîne, pas un enum** — ajouter un PSP ne doit pas
demander de migration ; l'unicité **`(provider, providerRef)`** *porte* l'idempotence, elle
n'est pas qu'un index ; le montant est un **entier** dans la plus petite unité de la devise
— jamais de flottant pour de l'argent, même si le franc CFA n'a pas de subdivision.

**Trois invariants, chacun tenu par un test.**
1. *Demander n'est pas recevoir.* Une demande d'encaissement n'ouvre aucun accès — sinon il
   suffirait de cliquer pour obtenir le produit.
2. *Idempotence.* Trois confirmations ⇒ un seul encaissement au journal. Les PSP rejouent
   leurs webhooks et un admin peut cliquer deux fois.
3. *Un paiement confirmé ne se dégrade pas.* Une notification d'échec tardive ou
   désordonnée ne retire pas un accès déjà payé — mieux vaut un accès en trop qu'un client
   privé de ce qu'il a payé. Le remboursement passe par `REFUNDED`, pas par `FAILED`.

**Le journal ne contient ni téléphone ni charge utile fournisseur.** Il est lu largement
(support, admin) : il ne doit pas devenir un annuaire de numéros mobile money. Un test le
vérifie explicitement.

**⚠ Bug trouvé par les tests avant toute mise en service.** Quand un fournisseur confirme
d'emblée — cas normal d'un PSP synchrone — la ligne était écrite directement en `CONFIRMED` ;
`confirm()` la voyait alors déjà confirmée, sortait par sa garde d'idempotence, et
**n'ouvrait jamais l'accès**. Le membre aurait payé sans rien recevoir. Corrigé en faisant
passer tout encaissement par un **chemin unique** : on persiste en attente, puis on confirme.

**Vérifié** : `typecheck` vert ; **42 tests `@kebrane/core`** (27 + 15 sur `billing`), dont
la triple confirmation, le webhook rejoué, la charge utile étrangère ignorée sans erreur, le
refus d'un canal non couvert par l'adaptateur, le refus d'un montant non entier ou négatif,
et le plan qui suit le dernier paiement confirmé.

---

#### KB-13b · Modèle économique : freemium, offres en base, enveloppe IA
**Décisions PO du 4 août 2026 — actées et implémentées.**

**Le modèle.** Les **cours et les examens blancs sont libres**, ainsi que la progression.
La rareté porte sur la **seule correction IA**. La logique n'est pas « offrir pour attirer »
mais **aligner le prix sur le coût** : servir du contenu statique ne coûte presque rien,
corriger consomme de l'IA à chaque copie. Bénéfice secondaire : du contenu ouvert est
indexable, donc il travaille pour l'acquisition.

**Un essai qui montre le produit, pas sa coquille.** Le palier gratuit inclut **une
correction complète**, feedback compris. Un examen sans correction ne démontrerait rien et
reviendrait à faire acheter à l'aveugle — objection du PO, retenue.

**Compter en dollars, afficher en corrections.** L'unité interne est le **micro-dollar**
(1 000 000 = 1 $), celle que mesure déjà `AiUsage.costUsd` côté produit. Aucune monnaie
maison : une unité inventée devrait être réétalonnée à chaque changement de tarif
fournisseur. Ce que voit le membre (« 40 corrections incluses ») est un **calcul**, pas un
stockage. C'est le choix que font Claude et ChatGPT côté grand public — le compteur existe,
il n'est pas mis sous le nez de l'utilisateur, ce qui évite le rationnement permanent.
Les crédits visibles fonctionnent quand l'utilisateur décide consciemment chaque tir
(Midjourney) ; ce n'est pas le cas ici. **À l'épuisement : blocage jusqu'au renouvellement**,
sans vente de complément.

**Les prix ne bougent pas, et c'est un résultat, pas une inaction.** À ~0,02 $ la correction
écrite (estimation, cf. `ai:cost`), une enveloppe de 40 coûte ~0,80 $ — **6 %** d'un Intensif
à 8 000 F. Le plafond protège de l'**abus**, pas de l'usage normal, d'où des enveloppes
généreuses : 10 / 40 / 120 / 500 corrections. ⚠ Le plafond existant
`AI_MONTHLY_BUDGET_USER_USD=5` est **surdimensionné** (≈250 corrections, 38 % du prix) : il
est appelé à être remplacé par l'enveloppe par offre. La vraie contrainte de rentabilité est
ailleurs — l'hébergement est un **coût fixe**, donc le seuil dépend du nombre d'abonnés.

**Le code dit ce qui EXISTE, la base dit ce qui est VENDU.** Les clés de capacités vivent
dans `packages/core/src/capabilities.ts` ; l'offre (`Plan`, en base) choisit lesquelles elle
inclut. L'administrateur composera les packs sans pouvoir inventer une capacité — sans cette
limite, l'écran d'administration dérive en moteur de règles et plus personne ne sait ce qu'un
pack donne. Le palier gratuit est lui aussi dans le code : c'est une promesse publique, pas
un paramètre commercial qu'on retire d'un clic.

**Recopie à l'achat — l'invariant central.** `Payment` **et** `ProductAccess` conservent une
copie des capacités et de l'enveloppe telles qu'elles étaient à l'achat. Modifier un pack ne
change donc **pas** ce qu'un membre a déjà payé. C'est l'erreur classique de ce genre de
système, et elle est très pénible à rattraper une fois des paiements réels en base.
**Prouvé mordant** : en faisant lire l'offre courante au lieu de la recopie, **seul** le test
« ce qui a été payé reste dû » est passé au rouge.

**Deux règles tranchées sans arbitrage PO** (signalées, à confirmer) :
1. *L'échéance prime sur le statut* — un accès expiré retombe au gratuit même si son statut
   dit `ACTIVE`.
2. *La consommation reste comptée après expiration* — sinon laisser expirer son abonnement
   redonnerait la correction offerte à chaque échéance.

**Capacités réservées, non implémentées.** `tutor.chat` (chat ancré dans une leçon) et
`library.dictionary`. Les nommer aujourd'hui ne coûte rien et évite une migration : les
activer sera une ligne de configuration dans une offre. ⚠ Le chat devra être **payant** :
une correction est un coup unique, une **conversation est non bornée** — sur du contenu
gratuit, elle rendrait le coût marginal proportionnel au trafic gratuit. Le dictionnaire,
servi en données statiques, coûte zéro à l'usage : candidat naturel au gratuit (attention à
la licence des données — le Wiktionnaire est réutilisable sous attribution et partage à
l'identique).

**Vérifié** : **52 tests `@kebrane/core`**, `typecheck` vert, seed joué sur la base de dev
(4 produits, 4 offres). Couvre : le palier gratuit d'un compte sans aucun accès, la
correction offerte puis refusée une fois consommée, le chat non offert, l'échéance posée à
la bonne date, la recopie opposable, la consommation qui survit à l'expiration, le refus
d'une capacité inconnue ou d'une durée nulle, et la cohérence commerciale du registre (plus
long ⇒ plus cher ⇒ plus d'IA).

**Crochet branché dans GermanPass (4 août 2026).** Les trois fonctions IA du produit
passaient déjà toutes par `checkBudget()` : la réserve Kebrane y est greffée plutôt que
dispersée chez les appelants — un contrôle qu'on oublie à un endroit ne protège de rien.
Le pont `lib/kebrane.ts` reste la seule porte vers Core (frontière v0.2).

- **Réserve AVANT l'appel, régularisation APRÈS.** On réserve un coût estimé, puis
  `logUsage()` — qui connaît le coût réel — ajuste l'écart via `entitlements.settleAi()`.
  Une estimation imparfaite ne fausse donc pas le compteur : elle ne décale que le moment
  du refus. La régularisation a lieu **même si l'appel échoue** — les tokens consommés sont
  facturés quand même.
- **Mode OBSERVATION par défaut** (`KEBRANE_AI_BUDGET_ENFORCE=0`), décision confirmée par
  le PO. Motif : les coûts sont **estimés, pas mesurés** — la base ne contenait aucune
  correction. Bloquer un membre payant sur la foi d'un chiffre jamais vérifié serait pire
  que laisser passer quelques appels ; si l'estimation de 0,025 $ est trois fois trop haute,
  un Intensif serait coupé au bout de 13 corrections au lieu de 40. Les refus qui *auraient*
  été prononcés sont journalisés, ce qui permet de mesurer l'impact du plafond avant de
  l'activer. Même discipline qu'en KB-08 pour le gating d'accès.
- **Séquence pour activer** : observation → quelques dizaines de corrections réelles →
  `pnpm --filter @kebrane/germanpass ai:cost` → ajuster les enveloppes du registre → `1`.
- **Les deux plafonds cohabitent** volontairement : celui de GermanPass (mensuel,
  anti-catastrophe) reste ; celui de Kebrane (par offre) devient l'instrument commercial.

**Tarifs et paywall (4 août 2026).** `/pricing` lit `plans.forProduct()` de Core, avec
**repli** sur la grille locale si la base ne répond pas — même schéma qu'en KB-19 : mieux
vaut une vitrine servie par un repli qu'une page en erreur. `lib/pricing.ts` n'est donc plus
la source de vérité, seulement un filet, et il est annoté comme tel.

- **La page annonce d'abord ce qui est GRATUIT**, avant les prix. Un modèle freemium ne se
  comprend pas si l'on voit les tarifs en premier : le visiteur croit devoir payer pour les
  cours. La phrase est explicite — « les formules ne débloquent qu'une chose, la correction
  automatique ».
- **Le paywall est un compteur, pas un mur.** Le composant `AiQuota` a deux états et vit en
  haut de « Mon compte » : le membre voit son enveloppe **fondre avant** de buter dessus.
  Un paywall qui surgit sans prévenir est vécu comme un piège ; un compteur visible est une
  information. À l'épuisement, le message reste vrai : *seule* la correction est suspendue,
  cours et examens blancs continuent.
- **On affiche « ~40 », pas « 40 ».** Le nombre divise une enveloppe en dollars par un coût
  **estimé** : promettre un compte exact qu'on ne tiendrait pas serait pire qu'annoncer une
  approximation.

**Canal `PAYPAL`** (migration `20260805211359_kb13_canal_paypal`). Ce n'est pas une entorse
au choix mobile money : GermanPass prépare des départs pour l'Allemagne, et une part des
abonnements est financée par de la famille **déjà sur place**, qui n'a ni MTN ni Orange.
Sans ce canal, ces paiements tomberaient en `MANUAL` et la part venant de la diaspora
serait invisible dans les comptes. ⚠ À vérifier côté PayPal : la **réception** de fonds est
restreinte au Cameroun — contrainte du prestataire, pas du modèle.

**Écran d'administration des offres (4 août 2026)** — `/admin/offres` dans GermanPass, avec
sa route `/api/admin/offres` (GET + PUT, gardée par `requireAdmin`). Permet de modifier nom,
prix, durée, description, corrections incluses et composition de chaque offre.

- **L'écran ne propose que les capacités du CODE.** Les cases à cocher sont alimentées par
  `ALL_CAPABILITIES` : l'administrateur compose, il n'invente pas. C'est cette limite qui
  empêche l'écran de dériver en moteur de règles.
- **Traçabilité ajoutée à `plans.upsert()`** : chaque changement émet `plan.changed` (ou
  `plan.created`) en gravité **IMPORTANT**, avec l'écart avant/après et la `source`
  (`seed`, `admin-germanpass`, `service`). Le journal répond désormais à « qui a changé le
  prix de l'Intensif, et quand » — ce qu'il ne savait pas faire. Idempotent : un seed rejoué
  à l'identique n'écrit rien.
- **L'invariant de recopie est rendu visible à celui qui l'utilise** : un bandeau rappelle
  qu'une modification ne change **que les achats à venir**. Sans lui, un administrateur
  baisserait une enveloppe en croyant l'appliquer aux abonnés en cours.
- **L'écran se désarme si Core est injoignable**, avec la mention que la page publique sert
  alors sa grille de repli — mieux qu'un enregistrement qui échoue en silence.

**⚠ Emplacement PROVISOIRE.** Les offres sont un objet de **plateforme**, pas de produit :
cet écran a vocation à rejoindre `apps/admin` (KB-15). Il est dans GermanPass parce que
c'est là que les administrateurs sont déjà, et qu'un écran qui n'existe pas ne sert
personne. La frontière v0.2 est tenue — tout passe par `plans.upsert()`, jamais par les
tables Core. À déplacer avec KB-15, où il gagnera la 2FA staff.

**Reste à faire** : `apps/admin` et 2FA (KB-15) ; bascule des deux drapeaux d'enforcement
une fois les coûts mesurés ; et **réécrire `ACTIVATION_STEPS`** le jour où un PSP encaisse
automatiquement — le texte décrit aujourd'hui le parcours « payez, envoyez la preuve, un
admin valide », exact tant que le filet de lancement est en service.

**Acceptation** : [x] l'accès produit bascule en `ACTIVE` **automatiquement** à la confirmation d'un paiement via l'adaptateur ; [x] changer de fournisseur = changer l'adaptateur, **sans** toucher Core/produits (prouvé par deux adaptateurs fictifs dans les tests) ; [x] le filet « preuve + admin » reste utilisable.
**Fichiers** : `packages/core/src/billing.ts`, `packages/db/prisma/schema.prisma`, `apps/kebrane` (paywall/tarifs — à faire), `apps/germanpass` (bascule enforce — à faire).
**Décisions PO restantes** : résultat des 3 vérifs KPay → adaptateur retenu ; **grille tarifaire des offres** (montants + périodicités) — c'est elle qui débloque le paywall et `/tarifs`.

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
**P2 · M · dépend de : KB-06** — **Statut : fait (15 août 2026)**
- [x] App `admin.kebrane.com` ; **2FA staff obligatoire** (Clerk).
- [x] Afficher les 7 chiffres : inscrits · abonnements actifs · revenus · paiements échoués · dernière connexion · progression générale · journal d'erreurs. Pas de sur-outillage.
**Acceptation** : [x] les 7 indicateurs s'affichent ; [x] accès staff protégé par 2FA.
**Fichiers** : `apps/admin/*`, `packages/core/src/reporting.ts`, `packages/auth/src/server.ts`.

**La 2FA est vérifiée CÔTÉ SERVEUR, à chaque requête.** `checkStaff()` interroge l'API Clerk
(`twoFactorEnabled`) plutôt que de lire une revendication du jeton : un contrôle d'accès qui
croit ce que le client affirme n'est pas un contrôle d'accès. Coût = un appel API par page
d'administration, négligeable pour ce volume.

**Clerk injoignable ⇒ accès REFUSÉ.** C'est l'inverse de la règle du pont GermanPass, où
Core en panne laisse passer — et c'est voulu : là il s'agissait de ne pas bloquer des membres
payants, ici de ne pas ouvrir une console d'administration. L'indisponibilité d'un contrôle
ne vaut pas autorisation.

**L'écran de refus DIT ce qui manque** (rôle ? 2FA ?) avec la commande à lancer, au lieu d'un
403 opaque. Quelqu'un qui a le bon rôle mais pas la 2FA doit comprendre qu'il lui reste une
action — sinon il conclut à une panne et appelle. Ces messages ne s'affichent qu'à un
utilisateur déjà authentifié : rien n'est divulgué.

**Cinq indicateurs viennent de Core, deux des produits — et c'est structurel.** La
progression pédagogique est une notion **métier** : Core ne saurait pas la calculer sans
apprendre le domaine de GermanPass, ce qui casserait précisément la frontière v0.2. D'où
`ProductMetric` (clé, valeur, date) : le produit **calcule et publie**, la plateforme
**conserve et affiche**. Générique à dessein — sans lui, chaque nouvel indicateur produit
demanderait une migration.
- `pnpm --filter @kebrane/germanpass kebrane:metrics` (à passer en cron quotidien).
- La progression rapporte les leçons terminées aux leçons **engagées**, pas au catalogue :
  sinon enrichir le catalogue ferait chuter l'indicateur sans que personne n'ait régressé.

**Une moyenne sans échantillon n'est pas zéro.** Défaut constaté sur la première exécution
réelle : le score moyen était publié à `0` faute de données, ce qui se lit « tout le monde a
eu zéro ». Le script **omet** désormais une mesure sans échantillon — et surtout la
**rétracte** (`reporting.retractMetric`), car `publishMetric` étant un upsert, un indicateur
devenu indisponible garderait sinon sa dernière valeur à l'écran indéfiniment. Un chiffre
périmé trompe plus qu'un chiffre absent.

**Journal d'erreurs : un seul crochet.** `apps/germanpass/src/instrumentation.ts` implémente
`onRequestError`, le point central de Next qui voit toutes les erreurs serveur — routes,
actions, rendu. Un crochet unique se maintient ; des appels dispersés dans les `catch`
s'oublient. Les erreurs arrivent en gravité `ACTION_REQUIRED` et alimentent donc le compteur
d'alertes existant, sans mécanisme parallèle.
⚠ **Ni message complet ni pile ne sont transmis** — seulement type, route et méthode. Le
journal est lu largement, et une trace contient volontiers des jetons ou des données
personnelles. Le détail reste dans les logs serveur, dont l'accès est plus étroit.

**Reste à faire** : DNS `admin.kebrane.com` et déploiement (KB-21) ; brancher
`kebrane:metrics` sur un cron ; et le premier membre du personnel devra **activer sa 2FA**
avant de pouvoir entrer — sans quoi la console lui restera fermée, y compris à un ADMIN.

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

> **MVP lançable = Phases 1 → 5.** Décisions PO à débloquer : ~~moyen de paiement (KB-13)~~ → **tranché le 4 août 2026 : mobile money, MTN en tête ; Stripe écarté** ; accent GermanPass (KB-02), PostgreSQL prod (KB-01), Brand Book complet dans `brand/`.

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
**P2 · L · dépend de : KB-06** — **Statut : fait et PROUVÉ (CI verte le 16 août 2026)**
`@kebrane/core`, `@kebrane/auth` et `apps/kebrane` n'ont **aucun test** ; il n'y a **pas de CI**. Or la génération des **deux** clients Prisma (`@prisma/client` GermanPass + `@kebrane/prisma-client` Core) est sensible à l'ordre.
- Tests unitaires `@kebrane/core` : `accounts.getOrCreateForClerk` (idempotence + liaison par email), `access.sync` (idempotence + événement émis), `products.syncRegistry`.
- Smoke `apps/kebrane` : landing 200 ; `/hub` non connecté → 307.
- Pipeline CI (GitHub Actions) : install pnpm, **génération Prisma déterministe (ordre des deux clients)**, puis `turbo typecheck lint build test` sur tout le workspace.
- `turbo.json` : déclarer la dépendance de génération Prisma pour éviter la course entre les deux clients.
- **Hygiène de dépôt (relevé au commit initial, 2 août 2026)** : (a) le dépôt est sur un FS
  Windows et git convertit les fins de ligne en CRLF — poser un `.gitattributes`
  (`* text=auto eol=lf`) avant que la CI Linux ne produise des diffs fantômes ; (b)
  `apps/*/next-env.d.ts` **oscille** entre `.next/types/routes.d.ts` (après `build`) et
  `.next/dev/types/routes.d.ts` (après `dev`) — bruit permanent dans `git status`, à trancher
  (l'ignorer, ou figer la variante `build` puisque c'est celle que produit la CI).
**Acceptation** : [~] CI verte sur PR (voir réserve ci-dessous) ; [x] Core couvert ; [x] génération Prisma reproductible en CI et au déploiement.
**Fichiers** : `.github/workflows/*`, `turbo.json`, `packages/core/tests/*`, `.gitattributes`.

**✅ CI PROUVÉE VERTE (16 août 2026)** — dépôt poussé sur
`github.com/Hernan-Gnoumbissie/kebrane` (privé), exécution verte sur `e5c4f96`. La réserve
« CI non prouvée » qui accompagnait ce ticket depuis sa création est levée.

**Ce que la CI a validé du premier coup**, et qui avait été écrit à l'aveugle : les **deux
clients Prisma** se génèrent dans l'ordre (le risque principal du monorepo), les **trois**
apps sont vues, le service Postgres démarre, les migrations passent, et `--ui=stream` évite
le figement du TUI.

**Les deux bugs qu'elle a trouvés étaient de la même famille** — une dépendance implicite à
l'environnement local, invisible depuis ce poste :
1. *Motif de tests développé par le shell.* `tests/unit/**/*.test.ts` : sur le runner Ubuntu,
   `pnpm` passe par `sh` (dash) où `**` équivaut à `*` — le motif exigeait donc un
   sous-répertoire inexistant. Mesuré sous `sh` : `**` → 0 fichier, `*` → 7.
2. *Test dépendant d'une base déjà semée.* `plans.syncRegistry()` était appelé sans avoir
   enregistré les produits ; `plans.upsert()` refuse un produit inconnu. En local le seed
   était joué, le test passait par accident.

**Trois hypothèses testées puis INFIRMÉES** avant de trouver la seconde cause — parallélisme
des fichiers de test, version de Node (20 vs 24), et une reproduction méthodologiquement
fausse de ma part. Les 52 tests Core passent sur schéma vierge, avec `--test-concurrency=8`,
et sous Node 20. Les corriger « au cas où » aurait ajouté deux changements inutiles.

**3. Le mode strict de Turborepo — la vraie cause des échecs suivants.**
Turborepo 2 **filtre l'environnement par défaut** : une tâche ne reçoit que les variables
**déclarées** dans `turbo.json`. Non déclarée, `KEBRANE_DATABASE_URL` n'arrivait pas jusqu'aux
tests, et les **six** fichiers de `@kebrane/core` mouraient sur le même garde-fou de
`helpers.ts` — d'où six `not ok` identiques, et non une assertion isolée.

*Pourquoi c'était invisible en local* : le script de test lit `packages/db/.env` via
`--env-file-if-exists`, et ce fichier existe sur un poste de développement. Il est absent en
CI (ignoré par git). Le filtrage n'y devenait visible que là.

*Prouvé* : en masquant `packages/db/.env` et en exportant la variable dans le shell,
`turbo test` reproduit **exactement** les six messages de la CI ; après déclaration dans
`globalPassThroughEnv`, la même commande passe au vert.

**Ce que cet épisode a coûté, et ce qu'il a appris.** Trois échecs corrigés à l'aveugle
parce que le message d'erreur restait enfoui dans des groupes de journaux repliés. Le
problème n'était pas le code mais l'**observabilité** : le workflow écrit désormais la cause
d'un échec à la fois en première page (`$GITHUB_STEP_SUMMARY`) et dans l'encadré
**Annotations** (`::error::`). C'est cette annotation qui a livré le fait décisif — *six*
fichiers en échec, pas un — et donc la bonne hypothèse.

**Reste un avertissement, volontairement non traité** : `actions/checkout@v4`,
`actions/setup-node@v4` et `pnpm/action-setup@v4` reposent sur Node 20, déprécié par GitHub.
Rien ne casse aujourd'hui. À moderniser **maintenant qu'un vert existe** — le faire pendant
la stabilisation aurait mélangé les causes.

**La CI de GermanPass était morte.** `apps/germanpass/.github/workflows/{ci,cd}.yml` existe
mais **GitHub ne lit `.github/` qu'à la racine du dépôt** : depuis le passage en monorepo,
elle n'a jamais tourné. Elle est en outre restée en `npm ci` alors que le dépôt est en pnpm,
et antérieure à Clerk. Le nouveau workflow racine la remplace ; **les deux fichiers inertes
n'ont pas été supprimés** — c'est un geste destructif qui revient au PO, et `cd.yml` contient
la procédure de déploiement du VPS, qui a de la valeur même inerte.

**Tests `@kebrane/core` (19, verts).** Ils parlent à une **vraie** base, délibérément : ce
qu'ils vérifient — idempotence, unicité, upsert, émission d'événement — EST du comportement
de base de données ; le simuler ne prouverait que la fidélité du simulacre. Ils sont donc
rejouables sur la base de dev sans la salir : identifiants uniques par exécution
(`kb18.<label>.<horodatage>`) et nettoyage en `after()`.
- `accounts` — création + journal une seule fois, idempotence sur rejeu, normalisation de
  l'email, **réconciliation par email** (une nouvelle identité Clerk retrouve le compte
  historique), et `unlinkClerk` de KB-17 (délie sans supprimer, idempotent).
- `access.sync` — l'invariant central : **n'écrire et ne journaliser que si l'état change**
  (un produit appelle `sync` très souvent, et le plus souvent pour rien) ; transition
  journalisée en `IMPORTANT` avec `{from, to}` ; produit inconnu ⇒ `null` plutôt qu'une
  erreur ; `isActive` vrai pour le seul statut ACTIVE.
- `products` — `upsert` idempotent par slug et **déclaratif** (retirer une accroche du
  registre la retire en base, sinon le seed ne converge pas) ; `syncRegistry` rejouable à
  chaque déploiement sans recréer le catalogue ; cohérence du registre (slugs uniques,
  accents HEX, tout produit ACTIVE a une URL).

**Prouvés mordants.** Un test vert ne prouve rien tant qu'on n'a pas vu quelqu'un échouer :
l'idempotence de `access.sync` a été **court-circuitée volontairement**, la suite est passée
au rouge (`updatedAt` réécrit), puis le code a été restauré.

**Smoke `apps/kebrane`** (`scripts/smoke.mjs`, tâche turbo `smoke`) : démarre le serveur de
**production** et vérifie les trois portes d'entrée — landing 200 **et réellement rendue**,
`/hub` non connecté en 307 vers `/login`, et webhook Clerk qui **rejette une requête non
signée** (400). Il attrape ce qu'aucun test unitaire ne voit : proxy mal câblé, route
disparue du build. Il n'exige **aucune base** (la landing a son repli KB-19, la redirection
est prononcée par le proxy avant toute lecture).

**Course entre les deux clients Prisma, tranchée dans `turbo.json`.** `build`, `typecheck`,
`test` et `dev` dépendent désormais de `db:generate` **et** `^db:generate` — donc les deux
clients (`@prisma/client` pour GermanPass, `@kebrane/prisma-client` pour Core) sont générés
avant toute compilation, sans dépendre de l'ordre des `postinstall`. La tâche est en
`cache: false` **volontairement** : sa sortie vit dans `node_modules/`, hors du répertoire du
paquet — turbo ne saurait pas la restaurer, et un cache-hit laisserait une machine neuve
sans client généré. La CI génère en outre les deux explicitement, dans un ordre fixe.

**`.gitattributes`** (`* text=auto eol=lf`) : le dépôt est édité sous Windows et tourne sous
Linux (CI, Docker, VPS). *Correction d'une alerte que j'avais moi-même mal posée* : l'historique
n'a jamais contenu de CRLF (`core.autocrlf=true` faisait déjà le travail, et `--renormalize`
n'a rien eu à changer). Le fichier reste utile comme **filet explicite** — il ne dépend plus
du réglage local de chaque poste — et épingle `.sh`/`Dockerfile`/`.conf` en LF jusque dans la
copie de travail.

**Deux pièges de turbo, trouvés en se vérifiant soi-même.**
1. *Le TUI se fige quand la sortie est redirigée.* `turbo.json` demande `"ui": "tui"`, qui
   exige un vrai terminal. Redirigée — ce que fait **tout runner CI** — la commande reste
   bloquée sans rien afficher, et le job part en timeout sans le moindre indice. D'où
   `--ui=stream` **obligatoire** dans le workflow (les deux étapes).
2. *Un test caché n'est pas un test passé.* La première vérification globale a affiché
   « 11/11 réussis » alors que les deux tâches `test` étaient des **cache hits rejoués** :
   turbo réaffichait la sortie d'une exécution précédente. Or les tests de Core dépendent
   d'une **base vivante**, que la clé de cache — qui ne voit que des fichiers — ignore
   totalement. Un vert rejoué peut donc masquer une régression bien réelle (schéma migré,
   données divergentes). `test` est désormais en `cache: false`.

**Vérifié** (2 août 2026, après correction des deux pièges ci-dessus) :
- `pnpm turbo typecheck lint build test --ui=stream` → **11/11 tâches**, sur les deux apps et
  les paquets.
- `pnpm turbo test --ui=stream` **sans cache** → **125 tests verts** (19 `@kebrane/core`
  + 106 GermanPass), 0 échec, sortie 0. C'est cette exécution-là qui fait foi.
- `pnpm --filter @kebrane/kebrane smoke` → **5/5**, dont `/hub` non connecté redirigé en 307
  vers `/login?redirect_url=%2Fhub` et webhook Clerk non signé rejeté en 400.
- Workflow CI : YAML valide, structure cohérente (14 assertions). **Toujours pas exécuté.**

**`next-env.d.ts` : bruit accepté, pas un problème.** Il oscille entre la variante `build` et
la variante `dev` selon la dernière commande lancée. L'ignorer casserait le `typecheck` sur
une machine neuve (il ne dépend pas du build de sa propre app) ; on le laisse donc suivi, et
on ignore ses allers-retours dans `git status`.

### KB-19 · Cohérence landing ↔ registre produits
**P3 · S · dépend de : KB-09** — **Statut : fait (2 août 2026)**
La landing (`apps/kebrane/src/app/page.tsx`) code les 4 produits **en dur**, alors que le hub lit le **registre Core**. Deux sources = dérive assurée.
- [x] La landing lit `products.list()` (source unique), avec repli statique si la base est indisponible.
- [x] Ajouter **TCF Canada**, **Permis Cameroun**, **Gestion Formation** au `PRODUCT_REGISTRY` en `COMING_SOON` (chacun sa couleur d'accent).
**Acceptation** : [x] landing et hub affichent le **même** catalogue ; [x] plus aucun produit codé en dur.
**Fichiers** : `packages/core/src/registry.ts`, `apps/kebrane/src/app/page.tsx`.

**Le repli n'est pas « statique », c'est le registre déclaratif.** Un repli écrit à la main
serait un troisième catalogue — donc le problème du ticket, en pire (il ne dériverait qu'en
cas de panne, là où personne ne le verrait). La landing se rabat donc sur `PRODUCT_REGISTRY`,
c'est-à-dire **exactement ce que le seed applique en base**. Base indisponible ⇒ la vitrine
reste debout et ne peut structurellement pas mentir. Le repli couvre aussi le registre
**vide** (seed jamais joué), pas seulement la base injoignable.

**Trois produits entrent au registre** en `COMING_SOON` et **sans URL** (`url` devient
optionnel dans `ProductDefinition` : un produit qui n'existe pas n'a pas d'adresse). Leurs
accents reprennent ceux déjà choisis dans la landing — `#2E6F5E`, `#B8860B`, `#5C6672` —
**provisoires**, même réserve PO que GermanPass. Effet attendu : ils apparaissent désormais
aussi dans le **hub**, en « Bientôt ». C'est cohérent — le hub montre la maison entière, pas
seulement ce que le membre a déjà.

**Vérifié** : `typecheck` + `lint` + `build` verts. Recette en deux phases contre le serveur
de dev (17 assertions vertes ; Next 16 refusant deux serveurs sur le même répertoire, les
phases sont séquentielles) :
1. *Base disponible* — la landing affiche les 4 produits du registre, l'URL de GermanPass,
   et les deux badges. **Test décisif** : un 5ᵉ produit inséré **en base** apparaît sur la
   landing, et disparaît quand on le retire. Sans lui, un catalogue en dur identique au
   registre aurait passé la recette. Base rendue à son état initial.
2. *Base injoignable* (`KEBRANE_DATABASE_URL` pointé sur un port mort) — la landing répond
   quand même et affiche les 4 produits par le repli déclaratif.

### KB-20 · Attribution des rôles Kebrane (bootstrap admin)
**P2 · M · dépend de : KB-06 · prérequis de KB-15** — **Statut : fait (3 août 2026)**
`Account.role` existe (`MEMBER/STAFF/ADMIN`) mais **aucun moyen de l'attribuer** — bloquant pour `admin.kebrane.com`.
- [x] Service `accounts.setRole(accountId, role)` + événement (`account.role_changed`, gravité IMPORTANT).
- [x] Bootstrap du premier admin : via env (`KEBRANE_BOOTSTRAP_ADMIN_EMAIL`) **et** script `pnpm --filter @kebrane/core grant-admin <email>` — les deux, ils ne couvrent pas le même cas.
**Acceptation** : [x] un compte peut devenir `ADMIN` de façon **tracée** ; [x] un bootstrap existe pour le tout premier admin.
**Fichiers** : `packages/core/*`, `packages/core/scripts/grant-admin.ts`.

**Le bootstrap s'applique à la CRÉATION du compte, pas à la connexion.** Le ticket disait
« au seed ou à la connexion » ; les deux posent problème. *Au seed* : le compte n'existe pas
encore au moment du déploiement — la personne ne s'est pas inscrite. *À la connexion* : une
variable oubliée dans l'environnement re-promouvrait en silence un compte qu'on vient de
rétrograder, et **rien n'apparaîtrait au journal** puisque, du point de vue de chaque
connexion, rien n'aurait « changé ». C'est une porte dérobée permanente et invisible. D'où
le choix : la variable n'est lue qu'à la création, et un test dédié interdit explicitement
la re-promotion.

**Les deux mécanismes sont complémentaires, pas redondants.** La variable d'environnement
couvre le déploiement neuf (personne à qui demander une promotion) ; le script couvre tout
le reste, y compris le cas le plus courant — la personne s'est déjà inscrite, donc son
compte existe et la variable ne s'appliquera jamais à elle. Le script **refuse de créer une
identité** : le parcours est « inscription (le webhook KB-17 crée le compte Core) → promotion ».

**Traçabilité.** `setRole` est idempotent — réattribuer le rôle en place n'écrit rien et
n'émet rien, pour que le journal ne contienne que de vrais changements. Chaque transition
porte `{from, to, source}` en gravité IMPORTANT ; `source` distingue `grant-admin`,
`bootstrap_env` et le futur écran d'admin, sans quoi toutes les lignes se ressembleraient.
Les rétrogradations sont tracées exactement comme les promotions.

**Vérifié** :
- `typecheck` vert ; **27 tests `@kebrane/core`** verts (19 existants + 8 sur les rôles),
  dont : promotion journalisée en IMPORTANT avec `{from,to,source}`, rétrogradation tracée
  de même, réattribution sans effet ni ligne au journal, compte inconnu ⇒ `null`, bootstrap
  qui ne vise QUE l'email configuré, et **refus de re-promouvoir un compte rétrogradé**.
- **Test prouvé mordant** : la porte dérobée a été implémentée volontairement (bootstrap
  appliqué à chaque résolution de compte) — **seul** le test « ne re-promeut PAS un compte
  rétrogradé » est passé au rouge, ce qui confirme qu'il vise juste. Code restauré.
- **Recette du script en ligne de commande** (13 assertions) : sans argument ⇒ usage ;
  rôle inconnu refusé ; compte inexistant ⇒ message explicite **sans rien créer** ;
  promotion effective en base + journalisée avec `source: grant-admin` ; **rejeu** signalé
  sans réécrire ni dupliquer l'événement ; rôle explicite accepté en minuscules. Base de dev
  rendue intacte.

**Reste à faire (hors code)** : renseigner `KEBRANE_BOOTSTRAP_ADMIN_EMAIL` au premier
déploiement (KB-21), **puis le retirer** une fois le premier admin en place — une variable
qui traîne est une promotion silencieuse au prochain compte créé avec cet email.

### KB-21 · Préparation production (env, domaines, déploiement)
**P2 · L**
Le code SSO est prêt (KB-10) mais rien n'est déployé, et les variables d'env se sont multipliées.
- **Consolider/documenter** les variables par app : `KEBRANE_DATABASE_URL`, `DATABASE_URL`, `KEBRANE_ACCESS_ENFORCE`, `CLERK_FRONTEND_API_ORIGIN`, `GERMANPASS_URL`, `NEXT_PUBLIC_*`. `.env.example` complets et à jour.
- **DNS** : sous-domaines `app.` / `germanpass.` (+ `admin.`) de `kebrane.com` ; **instance Clerk de prod** + provisioning `clerk.kebrane.com` ; renseigner `CLERK_FRONTEND_API_ORIGIN`.
- **PostgreSQL de prod** (hébergeur — décision PO) ; **répliquer la CSP Clerk** dans `apps/germanpass/deploy/nginx.conf`.
- Rejouer `pnpm --filter @kebrane/core seed` (registre **et offres**, KB-13) + `pnpm --filter @kebrane/germanpass kebrane:backfill` **au déploiement**.
- **Premier administrateur — séquence exacte (décidée le 6 août 2026).** L'adresse retenue
  est **nominative sur le domaine** (`hernan@kebrane.com`, IONOS) : elle est vue des clients
  dans les échanges de support, et une adresse partagée type `admin@` détruirait la
  traçabilité de KB-13 (le journal doit dire *qui* a changé un prix). Les adresses de rôle
  (`contact@`, `no-reply@`) servent à envoyer et recevoir, jamais à se connecter.
  1. Créer la boîte chez IONOS.
  2. `KEBRANE_BOOTSTRAP_ADMIN_EMAIL=hernan@kebrane.com` dans `apps/kebrane`.
  3. S'inscrire avec cette adresse — le compte **naît `ADMIN`** (KB-20), rien à lancer.
  4. **Retirer la variable et redéployer.** Non cosmétique : tant qu'elle traîne, le
     prochain compte créé avec cette adresse serait promu en silence.
  ⚠ `grant-admin` ne convient PAS ici — il exige que le compte existe déjà. Il sert ensuite,
  pour promouvoir quelqu'un d'autre. Sans ce rôle, l'écran `/admin/offres` reste en **lecture
  seule** (KB-13) : c'est le premier écueil d'un déploiement neuf.
- **Adresses e-mail à configurer (6 août 2026).** Deux domaines, à dessein : le produit
  écrit depuis **le sien** (`germanpass.io`), la maison depuis `kebrane.com`. Le client a
  acheté GermanPass — un expéditeur `@kebrane.com` lui paraîtrait étranger, voire suspect.
  C'est la logique « By Kebrane » appliquée au courrier.

  | Adresse | Type | Usage |
  |---|---|---|
  | `hernan@kebrane.com` | **boîte** | Connexion admin plateforme (nominative) |
  | `contact@kebrane.com` | alias | Entrée générique, mentions légales |
  | `support@kebrane.com` | alias | Deviendra boîte partagée à la première délégation |
  | `facturation@kebrane.com` | alias | Preuves de paiement, litiges, remboursements |
  | `rgpd@kebrane.com` | alias | **Exigé** : contact identifiable pour les données personnelles |
  | `no-reply@kebrane.com` | envoi seul | Transactionnel du hub |
  | `postmaster@`, `abuse@` | alias | Attendus par les registrars et les filtres anti-spam |
  | `no-reply@germanpass.io` | envoi seul | Déjà dans `SMTP_FROM` |
  | `support@germanpass.io` | alias → `support@kebrane.com` | Une seule boîte à surveiller |

  ⚠ **Jamais `admin@` comme identifiant de connexion** : le journal doit dire *qui* a changé
  un prix (KB-13), et une adresse partagée efface cette réponse.

  ⚠ **SPF, DKIM et DMARC sur les DEUX domaines.** Sans eux les messages partent en
  indésirables — et un compte dont l'email de vérification n'arrive pas ne devient jamais
  client. Panne silencieuse, longue à diagnostiquer. *Nuance* : les emails de vérification
  Clerk partent des serveurs de Clerk, ils ne dépendent pas de cette configuration ; ce sont
  les messages applicatifs (notifications, séquences marketing) qui en dépendent.
- ⚠ **`user.updated` n'est pas traité** par le webhook Clerk (KB-17). Changer d'adresse de
  connexion après coup laisse l'email **périmé côté Core** — la liaison survit (elle se fait
  sur `clerkUserId`), mais `grant-admin <nouvelle adresse>` ne retrouverait plus le compte et
  le support afficherait l'ancienne. D'où l'intérêt de fixer l'adresse **avant** le premier
  déploiement. À défaut, ajouter le handler.
- Dérouler le **parcours SSO connecté réel** (« hub → Ouvrir GermanPass → retour ») — le reste-à-faire de KB-10.
**Acceptation** : les deux apps déployables sur sous-domaines ; SSO connecté prouvé de bout en bout ; seed + backfill intégrés au déploiement.
**Décisions PO** : hébergeur PostgreSQL de prod ; confirmation topologie **sous-domaines** (déjà tranchée de fait par KB-10, à valider).

---

## Statut synthétique (16 août 2026)
- **Faits** : KB-01, KB-02, KB-03 (Phase 1) · KB-05, KB-06, KB-07 (Phase 2) · **KB-08, KB-09, KB-10 [code], KB-11 (Phase 3)** · **KB-17, KB-19, KB-18, KB-20, KB-12 [socle ; composants à poursuivre]**.
- **Faits (suite)** : **KB-13** (billing, offres, paywall, admin des offres) · **KB-15** (console d'administration + 2FA).
- **Prochains** : KB-14 (événements & notifications) · KB-21 (mise en production) · KB-16 (site public, prévu en dernier) · KB-04 (nettoyage Vercel) · KB-12 [suite] (adoption des composants `@kebrane/ui`, écran par écran, sans urgence).
- **Bloqués côté PO, pas côté code** : 3 vérifications KPay → adaptateur PSP (KB-13) · SPF/DKIM/DMARC sur les deux domaines (KB-21) · hébergeur PostgreSQL de production (KB-21) · mesure des coûts IA réels avant de basculer les deux drapeaux d'enforcement (KB-13).
- **Décisions PO ouvertes** : paiement — *approche tranchée* (abstraction `PaymentProvider`, KPay candidat n°1, Fapshi repli, filet preuve+admin) ; reste à **confirmer l'adaptateur** via les 3 vérifs KPay + la grille tarifaire (KB-13) · accent officiel GermanPass (KB-02/09) · PostgreSQL prod (KB-21) · confirmation topologie domaines (KB-10/21).
- **Décisions PO tranchées** : ~~session unique côté Kebrane~~ → **non** (KB-17, 2 août 2026) · ~~moyen de paiement~~ → **mobile money, MTN en tête ; Stripe écarté** (KB-13, 4 août 2026).
