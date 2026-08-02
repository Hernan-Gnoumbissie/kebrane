# 08 — Plan d'exécution

Phases séquentielles (statut détaillé : PROGRESS.md, décisions : DECISIONS.md).

| Phase | Contenu | Livrables clés |
|---|---|---|
| 0 | Initialisation | scaffolding, docker-compose, CI/CD, README, bootstrap.sh |
| 1 | Fondations | schéma Prisma, 22 blueprints, NextAuth+guards, pages publiques, /api/health |
| 2 | Comptes & paiement | preuves, validation admin, promo, expiration cron, emails |
| 3 | Contenu & RAG | ingestion pgvector, anti-copie, génération+validation, TTS |
| 4 | Entraînement | moteur de correction (6 formats), scoring providers, runner /practice, 42+ tests |
| 5 | Schreiben & Sprechen | éval IA critères publics, MediaRecorder→STT→éval async, consentement RGPD |
| 6 | Simulateur | assemblage auto, sections séquencées, deadlines +5 s, verdict, comparatif |
| 7 | Apprentissage | cours/leçons (seuil 70 %), flashcards SM-2, Redemittel, recommandations |
| 8 | PWA & durcissement | Serwist (offline+file d'attente), Nginx CSP/rate-limit, k6, a11y |
| 9 | Recette & livraison | E2E Playwright, recette manuelle, docs 01-14, scripts VPS, v1.0.0 |

Critères d'acceptation globaux : cf. cahier des charges §8 — vérifiés via 12-RECETTE.md et CI verte.
