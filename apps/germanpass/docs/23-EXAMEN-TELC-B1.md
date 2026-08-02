# Blueprint d'examen blanc — telc Deutsch B1

> Couche **examen** uniquement. Le contenu d'apprentissage (Kapitel/leçons/flashcards) est **mutualisé** : réutiliser [19-CURRICULUM-B1-GOETHE] (le module Apprendre n'a pas de `provider`).
> Mapping : `Passage` taggé provider=TELC ; `WritingPrompt`/`SpeakingTask` provider=TELC ; `ExamBlueprint`/`MockExam` provider=TELC, level=B1.

---

## 0. Format officiel telc Deutsch B1

| Bloc | Durée | Parties | Points |
|---|---|---|---|
| **Leseverstehen** | (bloc écrit ~150 min) | 3 parties (idée générale, détails, association) | 75 |
| **Sprachbausteine** | inclus dans le bloc | Teil 1 : closure QCM (3 options/trou) · Teil 2 : banque de 15 mots → 10 trous | 30 |
| **Hörverstehen** | ~30 min | 3 parties | 75 |
| **Schreiben** | ~30 min | 1 lettre (Brief) guidée | 45 |
| **Mündliche Prüfung** (binôme) | ~15 min | Teil 1 se présenter · Teil 2 parler d'un thème · Teil 3 planifier ensemble | 75 |

**Réussite : ≥ 60 % à l'écrit (≥ 135/225) ET ≥ 60 % à l'oral (≥ 45/75).** Conforme à la logique `telc` de `scoring.ts` (écrit et oral validés séparément).

---

## 1. Banque LESEN (Passage, section=LESEN, provider=TELC) — 18 passages

| Élément | Type | Format (TaskFormat) | Nb |
|---|---|---|---|
| Leseverstehen T1 | texte → titres/idée | matching | 4 |
| Leseverstehen T2 | presse/blog → détails | mcq_single | 4 |
| Leseverstehen T3 | annonces ↔ personnes | matching | 4 |
| Sprachbausteine T1 | closure grammaticale | mcq_single | 3 |
| Sprachbausteine T2 | closure lexicale (banque de mots) | gap_fill | 3 |

## 2. Banque HÖREN (section=HOEREN, provider=TELC) — 12 passages

| Partie | Type | Écoutes | Format | Nb |
|---|---|---|---|---|
| Teil 1 | annonces/messages | 1× | true_false | 4 |
| Teil 2 | reportage/interview | 1× | mcq_single | 4 |
| Teil 3 | conversation quotidienne | 2× | true_false | 4 |

## 3. SCHREIBEN (`WritingPrompt`, provider=TELC, B1) — 6 consignes
Lettre guidée (3 points à traiter). Format `LETTER_INFORMAL`/`LETTER_FORMAL`. Critères : respect des points, cohérence, correction, registre.

## 4. SPRECHEN (`SpeakingTask`, provider=TELC, B1) — 6 jeux (×3 parties)
Teil 1 `PRESENTATION` (se présenter) · Teil 2 `PRESENTATION` (parler d'un thème) · Teil 3 `PLANNING_TASK` (planifier ensemble).

## 5. Examen blanc (ExamBlueprint provider=TELC, level=B1) — 1 (→ 3)
Sections LESEN(+Sprachbausteine) · HOEREN · SCHREIBEN · SPRECHEN, durées et barème ci-dessus. Verdict écrit/oral séparé (≥ 60 % chacun).

## 6. Volumes
18 passages Lesen · 12 Hören · 6 consignes Schreiben · 6 tâches Sprechen · 1 examen blanc (→3). **Apprendre : réutilisé de B1.**

Source : [telc Deutsch B1](https://www.telc.net/en/language-examinations/certificate-exams/german/certificate-german-telc-german-b1/)
