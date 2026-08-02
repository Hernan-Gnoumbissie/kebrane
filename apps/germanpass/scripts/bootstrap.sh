#!/usr/bin/env bash
# Bootstrap complet de l'environnement de développement daf-saas.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/6 Vérification des prérequis"
command -v node >/dev/null || { echo "Node.js 20+ requis"; exit 1; }
command -v docker >/dev/null || { echo "Docker requis"; exit 1; }

echo "==> 2/6 Fichier .env"
[ -f .env ] || { cp .env.example .env; echo "  .env créé — PENSEZ À REMPLIR AUTH_SECRET et AI_API_KEY"; }

echo "==> 3/6 Git"
[ -d .git ] || { git init -b main; git add -A; git commit -m "feat: scaffold daf-saas (phase 0)"; }

echo "==> 4/6 Services Docker (db + redis)"
docker compose up -d db redis
echo "  Attente de PostgreSQL..."
until docker compose exec -T db pg_isready -U daf -d daf_saas >/dev/null 2>&1; do sleep 1; done

echo "==> 5/6 Dépendances + migrations + seed"
npm install
npx prisma migrate dev --name init
npm run db:seed

echo "==> 6/6 Terminé"
echo "Lancer : npm run dev  (+ npm run worker dans un autre terminal)"
