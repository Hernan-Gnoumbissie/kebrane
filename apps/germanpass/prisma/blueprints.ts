/**
 * Blueprints d'examens — structures pédagogiques PUBLIQUES (nombre de parties,
 * types de tâches, durées, barèmes) telles que publiées par les organismes.
 * AUCUN contenu officiel n'est reproduit.
 *
 * ⚠️ À re-vérifier contre les sites officiels avant publication (cf. ADR-006,
 * docs/02-EXAM-BLUEPRINTS.md). Champ `version` incrémenté à chaque ajustement.
 */

export type BlueprintPart = {
  partNumber: number;
  taskFormat: string;
  itemCount: number;
  points: number;
  maxListens?: number;
};

export type BlueprintSection = {
  section: "LESEN" | "HOEREN" | "SCHREIBEN" | "SPRECHEN";
  durationMin: number;
  parts: BlueprintPart[];
};

export type ScoringRules = {
  /** Seuil global de réussite en % */
  passThresholdPct: number;
  /** Examen modulaire : chaque module doit atteindre le seuil séparément */
  modular: boolean;
  /** Seuil par module/section si modulaire ou exigé */
  perSectionThresholdPct?: number;
  /** ECL : minimum par compétence (40 %) avec moyenne ≥ 60 % */
  perSkillMinPct?: number;
  /** ECL : moyenne calculée sur l'ensemble des compétences */
  averageAcrossSkills?: boolean;
  /** TELC : l'oral est noté séparément de l'écrit */
  oralSeparate?: boolean;
  /** TestDaF : notation TDN par module (pas de réussite/échec global) */
  tdn?: boolean;
  /** TestDaF : seuils % → TDN 3/4/5 */
  tdnThresholds?: { tdn3: number; tdn4: number; tdn5: number };
  rounding: "half_up";
};

export type BlueprintSeed = {
  provider: "GOETHE" | "OSD" | "TELC" | "ECL" | "TESTDAF";
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  variant: string;
  title: string;
  structure: { sections: BlueprintSection[] };
  scoringRules: ScoringRules;
  sourcesNote: string;
};

const P = (
  partNumber: number,
  taskFormat: string,
  itemCount: number,
  points: number,
  maxListens?: number
): BlueprintPart => ({ partNumber, taskFormat, itemCount, points, ...(maxListens ? { maxListens } : {}) });

const S = (
  section: BlueprintSection["section"],
  durationMin: number,
  parts: BlueprintPart[]
): BlueprintSection => ({ section, durationMin, parts });

const GOETHE_SCORING: ScoringRules = {
  passThresholdPct: 60,
  modular: false,
  rounding: "half_up",
};
const GOETHE_MODULAR: ScoringRules = {
  passThresholdPct: 60,
  modular: true,
  perSectionThresholdPct: 60,
  rounding: "half_up",
};
const OSD_SCORING: ScoringRules = {
  passThresholdPct: 60,
  modular: false,
  perSectionThresholdPct: 50,
  rounding: "half_up",
};
const TELC_SCORING: ScoringRules = {
  passThresholdPct: 60,
  modular: false,
  oralSeparate: true,
  rounding: "half_up",
};
const ECL_SCORING: ScoringRules = {
  passThresholdPct: 60,
  modular: false,
  perSkillMinPct: 40,
  averageAcrossSkills: true,
  rounding: "half_up",
};
const TESTDAF_SCORING: ScoringRules = {
  passThresholdPct: 0, // sans objet : notation en TDN, pas de seuil global
  modular: false,
  tdn: true,
  tdnThresholds: { tdn3: 40, tdn4: 60, tdn5: 80 },
  rounding: "half_up",
};

