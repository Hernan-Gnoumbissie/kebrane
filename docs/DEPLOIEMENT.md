# Kebrane — procédure de mise en production

*KB-21. À suivre dans l'ordre : chaque étape suppose la précédente.*

Ce document est une **liste d'exécution**, pas une explication. Le « pourquoi » de
chaque choix est dans `docs/PLATFORM-TICKETS.md`, ticket par ticket.

> **Rien de tout ceci n'a été exécuté en conditions réelles.** La CI prouve que le code
> compile, se teste et démarre ; elle ne prouve pas qu'un déploiement aboutit. Attendez-vous
> à corriger des détails au premier passage, et notez-les ici.

---

## 0. Décisions à prendre avant de commencer

| Décision | État | Bloque |
|---|---|---|
| Hébergeur PostgreSQL de production | **ouverte** | tout |
| Trois vérifications KPay (registre de commerce, frais, MTN *et* Orange) | **ouverte** | l'encaissement automatique |
| Accent officiel de GermanPass | **ouverte** | rien (provisoire : Rouge charte) |

L'hébergeur est le seul vrai verrou. Sans les vérifications KPay, on lance quand même :
le filet « preuve de paiement + validation admin » encaisse dès le premier jour.

---

## 1. DNS et domaines

Trois sous-domaines d'un **même domaine racine** — c'est ce qui permet à Clerk de poser un
cookie sur `.kebrane.com` et de partager la session sans configuration « satellite ».

| Sous-domaine | App | Port local |
|---|---|---|
| `germanpass.kebrane.com` | `apps/germanpass` | 3000 |
| `app.kebrane.com` | `apps/kebrane` (hub) | 3001 |
| `admin.kebrane.com` | `apps/admin` | 3002 |

## 2. E-mail

Boîtes et alias à créer (IONOS) : voir le tableau du ticket KB-21.

**Puis, impérativement : SPF, DKIM et DMARC sur `kebrane.com` ET `germanpass.io`.**
Sans eux, les messages partent en indésirables — et un compte dont l'e-mail de vérification
n'arrive jamais ne devient jamais client. C'est la panne la plus coûteuse de cette liste
parce qu'elle est silencieuse.

## 3. Clerk (production)

1. Ajouter le domaine `kebrane.com` dans le tableau de bord Clerk.
2. Laisser Clerk provisionner le Frontend API (`clerk.kebrane.com`).
3. Renseigner `CLERK_FRONTEND_API_ORIGIN=https://clerk.kebrane.com` dans **les trois apps**
   (il alimente la CSP ; sans lui, Clerk est bloqué).
4. Créer **deux abonnements webhook distincts** — deux endpoints, deux secrets :
   - `https://app.kebrane.com/api/webhooks/clerk` → `user.created`, `user.deleted`
   - `https://germanpass.kebrane.com/api/webhooks/clerk` → `user.created`, `session.created`, `user.deleted`

## 4. Base de données

```bash
pnpm --filter @kebrane/db db:deploy          # base Core (KEBRANE_DATABASE_URL)
pnpm --filter @kebrane/germanpass db:deploy  # base métier (DATABASE_URL)
```

⚠ La base GermanPass exige les extensions `vector`, `pg_trgm`, `citext`, `pgcrypto` —
voir `apps/germanpass/scripts/init-db.sql`. À appliquer **avant** les migrations.

## 5. Semer le catalogue

```bash
pnpm --filter @kebrane/core seed
```

Enregistre les produits **et** les offres. Idempotent : à rejouer à chaque déploiement.

## 6. Premier administrateur

1. `KEBRANE_BOOTSTRAP_ADMIN_EMAIL=hernan@kebrane.com` dans `apps/kebrane`.
2. S'inscrire avec cette adresse — le compte **naît `ADMIN`**.
3. **Activer la double authentification** sur le compte Clerk. Sans elle,
   `admin.kebrane.com` reste fermé, y compris à un `ADMIN`.
4. **Retirer la variable et redéployer.** Non cosmétique : tant qu'elle traîne, le prochain
   compte créé avec cette adresse serait promu en silence.

`grant-admin` ne convient **pas** ici : il exige que le compte existe déjà. Il sert ensuite,
pour promouvoir quelqu'un d'autre.

## 7. Reprise de l'existant

```bash
pnpm --filter @kebrane/germanpass kebrane:backfill
```

Reflète dans Core l'accès des comptes GermanPass déjà liés à Clerk. Sans lui, un abonné
existant verrait « À souscrire » sur le hub alors que son accès est valide. Idempotent.

## 8. Vérifications après mise en ligne

- [ ] `app.kebrane.com` répond ; création de compte possible.
- [ ] **Parcours SSO réel** : hub → « Ouvrir GermanPass » → retour, **sans re-login**.
      C'est le reste-à-faire de KB-10, jamais déroulé avec une vraie session.
- [ ] `admin.kebrane.com` : refusé sans 2FA, accessible avec.
- [ ] Les sept indicateurs s'affichent dans la console.
- [ ] Un e-mail transactionnel arrive **en boîte de réception**, pas en indésirables.
- [ ] `/pricing` affiche les offres **lues depuis Core** (pas la grille de repli).

## 9. Tâches périodiques

```bash
pnpm --filter @kebrane/germanpass kebrane:metrics   # quotidien
pnpm --filter @kebrane/germanpass ai:cost           # après ~50 corrections réelles
```

Le second n'est pas une tâche mais une **mesure à faire une fois** : il donne le coût réel
d'une correction, qui remplacera les estimations et permettra de basculer les drapeaux
d'enforcement.

## 10. À basculer plus tard, jamais au lancement

| Drapeau | Quand |
|---|---|
| `KEBRANE_ACCESS_ENFORCE=1` | quand Core est source de vérité de l'accès (après PSP) |
| `KEBRANE_AI_BUDGET_ENFORCE=1` | après avoir **mesuré** les coûts IA réels |

Les deux sont en observation à dessein. Les activer sur des estimations non vérifiées
couperait l'accès à des membres à jour de leur paiement.
