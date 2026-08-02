/**
 * Règles de scoring par provider, pilotées par blueprint.scoringRules.
 * Fonctions pures et testables (cas limites : exactement 60 %, ECL min 40 %, arrondis).
 */
import { z } from "zod";

export const scoringRulesSchema = z.object({
  passThresholdPct: z.number().min(0).max(100),
  modular: z.boolean(),
  perSectionThresholdPct: z.number().min(0).max(100).optional(),
  perSkillMinPct: z.number().min(0).max(100).optional(),
  averageAcrossSkills: z.boolean().optional(),
  oralSeparate: z.boolean().optional(),
  // TestDaF : notation en niveaux TDN par module, sans verdict global.
  tdn: z.boolean().optional(),
  tdnThresholds: z
    .object({
      tdn3: z.number().min(0).max(100),
      tdn4: z.number().min(0).max(100),
      tdn5: z.number().min(0).max(100),
    })
    .optional(),
  rounding: z.literal("half_up"),
});
export type ScoringRules = z.infer<typeof scoringRulesSchema>;

/** Niveaux TestDaF (TestDaF-Niveaustufen). */
export type Tdn = "TDN 5" | "TDN 4" | "TDN 3" | "unter TDN 3";

/** Seuils % → TDN par défaut (approximation pour l'entraînement ; le vrai TestDaF
 *  utilise un score calibré non public). Ajustables via blueprint.scoringRules. */
const DEFAULT_TDN_THRESHOLDS = { tdn3: 40, tdn4: 60, tdn5: 80 };

function toTdn(p: number, t: { tdn3: number; tdn4: number; tdn5: number }): Tdn {
  if (p >= t.tdn5) return "TDN 5";
  if (p >= t.tdn4) return "TDN 4";
  if (p >= t.tdn3) return "TDN 3";
  return "unter TDN 3";
}

export type SectionScore = {
  section: "LESEN" | "HOEREN" | "SCHREIBEN" | "SPRECHEN";
  points: number;
  maxPoints: number;
};

export type ExamResult = {
  totalPct: number;
  perSection: {
    section: string;
    points: number;
    maxPoints: number;
    pct: number;
    passed: boolean | null;
    tdn?: Tdn | null;
  }[];
  verdict: "bestanden" | "nicht_bestanden" | "tdn";
  detail: string; // explication de la règle appliquée (FR)
};

/** Arrondi half-up à 1 décimale (12,35 → 12,4 ; -0 évité). */
export function roundHalfUp(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function pct(points: number, maxPoints: number): number {
  if (maxPoints <= 0) return 0;
  return roundHalfUp((points / maxPoints) * 100);
}

export function computeExamResult(rules: ScoringRules, sections: SectionScore[]): ExamResult {
  const perSection = sections.map((s) => ({
    section: s.section,
    points: s.points,
    maxPoints: s.maxPoints,
    pct: pct(s.points, s.maxPoints),
    passed: null as boolean | null,
    tdn: null as Tdn | null,
  }));

  const totalPoints = sections.reduce((acc, s) => acc + s.points, 0);
  const totalMax = sections.reduce((acc, s) => acc + s.maxPoints, 0);
  const totalPct = pct(totalPoints, totalMax);

  // --- TestDaF : un niveau TDN par module, pas de verdict global ---
  if (rules.tdn) {
    const t = rules.tdnThresholds ?? DEFAULT_TDN_THRESHOLDS;
    for (const s of perSection) {
      s.passed = null;
      s.tdn = toTdn(s.pct, t);
    }
    return {
      totalPct,
      perSection,
      verdict: "tdn",
      detail: `TestDaF : niveau TDN par module (TDN 5 ≥ ${t.tdn5} %, TDN 4 ≥ ${t.tdn4} %, TDN 3 ≥ ${t.tdn3} %). Pas de réussite/échec global.`,
    };
  }

  // --- Goethe (et ZB1 ÖSD) : modulaire, ≥ seuil PAR module ---
  if (rules.modular) {
    const threshold = rules.perSectionThresholdPct ?? rules.passThresholdPct;
    let allPassed = true;
    for (const s of perSection) {
      s.passed = s.pct >= threshold;
      if (!s.passed) allPassed = false;
    }
    return {
      totalPct,
      perSection,
      verdict: allPassed ? "bestanden" : "nicht_bestanden",
      detail: `Examen modulaire : chaque module doit atteindre ${threshold} %.`,
    };
  }

  // --- ECL : moyenne ≥ 60 % ET minimum 40 % par compétence ---
  if (rules.perSkillMinPct !== undefined && rules.averageAcrossSkills) {
    const min = rules.perSkillMinPct;
    let minOk = true;
    for (const s of perSection) {
      s.passed = s.pct >= min;
      if (!s.passed) minOk = false;
    }
    const average = roundHalfUp(perSection.reduce((acc, s) => acc + s.pct, 0) / perSection.length);
    const passed = minOk && average >= rules.passThresholdPct;
    return {
      totalPct: average,
      perSection,
      verdict: passed ? "bestanden" : "nicht_bestanden",
      detail: `ECL : moyenne ≥ ${rules.passThresholdPct} % (obtenu ${average} %) avec minimum ${min} % par compétence.`,
    };
  }

  // --- TELC : écrit et oral notés séparément, ≥ seuil chacun ---
  if (rules.oralSeparate) {
    const written = perSection.filter((s) => s.section !== "SPRECHEN");
    const oral = perSection.filter((s) => s.section === "SPRECHEN");
    const writtenPct = pct(
      written.reduce((a, s) => a + s.points, 0),
      written.reduce((a, s) => a + s.maxPoints, 0)
    );
    const oralPct = pct(
      oral.reduce((a, s) => a + s.points, 0),
      oral.reduce((a, s) => a + s.maxPoints, 0)
    );
    const writtenOk = writtenPct >= rules.passThresholdPct;
    const oralOk = oral.length === 0 || oralPct >= rules.passThresholdPct;
    for (const s of perSection) {
      s.passed = s.section === "SPRECHEN" ? oralOk : writtenOk;
    }
    return {
      totalPct,
      perSection,
      verdict: writtenOk && oralOk ? "bestanden" : "nicht_bestanden",
      detail: `TELC : écrit ${writtenPct} % et oral ${oralPct} % notés séparément, seuil ${rules.passThresholdPct} % chacun.`,
    };
  }

  // --- Cas général (ÖSD standard) : total ≥ seuil, plancher par section optionnel ---
  const sectionThreshold = rules.perSectionThresholdPct;
  let sectionsOk = true;
  for (const s of perSection) {
    if (sectionThreshold !== undefined) {
      s.passed = s.pct >= sectionThreshold;
      if (!s.passed) sectionsOk = false;
    }
  }
  const passed = totalPct >= rules.passThresholdPct && sectionsOk;
  return {
    totalPct,
    perSection,
    verdict: passed ? "bestanden" : "nicht_bestanden",
    detail:
      sectionThreshold !== undefined
        ? `Total ≥ ${rules.passThresholdPct} % avec minimum ${sectionThreshold} % par épreuve.`
        : `Total ≥ ${rules.passThresholdPct} %.`,
  };
}
