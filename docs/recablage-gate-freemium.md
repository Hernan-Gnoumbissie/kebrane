# Recâblage — Essai 24 h → Freemium permanent (spec)

> Statut : **spec prête à implémenter**. Décisions figées le 2026-09-06.
> À lire avec `docs/positionnement-free-premium.md` (la matrice = source de vérité).
> **Ne pas publier le marketing freemium avant que ce recâblage soit fait.**

## 0. Découverte clé — le freemium est déjà dans Core

`packages/core/src/entitlements.ts` (`forProduct`) implémente déjà le modèle :
- compte sans accès payant → **tier gratuit** : `FREE_CAPABILITIES` +
  `FREE_AI_CORRECTIONS = 1` — un COMPTE de corrections, pas une enveloppe en
  argent (voir §5) ; `FREE_AI_BUDGET_MICRO_USD` n'en est que la traduction pour
  l'affichage ;
- correction offerte **à vie** : compteur `freeAiCorrectionsUsed`, que ni une
  expiration ni un achat ne réarment ;
- premium expiré → **retour automatique au gratuit** (`isPaidNow` → false), jamais bloqué ;
- à l'achat, `billing.ts` remet `aiUsedMicroUsd: 0` → l'enveloppe premium est
  **pleine et propre** (la correction offerte « disparaît », pas de 1+32=33).

→ Le recâblage n'est PAS de reconstruire le free/paid, mais de **faire confiance
à Core** au lieu du gate d'essai 24 h local de GermanPass, + corriger 2 invariants
avant d'activer l'enforcement.

## 1. Décisions figées (source de vérité)

