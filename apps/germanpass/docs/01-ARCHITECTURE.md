# 01 — Architecture

## Vue d'ensemble

```
                    ┌─────────────┐
   Candidat/Admin ──► Nginx (TLS, │
   (navigateur,     │ CSP, rate-  │
    PWA Serwist)    │ limit)      │
                    └──────┬──────┘
                           │ :3000
                ┌──────────▼──────────┐     ┌────────────┐
                │ Next.js 15 (app)    │────►│ PostgreSQL │
                │ App Router + API    │     │ 16+pgvector│
                │ NextAuth v5 (JWT)   │     └────────────┘
                └──────┬───────┬──────┘            ▲
                       │       │ LPUSH daf:jobs    │
                ┌──────▼─┐  ┌──▼──────────────┐    │
                │ Redis  │◄─┤ Worker (tsx)    ├────┘
                │ cache/ │  │ ingestion RAG,  │
                │ queue/ │  │ TTS, Sprechen,  │──► API IA OpenAI-compatible
                │ ratelim│  │ cron expiration │    (AI_BASE_URL)
                └────────┘  └─────────────────┘
                       Fichiers : STORAGE_DIR (hors webroot, volume Docker)
```

## Principes
- **Piloté par blueprints** : aucune structure d'examen codée en dur ; `ExamBlueprint.structure/scoringRules` alimentent entraînement, simulateur, correction et scoring (`src/lib/exam-runner.ts`, `src/lib/scoring.ts`).
- **Correction côté serveur uniquement** : `src/lib/correction.ts` + sanitisation `src/lib/sanitize.ts` (aucune clé envoyée au client avant soumission).
- **Vérité serveur** : deadlines de sections stockées sur l'Attempt (tolérance +5 s), écoutes décomptées via `ListenEvent`.
- **Asynchrone** : worker Redis (BRPOP `daf:jobs`) pour ingestion documentaire, TTS et pipeline Sprechen (STT → métriques → évaluation IA).
- **RBAC revalidé en base** à chaque requête sensible malgré les JWT (ADR-004).

## Arborescence
- `src/app` : pages (public, dashboard, practice, exams, learn, account, admin) + API routes
- `src/lib` : moteur métier (correction, scoring, exam-runner, srs, ai, rag, anti-copy, generation, writing-eval, speech-metrics, recommendations, guards, storage…)
- `src/worker` : worker + jobs (ingest, tts, speaking)
- `prisma` : schéma, blueprints, seed — `tests` : unitaires + E2E — `deploy`/`scripts` : VPS, Nginx, sauvegardes
