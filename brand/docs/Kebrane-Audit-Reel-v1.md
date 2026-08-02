# KEBRANE — Audit réel du code existant v1

*Basé sur le code effectivement connecté (dossier `projekts`). 30 juillet 2026.*
*Corrige les hypothèses des documents d'architecture v0.1/v0.2, écrits avant l'accès au code.*

> **Ce que le code change par rapport au diagnostic initial :** il **existe déjà 4 produits développés** (pas zéro), chacun avec sa propre authentification, sa propre base et son propre modèle utilisateur. Le problème de fragmentation **est déjà là**. Bonne nouvelle inattendue : deux produits partagent déjà une stack moderne quasi identique — ils forment une base naturelle pour Kebrane Core.

---

## 1. CE QUI EXISTE RÉELLEMENT

| Projet | Produit | Front | Back / Auth | Base de données | Paiement | Domaine |
|---|---|---|---|---|---|---|
| **daf-saas** | **GermanPass** | Next.js 15 + Tailwind/shadcn | next-auth v5 + Prisma | **PostgreSQL** + Redis | Preuve manuelle (Orange/MTN) | geek-devops.de |
| **tcf-saas** | **TCF Canada** | Next.js 15 + Tailwind | next-auth v5 + Prisma | **PostgreSQL** (`tcf_prod`) + Redis | Preuve manuelle (OM/MoMo) | geek-devops.de |
| **Prepa** | **Permis Cameroun** | React 18 + Vite + zustand | JWT maison (Express) | **MySQL** (`permis_cm`, Sequelize) | **PayDunya** (passerelle réelle) | crespo.geek-devops.de |
| **gestion-formation** | **Gestion Formation** | **Angular** + PWA | JWT maison (Express) | **PostgreSQL** (`gestion_formation`, pg brut) | — (interne) | — |
| **globalevisa** | *Global Visa Group* | Page statique (HTML) | — | — | — | globalevisagroup.com |

`globalevisa` n'est pas un produit : c'est une **page vitrine** d'une ancienne marque parapluie (« Global Visa Group »). À noter — Kebrane succède à cette tentative d'ombrelle. À archiver ou reconvertir.

