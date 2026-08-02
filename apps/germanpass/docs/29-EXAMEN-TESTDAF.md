# Blueprint d'examen blanc — TestDaF (digital)

> Couche **examen**. Contenu Apprendre **mutualisé** : réutiliser [20-CURRICULUM-B2-GOETHE] **et** [21-CURRICULUM-C1-GOETHE] (TestDaF couvre B2–C1).
> ⚠️ **TestDaF n'est pas encore intégrable tel quel** : voir la section 7 « Intégration technique requise » (enum + notation TDN). Ce blueprint sert de spécification.

---

## 0. Format officiel TestDaF (version digitale)

Examen académique unique (accès université allemande), niveau **B2–C1**, 4 modules, ~3 h 10 au total.

| Module | Durée | Structure | Format (TaskFormat) |
|---|---|---|---|
| **Leseverstehen** | ~55 min | textes authentiques (annonces, presse, extraits académiques), ~34 items | mcq_single, true_false, matching |
| **Hörverstehen** | ~40–45 min | conversations, monologues, conférences, interviews | mcq_single, matching, true_false, gap_fill (compléter) |
| **Schriftlicher Ausdruck** | ~60 min | 2 tâches : décrire des données + prise de position argumentée | `WritingPrompt` (ESSAY) |
| **Mündlicher Ausdruck** | ~35 min | 7 tâches enregistrées (sans partenaire) : obtenir une info, décrire un graphique, peser le pour/contre, conseiller, prendre position, formuler des hypothèses | `SpeakingTask` (7 parties) |

**Notation : niveaux TDN par module — TDN 3 (≈ B2), TDN 4 (B2/C1), TDN 5 (C1).** En dessous : « unter TDN 3 ». Pas de verdict global réussite/échec : chaque module reçoit son TDN.

---

## 1. Banque LESEN (Passage, section=LESEN, provider=TESTDAF) — 18 passages

| Tâche | Type | Format | Nb |
|---|---|---|---|
| Lesen 1 | association courte (annonces ↔ besoins) | matching | 6 |
| Lesen 2 | article de presse → détails | mcq_single | 6 |
| Lesen 3 | texte académique → pour/contre/non dit | true_false (ja/nein/Text sagt dazu nichts) | 6 |

## 2. Banque HÖREN (section=HOEREN, provider=TESTDAF) — 16 passages

| Tâche | Type | Écoutes | Format | Nb |
|---|---|---|---|---|
| Hören 1 | dialogue quotidien (campus) | 1× | gap_fill (notes) | 4 |
| Hören 2 | interview/radio | 1× | true_false | 4 |
| Hören 3 | conférence académique | 1× | mcq_single | 4 |
| Hören 4 | discussion d'experts | 1× | matching | 4 |

## 3. SCHREIBEN (`WritingPrompt`, provider=TESTDAF) — 6 consignes
2 tâches : (a) décrire/comparer des données chiffrées (graphique/tableau), (b) prise de position argumentée. Format `ESSAY`. Critères : description des données, structure argumentative, cohérence, correction, registre académique.

## 4. SPRECHEN (`SpeakingTask`, provider=TESTDAF) — banque couvrant les 7 tâches
Tâches enregistrées (monologue, pas de binôme) : obtenir une information, décrire un graphique, résumer, peser des alternatives, donner un conseil, prendre position, formuler des hypothèses. Formats `PICTURE_DESCRIPTION`, `PRESENTATION`, `PLANNING_TASK`. Prévoir ≥ 2 jeux complets de 7 tâches.

## 5. Examen blanc (ExamBlueprint provider=TESTDAF) — 1 (→ 3)
4 modules dans l'ordre fixe Lesen → Hören → Schreiben → Sprechen. Résultat = **1 TDN par module** (pas de bestanden/nicht bestanden global).

## 6. Volumes
18 passages Lesen · 16 Hören · 6 consignes Schreiben · banque Sprechen (≥ 2 × 7 tâches) · 1 examen blanc (→3). **Apprendre : réutilisé de B2 + C1.**

---

## 7. Intégration technique requise (à coder avant génération)

Contrairement à telc/ÖSD/ECL (déjà supportés), TestDaF demande des évolutions :

1. **Enum `ExamProvider`** (`prisma/schema.prisma`) : ajouter `TESTDAF` → migration Prisma. Ajouter `"TESTDAF"` à `PROVIDERS` dans `src/lib/content-enums.ts`.
2. **Notation TDN** (`src/lib/scoring.ts`) : ajouter un mode de scoring qui mappe le score brut par module vers **TDN 3/4/5** (et « unter TDN 3 »), au lieu du seuil 60 %. Le rapport d'examen doit afficher un TDN par module, sans verdict global.
3. **Niveau** : TestDaF couvre B2–C1. Choisir `ExamBlueprint.level` (ex. C1) ou gérer une plage ; le contenu Apprendre proposé combine B2 et C1.
4. **Oral** : 7 tâches en monologue enregistré — déjà compatible avec le module Sprechen (enregistrement + transcription), mais prévoir un blueprint à 7 parties.

> Tant que les points 1–2 ne sont pas faits, le contenu TestDaF ne peut pas être assemblé en examen blanc dans l'app. Je peux implémenter ces évolutions quand tu veux.

Sources : [Goethe — TestDaF](https://www.goethe.de/ins/mm/en/spr/prf/testdaf/inf.html), [Ruhr-Universität Bochum — TestDaF](https://www.daf.ruhr-uni-bochum.de/testdaf/pruefung.html.en)
