# Blueprint de curriculum — Goethe-Zertifikat A1 (Start Deutsch 1)

> Document de conception (pilote). Sert de **gabarit** réplicable pour A2→C2 et les autres organismes (ÖSD, telc, ECL).
> Aucun contenu n'est généré ici : c'est le plan que tu valides AVANT toute génération IA.
> Mapping schéma : **Kapitel = `Course`** (level=A1, kind=GRAMMAR|VOCABULARY|REDEMITTEL) → **`Lesson`** → **`LessonExercise`**.
> Banques d'entraînement : **`Passage`** (Lesen/Hören) + **examen blanc** (`Exam`/blueprint).

---

## 0. Format officiel cible (à respecter par tout le contenu)

| Module | Durée | Structure officielle | Conséquence pour le contenu |
|---|---|---|---|
| **Hören** | 20 min | 3 parties, écoute de dialogues/messages/annonces | audios courts TTS (variétés DE/AT/CH), `maxListens` limité |
| **Lesen** | 25 min | 3 parties, 15 items (notes, annonces, panneaux) | textes courts authentiques-like, originaux |
| **Schreiben** | 20 min | 2 tâches (1 formulaire à compléter, 1 message court) | correction IA (critères) |
| **Sprechen** | 15 min | 3 parties (se présenter, demander/donner, demander/réagir) | enregistrement + transcription + métriques |

Seuil de réussite : 60 %. Validation d'un Kapitel dans l'app : **≥ 70 %** au mini-test de fin (`isChapterTest`).

---

## 1. Module APPRENDRE — Kapitel de GRAMMAIRE (kind = GRAMMAR)

10 Kapitel, ~3 leçons chacun, progression du plus simple au plus complexe.

| # | Kapitel | Leçons (titres indicatifs) |
|---|---|---|
| G1 | Alphabet, sons & nombres | L'alphabet et l'épellation · Les nombres 0–100 · Date, heure, prix |
| G2 | Articles & noms | der/die/das · Pluriel des noms · Article indéfini ein/eine |
| G3 | Pronoms personnels & sein/haben | ich/du/er… · sein au présent · haben au présent |
| G4 | Présent des verbes réguliers | Conjugaison régulière · Verbes en -ten/-den · Questions oui/non |
| G5 | Questions en W- | wer/was/wo/wann · wie/woher/wohin · Ordre des mots dans la question |
| G6 | Négation | nicht · kein/keine · Position de la négation |
| G7 | Verbes de modalité | können · möchten · müssen (ordre des mots, verbe à la fin) |
| G8 | Accusatif | Article défini à l'accusatif · Article indéfini à l'accusatif · Verbes + accusatif |
| G9 | Possessifs & impératif | mein/dein/sein… · Impératif (du/Sie) · Verbes à particule séparable |
| G10 | Prépositions de base | um/am/im (temps) · in/auf/bei (lieu courant) · Synthèse A1 |

Chaque leçon : `contentMd` en allemand niveaugerecht + `helpFr`/`helpEn` repliables + 6 à 10 exercices.
Dernière leçon de chaque Kapitel : inclut un **mini-test** (`isChapterTest = true`).

---

## 2. Module APPRENDRE — Kapitel de VOCABULAIRE (kind = VOCABULARY)

11 Kapitel calqués sur les thèmes A1, chacun adossé à un **VocabDeck** (flashcards SRS).

| # | Kapitel / Thème | Deck SRS (≈ cartes) |
|---|---|---|
| V1 | Person & Familie | 40 |
| V2 | Wohnen & Möbel | 40 |
| V3 | Essen & Trinken | 45 |
| V4 | Einkaufen & Geld | 40 |
| V5 | Tagesablauf & Zeit | 40 |
| V6 | Arbeit & Beruf | 40 |
| V7 | Freizeit & Hobbys | 40 |
| V8 | Körper & Gesundheit | 40 |
| V9 | Reisen & Verkehr | 40 |
| V10 | Wetter & Jahreszeiten | 30 |
| V11 | Kommunikation (Telefon, E-Mail) | 35 |

