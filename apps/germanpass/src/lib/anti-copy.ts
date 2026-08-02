/**
 * Garde anti-copie : un contenu généré est rejeté s'il est trop proche
 * de la bibliothèque source (similarité trigram pg_trgm OU cosinus pgvector).
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { embed } from "@/lib/ai";

export const TRIGRAM_THRESHOLD = 0.55;
export const EMBEDDING_THRESHOLD = 0.92;

export type AntiCopyResult = {
  ok: boolean;
  maxTrigram: number;
  maxEmbedding: number;
};

/** Compare un texte généré contre tous les chunks de la bibliothèque. */
export async function checkAgainstLibrary(text: string): Promise<AntiCopyResult> {
  // 1. Similarité trigram (pg_trgm)
  const trigramRows = await db.$queryRaw<{ sim: number }[]>(
    Prisma.sql`
      SELECT COALESCE(MAX(similarity(content, ${text})), 0)::float AS sim
      FROM document_chunks
    `
  );
  const maxTrigram = trigramRows[0]?.sim ?? 0;

  // 2. Similarité d'embedding (cosinus via pgvector)
  let maxEmbedding = 0;
  try {
    const [vector] = await embed([text]);
    if (vector) {
      const vectorLiteral = `[${vector.join(",")}]`;
      const embRows = await db.$queryRaw<{ sim: number }[]>(
        Prisma.sql`
          SELECT COALESCE(MAX(1 - (embedding <=> ${vectorLiteral}::vector)), 0)::float AS sim
          FROM document_chunks
          WHERE embedding IS NOT NULL
        `
      );
      maxEmbedding = embRows[0]?.sim ?? 0;
    }
  } catch (embErr) {
    // Pas d'embeddings disponibles : la garde trigram seule s'applique
    console.warn("[anti-copy] embedding indisponible, trigram seul :", embErr instanceof Error ? embErr.message : embErr);
  }

  return {
    ok: maxTrigram < TRIGRAM_THRESHOLD && maxEmbedding < EMBEDDING_THRESHOLD,
    maxTrigram,
    maxEmbedding,
  };
}

/** Décision pure et testable. */
export function isCopyViolation(
  maxTrigram: number,
  maxEmbedding: number,
  trigramThreshold = TRIGRAM_THRESHOLD,
  embeddingThreshold = EMBEDDING_THRESHOLD
): boolean {
  return maxTrigram >= trigramThreshold || maxEmbedding >= embeddingThreshold;
}
