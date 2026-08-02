# 05 — API

Toutes les entrées validées **Zod**. Erreurs : `{ "error": { "code", "message", "details?" } }`.
Codes : 400 VALIDATION/BAD_JSON/BAD_RESPONSE/BAD_FILE_TYPE · 401 UNAUTHENTICATED · 403 FORBIDDEN/NOT_ACTIVE/EXPIRED/SUSPENDED/CONSENT_REQUIRED/MAX_LISTENS · 404 NOT_FOUND/NO_CONTENT · 409 ALREADY_REVIEWED/ALREADY_IN_PROGRESS/DEADLINE_PASSED/BAD_STATUS · 413 TOO_LARGE · 422 INSUFFICIENT_CONTENT · 429 RATE_LIMITED · 500 INTERNAL · 502 EVAL_FAILED/GENERATION_FAILED.

Guards : `requireStudent` (ACTIVE + non expiré, revalidé en BDD), `requireAuthenticated`, `requireAdmin`.

## Public / compte
| Méthode | Route | Description |
|---|---|---|
| GET | /api/health | santé app+db+redis |
| POST | /api/auth/register | inscription (rl 5/h/IP, réponse non révélatrice) |
| * | /api/auth/[...nextauth] | NextAuth (credentials + Google) |
| POST/GET | /api/account/payment-proof | upload preuve (jpeg/png/webp/pdf, rl 5/h) / mes preuves |
| POST | /api/account/promo | échange code promo (transaction) |
| PATCH | /api/account/consent | consentement audio RGPD |
| GET | /api/files/[...path] | fichiers (RBAC par catégorie, anti-traversée) |

## Candidat
| Méthode | Route | Description |
|---|---|---|
| POST/GET | /api/practice/attempts | démarrer session Lesen/Hören (contenu sanitisé) / historique |
| POST | /api/practice/attempts/:id/listen | décompte d'écoute serveur |
| POST | /api/practice/attempts/:id/submit | correction serveur + explications |
| GET | /api/writing/prompts?provider&level | consigne Schreiben aléatoire |
| POST/GET | /api/writing/submissions | soumission → éval IA critères provider (rl 10/h) / historique |
| GET | /api/speaking/tasks?provider&level | tâche Sprechen |
| POST/GET | /api/speaking/submissions | upload audio (consentement requis) → pipeline async / historique |
| GET/PATCH | /api/speaking/submissions/:id | polling résultat / signalement (FLAGGED) |
| GET | /api/exams | examens blancs publiés |
| POST | /api/exams/:id/attempts | démarrer (1 examen en cours max) |
| GET | /api/exams/attempts/:id/current | section courante sanitisée + deadline |
| POST | /api/exams/attempts/:id/submit-section | soumet (tolérance +5 s, auto-submit), section suivante |
| GET | /api/exams/attempts/:id/report | rapport final, verdict provider, comparatif |
| GET | /api/learn/courses?level&kind | cours + progression |
| GET | /api/learn/lessons/:id | leçon + exercices sanitisés |
| POST | /api/learn/lessons/:id/submit | correction, validation chapitre ≥ 70 % |
| GET | /api/learn/flashcards/due | file SRS (20 cartes) |
| POST | /api/learn/flashcards/:id/review | révision SM-2 (quality 0-5) |
| GET | /api/learn/recommendations | chapitres suggérés selon erreurs récurrentes |

## Admin
| Méthode | Route | Description |
|---|---|---|
| GET | /api/admin/users · PATCH /api/admin/users/:id | liste/recherche · grant/suspend/unsuspend |
| GET | /api/admin/proofs · PATCH /api/admin/proofs/:id | file preuves · approve(+7/30/90/365)/reject |
| GET/POST | /api/admin/promo-codes | codes promo |
| POST/GET | /api/admin/documents | bibliothèque RAG (ingestion async) |
| POST/GET | /api/admin/generations · PATCH :id | génération IA (rl 20/h) · approve/reject |
| POST/GET | /api/admin/audio-jobs | TTS Hören (génération/régénération) |
| POST/GET | /api/admin/writing-prompts · /api/admin/speaking-tasks | banque Schreiben/Sprechen |
| POST/GET | /api/admin/mock-exams · PATCH :id | assemblage auto depuis blueprint (422 si banque insuffisante) · publication |
| POST/GET | /api/admin/courses · POST /api/admin/lessons | curriculum (leçons + exercices) |