**Fait notable :** GermanPass et TCF Canada sont des **quasi-jumeaux** — même stack (Next.js + Prisma + Postgres + next-auth v5), mêmes concepts (User, PaymentProof, PromoCode, AuditLog, moteur d'examens, génération IA, AiUsage). Ils ont visiblement été construits sur un même gabarit. C'est **beaucoup de code dupliqué**, donc une énorme opportunité de factorisation.

## 2. LES INCOHÉRENCES (le vrai problème à résoudre)

- **3 systèmes d'authentification différents** : next-auth v5 (GermanPass, TCF) et JWT maison Express (Prepa, Gestion Formation). Aucun SSO. **4 tables `User` distinctes**, 4 fois le hachage bcrypt, 4 fois « mot de passe oublié » (dont 2 ajoutés récemment par ta refonte auth).
- **3 bases hétérogènes** : PostgreSQL (×3, mais **bases séparées**) et **MySQL** (Prepa). Aucune donnée partagée.
- **3 paradigmes front** : Next.js (×2), React SPA (Prepa), Angular (Gestion Formation).
- **3 approches de paiement** : PayDunya automatisé (Prepa), preuve manuelle mobile-money (GermanPass, TCF), aucune (Gestion Formation).
- **Duplication massive** GermanPass ↔ TCF : auth, UI, moteur d'examen, génération IA, quasi identiques dans deux dépôts.

## 3. CORRECTION IMPORTANTE — LE PAIEMENT N'EST PAS STRIPE

Mon plan v0.1/v0.2 recommandait Stripe. **Le code montre autre chose, et le code a raison** : ton marché (Afrique francophone) fonctionne au **mobile money** (Orange Money, MTN MoMo) et via **PayDunya** (déjà intégré dans Prepa), pas Stripe. La brique paiement de Kebrane Core doit donc être bâtie sur **PayDunya / mobile money + le flux de preuve manuelle existant**, pas Stripe. C'est une correction structurante.

## 4. CORRECTION IMPORTANTE — LE CHOIX D'AUTH EST À RECONSIDÉRER

On a acté **Clerk** en supposant un projet neuf. Le code révèle que **les deux produits les plus avancés tournent déjà sur Auth.js v5 (next-auth) + Prisma**, et que tu viens d'investir dans une **refonte UX d'authentification** (récupération de compte, anti-énumération, inscription multi-étapes) sur ces trois produits. Adopter Clerk reviendrait à **jeter ce travail qui marche**.

Deux options honnêtes :

- **Option A — Auth.js v5 centralisé (recommandée au vu du code).** On construit l'auth Kebrane sur ce qui existe déjà et fonctionne. Zéro rework des deux produits jumeaux, on capitalise sur ta refonte récente. SSO à outiller, mais faisable avec un fournisseur d'identité central.
- **Option B — Clerk (décision précédente).** Plus rapide pour le SSO clé en main, mais impose de **migrer GermanPass et TCF** hors de next-auth et d'abandonner une partie de la refonte. Coût réel désormais visible.

**Recommandation révisée : reconsidérer vers l'Option A.** Le principe « ne pas refaire ce qui marche » penche clairement pour Auth.js maintenant qu'on voit l'existant. À trancher ensemble.

## 5. GARDER / REMPLACER / ADAPTER (par produit)

**GermanPass (daf-saas)** — *le meilleur candidat comme socle.*
- Garder : tout le métier (examens, passages, questions, mock exams, cours, leçons, flashcards, génération IA), l'AuditLog, la refonte auth.
- Remplacer : sa `User` locale et son auth deviennent l'**identité Kebrane centrale** (source unique).
- Adapter : ses tables reçoivent un `product_id`, ses paiements passent par la brique billing Core.

**TCF Canada (tcf-saas)** — *jumeau à fusionner, pas à maintenir en double.*
- Garder : le métier TCF (spécifique).
- Remplacer : auth, User, PaymentProof, moteur IA/examen **dupliqués** → mutualisés avec GermanPass dans les paquets partagés.
- Adapter : `product_id = tcf`.

**Permis Cameroun (Prepa)** — *le plus divergent techniquement, mais précieux (PayDunya + contenu).*
- Garder : le métier (quiz permis, contenu, seed), et surtout l'**intégration PayDunya** — elle sert de base à la brique paiement Core.
- Remplacer : JWT maison + MySQL/Sequelize → identité Kebrane + PostgreSQL. C'est le chantier le plus lourd (changement de base).
- Adapter : migrer les données MySQL→Postgres, `product_id = permis`.

**Gestion Formation (gestion-formation)** — *l'outsider (Angular).*
- Garder : le métier (formations, évaluations, examens de passage).
- Remplacer : JWT maison → identité Kebrane ; à terme, réévaluer Angular vs le reste (Next.js).
- Adapter : rattacher au compte central. Candidat à intégrer **en dernier** (stack la plus éloignée).

## 6. STRATÉGIE DE CONSOLIDATION RÉVISÉE

L'architecture cible (monorepo, monolithe modulaire, Core partagé, produits branchés) **reste valable**. Ce qui change, c'est le point de départ : on ne part pas de zéro, on **converge l'existant**.

**Ordre logique (du moins coûteux au plus coûteux) :**

1. **Monorepo + choix d'auth tranché** (Option A vs B) + design system Kebrane depuis la charte.
2. **Identité Kebrane centrale** : promouvoir la `User`/auth de GermanPass en identité partagée (base Postgres unique pour le socle). ← capitalise sur l'existant.
3. **Factoriser GermanPass ↔ TCF** : extraire l'auth, le moteur d'examen, la génération IA, le PaymentProof en **paquets partagés**. Les deux jumeaux deviennent deux modules minces sur un socle commun. *Gain immédiat le plus fort.*
4. **Brique paiement Core** sur PayDunya + mobile money + preuve manuelle (repris de Prepa/GermanPass), pas Stripe.
5. **Intégrer Permis Cameroun** : migration MySQL→Postgres + JWT→identité Kebrane.
6. **Intégrer Gestion Formation** en dernier (stack Angular la plus éloignée).
7. **Admin transversal minimal** + **kebrane.com** vitrine.

**Le MVP « GermanPass sous Kebrane »** = étapes 1-3 limitées à GermanPass : identité Kebrane + GermanPass factorisé + billing. TCF suit vite (jumeau). Permis et Gestion Formation viennent après.

## 7. RISQUES SPÉCIFIQUES AU RÉEL

1. **Migration MySQL→PostgreSQL (Prepa)** : le chantier technique le plus risqué (schéma, données, requêtes Sequelize). À isoler et tester à part.
2. **Fusion des deux `User` jumelles** (GermanPass/TCF) : dédoublonnage des comptes si un même utilisateur existe dans les deux ; règles de fusion à définir.
3. **Ne pas casser la production** : ces produits tournent sur geek-devops.de. La consolidation doit être progressive, produit par produit, sans big-bang.
4. **Décision Clerk vs Auth.js** non tranchée au vu du réel — bloque proprement l'étape 2.
5. **Angular isolé** (Gestion Formation) : soit on le garde tel quel branché sur l'auth centrale, soit on le réécrit plus tard — ne pas le laisser retarder le reste.
6. **Commits en attente** : le rapport d'auth signale des modifications non versionnées (verrou `.git/index.lock`). À committer avant toute manipulation lourde.

## 8. LES 5 PROCHAINES ÉTAPES CONCRÈTES (révisées)

1. **Trancher l'auth au vu du code** : Auth.js v5 centralisé (recommandé) vs Clerk. C'est le vrai déblocage.
2. **Committer l'existant** (refonte auth non versionnée) et figer une photo propre de chaque dépôt.
3. **Initialiser le monorepo Kebrane** et y **importer GermanPass** comme premier module (le socle le plus sain).
4. **Extraire les paquets partagés** en factorisant GermanPass ↔ TCF (auth, examens, IA, paiement) — le gain le plus rapide et le plus visible.
5. **Poser la brique paiement Core** sur PayDunya + mobile money (repris de Prepa), pas Stripe.

*Rien n'est modifié dans ton code à ce stade : ceci est l'audit et le plan. La construction attend ta validation, à commencer par la décision d'auth.*
