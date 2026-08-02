# Revue de mise en production — GermanPass (daf-saas)
_Date : 2026-06-14_

---

## 🔧 Correctifs appliqués dans cette revue

### [MAJEUR] Sécurité — Timeout absent sur tous les appels IA
**Fichier :** `src/lib/ai.ts`  
**Problème :** Les fetch vers OpenAI (chat, embed, TTS, STT) n'avaient aucun timeout. Un LLM lent ou une panne réseau pouvait bloquer les routes HTTP de Next.js indéfiniment (serverless → timeout plateforme inconnu, risque de 503 silencieux).  
**Correctif :** `AbortSignal.timeout(60_000)` sur chat/embed, `AbortSignal.timeout(120_000)` sur TTS/STT.

---

### [MAJEUR] Sécurité — Content-Security-Policy absent
**Fichier :** `next.config.ts`  
**Problème :** Les headers de sécurité (X-Frame-Options, HSTS…) étaient présents mais le CSP manquait — rempart principal contre les XSS.  
**Correctif :** CSP ajouté : `default-src 'self'`, connect-src vers OpenAI, media-src pour les audios, `frame-ancestors 'none'`.  
**Note :** La directive `script-src 'unsafe-inline'` est nécessaire pour Next.js. Si tu migres vers une stratégie nonce (Next.js middleware), tu pourras la retirer.

---

### [MAJEUR] Sécurité — Pas de rate limit sur POST /api/auth/reset-password
**Fichier :** `src/app/api/auth/reset-password/route.ts`  
**Problème :** La route de reset de mot de passe n'avait aucun rate limit. Malgré l'entropie suffisante des tokens (128 bits), c'est une bonne pratique défensive manquante.  
**Correctif :** Rate limit 10 req / 10 min par IP ajouté.

---

### [MAJEUR] Sécurité — Validation DOCX/TXT par extension de fichier (pas par magic bytes)
**Fichiers :** `src/lib/storage.ts`, `src/app/api/admin/documents/route.ts`  
**Problème :** Pour DOCX et TXT, la validation reposait sur `file.name.endsWith(...)` (contrôlé par le client). Un fichier binaire renommé en `.docx` passait le filtre et était envoyé à mammoth.  
**Correctif :** `detectMime()` étendu avec la signature PK (`0x50 0x4b 0x03 0x04`) pour DOCX et vérification d'absence de bytes null pour TXT. La route admin valide maintenant par magic bytes en premier, et confirme l'extension en second (double vérification).

---

### [MAJEUR] Conformité RGPD/CAN-SPAM — Page `/unsubscribe` inexistante
**Fichiers :** `src/lib/mail.ts` (tous les templates), `src/app/(public)/unsubscribe/page.tsx` (créé)  
**Problème :** Tous les templates email référençaient `${APP_URL}/unsubscribe` mais cette page n'existait pas → 404 pour les utilisateurs. Obligation légale en droit français/européen.  
**Correctif :** Page créée avec redirection vers `/account` pour gestion des préférences.

---

### [MINEUR] Synchronisation des types Job queue.ts ↔ worker/index.ts
**Fichier :** `src/lib/queue.ts`  
**Problème :** `QueueJob` dans `queue.ts` manquait le type `remind_expiring` présent dans le worker. Impossible d'appeler `enqueue({ type: "remind_expiring" })` sans erreur TypeScript.  
**Correctif :** Type `remind_expiring` ajouté.

---

### [MINEUR] Fuite de message d'erreur interne (admin/lessons/generate)
**Fichier :** `src/app/api/admin/lessons/generate/route.ts`  
**Problème :** En cas d'erreur IA, `e.message` était retourné brut au client (pouvait exposer URL interne, credentials partiel…).  
**Correctif :** Message générique retourné au client ; erreur loggée côté serveur.

---

### [MINEUR] Index manquant sur LessonProgress(userId, status)
**Fichier :** `prisma/schema.prisma`  
**Problème :** `findMany({ where: { userId } })` sur `lesson_progress` sans index → scan de table pour chaque utilisateur.  
**Correctif :** `@@index([userId, status])` ajouté. Requiert `prisma migrate deploy`.

---

### [MINEUR] Seed production : mot de passe admin par défaut dangereux
**Fichier :** `prisma/seed.ts`  
**Problème :** Si `SEED_ADMIN_PASSWORD` n'était pas défini en prod, le seed créait `admin@germanpass.local` / `Admin1234!` en silence.  
**Correctif :** Le seed plante explicitement en `NODE_ENV=production` si `SEED_ADMIN_PASSWORD` est absent.

---

### [MINEUR] Warning SMTP_PASSWORD manquant dans env.ts
**Fichier :** `src/lib/env.ts`  
**Problème :** Si `SMTP_HOST` + `SMTP_USER` étaient définis mais `SMTP_PASSWORD` absent, aucun avertissement n'était émis.  
**Correctif :** Warning ajouté au démarrage.

---

### [MINEUR] Page 404 personnalisée manquante
**Fichier :** `src/app/not-found.tsx` (créé)  
**Problème :** Next.js affichait sa page 404 générique.  
**Correctif :** Page cohérente avec le design créée.

---

## ⚠️ Actions manuelles requises avant déploiement

