/**
 * Moteur de correction déterministe, générique, piloté par taskFormat.
 * TOUJOURS exécuté côté serveur — aucune clé de réponse n'est envoyée au client
 * avant soumission. Fonctions pures et testables (100 % de branches visé).
 */
import { z } from "zod";

export type GradableQuestion = {
  id: string;
  taskFormat: string;
  points: number;
  metadata: unknown;
  options: { id: string; isCorrect: boolean }[];
};

export type GradeResult = {
  isCorrect: boolean; // entièrement correct
  pointsAwarded: number; // crédit partiel possible (matching, gap_fill, ordering)
};

// ---------- Schémas de réponse par format ----------
const mcqResponseSchema = z.object({ optionIds: z.array(z.string()) });
const trueFalseResponseSchema = z.object({ value: z.boolean() });
const matchingResponseSchema = z.object({
  pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
});
const gapFillResponseSchema = z.object({
  gaps: z.array(z.object({ gapId: z.string(), value: z.string() })),
});
const orderingResponseSchema = z.object({ order: z.array(z.string()) });

const matchingMetadataSchema = z.object({
  pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
});
const gapFillMetadataSchema = z.object({
  gaps: z.array(z.object({ gapId: z.string(), accepted: z.array(z.string()).min(1) })),
});
const orderingMetadataSchema = z.object({ correctOrder: z.array(z.string()).min(1) });
const trueFalseMetadataSchema = z.object({ correct: z.boolean() });

/** Normalisation des réponses textuelles (gap_fill) : casse, espaces, ß/ss conservé. */
export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Corrige une réponse. Lève une erreur si la réponse est malformée
 * (la route répond alors 400) ; une réponse vide vaut 0 point.
 */
export function gradeAnswer(question: GradableQuestion, response: unknown): GradeResult {
  switch (question.taskFormat) {
    case "MCQ_SINGLE": {
      const r = mcqResponseSchema.parse(response);
      const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
      const isCorrect = r.optionIds.length === 1 && correctIds.includes(r.optionIds[0] ?? "");
      return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    }

    case "MCQ_MULTI": {
      const r = mcqResponseSchema.parse(response);
      const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
      const given = new Set(r.optionIds);
      const isCorrect =
        given.size === correctIds.size && [...given].every((id) => correctIds.has(id));
      return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    }

    case "TRUE_FALSE": {
      const r = trueFalseResponseSchema.parse(response);
      // Vérité dans metadata.correct, sinon dans les options (option correcte = "Richtig")
      const meta = trueFalseMetadataSchema.safeParse(question.metadata);
      let correct: boolean;
      if (meta.success) {
        correct = meta.data.correct;
      } else {
        const correctOption = question.options.find((o) => o.isCorrect);
        if (!correctOption) throw new Error(`TRUE_FALSE sans vérité définie: ${question.id}`);
        correct = question.options.indexOf(correctOption) === 0;
      }
      const isCorrect = r.value === correct;
      return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    }

    case "MATCHING": {
      const r = matchingResponseSchema.parse(response);
      const meta = matchingMetadataSchema.parse(question.metadata);
      const expected = new Map(meta.pairs.map((p) => [p.leftId, p.rightId]));
      let correctCount = 0;
      const seen = new Set<string>();
      for (const pair of r.pairs) {
        if (seen.has(pair.leftId)) continue; // doublon ignoré
        seen.add(pair.leftId);
        if (expected.get(pair.leftId) === pair.rightId) correctCount += 1;
      }
      const fraction = expected.size === 0 ? 0 : correctCount / expected.size;
      return {
        isCorrect: fraction === 1,
        pointsAwarded: round2(question.points * fraction),
      };
    }

    case "GAP_FILL": {
      const r = gapFillResponseSchema.parse(response);
      const meta = gapFillMetadataSchema.parse(question.metadata);
      const given = new Map(r.gaps.map((g) => [g.gapId, normalizeAnswer(g.value)]));
      let correctCount = 0;
      for (const gap of meta.gaps) {
        const value = given.get(gap.gapId);
        if (value !== undefined && gap.accepted.some((a) => normalizeAnswer(a) === value)) {
          correctCount += 1;
        }
      }
      const fraction = meta.gaps.length === 0 ? 0 : correctCount / meta.gaps.length;
      return {
        isCorrect: fraction === 1,
        pointsAwarded: round2(question.points * fraction),
      };
    }

    case "ORDERING": {
      const r = orderingResponseSchema.parse(response);
      const meta = orderingMetadataSchema.parse(question.metadata);
      let correctCount = 0;
      for (let i = 0; i < meta.correctOrder.length; i += 1) {
        if (r.order[i] === meta.correctOrder[i]) correctCount += 1;
      }
      const fraction = correctCount / meta.correctOrder.length;
      return {
        isCorrect: fraction === 1,
        pointsAwarded: round2(question.points * fraction),
      };
    }

    default:
      // Formats productifs (Schreiben/Sprechen) : non corrigés par ce moteur
      throw new Error(`Format non corrigeable de manière déterministe: ${question.taskFormat}`);
  }
}
