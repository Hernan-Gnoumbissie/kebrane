# 03 — Base de données

PostgreSQL 16, extensions `vector`, `pg_trgm`, `citext`, `pgcrypto` (créées par `scripts/init-db.sql`). ORM Prisma ; SQL brut (`Prisma.sql`) pour pgvector.

## Domaines
- **Comptes** : `users` (status PENDING→ACTIVE→EXPIRED/SUSPENDED/DELETED, accessUntil, audioConsentAt RGPD, aiBudgetUsd), `payment_proofs`, `promo_codes(+redemptions)`, `audit_logs`, `ai_usage`.
- **RAG** : `documents` → `document_chunks` (embedding `vector(1536)`, dimension = `AI_EMBEDDING_DIMENSIONS`, cf. ADR-005), `ai_generations` (file de validation humaine).
- **Banque de contenu** : `exam_blueprints` (unique provider+level+variant+version), `passages` (+`passage_providers` n-n, variety de/at/ch, maxListens), `questions`+`answer_options` (isCorrect jamais exposé), `writing_prompts` (criteria Json), `speaking_tasks`, `audio_jobs` (TTS).
- **Examens** : `mock_exams` → `mock_exam_sections` → `mock_exam_items` (question|writingPrompt|speakingTask).
- **Tentatives** : `attempts` (kind practice|mock, sectionDeadlines Json = vérité serveur, scores Json), `attempt_answers` (unique attempt+question), `listen_events`, `writing_submissions`, `speaking_submissions` (statuts PENDING→TRANSCRIBING→EVALUATING→COMPLETED|FAILED|FLAGGED).
- **Apprentissage** : `courses` → `lessons` → `lesson_exercises` (metadata porte les clés, sanitisées à l'envoi), `lesson_progress` (seuil chapitre 70 %), `vocab_decks` → `flashcards` → `flashcard_reviews` (SM-2 : easeFactor, intervalDays, repetitions, dueAt).

## Invariants (appliqués serveur)
1. Clés de correction jamais envoyées avant soumission (`src/lib/sanitize.ts`).
2. Deadlines par section sur l'attempt, tolérance +5 s (`isPastDeadline`).
3. Écoutes Hören décomptées par `listen_events` (max par passage).
4. Toute action admin et transition de statut → `audit_logs`.

## Index principaux
`users(status,accessUntil)`, `payment_proofs(status,createdAt)`, `passages(section,level,status,archived)`, `questions(section,level,taskFormat,status)`, `attempts(userId,kind,status,startedAt)`, `flashcard_reviews(userId,dueAt)`, `audit_logs(action,createdAt)`.

Migrations : `npx prisma migrate dev` (dev) / `migrate deploy` (prod). Seed idempotent : `npm run db:seed`.
