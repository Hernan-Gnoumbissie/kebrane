# 09 — Sauvegardes

## Quotidien (cron 3h00) — `scripts/backup.sh`
- `pg_dump --format=custom` → gzip → chiffrement AES-256-CBC (PBKDF2, clé `BACKUP_ENCRYPTION_KEY`).
- Archive du stockage fichiers (`storage/` : preuves, audios, documents) chiffrée de même.
- Rétention `BACKUP_RETENTION_DAYS` (30 j par défaut), purge automatique.
- Recommandé : rsync du dossier `BACKUP_DIR` vers un stockage distant UE (hors VPS).

## Restauration — `scripts/restore.sh <fichier.dump.gz.enc>`
Déchiffre → `pg_restore --clean --if-exists` dans le conteneur db. Stockage : `openssl enc -d ... | tar xzf - -C /opt/germanpass`.

## Procédure de test trimestrielle (obligatoire)
1. Provisionner une base jetable : `docker run -d --name daf-test pgvector/pgvector:pg16 ...`
2. Restaurer la dernière sauvegarde dessus ; vérifier `SELECT count(*) FROM users;` et quelques attempts récents.
3. Consigner le résultat (date, fichier testé, durée) dans le journal d'exploitation.

RPO : 24 h. RTO cible : < 1 h (restore + redémarrage compose).