### 1. Migration BDD (index LessonProgress)
```bash
npx prisma migrate dev --name add_lesson_progress_index
npx prisma migrate deploy  # en production
```

### 2. Définir les variables d'environnement de production
Dans ton `.env` de production, s'assurer que les variables suivantes sont définies :
```env
NODE_ENV=production
AUTH_SECRET=<openssl rand -base64 32>
AI_API_KEY=sk-...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASSWORD=...
APP_URL=https://votredomaine.com
SEED_ADMIN_EMAIL=admin@votredomaine.com
SEED_ADMIN_PASSWORD=<mot_de_passe_fort>
```

### 3. Lancer le seed avec les bonnes variables
```bash
SEED_ADMIN_EMAIL=admin@votredomaine.com \
SEED_ADMIN_PASSWORD='...' \
npx tsx prisma/seed.ts
```

### 4. Worker — configurer en tant que service systemd
Le worker (`npm run worker`) doit tourner en permanence. Exemple systemd :
```ini
[Unit]
Description=GermanPass Worker
After=network.target

[Service]
WorkingDirectory=/var/app/germanpass
ExecStart=/usr/bin/node -e "require('./src/worker/index.ts')"
# Ou avec tsx :
ExecStart=/usr/bin/npx tsx src/worker/index.ts
Restart=always
EnvironmentFile=/var/app/germanpass/.env

[Install]
WantedBy=multi-user.target
```

### 5. CSP — ajuster si tu utilises un autre fournisseur IA
Si `AI_BASE_URL` est différent de `https://api.openai.com`, ajouter son origine dans `connect-src` dans `next.config.ts`.

### 6. `/api/health` — protéger en production
La route health expose l'état de la DB et Redis sans auth. Options :
- Restreindre par IP dans Nginx (recommandé)
- Ajouter un secret header (`X-Health-Token`)
- Acceptable si le load balancer seul peut y accéder

### 7. Invalidation de session après changement de mot de passe
La stratégie JWT (TTL 7 jours) ne révoque pas les sessions existantes après un reset de mot de passe. Si c'est un risque inacceptable, implémenter une liste noire Redis des sessions ou ajouter `passwordChangedAt` dans le JWT et le vérifier dans `requireUser()`.

### 8. Emails marketing — consentement explicite
Les emails J+2 et J+5 sont envoyés à tous les inscrits. Vérifier la conformité RGPD de cette pratique avec votre DPO si vous êtes établi en UE. La page `/unsubscribe` existe désormais mais la désinscription n'est pas encore automatisée.

---

## ✅ Ce qui est prêt pour la production

- **Authentification** : guards `requireStudent()` / `requireAdmin()` sur toutes les routes API (51/51). Revalidation en base à chaque requête sensible (révocation des comptes suspendus malgré JWT). Anti-brute-force login via Redis. Google OAuth correctement câblé.
- **Sécurité des fichiers** : détection MIME par magic bytes pour images, PDF, audio, DOCX (corrigé), TXT (corrigé). Chemin hors webroot, anti-traversée (`path.resolve` + `startsWith`). Contrôle d'accès propriétaire/admin sur chaque catégorie.
- **Validation des inputs** : Zod partout (routes API, worker jobs, blueprints, scoring). Pas d'injection SQL possible (Prisma ORM + paramètres préparés).
- **Rate limiting** : inscriptions (5/h), uploads preuves (5/h), écriture/oral (10/h), génération admin (20/h), forgot-password (3/10min), reset-password (10/10min, corrigé), login (5 essais + verrou 15min).
- **Headers sécurité** : X-Frame-Options DENY, HSTS 2 ans, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP (corrigé).
- **Base de données** : schéma cohérent, cascades correctes, index sur les colonnes filtrées fréquemment (userId, status, createdAt, level). Index LessonProgress ajouté (corrigé, migration requise).
- **Fonctionnalités métier** : flux inscription→trial 24h→paiement→activation opérationnel. Déblocage progressif des niveaux (SM-2 SRS, seuil 70%/5 sessions). Évaluation IA Schreiben synchrone + Sprechen asynchrone (pipeline STT→métriques→IA). Examens blancs avec deadlines serveur et tolérance +5s. Scoring multi-provider (Goethe modulaire, TELC séparé oral/écrit, ECL moyenne+plancher, ÖSD standard).
- **Emails** : bienvenue + trial, activation, refus preuve, rappel J-3, expiration, déblocage niveau, séquence marketing J+2/J+5 avec déduplication Redis et skip si abonnement payant.
- **Worker** : queue Redis BRPOP, crons intégrés (expiration toutes les heures, rappels J-3 quotidiens, emails marketing toutes les heures).
- **RGPD** : soft-delete + anonymisation immédiate, export JSON des données personnelles, consentement audio requis pour Sprechen, audit log complet.
- **Config Next.js** : `output: standalone`, `poweredByHeader: false`, PWA (serwist), env validé par Zod au démarrage.
- **Gestion d'erreurs** : `error.tsx` + `global-error.tsx` couvrent toutes les pages. `not-found.tsx` créé. Erreurs IA typées (`AiBudgetExceededError`). Timeouts IA ajoutés (corrigé).
