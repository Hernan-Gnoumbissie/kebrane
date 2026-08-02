# KEBRANE — Diagnostic & architecture cible v0.1

*État des lieux, architecture recommandée et ordre d'exécution. 30 juillet 2026.*
*Document de travail — aucune ligne de code n'a été écrite ; c'est un plan à valider avant toute construction.*

> **Principe directeur :** la logique commune (identité, comptes, abonnements, paiements, notifications, support, admin) se construit **une seule fois** dans Kebrane Core ; chaque produit n'apporte que son métier. On ne recrée jamais l'authentification ou la facturation par produit.

---

## 1. ÉTAT ACTUEL RÉEL DU PROJET

Le point le plus important d'abord, sans détour : **il n'existe aujourd'hui aucun code, aucune base de données, aucune authentification, aucun système de paiement et aucun tableau de bord.** Le projet est en phase pré-développement. Ce qui existe est entièrement du côté **marque, contenu et administratif**.

Ce que la vérification a montré :

- **Système de marque complet** (Kebrane) : manifeste, culture, principes produit, identité verbale, brief logo, guide marketing, Brand Book v1.0, charte graphique (Georgia, Marine #1F3352 / Rouge #A5322C), architecture de marque (chaque produit = une couleur de conteneur, « By Kebrane »).
- **Nom verrouillé et défriché juridiquement** : clearance TMview faite (espace propre en classes 9/41/42), brief CPI et libellé de dépôt pré-rédigés.
- **Domaine** : kebrane.com enregistré chez IONOS (créé le 29/07/2026). kebrane.io libre. .de/.eu/.app à prendre.
- **Contenu produit déjà collecté** : dans Google Drive, une série de **sujets d'examen du permis de conduire camerounais (catégorie B)** en PDF + photos. C'est de la matière première pour **PermitPass**, pas du code.
- **Vercel** : deux projets (`project-gglt1`, `project-ruide`) **entièrement vides** — aucun framework, aucun déploiement, aucun domaine. Ce sont des coquilles créées puis abandonnées.

## 2. CE QUI EXISTE DÉJÀ (et a de la valeur)

- La **marque et la charte** : réutilisables tels quels, ils deviennent la base du design system (`@kebrane/ui`).
- L'**architecture de marque** (symbole universel + accent couleur par produit, « By Kebrane ») : c'est déjà, sans le savoir, une spécification de plateforme centralisée. Elle se traduit directement en architecture technique.
- Le **domaine kebrane.com** et le compte IONOS/Vercel : socle d'hébergement et de sous-domaines.
- Le **contenu PermitPass** (banques de questions du permis) : actif métier réutilisable.
- Les **décisions de méthode** (pré-enregistrement, sécurité et rôles pensés en amont) : à porter dans l'ingénierie.

## 3. CE QUI MANQUE (tout le technique)

Authentification, comptes utilisateurs, rôles et permissions, base de données, abonnements, facturation/paiements, e-mails transactionnels, notifications, support, journaux d'activité, système d'événements, tableau de bord admin, et les produits eux-mêmes (GermanPass en premier). **Rien de cela n'existe.**

**La bonne nouvelle :** comme rien n'est construit, il n'y a **aucune dette technique à migrer** et **aucun risque de démêler quatre applications déjà divergentes.** Le problème que tu veux éviter — reconstruire séparément pour chaque SaaS — ne s'est pas encore produit. On peut le rendre **structurellement impossible** dès le premier jour. C'est le meilleur moment possible pour centraliser.

## 4. CE QUI PEUT ÊTRE CONSERVÉ

- Charte graphique et marque → design system.
- Domaine + comptes IONOS/Vercel.
- Contenu PermitPass.
- Le compte Vercel (mais **pas** les deux projets vides : à supprimer ou renommer proprement).

## 5. CE QUI DOIT ÊTRE MODIFIÉ / NETTOYÉ

- **Supprimer/renommer** les deux projets Vercel vides pour repartir d'une nomenclature claire (`kebrane-web`, `kebrane-account`, `kebrane-admin`, `germanpass`).
- Fixer **une stack unique** avant d'écrire quoi que ce soit (aucune stack n'existe aujourd'hui — voir §7). C'est un choix à faire, pas un héritage à respecter.
- Ranger le contenu PermitPass dans une structure exploitable (dossier Drive dédié ou base de contenu).

## 6. CE QUI DOIT ÊTRE CENTRALISÉ (le cœur de Kebrane)

Tout ce qui est **transversal** vit dans **Kebrane Core** et n'est jamais réimplémenté par produit :

identité et authentification · sessions et SSO · comptes utilisateurs · rôles et permissions (RBAC) · registre des produits · abonnements · paiements et facturation · e-mails transactionnels · notifications · consentements (RGPD) · journaux d'activité · événements système · demandes d'assistance · métriques et tableau de bord admin.

Ce qui reste **propre à chaque produit** : uniquement le métier. Pour GermanPass : leçons, exercices, progression, préparation d'examen, simulations, résultats, recommandations pédagogiques. Rien d'autre.

## 7. ARCHITECTURE CIBLE DE KEBRANE

**Forme générale : un monolithe modulaire dans un monorepo.** Pas de microservices (sur-ingénierie pour un fondateur solo au démarrage). Un seul dépôt, un seul socle de données, des modules à frontière nette. On pourra extraire un service plus tard si un produit l'exige — mais seulement si.

**Monorepo (pnpm workspaces + Turborepo) organisé en deux étages :**

*Paquets partagés (`/packages`) — la logique Kebrane, écrite une fois :*
- `@kebrane/ui` — design system (charte : Georgia, Marine/Rouge, « By Kebrane »).
- `@kebrane/db` — schéma et accès base de données (un seul PostgreSQL).
- `@kebrane/auth` — identité, sessions, SSO, RBAC.
- `@kebrane/core` — domaine transversal : comptes, produits, abonnements, facturation, consentements, support.
- `@kebrane/events` — catalogue d'événements, émission, classification par gravité, routage (notif / e-mail / ticket / incident).
- `@kebrane/sdk` — la seule porte par laquelle un produit parle à Core (compte, abonnement, notif, événement, support).

*Applications (`/apps`) — les surfaces, déployées sur Vercel :*
- `kebrane-web` → **kebrane.com** : site public de la marque mère, présentation des produits.
- `kebrane-account` → **account.kebrane.com** : espace unique de l'utilisateur (profil, produits actifs, abonnements, factures, paiements, notifications, support, préférences, consentements). Un seul identifiant pour tous les produits.
- `kebrane-admin` → **admin.kebrane.com** : tableau de bord unique, filtrable par produit, avec vue par utilisateur.
- `germanpass` → **germanpass.kebrane.com** (ou app.kebrane.com/germanpass) : le premier produit. Puis `tcfpass`, `permitpass`, `arrival` s'ajoutent comme apps sœurs.

**Base de données : un seul PostgreSQL** (Neon ou Supabase), organisé en espaces logiques :
- *Tables Core* (partagées) : `users`, `accounts`, `products`, `subscriptions`, `invoices`, `payments`, `roles`, `permissions`, `consents`, `notifications`, `activity_logs`, `system_events`, `support_tickets`.
- *Tables produit* (préfixées / schéma dédié) : `germanpass_lessons`, `germanpass_progress`, `germanpass_exams`… Aucune app produit n'écrit dans les tables d'un autre produit.

**Isolation des données :** chaque donnée métier est rattachée à un `product_id` ; l'accès passe par le RBAC et des règles d'accès explicites. Les données privées d'un produit ne sont jamais lisibles par un autre sans règle. Kebrane Account et Admin sont les seuls à avoir une vue transversale, sous contrôle de rôle.

**Stack recommandée** (à valider — aucune n'existe encore, donc c'est un choix libre, cohérent avec Vercel déjà en place) :

| Besoin | Choix recommandé | Pourquoi |
|---|---|---|
| Monorepo | pnpm + Turborepo | standard, léger, partage de paquets |
| Framework | Next.js (App Router) | déjà aligné avec Vercel |
| Base de données | PostgreSQL (Neon/Supabase) | relationnel, transactions, RGPD |
| ORM | Prisma ou Drizzle | schéma typé, migrations |
| Auth / SSO | Auth.js (contrôle) *ou* Clerk/WorkOS (rapidité) | à trancher — voir risques |
| Paiements | Stripe (Billing) | abonnements + factures multi-produits |
| E-mail transactionnel | Resend | simple, fiable |
| Hébergement | Vercel | déjà connecté |

## 8. PLACE EXACTE DE GERMANPASS

GermanPass est le **premier module produit**, pas une application autonome. Concrètement :

- Il **délègue** à Core, via `@kebrane/sdk` : login (Kebrane Account), compte, rôles, abonnement, paiement, notifications générales, support, admin.
- Il **possède** ses propres tables `germanpass_*` et sa logique métier : cours d'allemand, exercices, progression, préparation et simulation d'examen, résultats, recommandations.
- Il **émet des événements** vers Core : `user.logged_in`, `lesson.completed`, `exam.completed`, `subscription.started`, `payment.succeeded`, `support.requested`, `system.error`…
- Il porte la signature **« GermanPass — By Kebrane »** et l'accent bleu ardoise défini par l'architecture de marque.

Résultat : le jour où TCFPass arrive, il ne recode rien de tout ça — il branche le SDK et ajoute son métier.

## 9. SYSTÈME D'ÉVÉNEMENTS & NOTIFICATIONS

Au démarrage, **pas de bus type Kafka** (inutile dans un monolithe). Un mécanisme simple :

1. Le produit émet un événement typé via `@kebrane/sdk` (ex. `exam.completed`).
2. Core l'**enregistre** dans `system_events`.
3. Un **catalogue d'événements** attribue à chaque type une **gravité** :
   - *Enregistré* (info) : stocké, alimente les stats, aucune alerte. Ex. `lesson.completed`.
   - *Important* : notification utilisateur et/ou e-mail. Ex. `subscription.started`, `payment.succeeded`.
   - *Action immédiate* : incident visible dans Admin, éventuel ticket support auto. Ex. `payment.failed`, `system.error`.
4. Selon la gravité, Core déclenche : mise à jour des métriques, notification, e-mail, ticket, incident.

Tu ne reçois donc une alerte que pour les deux niveaux hauts, jamais pour les actions mineures. Le classement est **déclaratif** (une table de catalogue), donc ajustable sans toucher au code des produits.

## 10. PLAN DE MIGRATION PROGRESSIF & MVP

Comme rien n'existe, « migration » = **ordre de construction**, pas reprise de legacy. On construit les **contrats** (auth, SDK, schéma d'événements, isolation des données) d'abord, pour que chaque produit suivant soit un branchement, pas une reconstruction.

