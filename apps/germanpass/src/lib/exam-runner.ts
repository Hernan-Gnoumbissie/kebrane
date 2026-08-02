/**
 * Service du simulateur d'examen : sections séquencées (pas de retour arrière),
 * deadlines SERVEUR par section (tolérance +5 s), auto-submit à expiration,
 * scoring conforme au blueprint.
 */
import { z } from "zod";
import type { Attempt, ExamBlueprint } from "@prisma/client";
import { db } from "@/lib/db";
import { computeExamResult, scoringRulesSchema, type SectionScore } from "@/lib/scoring";

export const DEADLINE_TOLERANCE_MS = 5000;

const blueprintStructureSchema = z.object({
  sections: z
    .array(
      z.object({
        section: z.enum(["LESEN", "HOEREN", "SCHREIBEN", "SPRECHEN"]),
        durationMin: z.number().positive(),
        parts: z.array(
          z.object({
            partNumber: z.number(),
            taskFormat: z.string(),
            itemCount: z.number(),
            points: z.number(),
            maxListens: z.number().optional(),
          })
        ),
      })
    )
    .min(1),
});
export type BlueprintStructure = z.infer<typeof blueprintStructureSchema>;
export type SectionName = "LESEN" | "HOEREN" | "SCHREIBEN" | "SPRECHEN";

export function parseStructure(blueprint: ExamBlueprint): BlueprintStructure {
  return blueprintStructureSchema.parse(blueprint.structure);
}

export function sectionOrder(structure: BlueprintStructure): SectionName[] {
  return structure.sections.map((s) => s.section);
}

export function nextSection(structure: BlueprintStructure, current: SectionName): SectionName | null {
  const order = sectionOrder(structure);
  const idx = order.indexOf(current);
  return idx >= 0 && idx < order.length - 1 ? (order[idx + 1] as SectionName) : null;
}

export function sectionDuration(structure: BlueprintStructure, section: SectionName): number {
  const s = structure.sections.find((x) => x.section === section);
  if (!s) throw new Error(`Section ${section} absente du blueprint`);
  return s.durationMin;
}

/** Deadline dépassée (avec tolérance) ? Pure et testable. */
export function isPastDeadline(deadlineIso: string, now: Date = new Date()): boolean {
  return now.getTime() > new Date(deadlineIso).getTime() + DEADLINE_TOLERANCE_MS;
}

export function getDeadlines(attempt: Attempt): Record<string, string> {
  return (attempt.sectionDeadlines as Record<string, string> | null) ?? {};
}

/** Démarre une section : enregistre sa deadline serveur. */
export async function startSection(attemptId: string, section: SectionName, durationMin: number): Promise<Date> {
  const deadline = new Date(Date.now() + durationMin * 60_000);
  const attempt = await db.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  const deadlines = getDeadlines(attempt);
  deadlines[section] = deadline.toISOString();
  await db.attempt.update({
    where: { id: attemptId },
    data: { currentSection: section, sectionDeadlines: deadlines },
  });
  return deadline;
}

/**
 * Calcule le rapport final d'un examen blanc :
 * - LESEN/HOEREN : points des AttemptAnswers
 * - SCHREIBEN : WritingSubmissions liées (échelle = points du blueprint)
 * - SPRECHEN : SpeakingSubmissions liées (totalIndicative /40 → échelle blueprint)
 * Retourne aussi `pendingEvaluations` si des évaluations IA sont en cours.
 */
export async function computeMockReport(attemptId: string): Promise<{
  result: ReturnType<typeof computeExamResult>;
  pendingEvaluations: boolean;
}> {
  const attempt = await db.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      blueprint: true,
      answers: { include: { question: true } },
      writingSubmissions: true,
      speakingSubmissions: true,
    },
  });
  if (!attempt.blueprint) throw new Error("Attempt sans blueprint");
  const structure = parseStructure(attempt.blueprint);
  const rules = scoringRulesSchema.parse(attempt.blueprint.scoringRules);

  let pendingEvaluations = false;
  const sections: SectionScore[] = [];

  for (const s of structure.sections) {
    const maxPoints = s.parts.reduce((acc, p) => acc + p.points, 0);
    let points = 0;

    if (s.section === "LESEN" || s.section === "HOEREN") {
      points = attempt.answers
        .filter((a) => a.question.section === s.section)
        .reduce((acc, a) => acc + (a.pointsAwarded ?? 0), 0);
    } else if (s.section === "SCHREIBEN") {
      const subs = attempt.writingSubmissions;
      if (subs.some((x) => x.status === "PENDING" || x.status === "EVALUATING")) pendingEvaluations = true;
      for (const sub of subs) {
        const scores = sub.scores as { totalPoints?: number; maxPoints?: number } | null;
        if (scores?.totalPoints !== undefined && scores.maxPoints) {
          // mise à l'échelle : répartition uniforme des points blueprint entre les tâches
          const share = maxPoints / Math.max(subs.length, 1);
          points += (scores.totalPoints / scores.maxPoints) * share;
        }
      }
    } else {
      const subs = attempt.speakingSubmissions;
      if (subs.some((x) => ["PENDING", "TRANSCRIBING", "EVALUATING"].includes(x.status))) pendingEvaluations = true;
      for (const sub of subs) {
        const scores = sub.scores as { totalIndicative?: number } | null;
        if (scores?.totalIndicative !== undefined) {
          const share = maxPoints / Math.max(subs.length, 1);
          points += (scores.totalIndicative / 40) * share;
        }
      }
    }
    sections.push({ section: s.section, points: Math.round(points * 100) / 100, maxPoints });
  }

  return { result: computeExamResult(rules, sections), pendingEvaluations };
}
