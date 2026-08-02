#!/usr/bin/env bash
# Provisioning initial d'un VPS Ubuntu 22.04 (à exécuter en root une seule fois).
# Détail pas-à-pas : docs/07-DEPLOYMENT.md
set -euo pipefail

DOMAIN="${1:?Usage: deploy-vps.sh <domaine> <repo-git>}"
REPO="${2:?Usage: deploy-vps.sh <domaine> <repo-git>}"

echo "==> Paquets"
apt-get update && apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw openssl

echo "==> Docker"
curl -fsSL https://get.docker.com | sh

echo "==> Pare-feu"
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

echo "==> Utilisateur de déploiement"
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash -G docker deploy

echo "==> Application"
mkdir -p /opt/daf-saas && chown deploy:deploy /opt/daf-saas
sudo -u deploy git clone "$REPO" /opt/daf-saas || true
cd /opt/daf-saas
[ -f .env ] || { cp .env.example .env; echo "⚠️  REMPLIR /opt/daf-saas/.env puis relancer"; }

echo "==> Nginx"
sed "s/example.com/$DOMAIN/g" deploy/nginx.conf > /etc/nginx/sites-available/daf-saas
cp deploy/daf-proxy.conf /etc/nginx/snippets/daf-proxy.conf
ln -sf /etc/nginx/sites-available/daf-saas /etc/nginx/sites-enabled/daf-saas
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || echo "⚠️  certbot à relancer"

echo "==> Services"
docker compose --profile prod build
docker compose --profile prod up -d
docker compose --profile prod exec -T app npx prisma migrate deploy
docker compose --profile prod exec -T app npx tsx prisma/seed.ts || true

echo "==> Cron sauvegardes (3h00)"
chmod +x scripts/backup.sh scripts/restore.sh
(crontab -l 2>/dev/null | grep -v backup.sh; echo "0 3 * * * /opt/daf-saas/scripts/backup.sh >> /var/log/daf-backup.log 2>&1") | crontab -

echo "==> Terminé : https://$DOMAIN (healthcheck: /api/health)"