**Phases :**
- **Phase 0 — Fondations.** Monorepo, design system (`@kebrane/ui`), PostgreSQL, schéma Core minimal (`users`, `accounts`, `products`, `roles`), `@kebrane/auth` (login + SSO + RBAC).
- **Phase 1 — Compte + premier produit branché.** Kebrane Account (login, profil, produits actifs) + squelette GermanPass connecté à l'auth Core via le SDK. Aucune duplication d'authentification : preuve par l'exemple.
- **Phase 2 — Argent.** Abonnements + Stripe + factures dans Core ; paywall GermanPass.
- **Phase 3 — Événements & communication.** `@kebrane/events`, notifications, e-mails transactionnels, support minimal.
- **Phase 4 — Admin.** Tableau de bord unique : métriques globales, filtre par produit, fiche utilisateur.
- **Phase 5 — Vitrine & extension.** kebrane.com public ; ajout de TCFPass / PermitPass / Arrival comme modules.

**MVP réaliste (lancer GermanPass sans construire toute la plateforme) = Phases 0 → 2 :**
- Kebrane Account (login unique) + GermanPass (métier) + abonnement/paiement Stripe + une table `system_events` qui journalise déjà tout + un Admin *lecture seule* réduit à 4-5 chiffres (utilisateurs, inscriptions, abonnements actifs, revenus, paiements échoués).
- **On diffère :** l'Admin analytique complet, les filtres multi-produits avancés, le support outillé, TCFPass/PermitPass/Arrival.
- **Ce qu'on ne diffère jamais :** les frontières (SDK, catalogue d'événements, isolation par `product_id`, SSO, RBAC). Ces contrats coûtent cher à corriger après coup ; construits maintenant, ils rendent l'ajout de produits trivial.

