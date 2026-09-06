# Checklist — Test DEV du recâblage freemium

> À dérouler en local AVANT tout déploiement. Rien n'est allumé en prod tant que
> ces étapes ne sont pas vertes. Voir aussi `docs/recablage-gate-freemium.md`.

## 0. Prérequis
- Base germanpass + Core joignables ; `KEBRANE_DATABASE_URL` défini.
- Registre produits/plans semé (`pnpm --filter @kebrane/core seed`).
- Deux terminaux : app en dev + un pour les scripts.

## 1. Tests unitaires (avant de lancer l'app)
- [ ] `pnpm --filter @kebrane/core test` → **vert**, dont « débit ATOMIQUE… » (invariant A).
- [ ] `pnpm --filter @kebrane/germanpass exec tsx --test tests/unit/kebrane-bridge.test.ts` → 8/8.
  (`pnpm --filter @kebrane/germanpass test` lance tout ; certains tests exigent la DB.)

## 2. Activer l'enforcement IA (dev)
- [ ] `.env` : `KEBRANE_AI_BUDGET_ENFORCE=1` ; garder `KEBRANE_ACCESS_ENFORCE=0`.
- [ ] Redémarrer l'app.

## 3. Gratuit PERMANENT
- [ ] S'inscrire → e-mail **welcomeFree** (aucun compte à rebours 24 h).
- [ ] Accès immédiat : dashboard, /practice/lesen, /practice/hoeren, /exams, /learn (cours), flashcards.
- [ ] L'accès **ne se coupe pas** après 24 h (le compte a `accessUntil = null`).

## 4. 1 correction offerte → paywall
- [ ] Gratuit : soumettre un Schreiben → **1** correction IA rendue.
- [ ] Soumettre un **2e** → refus « corrections épuisées » ; cours/examens restent ouverts.
- [ ] `AiQuota` affiche « 🎁 Correction offerte » (plus de « renouvellement »).

## 5. Invariant C — un échec ne brûle pas le quota
- [ ] Sur un compte neuf, forcer un échec IA (clé/URL AI invalide) : la soumission
      échoue MAIS la correction offerte **reste disponible** (réessai IA rétablie → passe).

## 6. Achat premium
- [ ] Acheter une offre (sandbox PayDunya) → budget premium **plein** (ex. ~32), pas « 1 offerte + 32 ».
- [ ] Consommer quelques corrections → le compteur décroît.

## 7. Expiration → retour au gratuit
- [ ] Mettre `accessUntil` dans le passé, puis déclencher `expireOverdueAccounts`
      (route cron / worker qui l'appelle).
- [ ] Vérifier : compte reste **ACTIVE**, `accessUntil = null`, e-mail **premiumEnded**.
- [ ] Accès gratuit conservé (cours/examens) ; premium coupé.

## 8. Migration des comptes déjà grillés (essais 24 h)
- [ ] Dry-run : `pnpm --filter @kebrane/germanpass exec tsx scripts/migrate-trial-to-free.ts`
      → compte les EXPIRED, ne modifie rien.
- [ ] Appliquer : `… scripts/migrate-trial-to-free.ts --apply` → repassent ACTIVE + `accessUntil=null`.
- [ ] Relancer le dry-run → **0** (idempotent).

## 9. Go / No-Go prod
- [ ] Tout vert → déploiement avec `KEBRANE_AI_BUDGET_ENFORCE=1`, puis migration `--apply` en prod.
- [ ] Alors seulement : publier les nouveaux textes (`docs/textes-site-v1.md`).
- **Rollback** : repasser `KEBRANE_AI_BUDGET_ENFORCE=0` (les corrections redeviennent
  non bloquantes) ; l'accès aux pages reste inchangé (gouverné localement).
