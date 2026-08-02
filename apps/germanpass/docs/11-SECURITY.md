# 11 — Sécurité (OWASP Top 10)

| Risque | Mesure |
|---|---|
| A01 Broken Access Control | Guards serveur revalidés en BDD (`requireStudent/Admin`, ADR-004) ; fichiers servis par route authentifiée avec contrôle propriétaire/catégorie + anti path-traversal ; middleware redirige les zones protégées. |
| A02 Cryptographic Failures | bcrypt (12 rounds), TLS 1.2+, HSTS preload, sauvegardes AES-256, secrets uniquement en env vars, cookies httpOnly/secure/sameSite (NextAuth). |
| A03 Injection | Zod sur 100 % des entrées ; Prisma paramétré + `Prisma.sql` pour le SQL brut (jamais de concaténation). |
| A04 Insecure Design | correction/chronos/écoutes côté serveur ; aucune clé de réponse au client avant soumission ; validation humaine du contenu généré. |
| A05 Security Misconfiguration | headers Next + Nginx (CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) ; `poweredByHeader: false` ; conteneurs non-root. |
| A06 Vulnerable Components | versions épinglées, CI sur chaque PR ; `npm audit` recommandé en cron CI. |
| A07 Auth Failures | anti-bruteforce 5 essais/verrou 15 min (Redis, email+IP) ; réponses d'inscription non révélatrices ; rate-limit Nginx 5 r/min sur auth. |
| A08 Integrity Failures | uploads validés par magic-bytes (jamais le Content-Type client), taille plafonnée (10/20/50 Mo), stockage hors webroot, noms aléatoires UUID. |
| A09 Logging Failures | `audit_logs` sur toute action admin, transitions de statut, consentements, signalements ; IP loggée sur auth/upload. |
| A10 SSRF | aucune URL fournie par l'utilisateur n'est fetchée ; seuls `AI_BASE_URL`/SMTP (env) sortent. |

Rate-limits applicatifs (Redis, fenêtre fixe) : register 5/h/IP, preuves 5/h, promo 10/h, writing/speaking 10/h, générations admin 20/h — en plus des zones Nginx.

Plafond IA : coupure douce par utilisateur/mois (`checkBudget`, `AI_MONTHLY_BUDGET_USER_USD` ou `users.aiBudgetUsd`).
