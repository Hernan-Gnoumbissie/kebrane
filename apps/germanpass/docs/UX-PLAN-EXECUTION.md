# GermanPass — Plan d'exécution UX (priorisé « quick wins d'abord »)

*Établi le 24 août 2026, à partir de l'audit du code réel (`app-header`, `dashboard`,
`exams`, `practice`, `globals.css`) et du backlog `UX-TICKETS.md` (UX-01→UX-14).*

## Constat (pourquoi ce n'est pas « waouh »)
L'app est **solide sur le fond** (progression CECRL, analytics par compétence, plan IA,
examens en conditions réelles) mais **utilitaire sur la forme**. Trois défauts plombent la
qualité perçue et se corrigent vite :
1. **Emojis en guise d'icônes** partout (⏱▶🎙🎉🔒📍✅🏆) — `lucide-react` est **déjà
   installé**.
2. **Couleurs hors charte** : bannières/états en Tailwind brut (`blue-50`, `amber-50`,
   `red-50`, `green-100/500`) au lieu des tokens de la charte.
3. **Contrôles de formulaire natifs** peu stylés (`<select>`, radios, `<textarea>`,
   classement en ↑↓) sur les écrans où l'apprenant passe son temps.

## Nord de la direction artistique (IMPORTANT)
« Waouh » pour Kebrane **≠ Duolingo**. Le Manifeste rejette dark patterns, fausse urgence
et gamification manipulatrice. Référence = **Babbel** : structuré, sérieux, épuré, forte
sensation de progression. Objectif = **« premium tranquille »**, aligné charte (Georgia,
Marine/Papier, **Rouge accent RARE ≤ 5 %**).

## ⚠ Corrections aux tickets (décisions déjà prises)
- **Accent GermanPass = Rouge charte `#A5322C`** (tokens Kebrane déjà chargés via
  `@kebrane/ui/styles.css`). La question « bleu `#2563eb` vs indigo Geek Institut » de UX-01
  est **caduque** : Geek Institut reste une référence de **mise en page**, pas de couleur.
- **Paiement = mobile money MTN + Orange Money** (pas de PayPal, pas de Stripe) — corrige
  UX-06.
- Les **couleurs sémantiques** (succès/alerte/danger/info) doivent être **dérivées pour
  rester dans la charte** (pas de vert/bleu/rouge Bootstrap criards).

---

## Vague 0 — Quick wins visuels (le plus rentable, ~1–2 j)
> ~80 % du saut de qualité *perçue* pour un effort faible. À faire en premier, ils rendent
> tout le reste plus crédible. Sous-ensemble ciblé de UX-01 + UX-02.

- [x] **QW-1 · Icônes lucide à la place des emojis** sur les écrans connectés
      (`dashboard`, `practice`, `exams`, `app-header`, notifications). Un emoji = une icône
      lucide équivalente, taille/《stroke》cohérents. Emojis tolérés seulement dans les
      messages de contenu, jamais comme boutons/statuts.
- [x] **QW-2 · Éradiquer les couleurs hors charte.** Remplacer `blue/amber/red/green-*`
      par des tokens sémantiques (`--success`, `--warning`, `--danger`, `--info`) dérivés
      de la charte (Ciel/Sable/Rouge en neutres dominants ; Rouge réservé au danger, rare).
      Grep de contrôle : plus aucune classe couleur Tailwind brute sur les pages clés.
- [ ] **QW-3 · Styliser les contrôles de formulaire.** Radios/cases → **options en cartes
      cliquables** (toute la ligne cliquable, cible ≥ 44 px) ; `<select>` et `<textarea>`
      thémés (composants shadcn) ; classement (ORDERING) avec poignées lisibles (drag si
      simple, sinon ↑↓ plus grands et étiquetés).
**Acceptation V0** : capture avant/après de `dashboard`, `practice`, `exams` ; zéro emoji
de statut ; zéro couleur hors charte ; contrôles homogènes.

## Vague 1 — Fondations (UX-01, UX-02, UX-04, UX-03)
> Consolide ce que la V0 a amorcé, pour que le reste s'appuie dessus.
- [ ] **UX-01** finaliser : échelle typo, radius, ombres, **couleurs sémantiques** dans
      `tailwind.config.ts` + `globals.css` ; base mode sombre. (Accent = Rouge charte.)
- [ ] **UX-02** : converger tous les boutons/cartes/champs/badges/alertes vers
      `src/components/ui/*` (cva) ; états hover/focus-visible/disabled/loading homogènes.
- [ ] **UX-04** : skeletons, empty states illustrés + CTA, `error.tsx`/`not-found.tsx`
      rassurants. (La liste d'examens a déjà un empty state — le généraliser.)
- [ ] **UX-03** : primitives de motion (fade/slide/scale, durées/easings centralisés),
      `prefers-reduced-motion` respecté. Sobre — pas d'esbroufe.

## Vague 2 — Cœur d'usage (là où l'apprenant vit)
- [ ] **UX-07** dashboard « prochaine action » : hisser LA prochaine action en haut ;
      progression par compétence lisible d'un coup d'œil ; aérer ; skeletons.
- [ ] **UX-09** Schreiben/Sprechen : feedback IA **scannable** (sections, pas un pavé) ;
      états d'enregistrement clairs ; gestion du refus micro.
- [ ] **UX-10** examen blanc : écran de démarrage net, chrono par section, progression
      questions, rapport final actionnable, garde-fous avant soumission.
- [ ] **UX-08** parcours `/learn` : « reprendre où je me suis arrêté », flashcards dues
      visibles, complétion célébrée sobrement.

## Vague 3 — Acquisition
- [ ] **UX-05** landing/produit GermanPass : hero clair + **profondeur produit** (aperçu
      rapport d'examen, extrait feedback IA, courbe) — se différencier de Geek Institut.
- [ ] **UX-06** page tarifs : formules claires, flux **mobile money** « payer → preuve →
      validation → accès » ; mettre en avant la formule conseillée. (Prix lus dynamiquement,
      cf. KB-34 côté hub — cohérence à assurer.)
- [ ] **UX-14** onboarding/activation : guider le compte PENDING vers l'action suivante.

## Vague 4 — Finitions transverses
- [ ] **UX-11** nav/header : envisager une **barre d'onglets basse sur mobile**
      (pouce-accessible) plutôt que le seul burger ; header cohérent connecté/déconnecté.
- [ ] **UX-12** a11y/i18n : audit clavier, contrastes AA, FR/DE cohérent.
- [ ] **UX-13** mobile/PWA : responsive des écrans retouchés, bannière offline + install.

---

## Méthode pour Claude Code
1. Travailler **vague par vague**, une branche par vague (`ux-v0-quickwins`, …).
2. Avant/après : **captures** des écrans touchés (Playwright, cf. KB-36) — la preuve visuelle
   fait foi. ⚠ Nécessite du contenu en base (voir **KB-38**, mini-lot) pour ne pas
   photographier des écrans vides.
3. Respecter la charte (Georgia, Marine/Papier, Rouge rare) et la frontière (`@kebrane/ui`
   quand un composant maison existe côté maison).
4. `typecheck + lint + build` verts avant chaque commit ; mettre à jour les cases UX-0x.
5. Ne rien déployer ; ne pas introduire de gamification contraire au Manifeste.

**Dépendance clé** : la V0 et les captures supposent un peu de **contenu** en base → faire
**KB-38 (mini-lot)** d'abord, ou en parallèle.
