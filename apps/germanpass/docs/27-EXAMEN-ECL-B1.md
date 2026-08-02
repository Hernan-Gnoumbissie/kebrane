# Blueprint d'examen blanc — ECL allemand B1

> Couche **examen** uniquement. Contenu Apprendre **mutualisé** : réutiliser [19-CURRICULUM-B1-GOETHE].
> Particularité ECL : **pas de section de grammaire isolée** (Sprachbausteine) — l'examen évalue la communication réelle sur 4 compétences. Mapping : `Passage` provider=ECL ; `WritingPrompt`/`SpeakingTask` provider=ECL ; `ExamBlueprint` provider=ECL, level=B1.

---

## 0. Format officiel ECL B1

| Partie | Compétences | Contenu |
|---|---|---|
| **Écrit** | Compréhension écrite (Lesen) + Production écrite (Schreiben) | Lesen : 2 tâches · Schreiben : 2 textes (≈ 2 types) |
| **Oral** | Compréhension orale (Hören) + Production orale (Sprechen) | Hören : 2 tâches · Sprechen : conversation guidée + image |

Pas de barème par « points » communiqué publiquement section par section : les 4 compétences pèsent à parts égales.

**Réussite (app) : moyenne ≥ 60 % ET chaque compétence ≥ 40 %.** Conforme à la logique `ECL` de `scoring.ts` (moyenne avec planchers à 40 %).

---

## 1. Banque LESEN (section=LESEN, provider=ECL) — 14 passages

| Tâche | Type | Format | Nb |
|---|---|---|---|
| Lesen 1 | texte → QCM de compréhension | mcq_single | 7 |
| Lesen 2 | association / informations | matching + true_false | 7 |

## 2. Banque HÖREN (section=HOEREN, provider=ECL) — 12 passages

| Tâche | Type | Écoutes | Format | Nb |
|---|---|---|---|---|
| Hören 1 | dialogue/quotidien | 1–2× | mcq_single | 6 |
| Hören 2 | monologue/info | 1–2× | true_false | 6 |

## 3. SCHREIBEN (`WritingPrompt`, provider=ECL, B1) — 6 consignes
2 types de texte (ex. lettre/message + court rapport/récit). Formats `LETTER_INFORMAL`, `FORUM_POST`. Critères : communication efficace, pertinence, correction (pas de grammaire isolée).

## 4. SPRECHEN (`SpeakingTask`, provider=ECL, B1) — 6 tâches
Conversation guidée + description/discussion à partir d'une image. Formats `DIALOGUE_ROLEPLAY`, `PICTURE_DESCRIPTION`.

## 5. Examen blanc (ExamBlueprint provider=ECL, level=B1) — 1 (→ 3)
Partie écrite (Lesen + Schreiben) et partie orale (Hören + Sprechen). Verdict : moyenne ≥ 60 % + chaque compétence ≥ 40 %.

## 6. Volumes
14 passages Lesen · 12 Hören · 6 consignes Schreiben · 6 tâches Sprechen · 1 examen blanc (→3). **Apprendre : réutilisé de B1.**

Source : [ECL Language tests (Wikipedia)](https://en.wikipedia.org/wiki/ECL_Language_tests)
