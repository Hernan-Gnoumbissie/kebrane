# Prompt de reprise — Claude Code · Phase 9 (pages du site)

> À coller dans Claude Code, à la racine du monorepo `kebrane/`.

## ⏩ Point de reprise (22 août 2026) — LIRE EN PREMIER

Une partie de la Phase 9 est **déjà construite** par toi (routes `(legal)/*`,
`(marketing)/*`, `hub/parametres`, `site-footer`). Depuis, le PO a tranché des décisions
et le contenu a été enrichi. **Tâches prioritaires dans l'ordre :**

1. **Resync du contenu** : les pages construites reprennent d'anciens brouillons. Reprendre
   `docs/content/*.md` (mis à jour) et **remplacer les `[À COMPLÉTER]` désormais résolus** :
   - Éditeur = **Crespo Hernan Gnoumbissie Djambe** (entrepreneur individuel, non
     immatriculé, Douala/Cameroun) ; directeur de publication = idem.
   - Hébergeur = **IONOS SE**, Elgendorfer Straße 57, 56410 Montabaur, Allemagne
     (contact FR : IONOS SARL, 7 place de la Gare, BP 70109, 57200 Sarreguemines Cedex).
   - Droit **camerounais**, juridictions de **Douala** (CGU + CGV).
   - Devise **FCFA (XAF)**, paiement **MTN Mobile Money + Orange Money**.
   - **Reste volontairement vide** : l'**adresse postale** de l'éditeur (décision PO :
     laisser le champ en attente).
2. **Nommage produits (tranché)** : convention **« -Pass » + qualificatif local**. Le
   registre `packages/core/src/registry.ts` est déjà à jour → `germanpass`, `tcfpass`
   (« le TCF pour le Canada »), `permitpass` (« le code de la route au Cameroun »).
   **« Gestion Formation » retiré** du catalogue public. Vérifier qu'aucune page ne
   référence encore les anciens noms/slugs (`tcf-canada`, `permis-cameroun`,
   `gestion-formation`, « TCF Canada », « Permis Cameroun »). **Rejouer le seed** pour
   propager les nouveaux slugs.
3. **KB-34 — Tarifs éditables** (le gros morceau restant) : service `plans.update` (ADMIN)
   + **écran admin des offres** dans `apps/admin` + page `/tarifs` lue **en direct** depuis
   Core + **CGV qui renvoient à `/tarifs`** (aucun montant en dur).
4. **KB-27** (consentement Clerk à l'inscription) et **KB-28** (export + suppression compte)
   si pas déjà finalisés — vérifier `hub/parametres`.

Le hero de la landing et la page « À propos » ont **déjà été réécrits** (mission tirée du
Manifeste) — ne pas les réduire à une liste de produits. Après chaque tâche, mettre à jour
les statuts KB-22→KB-34 dans `docs/PLATFORM-TICKETS.md`.

## Contexte

Monorepo Kebrane (pnpm + Turborepo). Le socle est fait et prouvé : `apps/kebrane`
(hub, :3001), `apps/admin`, `apps/germanpass`, paquets `@kebrane/{ui,core,auth,db,config}`.
On attaque la **Phase 9 du backlog** : toutes les pages publiques/légales du site
`kebrane.com`. Les tickets sont **KB-22 → KB-34** dans `docs/PLATFORM-TICKETS.md`.
Les brouillons de contenu FR sont dans `docs/content/*.md`.

## Règles non négociables

- Tout vit dans `apps/kebrane` (domaine `kebrane.com`), construit avec `@kebrane/ui`.
- **Charte** : Georgia en titres, Marine `#1F3352` / Papier, **Rouge `#A5322C` en accent
  RARE (≤ 5 %)**, règle 60/25/10/5, « By Kebrane ». Reprendre les acquis a11y de KB-16
  (lien d'évitement, focus visible, `prefers-reduced-motion`).
- **Frontière v0.2** : les pages ne touchent jamais `@kebrane/db` directement — tout
  passe par `@kebrane/core` (lint de frontière actif).
- **Aucun prix codé en dur** nulle part (voir KB-34).
- Contenu : reprendre **mot pour mot** les fichiers `docs/content/*.md`. Les marqueurs
  `[À COMPLÉTER]` restent visibles tant que le PO n'a pas fourni l'info (ne rien inventer,
  surtout pas l'adresse de l'éditeur).

## Ordre d'exécution (le légal d'abord — il bloque le lancement et la KYC)

1. **KB-33** — layout + `site-footer` avec colonnes « Légal » et « Kebrane », présent sur
   toutes les pages. Créer un groupe de routes `(legal)` et `(marketing)`.
2. **KB-22** Mentions légales → `docs/content/mentions-legales.md`.
3. **KB-25** Politique de confidentialité → `confidentialite.md`.
4. **KB-23** CGU → `cgu.md`.
5. **KB-26** Politique cookies → `cookies.md` (⚠ **pas de bandeau** tant qu'aucun traceur
   non essentiel n'est ajouté ; les cookies de session Clerk sont exemptés).
6. **KB-27** Consentement à l'inscription : activer « Legal acceptance » dans le
   **dashboard Clerk** (liens CGU + confidentialité) ; vérifier que le refus bloque la
   création de compte. (Étape config Clerk — documenter, ne pas coder de case maison.)
7. **KB-28** Espace compte : « Exporter mes données » + « Supprimer mon compte »
   (délie Clerk via `accounts.unlinkClerk`, purge/anonymise via Core, journalise en
   gravité IMPORTANT).
8. **KB-29** À propos → `a-propos.md` · **KB-30** Contact → `contact.md` ·
   **KB-31** FAQ → `faq.md` + page produit GermanPass dédiée.
9. **KB-34** Grille tarifaire éditable :
   - service `plans.update` dans `packages/core/src/plans.ts` (réservé rôle ADMIN,
     événement `plan.price_changed` déjà présent) ;
   - **écran admin des offres** dans `apps/admin` (lister/éditer prix, durée, capacités,
     ordre, actif/inactif) ;
   - page publique **`/tarifs`** qui lit les offres actives **en direct** depuis Core
     (repli propre si base indisponible), aucun montant en dur ;
   - **KB-24** CGV → `cgv.md`, qui renvoie à `/tarifs` (pas de prix figés).

## Vérification (à chaque ticket)

- `pnpm --filter @kebrane/kebrane typecheck && lint && build` verts.
- Les pages légales sont atteignables depuis le footer sur **toute** page.
- Frontière respectée (aucun import profond `@kebrane/db` hors Core).
- Screenshots des pages pour contrôle charte (Georgia/Marine, Rouge rare).
- Mettre à jour les cases `[ ]`/statuts des tickets KB-22→KB-34 au fur et à mesure.

## Ce que le PO doit encore fournir (ne pas bloquer le reste)

- **Adresse postale** de l'éditeur (le champ reste en attente — décision prise de le
  laisser vide pour l'instant).
- Politique CGV : reconduction (auto/manuelle), remboursement, mention de taxe.
- Âge minimum d'inscription (confidentialité).
- Grille tarifaire réelle : sera saisie **via l'écran admin** une fois KB-34 livré.