| Décision | Choix | État dans le code |
|---|---|---|
| Gratuit | ♾️ Permanent | Core OK ; gate local GermanPass à recâbler |
| Correction IA gratuite | **1 à vie** | ✅ `freeAiCorrectionsUsed` (compteur, pas une somme) |
| Sur quoi porte l'offerte | **Écrit uniquement** | ✅ `FREE_AI_CORRECTION_CAPABILITY` |
| Correction gratuite récurrente | ❌ Non | ✅ consommée par l'usage OU par l'achat |
| Libellé UI | « 🎁 1 correction IA offerte » (pas « quota gratuit ») | à ajuster (`AiQuota`) |
| Premium | Corrections IA selon budget | ✅ |
| Budget premium | Lié au pass (7/30/90/365 = durée + volume) | ✅ |
| Expiration premium | Retour auto au FREE | ✅ Core ; ❌ gate local (met EXPIRED) — à recâbler |
| `accessUntil` | Gouverne uniquement le premium | à recâbler (aujourd'hui gouverne tout) |
| Droit premium | Porté par les **entitlements**, pas le seul `plan` | ✅ Core (`forProduct`) |
| `AI_BUDGET_ENFORCE` | ✅ ON — **après** correction de A et C | flag = 0 aujourd'hui |
| Échec/So­rtie IA inexploitable | Ne doit pas brûler le budget | ⚠️ trou (voir §2.C) |
| Ancien compte expiré | Réactivé en FREE | migration à faire |
| Cours / Examens / Lesen / Hören / Diagnostic de base / SRS | FREE | Core OK ; gate local à ouvrir |
| Diagnostic avancé (issu des feedbacks IA) | PREMIUM | ✅ (`recommendations.ts`, gate FULL) |
| Reverse trial (découverte ponctuelle du premium) | Parqué — plus tard | — |
| Top-up de corrections | Parqué — après analyse des coûts | — |

## 2. Invariants à tenir AVANT `AI_BUDGET_ENFORCE=ON`

**B — réservé avant l'appel : ✅.** `chatCompletion` → `checkBudget` →
`reserveKebraneAi` → Core `reserveAi` (persiste `settleAi(+estimé)`) **avant** le
`fetch` ; régularisation au coût réel après (`logUsage` → `settleAi(actual−estimé)`).

**C — un échec ne brûle pas le quota : ⚠️ partiel.**
- Échec à 0 token (timeout, réseau, `!res.ok`) → `logUsage(success:false, 0)` →
  `settle(−estimé)` → **remboursé**. ✅
- **Trou** : réponse **facturée mais inexploitable** (contenu vide ; ou JSON
  invalide rejeté par Zod dans `evaluateWriting` APRÈS un `chatCompletion` réussi
  déjà settle) → budget consommé sans correction rendue.
- **Fix** : sur sortie inexploitable, rembourser la réserve (settle négatif) —
  ou ne décompter qu'après validation Zod réussie.

**A — débit atomique : ❌ non tenu.**
- `reserveAi` = `forProduct` (SELECT restant) → check → `settleAi` (UPDATE
  increment), en **deux requêtes non transactionnelles**. Deux corrections
  simultanées avec 1 enveloppe restante passent toutes deux → double-consommation
  (ex. 2 corrections « offertes » au lieu d'1). Le rate-limit (10/h) borne
  l'abus mais ne tient pas l'invariant.
- **Fix (dans `@kebrane/core`)** : `updateMany` conditionnel
  (`WHERE aiUsedMicroUsd + estimé <= budget`) qui renvoie le count (0 = refus),
  ou transaction sérialisable / `SELECT … FOR UPDATE`.

**Décision : ON après correction de A (atomicité Core) et du trou de C (remboursement sur sortie inexploitable).**

## 3. Le recâblage (côté GermanPass)

1. `app/api/auth/register/route.ts` : supprimer le trial 24 h. Créer un compte
   **gratuit permanent** (`status ACTIVE`, `accessUntil null`). Remplacer
   `welcomeWithTrial` (compte à rebours) par un vrai « bienvenue ». Reformuler la
   séquence marketing J+2/J+5 (« passe au premium », pas « ton essai expire »).
2. `lib/active-gate.ts` : scinder. `requireActivePage` (surfaces 🟢) autorise
   tout compte `ACTIVE` non supprimé/suspendu (gratuit inclus) et **ne teste plus
   `accessUntil`**. Le mur premium se déplace au **point d'action IA** (soumission
   Schreiben/Sprechen), délégué à Core (`reserveAi`).
3. `lib/guards.ts` : le garde `plan !== "FULL"` des routes `learn` doit accepter
   le gratuit (les cours sont FREE).
4. `lib/account.ts` `expireStaleAccounts` : à l'expiration premium, **retomber en
   gratuit** (`plan FREE`/`accessUntil null`, `status` reste `ACTIVE`) — ne plus
   mettre `EXPIRED`.
5. Flags : `KEBRANE_ACCESS_ENFORCE=1` et `KEBRANE_AI_BUDGET_ENFORCE=1`
   (après §2.A et §2.C).
6. `components/ai-quota.tsx` : corriger « rechargées à votre prochain
   renouvellement » (faux : pass à durée fixe) ; libellé « 🎁 1 correction IA offerte ».
7. Migration : comptes déjà `EXPIRED` (essais 24 h grillés) → réactiver en FREE.

## 4. Plan de test

- Gratuit : atteint dashboard/entraînements/examens/**cours**/SRS indéfiniment ;
  1 correction IA puis paywall à la 2ᵉ ; jamais redirigé hors des surfaces gratuites.
- Payant : premium complet dans la fenêtre ; à l'expiration → retombe en gratuit
  (pas verrouillé).
- Concurrence (invariant A) : 2 soumissions simultanées avec 1 enveloppe → une
  seule passe.
- Échec/sortie inexploitable (invariant C) : budget intact.
- Migration : un ancien compte expiré retrouve l'accès gratuit.
- Libellés : plus aucun « ton essai expire » ni « renouvellement ».

## 5. L'offerte est un COMPTE, pas une enveloppe (2026-09-07)

Le gratuit était exprimé dans la même unité que le premium — des micro-dollars —
alors que les deux promesses n'ont pas la même nature. Deux défauts en
découlaient, tous deux invisibles tant qu'on ne touchait pas aux estimations.

**a. « Une correction » dépendait d'une division.** Le droit se décidait en
comparant le coût *estimé* d'un appel (`writing_eval` : 25 000 µ$ côté
GermanPass) à l'enveloppe offerte (30 000 µ$). Le rapport donnait « une »
correction par accident. Réviser l'estimation à la hausse — ce que
`ai:cost` finira par imposer — l'aurait fait tomber à **zéro** ; à la baisse,
elle en aurait offert **deux**. La promesse publique, elle, dit « une ».

**b. L'offerte revenait après un abonnement.** `billing.confirm` remet
`aiUsedMicroUsd` à zéro pour donner une enveloppe premium propre. À l'expiration,
le palier gratuit relisait ce même compteur, le trouvait vierge, et rendait une
correction « offerte » — une de plus à chaque abonnement échu.

**Correction.** Deux compteurs pour deux promesses :

| | Premium | Gratuit |
|---|---|---|
| Unité | enveloppe `aiUsedMicroUsd` (µ$) | compteur `freeAiCorrectionsUsed` |
| Réarmé par | chaque achat | **rien** |
| Décidé par | le coût estimé | `FREE_AI_CORRECTIONS` |

L'offerte est consommée par son usage **ou par un achat** (qui achète a
découvert), et elle porte sur l'**écrit** seul — `FREE_AI_CORRECTION_CAPABILITY`.
Cette dernière règle existait déjà, mais par accident : 60 000 µ$ d'appel oral ne
tenaient pas dans 30 000 µ$ d'enveloppe. Une enveloppe mieux dotée l'aurait
silencieusement renversée ; elle est désormais écrite.

Conséquence sur l'invariant C : annuler une réservation n'est plus un delta
négatif mais `entitlements.refundAi()`. `settleAi()` ne sait pas distinguer
« rien rendu » de « moins cher que prévu » — les deux produisent le même delta —
et rendrait donc des corrections déjà servies.

