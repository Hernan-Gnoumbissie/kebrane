# KEBRANE — Étape 1 : Monorepo + GermanPass sur Clerk

*Plan d'implémentation pas à pas. 30 juillet 2026.*
*Objectif : poser le socle de Kebrane Core en partant du produit le plus sain (GermanPass), et le brancher sur Clerk.*

---

## 0. Ce qu'on vise à la fin de l'étape 1

- Un **monorepo Kebrane** qui héberge GermanPass comme première application.
- GermanPass **authentifié par Clerk** (next-auth retiré), avec **SSO prêt** pour accueillir les autres produits.
- Les **utilisateurs existants migrés** dans Clerk **sans reset de mot de passe** (import des hash bcrypt).
- La structure de **paquets partagés** préparée pour factoriser TCF juste après.

**Ce qu'on ne fait PAS encore :** TCF, Permis, Gestion Formation, la brique paiement. On les branche aux étapes suivantes. On garde un périmètre serré pour un premier jalon propre et testable.

## 1. Prérequis (avant de toucher au code)

1. **Compte Clerk** créé + une **application Clerk** « Kebrane » (environnement de développement d'abord). Récupérer `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY`.
2. **Sauvegarde de la base GermanPass** (dump PostgreSQL) — indispensable avant migration des users.
3. **Branche de travail** : ne rien faire sur `main`. Créer une branche dédiée, p.ex. `feat/kebrane-monorepo` dans le futur repo, et **repartir d'une copie** de GermanPass (ne pas casser le dépôt `daf-saas` en production tant que le nouveau socle n'est pas validé).
4. **Versions** : Node 20+ et **pnpm** (le monorepo utilisera les workspaces pnpm). GermanPass est en **Next.js 15** → le fichier middleware s'appelle `middleware.ts` (en Next.js 16 il deviendrait `proxy.ts`).

## 2. Structure cible du monorepo

```
kebrane/
├─ apps/
│  ├─ germanpass/          # GermanPass (Next.js 15) — 1re app importée
│  └─ (tcf/ …)             # viendra à l'étape suivante
├─ packages/
│  ├─ auth/                # wrapper Clerk partagé (helpers, garde de routes, rôles)
│  ├─ ui/                  # design system Kebrane (composants partagés)
│  ├─ db/                  # schéma Prisma + client partagé (à mutualiser plus tard)
│  └─ config/              # eslint, tsconfig, tailwind préréglés
├─ package.json            # workspaces pnpm + scripts turbo
├─ pnpm-workspace.yaml
└─ turbo.json              # orchestration des builds (Turborepo)
```

L'idée : **une seule fois** chaque chose transverse (auth, UI, config), **réutilisée** par chaque app. C'est exactement ce qui supprimera la duplication GermanPass↔TCF.

## 3. Phase A — Initialiser le monorepo et importer GermanPass

