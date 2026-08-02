# Kebrane — Plan de construction de la plateforme

*Plan pas à pas. 2 août 2026. Aligné sur l'architecture validée v0.2 + charte v1.0.*
*Le site public `kebrane.com` n'est que la DERNIÈRE phase — on construit d'abord le socle et le produit.*

## Décisions actées
- **Ordre** : on suit **v0.2** — socle (design system → compte/auth) → GermanPass connecté → paiements → événements/notifs → admin → **site public en dernier**.
- **Structure** : **Option 2 (pragmatique)** — GermanPass reste `apps/germanpass` ; on ajoute `apps/kebrane` (compte/hub, puis site public) ; **toute la logique commune vit dans `packages/`** ; SSO Clerk par **sous-domaines de `kebrane.com`**.
- **Auth** : **Clerk** (verrouillé v0.2). Identité Clerk liée à un `user` **Core** (source de vérité métier) ; RBAC modélisé côté Core.
- **Charte** : `kebrane/brand/CHARTE.md` — **Georgia**, **Marine `#1F3352`**, **Rouge `#A5322C`**, symbole universel + **accent par produit** + « **By Kebrane** ». Logo figuratif à venir (studio) → wordmark provisoire.

## Frontières non négociables (v0.2 — à tenir dès le jour 1)
Même avec des apps séparées : **isolation des données par `product_id`**, **RBAC**, **journal d'activité**, **catalogue d'événements à 3 gravités** (info / important / action immédiate), **auth pensée SSO**. Un produit **n'appelle Core que par l'interface de services** (`packages/core`), **jamais** ses tables — à **imposer par une règle de lint** (pas d'imports profonds inter-modules).

## Architecture cible (Option 2)
```
kebrane/
├─ apps/
│  ├─ germanpass/     # produit 1 (existant, Clerk OK) — germanpass.kebrane.com
│  ├─ kebrane/        # Compte/hub (app.kebrane.com) puis site public (kebrane.com)
│  └─ (admin/)        # admin.kebrane.com (2FA staff obligatoire) — phase 7
├─ packages/
│  ├─ ui/             # design system Kebrane (charte) — Georgia, Marine/Rouge, By Kebrane, accent/produit
│  ├─ core/           # domaine transversal : accounts, products, billing, notifications, events, support (interface de services)
│  ├─ auth/           # Clerk partagé : identité, sessions/SSO, RBAC (rôles Core)
│  └─ db/             # schéma Prisma + client (un seul PostgreSQL)
```
> SSO : sous-domaines d'un domaine unique → **cookie de session Clerk partagé** ; pas de satellites à gérer.

## Prérequis
- Charte connue (✅ `kebrane/brand/CHARTE.md`). Compléter avec le Brand Book v1.0 si dispo (logo figuratif, règles, accents par produit).
- `kebrane.com` (IONOS, enregistré 29/07/2026) ; prévoir DNS des sous-domaines `app.` / `germanpass.` / `admin.`.
- Une seule application **Clerk** partagée (déjà utilisée par GermanPass).
- PostgreSQL unique (dev : docker-compose ; prod : à décider).
- Node 20+, pnpm 9+, Next 16, Tailwind, shadcn/ui.

---

## Phases (ordre v0.2)

### Phase 1 — Socle : DB partagée + design system Kebrane
- `packages/db` : un schéma Prisma central (Core) + client partagé ; brancher un PostgreSQL unique.
- `packages/ui` : traduire la charte en **tokens** (Marine/Rouge, **accent paramétrable par produit**, neutres + sémantiques AA ; Georgia + une sans-serif UI ; rayons/ombres) → preset Tailwind (`packages/config`) + variables shadcn ; composants de base + **Logo/Wordmark « By Kebrane »**.
- Nettoyer les 2 projets Vercel vides (`project-gglt1`, `project-ruide`).
**Validation** : page de démo `@kebrane/ui` conforme charte ; `packages/db` génère le client.

### Phase 2 — Compte Kebrane : auth + comptes + RBAC
- `packages/auth` : centraliser Clerk (helpers, gardes, rôles) ; **lier l'identité Clerk à un `user` Core**.
- `packages/core` : modèles `accounts`, `products` (registre + `product_id`), `roles`/`permissions` (RBAC), base `events` + `activity log` ; exposer l'**interface de services** (auth, accounts, billing, notifications, events, support).
- `apps/kebrane` : scaffolder l'app (Next 16, `@kebrane/ui`/`auth`/`core`), `<ClerkProvider>`, `proxy.ts` + **CSP incluant Clerk** dès le départ (réf. incident GermanPass), écrans Clerk thémés (charte), **hub de compte** minimal.
**Validation** : créer un compte Kebrane, rôles reconnus, hub affiche l'utilisateur.

### Phase 3 — Brancher GermanPass au compte Kebrane
- GermanPass consomme `@kebrane/core` **via l'interface de services** (plus d'auth dupliquée — déjà sur Clerk) ; poser les **crochets de contrôle d'accès** (gating par rôle/abonnement) même avant le paiement.
- Réconciliation compte : `clerkUserId` ↔ `user` Core (déjà en place côté GermanPass) ; enregistrer GermanPass dans le registre `products` (`product_id`, accent couleur, « By Kebrane »).
- SSO sous-domaines : `app.kebrane.com` ↔ `germanpass.kebrane.com` (cookie partagé) ; hub « Ouvrir GermanPass » porte la session.
- Ajouter la **règle de lint de frontière** (interdire imports profonds Core↔produit).
**Validation** : parcours « compte Kebrane → hub → GermanPass connecté → retour » fluide, sans re-login.

