/** Recherche RAG : top-k chunks par similarité cosinus, filtre niveau. */
import { Prisma, type Level } from "@prisma/client";
import { db } from "@/lib/db";
import { embed } from "@/lib/ai";

export type RagChunk = { id: string; content: string; similarity: number };

export async function searchChunks(params: {
  query: string;
  level?: Level;
  topK?: number;
}): Promise<RagChunk[]> {
  const topK = params.topK ?? 6;
  const [vector] = await embed([params.query]);
  if (!vector) return [];
  const vectorLiteral = `[${vector.join(",")}]`;

  const levelFilter = params.level
    ? Prisma.sql`AND (d.level IS NULL OR d.level = ${params.level}::"Level")`
    : Prisma.empty;

  return db.$queryRaw<RagChunk[]>(
    Prisma.sql`
      SELECT c.id, c.content, (1 - (c.embedding <=> ${vectorLiteral}::vector))::float AS similarity
      FROM document_chunks c
      JOIN documents d ON d.id = c."documentId"
      WHERE c.embedding IS NOT NULL AND d.status = 'READY' ${levelFilter}
      ORDER BY c.embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `
  );
}