Total vocabulaire A1 ≈ **430 flashcards** (cohérent avec la Goethe-Wortliste A1, ~650 mots — on couvre le cœur actif).
Chaque Kapitel vocabulaire : 2 leçons (présentation + mise en contexte) + 6–8 exercices (matching, gap_fill, mcq).

---

## 3. Module APPRENDRE — Kapitel de REDEMITTEL (kind = REDEMITTEL)

8 Kapitel d'actes de parole (le cœur du Sprechen/Schreiben A1).

| # | Redemittel | Usage examen |
|---|---|---|
| R1 | Sich vorstellen / begrüßen | Sprechen Teil 1 |
| R2 | Nach Informationen fragen | Sprechen Teil 2 |
| R3 | Um etwas bitten / reagieren | Sprechen Teil 3 |
| R4 | Im Geschäft / einkaufen | Lesen, Sprechen |
| R5 | Im Restaurant / bestellen | Sprechen |
| R6 | Termine & Uhrzeit vereinbaren | Hören, Sprechen |
| R7 | Ein Formular ausfüllen | Schreiben Teil 1 |
| R8 | Eine kurze Nachricht schreiben | Schreiben Teil 2 |

Chaque Kapitel : 2 leçons + 6 exercices (ordering de dialogues, mcq de réplique adaptée, gap_fill).

---

## 4. Banque d'entraînement LESEN (Passage, section = LESEN)

Alignée sur les 3 parties officielles. Objectif pilote : **15 passages** (assez pour ne pas tourner en boucle).

| Partie | Type de texte | Format question | Nb passages |
|---|---|---|---|
| Teil 1 | 2 courriels/notes courts | true_false (richtig/falsch) | 5 |
| Teil 2 | Petites annonces / sites | mcq_single (a/b) | 5 |
| Teil 3 | Panneaux / instructions | true_false | 5 |

---

## 5. Banque d'entraînement HÖREN (Passage, section = HOEREN)

Audios générés en TTS, variétés DE/AT/CH, `maxListens` selon la partie. Objectif pilote : **12 passages**.

| Partie | Type d'audio | Écoutes | Format | Nb passages |
|---|---|---|---|---|
| Teil 1 | Mini-dialogues du quotidien | 2× | mcq_single | 5 |
| Teil 2 | Annonces publiques | 1× | true_false | 4 |
| Teil 3 | Messages téléphoniques | 2× | mcq_single | 3 |

---

## 6. Examen blanc Goethe A1 (1 modèle complet pour le pilote)

Un examen blanc complet respectant durées et barèmes officiels, généré à partir des banques ci-dessus + items dédiés.

- **Hören** 20 min · **Lesen** 25 min · **Schreiben** 20 min · **Sprechen** 15 min
- Rapport de résultats par module + verdict bestanden / nicht bestanden (seuil 60 %)
- Cible : **3 examens blancs** à terme pour la rotation (1 pour démarrer).

---

## 7. Récapitulatif des volumes — pilote A1

| Élément | Quantité pilote |
|---|---|
| Kapitel (Course) | 29 (10 G + 11 V + 8 R) |
| Leçons (Lesson) | ~70 |
| Exercices (LessonExercise) | ~450 |
| Flashcards (VocabDeck) | ~430 |
| Passages Lesen | 15 |
| Passages Hören | 12 |
| Examens blancs | 1 (→ 3) |

---

## 8. Process d'industrialisation (rappel)

1. **Valider ce blueprint** (toi) — ajuster Kapitel/volumes.
2. **Alimenter la bibliothèque RAG** — sources de référence A1 (Wortliste, spécifs format, progression grammaticale).
3. **Générer par lots** via le pipeline IA existant → statut DRAFT.
4. **Valider** dans « Générations IA » (relecture par une personne compétente en allemand) → PUBLISHED.
5. **Mesurer** coût IA réel + temps sur le pilote, puis dérouler A2→C2 et les autres organismes avec le même gabarit.

---

## 9. Décisions ouvertes (à trancher avant génération)

- Budget IA alloué au pilote (dimensionne le nombre d'items générables / mois).
- Voix/variétés TTS retenues pour Hören.
- Qui assure la relecture/validation avant publication.
- Faut-il helpFr + helpEn systématiquement, ou helpFr seul au départ ?
