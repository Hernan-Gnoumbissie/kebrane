# Consigne Claude Code — commiter la Phase 9 + prouver la CI

> À coller à la racine du monorepo `kebrane/`. Objectif : **sécuriser et prouver** le
> travail Phase 9 qui existe en local mais n'est **pas commité** (dernier commit = KB-16).
> **Ne rien déployer.**

## 1. Constat de départ
- `git status` : mesurer l'étendue des modifications non commitées.
- Confirmer que le dernier commit est bien KB-16 et que toute la Phase 9 est en working tree.

## 2. Prouver avant de commiter
- Rejouer le **seed** en dev (les slugs produits ont changé : `tcfpass`, `permitpass` ;
  `gestion-formation` retiré) : `pnpm --filter @kebrane/core seed`.
- **Typecheck + lint + build** sur les apps touchées :
  `pnpm --filter @kebrane/kebrane typecheck && lint && build`
  `pnpm --filter @kebrane/admin typecheck && lint && build`
  (+ `@kebrane/core` si scripts présents). Corriger toute erreur AVANT de commiter.
- Vérifier à la main : `/tarifs` affiche les offres lues depuis Core ; le hub et la
  vitrine affichent GermanPass/TCFPass/PermitPass (plus « Gestion Formation ») ; les
  pages légales ne contiennent plus de placeholder résolu (nom éditeur, IONOS) —
  **seule l'adresse postale reste volontairement vide**.

## 3. Commits atomiques (un par lot logique, messages comme le dépôt)
- `packages/core/src/registry.ts` — nommage « -Pass » + retrait Gestion Formation.
- KB-33 — layout + `site-footer` (colonnes Légal/Kebrane).
- KB-22..26 — pages légales + resync du contenu (`docs/content/*.md`).
- KB-27 — consentement CGU/confidentialité à l'inscription (config Clerk + doc).
- KB-28 — `hub/parametres` : export + suppression de compte (RGPD).
- KB-29..31 — à propos (mission/Manifeste), contact, FAQ, page produit GermanPass.
- KB-34 — `plans.update` (ADMIN), écran `admin/offres`, `/tarifs` dynamique, CGV→/tarifs.
- landing hero + `a-propos` — accroche de mission (ne pas réduire aux produits).

## 4. Prouver la CI
- Pousser sur le remote ; **attendre la CI verte**. Si rouge, corriger et recommencer.
- Mettre à jour les statuts **KB-22 → KB-34** dans `docs/PLATFORM-TICKETS.md` (fait/partiel),
  et le bloc « Statut synthétique ».

## 5. Rapport attendu
- SHA du commit vert, liste des tickets passés à « fait », et tout écart constaté
  (placeholders restants, tests manquants, dettes). **Aucun déploiement.**
