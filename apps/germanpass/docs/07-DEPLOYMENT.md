# 07 — Déploiement VPS (Ubuntu 22.04)

## Provisioning automatisé
```bash
ssh root@VPS
curl -O https://raw.githubusercontent.com/<org>/germanpass/main/scripts/deploy-vps.sh
bash deploy-vps.sh exemple.fr git@github.com:<org>/germanpass.git
nano /opt/germanpass/.env   # AUTH_SECRET (openssl rand -base64 32), AI_API_KEY, SMTP, BACKUP_ENCRYPTION_KEY
cd /opt/germanpass && docker compose --profile prod up -d
```

## Pas-à-pas manuel
1. **Paquets** : docker, nginx, certbot, ufw (cf. script).
2. **Pare-feu** : `ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`.
3. **Cloner** dans `/opt/germanpass`, copier `.env.example` → `.env`, remplir (hébergement UE requis — RGPD).
4. **Nginx** : `deploy/nginx.conf` (remplacer example.com) + `deploy/daf-proxy.conf` → `certbot --nginx -d domaine`.
5. **Lancer** : `docker compose --profile prod build && up -d` (app, worker, db, redis) puis `exec app npx prisma migrate deploy` et seed.
6. **Sauvegardes** : cron `0 3 * * * /opt/germanpass/scripts/backup.sh` (cf. 09-BACKUP.md).
7. **Vérifier** : `curl https://domaine/api/health` → `{"status":"healthy"}`.

## CI/CD
- CI (`.github/workflows/ci.yml`) : lint + typecheck + migrations + tests sur PR/main, services pgvector+redis.
- CD (`cd.yml`) : push main → SSH (`DEPLOY_SSH_HOST/USER/KEY` + `DEPLOY_HEALTHCHECK_URL` en secrets GitHub, environnement `production`) → `git reset --hard` + rebuild + `migrate deploy` + healthcheck (10 tentatives).

## Mise à jour manuelle
```bash
cd /opt/germanpass && git pull
docker compose --profile prod build && docker compose --profile prod up -d
docker compose --profile prod exec -T app npx prisma migrate deploy
```
Rollback : `git checkout <tag>` puis mêmes commandes (les migrations sont additives ; restauration BDD via 09-BACKUP.md si nécessaire).