### Phase 4 — Métier GermanPass
- Le métier existe déjà (leçons, exercices, examens, IA…). Aligner l'UI sur `@kebrane/ui` (accent GermanPass), migration progressive.
**Validation** : GermanPass jouable, cohérent visuellement avec la maison Kebrane.

### Phase 5 — Abonnements, paiements & paywall
- Contrôle d'accès par abonnement/rôle (crochets posés en Phase 3).
- ⚠ **À trancher** : v0.2 mentionne **Stripe** ; GermanPass utilise aujourd'hui **mobile money (Orange/MTN) + preuve + validation admin** (pas Stripe). Décider le moyen de paiement Kebrane (Stripe international vs mobile money local vs les deux) — impacte le module `billing` de Core.
**Validation** : paywall opérationnel selon le moyen retenu.

### Phase 6 — Événements & notifications
- `packages/core` events : catalogue à 3 gravités, routage (notif / e-mail / ticket) ; e-mails transactionnels essentiels.
**Validation** : événements clés émis et routés ; e-mails partent.

### Phase 7 — Mini-dashboard admin
- `apps/admin` (admin.kebrane.com), **2FA staff obligatoire** (Clerk) : inscrits · abonnements actifs · revenus · paiements échoués · dernière connexion · progression générale · journal d'erreurs. Pas de sur-outillage.
**Validation** : les 7 chiffres s'affichent ; accès staff protégé par 2FA.

### Phase 8 — Site public `kebrane.com` (EN DERNIER)
- Dans `apps/kebrane` (route publique) ou `apps/kebrane-web` : landing marque (charte), catalogue produits (GermanPass en 1er, autres « bientôt »), promesse « un compte, tous les produits », CTA.
- Inspiration réfs (cf. `apps/germanpass/docs/UX-TICKETS.md`, ex. Geek Institut : hero photo + voile + titre display + CTA pill + nav glassy) — **en se différenciant** (montrer la profondeur produit).
- SEO/OpenGraph/sitemap, perf (`next/image`), a11y, `prefers-reduced-motion`.
**Validation** : site public conforme charte, responsive, Lighthouse correct — construit quand le produit a du concret à montrer.

> **MVP lançable = Phases 1 → 5** (socle + GermanPass jouable + monétisé). 6–7 suivent vite ; 8 en dernier.

## Points de vigilance
- **Charte = source de vérité visuelle** ; logo figuratif à intégrer dès livraison studio.
- **Un seul Clerk**, une seule base PostgreSQL, une seule fois la logique transversale (`packages/`).
- **Frontières** tenues par l'interface de services + `product_id` + RBAC + **lint** — sinon l'extraction future redevient douloureuse.
- **CSP par app** incluant Clerk (script/connect/img/worker/frame) — sinon écran blanc.
- **Ne pas casser GermanPass** en service ; migration UI vers `@kebrane/ui` progressive.
- Perf dev : préférer le **FS natif WSL** au `/mnt/c`.

## Décisions restantes (PO)
- [ ] Moyen(s) de paiement (Stripe vs mobile money vs les deux) — Phase 5.
- [ ] Couleur d'accent officielle de **GermanPass** (dans le cadre Marine/Rouge).
- [ ] Base PostgreSQL de prod (hébergeur).
- [ ] Compléter le Brand Book v1.0 dans `kebrane/brand/` (logo, règles) si disponible.

## Références
`docs/etape-1-monorepo-clerk.md` (socle monorepo + Clerk GermanPass, fait) · `brand/CHARTE.md` · `apps/germanpass/docs/UX-TICKETS.md` · docs de contexte `Kebrane-Architecture-v0.1/v0.2`, `Kebrane-Audit-Reel-v1`.
