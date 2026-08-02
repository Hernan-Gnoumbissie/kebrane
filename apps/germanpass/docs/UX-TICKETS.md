# GermanPass — Backlog UX (tickets pour Claude Code)

*Créé le 2 août 2026. Objectif : améliorer l'expérience d'utilisation sans réécrire le socle.*

## Contexte technique (à respecter pour tous les tickets)
- **Stack** : Next.js 16 (App Router, Turbopack en dev), React 19, TypeScript, Tailwind CSS v3, **shadcn/ui** (`components.json` présent), `lucide-react`, `tailwindcss-animate` (déjà installé), `class-variance-authority`, `tailwind-merge`.
- **Auth** : Clerk (composants `<SignIn/>`/`<SignUp/>`, `<UserButton/>`, `useClerk`). Ne pas réintroduire de logique next-auth.
- **PWA** : serwist (désactivé en dev). Bannière hors-ligne existante (`OfflineBanner`, `OfflineProvider`).
- **i18n** : contenu bilingue FR/DE (feedback, aide). Ne pas casser les libellés existants.
- **Contraintes transverses** :
  - Réutiliser les composants shadcn existants avant d'en créer de nouveaux.
  - Toute animation doit respecter `prefers-reduced-motion` (désactivation propre).
  - Mobile-first, cibles tactiles ≥ 44px, pas de régression de perf (éviter d'alourdir le bundle ; privilégier CSS/`tailwindcss-animate`, réserver `framer-motion` aux cas qui le justifient).
  - Accessibilité : focus visible, contrastes AA, navigation clavier, `aria-*` corrects.
- **Références visuelles** : les exemples (captures / vidéos / liens) fournis par le PO servent de direction artistique. Chaque ticket « visuel » doit s'aligner dessus ; à défaut d'exemple, appliquer les bonnes pratiques décrites ici.

### Inspirations fournies
- **Geek Institut** (`https://geekinstitut.com/`) — pair direct (institut d'allemand, public francophone). Codes à retenir :
  - Hero **plein écran photographique** (vraies personnes, ambiance chaleureuse) avec **voile sombre** pour la lisibilité ; **slider** avec indicateurs (points verticaux).
  - **Titre display géant et très gras**, blanc, sur plusieurs lignes ; **sous-titre court** précédé d'une **barre d'accent verticale**.
  - **Boutons « pill » très arrondis** avec flèche `→` ; CTA secondaire en **bouton play circulaire** (vidéo).
  - **Nav transparente « glassy »** superposée au hero : logo monogramme, menu centré, **CTA pill** à droite, hamburger en appoint.
  - **Accent de marque violet/indigo** ; **sélecteur de langue en pill**.
  - À reprendre comme *codes du marché* — mais GermanPass doit **se différencier** en montrant la profondeur produit (examens blancs, feedback IA, progression), pas seulement une belle vitrine.
  - ⚠ Direction couleur à trancher par le PO : conserver le **bleu GermanPass** (`#2563eb`) comme accent, ou basculer vers un **indigo/violet** façon Geek Institut. Voir UX-01.

### Légende
Priorité **P1** (fondation / fort impact) · **P2** (important) · **P3** (finition).
Effort **S** (< 0,5 j) · **M** (0,5–1,5 j) · **L** (> 1,5 j).

---

## Fondations

### UX-01 · Design tokens & thème unifié
**Zone** Design system · **P1** · **M**
**Contexte** : les couleurs/espacements/rayons sont hétérogènes selon les pages.
**À faire** :
- Centraliser les tokens (couleurs de marque, sémantiques success/warning/danger/info, radius, ombres, échelles d'espacement, typographie) dans `tailwind.config.ts` + variables CSS shadcn (`globals.css`).
- Définir une échelle typographique cohérente (titres, corps, légendes) et l'appliquer.
- Poser les bases d'un **mode sombre** (variables `dark:`), même si activé plus tard.
**Inspiration (Geek Institut)** : accent de marque saturé (violet/indigo chez eux), **rayons généreux façon pill** pour les boutons (`--radius` élevé), contrastes forts texte blanc sur médias sombres. Décision PO attendue : garder le bleu `#2563eb` ou adopter un indigo/violet — définir la couleur d'accent + sa variante « foncée » et un éventuel dégradé de CTA.
**Critères d'acceptation** :
- [ ] Un seul endroit définit la palette ; plus de couleurs « en dur » dispersées sur les pages clés.
- [ ] Les composants shadcn consomment ces tokens (thème cohérent).
- [ ] Contrastes AA vérifiés sur les couleurs de texte principales.
- [ ] Un token de rayon « pill » disponible et utilisé par les CTA marketing.
**Fichiers** : `tailwind.config.ts`, `src/app/globals.css`, `components.json`.

### UX-02 · Audit & standardisation des composants
**Zone** Design system · **P1** · **M**
**À faire** :
- Recenser les variantes de boutons, cartes, champs, badges, alertes utilisées ; converger vers les composants shadcn (`src/components/ui/*`).
- Harmoniser états `hover` / `focus-visible` / `disabled` / `loading`.
- Créer les variantes manquantes via `cva` plutôt que du CSS ad hoc.
**Critères d'acceptation** :
- [ ] Un bouton primaire/secondaire/ghost cohérent partout.
- [ ] États de focus visibles au clavier sur tous les interactifs.
- [ ] Aucune duplication de composant « maison » quand un shadcn existe.
**Fichiers** : `src/components/ui/*`, pages consommatrices.

### UX-03 · Système d'animations & transitions
**Zone** Motion · **P2** · **M**
**À faire** :
- Définir des primitives de motion réutilisables (fade/slide/scale, durées et easings standard).
- Transitions d'entrée sur les listes/cartes (stagger léger), micro-interactions sur boutons/onglets.
- Transitions de page fluides (App Router) là où ça a du sens.
- Respecter `prefers-reduced-motion` (fallback sans animation).
**Critères d'acceptation** :
- [ ] Durées/easings centralisés, réutilisés (pas de valeurs magiques éparses).
- [ ] `prefers-reduced-motion: reduce` désactive proprement les animations.
- [ ] Aucun jank perceptible ; pas de layout shift.
**Notes** : privilégier `tailwindcss-animate` + CSS ; `framer-motion` seulement pour les séquences complexes.

### UX-04 · États de chargement, vides et erreurs
**Zone** Design system · **P1** · **M**
**À faire** :
- Skeletons cohérents pour les zones asynchrones (dashboard, listes, feedback IA).
- Empty states illustrés + CTA (ex. « aucune leçon commencée », « pas encore de soumission »).
- Error boundaries et pages `error.tsx`/`not-found.tsx` stylées et rassurantes.
**Critères d'acceptation** :
- [ ] Chaque page à données a un skeleton (pas de saut de contenu brut).
- [ ] Chaque liste a un empty state utile avec action.
- [ ] Les erreurs proposent une action de récupération (réessayer / retour).
**Fichiers** : `src/app/**/loading.tsx`, `error.tsx`, `not-found.tsx`, composants Skeleton.

---

## Page d'accueil / marketing

### UX-05 · Refonte du hero et de la landing
**Zone** Landing (`/`) · **P2** · **M**
**À faire** :
- Hero clair : proposition de valeur, sous-titre, CTA primaire (« Commencer gratuitement ») + secondaire (« Voir les tarifs »).
- Section preuve (exemples d'examens blancs, providers Goethe/ÖSD/telc/ECL/TestDaF, niveaux A1–C2) avec hiérarchie visuelle.
- Bloc « comment ça marche » (3–4 étapes) et différenciateurs (feedback IA, bilingue FR/DE).
- Animations d'apparition au scroll, sobres.
**Inspiration (Geek Institut)** — à adapter, pas copier :
- Hero **photographique plein écran** (photos de candidats en situation) avec **voile sombre** ; **titre display géant très gras** ; **sous-titre court** précédé d'une **barre d'accent verticale**.
- **CTA pill** avec flèche `→` ; option **bouton play circulaire** pour une courte vidéo de démo.
- Éventuel **slider** de hero (2–3 messages) avec indicateurs — *optionnel* ; ne pas nuire à la perf ni au CLS.
- **Différenciateur GermanPass** : dès le hero ou juste en dessous, matérialiser la profondeur produit (aperçu d'un rapport d'examen, extrait de feedback IA, courbe de progression) — ce que Geek Institut n'a pas.
**Critères d'acceptation** :
- [ ] Hero responsive, lisible mobile, CTA au-dessus de la ligne de flottaison.
- [ ] Cohérent avec les tokens UX-01 et le motion UX-03.
- [ ] Aucun texte « lorem » ; réutiliser le contenu FR existant.
- [ ] Si slider : `prefers-reduced-motion` respecté, pas de layout shift, images optimisées (`next/image`).
**Fichiers** : `src/app/(public)/page.tsx` (accueil) et composants marketing associés.

### UX-06 · Page tarifs (mobile money) plus claire
**Zone** Pricing (`/pricing`) · **P2** · **S/M**
**Contexte** : paiement par Orange Money / MTN MoMo / PayPal (pas de Stripe), validation par preuve.
**À faire** :
- Présentation claire des formules et de ce qu'elles incluent ; mise en avant de la formule recommandée.
- Expliquer visuellement le flux « payer → envoyer la preuve → validation admin → accès ».
- Icônes/moyens de paiement lisibles, réassurance (essai gratuit sans carte).
**Critères d'acceptation** :
- [ ] Le parcours de paiement est compréhensible en un coup d'œil.
- [ ] Responsive et cohérent avec le design system.
**Fichiers** : `src/app/(public)/pricing/*`.

---

## Espace connecté

### UX-07 · Dashboard candidat orienté « prochaine action »
**Zone** Dashboard (`/dashboard`) · **P1** · **L**
**Contexte** : la page agrège progression, recommandations, examens, entraînements (nombreuses requêtes).
**À faire** :
- Hiérarchiser : en haut, la **prochaine action recommandée** ; puis progression visuelle (par compétence Lesen/Hören/Schreiben/Sprechen), accès rapides.
- Cartes de progression avec graphiques légers ; badges de niveau (A1–C2).
- Réduire la charge cognitive : regrouper, prioriser, aérer.
- Skeletons (UX-04) pendant le chargement des agrégats.
**Critères d'acceptation** :
- [ ] L'utilisateur voit immédiatement quoi faire ensuite.
- [ ] Progression par compétence lisible d'un coup d'œil.
- [ ] Chargement progressif sans page blanche.
**Fichiers** : `src/app/dashboard/page.tsx`, `dashboard/layout.tsx`, composants dédiés.
**Note perf** : envisager de paralléliser/mémoïser les requêtes d'agrégats (hors périmètre strict UX, à signaler).

### UX-08 · Parcours d'apprentissage /learn
**Zone** Learn (`/learn`) · **P2** · **L**
**À faire** :
- Vue « parcours » : leçon en cours mise en avant, progression du curriculum, prochaines leçons.
- Bloc **flashcards dues** (rappel espacé) visible et engageant.
- Recommandations personnalisées présentées comme des cartes actionnables.
- Micro-animations de complétion (feedback positif sobre).
**Critères d'acceptation** :
- [ ] « Reprendre où je me suis arrêté » en un clic.
- [ ] Les flashcards dues sont visibles et lançables directement.
- [ ] États vides pour un nouveau compte (UX-04).
**Fichiers** : `src/app/learn/*`, composants curriculum/flashcards.

### UX-09 · Entraînements Schreiben & Sprechen (soumission + feedback IA)
**Zone** Practice (`/practice`, `/practice/schreiben`, `/practice/sprechen`) · **P1** · **L**
**À faire** :
- Écran de soumission clair : consigne, minuteur optionnel, zone de saisie (Schreiben) ou **enregistrement audio** guidé (Sprechen : demander le micro proprement, indiquer l'état d'enregistrement, relecture avant envoi).
- Affichage du **feedback IA** structuré et lisible (critères, points forts/à améliorer, score), bilingue FR/DE.
- États : envoi en cours, en cours d'évaluation, résultat prêt.
**Critères d'acceptation** :
- [ ] L'enregistrement audio a un état visuel clair (rec / pause / relecture) et gère le refus micro.
- [ ] Le feedback IA est scannable (sections, pas un pavé).
- [ ] États de traitement asynchrone explicites (pas d'écran figé).
**Fichiers** : `src/app/practice/**`, composants d'enregistrement et de feedback.

### UX-10 · Parcours d'examen blanc
**Zone** Exams (`/exams`) · **P1** · **L**
**À faire** :
- Écran de démarrage : présentation de l'examen, durée, sections, bouton « Commencer » sans ambiguïté.
- Pendant l'épreuve : **chrono par section** visible, navigation entre questions, indicateur de progression, sauvegarde d'état perçue.
- Fin : **rapport de résultats** clair (score global + par section, corrigés, recommandations de révision).
- Confirmations avant actions irréversibles (soumettre une section, quitter).
**Critères d'acceptation** :
- [ ] Le candidat sait toujours où il en est (section, temps, questions restantes).
- [ ] Le rapport final est lisible et actionnable (que réviser).
- [ ] Garde-fous sur les actions destructives.
**Fichiers** : `src/app/exams/**`, composants de session d'examen et de rapport.

---

## Transverse

### UX-11 · Navigation & header cohérents
**Zone** Global · **P1** · **M**
**À faire** :
- Header responsive unifié (connecté / déconnecté), menu mobile accessible.
- Intégrer le `<UserButton/>` Clerk au design (ou menu compte custom cohérent), avec la déconnexion.
- Fil d'Ariane / titre de page là où utile.
**Inspiration (Geek Institut)** : sur la landing, **nav transparente « glassy »** superposée au hero (logo monogramme à gauche, liens centrés, **CTA pill** à droite, hamburger en appoint), qui devient opaque au scroll. Prévoir un **sélecteur de langue en pill** (FR/DE) cohérent avec i18n.
**Critères d'acceptation** :
- [ ] Navigation utilisable au clavier et au tactile.
- [ ] Le menu compte (Clerk) s'accorde visuellement au reste.
- [ ] Pas de décalage de layout à l'ouverture des menus.
**Fichiers** : `src/components/app-header.tsx`, `logout-button.tsx`, layout(s).

### UX-12 · Accessibilité (a11y) & i18n
**Zone** Global · **P2** · **M**
**À faire** :
- Passe a11y : contrastes AA, focus visible, `aria-*`, ordre de tabulation, labels de formulaires.
- Vérifier la cohérence FR/DE (pas de texte codé en dur non traduit sur les nouveaux écrans).
**Critères d'acceptation** :
- [ ] Audit clavier complet des parcours clés sans blocage.
- [ ] Lighthouse/axe : plus d'erreurs a11y critiques sur les pages retouchées.
**Fichiers** : transverse.

### UX-13 · Mobile & PWA
**Zone** Global · **P2** · **M**
**À faire** :
- Vérifier le responsive des pages retouchées ; cibles tactiles ≥ 44px.
- Soigner la bannière hors-ligne existante et l'invite d'installation PWA.
- Vérifier que les animations restent fluides sur mobile.
**Critères d'acceptation** :
- [ ] Parcours clés confortables sur petit écran.
- [ ] Bannière offline et install prompt cohérents avec le design.
**Fichiers** : `OfflineBanner`, `OfflineProvider`, `manifest`, pages.

### UX-14 · Onboarding & état d'activation (PENDING)
**Zone** Activation · **P2** · **M**
**Contexte** : après inscription Clerk, le compte est `PENDING` → redirigé vers `/pricing?activation=1` en attendant la validation admin.
**À faire** :
- Écran d'attente d'activation clair : où en est la demande, étapes restantes (payer → envoyer preuve → validation), délai indicatif.
- Guider vers l'action suivante (envoyer la preuve de paiement) plutôt qu'un simple blocage.
**Critères d'acceptation** :
- [ ] Un compte PENDING comprend immédiatement quoi faire pour être activé.
- [ ] Cohérent avec le flux paiement (UX-06).
**Fichiers** : page d'activation / `/pricing`, `lib/active-gate.ts` (comportement de redirection, sans casser la logique métier).

---

## Ordre conseillé
1. **Fondations** (UX-01, UX-02, UX-04, UX-03) — tout le reste en dépend.
2. **Cœur d'usage** (UX-07 dashboard, UX-09 entraînements, UX-10 examen).
3. **Acquisition** (UX-05 landing, UX-06 pricing, UX-14 activation).
4. **Finitions transverses** (UX-11, UX-12, UX-13).

> Rappel : rattacher à chaque ticket « visuel » les exemples d'inspiration fournis par le PO avant implémentation.
