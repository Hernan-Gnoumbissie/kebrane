# 10 — Scalabilité (cible 10 000 utilisateurs)

## Dimensionnement actuel (mono-VPS)
4 vCPU / 8 Go : Next.js standalone + worker + PostgreSQL + Redis tiennent ~1 000 utilisateurs actifs/jour. Les goulots sont l'IA (latence externe, déjà asynchrone pour Sprechen) et Postgres.

## Paliers
1. **~2 000 utilisateurs** : monter le VPS (8 vCPU/16 Go), `shared_buffers=2GB`, pool Prisma (`connection_limit=20`), activer le cache Redis sur les listes publiées (passages, examens) avec TTL 60 s.
2. **~5 000** : séparer la BDD (Postgres managé UE — pgvector supporté), répliques de lecture pour les historiques ; 2e worker (les jobs BRPOP se répartissent naturellement) ; HNSW index sur `document_chunks.embedding` (`CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`).
3. **~10 000** : 2+ instances app derrière Nginx upstream (sessions JWT = stateless, rate-limit déjà dans Redis partagé) ; stockage fichiers → S3-compatible UE (remplacer `src/lib/storage.ts`, interface conservée — ADR-007) ; TTS/embeddings en batch nocturne pour lisser les coûts.

## Points déjà prêts
Pagination sur listes admin, index Prisma sur les chemins chauds, files asynchrones, coûts IA plafonnés par utilisateur, k6 (`scripts/k6-load.js`) pour valider chaque palier (p95 < 500 ms).

## Vigilances
`audit_logs` et `ai_usage` croissent vite → partitionnement mensuel ou archivage > 12 mois. `listen_events` purgables avec les attempts > 24 mois (RGPD minimisation).
