# DECISIONS.md — Architecture Decision Records (format court)

## ADR-001 — Environnement d'exécution limité : livraison code + scripts
- **Contexte** : l'environnement d'agent ne peut pas exécuter de commandes shell sur le dossier projet (montage WSL/UNC non supporté par la sandbox). `npm install`, `prisma migrate`, `tsc`, tests et `git` ne sont pas exécutables par l'agent.
- **Décision** : conformément à §1.3.4 du cahier des charges, tout le code est livré sous forme de fichiers sources complets + scripts prêts à exécuter (`scripts/bootstrap.sh`, CI GitHub Actions qui exécute lint/typecheck/tests). Les commits de fin de phase sont remplacés par des entrées PROGRESS.md ; le premier commit est effectué par `bootstrap.sh`.
- **Conséquence** : la vérification `tsc/lint/tests verts` est déléguée à la première exécution locale + CI. Le code est écrit avec soin pour passer ces portes.

## ADR-002 — Tailwind 3.4 plutôt que 4.x
- **Contexte** : shadcn/ui et l'écosystème de plugins sont les plus stables sur Tailwind 3.x avec config TS.
- **Décision** : Tailwind 3.4 + tailwindcss-animate, variables CSS shadcn classiques.
- **Conséquence** : migration v4 possible plus tard sans impact métier.

## ADR-003 — NextAuth v5 beta (next-auth@5.0.0-beta)
- **Contexte** : le cahier des charges impose NextAuth v5 ; v5 est encore en beta mais stable en production sur App Router.
- **Décision** : `next-auth@5.0.0-beta.25` épinglé exactement (pas de caret) pour éviter les breaking changes entre betas.
- **Conséquence** : montée de version manuelle et testée.

## ADR-004 — Stratégie JWT sans adapter de session DB
- **Contexte** : pattern tcf-saas : Credentials + Google OAuth, JWT.
- **Décision** : sessions JWT (pas de table Session) ; le statut/rôle utilisateur est revalidé en base dans les guards serveur à chaque requête sensible, pas seulement depuis le JWT.
- **Conséquence** : révocation effective (compte suspendu/expiré) malgré JWT.

## ADR-005 — Embeddings : dimension paramétrable, défaut 1536
- **Contexte** : `AI_BASE_URL` doit permettre de changer de fournisseur ; les dimensions d'embedding varient.
- **Décision** : colonne pgvector créée à la dimension `AI_EMBEDDING_DIMENSIONS` (défaut 1536, text-embedding-3-small) via migration SQL brute ; changement de dimension = migration de réindexation documentée dans 04-RAG.md.
- **Conséquence** : bascule de fournisseur possible au prix d'une réindexation.

## ADR-006 — 18 blueprints au seed
- **Contexte** : §3.2 : Goethe A1–C2 (6), ÖSD A1–C2 (6), TELC A1–C2 (6, C1 Hochschule en variante de C1), ECL A2–C1 (4) = 22 combinaisons potentielles ; le cahier des charges dit « 18 blueprints ».
- **Décision** : seed de 22 blueprints (toutes les combinaisons provider×niveau listées en §3.2, TELC C1 Hochschule comme blueprint distinct version `hochschule`) — le chiffre 18 du §8 est traité comme indicatif, la liste §3.2 fait foi.
- **Conséquence** : couverture complète ; structures à re-vérifier contre les sites officiels avant publication (champ `version` + doc 02-EXAM-BLUEPRINTS.md).

## ADR-007 — Stockage fichiers local + route authentifiée
- **Contexte** : preuves de paiement, audios Hören/Sprechen, images stimulus, PDF bibliothèque.
- **Décision** : système de fichiers local `STORAGE_DIR` (volume Docker), hors webroot, servi exclusivement par `/api/files/[...path]` avec contrôle RBAC + validation magic-bytes à l'upload. Pas de S3 en v1 (pas de dépense non prévue, cf. §1.3.2-d).
- **Conséquence** : 10-SCALABILITY.md documente la migration S3-compatible si >10k utilisateurs.
