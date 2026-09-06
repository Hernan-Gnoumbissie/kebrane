# GermanPass — Positionnement & matrice Gratuit / Premium

> **Source de vérité** du site, de la page Tarifs et des publicités.
> Établie par audit du code (pas de supposition). Toute promesse publique doit
> renvoyer à une ligne 🟢/🔵 ci-dessous. Statut : **verrouillé**.
> Dernière mise à jour : 2026-09-06.

## 1. Modèle retenu

**A — Freemium permanent.** Le gratuit est le moteur d'**acquisition** ;
l'IA personnalisée est le moteur de **monétisation**.

Principe de coût qui justifie la frontière : **le seul coût variable réel est
l'IA** (correction Schreiben/Sprechen, génération audio Hören). Tout ce qui est
gratuit ci-dessous a un coût fixe déjà payé (générer le contenu une fois) puis
quasi nul à l'usage. « Généreux » et « marge protégée » coïncident donc.

### Note technique : FULL / EXAM_PREP est dormant
`plan` vaut `FULL` par défaut ; `EXAM_PREP` n'est **jamais** vendu ni assigné
automatiquement (seul un admin peut le poser via `set_plan`). `activateUser` ne
touche pas `plan`. Donc tout utilisateur self-service (essai comme payant) est
`FULL`. → Pas de 3ᵉ palier public : on collapse à **Gratuit vs Premium**.
`EXAM_PREP` reste un levier admin interne. Le champ `plan` pourra être recyclé
en `FREE` / `PAID` au moment du recâblage (§5).

## 2. Matrice Gratuit / Premium (verrouillée)

| Fonctionnalité | Preuve code | Accès | Raison |
|---|---|---|---|
| Examens blancs chronométrés (par examen) | `exam-runner.ts`, `scoring.ts` | 🟢 Gratuit | Coût fixe payé ; aimant d'acquisition |
| Entraînement Lesen | `practice/lesen`, `correction.ts` | 🟢 Gratuit | Correction déterministe, zéro LLM |
| Entraînement Hören | `practice/hoeren`, audio pré-généré | 🟢 Gratuit | Audio généré une fois |
| Correction objective (QCM, V/F, trous, appariement, ordre) | `correction.ts` | 🟢 Gratuit | Aucun coût variable |
| Cours A1→C2 (curriculum) | `progression-curriculum.ts`, `learn` | 🟢 Gratuit | Quasi nul à servir ; « commence à apprendre gratuitement » |
| Flashcards SRS (SM-2) | `srs.ts` | 🟢 Gratuit | Pas de LLM ; moteur d'habitude/rétention |
| Déblocage de niveau par maîtrise (5 sessions ≥70%) | `level-progression.ts` | 🟢 Gratuit | Local |
| Diagnostic compétence **et format** | `progress.ts` (`bySection`,`byFormat`) | 🟢 Gratuit | « Sache où tu en es » ; pas d'IA |
| Tendance de progression (≥4 sessions) | `tendance.ts` | 🟢 Gratuit | Local, prudent |
| Reco « compétence/format faible → entraîne-toi » (plan P1/P2) | `progress.ts` | 🟢 Gratuit | « Sache quoi travailler » de base |
| 1 correction IA offerte (hook) | `AiQuota` (branche non payante) | 🟢 Gratuit | Le goût de l'IA → convertit vers le volume |
| **Schreiben — correction IA** (critères publics, erreurs typées, niveau, reco) | `writing-eval.ts` | 🔵 Premium | Coût variable IA ; valeur premium n°1 |
| **Sprechen — feedback IA** (transcription + métriques de fluidité) | `speech-metrics.ts` + IA | 🔵 Premium | Coût variable IA (⚠ moins profond que Schreiben) |
| Reco « tes erreurs récurrentes → ces leçons » (plan P3) | `recommendations.ts` | 🔵 Premium | Dérive des feedbacks IA → naturellement premium |
| Volume de corrections | budget IA par offre (`aiBudgetMicroUsd`) | 🔵 Premium | Monétisation par engagement |

## 3. Offres premium

Les 4 offres (7 / 30 / 90 / 365 j) sont **le même premium** ; elles ne diffèrent
que par la **durée d'accès** et le **volume de corrections IA** (enveloppe
budget). Message : on n'achète pas « l'accès au site », on achète **du feedback
personnalisé** et sa quantité.

## 4. Ce qu'on NE promet PAS (en avance sur le produit)

- ⛔ « Un plan qui **s'adapte** / **évolue** jusqu'au jour de l'examen. »
  Le plan est heuristique et par seuil, non piloté par la date d'examen, sans
  boucle de réévaluation. → chantier « Niveau 3 » à construire avant de le dire.
- ⛔ « Correction orale aussi poussée que l'écrit. » Le Sprechen = transcription
  + métriques de fluidité + IA, pas le « erreur par erreur » du Schreiben.
- ⛔ « Gratuit, sans limite de temps » **tant que le gate n'est pas recâblé**
  (§5). Aujourd'hui le code fait un essai de 24 h puis bloque tout.

## 5. Recâblage produit nécessaire pour rendre le modèle A vrai

**À faire avant de publier le nouveau marketing. Aucune réécriture massive.**

- Aujourd'hui : `register` pose `status=ACTIVE`, `accessUntil=+24h` ; puis
  `lib/active-gate.ts` (`requireActivePage`) verrouille dashboard, entraînements,
  examens **et cours** dès expiration.
- Cible : un **socle gratuit permanent**. Les surfaces 🟢 restent accessibles
  sans expiration ; seules les surfaces 🔵 (corrections IA + reco P3 + volume)
  dépendent de l'entitlement/quota.
- Seams déjà en place à recâbler (pas à réinventer) : le champ `plan`
  (FULL/EXAM_PREP → FREE/PAID), `hasLearnAccess`, les `entitlements` Core,
  le composant `AiQuota`, et le gate `requireActivePage`.
- Corriger le libellé « rechargées à votre prochain renouvellement »
  (`AiQuota`) : les offres sont des **pass à durée fixe sans renouvellement
  auto**.

## 6. Décisions résiduelles (hors périmètre marketing immédiat)

- **1 correction offerte** : à vie, ou récurrente (ex. 1 / mois) pour le gratuit ? (à décider)
- **Top-up de corrections** (recharge à la volée) : **parqué** — à n'ouvrir
  qu'après analyse des coûts réels par type de correction (protéger la marge).

## Sources (code audité)
`app/api/auth/register/route.ts` · `lib/active-gate.ts` · `lib/guards.ts` ·
`lib/account.ts` · `lib/exam-runner.ts` · `lib/scoring.ts` · `lib/correction.ts` ·
`lib/writing-eval.ts` · `lib/speech-metrics.ts` · `lib/progress.ts` ·
`lib/recommendations.ts` · `lib/level-progression.ts` · `lib/progression-curriculum.ts` ·
`lib/srs.ts` · `lib/tendance.ts` · `lib/kebrane.ts` · `components/ai-quota.tsx`

## 7. Décisions figées (2026-09-06)

Voir `docs/recablage-gate-freemium.md` pour le détail et le statut code.
Freemium permanent ; 1 correction IA offerte **à vie** (pas récurrente) ;
premium = enveloppe du pass (reset à l'achat) ; expiration premium → retour
au gratuit (jamais bloqué) ; cours + examens + Lesen/Hören + diagnostic de base
+ SRS en **gratuit** ; diagnostic avancé issu des feedbacks IA + corrections IA
en **premium** ; `AI_BUDGET_ENFORCE` → ON après correction des invariants A et C.
