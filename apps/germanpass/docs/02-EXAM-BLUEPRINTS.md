# 02 — Blueprints d'examens

22 blueprints seedés (`prisma/blueprints.ts`), version 1. Seules les **structures pédagogiques publiques** sont modélisées (parties, formats, durées, barèmes). Aucun contenu officiel n'est reproduit (cf. 14-LEGAL.md).

> ⚠️ **À re-vérifier avant publication** sur les sites officiels (goethe.de, osd.at, telc.net, ecl-test.com) — champ `sourcesNote` par blueprint, `version` à incrémenter à chaque ajustement (ADR-006). Les structures seedées sont des approximations raisonnables des formats publics et doivent être confirmées.

## Synthèse des règles de réussite (scoringRules)
| Provider | Règle | Encodage |
|---|---|---|
| Goethe (et ÖSD ZB1) | ≥ 60 % **par module** (B1+ modulaires) | `modular: true, perSectionThresholdPct: 60` |
| ÖSD (hors ZB1) | total ≥ 60 %, plancher 50 % par épreuve | `perSectionThresholdPct: 50` |
| TELC | ≥ 60 % écrit ET ≥ 60 % oral (notés séparément) | `oralSeparate: true` |
| ECL | moyenne ≥ 60 % ET ≥ 40 % par compétence ; pas de QCM grammaire isolé | `perSkillMinPct: 40, averageAcrossSkills: true` |

## Format JSON `structure`
```json
{ "sections": [ { "section": "HOEREN", "durationMin": 40,
    "parts": [ { "partNumber": 1, "taskFormat": "MCQ_SINGLE",
                 "itemCount": 10, "points": 10, "maxListens": 2 } ] } ] }
```
`maxListens` (1 ou 2) est porté par partie ; le décompte effectif est réalisé serveur via `ListenEvent`.

## Couverture
- **Goethe** : A1 (Start Deutsch 1), A2, B1 (modulaire), B2 (modulaire 2019), C1 (modulaire 2024), C2 (GDS)
- **ÖSD** : ZA1, ZA2, ZB1 (coop. Goethe), ZB2, ZC1, ZC2 — variétés audio `de|at|ch` (champ `Passage.variety`)
- **TELC** : A1, A2, B1 (Zertifikat Deutsch, 300 pts), B2, C1, C1 Hochschule (variant `hochschule`)
- **ECL** : A2, B1, B2, C1 (pas de A1/C2)

## Procédure de mise à jour
1. Consulter le Modellsatz/Übungstest officiel du provider.
2. Créer un blueprint `version: n+1` (l'ancien reste lié aux tentatives passées).
3. Mettre à jour `sourcesNote` avec l'URL consultée et la date.
