/**
 * Sanitisation du contenu envoyé au client AVANT soumission :
 * aucune clé de correction (isCorrect, pairs, accepted, correctOrder, explanation)
 * ne doit transiter. Invariant critique du produit.
 */
import type { Prisma } from "@prisma/client";

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

export type SanitizedQuestion = {
  id: string;
  taskFormat: string;
  prompt: string;
  points: number;
  options: { id: string; text: string }[];
  clientMetadata: Record<string, unknown> | null;
};

function shuffled<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = a;
  }
  return arr;
}

export function sanitizeQuestion(q: QuestionWithOptions): SanitizedQuestion {
  const meta = (q.metadata ?? {}) as Record<string, unknown>;
  let clientMetadata: Record<string, unknown> | null = null;

  switch (q.taskFormat) {
    case "MATCHING": {
      const pairs = Array.isArray(meta.pairs)
        ? (meta.pairs as { leftId: string; left?: string; rightId: string; right?: string }[])
        : [];
      const distractors = Array.isArray(meta.distractors)
        ? (meta.distractors as { rightId: string; right?: string }[])
        : [];
      clientMetadata = {
        left: pairs.map((p) => ({ leftId: p.leftId, text: p.left ?? "" })),
        right: shuffled([
          ...pairs.map((p) => ({ rightId: p.rightId, text: p.right ?? "" })),
          ...distractors.map((d) => ({ rightId: d.rightId, text: d.right ?? "" })),
        ]),
      };
      break;
    }
    case "GAP_FILL": {
      const gaps = Array.isArray(meta.gaps) ? (meta.gaps as { gapId: string }[]) : [];
      clientMetadata = {
        textWithGaps: typeof meta.textWithGaps === "string" ? meta.textWithGaps : "",
        gapIds: gaps.map((g) => g.gapId),
      };
      break;
    }
    case "ORDERING": {
      const items = Array.isArray(meta.items)
        ? (meta.items as { itemId: string; text?: string }[])
        : [];
      clientMetadata = { items: shuffled(items.map((i) => ({ itemId: i.itemId, text: i.text ?? "" }))) };
      break;
    }
    default:
      clientMetadata = null;
  }

  return {
    id: q.id,
    taskFormat: q.taskFormat,
    prompt: q.prompt,
    points: q.points,
    // isCorrect VOLONTAIREMENT omis
    options: q.options
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, text: o.text })),
    clientMetadata,
  };
}
