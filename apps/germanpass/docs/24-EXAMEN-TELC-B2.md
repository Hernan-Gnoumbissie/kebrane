# Blueprint d'examen blanc — telc Deutsch B2

> Couche **examen** uniquement. Contenu Apprendre **mutualisé** : réutiliser [20-CURRICULUM-B2-GOETHE].
> Mapping : `Passage` provider=TELC ; `WritingPrompt`/`SpeakingTask` provider=TELC ; `ExamBlueprint`/`MockExam` provider=TELC, level=B2.

---

## 0. Format officiel telc Deutsch B2

| Bloc | Durée | Parties | Points |
|---|---|---|---|
| **Leseverstehen + Sprachbausteine** | 90 min | 5 parties (3 lecture + 2 langue) | — |
| **Hörverstehen** | ~20 min | 3 parties | — |
| **Schreiben** | ~30 min | 1 tâche (choix entre 2 sujets) | — |
| Écrit total | ~140 min | | **225** |
| **Mündliche Prüfung** (binôme) | ~15 min (+20 prép.) | 3 parties (présentation, discussion, tâche commune) | **75** |

**Réussite : ≥ 60 % à l'écrit (≥ 135/225) ET ≥ 60 % à l'oral (≥ 45/75).** Conforme à la logique `telc` de `scoring.ts`.

---

## 1. Banque LESEN (section=LESEN, provider=TELC) — 20 passages

| Élément | Type | Format | Nb |
|---|---|---|---|
| Leseverstehen T1 | association titres ↔ extraits | matching | 4 |
| Leseverstehen T2 | article long → détails | mcq_single | 4 |
| Leseverstehen T3 | annonces/correspondances | matching | 4 |
| Sprachbausteine T1 | closure grammaticale | mcq_single | 4 |
| Sprachbausteine T2 | closure lexicale (banque) | gap_fill | 4 |

## 2. Banque HÖREN (section=HOEREN, provider=TELC) — 14 passages

| Partie | Type | Écoutes | Format | Nb |
|---|---|---|---|---|
| Teil 1 | interview/exposé | 1× | mcq_single | 5 |
| Teil 2 | conversation/débat | 1× | true_false | 5 |
| Teil 3 | extraits courts (radio) | 1× | matching | 4 |

## 3. SCHREIBEN (`WritingPrompt`, provider=TELC, B2) — 6 consignes
1 tâche au choix entre 2 sujets (lettre formelle / prise de position). Formats `LETTER_FORMAL`, `FORUM_POST`/`ESSAY`. Critères : contenu, structure, registre, correction.

## 4. SPRECHEN (`SpeakingTask`, provider=TELC, B2) — 6 jeux (×3 parties)
Teil 1 `PRESENTATION` · Teil 2 `DIALOGUE_ROLEPLAY` (discussion) · Teil 3 `PLANNING_TASK`.

## 5. Examen blanc (ExamBlueprint provider=TELC, level=B2) — 1 (→ 3)
Sections LESEN(+Sprachbausteine) · HOEREN · SCHREIBEN · SPRECHEN ; verdict écrit/oral séparé (≥ 60 % chacun).

## 6. Volumes
20 passages Lesen · 14 Hören · 6 consignes Schreiben · 6 tâches Sprechen · 1 examen blanc (→3). **Apprendre : réutilisé de B2.**

Source : [telc Deutsch B2](https://www.telc.net/en/language-examinations/certificate-exams/german/telc-german-b2/)
