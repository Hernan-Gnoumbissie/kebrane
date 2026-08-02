# 06 — Dashboards

## Candidat (`/dashboard`)
Jours d'accès restants (accessUntil), alerte compte PENDING, accès Entraînement (`/practice`, `/practice/schreiben`, `/practice/sprechen`), Examens blancs (`/exams`), Apprentissage (`/learn`). Historique : pratique (`GET /api/practice/attempts`), écrits/oraux (`GET /api/writing|speaking/submissions`), rapports d'examens. Recommandations (`/api/learn/recommendations`) : chapitres suggérés selon les erreurs récurrentes des feedbacks IA.

## Admin (`/admin`)
- Vue d'ensemble : preuves en attente, utilisateurs, comptes actifs.
- `/admin/proofs` : file de validation (voir fichier, +7/+30/+90/+365 j, refus motivé).
- `/admin/users` : recherche, octroi de jours, suspension/réactivation.
- `/admin/promo-codes` : création/suivi.
- API-first (écrans à enrichir) : bibliothèque RAG, générations IA en attente, jobs TTS, banque Schreiben/Sprechen, assemblage/publication d'examens, curriculum, modération Sprechen FLAGGED (`speaking_submissions.status=FLAGGED`), stats coûts IA (`ai_usage` agrégé par kind/mois), audit log.