Migration : `20260906230320_kb13b_corrections_offertes_compteur` — une colonne
ajoutée avec valeur par défaut, sans réécriture de données. Les comptes
existants démarrent à `freeAiCorrectionsUsed = 0` ; ceux qui avaient déjà
consommé leur offerte en micro-dollars la retrouvent **une fois**. Volume connu
et sans risque : le drapeau n'ayant jamais été actif en production, aucun refus
n'a encore été prononcé sur cette base.

## Sources (code audité)
`packages/core/src/entitlements.ts` · `packages/core/src/billing.ts` ·
`packages/core/src/capabilities.ts` · `apps/germanpass/src/lib/ai.ts` ·
`apps/germanpass/src/lib/kebrane.ts` · `apps/germanpass/src/app/api/writing/submissions/route.ts` ·
`apps/germanpass/src/lib/active-gate.ts` · `apps/germanpass/src/lib/account.ts` ·
`apps/germanpass/src/app/api/auth/register/route.ts` · `apps/germanpass/src/components/ai-quota.tsx`

---

## ÉTAT D'IMPLÉMENTATION (2026-09-06)

### ✅ Fait dans le code (typechecké : core + germanpass `tsc --noEmit` = 0)

**Invariant A — débit IA atomique** · `packages/core/src/entitlements.ts`
`reserveAi` : UPDATE conditionnel (`updateMany WHERE aiUsedMicroUsd <= budget − estimé`)
après upsert de la ligne. `count === 0` = refus (course perdue). Test de
concurrence ajouté (`tests/entitlements.test.ts` : 5 demandes simultanées → 1 seule passe).

**Invariant C — un échec ne brûle pas le budget** · `apps/germanpass/src/lib/ai.ts`
Sur échec (réseau, timeout, réponse vide, JSON invalide, schéma invalide) →
remboursement intégral de la réserve (`settle` net = 0) ; le coût réel reste tracé
dans `ai_usage`. Garde `JSON.parse` + hook `validate` en `jsonMode`.
`writing-eval.ts` passe son schéma Zod en `validate` (mauvaise forme = remboursée).

**Recâblage gate**
- `register/route.ts` : accès **gratuit permanent** (`accessUntil: null`), e-mail `welcomeFree`.
- `lib/kebrane.ts` `toKebraneAccessStatus` : `ACTIVE` sans échéance future → `NONE`
  (gratuit ≠ payant côté Core). Test mis à jour (8/8).
- `lib/account.ts` `expireOverdueAccounts` : premium échu → **retour au gratuit**
  (`status ACTIVE`, `accessUntil null`), e-mail `premiumEnded`. Plus de `EXPIRED`.
- `lib/mail.ts` : `welcomeFree`, `premiumEnded`, `accessExpiringSoon` (premium, pas « accès »).
- `components/ai-quota.tsx` : libellés freemium (plus de « renouvellement » ; « 🎁 Correction offerte »).

### ⛔ NON fait — à exécuter par toi (hors sandbox : DB non joignable d'ici)

1. **Test en DEV d'abord** (obligatoire — non exécutable ici) :
   - `pnpm --filter @kebrane/core test` → le test de concurrence doit passer.
   - Inscription → accès permanent aux surfaces gratuites ; **exactement 1** correction IA puis paywall.
   - Achat → premium plein ; à l'échéance (cron) → retour au gratuit (pas bloqué).
2. **Flag** (après le test dev) : `KEBRANE_AI_BUDGET_ENFORCE=1`.
   Laisser `KEBRANE_ACCESS_ENFORCE=0` (l'accès aux pages reste gouverné localement
   par `status ACTIVE` ; seule l'enveloppe IA est gouvernée par Core).
   ⚠ Sans ce flag, un compte gratuit aurait des corrections IA **illimitées**.
3. **Migration** des comptes déjà bloqués (essais 24 h grillés) → gratuit.
   Méthode canonique (validée contre la vraie base) — le script Prisma, sûr et idempotent :
   ```bash
   pnpm --filter @kebrane/germanpass exec tsx scripts/migrate-trial-to-free.ts          # dry-run
   pnpm --filter @kebrane/germanpass exec tsx scripts/migrate-trial-to-free.ts --apply  # appliquer
   ```
   Équivalent SQL (la table est mappée `users`, PAS `"User"`) si besoin en direct :
   ```sql
   UPDATE "users" SET status = 'ACTIVE', "accessUntil" = NULL
   WHERE status = 'EXPIRED' AND role = 'STUDENT';
   ```

### Reste ouvert (hors recâblage)
- Sprechen : adopter `validate` si son évaluation passe par `chatCompletion` + schéma.
- Top-up de corrections : parqué (analyse des coûts d'abord).
- `correction offerte` : 1 à vie — **fait** par compteur dédié (§5), et non plus
  par le rapport entre une enveloppe et une estimation de coût.
