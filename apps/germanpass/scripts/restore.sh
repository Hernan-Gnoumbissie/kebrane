#!/usr/bin/env bash
# Restauration d'une sauvegarde chiffrée. Usage : ./restore.sh <fichier.dump.gz.enc>
set -euo pipefail
source /opt/daf-saas/.env 2>/dev/null || true
KEY="${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY requis}"
FILE="${1:?Usage: restore.sh <fichier.dump.gz.enc>}"

echo "⚠️  Cette opération ÉCRASE la base daf_saas. Ctrl+C pour annuler (5 s)..."
sleep 5

openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$KEY" -in "$FILE" \
  | gunzip \
  | docker compose -f /opt/daf-saas/docker-compose.yml exec -T db \
      pg_restore -U daf -d daf_saas --clean --if-exists

echo "Restauration terminée. Vérifiez /api/health."
