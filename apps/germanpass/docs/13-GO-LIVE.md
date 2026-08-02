# 13 — Checklist Go-Live

## Avant
- [ ] 12-RECETTE.md exécutée à 100 % en staging
- [ ] Blueprints re-vérifiés contre les sites officiels (02-EXAM-BLUEPRINTS.md), `sourcesNote` à jour
- [ ] `.env` prod : AUTH_SECRET fort, mot de passe admin changé, SEED_ADMIN_PASSWORD retiré, SMTP testé, BACKUP_ENCRYPTION_KEY stockée hors VPS
- [ ] Hébergement UE confirmé (VPS + fournisseur IA si possible)
- [ ] TLS A+ (ssllabs), headers vérifiés (securityheaders.com)
- [ ] Sauvegarde + restauration testées (09-BACKUP.md)
- [ ] Banque de contenu minimale : ≥ 1 examen blanc publié par provider×niveau cible, curriculum A1-B1 publié
- [ ] Pages légales relues (14-LEGAL.md), contact DPO renseigné
- [ ] Secrets GitHub CD configurés, déploiement test depuis main réussi

## Jour J
- [ ] Tag `git tag v1.0.0 && git push --tags`
- [ ] Déploiement, `/api/health` healthy, parcours inscription→activation→exercice en prod
- [ ] Monitoring : cron backup actif, logs Nginx/app sans erreurs répétées

## Après (J+7)
- [ ] Revue `ai_usage` (coûts réels vs plafonds), ajuster `AI_MONTHLY_BUDGET_USER_USD`
- [ ] Revue file FLAGGED (modération Sprechen) et taux de réussite par section (stats admin)
- [ ] Première restauration de sauvegarde de prod sur base jetable