1. Créer le dossier `kebrane/`, initialiser pnpm workspaces (`pnpm-workspace.yaml` pointant `apps/*` et `packages/*`) et Turborepo (`turbo.json`).
2. **Copier** le contenu de `daf-saas` dans `apps/germanpass/` (copie, pas déplacement — l'original reste intact).
3. Adapter le `package.json` de l'app (nom `@kebrane/germanpass`), vérifier que `pnpm install` à la racine résout tout.
4. Vérifier que l'app **démarre et build** telle quelle (encore sous next-auth) avant de changer l'auth. *On valide chaque palier avant d'avancer.*

## 4. Phase B — Intégrer Clerk dans GermanPass (retirer next-auth)

1. **Installer** : `pnpm add @clerk/nextjs` dans `apps/germanpass`.
2. **Variables d'env** : ajouter `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY` (via `.env.local`, jamais commités).
3. **Provider** : envelopper l'app avec `<ClerkProvider>` dans le layout racine (`app/layout.tsx`).
4. **Middleware** : créer `middleware.ts` à la racine de l'app avec `clerkMiddleware()` (importé de `@clerk/nextjs/server`) et `createRouteMatcher` pour protéger les routes privées (dashboard, espace candidat, API sensibles).
5. **Écrans d'auth** : remplacer les pages de connexion/inscription next-auth par les composants Clerk (`<SignIn/>`, `<SignUp/>`, `<UserButton/>`), ou les flux hébergés Clerk. *C'est ici que les écrans de ta refonte auth cèdent la place aux flux Clerk — tu regagnes reset, anti-énumération et MFA en natif.*
6. **Côté serveur** : remplacer les appels de session next-auth par le helper `auth()` de `@clerk/nextjs/server` dans les Route Handlers, Server Actions et pages protégées. Cartographier chaque endroit où l'ancien `getServerSession`/`useSession` était utilisé.
7. **Rôles/permissions** : modéliser le rôle (candidat, admin, éditeur…) dans **Clerk** (métadonnées publiques) **et** garder une table de correspondance côté base pour le métier — pour éviter le verrouillage total sur Clerk.
8. **Retirer next-auth** : désinstaller `next-auth`, supprimer sa config, ses callbacks et l'adapter Prisma d'auth **une fois** que tout le reste fonctionne.
9. **Valider** : connexion, inscription, protection des routes, rôle admin, déconnexion.

## 5. Phase C — Migrer les utilisateurs existants dans Clerk (sans reset)

Clerk permet d'importer les comptes existants avec leur **hash bcrypt** : les utilisateurs gardent leur mot de passe.

1. **Exporter** depuis la base GermanPass la liste des users : `userId`, `email`, `firstName`/`lastName` si dispo, et le **hash du mot de passe** (colonne bcrypt de la table `User` Prisma). Produire un **JSON** au format attendu par le script.
2. **Script officiel** : utiliser le [migration-script de Clerk](https://github.com/clerk/migration-script) — il lit le JSON, crée chaque user via la **Backend API `CreateUser`**, respecte les **rate limits** et gère les erreurs.
3. **Renseigner `password_hasher: bcrypt`** dans le payload (hashers supportés : argon2, bcrypt, md5, pbkdf2_*, scrypt_firebase). Clerk conserve/transpose le hash → **aucun reset forcé**.
4. **Lancer d'abord sur un échantillon** (quelques comptes de test) et vérifier qu'ils peuvent se connecter, avant de passer tout le volume.
5. **Réconcilier les IDs** : conserver la correspondance `ancien userId ↔ Clerk userId` pour relier les données métier existantes (progression, examens, paiements) au compte Clerk. Prévoir une colonne `clerk_user_id` sur les tables concernées.
6. **Vérifier** : nombre de comptes importés = nombre exporté, connexions de test OK, doublons d'e-mail traités.

## 6. Phase D — Préparer les paquets partagés (pour TCF juste après)

1. Extraire le wrapper Clerk et les gardes de routes dans `packages/auth` → réutilisable par toutes les apps.
2. Commencer à isoler dans `packages/ui` les composants réutilisés (ils sont quasi identiques entre GermanPass et TCF).
3. Documenter le **contrat d'intégration** d'un produit dans Kebrane (comment une app consomme `@kebrane/auth`, quelles variables d'env, quel `product_id`).

*À la fin, brancher TCF revient à copier son métier dans `apps/tcf` et consommer les paquets partagés — le gros de la factorisation est déjà fait.*

## 7. Points de vigilance & repli

- **Ne pas casser la prod** : `daf-saas` continue de tourner tel quel jusqu'à ce que le socle Kebrane soit validé. Bascule seulement ensuite.
- **Secrets** : clés Clerk uniquement en `.env.local` / variables d'environnement de déploiement, jamais dans Git.
- **Migration users = point le plus sensible** : sauvegarde préalable + test sur échantillon + vérification des connexions avant volume complet.
- **Repli** : tout se passe sur une copie et une branche dédiée ; en cas de souci, on revient à `daf-saas` d'origine sans perte.
- **Coût Clerk au MAU** : à garder à l'œil une fois tous les produits migrés (voir la note de décision auth).

## 8. Checklist de validation de l'étape 1

- [ ] `pnpm install` + build OK à la racine du monorepo
- [ ] GermanPass démarre dans `apps/germanpass`
- [ ] Connexion / inscription via Clerk fonctionnelles
- [ ] Routes privées protégées par `clerkMiddleware()`
- [ ] Rôle admin reconnu et cloisonné
- [ ] next-auth entièrement retiré, aucune référence résiduelle
- [ ] Utilisateurs existants importés (compte de test connecté sans reset)
- [ ] Correspondance `clerk_user_id` posée sur les tables métier
- [ ] `packages/auth` consommé par l'app (pas de code Clerk en dur dans l'app)
- [ ] Sauvegarde base + branche de travail conservées

---

### Ordre de travail conseillé
Phase A (monorepo + import) → **valider le build** → Phase B (Clerk) → **valider l'auth** → Phase C (migration users) → **valider sur échantillon** → Phase D (paquets partagés). On ne passe une phase que quand la précédente est verte.

*Sources : documentation Clerk (Next.js App Router, clerkMiddleware, migration des utilisateurs).*
