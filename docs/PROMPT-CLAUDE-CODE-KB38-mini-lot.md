# Consigne Claude Code — KB-38 : mini-lot de contenu de démo A1 (local)

> À coller à la racine du monorepo `kebrane/`. Objectif : peupler la base **de dev locale**
> avec le strict minimum pour que chaque écran vitrine soit plein, puis débloquer les
> captures KB-36. **Contenu de démonstration** — pas la bibliothèque complète.
> Référence de périmètre : `apps/germanpass/docs/17-CURRICULUM-A1-GOETHE.md` (blueprint A1)
> et le ticket **KB-38** de `docs/PLATFORM-TICKETS.md`.

## 0. Prérequis à vérifier AVANT de générer
- Base + Redis up (`docker compose up -d` du stack GermanPass) et migrations à jour.
- `apps/germanpass/.env` : **`AI_API_KEY`** présent + budget suffisant ; `AI_BASE_URL`,
  `AI_MODEL_GENERATION`, `VISION_MODEL`, `TTS_MODEL` renseignés.
- **Accès admin local** opérationnel (celui utilisé pour les tests jusqu'ici).
- Confirmer le coût : c'est un **petit** lot, mais la génération consomme de l'IA réelle.
  S'arrêter et prévenir si un garde-fou de budget bloque.

## 1. (Recommandé) Alimenter la bibliothèque RAG
- Ingérer 1–2 sources de référence A1 **publiques et libres de droits** via
  `/api/admin/documents` (ex. Goethe-Wortliste A1, spéc. de format Start Deutsch 1).
  Améliore l'ancrage et réduit les hallucinations. Optionnel pour une démo, utile pour la qualité.

## 2. Générer le mini-lot (statut DRAFT), via les endpoints admin existants
Un exemplaire de chaque, pour remplir chaque écran une fois :
- **1 Course GRAMMAIRE** (G1 « Alphabet, sons & nombres ») → `POST /api/admin/courses`,
  puis **3 leçons** via `POST /api/admin/lessons/generate` (dont la dernière `isChapterTest`),
  ~8 exercices au total. **helpFr seul** suffit pour la démo.
- **1 Course VOCABULAIRE** (V1 « Person & Familie ») + **VocabDeck ~40 flashcards**.
- **1 Course REDEMITTEL** (R1 « Sich vorstellen ») : 2 leçons + 6 exercices.
- **Lesen** : 3 passages (1 par Teil) via `/api/admin/passages` (`generatePassage`).
- **Hören** : 2 passages + **audio TTS** via `/api/admin/audio-jobs` (une seule voix,
  variété au choix).
- **1 sujet Schreiben** (`/api/admin/writing-prompts`) + **1 tâche Sprechen**
  (`/api/admin/speaking-tasks`).
- **1 examen blanc A1** complet via `/api/admin/mock-exams` (respecter durées/barèmes A1).

## 3. Relire puis publier
- Passer par « Générations IA » (`/api/admin/generations`) : **relecture** des DRAFT.
- ⚠ Corriger toute **faute d'allemand visible** — ce contenu apparaîtra sur des captures.
  Claude Code relit l'allemand généré ; signaler tout doute plutôt que publier à l'aveugle.
- Faire passer les items validés en **PUBLISHED**.

## 4. Une tentative de démo (pour remplir /progress)
- Dérouler une fois l'examen blanc (ou une tentative partielle) avec un compte de test, afin
  qu'`/progress` affiche un rapport réel plutôt qu'un état vide.

## 5. Captures (enchaîne sur KB-36)
- Écrans à photographier une fois pleins : une **leçon**, la **liste d'exercices**, les
  **flashcards**, `/exams`, `/practice/schreiben`, `/practice/sprechen`, `/progress`.
- Utiliser l'outillage Playwright déjà en place (cf. KB-36).

## 6. Rapport attendu
- Ce qui a été généré (comptage par type), **coût IA réel** mesuré, temps passé,
  fautes corrigées, et les captures produites. Mettre à jour **KB-38** et **KB-36** dans
  `docs/PLATFORM-TICKETS.md`. **Rien à déployer.**