---

## PRINCIPAUX RISQUES

1. **Décalage de perception (le plus important).** Le brief supposait du code, des bases, des dashboards existants ; il n'y en a pas. Bonne nouvelle (rien à migrer), mais il faut planifier une **construction**, pas une reprise.
2. **Le choix d'authentification est le plus structurant.** Se tromper coûte cher plus tard. Il faut du **SSO natif dès le jour 1** ; à trancher entre Auth.js (contrôle, gratuit, plus de travail) et Clerk/WorkOS (rapide, payant, moins de contrôle).
3. **Sur-ingénierie.** Le risque inverse de ta crainte : trop centraliser trop tôt. Le monolithe modulaire est la parade ; pas de microservices, pas de bus d'événements lourd tant qu'il n'y a pas d'utilisateurs.
4. **Isolation des données produit.** À poser dès le schéma (`product_id`, RBAC, règles d'accès) ou fuite/mélange plus tard.
5. **Modèle de facturation multi-produits.** Un client Stripe par Kebrane Account, un abonnement par produit : à modéliser correctement dès la Phase 2.
6. **Capacité (fondateur solo).** Le périmètre MVP doit rester serré. Ne pas construire l'Admin analytique avant d'avoir des utilisateurs.
7. **Nettoyage Vercel.** Deux projets vides à ranger pour éviter la confusion de nomenclature.

## ARCHITECTURE RECOMMANDÉE (en une phrase)

Un **monorepo monolithe-modulaire** : Kebrane Core (auth, comptes, abonnements, paiements, notifications, support, événements) partagé par toutes les surfaces, plus des **produits branchés par SDK** qui n'apportent que leur métier — GermanPass en premier, sous « By Kebrane ».

## LES 5 PROCHAINES ÉTAPES CONCRÈTES

1. **Valider ce diagnostic et l'architecture cible** (ce document), et **trancher la stack** — surtout le choix d'auth (Auth.js vs Clerk/WorkOS).
2. **Initialiser le monorepo** : `pnpm` + Turborepo, apps vides (`kebrane-web`, `kebrane-account`, `kebrane-admin`, `germanpass`), paquets (`ui`, `db`, `auth`, `core`, `events`, `sdk`), et **nettoyer les 2 projets Vercel vides**.
3. **Poser le schéma Core minimal + l'authentification SSO** (`users`, `accounts`, `products`, `roles` + login unique). C'est la fondation qui rend la centralisation réelle.
4. **Brancher un squelette GermanPass sur Kebrane Account** (login délégué, zéro auth dupliquée) — la première preuve concrète que le modèle tient.
5. **Ajouter abonnement + paiement Stripe** dans Core et le paywall GermanPass → on tient alors un MVP lançable.

*Rien de tout cela n'est codé ; ce document est le point de validation avant d'écrire la première ligne.*
