# PROGRESS.md — Avancement du projet

| Phase | Statut | Date | Notes |
|---|---|---|---|
| 0 — Initialisation | ✅ | 2026-06-11 | Scaffolding Next.js 15 + TS strict + Tailwind/shadcn, docker-compose (pgvector+redis), CI/CD GitHub Actions, bootstrap.sh (ADR-001). |
| 1 — Fondations | ✅ | 2026-06-11 | Schéma Prisma complet, seed admin + 22 blueprints (ADR-006), NextAuth v5 + anti-bruteforce, guards RBAC revalidés en BDD (ADR-004), landing bilingue + disclaimers, /api/health. |
| 2 — Comptes & paiement | ✅ | 2026-06-11 | Preuves (magic-bytes, hors webroot), validation +7/30/90/365 j, promo codes, cron expiration, emails, /account + /admin. |
| 3 — Banque de contenu & RAG | ✅ | 2026-06-11 | Client IA OpenAI-compatible (ai_usage + plafond mensuel), ingestion PDF/DOCX/TXT → pgvector, RAG top-k 6, anti-copie (trigram 0,55 / cosinus 0,92), génération → validation humaine, TTS Hören (variétés de/at/ch, vitesse par niveau). |
| 4 — Entraînement | ✅ | 2026-06-11 | Moteur de correction déterministe (6 formats, crédit partiel), scoring 4 providers, sanitisation stricte, écoutes serveur, runner /practice. |
| 5 — Schreiben & Sprechen | ✅ | 2026-06-11 | Éval IA par critères publics (Zod, clamp serveur), éditeur chronométré, MediaRecorder → STT → métriques (wpm, répétitions, hésitations) → éval async, consentement RGPD, signalement/modération. |
| 6 — Simulateur d'examen | ✅ | 2026-06-11 | Assemblage auto depuis blueprint (422 + manques si banque insuffisante), publication, runner séquencé sans retour arrière, deadlines serveur +5 s, auto-submit, rapport avec verdict provider + comparatif. |
| 7 — Apprentissage | ✅ | 2026-06-11 | Cours/leçons Markdown + exercices auto-corrigés (chapitre ≥ 70 %), flashcards SM-2, recommandations par erreurs récurrentes, CRUD admin curriculum, page /learn. |
| 8 — PWA, durcissement, perfs | ✅ | 2026-06-11 | Serwist (offline + file d'attente de soumission), manifest PWA, Nginx durci (CSP, rate-limit auth), scripts backup/restore chiffrés, k6, a11y (roles, aria-labels, timers). |
| 9 — Recette & livraison | ✅ | 2026-06-11 | Playwright + E2E critiques (santé, inscription, anti-bruteforce, zones protégées ; parcours examen complet → recette staging §12), docs 01→14 complètes, deploy-vps.sh, checklist go-live. |

## Tests
- **Unitaires (node:test)** : `tests/unit/` — correction (tous formats, crédit partiel, malformés), scoring (Goethe modulaire 60 %, TELC oral séparé, ECL 60 %/min 40 %, arrondis half-up), SM-2 (reset, plancher EF 1,3), anti-copie, expiration de compte, magic-bytes, chunking, métriques Sprechen, normalisation feedback IA, deadlines examen (+5 s).
- **E2E (Playwright)** : `tests/e2e/critical.spec.ts` (+ parcours examen complet en recette staging, banque requise).

## Vérification qualité (ADR-001)
```bash
npm run typecheck && npm run lint && npm test   # portes de qualité
npm run test:e2e                                # db+redis+seed requis
```
La CI rejoue l'ensemble sur chaque PR. Tag de livraison : `git tag v1.0.0 && git push --tags` après recette (13-GO-LIVE.md).

## Reste à faire avant production (hors périmètre code)
1. Exécuter 12-RECETTE.md en staging avec une vraie AI_API_KEY.
2. Re-vérifier les 22 blueprints contre les sites officiels (02-EXAM-BLUEPRINTS.md).
3. Alimenter la banque (bibliothèque RAG, générations validées, consignes Schreiben/Sprechen) et assembler ≥ 1 examen blanc par cible.
4. Écrans admin de confort (banque de contenu, stats, modération) — l'API est complète, les écrans users/proofs/promo existent.
