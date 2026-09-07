# Kebrane

Monorepo Kebrane Core — socle unifié des produits edtech.
## Ce que fait cette PR

Livre la **Phase 9** — toutes les pages publiques et légales de `kebrane.com` (KB-22 → KB-34) — plus le renommage produits « -Pass » (KB-19) et les tests des deux services de domaine ajoutés au passage.

Dix commits, un par lot logique. Rien n'est déployé.

## Les décisions structurantes

**`/tarifs` ne se replie pas sur le registre en dur.** La vitrine, elle, se rabat sur `PRODUCT_REGISTRY` si la base ne répond pas. La grille tarifaire non : `PLAN_REGISTRY` n'est qu'un seed, et afficher un prix périmé sur une page de vente est pire que ne rien afficher — c'est le prix affiché qui engage (CGV, art. 3). Base injoignable → message honnête et lien contact.

**La suppression de compte anonymise, elle ne supprime pas la ligne.** L'identité part, les accès aussi, mais les paiements survivent sans leur numéro payeur (obligation comptable) et le journal survit — c'est lui qui atteste de l'effacement. Ordre : délier Clerk → effacer Core → supprimer l'utilisateur Clerk, ce dernier en fin parce que c'est la seule étape non rejouable.

**Le contrôle du rôle ADMIN vit dans Core, pas dans l'écran d'administration.** Une règle d'autorisation posée dans l'interface ne protège que l'interface. Core reçoit l'`Account` de l'auteur plutôt que d'aller le chercher : la frontière v0.2 veut que l'authentification reste à la porte.

**Aucun bandeau cookies**, parce qu'il n'y a rien à refuser : vérifié, zéro dépendance de mesure et zéro script tiers. Le bandeau n'apparaîtra qu'avec le premier traceur non essentiel.

**Les marqueurs `[À COMPLÉTER]` restent visibles en page.** Rien n'a été inventé, en particulier pas l'adresse de l'éditeur ni un numéro d'immatriculation. Un bandeau en tête des documents concernés le signale.

## Migration de données incluse

Le registre avait changé de slugs mais le seed est un **upsert par slug** : rejoué tel quel, il aurait créé `tcfpass` et `permitpass` *à côté* de `tcf-canada` et `permis-cameroun`, et le catalogue en aurait affiché six. `packages/core/scripts/retire-products.ts` renomme les deux en place (l'`id` survit) et passe `gestion-formation` en `DISABLED` plutôt que de le supprimer. Le script refuse d'agir si des données sont rattachées.

Bug attrapé au passage : `products.list()` renvoyait aussi les produits `DISABLED`, qui se réaffichaient en « Bientôt disponible » — soit en promesse, l'exact contraire du statut. D'où `products.listPublic()`.

## Vérifications

- `typecheck`, `lint`, `build` verts sur `@kebrane/kebrane` (22 routes) et `@kebrane/admin` (4 routes)
- **79 tests Core, 0 échec** (62 avant cette PR)
- Les 13 routes publiques répondent 200 et portent les 5 liens légaux du footer
- Frontière v0.2 respectée : aucun import `@kebrane/db` hors Core
- `/tarifs` rend les 4 offres lues en base, aucun montant en dur

Les nouveaux tests ont été **vérifiés par mutation** : journaliser volontairement l'ancienne adresse fait tomber l'assertion de fuite, neutraliser la garde ADMIN fait tomber celle du rôle. Les deux sources ont été restaurées à l'identique.

## Ce qu'un relecteur doit savoir

**Les textes légaux ne sont pas un avis juridique.** Ce sont des gabarits documentés, à faire relire par un juriste avant mise en service commerciale — comme le rappelle `docs/content/README.md`. Les points taxe et rétractation sont ceux où l'avis compte le plus.

**KB-27 n'est pas fini côté configuration.** Le consentement CGU/confidentialité passe par l'option « Legal acceptance » du tableau de bord Clerk, à activer sur les instances *Development* et *Production*. Aucune case maison n'a été codée : le code ne sait pas horodater une acceptation de façon probante. Procédure dans `docs/CLERK-LEGAL-ACCEPTANCE.md`.

**Trois tickets de dette ouverts en Phase 10**, nés en marge de cette PR et volontairement hors périmètre :
- **KB-35** — `nodemailer` fuit dans le graphe de `@kebrane/core` via `bootstrap.ts`, ce qui casse le build webpack de GermanPass. Kebrane construit avec Turbopack : le problème y est latent, pas absent.
- **KB-36** — captures produit réelles pour illustrer la vitrine (chaîne cartographiée, Chromium Playwright installé).
- **KB-37** — la suite e2e de GermanPass teste un formulaire de connexion qui n'existe plus depuis le passage à Clerk.

**Décisions PO en attente** : `docs/DECISIONS-CGV.md` contient six clauses rédigées et prêtes à poser (reconduction, rétractation, remboursement, taxe, âge minimum, durées de conservation), chacune avec ses options et une recommandation. La reconduction est de fait tranchée par la technique — il n'existe aucun modèle d'abonnement récurrent au schéma.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
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
