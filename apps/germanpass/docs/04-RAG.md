# 04 — RAG et génération de contenu

## Pipeline d'ingestion (worker, job `ingest_document`)
1. Upload admin (`POST /api/admin/documents`, PDF/DOCX/TXT, magic-bytes pour PDF).
2. Extraction : `pdf-parse` (PDF), `mammoth` (DOCX), UTF-8 (TXT/MD).
3. Chunking ~512 tokens (≈4 car/token), frontières paragraphe/phrase, chevauchement 200 car (`src/lib/chunking.ts`).
4. Embeddings par lots de 64 (`/embeddings`, dimension `AI_EMBEDDING_DIMENSIONS`, défaut 1536).
5. Insertion `document_chunks.embedding vector` (SQL brut), statut `READY`. Ré-ingestion idempotente.

## Recherche (`src/lib/rag.ts`)
Top-k 6 par distance cosinus (`embedding <=> $vec`), filtre niveau (`documents.level IS NULL OR = :level`), documents `READY` uniquement.

## Génération (admin, `src/lib/generation.ts`)
Prompt système : concepteur DaF, contenu 100 % original, interdiction de reproduire des sujets officiels. Contexte RAG = inspiration thématique/lexicale (« NE PAS copier »). Sortie JSON validée Zod (titre, passage, questions+options+explications FR). Rate-limit 20 générations/h/admin.

## Garde anti-copie (`src/lib/anti-copy.ts`)
Rejet si `similarity(content, texte) ≥ 0.55` (pg_trgm) **OU** cosinus embedding `≥ 0.92` contre la bibliothèque. Résultat tracé dans `ai_generations.similarityMax` ; en cas de rejet → statut `REJECTED` + motif.

## Validation humaine obligatoire
Toute génération crée le contenu en `PENDING_REVIEW`. `PATCH /api/admin/generations/:id` → approve (publie passage+questions) ou reject (archive). Rien n'est servi aux candidats sans `PUBLISHED`.

## Changement de fournisseur / dimension d'embedding (ADR-005)
1. Modifier `AI_BASE_URL`, `AI_MODEL_EMBEDDING`, `AI_EMBEDDING_DIMENSIONS`.
2. Migration SQL : `ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(<dim>) USING NULL; UPDATE documents SET status='UPLOADED';`
3. Ré-enfiler l'ingestion de chaque document (réindexation complète).
