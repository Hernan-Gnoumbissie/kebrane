#!/usr/bin/env bash
# Sauvegarde quotidienne chiffrée de PostgreSQL (cron : 0 3 * * *)
# Rétention : BACKUP_RETENTION_DAYS (défaut 30 j). Restauration : scripts/restore.sh
set -euo pipefail
source /opt/daf-saas/.env 2>/dev/null || true

BACKUP_DIR="${BACKUP_DIR:-/var/backups/daf-saas}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
KEY="${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY requis}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Dump + compression + chiffrement symétrique AES-256
docker compose -f /opt/daf-saas/docker-compose.yml exec -T db \
  pg_dump -U daf -d daf_saas --format=custom \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:$KEY" \
  > "$BACKUP_DIR/daf-$STAMP.dump.gz.enc"

# Sauvegarde du stockage fichiers (preuves, audios)
tar czf - -C /opt/daf-saas storage 2>/dev/null \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:$KEY" \
  > "$BACKUP_DIR/daf-storage-$STAMP.tar.gz.enc" || true

# Rétention
find "$BACKUP_DIR" -name "daf-*.enc" -mtime +"$RETENTION" -delete
echo "Backup OK : $BACKUP_DIR/daf-$STAMP.dump.gz.enc"
