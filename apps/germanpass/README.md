# GermanPass

Plateforme SaaS d'apprentissage de l'allemand et de simulation d'examens **Goethe-Zertifikat, ÖSD, TELC et ECL**, niveaux **A1 → C2**, couvrant les 4 épreuves : **Lesen, Hören, Schreiben, Sprechen**.

> ⚠️ **Disclaimer** : Plattform nicht mit Goethe-Institut, ÖSD, telc gGmbH oder ECL verbunden. Cette plateforme n'est affiliée à aucun organisme certificateur. Tout le contenu d'entraînement est original. Seules les structures pédagogiques publiques des examens sont respectées.

## Stack

Next.js 15 (App Router) · TypeScript strict · TailwindCSS + shadcn/ui · Prisma + PostgreSQL 16 (pgvector, pg_trgm, citext, pgcrypto) · NextAuth v5 · Redis (ioredis) · IA OpenAI-compatible (texte, TTS, STT) · Serwist (PWA) · Docker + Nginx · GitHub Actions.

## Démarrage rapide (développement)

```bash
# 1. Prérequis : Node 20+, Docker
cp .env.example .env          # remplir AUTH_SECRET, AI_API_KEY...
docker compose up -d          # PostgreSQL (pgvector) + Redis
npm install
npx prisma migrate dev        # migrations + génération client
npm run db:seed               # admin + 18 blueprints d'examens
npm run dev                   # http://localhost:3000
npm run worker                # worker asynchrone (autre terminal)
```

Ou utiliser le script tout-en-un : `bash scripts/bootstrap.sh`

Compte admin seedé : `admin@germanpass.local` / mot de passe défini par `SEED_ADMIN_PASSWORD` (défaut : `Admin1234!` — à changer immédiatement).

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `start` | Build et serveur de production |
| `npm run lint` / `typecheck` | Qualité |
| `npm test` | Tests unitaires (node:test via tsx) |
| `npm run test:integration` | Tests d'intégration (base de test requise) |
| `npm run test:e2e` | E2E Playwright |
| `npm run db:migrate` / `db:seed` / `db:studio` | Base de données |
| `npm run worker` | Worker asynchrone (RAG, TTS, Sprechen, cron) |

## Documentation

Voir `docs/` : architecture, blueprints d'examens, base de données, RAG, API, déploiement VPS, sécurité, sauvegardes, recette, go-live, conformité légale, décisions (ADR) et avancement.

## Licence

Propriétaire — tous droits réservés.