export const BLUEPRINTS: BlueprintSeed[] = [
  // ====================== GOETHE ======================
  {
    provider: "GOETHE",
    level: "A1",
    variant: "standard",
    title: "Goethe-Zertifikat A1: Start Deutsch 1",
    structure: {
      sections: [
        S("HOEREN", 20, [
          P(1, "MCQ_SINGLE", 6, 6, 2),
          P(2, "TRUE_FALSE", 4, 4, 1),
          P(3, "MCQ_SINGLE", 5, 5, 2),
        ]),
        S("LESEN", 25, [
          P(1, "TRUE_FALSE", 5, 5),
          P(2, "MCQ_SINGLE", 5, 5),
          P(3, "TRUE_FALSE", 5, 5),
        ]),
        S("SCHREIBEN", 20, [
          P(1, "GAP_FILL", 5, 5),
          P(2, "LETTER_INFORMAL", 1, 10),
        ]),
        S("SPRECHEN", 15, [
          P(1, "PRESENTATION", 1, 3),
          P(2, "DIALOGUE_ROLEPLAY", 1, 6),
          P(3, "DIALOGUE_ROLEPLAY", 1, 6),
        ]),
      ],
    },
    scoringRules: GOETHE_SCORING,
    sourcesNote: "Structure publique goethe.de (Modellsatz A1) — à re-vérifier avant publication",
  },
  {
    provider: "GOETHE",
    level: "A2",
    variant: "standard",
    title: "Goethe-Zertifikat A2",
    structure: {
      sections: [
        S("LESEN", 30, [
          P(1, "MCQ_SINGLE", 5, 5),
          P(2, "MCQ_SINGLE", 5, 5),
          P(3, "MCQ_SINGLE", 5, 5),
          P(4, "MATCHING", 5, 5),
        ]),
        S("HOEREN", 30, [
          P(1, "MCQ_SINGLE", 5, 5, 2),
          P(2, "MATCHING", 5, 5, 1),
          P(3, "MCQ_SINGLE", 5, 5, 1),
          P(4, "MCQ_SINGLE", 5, 5, 2),
        ]),
        S("SCHREIBEN", 30, [
          P(1, "LETTER_INFORMAL", 1, 10),
          P(2, "LETTER_FORMAL", 1, 10),
        ]),
        S("SPRECHEN", 15, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 8),
          P(2, "PRESENTATION", 1, 8),
          P(3, "PLANNING_TASK", 1, 9),
        ]),
      ],
    },
    scoringRules: GOETHE_SCORING,
    sourcesNote: "Structure publique goethe.de (Modellsatz A2) — à re-vérifier",
  },
  {
    provider: "GOETHE",
    level: "B1",
    variant: "standard",
    title: "Goethe-Zertifikat B1 (modulaire)",
    structure: {
      sections: [
        S("LESEN", 65, [
          P(1, "TRUE_FALSE", 6, 6),
          P(2, "MCQ_SINGLE", 6, 6),
          P(3, "MATCHING", 7, 7),
          P(4, "TRUE_FALSE", 7, 7),
          P(5, "MCQ_SINGLE", 4, 4),
        ]),
        S("HOEREN", 40, [
          P(1, "MCQ_SINGLE", 10, 10, 2),
          P(2, "MCQ_SINGLE", 5, 5, 1),
          P(3, "TRUE_FALSE", 7, 7, 1),
          P(4, "MCQ_SINGLE", 8, 8, 2),
        ]),
        S("SCHREIBEN", 60, [
          P(1, "LETTER_INFORMAL", 1, 40),
          P(2, "FORUM_POST", 1, 40),
          P(3, "LETTER_FORMAL", 1, 20),
        ]),
        S("SPRECHEN", 15, [
          P(1, "PLANNING_TASK", 1, 28),
          P(2, "PRESENTATION", 1, 40),
          P(3, "DIALOGUE_ROLEPLAY", 1, 32),
        ]),
      ],
    },
    scoringRules: GOETHE_MODULAR,
    sourcesNote: "Modules certifiables séparément ; ≥60 % par module. goethe.de Modellsatz B1 — à re-vérifier",
  },
  {
    provider: "GOETHE",
    level: "B2",
    variant: "standard",
    title: "Goethe-Zertifikat B2 (modulaire)",
    structure: {
      sections: [
        S("LESEN", 65, [
          P(1, "MATCHING", 9, 9),
          P(2, "MCQ_SINGLE", 6, 6),
          P(3, "MATCHING", 6, 6),
          P(4, "GAP_FILL", 6, 6),
          P(5, "MCQ_SINGLE", 3, 3),
        ]),
        S("HOEREN", 40, [
          P(1, "TRUE_FALSE", 5, 5, 1),
          P(2, "MCQ_SINGLE", 6, 6, 2),
          P(3, "MCQ_SINGLE", 6, 6, 1),
          P(4, "MATCHING", 8, 8, 2),
        ]),
        S("SCHREIBEN", 75, [
          P(1, "FORUM_POST", 1, 60),
          P(2, "LETTER_FORMAL", 1, 40),
        ]),
        S("SPRECHEN", 15, [
          P(1, "PRESENTATION", 1, 44),
          P(2, "DIALOGUE_ROLEPLAY", 1, 40),
        ]),
      ],
    },
    scoringRules: GOETHE_MODULAR,
    sourcesNote: "goethe.de Modellsatz B2 (format 2019) — à re-vérifier",
  },
  {
    provider: "GOETHE",
    level: "C1",
    variant: "standard",
    title: "Goethe-Zertifikat C1 (modulaire, format 2024)",
    structure: {
      sections: [
        S("LESEN", 65, [
          P(1, "MCQ_SINGLE", 6, 6),
          P(2, "MATCHING", 6, 6),
          P(3, "GAP_FILL", 6, 6),
          P(4, "MATCHING", 6, 6),
          P(5, "MCQ_SINGLE", 6, 6),
        ]),
        S("HOEREN", 40, [
          P(1, "MCQ_SINGLE", 6, 6, 1),
          P(2, "MCQ_SINGLE", 8, 8, 2),
          P(3, "MATCHING", 6, 6, 1),
          P(4, "TRUE_FALSE", 8, 8, 2),
        ]),
        S("SCHREIBEN", 75, [
          P(1, "ESSAY", 1, 60),
          P(2, "LETTER_FORMAL", 1, 40),
        ]),
        S("SPRECHEN", 20, [
          P(1, "PRESENTATION", 1, 50),
          P(2, "DIALOGUE_ROLEPLAY", 1, 50),
        ]),
      ],
    },
    scoringRules: GOETHE_MODULAR,
    sourcesNote: "Nouveau format modulaire 2024 — goethe.de — à re-vérifier",
  },
  {
    provider: "GOETHE",
    level: "C2",
    variant: "standard",
    title: "Goethe-Zertifikat C2: Großes Deutsches Sprachdiplom (GDS)",
    structure: {
      sections: [
        S("LESEN", 80, [
          P(1, "MCQ_SINGLE", 10, 10),
          P(2, "MATCHING", 10, 10),
          P(3, "GAP_FILL", 10, 10),
        ]),
        S("HOEREN", 35, [
          P(1, "MCQ_SINGLE", 10, 10, 1),
          P(2, "MCQ_SINGLE", 10, 10, 1),
          P(3, "MATCHING", 5, 5, 2),
        ]),
        S("SCHREIBEN", 80, [
          P(1, "GAP_FILL", 10, 10),
          P(2, "ESSAY", 1, 90),
        ]),
        S("SPRECHEN", 15, [
          P(1, "PRESENTATION", 1, 50),
          P(2, "DIALOGUE_ROLEPLAY", 1, 50),
        ]),
      ],
    },
    scoringRules: GOETHE_MODULAR,
    sourcesNote: "GDS modulaire — goethe.de — à re-vérifier",
  },

  // ====================== ÖSD ======================
  {
    provider: "OSD",
    level: "A1",
    variant: "standard",
    title: "ÖSD Zertifikat A1 (ZA1)",
    structure: {
      sections: [
        S("LESEN", 25, [
          P(1, "TRUE_FALSE", 5, 5),
          P(2, "MCQ_SINGLE", 5, 5),
          P(3, "MATCHING", 5, 5),
        ]),
        S("HOEREN", 15, [
          P(1, "MCQ_SINGLE", 5, 5, 2),
          P(2, "TRUE_FALSE", 5, 5, 2),
          P(3, "MCQ_SINGLE", 5, 5, 2),
        ]),
        S("SCHREIBEN", 20, [
          P(1, "GAP_FILL", 5, 5),
          P(2, "LETTER_INFORMAL", 1, 10),
        ]),
        S("SPRECHEN", 10, [
          P(1, "PRESENTATION", 1, 5),
          P(2, "DIALOGUE_ROLEPLAY", 1, 5),
          P(3, "DIALOGUE_ROLEPLAY", 1, 5),
        ]),
      ],
    },
    scoringRules: OSD_SCORING,
    sourcesNote: "osd.at Modellprüfung ZA1 — variétés de/at/ch dans les audios — à re-vérifier",
  },
  {
    provider: "OSD",
    level: "A2",
    variant: "standard",
    title: "ÖSD Zertifikat A2 (ZA2)",
    structure: {
      sections: [
        S("LESEN", 30, [
          P(1, "MATCHING", 5, 5),
          P(2, "TRUE_FALSE", 5, 5),
          P(3, "MCQ_SINGLE", 5, 5),
        ]),
        S("HOEREN", 15, [
          P(1, "MCQ_SINGLE", 5, 5, 2),
          P(2, "TRUE_FALSE", 5, 5, 2),
        ]),
        S("SCHREIBEN", 30, [
          P(1, "LETTER_INFORMAL", 1, 10),
          P(2, "LETTER_FORMAL", 1, 10),
        ]),
        S("SPRECHEN", 10, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 10),
          P(2, "PICTURE_DESCRIPTION", 1, 10),
          P(3, "PLANNING_TASK", 1, 10),
        ]),
      ],
    },
    scoringRules: OSD_SCORING,
    sourcesNote: "osd.at Modellprüfung ZA2 — à re-vérifier",
  },
  {
    provider: "OSD",
    level: "B1",
    variant: "standard",
    title: "ÖSD Zertifikat B1 (ZB1, coopération Goethe)",
    structure: {
      sections: [
        S("LESEN", 65, [
          P(1, "TRUE_FALSE", 6, 6),
          P(2, "MCQ_SINGLE", 6, 6),
          P(3, "MATCHING", 7, 7),
          P(4, "TRUE_FALSE", 7, 7),
          P(5, "MCQ_SINGLE", 4, 4),
        ]),
        S("HOEREN", 40, [
          P(1, "MCQ_SINGLE", 10, 10, 2),
          P(2, "MCQ_SINGLE", 5, 5, 1),
          P(3, "TRUE_FALSE", 7, 7, 1),
          P(4, "MCQ_SINGLE", 8, 8, 2),
        ]),
        S("SCHREIBEN", 60, [
          P(1, "LETTER_INFORMAL", 1, 40),
          P(2, "FORUM_POST", 1, 40),
          P(3, "LETTER_FORMAL", 1, 20),
        ]),
        S("SPRECHEN", 15, [
          P(1, "PLANNING_TASK", 1, 28),
          P(2, "PRESENTATION", 1, 40),
          P(3, "DIALOGUE_ROLEPLAY", 1, 32),
        ]),
      ],
    },
    scoringRules: GOETHE_MODULAR,
    sourcesNote: "ZB1 développé conjointement avec Goethe — même structure modulaire — à re-vérifier",
  },
  {
    provider: "OSD",
    level: "B2",
    variant: "standard",
    title: "ÖSD Zertifikat B2 (ZB2)",
    structure: {
      sections: [
        S("LESEN", 90, [
          P(1, "MATCHING", 5, 5),
          P(2, "MCQ_SINGLE", 5, 5),
          P(3, "TRUE_FALSE", 5, 5),
          P(4, "GAP_FILL", 10, 10),
        ]),
        S("HOEREN", 30, [
          P(1, "MATCHING", 5, 5, 2),
          P(2, "MCQ_SINGLE", 5, 5, 1),
        ]),
        S("SCHREIBEN", 90, [
          P(1, "LETTER_FORMAL", 1, 15),
          P(2, "ESSAY", 1, 15),
        ]),
        S("SPRECHEN", 15, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 10),
          P(2, "PRESENTATION", 1, 10),
          P(3, "DIALOGUE_ROLEPLAY", 1, 10),
        ]),
      ],
    },
    scoringRules: OSD_SCORING,
    sourcesNote: "osd.at Modellprüfung ZB2 — à re-vérifier",
  },
  {
    provider: "OSD",
    level: "C1",
    variant: "standard",
    title: "ÖSD Zertifikat C1 (ZC1)",
    structure: {
      sections: [
        S("LESEN", 90, [
          P(1, "MATCHING", 5, 5),
          P(2, "MCQ_SINGLE", 5, 5),
          P(3, "GAP_FILL", 10, 10),
          P(4, "MATCHING", 5, 5),
        ]),
        S("HOEREN", 40, [
          P(1, "MATCHING", 5, 5, 2),
          P(2, "MCQ_SINGLE", 5, 5, 1),
        ]),
        S("SCHREIBEN", 90, [
          P(1, "ESSAY", 1, 15),
          P(2, "LETTER_FORMAL", 1, 15),
        ]),
        S("SPRECHEN", 20, [
          P(1, "PRESENTATION", 1, 10),
          P(2, "DIALOGUE_ROLEPLAY", 1, 10),
          P(3, "PLANNING_TASK", 1, 10),
        ]),
      ],
    },
    scoringRules: OSD_SCORING,
    sourcesNote: "osd.at Modellprüfung ZC1 — à re-vérifier",
  },
  {
    provider: "OSD",
    level: "C2",
    variant: "standard",
    title: "ÖSD Zertifikat C2 (ZC2)",
    structure: {
      sections: [
        S("LESEN", 90, [
          P(1, "MATCHING", 5, 5),
          P(2, "MCQ_SINGLE", 10, 10),
          P(3, "GAP_FILL", 10, 10),
        ]),
        S("HOEREN", 40, [
          P(1, "MCQ_SINGLE", 5, 5, 1),
          P(2, "MATCHING", 5, 5, 2),
        ]),
        S("SCHREIBEN", 90, [
          P(1, "ESSAY", 1, 15),
          P(2, "LETTER_FORMAL", 1, 15),
        ]),
        S("SPRECHEN", 20, [
          P(1, "PRESENTATION", 1, 10),
          P(2, "DIALOGUE_ROLEPLAY", 1, 10),
        ]),
      ],
    },
    scoringRules: OSD_SCORING,
    sourcesNote: "osd.at ZC2 — à re-vérifier",
  },

  // ====================== TELC ======================
  {
    provider: "TELC",
    level: "A1",
    variant: "standard",
    title: "telc Deutsch A1 (Start Deutsch 1)",
    structure: {
      sections: [
        S("HOEREN", 20, [
          P(1, "MCQ_SINGLE", 6, 6, 2),
          P(2, "TRUE_FALSE", 4, 4, 1),
          P(3, "MCQ_SINGLE", 5, 5, 2),
        ]),
        S("LESEN", 25, [
          P(1, "TRUE_FALSE", 5, 5),
          P(2, "MCQ_SINGLE", 5, 5),
          P(3, "TRUE_FALSE", 5, 5),
        ]),
        S("SCHREIBEN", 20, [
          P(1, "GAP_FILL", 5, 5),
          P(2, "LETTER_INFORMAL", 1, 10),
        ]),
        S("SPRECHEN", 15, [
          P(1, "PRESENTATION", 1, 5),
          P(2, "DIALOGUE_ROLEPLAY", 1, 5),
          P(3, "DIALOGUE_ROLEPLAY", 1, 5),
        ]),
      ],
    },
    scoringRules: TELC_SCORING,
    sourcesNote: "telc.net Übungstest A1 — à re-vérifier",
  },
  {
    provider: "TELC",
    level: "A2",
    variant: "standard",
    title: "telc Deutsch A2 (Start Deutsch 2)",
    structure: {
      sections: [
        S("HOEREN", 20, [
          P(1, "TRUE_FALSE", 5, 5, 1),
          P(2, "TRUE_FALSE", 5, 5, 1),
          P(3, "MCQ_SINGLE", 5, 5, 2),
        ]),
        S("LESEN", 50, [
          P(1, "MATCHING", 5, 5),
          P(2, "MCQ_SINGLE", 5, 5),
          P(3, "MATCHING", 5, 5),
        ]),
        S("SCHREIBEN", 30, [P(1, "LETTER_INFORMAL", 1, 15)]),
        S("SPRECHEN", 15, [
          P(1, "PRESENTATION", 1, 6),
          P(2, "DIALOGUE_ROLEPLAY", 1, 6),
          P(3, "PLANNING_TASK", 1, 6),
        ]),
      ],
    },
    scoringRules: TELC_SCORING,
    sourcesNote: "telc.net Übungstest A2 — à re-vérifier",
  },
  {
    provider: "TELC",
    level: "B1",
    variant: "standard",
    title: "telc Deutsch B1 (Zertifikat Deutsch)",
    structure: {
      sections: [
        S("LESEN", 90, [
          P(1, "MATCHING", 5, 25),
          P(2, "MCQ_SINGLE", 5, 25),
          P(3, "MATCHING", 10, 25),
          P(4, "MCQ_SINGLE", 10, 15),
          P(5, "GAP_FILL", 10, 15),
        ]),
        S("HOEREN", 30, [
          P(1, "TRUE_FALSE", 5, 25, 1),
          P(2, "TRUE_FALSE", 10, 25, 1),
          P(3, "TRUE_FALSE", 5, 25, 2),
        ]),
        S("SCHREIBEN", 30, [P(1, "LETTER_FORMAL", 1, 45)]),
        S("SPRECHEN", 15, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 25),
          P(2, "PRESENTATION", 1, 25),
          P(3, "PLANNING_TASK", 1, 25),
        ]),
      ],
    },
    scoringRules: TELC_SCORING,
    sourcesNote: "telc.net Übungstest Zertifikat Deutsch B1 — barème 300 pts (écrit 225 + oral 75), réussite 60 % par partie — à re-vérifier",
  },
  {
    provider: "TELC",
    level: "B2",
    variant: "standard",
    title: "telc Deutsch B2",
    structure: {
      sections: [
        S("LESEN", 90, [
          P(1, "MATCHING", 5, 25),
          P(2, "MCQ_SINGLE", 5, 25),
          P(3, "MATCHING", 12, 24),
          P(4, "GAP_FILL", 22, 30),
        ]),
        S("HOEREN", 20, [
          P(1, "TRUE_FALSE", 5, 25, 1),
          P(2, "TRUE_FALSE", 10, 25, 1),
          P(3, "TRUE_FALSE", 5, 25, 1),
        ]),
        S("SCHREIBEN", 30, [P(1, "LETTER_FORMAL", 1, 45)]),
        S("SPRECHEN", 15, [
          P(1, "PRESENTATION", 1, 25),
          P(2, "DIALOGUE_ROLEPLAY", 1, 25),
          P(3, "PLANNING_TASK", 1, 25),
        ]),
      ],
    },
    scoringRules: TELC_SCORING,
    sourcesNote: "telc.net Übungstest B2 — à re-vérifier",
  },
  {
    provider: "TELC",
    level: "C1",
    variant: "standard",
    title: "telc Deutsch C1",
    structure: {
      sections: [
        S("LESEN", 90, [
          P(1, "MATCHING", 6, 12),
          P(2, "MCQ_SINGLE", 6, 12),
          P(3, "MATCHING", 6, 12),
          P(4, "GAP_FILL", 10, 12),
        ]),
        S("HOEREN", 40, [
          P(1, "MATCHING", 8, 16, 1),
          P(2, "MCQ_SINGLE", 10, 20, 1),
          P(3, "TRUE_FALSE", 6, 12, 1),
        ]),
        S("SCHREIBEN", 70, [P(1, "ESSAY", 1, 48)]),
        S("SPRECHEN", 16, [
          P(1, "PRESENTATION", 1, 16),
          P(2, "DIALOGUE_ROLEPLAY", 1, 16),
          P(3, "PLANNING_TASK", 1, 16),
        ]),
      ],
    },
    scoringRules: TELC_SCORING,
    sourcesNote: "telc.net Übungstest C1 — à re-vérifier",
  },
  {
    provider: "TELC",
    level: "C1",
    variant: "hochschule",
    title: "telc Deutsch C1 Hochschule",
    structure: {
      sections: [
        S("LESEN", 90, [
          P(1, "MATCHING", 6, 12),
          P(2, "MCQ_SINGLE", 6, 12),
          P(3, "MATCHING", 6, 12),
          P(4, "GAP_FILL", 10, 12),
        ]),
        S("HOEREN", 40, [
          P(1, "MATCHING", 8, 16, 1),
          P(2, "MCQ_SINGLE", 10, 20, 1),
          P(3, "TRUE_FALSE", 6, 12, 1),
        ]),
        S("SCHREIBEN", 70, [P(1, "ESSAY", 1, 48)]),
        S("SPRECHEN", 16, [
          P(1, "PRESENTATION", 1, 16),
          P(2, "DIALOGUE_ROLEPLAY", 1, 16),
          P(3, "PLANNING_TASK", 1, 16),
        ]),
      ],
    },
    scoringRules: TELC_SCORING,
    sourcesNote: "Variante Hochschule (contexte académique) — telc.net — à re-vérifier",
  },

  // ====================== ECL ======================
  // ECL : pas de A1/C2 ; 2 compétences écrites + 2 orales ;
  // réussite : moyenne ≥ 60 % ET ≥ 40 % par compétence ; pas de QCM grammaire isolé.
  {
    provider: "ECL",
    level: "A2",
    variant: "standard",
    title: "ECL Deutsch A2",
    structure: {
      sections: [
        S("LESEN", 35, [P(1, "MATCHING", 10, 10), P(2, "MCQ_SINGLE", 10, 10)]),
        S("HOEREN", 25, [P(1, "MATCHING", 10, 10, 2), P(2, "MCQ_SINGLE", 10, 10, 2)]),
        S("SCHREIBEN", 40, [P(1, "LETTER_INFORMAL", 1, 10), P(2, "LETTER_INFORMAL", 1, 10)]),
        S("SPRECHEN", 10, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 5),
          P(2, "PICTURE_DESCRIPTION", 1, 10),
          P(3, "DIALOGUE_ROLEPLAY", 1, 10),
        ]),
      ],
    },
    scoringRules: ECL_SCORING,
    sourcesNote: "ecl-test.com structure publique A2 — à re-vérifier",
  },
  {
    provider: "ECL",
    level: "B1",
    variant: "standard",
    title: "ECL Deutsch B1",
    structure: {
      sections: [
        S("LESEN", 45, [P(1, "MATCHING", 10, 10), P(2, "GAP_FILL", 10, 10)]),
        S("HOEREN", 25, [P(1, "MCQ_SINGLE", 10, 10, 2), P(2, "GAP_FILL", 10, 10, 2)]),
        S("SCHREIBEN", 50, [P(1, "LETTER_INFORMAL", 1, 10), P(2, "LETTER_FORMAL", 1, 10)]),
        S("SPRECHEN", 15, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 5),
          P(2, "PICTURE_DESCRIPTION", 1, 10),
          P(3, "DIALOGUE_ROLEPLAY", 1, 10),
        ]),
      ],
    },
    scoringRules: ECL_SCORING,
    sourcesNote: "ecl-test.com structure publique B1 — à re-vérifier",
  },
  {
    provider: "ECL",
    level: "B2",
    variant: "standard",
    title: "ECL Deutsch B2",
    structure: {
      sections: [
        S("LESEN", 45, [P(1, "MATCHING", 10, 10), P(2, "GAP_FILL", 10, 10)]),
        S("HOEREN", 30, [P(1, "MCQ_SINGLE", 10, 10, 2), P(2, "GAP_FILL", 10, 10, 2)]),
        S("SCHREIBEN", 75, [P(1, "ESSAY", 1, 10), P(2, "LETTER_FORMAL", 1, 10)]),
        S("SPRECHEN", 20, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 5),
          P(2, "PICTURE_DESCRIPTION", 1, 10),
          P(3, "DIALOGUE_ROLEPLAY", 1, 10),
        ]),
      ],
    },
    scoringRules: ECL_SCORING,
    sourcesNote: "ecl-test.com structure publique B2 — à re-vérifier",
  },
  {
    provider: "ECL",
    level: "C1",
    variant: "standard",
    title: "ECL Deutsch C1",
    structure: {
      sections: [
        S("LESEN", 45, [P(1, "MATCHING", 10, 10), P(2, "GAP_FILL", 10, 10)]),
        S("HOEREN", 30, [P(1, "MCQ_SINGLE", 10, 10, 2), P(2, "GAP_FILL", 10, 10, 2)]),
        S("SCHREIBEN", 90, [P(1, "ESSAY", 1, 10), P(2, "ESSAY", 1, 10)]),
        S("SPRECHEN", 20, [
          P(1, "DIALOGUE_ROLEPLAY", 1, 5),
          P(2, "PICTURE_DESCRIPTION", 1, 10),
          P(3, "PRESENTATION", 1, 10),
        ]),
      ],
    },
    scoringRules: ECL_SCORING,
    sourcesNote: "ecl-test.com structure publique C1 — à re-vérifier",
  },

  // ====================== TESTDAF ======================
  // Examen académique unique B2–C1, noté en TDN 3/4/5 par module (cf. docs/29).
  // Niveau réglé sur C1 (le contenu réutilise B2 + C1).
  {
    provider: "TESTDAF",
    level: "C1",
    variant: "digital",
    title: "TestDaF (digital)",
    structure: {
      sections: [
        S("LESEN", 55, [
          P(1, "MATCHING", 8, 8),
          P(2, "MCQ_SINGLE", 12, 12),
          P(3, "TRUE_FALSE", 14, 14),
        ]),
        S("HOEREN", 45, [
          P(1, "GAP_FILL", 8, 8, 1),
          P(2, "TRUE_FALSE", 10, 10, 1),
          P(3, "MCQ_SINGLE", 12, 12, 1),
        ]),
        S("SCHREIBEN", 60, [
          P(1, "ESSAY", 1, 10),
          P(2, "ESSAY", 1, 10),
        ]),
        S("SPRECHEN", 35, [
          P(1, "PRESENTATION", 1, 5),
          P(2, "PICTURE_DESCRIPTION", 1, 5),
          P(3, "PLANNING_TASK", 1, 5),
          P(4, "PRESENTATION", 1, 5),
          P(5, "PLANNING_TASK", 1, 5),
          P(6, "PRESENTATION", 1, 5),
          P(7, "PLANNING_TASK", 1, 5),
        ]),
      ],
    },
    scoringRules: TESTDAF_SCORING,
    sourcesNote: "Structure publique TestDaF digital (4 modules, notation TDN 3–5) — cf. docs/29 — à re-vérifier",
  },
];
