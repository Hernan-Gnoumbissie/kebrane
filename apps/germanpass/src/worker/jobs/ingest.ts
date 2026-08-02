/**
 * Ingestion d'un document de la bibliothèque RAG :
 * extraction texte (PDF/DOCX/TXT) → chunking ~512 tokens → embeddings → pgvector.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { chunkText } from "@/lib/chunking";
import { embed } from "@/lib/ai";

const db = new PrismaClient();

async function extractText(absolutePath: string, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const { default: pdfParse } = await import("pdf-parse");
    const data = await pdfParse(await readFile(absolutePath));
    return data.text;
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    absolutePath.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: absolutePath });
    return result.value;
  }
  // TXT / fallback
  return (await readFile(absolutePath)).toString("utf-8");
}

export async function ingestDocument(documentId: string): Promise<void> {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return;

  await db.document.update({ where: { id: documentId }, data: { status: "PROCESSING" } });

  try {
    const storageDir = process.env.STORAGE_DIR ?? "./storage";
    const absolute = path.join(storageDir, doc.filePath);
    const text = await extractText(absolute, doc.mimeType);
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("Document vide après extraction");

    // Ré-ingestion idempotente
    await db.documentChunk.deleteMany({ where: { documentId } });

    // Embeddings par lots de 64
    for (let i = 0; i < chunks.length; i += 64) {
      const batch = chunks.slice(i, i + 64);
      const vectors = await embed(batch.map((c) => c.content));
      for (let j = 0; j < batch.length; j += 1) {
        const chunk = batch[j];
        const vector = vectors[j];
        if (!chunk || !vector) continue;
        const vectorLiteral = `[${vector.join(",")}]`;
        await db.$executeRaw(
          Prisma.sql`
            INSERT INTO document_chunks (id, "documentId", position, content, "tokenCount", embedding, "createdAt")
            VALUES (gen_random_uuid()::text, ${documentId}, ${chunk.position}, ${chunk.content}, ${chunk.tokenCount}, ${vectorLiteral}::vector, NOW())
          `
        );
      }
    }

    await db.document.update({
      where: { id: documentId },
      data: { status: "READY", errorMessage: null },
    });
    console.log(`[ingest] ${documentId} : ${chunks.length} chunks`);
  } catch (e) {
    await db.document.update({
      where: { id: documentId },
      data: { status: "FAILED", errorMessage: e instanceof Error ? e.message : "Erreur inconnue" },
    });
    throw e;
  }
}
