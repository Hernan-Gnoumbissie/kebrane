# KEBRANE — Architecture validée & MVP simplifié v0.2

*Amende le v0.1 après revue croisée. 30 juillet 2026. Document de travail — aucun code écrit.*
*Décisions prises avec : Profi (fondateur), revue Claude + revue ChatGPT. Responsable : Profi.*

> **Ce qui change depuis v0.1 :** on retire deux abstractions prématurées (4 déploiements, paquet SDK) et on fige un ordre de construction qui part du socle utilisateur + GermanPass, pas du site institutionnel. Le v0.1 reste valable pour le diagnostic et l'architecture *cible* ; ce document définit le *chemin MVP*.

---

## DIAGNOSTIC (rappel, inchangé)

Aucun système technique n'existe : pas d'auth, base, paiement ni dashboard. Projet neuf, marque et contenu avancés. Position idéale pour centraliser dès la première ligne — aucune dette à migrer. (Détail complet : v0.1.)

## DÉCISIONS VALIDÉES

**1. Trois surfaces pour le MVP (au lieu de quatre).**

| Surface | Contenu | Déploiement |
|---|---|---|
| **kebrane.com** | site public de la marque | app à part (construite en dernier) |
| **app.kebrane.com** | Compte Kebrane **+** GermanPass dans une seule app, modules séparés dans le code | app principale du MVP |
| **admin.kebrane.com** | administration minimale | app à part (sécurité staff distincte) |

On ne crée **pas** `kebrane-account` et `germanpass` comme déploiements séparés au départ : cela ajoute cookies inter-domaines, sessions et config pour aucune valeur immédiate. GermanPass sera extrait plus tard, quand ce sera utile.

*Garde-fou (prix de la simplification) :* dans `app.kebrane.com`, GermanPass vit dans son **propre module** avec une frontière nette. Le compte/Core ne connaît pas le métier GermanPass ; GermanPass n'accède au compte que par l'interface de services. Sans cette discipline, l'extraction future redevient douloureuse.

**2. Pas de paquet `@kebrane/sdk` au départ — une interface de services interne.**

Core expose des modules de service à API publique explicite : `auth`, `accounts`, `billing`, `notifications`, `events`, `support`. GermanPass les **appelle directement** en interne (même processus). 

*Garde-fou :* règle de frontière stricte — un produit n'appelle Core **que** par ces fonctions de service, **jamais** ses tables ni ses internes. À imposer par une **règle de lint** (interdire les imports profonds entre modules). Le jour où un produit est déployé séparément ou dans une autre techno, cette interface *devient* le SDK, sans réécriture.

**3. Administration minimale, qui ne retarde pas GermanPass.**

Le premier admin se limite à : utilisateurs inscrits · abonnements actifs · revenus · paiements échoués · dernière connexion · progression générale · journal des erreurs importantes. Pas de graphiques complexes, pas d'IA admin, pas de support outillé au début.

*Garde-fou :* garder les **crochets de contrôle d'accès** (gating par abonnement/rôle) en place dès l'étape 3, même si le paiement arrive à l'étape 5 — pour ne pas rétro-greffer le gating plus tard.

## CE QUI NE CHANGE PAS (les frontières non négociables)

Même dans une seule app, on tient dès le jour 1 : **isolation des données par `product_id`**, **RBAC (rôles/permissions)**, **journal d'activité**, **catalogue d'événements à 3 gravités** (info / important / action immédiate), et une **auth pensée pour le SSO futur**. Ce sont les contrats coûteux à corriger après coup ; propres et frontières nettes dans le code, sans obligation d'être des apps ou services séparés dès le départ.

## AUTHENTIFICATION — DÉCIDÉ : CLERK

**Choix verrouillé : Clerk.** « Un compte Kebrane pour tous les produits » suppose une brique capable de SSO quand GermanPass sera extrait ; Clerk le fournit nativement (comptes, rôles, organisations, SSO multi-app), avec une intégration rapide adaptée à un fondateur solo. Coût à l'usage au-delà du palier gratuit — acceptable au démarrage.

*Conséquences à tenir :* les rôles/permissions RBAC de Kebrane s'appuient sur les rôles Clerk mais restent modélisés côté Core (`roles`, `permissions`) pour ne pas enfermer la logique métier dans le fournisseur ; l'identité Clerk est liée à un `user` Core (source de vérité des données produit). On garde ainsi la possibilité de changer de fournisseur sans réécrire le domaine.

**Double authentification (2FA / MFA) — décidé : activée.** Fournie nativement par Clerk (application TOTP, SMS, codes de secours), sans développement supplémentaire. Application à deux niveaux :

- **Utilisateurs (GermanPass et produits)** : 2FA proposé en **option**, activable dans l'espace compte, non imposé à l'inscription (pas de friction au démarrage).
- **admin.kebrane.com (staff)** : 2FA **obligatoire**. C'est l'accès transversal à tous les utilisateurs, revenus et données ; il ne doit jamais dépendre d'un simple mot de passe. Conforme au principe « sécurité et rôles pensés dès le départ ».

## ORDRE DE CONSTRUCTION VALIDÉ (8 étapes)

1. **Monorepo + PostgreSQL + design system Kebrane** (`@kebrane/ui` depuis la charte). Nettoyer les 2 projets Vercel vides.
2. **Compte unique, authentification et rôles** (users, accounts, products, roles + RBAC). ← *décider l'auth avant.*
3. **Squelette GermanPass connecté au compte Kebrane** — zéro auth dupliquée ; crochets de contrôle d'accès posés.
4. **Cours, exercices et progression GermanPass** (le métier).
5. **Abonnements, paiements et contrôle d'accès** (Stripe + paywall).
6. **Journal d'événements et notifications essentielles** (catalogue 3 gravités, e-mails transactionnels).
7. **Mini-dashboard administrateur** (les 7 chiffres ci-dessus).
8. **Site public kebrane.com** — quand le produit a quelque chose de concret à montrer.

**MVP lançable = étapes 1 → 5** (socle + GermanPass jouable + monétisé). 6 et 7 suivent vite ; 8 en dernier.

## INSTRUCTION RETENUE POUR LA CONSTRUCTION

> Simplifier le MVP : éviter les séparations de déploiement et les abstractions prématurées. Construire d'abord **une seule plateforme cohérente** — compte Kebrane, GermanPass et une administration minimale. Les frontières doivent être **propres dans le code** (modules, interface de services, `product_id`, RBAC, lint de frontière), **sans** devenir obligatoirement des apps ou services séparés dès le départ. Extraire plus tard, seulement quand c'est utile.

---

*Prochaine action : trancher l'auth, puis lancer l'étape 1. Rien n'est codé tant que ce n'est pas validé.*
